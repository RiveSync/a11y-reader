import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { STORAGE_VERSION, STYLE_IDS } from '../../src/core/constants';
import { createAccessibilityEngine } from '../../src/core/engine';
import { getPreloadScript } from '../../src/core/preload';
import { createSyncScheduler } from '../../src/core/scheduler';
import { mergeSettings } from '../../src/core/settings';
import { resolveFontUrls } from '../../src/core/features/dyslexicFont';

/**
 * The preload script and the engine are two implementations of the same
 * behaviour — one inlined into <head> as a string, one running on mount. They
 * are only allowed to exist because they share buildBaseCss(); this test is
 * what proves they have not drifted.
 *
 * It runs in a node environment with no ambient DOM, which is also a standing
 * check that building the script touches no globals.
 */

const KEY = 'a11y-reader:settings';
const FONT_URLS = resolveFontUrls('cdn');

function freshDom() {
  return new JSDOM('<!doctype html><html><head></head><body><p>text</p></body></html>', {
    url: 'https://example.test/',
    runScripts: 'outside-only',
  });
}

interface Snapshot {
  attributes: string[];
  inlineStyle: string;
  baseCss: string | null;
  fontCss: string | null;
}

function snapshot(doc: Document): Snapshot {
  const root = doc.documentElement;
  return {
    attributes: [...root.attributes]
      .map((a) => `${a.name}=${a.value}`)
      .sort(),
    inlineStyle: root.getAttribute('style') ?? '',
    baseCss: doc.getElementById(STYLE_IDS.base)?.textContent ?? null,
    fontCss: doc.getElementById(STYLE_IDS.fontFace)?.textContent ?? null,
  };
}

function viaPreload(stored: unknown): Snapshot {
  const dom = freshDom();
  if (stored !== undefined) {
    dom.window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: STORAGE_VERSION, settings: stored }),
    );
  }
  dom.window.eval(getPreloadScript({ storageKey: KEY, fontUrls: FONT_URLS }));
  return snapshot(dom.window.document);
}

function viaEngine(stored: unknown): Snapshot {
  const dom = freshDom();
  const engine = createAccessibilityEngine({
    document: dom.window.document,
    scheduler: createSyncScheduler(),
    fontSource: 'cdn',
  });
  engine.apply(mergeSettings(stored));
  return snapshot(dom.window.document);
}

describe('preload / engine parity', () => {
  it('produces byte-identical CSS', () => {
    expect(viaPreload({}).baseCss).toBe(viaEngine({}).baseCss);
  });

  it('agrees on a page with nothing stored', () => {
    expect(viaPreload(undefined)).toEqual(viaEngine(undefined));
  });

  it.each([
    ['high contrast', { highContrast: true }],
    ['dyslexic font', { dyslexicFont: true }],
    ['letter spacing', { letterSpacing: 0.25 }],
    ['line spacing', { lineHeight: 2.2 }],
    ['everything at once', { dyslexicFont: true, highContrast: true, letterSpacing: 0.1, lineHeight: 1.8 }],
  ])('agrees on %s', (_label, stored) => {
    expect(viaPreload(stored)).toEqual(viaEngine(stored));
  });

  it('agrees when clamping an out-of-range stored value', () => {
    // A hand-edited or downgraded entry must not produce two different pages
    // depending on whether the preload ran.
    expect(viaPreload({ letterSpacing: 99, lineHeight: -5 })).toEqual(
      viaEngine({ letterSpacing: 99, lineHeight: -5 }),
    );
  });

  it('agrees that an untouched line height applies nothing', () => {
    const preload = viaPreload({ lineHeight: null });
    expect(preload).toEqual(viaEngine({ lineHeight: null }));
    expect(preload.inlineStyle).toBe('');
  });
});

describe('preload robustness', () => {
  it('still injects the stylesheet when storage is empty', () => {
    expect(viaPreload(undefined).baseCss).toBeTruthy();
  });

  it('survives malformed stored JSON', () => {
    const dom = freshDom();
    dom.window.localStorage.setItem(KEY, '{ not json');
    expect(() => dom.window.eval(getPreloadScript({ storageKey: KEY }))).not.toThrow();
    expect(dom.window.document.getElementById(STYLE_IDS.base)).toBeTruthy();
  });

  it('does not inject a second stylesheet when run twice', () => {
    const dom = freshDom();
    const script = getPreloadScript({ storageKey: KEY });
    dom.window.eval(script);
    dom.window.eval(script);
    expect(dom.window.document.querySelectorAll(`#${STYLE_IDS.base}`)).toHaveLength(1);
  });

  it('applies a CSP nonce to the style it injects', () => {
    const dom = freshDom();
    dom.window.eval(getPreloadScript({ storageKey: KEY, nonce: 'abc123' }));
    expect(dom.window.document.getElementById(STYLE_IDS.base)!.getAttribute('nonce')).toBe('abc123');
  });

  it('cannot break out of its host <script> tag', () => {
    const script = getPreloadScript({ storageKey: '</script><script>alert(1)</script>' });
    expect(script).not.toContain('</script>');
  });
});
