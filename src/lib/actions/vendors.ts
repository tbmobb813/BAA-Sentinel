"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentOrgContext } from "@/lib/data/org";
import { sendVerificationRequestEmail } from "@/lib/email/verification";
import { scoreVendorRisk } from "@/lib/ai/risk-scoring";
import { createVendorSchema } from "@/lib/validation/vendor";

export type ActionState = { error?: string } | undefined;

export async function createVendor(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createVendorSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { organizationId, vendorLimit } = await getCurrentOrgContext();
  const vendorCount = await prisma.vendor.count({ where: { organizationId } });

  if (vendorCount >= vendorLimit) {
    return {
      error: `You've reached your plan's limit of ${vendorLimit} vendors. Upgrade to add more.`,
    };
  }

  await prisma.vendor.create({
    data: { organizationId, ...parsed.data },
  });

  revalidatePath("/vendors");
  redirect("/vendors");
}

const oneYearFromNow = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

export async function startVerificationCycle(vendorId: string) {
  const { organizationId } = await getCurrentOrgContext();

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId },
  });

  if (!vendor) throw new Error("Vendor not found");

  const dueDate = oneYearFromNow();

  const request = await prisma.verificationRequest.create({
    data: {
      vendorId,
      token: randomUUID(),
      dueDate,
      expiresAt: dueDate,
    },
  });

  await sendVerificationRequestEmail({
    to: vendor.contactEmail,
    vendorName: vendor.name,
    token: request.token,
  });

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { status: "PENDING" },
  });

  revalidatePath(`/vendors/${vendorId}`);
}

export async function rescoreVendorRisk(vendorId: string) {
  const { organizationId, organization } = await getCurrentOrgContext();

  if (organization.plan === "STARTER") {
    throw new Error("AI risk scoring is a Growth/MSP plan feature");
  }

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId },
  });
  if (!vendor) throw new Error("Vendor not found");

  const latestCompleted = await prisma.verificationRequest.findFirst({
    where: { vendorId, status: "COMPLETED", responseSummary: { not: null } },
    orderBy: { completedAt: "desc" },
  });

  if (!latestCompleted?.responseSummary) {
    throw new Error("No completed verification response to score yet");
  }

  const assessment = await scoreVendorRisk({
    vendorName: vendor.name,
    responseSummary: latestCompleted.responseSummary,
  });

  if (!assessment) {
    throw new Error("Risk scoring is not configured (ANTHROPIC_API_KEY unset)");
  }

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { riskScore: assessment.score, riskRationale: assessment.rationale },
  });

  revalidatePath(`/vendors/${vendorId}`);
}
