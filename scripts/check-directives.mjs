#!/usr/bin/env node
/**
 * Guards the 'use client' boundary.
 *
 * The React entry must carry the directive (Next.js needs it to draw a client
 * boundary) and the core entry must not (it is importable from server code).
 * esbuild strips directives, so this survives only via tsup's `banner` — which
 * silently stops working on tsup upgrades or if `splitting` is re-enabled.
 */
import { readFile } from 'node:fs/promises';

const DIRECTIVE = 'use client';
const MUST_HAVE = ['dist/index.mjs', 'dist/index.cjs'];
const MUST_NOT_HAVE = ['dist/core.mjs', 'dist/core.cjs'];

const failures = [];

async function head(file) {
  try {
    return (await readFile(file, 'utf8')).slice(0, 200);
  } catch {
    failures.push(`${file}: missing — did the build run?`);
    return null;
  }
}

for (const file of MUST_HAVE) {
  const text = await head(file);
  if (text === null) continue;
  if (!/^\s*['"]use client['"]\s*;?/.test(text)) {
    failures.push(`${file}: expected a leading '${DIRECTIVE}' directive, found none`);
  }
}

for (const file of MUST_NOT_HAVE) {
  const text = await head(file);
  if (text === null) continue;
  if (/['"]use client['"]/.test(text)) {
    failures.push(`${file}: must NOT carry '${DIRECTIVE}' — the core entry is server-safe`);
  }
}

if (failures.length > 0) {
  console.error("\n'use client' boundary check FAILED:\n");
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  process.exit(1);
}

console.log("'use client' boundary check passed");
