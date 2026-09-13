import { expect, test } from '@playwright/test';
import { openPanel, widget } from './helpers';

/**
 * PRD 12.5: host CSS must not be able to alter the widget's appearance.
 * The /hostile fixture forces Comic Sans, red, uppercase and 4px letter-spacing
 * on every element with !important.
 */
test('an aggressive host stylesheet cannot reach into the widget', async ({ page }) => {
  await page.goto('/hostile');
  await widget.trigger(page).waitFor({ state: 'visible' });
  await openPanel(page);

  // Control: the page really is under attack.
  const victim = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#victim')!);
    return { font: cs.fontFamily, color: cs.color, transform: cs.textTransform };
  });
  expect(victim.font).toContain('Comic Sans');
  expect(victim.color).toBe('rgb(255, 0, 0)');
  expect(victim.transform).toBe('uppercase');

  const survived = await page.evaluate(() => {
    const root = document.getElementById('a11y-reader-ui')!.shadowRoot!;
    const title = getComputedStyle(root.querySelector('.panel-title')!);
    const panel = getComputedStyle(root.querySelector('.panel')!);
    const trigger = getComputedStyle(root.querySelector('.trigger')!);
    return {
      titleFont: title.fontFamily,
      titleColor: title.color,
      titleSpacing: title.letterSpacing,
      titleTransform: title.textTransform,
      panelRadius: panel.borderRadius,
      triggerBackground: trigger.backgroundColor,
    };
  });

  expect(survived.titleFont).not.toContain('Comic Sans');
  expect(survived.titleColor).not.toBe('rgb(255, 0, 0)');
  expect(survived.titleSpacing).toBe('normal');
  expect(survived.titleTransform).toBe('none');
  expect(survived.panelRadius).toBe('16px');
  expect(survived.triggerBackground).toBe('rgb(37, 99, 235)');
});

test('host CSS parts remain the supported override route', async ({ page }) => {
  await page.goto('/');
  await widget.trigger(page).waitFor({ state: 'visible' });

  // Shadow DOM blocks accidental styling but ::part() is the deliberate door,
  // and the README documents it.
  await page.addStyleTag({
    content: '#a11y-reader-ui::part(trigger) { background: rgb(1, 2, 3) !important; }',
  });

  await expect
    .poll(() => widget.trigger(page).evaluate((el) => getComputedStyle(el).backgroundColor))
    .toBe('rgb(1, 2, 3)');
});
