import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface FocusTrapOptions {
  active: boolean;
  /** Only trap when the panel was opened from the keyboard (PRD 6.2). */
  trap: boolean;
  onEscape(): void;
  /** Focus is returned here on close. */
  returnFocusTo?: HTMLElement | null;
}

/**
 * Focus management for a panel living inside a shadow root.
 *
 * Every rule here exists because the shadow boundary breaks the obvious
 * approach:
 *
 * - `document.activeElement` returns the *host*, never the focused control
 *   inside it. Ask the shadow root instead.
 * - `document.querySelectorAll` cannot see the panel's controls, so tab order
 *   has to be enumerated from the shadow root.
 * - `keydown` is composed, so an Escape listener on the document fires for the
 *   whole page; it is gated on composedPath() containing our container.
 *
 * The trap is conditional by design: a mouse user should still be able to
 * scroll and click the page while watching their changes take effect, which is
 * also why the dialog is non-modal.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { active, trap, onEscape, returnFocusTo }: FocusTrapOptions,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const root = container.getRootNode() as ShadowRoot | Document;
    const focusables = (): HTMLElement[] =>
      [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el.getClientRects().length > 0,
      );

    // Move focus in on open. Without this a keyboard user would have to tab
    // through the rest of the page to reach a panel they just opened.
    (focusables()[0] ?? container).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.composedPath().includes(container)) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape();
        return;
      }

      if (event.key !== 'Tab' || !trap) return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      // activeElement on the *shadow root*: the document's would be the host.
      const current = (root as ShadowRoot).activeElement ?? null;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      returnFocusTo?.focus();
    };
  }, [active, trap, onEscape, returnFocusTo, containerRef]);
}
