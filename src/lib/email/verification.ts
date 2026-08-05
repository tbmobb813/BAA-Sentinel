import "server-only";

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendVerificationRequestEmail({
  to,
  vendorName,
  token,
  reminderNumber,
}: {
  to: string;
  vendorName: string;
  token: string;
  /** Set on reminder sends (1st/2nd/3rd nudge) to adjust subject/copy; omit for the initial request. */
  reminderNumber?: 1 | 2 | 3;
}) {
  const verifyUrl = `${APP_URL}/verify/${token}`;
  const isReminder = reminderNumber !== undefined;
  const subject = isReminder
    ? `Reminder ${reminderNumber}/3: Annual BAA verification request for ${vendorName}`
    : `Annual BAA verification request: ${vendorName}`;
  const intro = isReminder
    ? "This is a reminder that we're still waiting on your response to our annual BAA verification request."
    : "Please confirm your organization's current HIPAA safeguards by completing this short verification form:";

  if (!resend) {
    // Scaffold/dev fallback: no RESEND_API_KEY configured yet. Log instead
    // of throwing so the verification-cycle flow stays testable locally.
    console.log(
      `[email:dev] ${subject} -> ${to}\n${verifyUrl}`,
    );
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BAA Sentinel <onboarding@resend.dev>",
    to,
    subject,
    text: `Hi,\n\n${intro}\n\n${verifyUrl}\n\nThis link is unique to this verification cycle and will expire in one year.\n\nThanks,\nBAA Sentinel`,
  });
}
