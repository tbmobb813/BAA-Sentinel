import "server-only";

import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { OrgPlan } from "@prisma/client";

const VENDOR_LIMITS: Record<OrgPlan, number> = {
  STARTER: 15,
  GROWTH: 50,
  MSP: Infinity,
};

// Clerk webhooks (organization.created, organizationMembership.created,
// etc. -- see src/app/api/webhooks/clerk/route.ts) are the source of truth
// for keeping Postgres in sync with Clerk in production. They require a
// publicly reachable URL registered in the Clerk dashboard, which most dev
// environments don't have, so this lazily creates the local mirror rows on
// first access as a bootstrap fallback. Once an org row exists, this trusts
// it (and the membership role on it) rather than re-syncing on every call --
// a role change made in Clerk without a working webhook will only show up
// here after the org's local row is deleted, which is an accepted MVP
// tradeoff, not a bug.
export async function getCurrentOrgContext() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");

  let organization = await prisma.organization.findUnique({ where: { id: orgId } });

  if (!organization) {
    const user = await currentUser();
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: user?.emailAddresses[0]?.emailAddress ?? "",
        name: user?.fullName,
      },
      update: {},
    });

    const client = await clerkClient();
    const clerkOrg = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    organization = await prisma.organization.create({
      data: { id: orgId, name: clerkOrg.name },
    });

    await prisma.organizationUser.upsert({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      create: { userId, organizationId: orgId, role: orgRole ?? "org:member" },
      update: { role: orgRole ?? "org:member" },
    });
  }

  return {
    userId,
    organizationId: orgId,
    role: orgRole,
    organization,
    vendorLimit: VENDOR_LIMITS[organization.plan] ?? VENDOR_LIMITS.STARTER,
  };
}
