import "server-only";

import { prisma } from "@/lib/prisma";
import { sendVerificationRequestEmail } from "@/lib/email/verification";

// Invoked by src/app/api/cron/reminders/route.ts (Vercel Cron). Kept as a
// standalone function rather than inlined in the route handler so the
// route stays a thin auth-and-dispatch wrapper. Takes a plain logger
// callback rather than a hard dependency on any particular logging setup.

// Escalation checkpoints from the product pitch: nudge at 60/30/7 days out,
// then flip to overdue once the due date passes. reminderCount tracks how
// many checkpoints have fired so a run that finds nothing new to do is a
// no-op, not a re-send. That alone is only idempotent *across* separate
// runs -- it does nothing to stop two overlapping invocations (a manual
// re-run from the Vercel dashboard racing the scheduled one, a retry)
// from both reading the same reminderCount and both sending. Both
// branches below claim their row with a compare-and-swap updateMany
// (matching the value just read) before doing anything externally
// visible, and skip if the claim misses -- that's what actually makes a
// concurrent invocation safe, not just the reminderCount field existing.
const CHECKPOINTS: { withinDays: number; reminderNumber: 1 | 2 | 3 }[] = [
  { withinDays: 7, reminderNumber: 3 },
  { withinDays: 30, reminderNumber: 2 },
  { withinDays: 60, reminderNumber: 1 },
];

export async function processVerificationReminders(log: (message: string) => void = () => {}) {
  const now = new Date();

  // Piggybacks the rate-limit table's cleanup on this already-daily job
  // rather than adding a second scheduled task for a one-line prune.
  const { count: prunedRateLimitHits } = await prisma.rateLimitHit.deleteMany({
    where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
  if (prunedRateLimitHits > 0) {
    log(`Pruned ${prunedRateLimitHits} expired rate-limit record(s)`);
  }

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
      // Claim-then-mutate, atomically: the CAS on status guards against a
      // concurrent scheduler already having expired this request, and the
      // vendor update only happens if this run actually won the claim.
      const didExpire = await prisma.$transaction(async (tx) => {
        const { count } = await tx.verificationRequest.updateMany({
          where: { id: request.id, status: request.status },
          data: { status: "EXPIRED" },
        });
        if (count === 0) return false;

        await tx.vendor.update({
          where: { id: request.vendorId },
          data: { status: "OVERDUE" },
        });
        return true;
      });

      if (didExpire) markedOverdue++;
      continue;
    }

    const checkpoint = CHECKPOINTS.find((c) => daysUntilDue <= c.withinDays);
    if (!checkpoint || checkpoint.reminderNumber <= request.reminderCount) continue;

    // Claim the checkpoint before sending: if a concurrent run already
    // advanced reminderCount past what we just read, this is a no-op and we
    // skip the send. (Tradeoff: if the email send below fails after a
    // successful claim, the checkpoint is still marked used and won't be
    // retried until the next one -- preferred over the alternative of
    // sending first, which reopens the double-send race this exists to
    // close.)
    const { count } = await prisma.verificationRequest.updateMany({
      where: { id: request.id, reminderCount: request.reminderCount },
      data: { reminderCount: checkpoint.reminderNumber, lastReminderAt: now },
    });
    if (count === 0) continue;

    await sendVerificationRequestEmail({
      to: request.vendor.contactEmail,
      vendorName: request.vendor.name,
      token: request.token,
      reminderNumber: checkpoint.reminderNumber,
    });
    remindersSent++;
  }

  log(`Sent ${remindersSent} reminder(s), marked ${markedOverdue} vendor(s) overdue`);

  return { checked: outstanding.length, remindersSent, markedOverdue };
}
