import { ATTRS, CSS_VARS } from '../constants';
import { removeRootAttr, removeRootVar, setRootAttr, setRootVar } from '../dom';
import type { EngineContext, FeatureModule } from '../types';

/**
 * Pure CSS: a custom property plus an attribute gate. The attribute is present
 * only while the value is above zero, so a user who drags back to 0 leaves the
 * page in exactly its original state rather than with an inert override.
 */
export const letterSpacing: FeatureModule<number> = {
  apply(value: number, ctx: EngineContext) {
    if (!(value > 0)) {
      letterSpacing.remove(ctx);
      return;
    }
    setRootVar(ctx.doc, CSS_VARS.letterSpacing, `${value}em`);
    setRootAttr(ctx.doc, ATTRS.letterSpacing);
  },

  remove(ctx: EngineContext) {
    removeRootAttr(ctx.doc, ATTRS.letterSpacing);
    removeRootVar(ctx.doc, CSS_VARS.letterSpacing);
  },
};
