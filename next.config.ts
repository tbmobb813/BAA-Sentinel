import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Silent unless SENTRY_AUTH_TOKEN is set -- source maps just won't
  // upload without it, rather than failing the build.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
