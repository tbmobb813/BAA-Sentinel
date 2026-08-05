"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import type { OrgPlan } from "@prisma/client";

export function CheckoutButton({
  plan,
  disabled,
}: {
  plan: OrgPlan;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={disabled || pending}
      onClick={() => startTransition(() => createCheckoutSession(plan))}
    >
      {pending ? "Redirecting…" : "Subscribe"}
    </Button>
  );
}
