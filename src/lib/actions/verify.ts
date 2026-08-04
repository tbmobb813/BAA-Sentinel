"use server";

import { prisma } from "@/lib/prisma";

export type VerifyActionState = { error?: string; success?: boolean } | undefined;

export async function submitVerificationResponse(
  token: string,
  _prevState: VerifyActionState,
  formData: FormData,
): Promise<VerifyActionState> {
  const summary = formData.get("summary");

  if (typeof summary !== "string" || summary.trim().length === 0) {
    return { error: "Please describe your current safeguards before submitting." };
  }

  const request = await prisma.verificationRequest.findUnique({ where: { token } });

  if (!request) {
    return { error: "This verification link is invalid." };
  }
  if (request.expiresAt < new Date()) {
    return { error: "This verification link has expired." };
  }
  if (request.status === "COMPLETED") {
    return { error: "This verification cycle has already been completed." };
  }

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { token },
      data: { status: "COMPLETED", completedAt: new Date(), responseSummary: summary },
    }),
    prisma.vendor.update({
      where: { id: request.vendorId },
      data: { status: "COMPLIANT" },
    }),
  ]);

  return { success: true };
}
