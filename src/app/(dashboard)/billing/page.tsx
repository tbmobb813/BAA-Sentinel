import { getCurrentOrgContext } from "@/lib/data/org";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/billing/plans";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function BillingPage() {
  const { organization, vendorLimit } = await getCurrentOrgContext();
  const vendorCount = await prisma.vendor.count({
    where: { organizationId: organization.id },
  });
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  // Gate on the *subscription*, not the customer id: a canceled org keeps
  // its Stripe customer forever (the webhook only clears
  // stripeSubscriptionId on cancellation), so gating on customerId would
  // permanently block resubscribing via Checkout with no way back in.
  const hasActiveSubscription = Boolean(organization.stripeSubscriptionId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            {vendorCount} / {vendorLimit === Infinity ? "∞" : vendorLimit} vendors on
            the {organization.plan} plan
          </p>
        </div>
        {organization.stripeCustomerId ? <ManageBillingButton /> : null}
      </div>

      {!stripeConfigured ? (
        <p className="text-sm text-muted-foreground">
          Stripe isn&rsquo;t configured in this environment yet
          (<code>STRIPE_SECRET_KEY</code> is unset) — checkout is disabled.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === organization.plan;
          return (
            <Card key={plan.id} className={isCurrent ? "border-primary" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent ? <Badge>Current plan</Badge> : null}
                </CardTitle>
                <CardDescription>{plan.price}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? null : hasActiveSubscription ? (
                  // Changing plans while already subscribed must go through
                  // the Customer Portal (which swaps the price on the
                  // existing subscription with correct proration) -- a
                  // second Checkout Session here would create a second,
                  // independently-billed subscription instead of an
                  // upgrade/downgrade.
                  <p className="text-sm text-muted-foreground">
                    Switch plans from Manage billing above.
                  </p>
                ) : (
                  <CheckoutButton
                    plan={plan.id}
                    disabled={!stripeConfigured || !plan.priceId}
                  />
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
