import { expect, test } from '@playwright/test';
import { openPanel, widget } from './helpers';

/**
 * Runs only under the `mobile` project (iPhone 13: 390px wide, touch enabled).
 * A 330px popover anchored to a corner is unusable at this width, so the panel
 * becomes a bottom sheet.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });
});

test('panel becomes a full-width bottom sheet', async ({ page }) => {
  await openPanel(page);

  const viewport = page.viewportSize()!;
  const box = (await widget.panel(page).boundingBox())!;

  expect(Math.round(box.width)).toBe(viewport.width);
  expect(Math.round(box.x)).toBe(0);
  // Sits on the bottom edge.
  expect(Math.round(box.y + box.height)).toBe(viewport.height);
  // Rounded at the top only.
  const radius = await widget.panel(page).evaluate((el) => getComputedStyle(el).borderRadius);
  expect(radius).toContain('0px 0px');
});

test('sheet scrolls rather than overflowing the viewport', async ({ page }) => {
  await openPanel(page);

  const overflow = await widget.panel(page).evaluate((el) => getComputedStyle(el).overflowY);
  expect(overflow).toBe('auto');

  const box = (await widget.panel(page).boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.85 + 1);

  // The host page must never gain a horizontal scrollbar because of us.
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(scrolls).toBe(false);
});

test('trigger meets the touch-target minimum', async ({ page }) => {
  const box = (await widget.trigger(page).boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('opens and operates by touch', async ({ page }) => {
  await widget.trigger(page).tap();
  await expect(widget.panel(page)).toBeVisible();

  await widget.toggle(page, /high contrast/i).tap();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-a11y-contrast')))
    .toBe('dark');
});

test('reading aid follows touch', async ({ page }) => {
  await openPanel(page);
  await widget.radio(page, 'Ruler').tap();

  // The bottom sheet covers most of a phone viewport and is excluded from
  // tracking, so close it before tapping the page.
  await widget.panel(page).getByRole('button', { name: /close/i }).tap();
  await expect(widget.panel(page)).toHaveCount(0);
  await expect(widget.aidHost(page)).toHaveCount(1);

  // There is no hover on touch, so a tap has to be able to place the band —
  // otherwise the aid is unusable on a phone.
  await page.touchscreen.tap(200, 250);

  // Lands near the tap. Exact pixels drift with the visual-viewport offset on
  // mobile Safari; what matters is that a tap places the band at all.
  await expect
    .poll(() =>
      widget.ruler(page).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return Math.abs(r.top + r.height / 2 - 250);
      }),
    )
    .toBeLessThan(25);
});
