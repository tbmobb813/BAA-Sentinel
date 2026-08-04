"use client";

import { useTransition } from "react";
import { startVerificationCycle, markVerified } from "@/lib/actions/vendors";
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

export function MarkVerifiedButton({
  vendorId,
  cycleId,
}: {
  vendorId: string;
  cycleId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => markVerified(vendorId, cycleId))}
    >
      {pending ? "Saving…" : "Mark verified"}
    </Button>
  );
}
