import { describe, expect, it } from 'vitest';
import { buildBaseCss, buildContrastCss, buildFontFaceCss } from '../src/core/styles';
import { buildExcludeCss, buildExcludeList } from '../src/core/dom';

const excludeCss = buildExcludeCss(buildExcludeList([]));
const css = buildBaseCss({ excludeCss });

describe('specificity guards', () => {
  /**
   * The bug this locks down: `:not()` takes the specificity of its most
   * specific argument, so a bare `:not([data-a11y-exclude], ...)` contributes
   * (0,1,0) and pushes the blanket rules to (0,2,0) — above the link, media and
   * control rules that are supposed to override them. Wrapping the argument in
   * `:where()` collapses it to zero. Every guard in the sheet must have it.
   *
   * Real cascade behaviour can only be verified in a browser; this is the cheap
   * structural proof that the wrapper has not been dropped.
   */
  it('wraps every :not() argument in :where()', () => {
    const guards = css.match(/:not\(.{0,8}/g) ?? [];
    expect(guards.length).toBeGreaterThan(0);
    for (const guard of guards) {
      expect(guard.startsWith(':not(:where(')).toBe(true);
    }
  });

  it('orders the specific contrast rules after the blanket rule', () => {
    const contrast = buildContrastCss({ excludeCss });
    const blanket = contrast.indexOf('border-color: #fff');
    const media = contrast.indexOf('background-image: revert');
    const links = contrast.indexOf('#ffff00 !important');

    expect(blanket).toBeGreaterThan(-1);
    expect(media).toBeGreaterThan(blanket);
    expect(links).toBeGreaterThan(blanket);
  });
});

describe('high contrast', () => {
  it('styles the root element, not just body', () => {
    // Without this the canvas shows through as white gutters on a short page.
    expect(buildContrastCss({ excludeCss })).toContain('html[data-a11y-contrast="dark"]');
  });

  it('sets color-scheme so native scrollbars and form chrome follow', () => {
    expect(buildContrastCss({ excludeCss })).toContain('color-scheme: dark');
  });

  it('removes background images, which paint over background-color', () => {
    expect(buildContrastCss({ excludeCss })).toContain('background-image: none !important');
  });

  it('gives real media its background back so transparent PNGs are not boxed', () => {
    const contrast = buildContrastCss({ excludeCss });
    expect(contrast).toContain('background-color: transparent !important');
    expect(contrast).toContain('background-image: revert !important');
  });

  it('keeps focus visible against the forced black background', () => {
    expect(buildContrastCss({ excludeCss })).toContain(':focus-visible');
  });

  it('applies grayscale to media only when asked', () => {
    expect(buildContrastCss({ excludeCss })).not.toContain('grayscale(1)');
    expect(buildContrastCss({ excludeCss, grayscaleMedia: true })).toContain('grayscale(1)');
  });
});

describe('dyslexic font rule', () => {
  it('excludes icon-tagged elements and their descendants', () => {
    expect(css).toContain('[data-a11y-icon]');
    expect(css).toContain('[data-a11y-icon] *');
  });
});

describe('line height rule', () => {
  it('exempts controls and code, which need their own metrics', () => {
    for (const tag of ['input', 'textarea', 'select', 'button', 'code', 'pre']) {
      expect(css).toMatch(new RegExp(`data-a11y-line-height[\\s\\S]*?\\b${tag}\\b`));
    }
  });
});

describe('font faces', () => {
  it('ships only the two weights that fit the size budget', () => {
    const faces = buildFontFaceCss({ regular: '/r.woff2', bold: '/b.woff2' });
    expect(faces.match(/@font-face/g)).toHaveLength(2);
    expect(faces).toContain('font-weight: 400');
    expect(faces).toContain('font-weight: 700');
  });

  it('uses font-display: swap so text is never invisible while loading', () => {
    expect(buildFontFaceCss({ regular: '/r.woff2' })).toContain('font-display: swap');
  });

  it('omits bold when no bold file is supplied', () => {
    expect(buildFontFaceCss({ regular: '/r.woff2' }).match(/@font-face/g)).toHaveLength(1);
  });
});

describe('inertness', () => {
  it('gates every rule behind a data-a11y attribute on <html>', () => {
    // Anything not gated would change the host page the moment the engine mounts.
    const selectors = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('}')
      .map((block) => block.split('{')[0]?.trim() ?? '')
      .filter((sel) => sel !== '' && !sel.startsWith('@'));

    expect(selectors.length).toBeGreaterThan(5);
    for (const selector of selectors) {
      expect(selector).toMatch(/\[data-a11y-(dyslexic|contrast|letter-spacing|line-height)/);
    }
  });
});
