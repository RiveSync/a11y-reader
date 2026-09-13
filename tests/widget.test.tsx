import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { AccessibilityWidget } from '../src/react/AccessibilityWidget';
import { AccessibilityProvider } from '../src/react/AccessibilityProvider';
import { useAccessibilityWidget } from '../src/react/useAccessibilityWidget';
import { DEFAULT_SETTINGS, DEFAULT_STORAGE_KEY, STORAGE_VERSION } from '../src/core/constants';
import { clearRegistry } from '../src/core/registry';
import type { AccessibilitySettings } from '../src/core/types';

/**
 * `screen.*` queries document.body and cannot see the panel — it lives in a
 * shadow root. Everything goes through the `.a11y-root` wrapper, which is also
 * why that wrapper exists: `within()` needs an HTMLElement, because role
 * queries call element.matches, and within(ShadowRoot) is unreliable.
 */
function ui() {
  const host = document.getElementById('a11y-reader-ui');
  if (!host?.shadowRoot) throw new Error('widget host not mounted');
  return within(host.shadowRoot.querySelector('.a11y-root') as HTMLElement);
}

beforeEach(() => {
  document.body.innerHTML = '';
  clearRegistry(document);
});

describe('SSR safety', () => {
  it('renders nothing on the server', () => {
    // PRD 9: no window/document/localStorage during render, and no hydration
    // mismatch to recover from.
    expect(renderToString(<AccessibilityWidget />)).toBe('');
  });
});

describe('trigger', () => {
  it('exposes an accessible name and expanded state', async () => {
    render(<AccessibilityWidget />);
    await waitFor(() => ui());

    const trigger = ui().getByRole('button', { name: /open reading preferences/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'a11y-reader-panel');
  });

  it('shows no badge until something differs from the defaults', async () => {
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    expect(ui().queryByRole('button')!.querySelector('.badge')).toBeNull();
  });

  it('can be hidden entirely for a host-supplied control', async () => {
    render(<AccessibilityWidget hideTrigger />);
    await waitFor(() => ui());
    expect(ui().queryByRole('button', { name: /open reading preferences/i })).toBeNull();
  });
});

describe('panel', () => {
  it('opens and closes from the trigger', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());

    expect(ui().queryByRole('dialog')).toBeNull();
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    const dialog = ui().getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'false');
    expect(within(dialog).getByRole('heading', { name: 'Reading preferences' })).toBeTruthy();

    await user.click(ui().getByRole('button', { name: /close reading preferences/i }));
    expect(ui().queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());

    const trigger = ui().getByRole('button', { name: /open reading preferences/i });
    await user.click(trigger);
    expect(ui().getByRole('dialog')).toBeTruthy();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(ui().queryByRole('dialog')).toBeNull());

    // activeElement on the shadow root — document.activeElement is the host.
    const host = document.getElementById('a11y-reader-ui')!;
    expect(host.shadowRoot!.activeElement).toBe(trigger);
  });

  it('renders every control by default', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    expect(ui().getByRole('checkbox', { name: /dyslexia-friendly font/i })).toBeTruthy();
    expect(ui().getByRole('checkbox', { name: /high contrast/i })).toBeTruthy();
    expect(ui().getByRole('slider', { name: /text size/i })).toBeTruthy();
    expect(ui().getByRole('slider', { name: /letter spacing/i })).toBeTruthy();
    expect(ui().getByRole('slider', { name: /line spacing/i })).toBeTruthy();
    expect(ui().getByRole('radiogroup', { name: /reading aid/i })).toBeTruthy();
  });

  it('hides the features the host switched off', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget features={{ highContrast: false, readingAid: false }} />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    expect(ui().queryByRole('checkbox', { name: /high contrast/i })).toBeNull();
    expect(ui().queryByRole('radiogroup')).toBeNull();
    expect(ui().getByRole('checkbox', { name: /dyslexia-friendly font/i })).toBeTruthy();
  });

  it('uses host-supplied labels', async () => {
    const user = userEvent.setup();
    render(
      <AccessibilityWidget
        labels={{ openPanel: 'Ouvrir les préférences', title: 'Préférences de lecture' }}
      />,
    );
    await waitFor(() => ui());

    await user.click(ui().getByRole('button', { name: 'Ouvrir les préférences' }));
    expect(ui().getByRole('heading', { name: 'Préférences de lecture' })).toBeTruthy();
    // Unspecified labels keep their English defaults.
    expect(ui().getByRole('checkbox', { name: /high contrast/i })).toBeTruthy();
  });
});

