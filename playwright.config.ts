import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against the example app, because the things Playwright is here for
 * are exactly the things jsdom cannot do: real layout, real paint, real font
 * loading, real cascade resolution.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Perf assertions are meaningless when several workers share a CPU.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
      // mobile.spec.ts asserts the bottom-sheet layout and uses touch APIs; it
      // is meaningless at desktop width.
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],

  // `next build` first: the production bundle is what ships, and dev-mode
  // double-rendering would make hydration assertions unreliable.
  webServer: {
    command: 'npm run build && npm run start -- --port 3100',
    cwd: './examples/next-app-router',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },

  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
});
