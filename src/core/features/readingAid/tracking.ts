import type { EngineContext, ReadingAidSettings } from '../../types';
import { bandFromPointer, bandFromRect, lineStepFor, nudge, type Band } from './geometry';

export interface Tracking {
  start(config: ReadingAidSettings): void;
  update(config: ReadingAidSettings): void;
  stop(): void;
}

export interface TrackingHandlers {
  onBand(band: Band): void;
  onVisible(visible: boolean): void;
}

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  return EDITABLE.has(el.tagName) || (el as HTMLElement).isContentEditable === true;
}

/**
 * Drives the band position from pointer, focus and keyboard.
 *
 * `followMode: 'both'` needs no arbitration logic: both sets of listeners are
 * attached and each simply sets the band, so whichever event fired most
 * recently is what the reader sees.
 */
export function createTracking(ctx: EngineContext, handlers: TrackingHandlers): Tracking {
  const { doc, win } = ctx;
  let config: ReadingAidSettings | null = null;
  let band: Band = { top: 0, height: 40 };
  let attached = false;

  const viewport = () => win.innerHeight || 0;

  const setBand = (next: Band): void => {
    band = next;
    handlers.onBand(next);
    handlers.onVisible(true);
  };

  const follows = (kind: 'pointer' | 'keyboard'): boolean => {
    if (!config) return false;
    if (config.followMode === 'both') return true;
    return config.followMode === (kind === 'pointer' ? 'mouse' : 'keyboard');
  };

  const onPointerMove = (event: Event): void => {
    if (!config || !follows('pointer')) return;
    const { clientY } = event as PointerEvent;
    ctx.scheduler.schedule(() => setBand(bandFromPointer(clientY, config!.height, viewport())));
  };

  /**
   * Tap to place the band.
   *
   * There is no hover on a touch screen, so a finger produces no pointermove
   * until it is already dragging — without this, the aid can never be
   * positioned on a phone at all. Restricted to touch and pen because a mouse
   * already has pointermove, and yanking the band to every click would be
   * hostile on a desktop.
   */
  const onPointerDown = (event: Event): void => {
    if (!config || !follows('pointer')) return;
    const pointer = event as PointerEvent;
    if (pointer.pointerType === 'mouse') return;
    if (ctx.isExcluded(pointer.target as Element)) return;
    setBand(bandFromPointer(pointer.clientY, config.height, viewport()));
  };

  const onPointerLeave = (): void => handlers.onVisible(false);

  const onVisibilityChange = (): void => {
    if (doc.visibilityState === 'hidden') handlers.onVisible(false);
  };

  const onFocusIn = (event: Event): void => {
    if (!config || !follows('keyboard')) return;
    const target = event.target as Element | null;
    if (!target || ctx.isExcluded(target)) return;
    const rect = target.getBoundingClientRect();
    setBand(bandFromRect(rect, config.height, viewport()));
  };

  const onSelectionChange = (): void => {
    if (!config || !follows('keyboard')) return;
    const selection = doc.getSelection();
    const anchor = selection?.anchorNode ?? null;
    if (!anchor) return;

    // Selecting text inside the panel must not move the reader's band.
    const anchorEl = anchor.nodeType === 1 ? (anchor as Element) : anchor.parentElement;
    if (!anchorEl || ctx.isExcluded(anchorEl)) return;

    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getClientRects()[0] ?? range?.getBoundingClientRect();
    if (!rect || (rect.top === 0 && rect.height === 0)) return;
    setBand(bandFromRect(rect, config.height, viewport()));
  };

  const onKeyDown = (event: Event): void => {
    if (!config || !follows('keyboard')) return;
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowUp' && key !== 'ArrowDown') return;
    // Arrow keys belong to the field while one is focused.
    if (isTextEntry(doc.activeElement)) return;

    const step = lineStepFor(16, 1.5);
    setBand(nudge(band, key === 'ArrowDown' ? 1 : -1, step, viewport()));
    event.preventDefault();
  };

  const onResize = (): void => {
    if (!config) return;
    setBand(bandFromPointer(band.top + band.height / 2, config.height, viewport()));
  };

  return {
    start(next) {
      config = next;
      if (attached) return;
      attached = true;

      // `passive` throughout: none of these ever call preventDefault except the
      // Arrow-key handler, and a non-passive pointermove would block scrolling
      // on touch.
      win.addEventListener('pointermove', onPointerMove, { passive: true });
      win.addEventListener('pointerdown', onPointerDown, { passive: true });
      doc.addEventListener('pointerleave', onPointerLeave);
      doc.addEventListener('visibilitychange', onVisibilityChange);
      doc.addEventListener('focusin', onFocusIn);
      doc.addEventListener('selectionchange', onSelectionChange);
      win.addEventListener('keydown', onKeyDown);
      win.addEventListener('resize', onResize, { passive: true });
    },

    update(next) {
      config = next;
    },

    stop() {
      config = null;
      if (!attached) return;
      attached = false;

      win.removeEventListener('pointermove', onPointerMove);
      win.removeEventListener('pointerdown', onPointerDown);
      doc.removeEventListener('pointerleave', onPointerLeave);
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      doc.removeEventListener('focusin', onFocusIn);
      doc.removeEventListener('selectionchange', onSelectionChange);
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('resize', onResize);
      ctx.scheduler.cancel();
    },
  };
}
