import { describe, expect, it, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    vendor: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getVendorsForOrg, getVendorsForExport, getVendorDetail } from "./vendors";

// No RLS in this schema -- every query here must filter by organizationId
// explicitly (see the comment in vendors.ts itself). These tests assert
// the query shape passed to Prisma, not real query results, which is what
// actually catches a future refactor accidentally dropping the filter.
describe("multi-tenant scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.vendor.findMany.mockResolvedValue([]);
    prismaMock.vendor.findFirst.mockResolvedValue(null);
  });

  it("getVendorsForOrg scopes by organizationId", async () => {
    await getVendorsForOrg("org_1");

    expect(prismaMock.vendor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org_1" } }),
    );
  });

  it("getVendorsForExport scopes by organizationId", async () => {
    await getVendorsForExport("org_1");

    expect(prismaMock.vendor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org_1" } }),
    );
  });

  it("getVendorDetail scopes by both vendorId and organizationId", async () => {
    await getVendorDetail("vendor_1", "org_1");

    expect(prismaMock.vendor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "vendor_1", organizationId: "org_1" } }),
    );
  });

  it("getVendorDetail returns null for a vendor Prisma didn't return (wrong org, or doesn't exist)", async () => {
    prismaMock.vendor.findFirst.mockResolvedValue(null);

    const result = await getVendorDetail("vendor_1", "org_2");

    expect(result).toBeNull();
  });
});
