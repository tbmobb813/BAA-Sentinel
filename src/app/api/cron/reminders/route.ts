import type { NextRequest } from "next/server";
import { processVerificationReminders } from "@/lib/reminders/process-verification-reminders";

// Backup for src/trigger/reminders.ts (the primary path). Scheduled a few
// hours after Trigger.dev's run (see vercel.json) so it acts as a genuine
// "catch what didn't run" pass rather than a simultaneous duplicate --
// processVerificationReminders is checkpoint-based and idempotent either
// way, but the offset keeps normal operation from doing the work twice.
// Vercel does not retry failed cron invocations, so this only helps if the
// scheduler itself fires; that's an accepted limitation of a backup that
// deliberately avoids depending on Trigger.dev's own infrastructure.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await processVerificationReminders((message) =>
    console.log(`[cron:reminders] ${message}`),
  );

  return Response.json(result);
}
