import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, RANGES, LINE_HEIGHT_DISPLAY_DEFAULT } from '../src/core/constants';

describe('defaults', () => {
  it('start every feature off, so the host page is untouched until a user opts in', () => {
    expect(DEFAULT_SETTINGS.dyslexicFont).toBe(false);
    expect(DEFAULT_SETTINGS.highContrast).toBe(false);
    expect(DEFAULT_SETTINGS.fontScale).toBe(1);
    expect(DEFAULT_SETTINGS.letterSpacing).toBe(0);
    expect(DEFAULT_SETTINGS.readingAid.mode).toBe('off');
  });

  it('leave lineHeight null so the host site keeps its own typography on first load', () => {
    expect(DEFAULT_SETTINGS.lineHeight).toBeNull();
    expect(LINE_HEIGHT_DISPLAY_DEFAULT).toBe(1.5);
  });

  it('keep every numeric default inside its declared range', () => {
    expect(DEFAULT_SETTINGS.fontScale).toBeGreaterThanOrEqual(RANGES.fontScale.min);
    expect(DEFAULT_SETTINGS.fontScale).toBeLessThanOrEqual(RANGES.fontScale.max);
    expect(DEFAULT_SETTINGS.letterSpacing).toBeGreaterThanOrEqual(RANGES.letterSpacing.min);
    expect(DEFAULT_SETTINGS.letterSpacing).toBeLessThanOrEqual(RANGES.letterSpacing.max);
    expect(LINE_HEIGHT_DISPLAY_DEFAULT).toBeGreaterThanOrEqual(RANGES.lineHeight.min);
    expect(LINE_HEIGHT_DISPLAY_DEFAULT).toBeLessThanOrEqual(RANGES.lineHeight.max);
    expect(DEFAULT_SETTINGS.readingAid.height).toBeGreaterThanOrEqual(RANGES.aidHeight.min);
    expect(DEFAULT_SETTINGS.readingAid.height).toBeLessThanOrEqual(RANGES.aidHeight.max);
  });
});