describe('sliders', () => {
  it('announces values in human units, not raw numbers', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    expect(ui().getByRole('slider', { name: /text size/i })).toHaveAttribute(
      'aria-valuetext',
      '100%',
    );
    expect(ui().getByRole('slider', { name: /letter spacing/i })).toHaveAttribute(
      'aria-valuetext',
      '0.00em',
    );
  });

  it('marks line spacing as untouched until the user moves it', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    const slider = ui().getByRole('slider', { name: /line spacing/i });
    // Shows 1.5, but the page is untouched — the distinction lineHeight: null exists for.
    expect(slider).toHaveAttribute('aria-valuetext', '1.5 (default)');
    expect(document.documentElement.hasAttribute('data-a11y-line-height')).toBe(false);
  });

  it('steppers move the value and clamp at the ends', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    await user.click(ui().getByRole('button', { name: /increase text size/i }));
    expect(ui().getByRole('slider', { name: /text size/i })).toHaveAttribute(
      'aria-valuetext',
      '110%',
    );
  });
});

describe('state ownership', () => {
  it('persists uncontrolled changes to storage', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));
    await user.click(ui().getByRole('checkbox', { name: /high contrast/i }));

    await waitFor(() => {
      const raw = JSON.parse(localStorage.getItem(DEFAULT_STORAGE_KEY)!);
      expect(raw.version).toBe(STORAGE_VERSION);
      expect(raw.settings.highContrast).toBe(true);
    });
  });

  it('restores stored settings on mount', async () => {
    localStorage.setItem(
      DEFAULT_STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        settings: { ...DEFAULT_SETTINGS, fontScale: 1.4 },
      }),
    );

    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));

    expect(ui().getByRole('slider', { name: /text size/i })).toHaveAttribute(
      'aria-valuetext',
      '140%',
    );
  });

  it('never writes to storage when storageKey is false', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget storageKey={false} />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));
    await user.click(ui().getByRole('checkbox', { name: /high contrast/i }));

    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  it('in controlled mode reports changes and leaves storage alone', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const settings: AccessibilitySettings = { ...DEFAULT_SETTINGS };

    render(<AccessibilityWidget settings={settings} onChange={onChange} />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));
    await user.click(ui().getByRole('checkbox', { name: /high contrast/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].highContrast).toBe(true);
    // The host owns persistence; writing behind its back would give two
    // sources of truth that disagree after a reload.
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  it('in controlled mode does not change until the host says so', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget settings={{ ...DEFAULT_SETTINGS }} onChange={() => {}} />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));
    await user.click(ui().getByRole('checkbox', { name: /high contrast/i }));

    expect(ui().getByRole('checkbox', { name: /high contrast/i })).not.toBeChecked();
    expect(document.documentElement.hasAttribute('data-a11y-contrast')).toBe(false);
  });

  it('resets everything, including storage', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget />);
    await waitFor(() => ui());
    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));
    await user.click(ui().getByRole('checkbox', { name: /high contrast/i }));
    await waitFor(() => expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).not.toBeNull());

    await user.click(ui().getByRole('button', { name: /reset all/i }));

    expect(ui().getByRole('checkbox', { name: /high contrast/i })).not.toBeChecked();
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.hasAttribute('data-a11y-contrast')).toBe(false);
  });
});

describe('provider', () => {
  it('lets the host drive the panel from its own UI', async () => {
    const user = userEvent.setup();

    function HostButton() {
      const { open, isOpen } = useAccessibilityWidget();
      return (
        <button type="button" onClick={() => open()}>
          host opener {isOpen ? '(open)' : '(closed)'}
        </button>
      );
    }

    const { getByRole } = render(
      <AccessibilityProvider>
        <HostButton />
        <AccessibilityWidget hideTrigger />
      </AccessibilityProvider>,
    );
    await waitFor(() => ui());

    // The host's own button lives in the light DOM, the panel in the shadow root.
    await user.click(getByRole('button', { name: /host opener/i }));
    expect(ui().getByRole('dialog')).toBeTruthy();
  });

  it('joins an existing provider rather than starting a second store', async () => {
    const user = userEvent.setup();

    function Readout() {
      const { settings } = useAccessibilityWidget();
      return <output>{settings.highContrast ? 'on' : 'off'}</output>;
    }

    const { getByRole } = render(
      <AccessibilityProvider>
        <Readout />
        <AccessibilityWidget />
      </AccessibilityProvider>,
    );
    await waitFor(() => ui());

    await user.click(ui().getByRole('button', { name: /open reading preferences/i }));
    await user.click(ui().getByRole('checkbox', { name: /high contrast/i }));

    // A second store would leave this reading 'off'.
    await waitFor(() => expect(getByRole('status').textContent).toBe('on'));
  });
});
