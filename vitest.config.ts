import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit and component tests only. Browser journeys live in tests/e2e (Playwright).
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    // Pin the public settings the code reads, so local machine settings cannot change results.
    env: { VITE_CPANEL_API_URL: '/api/v1', VITE_SENTRY_DSN: '' },
    restoreMocks: true,
    unstubGlobals: true,
  },
});
