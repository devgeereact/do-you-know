/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_URL: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_CPANEL_API_URL: string;
  readonly VITE_IMAGEKIT_URL_ENDPOINT: string;
  readonly VITE_IMAGEKIT_PUBLIC_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
