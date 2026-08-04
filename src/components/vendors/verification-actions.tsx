"use client";

import { useTransition } from "react";
import { startVerificationCycle } from "@/lib/actions/vendors";
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
