# @rivesync/a11y-reader

A drop-in accessibility reading widget for React and Next.js. Adds a floating button
that opens a panel where **your visitors** adjust how your site's text is presented:
dyslexia-friendly font, high contrast, text size, letter spacing, line spacing, and a
reading ruler or focus mask. Preferences persist across page loads.

Browser extensions already offer these accommodations to the people who know to install
one. This puts them on the site itself, so every visitor gets them.

- **One line to integrate.** `<AccessibilityWidget />`, no configuration.
- **Invisible until used.** Nothing about your page changes until a visitor turns
  something on, and turning it all off restores the page exactly.
- **Isolated.** The widget lives in a Shadow DOM, so your CSS can't reach it and its
  transformations can't reach the widget.
- **Accessible itself.** Keyboard operable, screen-reader labelled, WCAG 2.2 AA.
- **Small.** ~15 kB gzipped; fonts load lazily only when someone enables them.

---

## Install

```bash
npm install @rivesync/a11y-reader
```

Peer dependencies: `react >= 18`, `react-dom >= 18`. No other runtime dependencies.

## Quick start

```tsx
import { AccessibilityWidget } from '@rivesync/a11y-reader';

export default function App() {
  return (
    <>
      <YourApp />
      <AccessibilityWidget />
    </>
  );
}
```

### Next.js App Router

The widget is a client component internally, so it can go straight into your root
layout — no `'use client'` wrapper needed.

```tsx
// app/layout.tsx
import { AccessibilityWidget } from '@rivesync/a11y-reader';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AccessibilityWidget position="bottom-right" />
      </body>
    </html>
  );
}
```

