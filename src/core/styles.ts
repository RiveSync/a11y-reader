import { ATTRS, CSS_VARS } from './constants';

/**
 * All page-transformation CSS lives in one attribute-gated stylesheet.
 *
 * Every rule is scoped to a `data-a11y-*` attribute on <html>, so the sheet is
 * completely inert until a feature is switched on. That buys two things:
 * applying a feature is a single attribute write rather than a stylesheet
 * injection, and getPreloadScript() can emit the identical CSS before first
 * paint from the same builder — which is what stops the preload and the engine
 * from drifting apart.
 *
 * Specificity is the thing to be careful with in this file. The blanket rules
 * deliberately sit at (0,1,0): `:where(body, body *)` contributes nothing, and
 * the exclusion guard is wrapped in `:where()` so it contributes nothing
 * either. PRD 5.2 omitted that wrapper, which pushed the blanket to (0,2,0)
 * and made every rule after it dead code.
 */

export interface BaseCssOptions {
  /** Body of the `:not(:where(...))` guard — see buildExcludeCss. */
  excludeCss: string;
  /** PRD 6.3 theme.contrastGrayscaleMedia. */
  grayscaleMedia?: boolean;
}

const DYSLEXIC_STACK = `'OpenDyslexic', sans-serif`;

/** Text-bearing controls that must keep their own metrics. */
const LINE_HEIGHT_EXEMPT = 'input, textarea, select, button, code, kbd, samp, pre';

export function buildDyslexicCss({ excludeCss }: BaseCssOptions): string {
  // `[data-a11y-icon]` is populated by the tagger BEFORE the attribute below is
  // set — once the rule is live every element computes to OpenDyslexic and a
  // computed-font-family scan can no longer tell an icon from a paragraph.
  return `
[${ATTRS.dyslexic}] :where(body, body *):not(:where(${excludeCss}, [${ATTRS.icon}], [${ATTRS.icon}] *)) {
  font-family: ${DYSLEXIC_STACK} !important;
}`.trim();
}

export function buildContrastCss({ excludeCss, grayscaleMedia }: BaseCssOptions): string {
  const guard = `:not(:where(${excludeCss}))`;
  return `
/* Root first: PRD 5.2 styled only body and its descendants, which leaves the
   canvas showing through as white gutters on a short page. */
html[${ATTRS.contrast}="dark"] {
  background-color: #000 !important;
  color: #fff !important;
  color-scheme: dark;
}

/* Blanket, (0,1,0). background-image is set to none because it paints OVER
   background-color: without this a gradient or hero image survives while the
   text on top is forced white. Cost: CSS-sprite icons disappear. */
[${ATTRS.contrast}="dark"] :where(body, body *)${guard} {
  background-color: #000 !important;
  background-image: none !important;
  color: #fff !important;
  border-color: #fff !important;
  text-shadow: none !important;
  box-shadow: none !important;
}

/* Real media, (0,2,0) via [role="img"]. Beats the blanket, so transparent
   PNGs do not gain a black box and real background images survive. */
[${ATTRS.contrast}="dark"] :is(img, picture, video, canvas, svg, iframe, [role="img"])${guard} {
  background-color: transparent !important;
  background-image: revert !important;
}${
    grayscaleMedia
      ? `
[${ATTRS.contrast}="dark"] :is(img, picture, video, canvas, svg)${guard} {
  filter: grayscale(1) !important;
}`
      : ''
  }

/* Links, (0,1,2). */
[${ATTRS.contrast}="dark"] :is(a, a *)${guard} {
  color: #ffff00 !important;
}

/* Controls, (0,1,1). outline-offset is negative so the ring stays inside the
   control's box and cannot overlap neighbouring content. */
[${ATTRS.contrast}="dark"] :is(button, input, select, textarea)${guard} {
  background-color: #000 !important;
  color: #fff !important;
  outline: 2px solid #fff !important;
  outline-offset: -2px;
}

[${ATTRS.contrast}="dark"] ::placeholder {
  color: #bbbbbb !important;
  opacity: 1 !important;
}

/* Focus must stay visible against the forced black background. */
[${ATTRS.contrast}="dark"] :focus-visible {
  outline: 3px solid #ffff00 !important;
  outline-offset: 2px;
}`.trim();
}

export function buildLetterSpacingCss({ excludeCss }: BaseCssOptions): string {
  return `
[${ATTRS.letterSpacing}] :where(body, body *):not(:where(${excludeCss})) {
  letter-spacing: var(${CSS_VARS.letterSpacing}, 0em) !important;
}`.trim();
}

export function buildLineHeightCss({ excludeCss }: BaseCssOptions): string {
  // Controls and code keep their own metrics: forcing line-height on an <input>
  // shifts the caret off-centre, and on a <pre> it breaks alignment.
  return `
[${ATTRS.lineHeight}] :where(body, body *):not(:where(${excludeCss}, ${LINE_HEIGHT_EXEMPT})) {
  line-height: var(${CSS_VARS.lineHeight}, normal) !important;
}`.trim();
}

/**
 * The complete attribute-gated stylesheet.
 *
 * Shared verbatim between the engine and getPreloadScript(); a parity test
 * asserts the two produce the same bytes for the same options.
 */
export function buildBaseCss(opts: BaseCssOptions): string {
  return [
    '/* @rivesync/a11y-reader — page transformations. Inert until a data-a11y-* attribute is set on <html>. */',
    buildDyslexicCss(opts),
    buildContrastCss(opts),
    buildLetterSpacingCss(opts),
    buildLineHeightCss(opts),
  ].join('\n\n');
}

export interface FontFaceOptions {
  regular: string;
  bold?: string;
}

/**
 * Lazy @font-face rules, injected only when the dyslexic toggle is first
 * switched on so the font bytes never land on a page nobody asked them for.
 *
 * Only Regular and Bold are shipped (235 kB, inside the 300 kB budget);
 * italics are synthesised by the browser.
 */
export function buildFontFaceCss({ regular, bold }: FontFaceOptions): string {
  const face = (url: string, weight: number) => `
@font-face {
  font-family: 'OpenDyslexic';
  src: url('${url}') format('woff2');
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
}`;
  return [face(regular, 400), bold ? face(bold, 700) : ''].filter(Boolean).join('\n').trim();
}
