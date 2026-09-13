# @rivesync/a11y-reader

## 0.1.0

### Minor Changes

- 1422ef9: Initial release.

  A drop-in accessibility reading widget for React and Next.js. One component adds a
  floating button that lets visitors adjust how the host site's text is presented:
  OpenDyslexic font, high contrast, text size, letter spacing, line spacing, and a
  reading ruler or focus mask. Preferences persist in `localStorage`.

  - Framework-agnostic engine under `@rivesync/a11y-reader/core`, with no React import.
  - Widget UI in a Shadow DOM, so host CSS cannot reach it and page transformations
    cannot reach the widget.
  - Turning every feature off restores the page byte-for-byte and pixel-for-pixel.
  - `getPreloadScript()` applies stored preferences before first paint, with CSP nonce
    support.
  - Keyboard operable, screen-reader labelled, and axe-clean in light and dark themes
    with real colour-contrast checking.
