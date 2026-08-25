"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Something went wrong loading billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
