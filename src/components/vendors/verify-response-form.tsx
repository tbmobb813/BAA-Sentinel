"use client";

import { useActionState } from "react";
import { submitVerificationResponse } from "@/lib/actions/verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VerifyResponseForm({ token }: { token: string }) {
  const action = submitVerificationResponse.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.success) {
    return (
      <p className="text-sm">
        Thanks — your response has been recorded for this verification cycle.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="summary">
          Describe the safeguards currently in place for data you handle on our
          behalf
        </Label>
        <Textarea id="summary" name="summary" rows={5} required />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit verification"}
      </Button>
    </form>
  );
}
