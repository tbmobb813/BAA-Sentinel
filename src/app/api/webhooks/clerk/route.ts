import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Keeps Postgres in sync with Clerk (the source of truth for identity/org
// membership). Requires CLERK_WEBHOOK_SIGNING_SECRET and a publicly
// reachable URL registered in the Clerk dashboard -- see
// src/lib/data/org.ts for the lazy-sync fallback used when this isn't
// wired up (e.g. local dev).
export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const { id, email_addresses, first_name, last_name } = event.data;
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;
      await prisma.user.upsert({
        where: { id },
        create: { id, email: email_addresses[0]?.email_address ?? "", name },
        update: { email: email_addresses[0]?.email_address ?? "", name },
      });
      break;
    }
    case "user.deleted": {
      if (event.data.id) {
        await prisma.user.deleteMany({ where: { id: event.data.id } });
      }
      break;
    }
    case "organization.created":
    case "organization.updated": {
      const { id, name } = event.data;
      await prisma.organization.upsert({
        where: { id },
        create: { id, name },
        update: { name },
      });
      break;
    }
    case "organization.deleted": {
      if (event.data.id) {
        await prisma.organization.deleteMany({ where: { id: event.data.id } });
      }
      break;
    }
    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const { organization, public_user_data, role } = event.data;
      if (public_user_data?.user_id) {
        await prisma.organizationUser.upsert({
          where: {
            userId_organizationId: {
              userId: public_user_data.user_id,
              organizationId: organization.id,
            },
          },
          create: {
            userId: public_user_data.user_id,
            organizationId: organization.id,
            role,
          },
          update: { role },
        });
      }
      break;
    }
    case "organizationMembership.deleted": {
      const { organization, public_user_data } = event.data;
      if (public_user_data?.user_id) {
        await prisma.organizationUser.deleteMany({
          where: {
            userId: public_user_data.user_id,
            organizationId: organization.id,
          },
        });
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
