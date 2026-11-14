import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:18089',
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    reducedMotion: 'reduce',
    launchOptions: process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && cd .. && go run ./hack/browser-server',
    url: 'http://127.0.0.1:18089/readyz',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
