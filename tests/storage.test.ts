import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, STORAGE_VERSION } from '../src/core/constants';
import {
  clearSettings,
  isStorageAvailable,
  readSettings,
  subscribeStorage,
  writeSettings,
} from '../src/core/storage';

const KEY = 'a11y-test';

/** Stands in for Safari private mode, blocked cookies, or a sandboxed iframe. */
function withThrowingStorage<T>(run: () => T): T {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
  try {
    return run();
  } finally {
    if (original) Object.defineProperty(window, 'localStorage', original);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readSettings', () => {
  it('returns null when nothing is stored', () => {
    expect(readSettings(KEY)).toBeNull();
  });

  it('round-trips a written value', () => {
    const settings = { ...DEFAULT_SETTINGS, highContrast: true, fontScale: 1.3 };
    writeSettings(KEY, settings);
    expect(readSettings(KEY)).toEqual(settings);
  });

  it('discards malformed JSON instead of throwing', () => {
    localStorage.setItem(KEY, '{not json');
    expect(readSettings(KEY)).toBeNull();
  });

  it('discards a payload that is not an object', () => {
    localStorage.setItem(KEY, '"a string"');
    expect(readSettings(KEY)).toBeNull();
  });

  it('discards a different schema version rather than guessing at a migration', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: STORAGE_VERSION + 1, settings: { fontScale: 1.5 } }),
    );
    expect(readSettings(KEY)).toBeNull();
  });

  it('clamps hand-edited out-of-range values', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: STORAGE_VERSION, settings: { fontScale: 40, letterSpacing: -3 } }),
    );
    const result = readSettings(KEY);
    expect(result?.fontScale).toBe(2);
    expect(result?.letterSpacing).toBe(0);
  });

  it('survives storage that throws on access', () => {
    withThrowingStorage(() => {
      expect(readSettings(KEY)).toBeNull();
      expect(isStorageAvailable()).toBe(false);
    });
  });
});

describe('writeSettings', () => {
  it('swallows a quota error so the host page keeps working', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => writeSettings(KEY, DEFAULT_SETTINGS)).not.toThrow();
  });

  it('does nothing when storage is unreachable', () => {
    withThrowingStorage(() => {
      expect(() => writeSettings(KEY, DEFAULT_SETTINGS)).not.toThrow();
    });
  });
});

describe('clearSettings', () => {
  it('removes the entry', () => {
    writeSettings(KEY, DEFAULT_SETTINGS);
    clearSettings(KEY);
    expect(readSettings(KEY)).toBeNull();
  });
});

describe('subscribeStorage', () => {
  it('reports changes made in other tabs', () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeStorage(KEY, (s) => seen.push(s));

    writeSettings(KEY, { ...DEFAULT_SETTINGS, highContrast: true });
    // jsdom does not emit `storage` for same-document writes, which mirrors the
    // browser: the event is for *other* tabs. Dispatch it explicitly.
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));

    expect(seen).toHaveLength(1);
    expect((seen[0] as { highContrast: boolean }).highContrast).toBe(true);

    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(seen).toHaveLength(1);
  });

  it('ignores events for unrelated keys', () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeStorage(KEY, (s) => seen.push(s));
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    expect(seen).toHaveLength(0);
    unsubscribe();
  });
});
