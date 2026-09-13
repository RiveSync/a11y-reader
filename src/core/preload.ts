import { ATTRS, CSS_VARS, DEFAULT_STORAGE_KEY, RANGES, STORAGE_VERSION, STYLE_IDS } from './constants';
import { buildExcludeCss, buildExcludeList, toSelectorList } from './dom';
import { buildBaseCss, buildFontFaceCss } from './styles';

export interface PreloadScriptOptions {
  storageKey?: string;
  /** CSP nonce. Applied to the <style> this script injects; set the same value on the <script> tag. */
  nonce?: string;
  exclude?: string | string[];
  grayscaleMedia?: boolean;
  /** When given, a stored dyslexic-font preference also preloads the @font-face. */
  fontUrls?: { regular: string; bold?: string };
}

/** Embed a string in JS source without letting it terminate the host <script>. */
function literal(value: string): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

/** 10^(decimal places in step) — matches clampToRange's rounding exactly. */
function factorFor(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 1 : 10 ** (text.length - dot - 1);
}

/**
 * An inline script for <head> that applies stored preferences before first paint.
 *
 * PRD 7 described this as setting data attributes early, but that alone cannot
 * prevent the flash it exists to prevent: the attributes select nothing until
 * the matching rules are in the document, and those are injected when the
 * engine mounts. So this emits the stylesheet too — from buildBaseCss, the same
 * builder the engine uses, which is what keeps the two from drifting. The
 * engine's ensureStyle() then adopts the element rather than adding a second.
 *
 * What it cannot cover: font scaling, which is JS-driven by design and applies
 * on hydration.
 *
 * Usage in Next.js App Router:
 *
 *   <script dangerouslySetInnerHTML={{ __html: getPreloadScript() }} />
 */
export function getPreloadScript(options: PreloadScriptOptions = {}): string {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const excludeCss = buildExcludeCss(buildExcludeList(toSelectorList(options.exclude, [])));
  const css = buildBaseCss({ excludeCss, grayscaleMedia: options.grayscaleMedia ?? false });
  const fontCss = options.fontUrls ? buildFontFaceCss(options.fontUrls) : '';

  const lsFactor = factorFor(RANGES.letterSpacing.step);
  const lhFactor = factorFor(RANGES.lineHeight.step);

  return `(function(){try{
var d=document.documentElement,h=document.head||d;
function mk(id,css){if(document.getElementById(id))return;var s=document.createElement("style");s.id=id;${
    options.nonce ? `s.setAttribute("nonce",${literal(options.nonce)});` : ''
  }s.textContent=css;h.appendChild(s);}
mk(${literal(STYLE_IDS.base)},${literal(css)});
var raw=null;try{raw=localStorage.getItem(${literal(storageKey)});}catch(e){}
if(!raw)return;
var p=JSON.parse(raw);
if(!p||p.version!==${STORAGE_VERSION}||!p.settings)return;
var v=p.settings;
function cl(n,mn,mx,f){if(typeof n!=="number"||!isFinite(n))return mn;return Math.round(Math.min(mx,Math.max(mn,n))*f)/f;}
if(v.dyslexicFont===true){d.setAttribute(${literal(ATTRS.dyslexic)},"");${
    fontCss ? `mk(${literal(STYLE_IDS.fontFace)},${literal(fontCss)});` : ''
  }}
if(v.highContrast===true)d.setAttribute(${literal(ATTRS.contrast)},"dark");
if(typeof v.letterSpacing==="number"){var ls=cl(v.letterSpacing,${RANGES.letterSpacing.min},${RANGES.letterSpacing.max},${lsFactor});if(ls>0){d.style.setProperty(${literal(CSS_VARS.letterSpacing)},ls+"em");d.setAttribute(${literal(ATTRS.letterSpacing)},"");}}
if(typeof v.lineHeight==="number"){var lh=cl(v.lineHeight,${RANGES.lineHeight.min},${RANGES.lineHeight.max},${lhFactor});d.style.setProperty(${literal(CSS_VARS.lineHeight)},String(lh));d.setAttribute(${literal(ATTRS.lineHeight)},"");}
}catch(e){}})();`;
}
