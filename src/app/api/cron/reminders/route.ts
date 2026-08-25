import type { NextRequest } from "next/server";
import { processVerificationReminders } from "@/lib/reminders/process-verification-reminders";

// Daily reminder-cascade sweep, scheduled via vercel.json. Vercel does not
// retry failed cron invocations, so a failure here is silent until the
// next day's run -- acceptable for day-granularity due-date checkpoints,
// but worth knowing if this ever needs stronger delivery guarantees.
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
