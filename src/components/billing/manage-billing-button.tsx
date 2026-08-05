"use client";

import { useTransition } from "react";
import { createBillingPortalSession } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => createBillingPortalSession())}
    >
      {pending ? "Loading…" : "Manage billing"}
    </Button>
  );
}
