import "server-only";

import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { VENDOR_LIMITS } from "@/lib/billing/plans";

// Clerk webhooks (organization.created, organizationMembership.created,
// etc. -- see src/app/api/webhooks/clerk/route.ts) are the source of truth
// for keeping Postgres in sync with Clerk in production. They require a
// publicly reachable URL registered in the Clerk dashboard, which most dev
// environments don't have, so this eagerly upserts the local mirror rows
// (user, organization, membership role) on every call as a bootstrap
// fallback -- this is what keeps name/role changes made in Clerk visible
// here without a working webhook. The tradeoff is an extra Clerk API call
// and three upserts on every request that touches org context; if that
// becomes a hot path, consider caching or falling back to lazy sync once
// webhooks can be relied on.
export async function getCurrentOrgContext() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");

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

  const organization = await prisma.organization.upsert({
    where: { id: orgId },
    create: { id: orgId, name: clerkOrg.name },
    update: { name: clerkOrg.name },
  });

  await prisma.organizationUser.upsert({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    create: { userId, organizationId: orgId, role: orgRole ?? "org:member" },
    update: { role: orgRole ?? "org:member" },
  });

  return {
    userId,
    organizationId: orgId,
    role: orgRole,
    organization,
    vendorLimit: VENDOR_LIMITS[organization.plan] ?? VENDOR_LIMITS.STARTER,
  };
}
