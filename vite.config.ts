import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  // Absolute base: the app has its own docroot (docs/07-operations/DEPLOYMENT.md).
  // A relative base breaks deep links such as /q/<slug>, because assets would
  // resolve to /q/assets/... If the app ever moves to a subpath, set it here.
  base: '/',

  // src/lib/env.ts uses dynamic lookups, so expose only these public settings.
  // A mistakenly prefixed private key must never enter the browser bundle.
  envPrefix: [
    'VITE_APP_NAME',
    'VITE_APP_URL',
    'VITE_CLERK_PUBLISHABLE_KEY',
    'VITE_CPANEL_API_URL',
    'VITE_IMAGEKIT_URL_ENDPOINT',
    'VITE_IMAGEKIT_PUBLIC_KEY',
    'VITE_SENTRY_DSN',
    'VITE_POSTHOG_KEY',
    'VITE_POSTHOG_HOST',
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Dedicated port (block 20 in the dev-server registry). strictPort makes a clash
  // fail loudly instead of drifting to another port and breaking the API's allowed origins.
  server: { port: 5202, strictPort: true },
  preview: { port: 5202, strictPort: true },

  plugins: [
    react(),

    VitePWA({
      // 'generateSW' lets Workbox build the service worker for us.
      strategies: 'generateSW',
      registerType: 'prompt', // we surface our own update UI; never auto-reload
      injectRegister: null, // registration handled manually in src/main.tsx

      // Files pulled into the precache manifest (the "app shell"). Fonts are
      // self-hosted (@fontsource) so they precache with the bundle.
      includeAssets: ['favicon.svg', 'offline.html', 'icons/*.png'],

      manifest: {
        name: 'Do You Know',
        short_name: 'DoYouKnow',
        description:
          'Fun, fair quizzes for all ages: daily challenges, friend battles and school-subject practice.',
        theme_color: '#1570C2',
        background_color: '#EAF6FF',
        display: 'standalone',
        orientation: 'any', // never lock: play in portrait or landscape
        categories: ['education', 'games'],
        lang: 'en-GB',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Precache the shell so the SPA boots with no network.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Only Latin font subsets go in the offline cache; others load on demand.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,hebrew}-*.woff2'],
        // SPA navigations resolve to the precached index.html.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // wait for user to accept the update
        runtimeCaching: [
          {
            // ImageKit CDN — cache-first, images rarely change.
            urlPattern: /^https:\/\/ik\.imagekit\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagekit-media',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Public catalogue reads from the PHP API (categories, quizzes, tags, daily).
            // Network-first with a short fallback for offline browsing. Player routes
            // (/me, /attempts, /session) are never cached.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /^\/api\/v1\/(categories|quizzes|curriculum-tags|daily)(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'catalogue-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },

      devOptions: {
        enabled: false, // set true to debug the SW in `npm run dev`
      },
    }),
  ],

  build: {
    outDir: 'dist',
    sourcemap: true, // required for readable Sentry stack traces
    target: 'es2020',
    rollupOptions: {
      output: {
        // Split vendors so the app shell stays tiny and cache-stable.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
