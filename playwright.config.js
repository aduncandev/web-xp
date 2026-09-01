import { defineConfig } from '@playwright/test';

/*
 * The smoke suite. Its job is to answer one question fast: did that change
 * break the desktop?
 *
 * Chromium only, and no jsdom tier. Almost everything here is integration —
 * the window manager measures real layout with getBoundingClientRect, the
 * filesystem is real IndexedDB with gzipped blobs, and the desktop grid
 * needs ResizeObserver. A jsdom suite would go green while the desktop was
 * visibly broken, which is worse than no suite at all.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Booting a machine costs a few seconds of deliberate XP ceremony.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    // vite.config.js checks PW so a test run does not pop a real browser
    // window every time it cold-starts the dev server.
    env: { PW: '1' },
  },
});
