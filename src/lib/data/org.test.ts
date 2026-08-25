import { describe, expect, it, vi, beforeEach } from "vitest";

const { prismaMock, authMock, currentUserMock, getOrganizationMock, redirectMock } = vi.hoisted(
  () => ({
    prismaMock: {
      user: { upsert: vi.fn() },
      organization: { upsert: vi.fn() },
      organizationUser: { upsert: vi.fn() },
    },
    authMock: vi.fn(),
    currentUserMock: vi.fn(),
    getOrganizationMock: vi.fn(),
    redirectMock: vi.fn((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    }),
  }),
);

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
  clerkClient: async () => ({
    organizations: { getOrganization: getOrganizationMock },
  }),
}));

import { getCurrentOrgContext } from "./org";

describe("getCurrentOrgContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMock.mockResolvedValue({
      emailAddresses: [{ emailAddress: "a@example.com" }],
      fullName: "A User",
    });
    getOrganizationMock.mockResolvedValue({ name: "Acme Health" });
    prismaMock.user.upsert.mockResolvedValue({});
    prismaMock.organizationUser.upsert.mockResolvedValue({});
  });

  it("redirects to sign-in when there's no authenticated user", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    await expect(getCurrentOrgContext()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("redirects to onboarding when the user has no active org", async () => {
    authMock.mockResolvedValue({ userId: "user_1", orgId: null, orgRole: null });

    await expect(getCurrentOrgContext()).rejects.toThrow("REDIRECT:/onboarding");
  });

  it("scopes the Clerk-sync upserts to the current user and org", async () => {
    authMock.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
    prismaMock.organization.upsert.mockResolvedValue({ id: "org_1", plan: "STARTER" });

    await getCurrentOrgContext();

    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_1" } }),
    );
    expect(prismaMock.organization.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "org_1" } }),
    );
    expect(prismaMock.organizationUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_organizationId: { userId: "user_1", organizationId: "org_1" } },
      }),
    );
  });

  it.each([
    ["STARTER", 15],
    ["GROWTH", 50],
    ["MSP", Infinity],
  ])("resolves vendorLimit for the %s plan", async (plan, expectedLimit) => {
    authMock.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
    prismaMock.organization.upsert.mockResolvedValue({ id: "org_1", plan });

    const { vendorLimit } = await getCurrentOrgContext();

    expect(vendorLimit).toBe(expectedLimit);
  });
});
