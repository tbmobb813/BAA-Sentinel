import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PRICE_TO_PLAN } from "@/lib/billing/plans";
import type { Prisma } from "@prisma/client";

// Applies a subscription-derived update only if it belongs to the
// subscription the org currently has on record (or the org has none yet).
// Without this, a stale/out-of-order event for a subscription that's since
// been superseded -- e.g. two concurrent subscriptions from a since-fixed
// UI bug, or events simply arriving out of order -- could clobber newer
// state instead of being a no-op.
export async function applyIfCurrentSubscription(
  organizationId: string,
  subscriptionId: string,
  data: Prisma.OrganizationUpdateInput,
) {
  const { count } = await prisma.organization.updateMany({
    where: {
      id: organizationId,
      OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: subscriptionId }],
    },
    data,
  });

  if (count === 0) {
    Sentry.captureException(
      new Error(
        `Ignored Stripe event for subscription ${subscriptionId} -- ` +
          `organization ${organizationId} is tracking a different subscription.`,
      ),
      { extra: { organizationId, subscriptionId } },
    );
  }
}

// Keeps Organization.plan/stripeCustomerId/stripeSubscriptionId in sync
// with Stripe. Requires STRIPE_WEBHOOK_SECRET and a publicly reachable URL
// (or `stripe listen --forward-to` for local dev) registered with Stripe --
// see README for setup.
export async function POST(request: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe is not configured", { status: 400 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const organizationId = session.client_reference_id;

      if (organizationId && session.customer && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;

        await applyIfCurrentSubscription(organizationId, subscription.id, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          ...(plan ? { plan } : {}),
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const organizationId = subscription.metadata.organizationId;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;

      if (organizationId && plan) {
        await applyIfCurrentSubscription(organizationId, subscription.id, {
          plan,
          stripeSubscriptionId: subscription.id,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const organizationId = subscription.metadata.organizationId;

      if (organizationId) {
        // No "canceled" plan tier exists -- revert to the entry-level paid
        // tier's vendor limit rather than inventing a suspended state.
        await applyIfCurrentSubscription(organizationId, subscription.id, {
          plan: "STARTER",
          stripeSubscriptionId: null,
        });
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
