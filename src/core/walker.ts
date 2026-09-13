import { SKIPPED_TAGS } from './constants';
import type { EngineContext } from './types';

/**
 * True when the element itself holds visible text, as opposed to only
 * containing children that do.
 *
 * Font scaling targets these and these only: setting font-size on a wrapper
 * would be inherited by descendants that are about to be scaled themselves,
 * compounding the multiplier.
 */
export function hasDirectText(el: Element): boolean {
  for (let node = el.firstChild; node !== null; node = node.nextSibling) {
    if (node.nodeType === 3 /* TEXT_NODE */ && (node.nodeValue ?? '').trim() !== '') {
      return true;
    }
  }
  return false;
}

/**
 * Collect the elements font scaling should touch.
 *
 * Deliberately layout-free: no getComputedStyle, no getBoundingClientRect, no
 * getClientRects. This is phase A of the three-phase pass, and a single layout
 * read in here would reintroduce the interleaved read/write pattern the whole
 * design exists to avoid.
 *
 * That means hidden elements are not filtered out — detecting `display: none`
 * requires computed style. They cost one wasted style write each and are
 * invisible either way, which is the cheaper side of the trade.
 *
 * FILTER_REJECT rather than FILTER_SKIP: rejecting prunes the whole subtree, so
 * an excluded ancestor is tested once instead of once per descendant.
 */
export function collectTextElements(ctx: EngineContext, roots: Element[]): Element[] {
  const found: Element[] = [];
  const seen = new Set<Element>();
  const { excludeSelector } = ctx;

  const accept = (el: Element): number => {
    if (SKIPPED_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
    if (excludeSelector !== '') {
      try {
        if (el.matches(excludeSelector)) return NodeFilter.FILTER_REJECT;
      } catch {
        // A malformed host selector must not disable scaling entirely.
      }
    }
    return hasDirectText(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  };

  for (const root of roots) {
    if (!root) continue;
    if (accept(root) === NodeFilter.FILTER_REJECT) continue;
    if (hasDirectText(root) && !seen.has(root)) {
      seen.add(root);
      found.push(root);
    }

    const walker = ctx.doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => accept(node as Element),
    });

    while (walker.nextNode()) {
      const el = walker.currentNode as Element;
      // Overlapping scope selectors (say 'main' and 'article') would otherwise
      // yield the same element twice and scale it twice.
      if (seen.has(el)) continue;
      seen.add(el);
      found.push(el);
    }
  }

  return found;
}
