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
}: {
  to: string;
  vendorName: string;
  token: string;
}) {
  const verifyUrl = `${APP_URL}/verify/${token}`;

  if (!resend) {
    // Scaffold/dev fallback: no RESEND_API_KEY configured yet. Log instead
    // of throwing so the verification-cycle flow stays testable locally.
    console.log(
      `[email:dev] Verification request for "${vendorName}" -> ${to}\n${verifyUrl}`,
    );
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BAA Sentinel <onboarding@resend.dev>",
    to,
    subject: `Annual BAA verification request: ${vendorName}`,
    text: `Hi,\n\nPlease confirm your organization's current HIPAA safeguards by completing this short verification form:\n\n${verifyUrl}\n\nThis link is unique to this verification cycle and will expire in one year.\n\nThanks,\nBAA Sentinel`,
  });
}
