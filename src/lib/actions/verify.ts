"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreVendorRisk } from "@/lib/ai/risk-scoring";

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

  const request = await prisma.verificationRequest.findUnique({
    where: { token },
    include: { vendor: { include: { organization: true } } },
  });

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

  // AI risk scoring is a Growth/MSP-tier feature and best-effort, scheduled
  // via after() rather than awaited here: this action is invoked by an
  // external, unauthenticated vendor filling out /verify/[token], and their
  // form submission shouldn't block on a Claude API round trip for a
  // feature that exists entirely for the covered entity's benefit. after()
  // runs this once the response has already been sent back to the vendor,
  // while still keeping the function alive until it resolves -- unlike a
  // bare un-awaited promise, which a serverless platform is free to kill
  // the moment the response returns.
  if (request.vendor.organization.plan !== "STARTER") {
    after(async () => {
      try {
        const assessment = await scoreVendorRisk({
          vendorName: request.vendor.name,
          responseSummary: summary,
        });
        if (assessment) {
          await prisma.vendor.update({
            where: { id: request.vendorId },
            data: { riskScore: assessment.score, riskRationale: assessment.rationale },
          });
        }
      } catch (error) {
        console.error("Risk scoring failed", error);
      }
    });
  }

  return { success: true };
}
