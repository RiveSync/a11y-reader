import { DEFAULT_SETTINGS, RANGES, type Range } from './constants';
import type { AccessibilitySettings, ReadingAidSettings } from './types';

/** Decimal places implied by a step, so 0.1 + 0.2 style drift never reaches the DOM. */
function precisionOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function clampToRange(value: number, range: Range): number {
  if (!Number.isFinite(value)) return range.min;
  const clamped = Math.min(range.max, Math.max(range.min, value));
  const factor = 10 ** precisionOf(range.step);
  return Math.round(clamped * factor) / factor;
}

const AID_MODES = new Set(['off', 'ruler', 'mask']);
const FOLLOW_MODES = new Set(['mouse', 'keyboard', 'both']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeReadingAid(
  partial: unknown,
  base: ReadingAidSettings,
): ReadingAidSettings {
  if (!isPlainObject(partial)) return { ...base };
  const mode = partial.mode;
  const followMode = partial.followMode;
  return {
    mode: typeof mode === 'string' && AID_MODES.has(mode) ? (mode as ReadingAidSettings['mode']) : base.mode,
    color: typeof partial.color === 'string' && partial.color.trim() !== '' ? partial.color : base.color,
    height:
      typeof partial.height === 'number'
        ? clampToRange(partial.height, RANGES.aidHeight)
        : base.height,
    followMode:
      typeof followMode === 'string' && FOLLOW_MODES.has(followMode)
        ? (followMode as ReadingAidSettings['followMode'])
        : base.followMode,
  };
}

/**
 * Merge an untrusted partial over a base, clamping every value.
 *
 * This is the single gate for anything arriving from outside: localStorage,
 * the `defaults` prop, and controlled-mode `settings`. Unknown or malformed
 * fields fall back to the base rather than throwing — a corrupt storage entry
 * must never break the host page.
 */
export function mergeSettings(
  partial: unknown,
  base: AccessibilitySettings = DEFAULT_SETTINGS,
): AccessibilitySettings {
  if (!isPlainObject(partial)) return { ...base, readingAid: { ...base.readingAid } };

  // lineHeight is tri-state: a number to apply, null for "untouched", and
  // undefined meaning "not specified, keep the base".
  let lineHeight = base.lineHeight;
  if (partial.lineHeight === null) {
    lineHeight = null;
  } else if (typeof partial.lineHeight === 'number') {
    lineHeight = clampToRange(partial.lineHeight, RANGES.lineHeight);
  }

  return {
    dyslexicFont:
      typeof partial.dyslexicFont === 'boolean' ? partial.dyslexicFont : base.dyslexicFont,
    highContrast:
      typeof partial.highContrast === 'boolean' ? partial.highContrast : base.highContrast,
    fontScale:
      typeof partial.fontScale === 'number'
        ? clampToRange(partial.fontScale, RANGES.fontScale)
        : base.fontScale,
    letterSpacing:
      typeof partial.letterSpacing === 'number'
        ? clampToRange(partial.letterSpacing, RANGES.letterSpacing)
        : base.letterSpacing,
    lineHeight,
    readingAid: mergeReadingAid(partial.readingAid, base.readingAid),
  };
}

export function readingAidEqual(a: ReadingAidSettings, b: ReadingAidSettings): boolean {
  return (
    a.mode === b.mode &&
    a.color === b.color &&
    a.height === b.height &&
    a.followMode === b.followMode
  );
}

export function settingsEqual(a: AccessibilitySettings, b: AccessibilitySettings): boolean {
  return (
    a.dyslexicFont === b.dyslexicFont &&
    a.highContrast === b.highContrast &&
    a.fontScale === b.fontScale &&
    a.letterSpacing === b.letterSpacing &&
    a.lineHeight === b.lineHeight &&
    readingAidEqual(a.readingAid, b.readingAid)
  );
}

export type SettingsKey = keyof AccessibilitySettings;

/**
 * Which features actually changed.
 *
 * The engine applies only these. Font scaling in particular walks the whole
 * document, so re-applying it because an unrelated toggle moved would be the
 * difference between a responsive panel and a janky one.
 */
export function diffSettings(
  prev: AccessibilitySettings | null,
  next: AccessibilitySettings,
): SettingsKey[] {
  if (prev === null) {
    return ['dyslexicFont', 'highContrast', 'fontScale', 'letterSpacing', 'lineHeight', 'readingAid'];
  }
  const changed: SettingsKey[] = [];
  if (prev.dyslexicFont !== next.dyslexicFont) changed.push('dyslexicFont');
  if (prev.highContrast !== next.highContrast) changed.push('highContrast');
  if (prev.fontScale !== next.fontScale) changed.push('fontScale');
  if (prev.letterSpacing !== next.letterSpacing) changed.push('letterSpacing');
  if (prev.lineHeight !== next.lineHeight) changed.push('lineHeight');
  if (!readingAidEqual(prev.readingAid, next.readingAid)) changed.push('readingAid');
  return changed;
}

/** True when nothing differs from the shipped defaults — drives the trigger's dot badge. */
export function isDefaultSettings(settings: AccessibilitySettings): boolean {
  return settingsEqual(settings, DEFAULT_SETTINGS);
}

export function cloneSettings(settings: AccessibilitySettings): AccessibilitySettings {
  return { ...settings, readingAid: { ...settings.readingAid } };
}
