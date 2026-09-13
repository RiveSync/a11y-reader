import { STORAGE_VERSION } from './constants';
import { mergeSettings } from './settings';
import type { AccessibilitySettings, PersistedState } from './types';

/**
 * localStorage access, defensively.
 *
 * Every call is wrapped: Safari private mode throws on write, enterprise
 * policies and cookie-blocking extensions can throw on read, and the whole
 * property access throws in some sandboxed iframes. A storage failure must
 * degrade to in-memory state, never to a broken host page.
 */

function getStorage(win: Window | undefined): Storage | null {
  if (!win) return null;
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

export function isStorageAvailable(win: Window | undefined = globalThis.window): boolean {
  const storage = getStorage(win);
  if (!storage) return false;
  try {
    const probe = '__a11y-reader-probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and validate stored settings.
 *
 * Returns null for "nothing usable stored", which is distinct from "stored
 * defaults": the caller layers the host's `defaults` prop underneath only in
 * the null case.
 */
export function readSettings(
  key: string,
  win: Window | undefined = globalThis.window,
): AccessibilitySettings | null {
  const storage = getStorage(win);
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const state = parsed as Partial<PersistedState>;

  // No migrations exist yet, so anything from another version is discarded
  // rather than guessed at.
  if (state.version !== STORAGE_VERSION) return null;

  // mergeSettings clamps and type-checks every field, so a hand-edited or
  // truncated entry yields sane values instead of propagating garbage.
  return mergeSettings(state.settings);
}

export function writeSettings(
  key: string,
  settings: AccessibilitySettings,
  win: Window | undefined = globalThis.window,
): void {
  const storage = getStorage(win);
  if (!storage) return;
  const state: PersistedState = { version: STORAGE_VERSION, settings };
  try {
    storage.setItem(key, JSON.stringify(state));
  } catch {
    // Quota exceeded or private mode. In-memory state stays correct.
  }
}

export function clearSettings(key: string, win: Window | undefined = globalThis.window): void {
  const storage = getStorage(win);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Keep multiple tabs in sync. The `storage` event fires only in *other* tabs,
 * which is exactly the semantics wanted here.
 */
export function subscribeStorage(
  key: string,
  onChange: (settings: AccessibilitySettings | null) => void,
  win: Window | undefined = globalThis.window,
): () => void {
  if (!win) return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return;
    onChange(readSettings(key, win));
  };
  win.addEventListener('storage', handler);
  return () => win.removeEventListener('storage', handler);
}
