import { expect, test } from '@playwright/test';
import { openPanel, widget } from './helpers';

/**
 * The reading aid needs real layout and a real compositor: none of the position
 * tracking or click-through behaviour is observable in jsdom.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });
  await openPanel(page);
});

test('mounts its own host one z-index below the widget', async ({ page }) => {
  await widget.radio(page, 'Ruler').click();

  // PRD 5.6 put the overlays inside the widget's shadow root at zIndex - 1,
  // which cannot work: a shadow host is one stacking context, so an inner
  // z-index orders nothing against the page behind it. Two sibling hosts do.
  await expect(widget.aidHost(page)).toHaveAttribute('data-a11y-exclude', '');
  const [aid, ui] = await page.evaluate(() => [
    Number(document.getElementById('a11y-reader-aid')!.style.zIndex),
    Number(document.getElementById('a11y-reader-ui')!.style.zIndex),
  ]);
  expect(aid).toBe(ui - 1);
});

test('never gets a containing-block-forming property on its host', async ({ page }) => {
  await widget.radio(page, 'Ruler').click();

  // transform / filter / perspective / contain:paint on the host would make it
  // the containing block for its position:fixed children and collapse the
  // overlays into the host's own box.
  const style = await page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('a11y-reader-aid')!);
    return { transform: cs.transform, filter: cs.filter, perspective: cs.perspective, contain: cs.contain };
  });
  expect(style.transform).toBe('none');
  expect(style.filter).toBe('none');
  expect(style.perspective).toBe('none');
  expect(style.contain).toBe('none');
});

test('ruler follows the mouse and stays click-through', async ({ page }) => {
  await widget.radio(page, 'Ruler').click();
  await page.mouse.move(400, 300);

  // Assert on the band's centre rather than its top: the exact box height is a
  // styling detail, but "centred on the cursor" is the actual contract.
  await expect
    .poll(() =>
      widget.ruler(page).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.top + r.height / 2);
      }),
    )
    .toBeLessThanOrEqual(305);
  const centre = await widget.ruler(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  });
  expect(Math.abs(centre - 300)).toBeLessThan(5);
  expect(await widget.ruler(page).evaluate((el) => el.getBoundingClientRect().height)).toBe(40);

  // Positioned by transform, not by `top` — writing top per frame forces layout.
  expect(await widget.ruler(page).evaluate((el) => getComputedStyle(el).top)).toBe('0px');
  expect(await widget.ruler(page).evaluate((el) => el.style.transform)).toContain('translate3d');

  // Full viewport width, and clicks pass straight through to the page.
  const width = await widget.ruler(page).evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBe(page.viewportSize()!.width);
  const hit = await page.evaluate(() => document.elementFromPoint(200, 300)?.tagName);
  expect(hit).not.toBe('DIV');
});

test('mask brackets a clear band with two panels', async ({ page }) => {
  await widget.radio(page, 'Focus mask').click();
  await page.mouse.move(400, 400);

  await expect(widget.masks(page)).toHaveCount(2);
  const geometry = await page.evaluate(() => {
    const panels = [...document.getElementById('a11y-reader-aid')!.shadowRoot!.querySelectorAll('.mask')];
    return panels.map((p) => {
      const r = p.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
    });
  });

  // The gap between the two panels is the clear reading band.
  const gap = geometry[1]!.top - geometry[0]!.bottom;
  expect(gap).toBeGreaterThan(0);
});

test('keyboard mode follows focus instead of the pointer', async ({ page }) => {
  await widget.radio(page, 'Ruler').click();
  await page.keyboard.press('Escape');

  const target = page.locator('#demo-input');
  await target.focus();

  const [bandTop, inputBox] = await Promise.all([
    widget.ruler(page).evaluate((el) => el.getBoundingClientRect().top),
    target.boundingBox(),
  ]);

  // Centred on the focused control, within the band's own half-height.
  expect(Math.abs(bandTop + 21 - (inputBox!.y + inputBox!.height / 2))).toBeLessThan(30);
});

test('disappears completely when switched off', async ({ page }) => {
  await widget.radio(page, 'Ruler').click();
  await expect(widget.aidHost(page)).toHaveCount(1);

  await widget.radio(page, 'Off').click();
  await expect(widget.aidHost(page)).toHaveCount(0);
});
