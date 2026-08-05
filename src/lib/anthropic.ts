import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Guarded the same way as the Resend/Stripe clients: null when
// ANTHROPIC_API_KEY is unset, so callers degrade instead of crashing.
export const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
