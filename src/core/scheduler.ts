import type { FrameScheduler } from './types';

/**
 * Coalesces work onto one animation frame.
 *
 * Used by font scaling (MutationObserver bursts), the reading aid (pointer
 * moves at input frequency) and the panel's slider -> engine path. Injectable
 * because jsdom has no real frames: tests swap in the synchronous version so
 * assertions do not have to await anything.
 */
export function createFrameScheduler(win: Window): FrameScheduler {
  let handle: number | null = null;
  let queued: (() => void) | null = null;

  const run = () => {
    handle = null;
    const fn = queued;
    queued = null;
    fn?.();
  };

  return {
    schedule(fn) {
      // Last write wins: callers pass a closure over current state, so an
      // older pending callback is always stale.
      queued = fn;
      if (handle === null) handle = win.requestAnimationFrame(run);
    },
    flush() {
      if (handle !== null) {
        win.cancelAnimationFrame(handle);
        handle = null;
      }
      const fn = queued;
      queued = null;
      fn?.();
    },
    cancel() {
      if (handle !== null) {
        win.cancelAnimationFrame(handle);
        handle = null;
      }
      queued = null;
    },
  };
}

/** Runs callbacks immediately. For tests, and for forced synchronous reverts. */
export function createSyncScheduler(): FrameScheduler {
  return {
    schedule(fn) {
      fn();
    },
    flush() {},
    cancel() {},
  };
}
