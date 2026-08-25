"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentOrgContext } from "@/lib/data/org";

const createBaaRecordSchema = z.object({
  vendorId: z.string().uuid(),
  fileUrl: z.string().url(),
  label: z.string().min(1),
  signedDate: z.string().optional(),
});

export async function createBaaRecord(input: {
  vendorId: string;
  fileUrl: string;
  label: string;
  signedDate?: string;
}) {
  const parsed = createBaaRecordSchema.parse(input);
  const { organizationId } = await getCurrentOrgContext();

  const vendor = await prisma.vendor.findFirst({
    where: { id: parsed.vendorId, organizationId },
  });
  if (!vendor) throw new Error("Vendor not found");

  await prisma.baaRecord.create({
    data: {
      vendorId: parsed.vendorId,
      fileUrl: parsed.fileUrl,
      signedDate: parsed.signedDate ? new Date(parsed.signedDate) : null,
    },
  });

  revalidatePath(`/vendors/${parsed.vendorId}`);
}
