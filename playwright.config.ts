import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  // The app takes a single-instance lock, so two suites launching Electron
  // concurrently would make the second instance quit immediately. Run serially.
  workers: 1,
  fullyParallel: false,
  use: {
    trace: 'on-first-retry',
  },
});
