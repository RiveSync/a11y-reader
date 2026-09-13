/**
 * The universal access symbol, inline.
 *
 * An SVG rather than an icon font on purpose: an icon font would need a network
 * request, and it is exactly the kind of thing the dyslexic-font feature has to
 * work around on host pages.
 */
export function AccessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="12" cy="4" r="2" />
      <path d="M20.5 7.3a1 1 0 0 0-1.2-.75L15 7.6a12 12 0 0 1-6 0L4.7 6.55a1 1 0 1 0-.46 1.95L8.5 9.5v3.1l-1.95 6.1a1 1 0 0 0 1.9.6L10 13.9h4l1.55 5.4a1 1 0 0 0 1.9-.6L15.5 12.6V9.5l4.26-1A1 1 0 0 0 20.5 7.3Z" />
    </svg>
  );
}