Add the preload snippet too — see [Avoiding the flash](#avoiding-the-flash-of-unstyled-content).

### Pages Router

```tsx
// pages/_app.tsx
import { AccessibilityWidget } from '@rivesync/a11y-reader';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <AccessibilityWidget />
    </>
  );
}
```

### Vite / CRA / Remix

Render it once, anywhere near the root of your tree. It portals itself to `document.body`.

---

## Props

Every prop is optional.

### Placement

| Prop | Type | Default | |
|---|---|---|---|
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Corner for the floating button. |
| `offset` | `{ x: number; y: number }` | `{ x: 20, y: 20 }` | Pixel offset from the viewport edges. Safe-area insets are added automatically on mobile. |
| `zIndex` | `number` | `2147483000` | The widget sits here; the reading-aid overlay sits one below. |
| `hideTrigger` | `boolean` | `false` | Hide the built-in button and open the panel from your own UI via [`useAccessibilityWidget()`](#hooks). |

### Behaviour

| Prop | Type | Default | |
|---|---|---|---|
| `defaultOpen` | `boolean` | `false` | Open the panel on first mount. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the panel opens or closes. |
| `hotkey` | `string \| false` | `'Alt+A'` | Keyboard shortcut to toggle the panel. `false` disables it. Matched on physical key position, so it works on non-US layouts. |
| `features` | `Partial<Record<Feature, boolean>>` | all `true` | Which rows to show. Keys: `dyslexicFont`, `highContrast`, `fontScale`, `letterSpacing`, `lineHeight`, `readingAid`. |

### What gets transformed

| Prop | Type | Default | |
|---|---|---|---|
| `scope` | `string \| string[]` | `'body'` | CSS selector(s) the transformations target. |
| `exclude` | `string \| string[]` | — | CSS selector(s) that must never be transformed. Your escape hatch — see [Known limitations](#known-limitations). |
| `fontSource` | `'bundled' \| 'cdn' \| { regular, bold? }` | `'bundled'` | Where OpenDyslexic comes from. |

Anything carrying a `data-a11y-exclude` attribute is skipped too, which is often easier
than maintaining a selector list:

```html
<pre data-a11y-exclude><code>never restyled</code></pre>
```

### State

| Prop | Type | Default | |
|---|---|---|---|
| `defaults` | `Partial<AccessibilitySettings>` | — | Starting values, used **only** when storage holds nothing. A returning visitor's own choices always win. |
| `storageKey` | `string \| false` | `'a11y-reader:settings'` | `localStorage` key. `false` keeps state in memory only. |
| `settings` | `AccessibilitySettings` | — | Controlled mode — see [Controlled mode](#controlled-mode). |
| `onChange` | `(settings: AccessibilitySettings) => void` | — | Called on every change. |

### Appearance

| Prop | Type | |
|---|---|---|
| `theme` | `Partial<WidgetTheme>` | Styles the widget itself, not your page. See [Theming](#theming). |
| `labels` | `Partial<WidgetLabels>` | Every visible and ARIA string. See [Internationalisation](#internationalisation). |

---

## Settings

```ts
interface AccessibilitySettings {
  dyslexicFont: boolean;        // default false
  highContrast: boolean;        // default false
  fontScale: number;            // 0.5 – 2.0, step 0.1, default 1.0
  letterSpacing: number;        // 0 – 0.5 em, step 0.05, default 0
  lineHeight: number | null;    // 1.0 – 3.0, step 0.1, default null
  readingAid: {
    mode: 'off' | 'ruler' | 'mask';        // default 'off'
    color: string;                          // any CSS colour
    height: number;                         // 20 – 300 px
    followMode: 'mouse' | 'keyboard' | 'both';  // default 'both'
  };
}
```

### Why `lineHeight` is nullable

`null` means *the visitor hasn't touched this*. The slider shows 1.5, but nothing is
applied to your page — your own typography survives until someone deliberately changes
it. Once they do, it becomes a number.

Deriving "untouched" from `lineHeight !== 1.5` would break the moment someone dragged
the slider back to exactly 1.5, and a separate hidden boolean couldn't survive a
round-trip through controlled mode. One nullable field is the honest representation.

Everything read from storage or from props is clamped to its declared range, and
malformed data is discarded rather than propagated.

---

## Hooks

```tsx
import { useAccessibilityWidget } from '@rivesync/a11y-reader';

function MyHeaderButton() {
  const { settings, setSettings, reset, open, close, toggle, isOpen } =
    useAccessibilityWidget();

  return <button onClick={() => open()}>Reading options</button>;
}
```

Works anywhere inside the widget's tree. To use it somewhere far from the widget, wrap
that part of your app in a provider — the widget will join it rather than starting a
second, competing store:

```tsx
import { AccessibilityProvider, AccessibilityWidget } from '@rivesync/a11y-reader';

<AccessibilityProvider>
  <MyHeaderButton />
  <YourApp />
  <AccessibilityWidget hideTrigger />
</AccessibilityProvider>
```

`<AccessibilityWidget />` creates its own provider when there isn't one, so the
zero-config case still works.

---

## Controlled mode

Pass `settings` **and** `onChange` to own the state yourself. The widget then never
touches `localStorage` — persistence is entirely yours, which avoids two sources of
truth that disagree after a reload.

```tsx
import { useState } from 'react';
import {
  AccessibilityWidget,
  DEFAULT_SETTINGS,
  readStoredSettings,
  type AccessibilitySettings,
} from '@rivesync/a11y-reader';

function App() {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    () => readStoredSettings('my-key') ?? DEFAULT_SETTINGS,
  );

  return <AccessibilityWidget settings={settings} onChange={setSettings} />;
}
```

`readStoredSettings(key)` is exported so you can seed from the same storage the
uncontrolled mode would have used.

| What you pass | What happens |
|---|---|
| neither | Uncontrolled. Reads and writes storage. |
| `settings` + `onChange` | Controlled. Storage untouched. |
| `settings` only | Controlled and read-only. Warns in development. |
| `onChange` only | Uncontrolled, with change notifications. Perfectly valid. |

The mode is decided at mount. Switching later warns and is ignored.

---

## Theming

```tsx
<AccessibilityWidget
  theme={{
    primaryColor: '#7c3aed',
    borderRadius: '12px',
    buttonSize: 64,
    darkMode: 'auto',
    hideBranding: true,
  }}
/>
```

| Key | Default | |
|---|---|---|
| `primaryColor` | `'#2563eb'` | Button fill, focus rings, active states. |
| `backgroundColor` | `'#ffffff'` | Panel surface. Overridden by dark mode unless you set it. |
| `textColor` | `'#111827'` | Panel text. Same. |
| `borderRadius` | `'16px'` | |
| `fontFamily` | system stack | |
| `buttonSize` | `56` | Pixels. Keep ≥ 44 for touch-target guidance. |
| `darkMode` | `'auto'` | `'auto'` follows `prefers-color-scheme`. |
| `hideBranding` | `false` | Hides the small footer line. |
| `contrastGrayscaleMedia` | `false` | Desaturate images and video in high-contrast mode. |

The widget exposes CSS parts, so you can also style it from your own stylesheet:

```css
#a11y-reader-ui::part(trigger) { box-shadow: none; }
#a11y-reader-ui::part(panel)   { border: 2px solid black; }
```

## Internationalisation

Pass any subset; the rest keep their English defaults.

```tsx
<AccessibilityWidget
  labels={{
    openPanel: 'Ouvrir les préférences de lecture',
    title: 'Préférences de lecture',
    dyslexicFont: 'Police adaptée à la dyslexie',
    highContrast: 'Contraste élevé',
    fontScale: 'Taille du texte',
    resetAll: 'Tout réinitialiser',
  }}
/>
```

Full key list: `openPanel`, `closePanel`, `title`, `dyslexicFont`, `highContrast`,
`fontScale`, `letterSpacing`, `lineHeight`, `readingAid`, `readingAidOff`,
`readingAidRuler`, `readingAidMask`, `color`, `opacity`, `height`, `resetAll`,
`increase`, `decrease`, `defaultValue`.

Import `DEFAULT_LABELS` if you want to see or extend the defaults.

---

## Avoiding the flash of unstyled content

A returning visitor with high contrast enabled would otherwise see your normal page for
one frame before the widget hydrates. `getPreloadScript()` returns a small synchronous
script that applies their stored preferences — and the CSS those preferences need —
before first paint.

**Import it from `/core`, not the main entry.** The main entry is a client module, so
in a server component its exports can't be called during render.

```tsx
// app/layout.tsx
import { getPreloadScript } from '@rivesync/a11y-reader/core';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: getPreloadScript() }} />
      </head>
      <body>
        {children}
        <AccessibilityWidget />
      </body>
    </html>
  );
}
```

Options: `storageKey`, `exclude`, `grayscaleMedia`, `fontUrls`, and `nonce` for a strict
Content-Security-Policy. Set the same nonce on the `<script>` tag itself:

```tsx
<script nonce={nonce} dangerouslySetInnerHTML={{ __html: getPreloadScript({ nonce }) }} />
```

**What it can't cover:** text size, which is applied by JavaScript on hydration by
design, and the web-font fetch (`font-display: swap` means text stays visible in a
fallback face meanwhile).

---

## The framework-agnostic core

Everything except the panel UI lives in `@rivesync/a11y-reader/core`, with no React
import anywhere in it. Use it to build your own UI, or a Vue/Svelte/vanilla adapter:

```ts
import { createAccessibilityEngine, DEFAULT_SETTINGS } from '@rivesync/a11y-reader/core';

const engine = createAccessibilityEngine({ scope: 'main', exclude: 'pre, code' });
engine.apply({ ...DEFAULT_SETTINGS, highContrast: true, fontScale: 1.4 });
engine.destroy(); // leaves the page exactly as it was
```

---

## Fonts

OpenDyslexic Regular and Bold ship with the package (235 kB total) and are injected
lazily — the files are never requested until a visitor switches the font on.

`fontSource: 'bundled'` (the default) resolves the files relative to the built module,
which bundlers that understand `new URL(..., import.meta.url)` — webpack 5, Vite, Next —
turn into a normal emitted asset. If your bundler doesn't, the package falls back to
jsDelivr automatically rather than requesting a URL that can't exist. Force either with
`fontSource: 'cdn'`, or point at your own copies:

```tsx
<AccessibilityWidget
  fontSource={{ regular: '/fonts/opendyslexic-regular.woff2', bold: '/fonts/opendyslexic-bold.woff2' }}
/>
```

Italics are synthesised by the browser; shipping all four faces would nearly double the
payload for a small gain.

OpenDyslexic is licensed under the SIL Open Font License 1.1 — see
`LICENSE-OpenDyslexic.txt`. Note that evidence for dyslexia-specific fonts improving
reading speed is mixed; many readers do report preferring them, which is reason enough
to offer the choice rather than impose it.

---

## Known limitations

**Text that isn't text.** Content inside `<canvas>`, baked into images, or served from a
cross-origin `<iframe>` can't be transformed. Nothing can change that from the page.

**High contrast uses `!important`.** It can collide with sites that lean on `!important`
themselves. `exclude` is the escape hatch.

**High contrast removes background images.** A `background-image` paints *over*
`background-color`, so without this a gradient or hero image survives while the text on
top is forced to white — frequently unreadable. The cost is that CSS-sprite icons and
decorative background logos disappear while high contrast is on. Exclude them if that
matters more to you than the guarantee.

**Decorative overlays can become opaque.** Forcing a background colour on every element
turns a full-bleed gradient scrim into a solid sheet that hides what's beneath it. There
is no CSS selector for "element with no text of its own". Use `exclude` on such
overlays.

**Icon fonts.** Icon elements are detected and left alone, which matters most for
Material Icons and Material Symbols: they declare their font on the element and render
via text ligatures, so an untagged `<i class="material-icons">home</i>` would display the
literal word "home". Font Awesome declares its font on `::before` and was never at risk.
Detection covers the common libraries; if you use an unusual one, add it to `exclude`.

**Touch.** The reading aid is placed by tapping and moved by dragging. There is no
hover on a touch screen, so it cannot follow a finger the way it follows a mouse.

**Text size on very large DOMs.** Scaling walks every text-bearing element, reading all
sizes before writing any. That's comfortably inside budget at a few thousand elements;
past roughly 20,000 it may be perceptible on slow devices.

**Inline font sizes set after the fact.** If your app writes an inline `font-size` onto
an element that's already scaled — a React re-render with a `style` prop — the scale is
overwritten on that element until the next full pass.

---

## Browser support

Modern evergreen browsers. Requires Shadow DOM, `:where()`/`:is()`, and CSS custom
properties. No IE11, no React below 18.

## Contributing

```bash
npm install
npm run build        # ESM + CJS + types, fonts, then the 'use client' boundary check
npm test             # unit, component and axe tests (vitest + jsdom)
npm run test:e2e     # Playwright: desktop Chromium + mobile WebKit
npm run verify       # everything CI runs
```

The split matters. jsdom has no layout, no paint, and does not resolve inherited
`font-size` to pixels — so anything about cascade resolution, real contrast ratios,
font loading or overlay positioning lives in `e2e/`, and the unit suite explicitly
disables the axe colour-contrast rules rather than pretending to check them.

Releases go through Changesets — see [`.github/RELEASING.md`](.github/RELEASING.md).

The example app under `examples/next-app-router` is the manual verification harness.
Its fixture page is deliberately awkward — px-based sizing, a gradient behind text, a
transparent PNG, Material Symbols ligature icons — because each of those is a case that
blanket CSS transformations get wrong.

## License

MIT © Rohit Roshan Sahu. OpenDyslexic is under the SIL Open Font License 1.1.
