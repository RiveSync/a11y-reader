import type { AccessibilitySettings, WidgetTheme } from './types';

export const STORAGE_VERSION = 1;
export const DEFAULT_STORAGE_KEY = 'a11y-reader:settings';

/** Just under the 32-bit max, leaving headroom for a host that wants to sit above us. */
export const DEFAULT_Z_INDEX = 2147483000;

/** Default reading-aid color per mode. A ruler tints; a mask dims. */
export const DEFAULT_AID_COLOR = {
  ruler: 'rgba(255, 230, 0, 0.35)',
  mask: 'rgba(0, 0, 0, 0.6)',
} as const;

/** Default band height per mode: a ruler underlines a line, a mask frames a paragraph. */
export const DEFAULT_AID_HEIGHT = {
  ruler: 40,
  mask: 120,
} as const;

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  dyslexicFont: false,
  highContrast: false,
  fontScale: 1,
  letterSpacing: 0,
  lineHeight: null,
  readingAid: {
    mode: 'off',
    color: DEFAULT_AID_COLOR.ruler,
    height: DEFAULT_AID_HEIGHT.ruler,
    followMode: 'both',
  },
};

export const DEFAULT_THEME: WidgetTheme = {
  primaryColor: '#2563eb',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  borderRadius: '16px',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  buttonSize: 56,
  hideBranding: false,
  darkMode: 'auto',
  contrastGrayscaleMedia: false,
};

export interface Range {
  min: number;
  max: number;
  step: number;
}

export const RANGES = {
  fontScale: { min: 0.5, max: 2, step: 0.1 },
  letterSpacing: { min: 0, max: 0.5, step: 0.05 },
  lineHeight: { min: 1, max: 3, step: 0.1 },
  aidHeight: { min: 20, max: 300, step: 5 },
} as const satisfies Record<string, Range>;

/** Shown on the line-spacing slider while the value is `null` (untouched). */
export const LINE_HEIGHT_DISPLAY_DEFAULT = 1.5;

export const HOST_IDS = {
  /** Reading-aid overlays. Owned by core, no React. */
  aid: 'a11y-reader-aid',
  /** Widget trigger + panel. Owned by the React layer. */
  ui: 'a11y-reader-ui',
} as const;

export const STYLE_IDS = {
  /** Rules that must exist before first paint; shared with the preload script. */
  base: 'a11y-reader-base',
  fontFace: 'a11y-reader-font-face',
} as const;

export const ATTRS = {
  dyslexic: 'data-a11y-dyslexic',
  contrast: 'data-a11y-contrast',
  letterSpacing: 'data-a11y-letter-spacing',
  lineHeight: 'data-a11y-line-height',
  /** Set by the host, or by us on our own shadow hosts. Never transformed. */
  exclude: 'data-a11y-exclude',
  /** Set by the tagger on detected icon-font elements. */
  icon: 'data-a11y-icon',
} as const;

export const CSS_VARS = {
  letterSpacing: '--a11y-letter-spacing',
  lineHeight: '--a11y-line-height',
} as const;

/**
 * Cheap structural pre-filter for the icon-font scan.
 *
 * Calling getComputedStyle on every element in the page would cost more than
 * the whole font feature. Narrow to plausible icon elements first, then verify
 * the computed font-family against ICON_FONT_FAMILIES.
 */
export const ICON_CANDIDATE_SELECTOR = [
  '.fa',
  '[class*="fa-"]',
  '[class^="fa"]',
  '.material-icons',
  '[class*="material-icons"]',
  '[class*="material-symbols"]',
  '.glyphicon',
  '[class*="glyphicon-"]',
  '.bi',
  '[class*="bi-"]',
  '.anticon',
  '[class*="anticon-"]',
  '[class*="ri-"]',
  '[class*="pi-"]',
  '[class*="ti-"]',
  '[class*="icon-"]',
  '[class$="-icon"]',
  '[data-icon]',
  'iconify-icon',
  'i:empty',
  'span:empty',
].join(',');

/**
 * Known icon fonts, matched case-insensitively against the first computed
 * font-family.
 *
 * Note the two families behave differently under our blanket rule: Font
 * Awesome declares its font on ::before, which an element-only selector never
 * touches, so it is already safe. Material Icons / Symbols declare it on the
 * element and use text ligatures, so without tagging `<i class="material-icons">home</i>`
 * renders the literal word "home". Material is the reason this list exists.
 */
export const ICON_FONT_FAMILIES = [
  'fontawesome',
  'font awesome 5 free',
  'font awesome 5 brands',
  'font awesome 5 pro',
  'font awesome 6 free',
  'font awesome 6 brands',
  'font awesome 6 pro',
  'material icons',
  'material icons outlined',
  'material icons round',
  'material icons sharp',
  'material icons two tone',
  'material symbols outlined',
  'material symbols rounded',
  'material symbols sharp',
  'glyphicons halflings',
  'bootstrap-icons',
  'anticon',
  'remixicon',
  'icomoon',
  'ionicons',
  'phosphor',
  'iconfont',
  'primeicons',
  'themify',
  'segoe mdl2 assets',
  'segoe fluent icons',
] as const;

/** Elements that never carry transformable text, pruned during the walk. */
export const SKIPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
  'MATH',
  'IFRAME',
  'CANVAS',
  'OBJECT',
  'EMBED',
  'VIDEO',
  'AUDIO',
  'IMG',
  'PICTURE',
  'SOURCE',
  'BR',
  'HR',
  'INPUT',
]);
