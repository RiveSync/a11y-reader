import type { Metadata } from 'next';
// The widget itself is a client component ('use client' is baked into the
// built bundle), so it can sit directly in this server component.
import { AccessibilityWidget } from '@rivesync/a11y-reader';
// getPreloadScript comes from /core, NOT the main entry. The main entry is a
// client module, so in a server component its exports are client references
// that cannot be *called* during render. /core exists precisely for this.
import { getPreloadScript } from '@rivesync/a11y-reader/core';
import './globals.css';

export const metadata: Metadata = {
  title: 'a11y-reader — Next.js App Router example',
  description: 'Verification harness for @rivesync/a11y-reader',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Applies stored preferences before first paint. Without it, a returning
          visitor with high contrast on sees a white flash before hydration.
        */}
        <script dangerouslySetInnerHTML={{ __html: getPreloadScript() }} />
        {/*
          Material Symbols is deliberately loaded. It declares font-family on
          the element and renders via text ligatures, so it is the one icon font
          our blanket font rule actually breaks: without the icon tagger,
          <span className="material-symbols-outlined">home</span> renders the
          literal word "home". Font Awesome would NOT catch this regression,
          because it declares its font on ::before.
        */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body>
        {children}
        <AccessibilityWidget position="bottom-right" />
      </body>
    </html>
  );
}
