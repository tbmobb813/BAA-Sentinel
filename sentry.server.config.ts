import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Pure error tracking for now -- no tracing/performance monitoring,
  // which would add cost and noise disproportionate to current traffic.
  tracesSampleRate: 0,
});
