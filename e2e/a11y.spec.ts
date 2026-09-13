import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openPanel, widget } from './helpers';

/**
 * The axe run that jsdom could not do.
 *
 * Colour-contrast rules need real layout and paint, so in the unit suite they
 * come back "incomplete" and are explicitly disabled there. Here they actually
 * evaluate — which is the whole reason this file exists.
 */
async function scanWidget(page: import('@playwright/test').Page) {
  // axe traverses open shadow roots, which is one reason the widget's root is open.
  return new AxeBuilder({ page })
    .include('#a11y-reader-ui')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
}

test.describe('light theme', () => {
  test.use({ colorScheme: 'light' });

  test('trigger alone has no violations', async ({ page }) => {
    await page.goto('/');
    await widget.trigger(page).waitFor({ state: 'visible' });
    expect((await scanWidget(page)).violations).toEqual([]);
  });

  test('open panel has no violations, contrast included', async ({ page }) => {
    await page.goto('/');
    await widget.trigger(page).waitFor({ state: 'visible' });
    await openPanel(page);
    await widget.radio(page, 'Ruler').click(); // reveal the colour + height controls

    expect((await scanWidget(page)).violations).toEqual([]);
  });
});

test.describe('dark theme', () => {
  test.use({ colorScheme: 'dark' });

  test('open panel has no violations, contrast included', async ({ page }) => {
    await page.goto('/');
    await widget.trigger(page).waitFor({ state: 'visible' });
    await openPanel(page);

    expect((await scanWidget(page)).violations).toEqual([]);
  });
});

test('the widget stays usable while its own features are applied to the page', async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });
  await openPanel(page);
  await widget.toggle(page, /high contrast/i).click();
  await widget.toggle(page, /dyslexia-friendly font/i).click();

  // The page is now black-on-white-inverted and in a different font; the panel
  // must be unaffected and still pass.
  expect((await scanWidget(page)).violations).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('drops the panel animation', async ({ page }) => {
    await page.goto('/');
    await widget.trigger(page).waitFor({ state: 'visible' });
    await openPanel(page);

    const animation = await widget.panel(page).evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
  });
});

test('is fully operable from the keyboard alone', async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });

  // Alt+A opens without ever touching the trigger.
  await page.keyboard.press('Alt+a');
  await expect(widget.panel(page)).toBeVisible();

  // Focus lands inside the panel rather than leaving a keyboard user behind.
  const inPanel = await page.evaluate(() => {
    const root = document.getElementById('a11y-reader-ui')!.shadowRoot!;
    return root.querySelector('.panel')!.contains(root.activeElement);
  });
  expect(inPanel).toBe(true);

  await page.keyboard.press('Escape');
  await expect(widget.panel(page)).toHaveCount(0);

  // ...and focus comes back to the trigger.
  const onTrigger = await page.evaluate(() => {
    const root = document.getElementById('a11y-reader-ui')!.shadowRoot!;
    return root.activeElement === root.querySelector('.trigger');
  });
  expect(onTrigger).toBe(true);
});
