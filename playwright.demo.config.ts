import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'demo-visible-journey.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 120_000,
  use: {
    browserName: 'chromium',
    headless: false,
    launchOptions: { slowMo: 400 },
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
});
