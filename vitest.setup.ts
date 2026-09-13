import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as axeMatchers from 'vitest-axe/matchers';
// Side-effect import: registers the jest-dom matchers and their type
// augmentation of vitest's Assertion interface. vitest-axe's own augmentation
// targets an older vitest signature, so its types live in types/vitest-axe.d.ts
// and only the matchers are registered here.
import '@testing-library/jest-dom/vitest';

expect.extend(axeMatchers);

// jsdom ships neither of these, and both are load-bearing: the frame scheduler
// coalesces engine work onto rAF, and the widget reads prefers-reduced-motion
// and prefers-color-scheme.
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0) as unknown as number) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) =>
    clearTimeout(id)) as typeof cancelAnimationFrame;
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  // Every feature injects into <head> and sets attributes on <html>. A leaked
  // style element or attribute would silently contaminate the next test — and
  // full revert is the property most of these tests exist to prove.
  document.querySelectorAll('[id^="a11y-reader"]').forEach((el) => el.remove());
  for (const attr of [...document.documentElement.attributes]) {
    if (attr.name.startsWith('data-a11y')) document.documentElement.removeAttribute(attr.name);
  }
  document.documentElement.removeAttribute('style');
  localStorage.clear();
});
