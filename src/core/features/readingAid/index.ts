import type { EngineContext, ReadingAidSettings } from '../../types';
import { createOverlay, type Overlay } from './overlay';
import { createTracking, type Tracking } from './tracking';

/**
 * The reading aid is a controller rather than a stateless FeatureModule: it
 * owns a shadow host and a set of event listeners, and both have to survive
 * between apply() calls. The engine holds the instance.
 */
export interface ReadingAidController {
  apply(config: ReadingAidSettings): void;
  remove(): void;
}

export function createReadingAid(ctx: EngineContext): ReadingAidController {
  let overlay: Overlay | null = null;
  let tracking: Tracking | null = null;

  const teardown = (): void => {
    tracking?.stop();
    tracking = null;
    overlay?.destroy();
    overlay = null;
  };

  return {
    apply(config) {
      if (config.mode === 'off') {
        teardown();
        return;
      }

      if (!overlay) overlay = createOverlay(ctx);
      overlay.setAppearance(config.color, config.height);
      overlay.setMode(config.mode);

      if (!tracking) {
        tracking = createTracking(ctx, {
          onBand: (band) => overlay?.setBand(band),
          onVisible: (visible) => overlay?.setVisible(visible),
        });
        tracking.start(config);
      } else {
        tracking.update(config);
      }
    },

    remove: teardown,
  };
}

export { bandFromPointer, bandFromRect, lineStepFor, nudge, type Band } from './geometry';
