import { beforeEach, describe, expect, it } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { AccessibilityWidget } from '../src/react/AccessibilityWidget';
import { clearRegistry } from '../src/core/registry';

/**
 * axe-core traverses *open* shadow roots, which is one of the reasons the
 * widget's root is open rather than closed.
 *
 * Colour-contrast rules are disabled here because they need real layout and
 * paint, which jsdom does not do — axe returns them as "incomplete", not
 * "pass", so leaving them on would be a false sense of coverage. Contrast is
 * verified in the browser with @axe-core/playwright (M7).
 */
const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },
  },
};

function host() {
  const el = document.getElementById('a11y-reader-ui');
  if (!el?.shadowRoot) throw new Error('widget host not mounted');
  return el;
}

function ui() {
  return within(host().shadowRoot!.querySelector('.a11y-root') as HTMLElement);
}

beforeEach(() => {
  document.body.innerHTML = '';
  clearRegistry(document);
});

describe('axe', () => {
  it('finds no violations on the trigger alone', async () => {
    render(<AccessibilityWidget />);
    await waitFor(() => ui());

    expect(await axe(host(), AXE_OPTIONS)).toHaveNoViolations();
  });

  it('finds no violations with the panel open', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    expect(await axe(host(), AXE_OPTIONS)).toHaveNoViolations();
  });

  it('finds no violations with the reading-aid controls revealed', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));
    await user.click(ui().getByRole('radio', { name: 'Ruler' }));

    expect(await axe(host(), AXE_OPTIONS)).toHaveNoViolations();
  });

  it('finds no violations in dark theme', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget theme={{ darkMode: 'dark' }} />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    expect(await axe(host(), AXE_OPTIONS)).toHaveNoViolations();
  });
});

describe('keyboard operation', () => {
  it('is fully operable without a pointer', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());

    const trigger = ui().getByRole('button', { name: /open reading preferences/i });
    trigger.focus();
    await user.keyboard('{Enter}');

    const dialog = ui().getByRole('dialog');
    expect(dialog).toBeTruthy();
    // Focus moved into the panel, so a keyboard user is not left behind on the
    // trigger having to tab through the whole page.
    expect(host().shadowRoot!.activeElement).not.toBe(trigger);
    expect(dialog.contains(host().shadowRoot!.activeElement)).toBe(true);
  });

  it('moves between reading-aid options with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    const off = ui().getByRole('radio', { name: 'Off' });
    off.focus();
    await user.keyboard('{ArrowRight}');

    expect(ui().getByRole('radio', { name: 'Ruler' })).toHaveAttribute('aria-checked', 'true');
    expect(ui().getByRole('radio', { name: 'Off' })).toHaveAttribute('tabindex', '-1');
  });

  it('opens with the Alt+A hotkey', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());

    await user.keyboard('{Alt>}a{/Alt}');
    await waitFor(() => expect(ui().getByRole('dialog')).toBeTruthy());
  });
});
