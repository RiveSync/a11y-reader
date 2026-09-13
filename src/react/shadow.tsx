import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ensureHost, removeHost } from '../core/dom';

export interface ShadowPortalProps {
  id: string;
  zIndex: number;
  css: string;
  /** Applied to the `.a11y-root` wrapper — theme custom properties live here. */
  rootProps?: React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>;
  children: ReactNode;
}

/**
 * Renders children into an open shadow root attached to a host in <body>.
 *
 * createPortal rather than a second createRoot: one React tree keeps context,
 * DevTools and StrictMode behaviour intact, and needs no manual unmount path.
 * The usual objection is that React's delegated listeners live on the portal's
 * container in the document, so composed events crossing the shadow boundary
 * arrive retargeted — which breaks the caret in controlled *text* inputs. This
 * widget has only range, color, checkbox and button controls, none of which
 * have a caret, so the failure mode does not apply.
 *
 * If a text field is ever added here, make it uncontrolled or switch to
 * createRoot.
 *
 * `mode: 'open'` is required: axe-core traversal and Testing Library queries
 * both need to see inside.
 *
 * Note what must never go on the host element — see ensureHost's contract. Any
 * transform, filter or contain:paint there would make it the containing block
 * for position:fixed descendants. Animate `.a11y-root` or deeper instead.
 */
export function ShadowPortal({ id, zIndex, css, rootProps, children }: ShadowPortalProps) {
  const [root, setRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = ensureHost(document, id, { zIndex });
    setRoot(host.shadowRoot ?? host.attachShadow({ mode: 'open' }));
    return () => {
      setRoot(null);
      removeHost(document, id);
    };
  }, [id, zIndex]);

  if (!root) return null;

  return createPortal(
    <>
      <style>{css}</style>
      {/*
        A single element wrapper is required, not cosmetic: Testing Library's
        within() needs an HTMLElement (role queries call element.matches), and
        `all: initial` here is what stops inherited color/font from the host
        page reaching the panel.
      */}
      <div className="a11y-root" {...rootProps}>
        {children}
      </div>
    </>,
    root,
  );
}
