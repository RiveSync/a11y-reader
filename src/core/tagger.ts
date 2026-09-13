import { ATTRS, ICON_CANDIDATE_SELECTOR, ICON_FONT_FAMILIES } from './constants';
import { getRegistry } from './registry';
import type { EngineContext } from './types';

const ICON_FAMILY_SET = new Set<string>(ICON_FONT_FAMILIES);

/** First family of a font stack, unquoted and lowercased. */
function firstFamily(stack: string): string {
  const first = stack.split(',')[0] ?? '';
  return first.trim().replace(/^["']|["']$/g, '').toLowerCase();
}

/**
 * An element that carries no real text but does carry a glyph — the
 * `<i class="icon-x"></i>` shape, where the glyph comes from ::before. Safe to
 * tag even on a false positive: there is no text for the font swap to improve.
 */
function looksLikeGlyphOnly(el: Element): boolean {
  return (
    el.getAttribute('aria-hidden') === 'true' &&
    el.childElementCount === 0 &&
    (el.textContent ?? '').trim().length <= 2
  );
}

export interface Tagger {
  tagAll(): void;
  tagSubtree(node: Node): void;
  untagAll(): void;
}

/**
 * Marks icon-font elements with `data-a11y-icon` so the dyslexic font rule can
 * exclude them.
 *
 * This must run BEFORE `data-a11y-dyslexic` is set on <html>. PRD 5.1 proposed
 * excluding elements "whose computed font-family matches a known icon-font
 * list", but once the blanket rule is live every element computes to
 * OpenDyslexic and the scan matches nothing. An author !important rule can only
 * be beaten by an !important *inline* declaration, so there is no way to
 * un-break it afterwards either — the exclusion has to be decided up front and
 * fed into the selector's :not().
 *
 * Cost control: getComputedStyle on every element would dominate the whole
 * feature, so candidates are narrowed structurally first.
 */
export function createTagger(ctx: EngineContext): Tagger {
  const registry = getRegistry(ctx.doc);

  const consider = (el: Element): void => {
    if (registry.iconTagged.has(el)) return;
    if (ctx.isExcluded(el)) return;

    let isIcon = false;
    try {
      isIcon = ICON_FAMILY_SET.has(firstFamily(ctx.win.getComputedStyle(el).fontFamily));
    } catch {
      isIcon = false;
    }
    if (!isIcon) isIcon = looksLikeGlyphOnly(el);
    if (!isIcon) return;

    el.setAttribute(ATTRS.icon, '');
    registry.iconTagged.add(el);
  };

  const scan = (root: Element): void => {
    let candidates: Element[];
    try {
      candidates = [...root.querySelectorAll(ICON_CANDIDATE_SELECTOR)];
    } catch {
      return;
    }
    if (root.matches(ICON_CANDIDATE_SELECTOR)) candidates.unshift(root);
    for (const el of candidates) consider(el);
  };

  const hasCandidates = (el: Element): boolean => {
    try {
      return el.matches(ICON_CANDIDATE_SELECTOR) || el.querySelector(ICON_CANDIDATE_SELECTOR) !== null;
    } catch {
      return false;
    }
  };

  /**
   * Run a scan with the dyslexic rule temporarily switched off.
   *
   * The scan reads computed font-family, so it is blind whenever the blanket
   * rule is already live — every element reports OpenDyslexic. That happens in
   * two situations, and both need this:
   *
   * 1. Nodes added after the user switched the feature on.
   * 2. **Every page load for a returning visitor**, because getPreloadScript()
   *    sets the attribute in <head> before the engine ever mounts. Without
   *    this, icons survive the first visit and break on every one after.
   *
   * Invisible to the user: it is synchronous within one task, so the browser
   * cannot paint between the two attribute writes. The cost is a forced style
   * recalculation, which is why callers gate it on there being candidates.
   */
  const scanSuspended = (targets: Element[]): void => {
    const root = ctx.doc.documentElement;
    const wasActive = root.hasAttribute(ATTRS.dyslexic);
    if (wasActive) root.removeAttribute(ATTRS.dyslexic);
    try {
      for (const target of targets) scan(target);
    } finally {
      if (wasActive) root.setAttribute(ATTRS.dyslexic, '');
    }
  };

  return {
    tagAll() {
      scanSuspended(ctx.roots());
    },

    tagSubtree(node) {
      if (node.nodeType !== 1) return;
      const el = node as Element;
      if (!hasCandidates(el)) return;
      scanSuspended([el]);
    },
    untagAll() {
      for (const el of registry.iconTagged) el.removeAttribute(ATTRS.icon);
      registry.iconTagged.clear();
    },
  };
}
