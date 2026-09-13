import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/node/**'],
        },
      },
      {
        // The preload snippet is a *string* built without touching the DOM.
        // Building it in a node environment is what proves that.
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/node/**/*.test.ts'],
        },
      },
    ],
  },
});
