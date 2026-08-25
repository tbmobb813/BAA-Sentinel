"use client";

import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createCheckoutSession(plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start checkout.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={disabled || pending} onClick={handleClick}>
        {pending ? "Redirecting…" : "Subscribe"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
