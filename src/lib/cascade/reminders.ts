import "server-only";

import { prisma } from "@/lib/prisma";
import { sendReminderEmail, type ReminderStage } from "@/lib/email/reminders";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Escalation thresholds: at each one, the *previous* reminderCount must
// still be at its prior value (checked via CAS update) for the reminder to
// fire -- this makes re-running the cascade (cron retry, manual trigger)
// safe against sending the same stage twice.
const THRESHOLDS: { daysUntilDue: number; fromCount: number; stage: ReminderStage }[] = [
  { daysUntilDue: 60, fromCount: 0, stage: 1 },
  { daysUntilDue: 30, fromCount: 1, stage: 2 },
  { daysUntilDue: 7, fromCount: 2, stage: 3 },
];

export type CascadeResult = {
  sent: number;
  expired: number;
  errors: { requestId: string; message: string }[];
};

export async function runReminderCascade(): Promise<CascadeResult> {
  const now = new Date();
  const result: CascadeResult = { sent: 0, expired: 0, errors: [] };

  const openRequests = await prisma.verificationRequest.findMany({
    where: { status: { in: ["SENT", "OPENED"] }, completedAt: null },
    include: { vendor: true },
  });

  for (const request of openRequests) {
    try {
      // Past due: expire the link and flag the vendor, regardless of how
      // many reminders had already gone out.
      if (request.dueDate < now) {
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
        result.expired += 1;
        continue;
      }

      const daysUntilDue = (request.dueDate.getTime() - now.getTime()) / MS_PER_DAY;

      const threshold = THRESHOLDS.find(
        (t) => daysUntilDue <= t.daysUntilDue && request.reminderCount === t.fromCount,
      );
      if (!threshold) continue;

      const cas = await prisma.verificationRequest.updateMany({
        where: { id: request.id, reminderCount: threshold.fromCount },
        data: { reminderCount: threshold.fromCount + 1, lastReminderAt: now },
      });
      // Someone else (a concurrent run) already advanced this request --
      // skip sending to avoid a duplicate email.
      if (cas.count === 0) continue;

      await sendReminderEmail({
        to: request.vendor.contactEmail,
        vendorName: request.vendor.name,
        token: request.token,
        stage: threshold.stage,
      });

      if (threshold.stage === 2 && request.vendor.status === "PENDING") {
        await prisma.vendor.update({
          where: { id: request.vendorId },
          data: { status: "AT_RISK" },
        });
      }

      result.sent += 1;
    } catch (err) {
      result.errors.push({
        requestId: request.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
