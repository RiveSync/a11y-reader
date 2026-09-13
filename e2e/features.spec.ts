import { expect, test } from '@playwright/test';
import { bump, computed, openPanel, widget } from './helpers';

/**
 * The cases that need a real browser: cascade resolution, computed inheritance,
 * real font loading and real paint. Each of these passed in jsdom while being
 * wrong in a browser, or could not be expressed in jsdom at all.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });
});

test('renders with no console output at all', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (m) => messages.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));

  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });

  // Covers PRD 12.1's "no hydration warnings" and then some.
  expect(messages).toEqual([]);
});

test.describe('high contrast', () => {
  test.beforeEach(async ({ page }) => {
    await openPanel(page);
    await widget.toggle(page, /high contrast/i).click();
  });

  test('turns links yellow rather than white', async ({ page }) => {
    // The specificity bug: `:not()` takes its most specific argument's weight,
    // so an unwrapped guard pushes the blanket rule above the link rule and
    // links come out white. Wrapping it in `:where()` is what fixes it.
    await expect
      .poll(() => computed(page, 'main a', 'color'))
      .toBe('rgb(255, 255, 0)');
    await expect.poll(() => computed(page, 'main p', 'color')).toBe('rgb(255, 255, 255)');
  });

  test('leaves transparent images unboxed', async ({ page }) => {
    await expect
      .poll(() => computed(page, 'main img', 'backgroundColor'))
      .toBe('rgba(0, 0, 0, 0)');
  });

  test('paints the root so short pages have no white gutters', async ({ page }) => {
    await expect.poll(() => computed(page, 'html', 'backgroundColor')).toBe('rgb(0, 0, 0)');
    await expect.poll(() => computed(page, 'html', 'colorScheme')).toBe('dark');
  });

  test('removes background images that would paint over the forced colour', async ({ page }) => {
    // Without this the hero gradient survives and its dark text is forced white.
    await expect.poll(() => computed(page, '.hero', 'backgroundImage')).toBe('none');
  });

  test('does not reach the widget itself', async ({ page }) => {
    await expect
      .poll(() => page.evaluate(() => {
        const panel = document.querySelector('#a11y-reader-ui')!.shadowRoot!.querySelector('.panel')!;
        return getComputedStyle(panel).backgroundColor;
      }))
      .not.toBe('rgb(0, 0, 0)');
  });
});

test.describe('dyslexic font', () => {
  test('loads the bundled font and applies it to prose', async ({ page }) => {
    await openPanel(page);
    await widget.toggle(page, /dyslexia-friendly font/i).click();

    // Proves the font file actually resolved and downloaded — the failure mode
    // where font-family says OpenDyslexic but nothing was ever fetched.
    await expect
      .poll(() => page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('16px OpenDyslexic');
      }))
      .toBe(true);

    expect(await computed(page, 'main p', 'fontFamily')).toContain('OpenDyslexic');
  });

  test('leaves Material Symbols ligature icons as glyphs', async ({ page }) => {
    await openPanel(page);
    await widget.toggle(page, /dyslexia-friendly font/i).click();
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-a11y-dyslexic'));

    const icons = page.locator('.material-symbols-outlined');
    await expect(icons.first()).toHaveAttribute('data-a11y-icon', '');
    expect(await computed(page, '.material-symbols-outlined', 'fontFamily')).toContain(
      'Material Symbols',
    );

    // A ligature rendered as the word "home" is far wider than one glyph.
    const width = await icons.first().evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThan(40);
  });

  test('survives a reload, when the preload script sets the attribute first', async ({ page }) => {
    await openPanel(page);
    await widget.toggle(page, /dyslexia-friendly font/i).click();
    await page.waitForFunction(() => localStorage.getItem('a11y-reader:settings') !== null);

    await page.reload();
    await widget.trigger(page).waitFor({ state: 'visible' });

    // On a reload the attribute is already set before the engine mounts, so the
    // icon scan reads computed styles that all say OpenDyslexic. Without
    // suspending the attribute for the scan, icons break on every visit after
    // the first — and only after the first.
    await expect(page.locator('.material-symbols-outlined').first()).toHaveAttribute(
      'data-a11y-icon',
      '',
    );
    expect(await computed(page, '.material-symbols-outlined', 'fontFamily')).toContain(
      'Material Symbols',
    );
  });
});

test.describe('text size', () => {
  test('scales a px-based site, which root font-size could not', async ({ page }) => {
    const before = await computed(page, 'main p', 'fontSize');
    expect(before).toBe('17px');

    await openPanel(page);
    await bump(page, /increase text size/i, 5); // 1.0 -> 1.5

    await expect.poll(() => computed(page, 'main p', 'fontSize')).toBe('25.5px');
    // Headings scale from their own size, not from a shared root value.
    await expect.poll(() => computed(page, 'main h1', 'fontSize')).toBe('51px');
  });

  test('applies to content added after the fact', async ({ page }) => {
    await openPanel(page);
    await bump(page, /increase text size/i, 5);
    await expect.poll(() => computed(page, 'main p', 'fontSize')).toBe('25.5px');

    await page.evaluate(() => {
      const p = document.createElement('p');
      p.id = 'late';
      p.textContent = 'added after the pass';
      document.querySelector('main')!.appendChild(p);
    });

    await expect.poll(() => computed(page, '#late', 'fontSize')).toBe('25.5px');
  });
});

test.describe('spacing', () => {
  test('applies letter and line spacing, and exempts code', async ({ page }) => {
    await openPanel(page);
    await bump(page, /increase letter spacing/i, 2); // 0.10em
    await bump(page, /increase line spacing/i, 5); // 1.5 -> 2.0

    await expect.poll(() => computed(page, 'main p', 'letterSpacing')).toBe('1.7px');
    await expect.poll(() => computed(page, 'main p', 'lineHeight')).toBe('34px');
  });

  test('leaves line spacing alone until the slider is touched', async ({ page }) => {
    const before = await computed(page, 'main p', 'lineHeight');
    await openPanel(page);

    // The slider reads 1.5, but the page keeps its own line-height.
    await expect(widget.slider(page, /line spacing/i)).toHaveAttribute(
      'aria-valuetext',
      '1.5 (default)',
    );
    expect(await computed(page, 'main p', 'lineHeight')).toBe(before);
    expect(
      await page.evaluate(() => document.documentElement.hasAttribute('data-a11y-line-height')),
    ).toBe(false);
  });
});

test('settings persist across a reload', async ({ page }) => {
  await openPanel(page);
  await widget.toggle(page, /high contrast/i).click();
  await bump(page, /increase text size/i, 3);
  await page.waitForFunction(() => localStorage.getItem('a11y-reader:settings') !== null);

  await page.reload();
  await widget.trigger(page).waitFor({ state: 'visible' });

  await expect.poll(() => computed(page, 'html', 'backgroundColor')).toBe('rgb(0, 0, 0)');
  await expect.poll(() => computed(page, 'main p', 'fontSize')).toBe('22.1px');
});
