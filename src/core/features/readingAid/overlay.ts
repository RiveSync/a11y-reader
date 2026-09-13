import { HOST_IDS } from '../../constants';
import { ensureHost, removeHost } from '../../dom';
import type { EngineContext, ReadingAidMode } from '../../types';
import type { Band } from './geometry';

/**
 * The ruler and mask overlays, in their own shadow host.
 *
 * PRD 5.6 placed these inside the *widget's* shadow root at `zIndex - 1`, which
 * does not work as written. A shadow host is a single stacking context, so a
 * z-index on a descendant only orders it against its siblings inside that
 * context — it says nothing about the page behind the host. It also made the
 * reading aid depend on the React widget existing, which contradicts the
 * framework-agnostic core and breaks `hideTrigger`.
 *
 * Instead this is a sibling host owned by core, sitting one z-index below the
 * widget's: overlays paint above the page, the panel paints above the overlays,
 * and no React is involved.
 *
 * Every position update is a transform on an already-composited layer — no
 * layout, no paint. Writing `top`/`height` per frame instead would force layout
 * on every pointer move.
 */
export interface Overlay {
  setMode(mode: ReadingAidMode): void;
  setAppearance(color: string, height: number): void;
  setBand(band: Band): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

const OVERLAY_CSS = `
:host { display: block; }
.layer {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  pointer-events: none;
  will-change: transform;
  transform: translate3d(0, -9999px, 0);
}
.ruler {
  /* border-box so a configured 40px band is 40px tall, borders included —
     otherwise the height the user picked is off by the border width. */
  box-sizing: border-box;
  height: var(--aid-height, 40px);
  background: var(--aid-color, rgba(255, 230, 0, 0.35));
  border-top: 1px solid var(--aid-color, rgba(255, 230, 0, 0.35));
  border-bottom: 1px solid var(--aid-color, rgba(255, 230, 0, 0.35));
}
.mask {
  /* Full viewport height each, translated so that only the band between them
     is left clear. */
  height: 100vh;
  background: var(--aid-color, rgba(0, 0, 0, 0.6));
}
.hidden { display: none; }
`;

export function createOverlay(ctx: EngineContext): Overlay {
  // One below the widget host, so the panel stays clickable above the aid.
  const host = ensureHost(ctx.doc, HOST_IDS.aid, { zIndex: ctx.zIndex - 1 });
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  if (!root.querySelector('style')) {
    const style = ctx.doc.createElement('style');
    style.textContent = OVERLAY_CSS;
    root.appendChild(style);
  }

  const make = (className: string): HTMLElement => {
    const el = ctx.doc.createElement('div');
    el.className = `layer ${className}`;
    root.appendChild(el);
    return el;
  };

  const ruler = make('ruler');
  const maskTop = make('mask');
  const maskBottom = make('mask');

  let mode: ReadingAidMode = 'off';
  let visible = false;
  let band: Band = { top: -9999, height: 40 };

  const viewportHeight = () => ctx.win.innerHeight || 0;

  const paint = (): void => {
    const showRuler = visible && mode === 'ruler';
    const showMask = visible && mode === 'mask';

    ruler.classList.toggle('hidden', !showRuler);
    maskTop.classList.toggle('hidden', !showMask);
    maskBottom.classList.toggle('hidden', !showMask);

    if (showRuler) {
      ruler.style.transform = `translate3d(0, ${band.top}px, 0)`;
    }
    if (showMask) {
      // The top panel is pulled up by its own height so its bottom edge lands
      // on the band's top edge; the bottom panel starts where the band ends.
      maskTop.style.transform = `translate3d(0, ${band.top - viewportHeight()}px, 0)`;
      maskBottom.style.transform = `translate3d(0, ${band.top + band.height}px, 0)`;
    }
  };

  return {
    setMode(next) {
      mode = next;
      paint();
    },

    setAppearance(color, height) {
      host.style.setProperty('--aid-color', color);
      host.style.setProperty('--aid-height', `${height}px`);
      band = { ...band, height };
      paint();
    },

    setBand(next) {
      band = next;
      paint();
    },

    setVisible(next) {
      if (visible === next) return;
      visible = next;
      paint();
    },

    destroy() {
      removeHost(ctx.doc, HOST_IDS.aid);
    },
  };
}
