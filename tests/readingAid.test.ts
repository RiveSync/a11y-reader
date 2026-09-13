import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, HOST_IDS } from '../src/core/constants';
import { createAccessibilityEngine, createEngineContext } from '../src/core/engine';
import { createReadingAid } from '../src/core/features/readingAid';
import {
  bandFromPointer,
  bandFromRect,
  lineStepFor,
  nudge,
} from '../src/core/features/readingAid/geometry';
import { createOverlay } from '../src/core/features/readingAid/overlay';
import { clearRegistry } from '../src/core/registry';
import { createSyncScheduler } from '../src/core/scheduler';

const VIEWPORT = 800;

function ctx() {
  return createEngineContext({ scheduler: createSyncScheduler() });
}

beforeEach(() => {
  document.body.innerHTML = '';
  clearRegistry(document);
});

describe('geometry', () => {
  it('centres the band on the pointer', () => {
    expect(bandFromPointer(400, 40, VIEWPORT)).toEqual({ top: 380, height: 40 });
  });

  it('keeps the band on screen at the top edge', () => {
    // Otherwise a mask leaves its clear band off-screen and the reader sees a
    // fully dimmed page.
    expect(bandFromPointer(5, 40, VIEWPORT).top).toBe(0);
  });

  it('keeps the band on screen at the bottom edge', () => {
    expect(bandFromPointer(795, 40, VIEWPORT).top).toBe(760);
  });

  it('handles a band taller than the viewport without going negative', () => {
    expect(bandFromPointer(400, 2000, 300).top).toBe(0);
  });

  it('centres on a rect rather than its top edge', () => {
    // A tall focused element should get the band over its middle.
    expect(bandFromRect({ top: 100, height: 200 }, 40, VIEWPORT).top).toBe(180);
  });

  it('nudges by one line and clamps at the edges', () => {
    const band = { top: 400, height: 40 };
    expect(nudge(band, 1, 24, VIEWPORT).top).toBe(424);
    expect(nudge(band, -1, 24, VIEWPORT).top).toBe(376);
    expect(nudge({ top: 0, height: 40 }, -1, 24, VIEWPORT).top).toBe(0);
    expect(nudge({ top: 760, height: 40 }, 1, 24, VIEWPORT).top).toBe(760);
  });

  it('derives a sensible line step, with a fallback', () => {
    expect(lineStepFor(16, 1.5)).toBe(24);
    expect(lineStepFor(0, 0)).toBe(24);
  });
});

describe('overlay', () => {
  it('mounts its own shadow host, one z-index below the widget', () => {
    const context = ctx();
    const overlay = createOverlay(context);

    const host = document.getElementById(HOST_IDS.aid)!;
    expect(host).toBeTruthy();
    expect(host.shadowRoot).toBeTruthy();
    expect(host.style.zIndex).toBe(String(context.zIndex - 1));
    // Click-through, or it would swallow every interaction on the page.
    expect(host.style.pointerEvents).toBe('none');
    // Excluded, so the page transformations never reach it.
    expect(host.hasAttribute('data-a11y-exclude')).toBe(true);

    overlay.destroy();
  });

  it('never puts a containing-block-forming property on the host', () => {
    // transform / filter / perspective / contain:paint on the host would make
    // it the containing block for its position:fixed children, collapsing the
    // overlays into the host's box.
    const overlay = createOverlay(ctx());
    const css = document.getElementById(HOST_IDS.aid)!.style.cssText;

    for (const forbidden of ['transform', 'filter', 'perspective', 'backdrop-filter', 'contain']) {
      expect(css).not.toContain(forbidden);
    }
    overlay.destroy();
  });

  it('positions the ruler with a transform, not with top', () => {
    const overlay = createOverlay(ctx());
    overlay.setAppearance('rgba(255,230,0,0.35)', 40);
    overlay.setMode('ruler');
    overlay.setVisible(true);
    overlay.setBand({ top: 300, height: 40 });

    const ruler = document.getElementById(HOST_IDS.aid)!.shadowRoot!.querySelector('.ruler')!;
    expect((ruler as HTMLElement).style.transform).toBe('translate3d(0, 300px, 0)');
    expect((ruler as HTMLElement).style.top).toBe('');

    overlay.destroy();
  });

  it('brackets the clear band with two mask panels', () => {
    const overlay = createOverlay(ctx());
    overlay.setAppearance('rgba(0,0,0,0.6)', 100);
    overlay.setMode('mask');
    overlay.setVisible(true);
    overlay.setBand({ top: 300, height: 100 });

    const panels = document.getElementById(HOST_IDS.aid)!.shadowRoot!.querySelectorAll('.mask');
    const viewport = window.innerHeight;

    // Top panel's bottom edge lands on the band's top edge.
    expect((panels[0] as HTMLElement).style.transform).toBe(
      `translate3d(0, ${300 - viewport}px, 0)`,
    );
    // Bottom panel starts where the band ends.
    expect((panels[1] as HTMLElement).style.transform).toBe('translate3d(0, 400px, 0)');

    overlay.destroy();
  });

  it('shows only the layers for the active mode', () => {
    const overlay = createOverlay(ctx());
    overlay.setVisible(true);

    const root = document.getElementById(HOST_IDS.aid)!.shadowRoot!;
    const hidden = (sel: string) => root.querySelector(sel)!.classList.contains('hidden');

    overlay.setMode('ruler');
    expect(hidden('.ruler')).toBe(false);
    expect(hidden('.mask')).toBe(true);

    overlay.setMode('mask');
    expect(hidden('.ruler')).toBe(true);
    expect(hidden('.mask')).toBe(false);

    overlay.setMode('off');
    expect(hidden('.ruler')).toBe(true);
    expect(hidden('.mask')).toBe(true);

    overlay.destroy();
  });

  it('exposes colour and height as custom properties on the host', () => {
    const overlay = createOverlay(ctx());
    overlay.setAppearance('rgb(1, 2, 3)', 77);
    const host = document.getElementById(HOST_IDS.aid)!;
    expect(host.style.getPropertyValue('--aid-color')).toBe('rgb(1, 2, 3)');
    expect(host.style.getPropertyValue('--aid-height')).toBe('77px');
    overlay.destroy();
  });
});

