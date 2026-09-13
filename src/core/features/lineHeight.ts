import { ATTRS, CSS_VARS } from '../constants';
import { removeRootAttr, removeRootVar, setRootAttr, setRootVar } from '../dom';
import type { EngineContext, FeatureModule } from '../types';

/**
 * Line spacing, with `null` meaning "the user has not touched this".
 *
 * The slider shows 1.5 in that state but nothing is applied, so the host
 * site's own typography survives first load. See the note on
 * AccessibilitySettings['lineHeight'] for why this is a nullable number rather
 * than PRD 5.5's number-plus-hidden-flag.
 */
export const lineHeight: FeatureModule<number | null> = {
  apply(value: number | null, ctx: EngineContext) {
    if (value === null) {
      lineHeight.remove(ctx);
      return;
    }
    // Unitless, so it inherits proportionally rather than pinning every
    // descendant to one computed pixel height.
    setRootVar(ctx.doc, CSS_VARS.lineHeight, String(value));
    setRootAttr(ctx.doc, ATTRS.lineHeight);
  },

  remove(ctx: EngineContext) {
    removeRootAttr(ctx.doc, ATTRS.lineHeight);
    removeRootVar(ctx.doc, CSS_VARS.lineHeight);
  },
};
