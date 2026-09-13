import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, RANGES } from '../src/core/constants';
import {
  clampToRange,
  cloneSettings,
  diffSettings,
  isDefaultSettings,
  mergeSettings,
  settingsEqual,
} from '../src/core/settings';

describe('clampToRange', () => {
  it('clamps to the declared bounds', () => {
    expect(clampToRange(99, RANGES.fontScale)).toBe(2);
    expect(clampToRange(-4, RANGES.fontScale)).toBe(0.5);
  });

  it('falls back to the minimum for non-finite input', () => {
    expect(clampToRange(NaN, RANGES.fontScale)).toBe(0.5);
    expect(clampToRange(Infinity, RANGES.letterSpacing)).toBe(0);
  });

  it('rounds to the step precision so float drift never reaches the DOM', () => {
    // 1.1 + 0.1 = 1.2000000000000002; that must not become a font-size.
    expect(clampToRange(1.1 + 0.1, RANGES.fontScale)).toBe(1.2);
    expect(clampToRange(0.1 + 0.2, RANGES.lineHeight)).toBe(1);
    expect(clampToRange(0.15000000000000002, RANGES.letterSpacing)).toBe(0.15);
  });
});

describe('mergeSettings', () => {
  it('returns defaults for anything that is not an object', () => {
    for (const junk of [null, undefined, 'x', 42, [], true]) {
      expect(mergeSettings(junk)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('ignores fields of the wrong type rather than throwing', () => {
    const merged = mergeSettings({
      dyslexicFont: 'yes',
      highContrast: 1,
      fontScale: 'big',
      letterSpacing: null,
    });
    expect(merged).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps out-of-range numbers', () => {
    const merged = mergeSettings({ fontScale: 99, letterSpacing: -1, lineHeight: 100 });
    expect(merged.fontScale).toBe(2);
    expect(merged.letterSpacing).toBe(0);
    expect(merged.lineHeight).toBe(3);
  });

  it('treats lineHeight as tri-state', () => {
    // explicit null = untouched, a number = applied, absent = keep the base
    expect(mergeSettings({ lineHeight: null }).lineHeight).toBeNull();
    expect(mergeSettings({ lineHeight: 2 }).lineHeight).toBe(2);
    expect(mergeSettings({}, { ...DEFAULT_SETTINGS, lineHeight: 1.8 }).lineHeight).toBe(1.8);
  });

  it('merges readingAid deeply and rejects unknown enum values', () => {
    const merged = mergeSettings({ readingAid: { mode: 'mask', height: 9999, followMode: 'nope' } });
    expect(merged.readingAid.mode).toBe('mask');
    expect(merged.readingAid.height).toBe(RANGES.aidHeight.max);
    expect(merged.readingAid.followMode).toBe(DEFAULT_SETTINGS.readingAid.followMode);
    expect(merged.readingAid.color).toBe(DEFAULT_SETTINGS.readingAid.color);
  });

  it('does not alias the base settings object', () => {
    const merged = mergeSettings({});
    merged.readingAid.height = 999;
    expect(DEFAULT_SETTINGS.readingAid.height).not.toBe(999);
  });
});

describe('diffSettings', () => {
  it('reports every feature when nothing has been applied yet', () => {
    expect(diffSettings(null, DEFAULT_SETTINGS)).toHaveLength(6);
  });

  it('reports nothing when the settings are equal', () => {
    expect(diffSettings(DEFAULT_SETTINGS, cloneSettings(DEFAULT_SETTINGS))).toEqual([]);
  });

  it('reports only what changed', () => {
    const next = { ...DEFAULT_SETTINGS, fontScale: 1.4 };
    expect(diffSettings(DEFAULT_SETTINGS, next)).toEqual(['fontScale']);
  });

  it('detects a nested readingAid change', () => {
    const next = cloneSettings(DEFAULT_SETTINGS);
    next.readingAid.mode = 'ruler';
    expect(diffSettings(DEFAULT_SETTINGS, next)).toEqual(['readingAid']);
  });

  it('distinguishes lineHeight null from a number', () => {
    const touched = { ...DEFAULT_SETTINGS, lineHeight: 1.5 };
    expect(diffSettings(DEFAULT_SETTINGS, touched)).toEqual(['lineHeight']);
    expect(settingsEqual(DEFAULT_SETTINGS, touched)).toBe(false);
  });
});

describe('isDefaultSettings', () => {
  it('drives the trigger badge', () => {
    expect(isDefaultSettings(DEFAULT_SETTINGS)).toBe(true);
    expect(isDefaultSettings({ ...DEFAULT_SETTINGS, highContrast: true })).toBe(false);
  });
});
