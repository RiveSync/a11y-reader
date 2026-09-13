import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['esm', 'cjs'],
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: false,
  // MUST stay false. tsup's `treeshake` runs a Rollup pass over the *already
  // bundled* output, and Rollup strips module-level directives ("Module level
  // directives cause errors when bundled ... was ignored"). That silently
  // deletes the 'use client' banner below. esbuild's own bundling already
  // drops unused exports, so this costs us nothing.
  treeshake: false,
  // Code splitting would emit shared chunks that do NOT carry the 'use client'
  // banner, and Next.js evaluates those on the server. Keep every entry whole.
  splitting: false,
  external: ['react', 'react-dom'],
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
};

export default defineConfig([
  // Framework-agnostic core. Must NOT carry a 'use client' directive: it is
  // importable from server code and from non-React adapters.
  {
    ...shared,
    entry: { core: 'src/core.ts' },
    clean: true,
  },
  // React entry. esbuild strips directives and tsup has no preserveDirectives,
  // so the banner is how 'use client' survives. It is scoped to this config
  // precisely so it cannot leak onto the core entry above.
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    banner: { js: "'use client';" },
  },
]);
