import "server-only";

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type ReminderStage = 1 | 2 | 3;

const STAGE_COPY: Record<ReminderStage, { subject: string; urgency: string }> = {
  1: {
    subject: "Reminder: Annual BAA verification due in 60 days",
    urgency:
      "Your organization's annual HIPAA safeguard verification is due in about 60 days.",
  },
  2: {
    subject: "Action needed: BAA verification due in 30 days",
    urgency:
      "Your annual HIPAA safeguard verification is due in about 30 days and hasn't been completed yet.",
  },
  3: {
    subject: "Final notice: BAA verification due in 7 days",
    urgency:
      "This is a final reminder -- your annual HIPAA safeguard verification is due in about 7 days. " +
      "If it isn't completed by the due date, this vendor relationship will be flagged overdue.",
  },
};

export async function sendReminderEmail({
  to,
  vendorName,
  token,
  stage,
}: {
  to: string;
  vendorName: string;
  token: string;
  stage: ReminderStage;
}) {
  const verifyUrl = `${APP_URL}/verify/${token}`;
  const { subject, urgency } = STAGE_COPY[stage];

  if (!resend) {
    // Scaffold/dev fallback: no RESEND_API_KEY configured yet. Log instead
    // of throwing so the cascade stays testable locally.
    console.log(
      `[email:dev] Reminder (stage ${stage}) for "${vendorName}" -> ${to}\n${verifyUrl}`,
    );
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BAA Sentinel <onboarding@resend.dev>",
    to,
    subject: `${subject}: ${vendorName}`,
    text: `Hi,\n\n${urgency}\n\nPlease confirm your organization's current HIPAA safeguards by completing this short verification form:\n\n${verifyUrl}\n\nThanks,\nBAA Sentinel`,
  });
}
