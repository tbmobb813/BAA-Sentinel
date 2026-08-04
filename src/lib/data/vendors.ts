import "server-only";

import { prisma } from "@/lib/prisma";

// Prisma has no equivalent to Supabase's RLS -- every query here must
// filter by organizationId explicitly, or a guessed/leaked vendor UUID
// would leak across tenants.

export async function getVendorsForOrg(organizationId: string) {
  return prisma.vendor.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      requests: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getVendorDetail(vendorId: string, organizationId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId },
    include: {
      requests: { orderBy: { sentAt: "desc" } },
      baaRecords: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!vendor) return null;
  return vendor;
}
