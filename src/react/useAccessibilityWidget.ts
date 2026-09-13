import { useSyncExternalStore } from 'react';
import type { AccessibilitySettings } from '../core/types';
import { useA11yContext } from './context';

export interface UseAccessibilityWidget {
  settings: AccessibilitySettings;
  setSettings(next: AccessibilitySettings | ((prev: AccessibilitySettings) => AccessibilitySettings)): void;
  reset(): void;
  open(viaKeyboard?: boolean): void;
  close(): void;
  toggle(viaKeyboard?: boolean): void;
  isOpen: boolean;
}

/**
 * Read and drive the widget from anywhere inside the provider tree — including
 * from the host's own UI when `hideTrigger` is set.
 */
export function useAccessibilityWidget(): UseAccessibilityWidget {
  const ctx = useA11yContext();

  // The store is plain data, so the server snapshot is simply the current
  // state — no separate SSR path needed here.
  const settings = useSyncExternalStore(ctx.store.subscribe, ctx.store.getState, ctx.store.getState);

  return {
    settings,
    setSettings: ctx.setSettings,
    reset: ctx.reset,
    open: ctx.open,
    close: ctx.close,
    toggle: ctx.toggle,
    isOpen: ctx.isOpen,
  };
}
