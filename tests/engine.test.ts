import { beforeEach, describe, expect, it } from 'vitest';
import { ATTRS, CSS_VARS, DEFAULT_SETTINGS, STYLE_IDS } from '../src/core/constants';
import { createAccessibilityEngine } from '../src/core/engine';
import { clearRegistry } from '../src/core/registry';
import { createSyncScheduler } from '../src/core/scheduler';
import type { AccessibilitySettings } from '../src/core/types';

const ALL_ON: AccessibilitySettings = {
  dyslexicFont: true,
  highContrast: true,
  fontScale: 1.5,
  letterSpacing: 0.15,
  lineHeight: 2,
  readingAid: { mode: 'ruler', color: 'rgba(255,0,0,0.3)', height: 50, followMode: 'both' },
};

function makeEngine() {
  // readFontSize is stubbed so font scaling actually writes inline styles here:
  // jsdom resolves computed font-size to '', which would make every write a
  // no-op and quietly hollow out the revert assertions below.
  return createAccessibilityEngine({
    scheduler: createSyncScheduler(),
    readFontSize: () => 16,
  });
}

beforeEach(() => {
  document.body.innerHTML = '<p id="text">Hello</p>';
  clearRegistry(document);
});

describe('engine lifecycle', () => {
  it('injects exactly one base stylesheet, and adopts an existing one', () => {
    const a = makeEngine();
    const first = document.getElementById(STYLE_IDS.base);
    expect(first).toBeInstanceOf(HTMLStyleElement);

    // A second engine (or the preload script having run first) must not
    // produce a duplicate sheet.
    const b = makeEngine();
    expect(document.querySelectorAll(`#${STYLE_IDS.base}`)).toHaveLength(1);

    a.destroy();
    b.destroy();
  });

  it('is inert until a feature is switched on', () => {
    const engine = makeEngine();
    engine.apply(DEFAULT_SETTINGS);

    const root = document.documentElement;
    expect(root.hasAttribute(ATTRS.dyslexic)).toBe(false);
    expect(root.hasAttribute(ATTRS.contrast)).toBe(false);
    expect(root.hasAttribute(ATTRS.letterSpacing)).toBe(false);
    expect(root.hasAttribute(ATTRS.lineHeight)).toBe(false);
    expect(root.getAttribute('style')).toBeNull();

    engine.destroy();
  });

  it('applies each CSS-driven feature as an attribute plus a custom property', () => {
    const engine = makeEngine();
    engine.apply(ALL_ON);

    const root = document.documentElement;
    expect(root.hasAttribute(ATTRS.dyslexic)).toBe(true);
    expect(root.getAttribute(ATTRS.contrast)).toBe('dark');
    expect(root.hasAttribute(ATTRS.letterSpacing)).toBe(true);
    expect(root.style.getPropertyValue(CSS_VARS.letterSpacing)).toBe('0.15em');
    expect(root.hasAttribute(ATTRS.lineHeight)).toBe(true);
    expect(root.style.getPropertyValue(CSS_VARS.lineHeight)).toBe('2');
    expect(document.getElementById(STYLE_IDS.fontFace)).toBeInstanceOf(HTMLStyleElement);

    engine.destroy();
  });

  it('drops the attribute when a slider returns to its neutral value', () => {
    const engine = makeEngine();
    engine.apply({ ...DEFAULT_SETTINGS, letterSpacing: 0.2 });
    expect(document.documentElement.hasAttribute(ATTRS.letterSpacing)).toBe(true);

    // Back to 0: an inert override left behind would still be a change to the
    // host page's computed styles.
    engine.apply({ ...DEFAULT_SETTINGS, letterSpacing: 0 });
    expect(document.documentElement.hasAttribute(ATTRS.letterSpacing)).toBe(false);
    expect(document.documentElement.getAttribute('style')).toBeNull();

    engine.destroy();
  });

  it('leaves lineHeight alone until it stops being null', () => {
    const engine = makeEngine();
    engine.apply({ ...DEFAULT_SETTINGS, lineHeight: null });
    expect(document.documentElement.hasAttribute(ATTRS.lineHeight)).toBe(false);

    engine.apply({ ...DEFAULT_SETTINGS, lineHeight: 1.5 });
    expect(document.documentElement.hasAttribute(ATTRS.lineHeight)).toBe(true);
    expect(document.documentElement.style.getPropertyValue(CSS_VARS.lineHeight)).toBe('1.5');

    engine.destroy();
  });
});

describe('revert', () => {
  it('restores the document byte-for-byte after destroy', () => {
    const headBefore = document.head.innerHTML;
    const htmlBefore = document.documentElement.outerHTML;

    const engine = makeEngine();
    engine.apply(ALL_ON);
    expect(document.documentElement.outerHTML).not.toBe(htmlBefore);
    // Font scaling really did write inline styles that now have to be undone.
    expect(document.getElementById('text')!.style.getPropertyValue('font-size')).toBe('24px');

    engine.destroy();

    expect(document.head.innerHTML).toBe(headBefore);
    expect(document.documentElement.outerHTML).toBe(htmlBefore);
  });

  it('restores the document when every feature is switched off individually', () => {
    const engine = makeEngine();
    const afterInit = document.documentElement.outerHTML;

    engine.apply(ALL_ON);
    engine.apply(DEFAULT_SETTINGS);

    // The base stylesheet is still present and still inert, so the comparison
    // is against the post-init state rather than a virgin document.
    expect(document.documentElement.outerHTML).toBe(afterInit);
    engine.destroy();
  });

  it('is idempotent', () => {
    const engine = makeEngine();
    engine.apply(ALL_ON);
    engine.destroy();
    expect(() => engine.destroy()).not.toThrow();
    expect(document.getElementById(STYLE_IDS.base)).toBeNull();
  });

  it('ignores apply() after destroy', () => {
    const engine = makeEngine();
    engine.destroy();
    engine.apply(ALL_ON);
    expect(document.documentElement.hasAttribute(ATTRS.contrast)).toBe(false);
  });
});

describe('diffing', () => {
  it('reports what has been applied', () => {
    const engine = makeEngine();
    expect(engine.getApplied()).toBeNull();
    engine.apply(ALL_ON);
    expect(engine.getApplied()).toEqual(ALL_ON);
    engine.destroy();
  });

  it('does not hand out a reference to its internal state', () => {
    const engine = makeEngine();
    engine.apply(ALL_ON);
    const applied = engine.getApplied();
    applied!.readingAid.height = 999;
    expect(engine.getApplied()!.readingAid.height).toBe(50);
    engine.destroy();
  });
});
