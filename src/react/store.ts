import type { AccessibilitySettings } from '../core/types';

export interface SettingsStore {
  getState(): AccessibilitySettings;
  setState(next: AccessibilitySettings | ((prev: AccessibilitySettings) => AccessibilitySettings)): void;
  subscribe(listener: () => void): () => void;
}

/**
 * A plain observable, deliberately not React state.
 *
 * Two things need to read settings: the React tree (via useSyncExternalStore,
 * from both the host tree and the shadow tree) and the engine, which is not a
 * component and should not force a render to find out what changed. A vanilla
 * store serves both, and keeps the engine independent of React's scheduling.
 */
export function createSettingsStore(initial: AccessibilitySettings): SettingsStore {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,

    setState(next) {
      const value = typeof next === 'function' ? next(state) : next;
      if (value === state) return;
      state = value;
      for (const listener of listeners) listener();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
