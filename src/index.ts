/**
 * React entry point.
 *
 * The 'use client' directive is applied by tsup's banner (see tsup.config.ts),
 * not written here — esbuild strips in-source directives during bundling, and
 * scripts/check-directives.mjs verifies it survived the build.
 */
export { AccessibilityWidget, type AccessibilityWidgetProps } from './react/AccessibilityWidget';
export {
  AccessibilityProvider,
  type AccessibilityProviderProps,
} from './react/AccessibilityProvider';
export {
  useAccessibilityWidget,
  type UseAccessibilityWidget,
} from './react/useAccessibilityWidget';

export type {
  AccessibilitySettings,
  ReadingAidSettings,
  ReadingAidMode,
  FollowMode,
  FontSource,
  WidgetTheme,
  WidgetLabels,
} from './core/types';

export {
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  DEFAULT_STORAGE_KEY,
  LINE_HEIGHT_DISPLAY_DEFAULT,
  RANGES,
} from './core/constants';
export { DEFAULT_LABELS } from './core/labels';

/** Read stored settings directly — for seeding controlled mode. */
export { readSettings as readStoredSettings } from './core/storage';

/** Inline <head> script that applies stored preferences before first paint. */
export { getPreloadScript, type PreloadScriptOptions } from './core/preload';
