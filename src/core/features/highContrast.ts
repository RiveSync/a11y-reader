import { ATTRS } from '../constants';
import { removeRootAttr, setRootAttr } from '../dom';
import type { EngineContext, FeatureModule } from '../types';

/**
 * One attribute on <html>; all the work is in the stylesheet (see
 * buildContrastCss, and the specificity notes there).
 *
 * The value is 'dark' rather than the empty string so a future black-on-white
 * or amber variant is an additive change to the same attribute.
 */
export const highContrast: FeatureModule<boolean> = {
  apply(value: boolean, ctx: EngineContext) {
    if (!value) {
      highContrast.remove(ctx);
      return;
    }
    setRootAttr(ctx.doc, ATTRS.contrast, 'dark');
  },

  remove(ctx: EngineContext) {
    removeRootAttr(ctx.doc, ATTRS.contrast);
  },
};
