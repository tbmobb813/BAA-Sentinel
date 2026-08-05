"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getCurrentOrgContext } from "@/lib/data/org";
import { PLANS } from "@/lib/billing/plans";
import type { OrgPlan } from "@prisma/client";

export async function createCheckoutSession(plan: OrgPlan) {
  if (!stripe) throw new Error("Stripe is not configured");

  const { organization } = await getCurrentOrgContext();
  const planConfig = PLANS.find((p) => p.id === plan);

  if (!planConfig?.priceId) {
    throw new Error(`Missing Stripe price ID for the ${plan} plan`);
  }

  const user = await currentUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    customer: organization.stripeCustomerId ?? undefined,
    customer_email: organization.stripeCustomerId
      ? undefined
      : user?.emailAddresses[0]?.emailAddress,
    client_reference_id: organization.id,
    subscription_data: { metadata: { organizationId: organization.id } },
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=cancelled`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  redirect(session.url);
}

export async function createBillingPortalSession() {
  if (!stripe) throw new Error("Stripe is not configured");

  const { organization } = await getCurrentOrgContext();
  if (!organization.stripeCustomerId) {
    throw new Error("This organization has no billing account yet");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });

  redirect(session.url);
}
