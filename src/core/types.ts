/**
 * Public and internal types for the accessibility engine.
 *
 * Nothing in `src/core` may import React — see the `no-restricted-imports` rule
 * in eslint.config.js. These types are shared with the React layer by import,
 * not by dependency.
 */

export type ReadingAidMode = 'off' | 'ruler' | 'mask';

export type FollowMode = 'mouse' | 'keyboard' | 'both';

export interface ReadingAidSettings {
  mode: ReadingAidMode;
  /** Any CSS color. Defaults differ per mode; see DEFAULT_AID_COLOR. */
  color: string;
  /** Height in px of the ruler bar, or of the clear band in mask mode. */
  height: number;
  followMode: FollowMode;
}

export interface AccessibilitySettings {
  dyslexicFont: boolean;
  highContrast: boolean;
  /** 0.5 - 2.0, step 0.1. */
  fontScale: number;
  /** 0 - 0.5, in em, step 0.05. */
  letterSpacing: number;
  /**
   * 1.0 - 3.0, step 0.1, or `null` for "untouched".
   *
   * Deliberate departure from PRD 4.5, which used `number` plus a hidden
   * `lineHeightTouched` flag. That flag cannot round-trip through controlled
   * mode or `onChange` (the host's settings object has nowhere to put it), and
   * deriving it as `value !== 1.5` breaks the moment a user drags back to
   * exactly 1.5. `null` means the slider shows 1.5 but no CSS is applied, so
   * the host site's own typography is left alone until the user opts in.
   */
  lineHeight: number | null;
  readingAid: ReadingAidSettings;
}

export type FontSource =
  | 'bundled'
  | 'cdn'
  | { regular: string; bold?: string; italic?: string; boldItalic?: string };

export interface WidgetTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
  buttonSize: number;
  hideBranding: boolean;
  darkMode: 'auto' | 'light' | 'dark';
  contrastGrayscaleMedia: boolean;
}

export interface WidgetLabels {
  openPanel: string;
  closePanel: string;
  title: string;
  dyslexicFont: string;
  highContrast: string;
  fontScale: string;
  letterSpacing: string;
  lineHeight: string;
  readingAid: string;
  readingAidOff: string;
  readingAidRuler: string;
  readingAidMask: string;
  color: string;
  opacity: string;
  height: string;
  resetAll: string;
  increase: string;
  decrease: string;
  /** Announced when a slider is at its default value. */
  defaultValue: string;
}

/** What gets written to localStorage. */
export interface PersistedState {
  version: number;
  settings: AccessibilitySettings;
}

export interface FrameScheduler {
  schedule(fn: () => void): void;
  flush(): void;
  cancel(): void;
}

export interface EngineOptions {
  /** Selector(s) the transformations target. Default: 'body'. */
  scope?: string | string[];
  /** Selector(s) that must never be transformed. */
  exclude?: string | string[];
  fontSource?: FontSource;
  zIndex?: number;
  contrastGrayscaleMedia?: boolean;
  /** Injected so tests can run scheduled work synchronously. */
  scheduler?: FrameScheduler;
  /** Injected so font-scale tests can assert behaviour jsdom cannot produce. */
  readFontSize?: (el: Element) => number;
  document?: Document;
}

/** Resolved, non-optional form of EngineOptions, handed to every feature. */
export interface EngineContext {
  doc: Document;
  /** `typeof globalThis` included so constructors like MutationObserver are typed. */
  win: Window & typeof globalThis;
  scope: string[];
  exclude: string[];
  /** Comma-joined selector for `closest()` lookups on the JS side. */
  excludeSelector: string;
  /** Body of the CSS `:not(:where(...))` guard, descendants included. */
  excludeCss: string;
  fontSource: FontSource;
  zIndex: number;
  contrastGrayscaleMedia: boolean;
  scheduler: FrameScheduler;
  readFontSize: (el: Element) => number;
  /** Resolve the elements named by `scope`. */
  roots(): Element[];
  isExcluded(el: Element): boolean;
}

/**
 * One transformable feature. `apply` is called only when the value changed;
 * `remove` must restore the document to its pre-apply state exactly, because
 * that byte-identical revert is what the acceptance criteria are built on.
 */
export interface FeatureModule<T> {
  apply(value: T, ctx: EngineContext): void;
  remove(ctx: EngineContext): void;
}

export interface A11yEngine {
  apply(settings: AccessibilitySettings): void;
  /** Re-run the current settings, e.g. after the host swaps page content. */
  refresh(): void;
  getApplied(): AccessibilitySettings | null;
  destroy(): void;
}