describe('controller lifecycle', () => {
  it('creates no host at all while the mode is off', () => {
    const aid = createReadingAid(ctx());
    aid.apply({ ...DEFAULT_SETTINGS.readingAid, mode: 'off' });
    expect(document.getElementById(HOST_IDS.aid)).toBeNull();
  });

  it('removes the host when switched back off', () => {
    const aid = createReadingAid(ctx());
    aid.apply({ ...DEFAULT_SETTINGS.readingAid, mode: 'ruler' });
    expect(document.getElementById(HOST_IDS.aid)).toBeTruthy();

    aid.apply({ ...DEFAULT_SETTINGS.readingAid, mode: 'off' });
    expect(document.getElementById(HOST_IDS.aid)).toBeNull();
  });

  it('is torn down by engine.destroy()', () => {
    const engine = createAccessibilityEngine({ scheduler: createSyncScheduler() });
    engine.apply({
      ...DEFAULT_SETTINGS,
      readingAid: { ...DEFAULT_SETTINGS.readingAid, mode: 'mask' },
    });
    expect(document.getElementById(HOST_IDS.aid)).toBeTruthy();

    engine.destroy();
    expect(document.getElementById(HOST_IDS.aid)).toBeNull();
  });

  it('follows the pointer once active', () => {
    const engine = createAccessibilityEngine({ scheduler: createSyncScheduler() });
    engine.apply({
      ...DEFAULT_SETTINGS,
      readingAid: { ...DEFAULT_SETTINGS.readingAid, mode: 'ruler', height: 40 },
    });

    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 250 }));

    const ruler = document.getElementById(HOST_IDS.aid)!.shadowRoot!.querySelector('.ruler')!;
    expect((ruler as HTMLElement).style.transform).toBe('translate3d(0, 230px, 0)');

    engine.destroy();
  });

  it('places the band on a touch tap, which produces no pointermove', () => {
    // There is no hover on a touch screen: a finger emits no pointermove until
    // it is already dragging, so without handling pointerdown the aid cannot be
    // positioned on a phone at all. Caught by real iOS Safari, not by jsdom.
    const engine = createAccessibilityEngine({ scheduler: createSyncScheduler() });
    engine.apply({
      ...DEFAULT_SETTINGS,
      readingAid: { ...DEFAULT_SETTINGS.readingAid, mode: 'ruler', height: 40 },
    });

    const touch = new PointerEvent('pointerdown', { clientY: 250, pointerType: 'touch', bubbles: true });
    window.dispatchEvent(touch);

    const ruler = document.getElementById(HOST_IDS.aid)!.shadowRoot!.querySelector('.ruler')!;
    expect((ruler as HTMLElement).style.transform).toBe('translate3d(0, 230px, 0)');

    engine.destroy();
  });

  it('ignores a mouse press, which would yank the band on every click', () => {
    const engine = createAccessibilityEngine({ scheduler: createSyncScheduler() });
    engine.apply({
      ...DEFAULT_SETTINGS,
      readingAid: { ...DEFAULT_SETTINGS.readingAid, mode: 'ruler', height: 40 },
    });

    window.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 250, pointerType: 'mouse', bubbles: true }),
    );

    const ruler = document.getElementById(HOST_IDS.aid)!.shadowRoot!.querySelector('.ruler')!;
    // Untouched: a mouse already has pointermove for this.
    expect((ruler as HTMLElement).style.transform).not.toBe('translate3d(0, 230px, 0)');

    engine.destroy();
  });

  it('stops following once the engine is destroyed', () => {
    const engine = createAccessibilityEngine({ scheduler: createSyncScheduler() });
    engine.apply({
      ...DEFAULT_SETTINGS,
      readingAid: { ...DEFAULT_SETTINGS.readingAid, mode: 'ruler' },
    });
    engine.destroy();

    // A listener surviving teardown would be a leak that keeps firing forever.
    expect(() =>
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 100 })),
    ).not.toThrow();
    expect(document.getElementById(HOST_IDS.aid)).toBeNull();
  });
});
