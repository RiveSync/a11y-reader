/**
 * Pure band maths.
 *
 * Deliberately separated from the DOM: everything else in this feature depends
 * on real layout and pointer events, which jsdom cannot produce, so this module
 * is the part that can carry meaningful unit tests.
 */

export interface Band {
  /** Distance in px from the top of the viewport. */
  top: number;
  height: number;
}

function clampTop(top: number, height: number, viewportHeight: number): number {
  // Keeping the band on screen matters most in mask mode: an off-screen clear
  // band means the reader is looking at an entirely dimmed page.
  const max = Math.max(0, viewportHeight - height);
  return Math.min(max, Math.max(0, top));
}

/** Centre the band on a pointer position. */
export function bandFromPointer(y: number, height: number, viewportHeight: number): Band {
  return { top: clampTop(y - height / 2, height, viewportHeight), height };
}

/**
 * Centre the band on a rectangle — a focused control, or the caret's line box.
 *
 * Uses the rect's own centre rather than its top so that a tall focused element
 * (a card, a table row) still puts the band over its middle.
 */
export function bandFromRect(
  rect: { top: number; height: number },
  height: number,
  viewportHeight: number,
): Band {
  return bandFromPointer(rect.top + rect.height / 2, height, viewportHeight);
}

/**
 * Move the band by one line, for keyboard users driving it with Arrow keys.
 */
export function nudge(
  band: Band,
  direction: 1 | -1,
  lineStep: number,
  viewportHeight: number,
): Band {
  return {
    top: clampTop(band.top + direction * lineStep, band.height, viewportHeight),
    height: band.height,
  };
}

/** Approximate height of one line of text, used as the Arrow-key step. */
export function lineStepFor(fontSize: number, lineHeight: number): number {
  const step = Math.round(fontSize * lineHeight);
  return step > 0 ? step : 24;
}
