#!/usr/bin/env node
/**
 * Copy the bundled fonts next to the built modules.
 *
 * This runs as its own build step rather than from tsup's `onSuccess`: the two
 * tsup configs build concurrently, and the core config's `clean: true` wipes
 * dist/. An onSuccess copy from the index config races that clean and is
 * silently deleted about as often as it survives — which shows up later as
 * "Module not found: ./fonts/...woff2" in a consumer's bundler.
 */
import { cp, readdir } from 'node:fs/promises';

await cp('fonts', 'dist/fonts', { recursive: true });

const copied = await readdir('dist/fonts');
const woff2 = copied.filter((f) => f.endsWith('.woff2'));
if (woff2.length === 0) {
  console.error('copy-fonts: no .woff2 files landed in dist/fonts');
  process.exit(1);
}
console.log(`copy-fonts: ${woff2.length} font files in dist/fonts`);
