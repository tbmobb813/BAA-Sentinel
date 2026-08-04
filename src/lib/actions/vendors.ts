"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentOrgContext } from "@/lib/data/org";
import { sendVerificationRequestEmail } from "@/lib/email/verification";

const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Enter a valid contact email"),
});

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
