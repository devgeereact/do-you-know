import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  // Dedicated cPanel docroot. Absolute assets survive direct SPA deep links.
  base: '/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Dedicated port (block 20 in the dev-server registry). strictPort makes a clash
  // fail loudly instead of drifting to another port and breaking Supabase redirects.
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
        scope: './',
        start_url: './',
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
            // Supabase REST reads (published quizzes, categories) — network-first with
            // short fallback. Game RPCs are POSTs and are never cached.
            urlPattern: ({ url }) => {
              const trusted =
                url.hostname.endsWith('.supabase.co') ||
                (url.hostname === '127.0.0.1' && url.port === '55321');
              if (!trusted) return false;
              if (url.pathname === '/rest/v1/categories')
                return url.searchParams.get('is_active') === 'eq.true';
              if (url.pathname === '/rest/v1/curriculum_tags') return true;
              if (
                url.pathname !== '/rest/v1/quizzes' ||
                url.searchParams.get('status') !== 'eq.published'
              )
                return false;
              return (
                url.searchParams.get('select') ===
                'id,slug,title,intro,category_id,difficulty,age_min,age_max,curriculum_tags,cover_image_url,question_count,time_limit_seconds,is_ranked'
              );
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'public-catalogue-v1',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
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
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
