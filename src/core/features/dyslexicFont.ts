import { ATTRS, STYLE_IDS } from '../constants';
import { ensureStyle, removeRootAttr, removeStyle, setRootAttr } from '../dom';
import { buildFontFaceCss } from '../styles';
import { createTagger } from '../tagger';
import type { EngineContext, FeatureModule, FontSource } from '../types';

const FONT_FILES = {
  regular: 'opendyslexic-latin-400-normal.woff2',
  bold: 'opendyslexic-latin-700-normal.woff2',
} as const;

/** Pinned: an unpinned CDN path is a silent breakage waiting for a font release. */
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.3.0/files/';

export interface ResolvedFontUrls {
  regular: string;
  bold?: string;
}

/**
 * A bundler-rewritten URL is usable; a raw file:// path is not.
 *
 * If no bundler rewrote the `new URL(...)` below, it resolves against the
 * module's own location on disk and yields file:///…/dist/fonts/…, which is a
 * path on whoever *built* the app — dead for every visitor. Detecting that is
 * what turns a silently missing font into a CDN fallback.
 */
function isUsable(url: string): boolean {
  if (!url.startsWith('file:')) return true;
  return typeof location !== 'undefined' && location.protocol === 'file:';
}

/**
 * Where the package's own font files live at runtime.
 *
 * The `new URL('<string literal>', import.meta.url)` form is load-bearing:
 * webpack 5, Vite and Next only rewrite it into an emitted asset when both
 * arguments are statically analysable. Assigning import.meta.url to a variable
 * first, or building the path by concatenation, defeats that analysis — the
 * call then survives to runtime and produces a file:// URL.
 *
 * In the CJS build esbuild replaces import.meta with {}, so `new URL(x,
 * undefined)` throws and we fall through to the CDN.
 */
function bundledFontUrls(): ResolvedFontUrls | null {
  try {
    const regular = new URL('./fonts/opendyslexic-latin-400-normal.woff2', import.meta.url).href;
    const bold = new URL('./fonts/opendyslexic-latin-700-normal.woff2', import.meta.url).href;
    if (!isUsable(regular)) return null;
    return { regular, bold };
  } catch {
    return null;
  }
}

export function resolveFontUrls(source: FontSource): ResolvedFontUrls {
  if (typeof source === 'object') {
    return { regular: source.regular, bold: source.bold };
  }

  if (source === 'bundled') {
    const bundled = bundledFontUrls();
    // Falling through to the CDN keeps the feature working rather than
    // silently rendering nothing.
    if (bundled) return bundled;
  }

  return { regular: CDN_BASE + FONT_FILES.regular, bold: CDN_BASE + FONT_FILES.bold };
}

/**
 * OpenDyslexic, applied to page text but not to icon glyphs.
 *
 * The ordering in apply() is load-bearing and must not be rearranged:
 * the icon scan reads computed font-family, so it has to finish before the
 * blanket rule starts reporting OpenDyslexic for every element on the page.
 */
export const dyslexicFont: FeatureModule<boolean> = {
  apply(value: boolean, ctx: EngineContext) {
    if (!value) {
      dyslexicFont.remove(ctx);
      return;
    }

    // 1. Tag icons while computed font-family still reports the host's fonts.
    createTagger(ctx).tagAll();

    // 2. Load the font only now — the bytes never touch a page whose visitor
    //    did not ask for them.
    const urls = resolveFontUrls(ctx.fontSource);
    ensureStyle(ctx.doc, STYLE_IDS.fontFace, buildFontFaceCss(urls));

    // 3. Activate. The rule itself already lives in the base stylesheet.
    setRootAttr(ctx.doc, ATTRS.dyslexic);
  },

  remove(ctx: EngineContext) {
    removeRootAttr(ctx.doc, ATTRS.dyslexic);
    createTagger(ctx).untagAll();
    // The @font-face block is dropped too, so a full revert leaves no trace in
    // <head>. Re-enabling re-injects it; the file itself stays in HTTP cache.
    removeStyle(ctx.doc, STYLE_IDS.fontFace);
  },
};
