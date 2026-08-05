import type { OrgPlan } from "@prisma/client";

export interface PlanConfig {
  id: OrgPlan;
  name: string;
  price: string;
  vendorLimit: number;
  features: string[];
  priceId: string | undefined;
}

export const PLANS: PlanConfig[] = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$29/mo",
    vendorLimit: 15,
    features: [
      "Up to 15 vendors",
      "Automated annual verification emails",
      "Audit-ready export",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    id: "GROWTH",
    name: "Growth",
    price: "$59/mo",
    vendorLimit: 50,
    features: ["Up to 50 vendors", "AI risk scoring", "Everything in Starter"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
  },
  {
    id: "MSP",
    name: "MSP",
    price: "$99/mo",
    vendorLimit: Infinity,
    features: [
      "Unlimited vendors",
      "Multi-practice management for consultants/MSPs",
      "Everything in Growth",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_MSP_PRICE_ID,
  },
];

export const VENDOR_LIMITS: Record<OrgPlan, number> = Object.fromEntries(
  PLANS.map((plan) => [plan.id, plan.vendorLimit]),
) as Record<OrgPlan, number>;

// Built from PLANS rather than hand-maintained separately, so a price ID
// typo'd in .env only breaks that one plan's checkout button instead of
// silently mis-mapping an unrelated plan in the webhook handler.
export const PRICE_TO_PLAN: Record<string, OrgPlan> = Object.fromEntries(
  PLANS.filter((plan) => plan.priceId).map((plan) => [plan.priceId as string, plan.id]),
);
