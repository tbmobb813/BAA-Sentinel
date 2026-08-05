import { schedules, logger } from "@trigger.dev/sdk";
import { processVerificationReminders } from "@/lib/reminders/process-verification-reminders";

// Primary reminder-cascade trigger. See src/app/api/cron/reminders/route.ts
// for the Vercel Cron backup, which runs the same shared logic a few hours
// later in case this doesn't fire (Trigger.dev outage, etc).
export const verificationReminders = schedules.task({
  id: "verification-reminders",
  // 13:00 UTC daily (~9am US Eastern) -- once/day is enough resolution for
  // day-granularity due-date checkpoints.
  cron: "0 13 * * *",
  run: async () => {
    return processVerificationReminders((message) => logger.info(message));
  },
});
