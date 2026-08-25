// Next.js's App Router instrumentation hook (stable since v15). register()
// runs once per server instance, before it accepts requests; onRequestError
// is called by Next itself for any error escaping a Server Component,
// Route Handler, Server Action, or Proxy (proxy.ts) -- this is what gives
// Sentry visibility into failures without wrapping every entry point by
// hand. It does NOT see errors already caught in a try/catch (those need
// an explicit Sentry.captureException call at the catch site).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  ...args: Parameters<(typeof import("@sentry/nextjs"))["captureRequestError"]>
) {
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(...args);
}
