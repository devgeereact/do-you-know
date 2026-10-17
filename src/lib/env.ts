/**
 * Central, validated access to environment variables.
 * Nothing else in the app should read `import.meta.env` directly.
 */

interface AppEnv {
  appName: string;
  appUrl: string;
  clerkPublishableKey: string;
  apiUrl: string; // PHP API base, same origin in production
  imagekitUrlEndpoint: string;
  imagekitPublicKey: string;
  sentryDsn: string;
  contactEmail: string; // optional: empty hides the mailto link
  posthogKey: string; // optional: empty disables analytics
  posthogHost: string;
  isProd: boolean;
  mode: string;
}

function read(key: keyof ImportMetaEnv, fallback = ''): string {
  // vite/client augments ImportMetaEnv with an `any` index signature,
  // so funnel the lookup through `unknown` and narrow it safely.
  const value: unknown = import.meta.env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Warn loudly (once) in dev if a critical key is missing. */
function requireKeys(keys: (keyof ImportMetaEnv)[]): void {
  if (import.meta.env.PROD) return;
  const missing = keys.filter((k) => read(k).length === 0);
  if (missing.length > 0) {
    console.warn(
      `[env] Missing env vars: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill them in.',
    );
  }
}

requireKeys(['VITE_CPANEL_API_URL']);

export const env: AppEnv = {
  appName: read('VITE_APP_NAME', 'Do You Know'),
  appUrl: read('VITE_APP_URL'),
  clerkPublishableKey: read('VITE_CLERK_PUBLISHABLE_KEY'),
  apiUrl: read('VITE_CPANEL_API_URL', '/api/v1'),
  imagekitUrlEndpoint: read('VITE_IMAGEKIT_URL_ENDPOINT'),
  imagekitPublicKey: read('VITE_IMAGEKIT_PUBLIC_KEY'),
  sentryDsn: read('VITE_SENTRY_DSN'),
  contactEmail: read('VITE_CONTACT_EMAIL', 'hello@doyouknow.soulrefresh.net').trim(),
  posthogKey: read('VITE_POSTHOG_KEY'),
  posthogHost: read('VITE_POSTHOG_HOST', 'https://eu.i.posthog.com'),
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
};
