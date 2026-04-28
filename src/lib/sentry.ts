// Sentry error tracking.
// Activates automatically when VITE_SENTRY_DSN is set in .env.
// Safe no-op when the env var is missing.

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE;

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  });
}

export const isSentryEnabled = () => Boolean(DSN);
export { Sentry };
