import * as Sentry from "@sentry/nextjs";

// Sentry.init with an empty/undefined dsn is a documented no-op, so this is
// safe to run in local dev or any environment without a Sentry project
// configured yet -- no null-guard needed, unlike the Stripe/Resend/
// Anthropic clients elsewhere in this app.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});

// Required by the SDK to attach breadcrumbs/context to client-side
// navigations; without it, an error on a page reached via client-side
// routing loses the "how did they get here" trail.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
