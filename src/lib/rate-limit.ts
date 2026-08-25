import "server-only";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Fixed-window counter backed by Postgres rather than a dedicated
// rate-limiting service (Upstash, Vercel Firewall) -- at this app's scale
// the only unauthenticated surface (/verify/[token]) doesn't justify a new
// vendor account, and this way local dev and every deploy target behave
// identically. Fixed windows have known boundary-burst imprecision (a
// caller can get ~2x the nominal limit by timing requests around a window
// edge), which is fine for abuse deterrence and not something billing or
// security correctness depends on here.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSeconds * 1000)) * (windowSeconds * 1000),
  );

  const hit = await prisma.rateLimitHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart },
    update: { count: { increment: 1 } },
  });

  return hit.count <= limit;
}

// Vercel sets x-forwarded-for automatically; falls back to a shared key
// off-Vercel (local dev), which just means a shared limit in that case --
// acceptable since it's dev-only.
export async function getClientIp(): Promise<string> {
  const forwardedFor = (await headers()).get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}
