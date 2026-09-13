import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_LABELS } from '../core/labels';
import { DEFAULT_SETTINGS, DEFAULT_STORAGE_KEY } from '../core/constants';
import { clearSettings } from '../core/storage';
import type {
  AccessibilitySettings,
  FontSource,
  WidgetLabels,
} from '../core/types';
import { A11yContext, type A11yContextValue } from './context';
import { useControllable } from './useControllable';
import { useEngine } from './useEngine';
import { useMounted } from './useMounted';

export interface AccessibilityProviderProps {
  children?: ReactNode;

  /** Controlled mode: supply both to own the state. */
  settings?: AccessibilitySettings;
  onChange?: (settings: AccessibilitySettings) => void;

  /** Starting values, used only when storage holds nothing. */
  defaults?: Partial<AccessibilitySettings>;

  /** localStorage key, or false for in-memory only. */
  storageKey?: string | false;

  labels?: Partial<WidgetLabels>;

  /** CSS selector(s) the transformations target. Default: 'body'. */
  scope?: string | string[];
  /** CSS selector(s) that must never be transformed. */
  exclude?: string | string[];

  fontSource?: FontSource;
  zIndex?: number;
  contrastGrayscaleMedia?: boolean;

  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Holds the settings store, runs the engine, and exposes both to the tree.
 *
 * Renders no DOM of its own — `<AccessibilityWidget />` draws the UI. Use this
 * directly only when `useAccessibilityWidget()` is needed far from the widget.
 */
export function AccessibilityProvider(props: AccessibilityProviderProps) {
  const {
    children,
    settings,
    onChange,
    defaults,
    storageKey,
    labels,
    scope,
    exclude,
    fontSource,
    zIndex,
    contrastGrayscaleMedia,
    defaultOpen = false,
    onOpenChange,
  } = props;

  const mounted = useMounted();
  const { store, setSettings } = useControllable({ settings, onChange, defaults, storageKey });

  // The engine is gated on mount so nothing touches the document during SSR or
  // hydration.
  useEngine(store, { scope, exclude, fontSource, zIndex, contrastGrayscaleMedia }, mounted);

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // Lets toggle() read the current state without depending on it, so the
  // trigger's handler keeps a stable identity across open/close.
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const setOpen = useCallback((next: boolean, viaKeyboard = false) => {
    setIsOpen((prev) => {
      if (prev === next) return prev;
      onOpenChangeRef.current?.(next);
      return next;
    });
    if (next) setOpenedByKeyboard(viaKeyboard);
  }, []);

  const open = useCallback((viaKeyboard = false) => setOpen(true, viaKeyboard), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(
    (viaKeyboard = false) => setOpen(!isOpenRef.current, viaKeyboard),
    [setOpen],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    const key = storageKey === false ? null : (storageKey ?? DEFAULT_STORAGE_KEY);
    if (key !== null) clearSettings(key);
  }, [setSettings, storageKey]);

  const mergedLabels = useMemo<WidgetLabels>(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  const value = useMemo<A11yContextValue>(
    () => ({
      store,
      labels: mergedLabels,
      isOpen,
      openedByKeyboard,
      open,
      close,
      toggle,
      setSettings,
      reset,
    }),
    [store, mergedLabels, isOpen, openedByKeyboard, open, close, toggle, setSettings, reset],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}
