import { beforeEach, describe, expect, it } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityWidget } from '../src/react/AccessibilityWidget';
import { STYLE_IDS } from '../src/core/constants';
import { clearRegistry } from '../src/core/registry';

beforeEach(() => {
  document.body.innerHTML = '';
  clearRegistry(document);
});

describe('theme.contrastGrayscaleMedia', () => {
  const baseCss = () => document.getElementById(STYLE_IDS.base)?.textContent ?? '';

  it('is off by default', async () => {
    render(<AccessibilityWidget />);
    await waitFor(() => expect(baseCss()).not.toBe(''));
    expect(baseCss()).not.toContain('grayscale(1)');
  });

  it('reaches the engine when set on the theme, as PRD 6.3 documents it', async () => {
    render(<AccessibilityWidget theme={{ contrastGrayscaleMedia: true }} />);
    await waitFor(() => expect(baseCss()).not.toBe(''));
    expect(baseCss()).toContain('grayscale(1)');
  });

  it('also accepts the top-level prop, for provider-only usage', async () => {
    render(<AccessibilityWidget contrastGrayscaleMedia />);
    await waitFor(() => expect(baseCss()).not.toBe(''));
    expect(baseCss()).toContain('grayscale(1)');
  });
});

describe('CSS parts', () => {
  it('exposes trigger and panel so hosts can restyle them from outside', async () => {
    // Documented in the README as `#a11y-reader-ui::part(trigger)`. React has to
    // actually pass the `part` attribute through for that selector to match.
    const user = userEvent.setup();
    render(<AccessibilityWidget />);

    const sr = await waitFor(() => {
      const host = document.getElementById('a11y-reader-ui');
      if (!host?.shadowRoot) throw new Error('not mounted');
      return host.shadowRoot;
    });

    expect(sr.querySelector('[part="trigger"]')).not.toBeNull();

    await user.click(within(sr.querySelector('.a11y-root') as HTMLElement).getByRole('button'));
    expect(sr.querySelector('[part="panel"]')).not.toBeNull();
  });
});
