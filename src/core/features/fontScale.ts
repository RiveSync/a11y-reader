import { getRegistry } from '../registry';
import { collectTextElements } from '../walker';
import type { EngineContext, FeatureModule } from '../types';

/** Two decimals is below perceptual threshold and keeps the style attribute readable. */
function roundPx(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Apply a scale to a known set of elements in three strict phases.
 *
 * This is the whole point of the feature's design. PRD 5.3 specified a single
 * loop that, per element, read getComputedStyle and then wrote inline style.
 * Every style write invalidates document style, so the next read forces a full
 * recalculation — 5,000 elements means 5,000 forced recalcs, which is hundreds
 * of milliseconds to seconds rather than the 50 ms budget in the same section.
 *
 *   Phase A  structure  — collectTextElements(), no style access at all
 *   Phase B  reads      — one getComputedStyle per *new* element
 *   Phase C  writes     — inline font-size for all
 *
 * Phase B triggers one recalculation in total; the rest are cheap reads off
 * already-computed style.
 *
 * Note that phase C does read `el.style` — but that is the inline declaration
 * block, not resolved style, so it costs no recalculation.
 */
function scaleElements(elements: Element[], scale: number, ctx: EngineContext): void {
  const registry = getRegistry(ctx.doc);

  // ---- Phase B: reads only. No writes may appear in this loop. ----
  const originals = new Float64Array(elements.length);
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!;
    const record = registry.fontScale.get(el);
    // An already-tracked element must never be re-measured: computed style now
    // reports *our* scaled value, and re-reading it would compound the scale on
    // every slider step.
    originals[i] = record ? record.original : ctx.readFontSize(el);
  }

  // ---- Phase C: writes only. ----
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!;
    const original = originals[i]!;
    if (!(original > 0)) continue;

    let record = registry.fontScale.get(el);
    if (!record) {
      record = {
        original,
        // Captured from the style attribute, not computed style, and captured
        // before we overwrite it — this is what makes revert lossless for a
        // host that had its own inline font-size.
        priorInline: (el as HTMLElement).style.getPropertyValue('font-size'),
        priorPriority: (el as HTMLElement).style.getPropertyPriority('font-size'),
        written: '',
      };
      registry.fontScale.set(el, record);
      registry.fontScaleSet.add(el);
    }

    const next = `${roundPx(original * scale)}px`;
    // Value comparison, not an `isApplying` boolean. Mutation records arrive as
    // microtasks while our work is deferred to a frame, so a flag's window is
    // the wrong shape; comparing what is actually on the element converges in
    // one pass and cannot loop.
    if (record.written === next && (el as HTMLElement).style.getPropertyValue('font-size') === next) {
      continue;
    }
    record.written = next;
    (el as HTMLElement).style.setProperty('font-size', next, 'important');
  }
}

/**
 * Scale newly added nodes to the current scale.
 *
 * Called from the scope observer, which has already filtered out excluded and
 * disconnected nodes.
 */
export function applyScaleToSubtree(nodes: Element[], scale: number, ctx: EngineContext): void {
  if (scale === 1 || nodes.length === 0) return;
  scaleElements(collectTextElements(ctx, nodes), scale, ctx);
}

export const fontScale: FeatureModule<number> = {
  apply(scale: number, ctx: EngineContext) {
    if (scale === 1) {
      fontScale.remove(ctx);
      return;
    }
    scaleElements(collectTextElements(ctx, ctx.roots()), scale, ctx);
  },

  /**
   * Restore every element we touched.
   *
   * The `style=""` cleanup is not cosmetic: an empty style attribute left
   * behind is a DOM difference, and the acceptance criteria compare the page
   * before and after as a screenshot and an outerHTML snapshot.
   */
  remove(ctx: EngineContext) {
    const registry = getRegistry(ctx.doc);
    for (const el of registry.fontScaleSet) {
      const record = registry.fontScale.get(el);
      registry.fontScale.delete(el);
      if (!record) continue;

      const style = (el as HTMLElement).style;
      if (record.priorInline === '') {
        style.removeProperty('font-size');
        if (el.getAttribute('style') === '') el.removeAttribute('style');
      } else {
        style.setProperty('font-size', record.priorInline, record.priorPriority);
      }
    }
    registry.fontScaleSet.clear();
  },
};
