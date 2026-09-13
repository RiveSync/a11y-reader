import { expect, test } from '@playwright/test';
import { openPanel, widget } from './helpers';

/**
 * PRD 11's budget: scaling a 3,000-element page must stay under 100 ms.
 *
 * The engine runs synchronously inside the React click handler, so timing the
 * click measures the scaling pass itself with no polling or IPC noise.
 *
 * This is the regression the three-phase design exists to prevent: interleaving
 * getComputedStyle reads with inline-style writes forces one style
 * recalculation per element, turning single-digit milliseconds into seconds.
 */
test('scales 3,000 elements well inside the 100ms budget', async ({ page }) => {
  await page.goto('/perf');
  await widget.trigger(page).waitFor({ state: 'visible' });
  await expect(page.getByTestId('perf-count')).toContainText('3000');

  await openPanel(page);

  // React dispatches click handlers synchronously, and the store subscriber
  // calls engine.apply() inline — so the time around .click() IS the scaling
  // pass, with no polling or IPC noise in the measurement.
  const result = await page.evaluate(() => {
    const root = document.getElementById('a11y-reader-ui')!.shadowRoot!;
    const plus = [...root.querySelectorAll('button')].find((b) =>
      /increase text size/i.test(b.getAttribute('aria-label') ?? ''),
    )!;
    const sample = document.querySelector('#bulk p') as HTMLElement;
    const before = getComputedStyle(sample).fontSize;

    const start = performance.now();
    plus.click();
    const elapsed = performance.now() - start;

    return {
      elapsed,
      before,
      after: getComputedStyle(sample).fontSize,
      scaledCount: document.querySelectorAll('#bulk p[style*="font-size"]').length,
    };
  });

  console.log(`scale pass over 3,000 elements: ${result.elapsed.toFixed(1)}ms`);

  // Proves the work actually happened inside the measured window, rather than
  // the measurement catching an early return.
  expect(result.after).not.toBe(result.before);
  expect(result.scaledCount).toBe(3000);
  expect(result.elapsed).toBeLessThan(100);
});

test('reverting 3,000 elements leaves no inline styles behind', async ({ page }) => {
  await page.goto('/perf');
  await widget.trigger(page).waitFor({ state: 'visible' });
  await openPanel(page);

  // Every paragraph on this fixture already carries an inline font-size, so this
  // is the hard revert case: restore the host's value rather than removing it.
  const originals = await page.evaluate(() =>
    [...document.querySelectorAll('#bulk p')].slice(0, 50).map((el) => (el as HTMLElement).style.fontSize),
  );

  await widget.stepper(page, /increase text size/i).click();
  await expect
    .poll(() => page.locator('#bulk p').first().evaluate((el) => getComputedStyle(el).fontSize))
    .not.toBe('13px');

  await widget.reset(page).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('#bulk p')].slice(0, 50).map((el) => (el as HTMLElement).style.fontSize),
      ),
    )
    .toEqual(originals);
});
