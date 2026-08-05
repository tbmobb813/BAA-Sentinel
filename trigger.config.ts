import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // Replace with your project's ref from the Trigger.dev dashboard
  // (Project Settings) after creating an account -- see README.
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_replace_me",
  runtime: "node",
  // Generous ceiling for a sequential sweep over outstanding requests --
  // MVP-scale volume won't come close to this.
  maxDuration: 300,
  // Auto-detects task files under any directory literally named `trigger`
  // (src/trigger/), so no `dirs` override is needed.
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },
});
