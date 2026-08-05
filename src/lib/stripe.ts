import "server-only";

import Stripe from "stripe";

// Guarded the same way as src/lib/email/verification.ts's Resend client:
// billing pages/actions check for null and degrade to a "not configured"
// state instead of crashing when STRIPE_SECRET_KEY is unset.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
