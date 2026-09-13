import { useCallback, useEffect, useRef } from 'react';
import { DEFAULT_STORAGE_KEY } from '../core/constants';
import { mergeSettings, settingsEqual } from '../core/settings';
import { readSettings, writeSettings } from '../core/storage';
import type { AccessibilitySettings } from '../core/types';
import { createSettingsStore, type SettingsStore } from './store';

export interface ControllableOptions {
  settings?: AccessibilitySettings;
  onChange?: (settings: AccessibilitySettings) => void;
  defaults?: Partial<AccessibilitySettings>;
  storageKey?: string | false;
}

export interface Controllable {
  store: SettingsStore;
  controlled: boolean;
  setSettings(next: AccessibilitySettings | ((prev: AccessibilitySettings) => AccessibilitySettings)): void;
}

function warn(message: string): void {
  // `typeof process` guard: the ESM build can be loaded directly by a browser
  // with no bundler to substitute process.env, where a bare reference throws.
  const isProduction =
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  if (!isProduction) {
    console.warn(`[a11y-reader] ${message}`);
  }
}

/**
 * Resolves the controlled / uncontrolled question once, at mount.
 *
 *   neither prop        uncontrolled, reads and writes storage
 *   settings + onChange controlled; storage is never touched, because the host
 *                       owns persistence and writing behind its back produces
 *                       two sources of truth that disagree after a reload
 *   settings alone      controlled and read-only; warned, per React convention
 *   onChange alone      uncontrolled, onChange as a notification. Legal and useful
 *
 * The mode is frozen at mount: switching mid-life is a bug in the host, and
 * following it would silently drop or duplicate state.
 */
export function useControllable(options: ControllableOptions): Controllable {
  const { settings, onChange, defaults, storageKey } = options;

  const controlledRef = useRef(settings !== undefined);
  const controlled = controlledRef.current;
  const key = storageKey === false ? null : (storageKey ?? DEFAULT_STORAGE_KEY);

  const storeRef = useRef<SettingsStore | null>(null);
  if (storeRef.current === null) {
    let initial: AccessibilitySettings;
    if (controlled) {
      initial = mergeSettings(settings);
    } else {
      // `defaults` sits *under* stored values: a returning visitor's own
      // choices outrank the host's preferred starting point.
      const stored = key === null ? null : readSettings(key);
      initial = stored ?? mergeSettings(defaults);
    }
    storeRef.current = createSettingsStore(initial);
  }
  const store = storeRef.current;

  useEffect(() => {
    if (settings !== undefined && !controlled) {
      warn('switched from uncontrolled to controlled; the new `settings` prop is ignored.');
    } else if (settings === undefined && controlled) {
      warn('switched from controlled to uncontrolled; the last `settings` value is kept.');
    } else if (settings !== undefined && onChange === undefined) {
      warn('`settings` was given without `onChange`, so the panel cannot change anything.');
    }
  }, [settings, onChange, controlled]);

  // Controlled: props are the source of truth, pushed into the store.
  useEffect(() => {
    if (!controlled || settings === undefined) return;
    const next = mergeSettings(settings);
    if (!settingsEqual(store.getState(), next)) store.setState(next);
  }, [controlled, settings, store]);

  // Uncontrolled: the store is the source of truth, mirrored to storage.
  useEffect(() => {
    if (controlled) return;
    return store.subscribe(() => {
      const current = store.getState();
      if (key !== null) writeSettings(key, current);
      onChange?.(current);
    });
  }, [controlled, key, onChange, store]);

  /**
   * The only write path the UI uses.
   *
   * In controlled mode this calls onChange and stops — it must NOT touch the
   * store, or the prop-sync effect above would fire onChange again with the
   * value the host just handed us, and every interaction would echo.
   */
  const setSettings = useCallback<Controllable['setSettings']>(
    (next) => {
      const value = typeof next === 'function' ? next(store.getState()) : next;
      const merged = mergeSettings(value);
      if (controlled) {
        onChange?.(merged);
      } else {
        store.setState(merged);
      }
    },
    [controlled, onChange, store],
  );

  return { store, controlled, setSettings };
}
