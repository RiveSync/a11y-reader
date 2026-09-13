import { ATTRS } from './constants';

/**
 * Inject or update a stylesheet, adopting one that already exists.
 *
 * Adoption matters: getPreloadScript() inserts the base stylesheet in <head>
 * before first paint, and the engine must not append a second copy on mount.
 * Writing textContent only when it differs also avoids a gratuitous style
 * recalculation on every apply().
 */
export function ensureStyle(doc: Document, id: string, css: string): HTMLStyleElement {
  const existing = doc.getElementById(id);
  // tagName rather than `instanceof HTMLStyleElement`: the engine accepts a
  // foreign `document` (an iframe, or a second JSDOM in tests), and constructors
  // are per-realm — a cross-realm instanceof is always false, and the global
  // does not exist at all under SSR.
  if (existing && existing.tagName === 'STYLE') {
    const style = existing as HTMLStyleElement;
    if (style.textContent !== css) style.textContent = css;
    return style;
  }
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  doc.head.appendChild(style);
  return style;
}

export function removeStyle(doc: Document, id: string): void {
  doc.getElementById(id)?.remove();
}

export function setRootAttr(doc: Document, name: string, value = ''): void {
  if (doc.documentElement.getAttribute(name) !== value) {
    doc.documentElement.setAttribute(name, value);
  }
}

export function removeRootAttr(doc: Document, name: string): void {
  doc.documentElement.removeAttribute(name);
}

export function setRootVar(doc: Document, name: string, value: string): void {
  doc.documentElement.style.setProperty(name, value);
}

export function removeRootVar(doc: Document, name: string): void {
  doc.documentElement.style.removeProperty(name);
  // Leaving style="" behind would break the byte-identical revert the
  // acceptance criteria depend on.
  if (doc.documentElement.getAttribute('style') === '') {
    doc.documentElement.removeAttribute('style');
  }
}

/** Normalise a `string | string[]` option into a trimmed, non-empty list. */
export function toSelectorList(value: string | string[] | undefined, fallback: string[]): string[] {
  if (value == null) return fallback;
  const list = (Array.isArray(value) ? value : [value]).map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : fallback;
}

/**
 * Every selector that must never be transformed: the host's `exclude` option
 * plus our own shadow hosts, which carry `data-a11y-exclude`.
 */
export function buildExcludeList(exclude: string[]): string[] {
  return [`[${ATTRS.exclude}]`, ...exclude];
}

/**
 * The body of a `:not(:where(...))` guard.
 *
 * `:where()` is what keeps the guard at zero specificity. Without it the
 * blanket rules would outrank the specific ones that follow them — the bug in
 * PRD 5.2, where links never turn yellow because `:not([data-a11y-exclude])`
 * silently contributes (0,1,0).
 */
export function buildExcludeCss(excludeList: string[]): string {
  return excludeList.map((sel) => `${sel}, ${sel} *`).join(', ');
}

/** Matcher for the JS side of the same question. */
export function createExcludeMatcher(excludeList: string[]): (el: Element) => boolean {
  const selector = excludeList.join(', ');
  return (el: Element) => {
    try {
      return el.closest(selector) !== null;
    } catch {
      // A malformed user selector must not take the whole engine down.
      return false;
    }
  };
}

export interface HostOptions {
  zIndex: number;
}

/**
 * A full-viewport, click-through shadow host appended to <body>.
 *
 * Constraints encoded here, both load-bearing:
 *
 * 1. `data-a11y-exclude` keeps our own UI out of the page transformations,
 *    including the inherited properties (color, font-family, letter-spacing,
 *    line-height) that would otherwise cross the shadow boundary.
 * 2. The inline style must never contain `transform`, `filter`,
 *    `backdrop-filter`, `perspective`, `will-change: transform` or
 *    `contain: paint`. Any of those makes this element the containing block
 *    for its `position: fixed` descendants, which collapses the reading-aid
 *    overlays into the host's box. Animate an inner element instead.
 */
export function ensureHost(doc: Document, id: string, opts: HostOptions): HTMLElement {
  const existing = doc.getElementById(id);
  // Same cross-realm reasoning as ensureStyle.
  if (existing) return existing as HTMLElement;

  const host = doc.createElement('div');
  host.id = id;
  host.setAttribute(ATTRS.exclude, '');
  host.style.cssText = [
    'position: fixed',
    'inset: 0',
    'pointer-events: none',
    'margin: 0',
    'padding: 0',
    'border: 0',
    'background: none',
    `z-index: ${opts.zIndex}`,
  ].join('; ');
  doc.body.appendChild(host);
  return host;
}

export function removeHost(doc: Document, id: string): void {
  doc.getElementById(id)?.remove();
}
