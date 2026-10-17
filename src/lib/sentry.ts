import * as Sentry from '@sentry/react';
import { env } from '@/lib/env';

/** Initialize Sentry once at startup. No-ops if no DSN is configured. */
export function initSentry(): void {
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.mode,
    enabled: env.isProd, // don't spam Sentry from local dev
    // Children use this app: no session replay at all (ADR-005). The replay
    // integration is not loaded and both replay sample rates stay at zero.
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false, // no IP addresses, cookies or user details from the SDK
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
