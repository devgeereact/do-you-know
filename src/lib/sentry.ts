import * as Sentry from '@sentry/react';
import { env } from '@/lib/env';

/**
 * Initialize Sentry once at startup. No-ops if no DSN is configured.
 * Children use this app, so error reports carry no personal data: no session replay
 * (it records what a player sees and does), and no IP address or other default PII.
 */
export function initSentry(): void {
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.mode,
    enabled: env.isProd, // don't spam Sentry from local dev
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
  });
}

/** Report a handled error with optional context. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!env.sentryDsn) {
    console.error(error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
