/**
 * Minimal CSS colour handling.
 *
 * Deliberately not `color-mix()`: the widget derives its muted text, borders
 * and hover fills from the theme's background and foreground, and doing that in
 * CSS has two problems. A browser without `color-mix()` support resolves the
 * declaration to nothing, which for a *text* colour means unreadable output in
 * an accessibility widget. And `color-mix()` computes to `color(srgb …)`, which
 * axe-core misreads — it reported a 3:1 ratio for a colour that actually
 * measures 6.6:1, so the tooling could neither verify nor be trusted.
 *
 * Resolving to plain rgb() in JS is deterministic, universally supported, and
 * analysable by every contrast checker.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses hex (3/6/8 digit) and rgb()/rgba(). Anything else yields a visible neutral. */
export function parseColor(value: string): Rgba {
  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  if (rgb?.[1]) {
    const parts = rgb[1].split(/[,/]/).map((part) => parseFloat(part.trim()));
    return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
  }

  const hex = value.trim().replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0]! + hex[0], 16),
      g: parseInt(hex[1]! + hex[1], 16),
      b: parseInt(hex[2]! + hex[2], 16),
      a: 1,
    };
  }
  if (/^[0-9a-f]{6}$/i.test(hex) || /^[0-9a-f]{8}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  // Named colours and modern colour spaces are not parsed; a mid neutral is
  // better than an invisible aid or invisible text.
  return { r: 0, g: 0, b: 0, a: 0.6 };
}

export function toHex({ r, g, b }: Rgba): string {
  const pair = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${pair(r)}${pair(g)}${pair(b)}`;
}

export function toRgba({ r, g, b, a }: Rgba): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(2))})`;
}

/**
 * Blend `amount` of `color` over `base`, yielding an opaque rgb().
 *
 * Opaque is the point: semi-transparent text has no determinate contrast ratio,
 * because it depends on whatever happens to be painted behind it.
 */
export function mix(color: string, base: string, amount: number): string {
  const a = parseColor(color);
  const b = parseColor(base);
  const t = Math.min(1, Math.max(0, amount));
  const channel = (x: number, y: number) => Math.round(x * t + y * (1 - t));
  return `rgb(${channel(a.r, b.r)}, ${channel(a.g, b.g)}, ${channel(a.b, b.b)})`;
}
