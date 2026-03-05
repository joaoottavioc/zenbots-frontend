import * as Sentry from "@sentry/react";

let initialized = false;

/**
 * Initializes error reporting. When NEXT_PUBLIC_SENTRY_DSN is set,
 * configures Sentry for browser-side error capturing. Otherwise,
 * errors are only logged to the console.
 */
export function initErrorReporting(): void {
  if (initialized) return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  }

  initialized = true;
}

/**
 * Reports an error. If Sentry is initialized, sends the error to Sentry.
 * Always logs to console.error as a fallback.
 */
export function reportError(
  error: Error,
  context?: Record<string, string>
): void {
  console.error("[ErrorReport]", error, context);

  if (Sentry.isInitialized()) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/** Resets initialization state (for testing only). */
export function _resetForTesting(): void {
  initialized = false;
}
