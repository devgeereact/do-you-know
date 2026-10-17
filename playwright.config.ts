import { defineConfig } from '@playwright/test';
import { API_URL, WEB_ORIGIN, WEB_PORT } from './tests/e2e/support/env';

/**
 * Browser journeys. Global setup builds a disposable database and PHP API; the web server
 * below is plain `vite` on its own port (never 5202) pointed at that API.
 * See tests/e2e/README.md.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  use: {
    baseURL: WEB_ORIGIN,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  },
  webServer: {
    command: `npx vite --port ${WEB_PORT} --strictPort`,
    url: WEB_ORIGIN,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { VITE_CPANEL_API_URL: API_URL },
  },
  projects: [
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
  ],
});
