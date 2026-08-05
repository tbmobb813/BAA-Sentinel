"use client";

import { useState, useTransition } from "react";
import { startVerificationCycle, rescoreVendorRisk } from "@/lib/actions/vendors";
import { Button } from "@/components/ui/button";

export function StartVerificationButton({ vendorId }: { vendorId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => startTransition(() => startVerificationCycle(vendorId))}
    >
      {pending ? "Sending…" : "Send verification request"}
    </Button>
  );
}

export function RescoreButton({ vendorId }: { vendorId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await rescoreVendorRisk(vendorId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to score vendor risk");
      }
    });
  };

  return (
    <div className="space-y-1">
      <Button variant="outline" size="sm" disabled={pending} onClick={handleClick}>
        {pending ? "Scoring…" : "Run risk scoring"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
