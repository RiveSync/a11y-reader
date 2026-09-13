import type { Locator, Page } from '@playwright/test';

/**
 * The widget lives in an open shadow root. Playwright's selector engine pierces
 * open shadow roots automatically, so these are ordinary locators — but they are
 * centralised here so a markup change is a one-line fix.
 */
export const widget = {
  host: (page: Page): Locator => page.locator('#a11y-reader-ui'),
  trigger: (page: Page): Locator => page.locator('#a11y-reader-ui .trigger'),
  panel: (page: Page): Locator => page.locator('#a11y-reader-ui .panel'),
  aidHost: (page: Page): Locator => page.locator('#a11y-reader-aid'),
  ruler: (page: Page): Locator => page.locator('#a11y-reader-aid .ruler'),
  masks: (page: Page): Locator => page.locator('#a11y-reader-aid .mask'),
  toggle: (page: Page, name: RegExp): Locator =>
    page.locator('#a11y-reader-ui').getByRole('checkbox', { name }),
  slider: (page: Page, name: RegExp): Locator =>
    page.locator('#a11y-reader-ui').getByRole('slider', { name }),
  stepper: (page: Page, name: RegExp): Locator =>
    page.locator('#a11y-reader-ui').getByRole('button', { name }),
  radio: (page: Page, name: string): Locator =>
    page.locator('#a11y-reader-ui').getByRole('radio', { name, exact: true }),
  reset: (page: Page): Locator =>
    page.locator('#a11y-reader-ui').getByRole('button', { name: /reset all/i }),
};

export async function openPanel(page: Page): Promise<void> {
  await widget.trigger(page).click();
  await widget.panel(page).waitFor({ state: 'visible' });
  await settleAnimations(page);
}

/**
 * Wait for the panel's entry animation to finish.
 *
 * Mid-fade the panel really is partially transparent, so anything measuring
 * colour sees the page composited through it — axe read a dark panel as a mid
 * grey and reported contrast failures that vanish once the animation lands.
 */
export async function settleAnimations(page: Page): Promise<void> {
  await widget
    .panel(page)
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {}))));
}

/** Computed style of a page element, as the browser actually resolved it. */
export function computed(page: Page, selector: string, property: string): Promise<string> {
  return page.evaluate(([sel, prop]) => {
    const el = document.querySelector(sel as string);
    if (!el) return `NO_ELEMENT(${sel})`;
    return String(getComputedStyle(el).getPropertyValue(prop as string) || (getComputedStyle(el) as unknown as Record<string, string>)[prop as string] || '');
  }, [selector, property]);
}

/** Click a slider's + stepper n times. */
export async function bump(page: Page, name: RegExp, times: number): Promise<void> {
  const button = widget.stepper(page, name);
  for (let i = 0; i < times; i++) await button.click();
}
