import { createContext, useContext } from 'react';
import type { AccessibilitySettings, WidgetLabels } from '../core/types';
import type { SettingsStore } from './store';

export interface A11yContextValue {
  store: SettingsStore;
  labels: WidgetLabels;
  isOpen: boolean;
  /** Whether the panel was last opened from the keyboard — drives focus trapping. */
  openedByKeyboard: boolean;
  open(viaKeyboard?: boolean): void;
  close(): void;
  toggle(viaKeyboard?: boolean): void;
  setSettings(next: AccessibilitySettings | ((prev: AccessibilitySettings) => AccessibilitySettings)): void;
  reset(): void;
}

export const A11yContext = createContext<A11yContextValue | null>(null);

export function useA11yContext(): A11yContextValue {
  const value = useContext(A11yContext);
  if (!value) {
    throw new Error(
      '[a11y-reader] useAccessibilityWidget() must be used inside <AccessibilityProvider> or <AccessibilityWidget>.',
    );
  }
  return value;
}

/** Null instead of throwing, so AccessibilityWidget can detect a missing provider. */
export function useOptionalA11yContext(): A11yContextValue | null {
  return useContext(A11yContext);
}
