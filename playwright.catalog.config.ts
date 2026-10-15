import { defineConfig } from '@playwright/test';
import path from 'path';

const root = process.env.CATALOG_E2E_ROOT;
if (!root || !root.endsWith('catalog-role-' + process.env.CATALOG_E2E_RUN_ID)) {
  throw new Error('Run this configuration through the isolated catalog runner');
}
export default defineConfig({
  testDir: './e2e',
  testMatch: 'catalog-role-user-creation.spec.ts',
  outputDir: path.join(root, 'browser-output'),
  reporter: [['line']],
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } }],
});
