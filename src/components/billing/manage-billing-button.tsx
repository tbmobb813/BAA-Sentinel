"use client";

import { useState, useTransition } from "react";
import { createBillingPortalSession } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createBillingPortalSession();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open billing portal.");
      }
    });
  };

  return (
    <div className="space-y-2 text-right">
      <Button variant="outline" disabled={pending} onClick={handleClick}>
        {pending ? "Loading…" : "Manage billing"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
