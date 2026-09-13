import { expect, test } from '@playwright/test';
import { bump, openPanel, widget } from './helpers';

/**
 * PRD 12.2: turning everything off must return the page to a pixel-identical
 * state. This is the acceptance criterion the whole revert design serves — the
 * WeakMap bookkeeping, capturing inline styles before overwriting them, and
 * removing `style=""` attributes that are left empty.
 */

async function enableEverything(page: import('@playwright/test').Page) {
  await openPanel(page);
  await widget.toggle(page, /dyslexia-friendly font/i).click();
  await widget.toggle(page, /high contrast/i).click();
  await bump(page, /increase text size/i, 5);
  await bump(page, /increase letter spacing/i, 3);
  await bump(page, /increase line spacing/i, 5);
  await widget.radio(page, 'Ruler').click();
  await page.waitForFunction(
    () => document.documentElement.hasAttribute('data-a11y-contrast'),
  );
}

test('reset restores the DOM byte-for-byte', async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });

  const before = await page.locator('main').evaluate((el) => el.outerHTML);

  await enableEverything(page);
  const during = await page.locator('main').evaluate((el) => el.outerHTML);
  expect(during).not.toBe(before);

  await widget.reset(page).click();

  await expect.poll(() => page.locator('main').evaluate((el) => el.outerHTML)).toBe(before);

  // And nothing left anywhere else either.
  const residue = await page.evaluate(() => ({
    rootAttrs: [...document.documentElement.attributes]
      .map((a) => a.name)
      .filter((n) => n.startsWith('data-a11y')),
    rootStyle: document.documentElement.getAttribute('style'),
    emptyStyleAttrs: [...document.querySelectorAll('main [style]')].filter(
      (el) => el.getAttribute('style') === '',
    ).length,
    iconTags: document.querySelectorAll('[data-a11y-icon]').length,
    aidHost: document.getElementById('a11y-reader-aid') !== null,
    fontFaceStyle: document.getElementById('a11y-reader-font-face') !== null,
    storage: localStorage.getItem('a11y-reader:settings'),
  }));

  expect(residue).toEqual({
    rootAttrs: [],
    rootStyle: null,
    emptyStyleAttrs: 0,
    iconTags: 0,
    aidHost: false,
    fontFaceStyle: false,
    storage: null,
  });
});

test('reset restores the page pixel-for-pixel', async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });

  /**
   * Put the widget completely out of the picture before each capture: close the
   * panel and display:none both hosts. The claim under test is about the *host
   * page*, and the widget's own open/closed state is not part of it.
   */
  const isolatePage = async () => {
    await page.keyboard.press('Escape');
    await expect(widget.panel(page)).toHaveCount(0);
    await page.evaluate(() => {
      let hide = document.getElementById('__test-hide-widget') as HTMLStyleElement | null;
      if (!hide) {
        hide = document.createElement('style');
        hide.id = '__test-hide-widget';
        document.head.appendChild(hide);
      }
      hide.textContent = '#a11y-reader-ui, #a11y-reader-aid { display: none !important; }';
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  };

  const showWidget = () =>
    page.evaluate(() => document.getElementById('__test-hide-widget')?.remove());

  await isolatePage();
  await expect(page.locator('main')).toHaveScreenshot('page-pristine.png');

  await showWidget();
  await enableEverything(page);
  await widget.reset(page).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.hasAttribute('data-a11y-contrast')))
    .toBe(false);

  await isolatePage();
  // Zero tolerance: any difference at all means something was not restored.
  await expect(page.locator('main')).toHaveScreenshot('page-pristine.png', {
    maxDiffPixels: 0,
  });
});
