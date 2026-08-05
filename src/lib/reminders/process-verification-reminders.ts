import "server-only";

import { prisma } from "@/lib/prisma";
import { sendVerificationRequestEmail } from "@/lib/email/verification";

// Shared by src/trigger/reminders.ts (primary, via Trigger.dev's scheduler)
// and src/app/api/cron/reminders/route.ts (backup, via Vercel Cron) so both
// triggers run identical logic rather than two copies that could drift.
// Takes a plain logger callback instead of importing @trigger.dev/sdk's
// logger directly, so the Vercel Cron path doesn't need to pull in the
// whole Trigger.dev SDK just to log.

// Escalation checkpoints from the product pitch: nudge at 60/30/7 days out,
// then flip to overdue once the due date passes. reminderCount tracks how
// many checkpoints have fired so a run that finds nothing new to do is a
// no-op, not a re-send -- this idempotency is also what makes it safe for
// two independent schedulers (Trigger.dev and the Vercel Cron backup) to
// both process the same outstanding requests without double-sending.
const CHECKPOINTS: { withinDays: number; reminderNumber: 1 | 2 | 3 }[] = [
  { withinDays: 7, reminderNumber: 3 },
  { withinDays: 30, reminderNumber: 2 },
  { withinDays: 60, reminderNumber: 1 },
];

export async function processVerificationReminders(log: (message: string) => void = () => {}) {
  const now = new Date();

  const outstanding = await prisma.verificationRequest.findMany({
    where: { status: { in: ["SENT", "OPENED"] } },
    include: { vendor: true },
  });

  log(`Found ${outstanding.length} outstanding verification request(s)`);

  let remindersSent = 0;
  let markedOverdue = 0;

  for (const request of outstanding) {
    const daysUntilDue = Math.ceil(
      (request.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilDue <= 0) {
      await prisma.$transaction([
        prisma.verificationRequest.update({
          where: { id: request.id },
          data: { status: "EXPIRED" },
        }),
        prisma.vendor.update({
          where: { id: request.vendorId },
          data: { status: "OVERDUE" },
        }),
      ]);
      markedOverdue++;
      continue;
    }

    const checkpoint = CHECKPOINTS.find((c) => daysUntilDue <= c.withinDays);
    if (!checkpoint || checkpoint.reminderNumber <= request.reminderCount) continue;

    await sendVerificationRequestEmail({
      to: request.vendor.contactEmail,
      vendorName: request.vendor.name,
      token: request.token,
      reminderNumber: checkpoint.reminderNumber,
    });

    await prisma.verificationRequest.update({
      where: { id: request.id },
      data: { reminderCount: checkpoint.reminderNumber, lastReminderAt: now },
    });
    remindersSent++;
  }

  log(`Sent ${remindersSent} reminder(s), marked ${markedOverdue} vendor(s) overdue`);

  return { checked: outstanding.length, remindersSent, markedOverdue };
}
