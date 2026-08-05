# BAA Sentinel

A focused HIPAA BAA (Business Associate Agreement) vendor-verification tracker.
Not a general compliance suite — just the annual vendor verification workflow:
send a request, track the response, flag overdue renewals, export an
audit-ready record.

## Stack

- **Next.js 16** (App Router, TypeScript) — note the `proxy.ts` naming
  (Next 16 renamed `middleware.ts`) and async `params`/`searchParams`
  throughout; see `AGENTS.md` before assuming Next 15 conventions.
- **Clerk** — auth + organizations (multi-tenancy). Every user belongs to
  at least one Clerk Organization; enable Organizations in the Clerk
  dashboard before testing sign-up.
- **Prisma 7 + Postgres**, via `@prisma/adapter-pg` — note Prisma 7 moved
  the connection URL out of `schema.prisma` and into `prisma.config.ts`;
  `PrismaClient` now requires an explicit driver adapter (see
  `src/lib/prisma.ts`). Any Postgres works, including a Supabase-hosted one.
- **Tailwind CSS + shadcn/ui** (Base UI primitives — note the `render` prop
  for composition, not Radix's `asChild`)
- **Resend** — transactional email for verification requests/reminders
- **Stripe** — subscription billing (installed, not yet wired to checkout)
- **Anthropic (Claude API)** — AI risk scoring on paid tiers (installed, not
  yet wired)

## Data model

Schema lives in `prisma/schema.prisma` (originally committed as
`client.sql` — same content, relocated to the conventional Prisma path,
plus a few additive fields: `Organization.plan`/Stripe IDs,
`Vendor.riskScore`/`riskRationale`, and due-date/reminder tracking on
`VerificationRequest`).

```
Organization (mirrors a Clerk Organization; id = Clerk org ID)
  -> OrganizationUser (mirrors Clerk org membership; role from Clerk)
  -> Vendor
    -> BaaRecord (signed BAA file + expiration date)
    -> VerificationRequest (the annual verification workflow; token is the
       magic link used by the unauthenticated /verify/[token] form)
```

No PHI is stored anywhere — vendor/contract metadata only. There's no
separate "Practice" tenant layer: an MSP consultant managing multiple
practices belongs to multiple Clerk Organizations (one per practice) rather
than nesting practices inside a single organization.

### Clerk <-> Postgres sync, and the security model that implies

Clerk is the source of truth for identity and org membership; Postgres
holds a mirror (`User`, `Organization`, `OrganizationUser`) that `Vendor`
etc. foreign-key against. Two paths keep it in sync:

- **Webhook** (`src/app/api/webhooks/clerk/route.ts`) — the production
  path. Requires `CLERK_WEBHOOK_SIGNING_SECRET` and a publicly reachable
  URL registered in the Clerk dashboard.
- **Lazy sync** (`src/lib/data/org.ts`) — creates the local mirror rows on
  first access if they don't exist yet. This is what local dev relies on,
  since most dev environments have no public URL for Clerk to call. It's a
  bootstrap fallback, not a full sync: once an org's row exists, a role
  change made in Clerk won't show up locally until the webhook fires or
  the row is deleted.

**Important architectural difference from a Supabase-Auth setup:** there is
no Postgres Row Level Security here. RLS depends on `auth.uid()` being
available inside the Postgres session, which only works when the DB session
itself is authenticated as the end user (Supabase Auth's model). Prisma
connects with a single application-level credential, so **every query that
touches tenant data must filter by `organizationId` explicitly** — see the
comment in `src/lib/data/vendors.ts`. There's no DB-level backstop if a
query forgets to scope itself; that's the tradeoff of moving from
Supabase Auth+RLS to Clerk+Prisma.

## Getting started

1. Get a Postgres database:
   - **Local (fastest for dev):** `docker compose up -d` — starts Postgres
     on `localhost:5432` matching the default `DATABASE_URL` in
     `.env.example` exactly, so no config needed if you use this.
   - **Hosted:** Supabase, Neon, and Railway all work — Prisma just needs
     a connection string.
2. Create a Clerk application and enable **Organizations** in its
   dashboard.
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (skip if
   using `docker compose up -d`, the default already matches),
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
4. `npm install` (runs `prisma generate` via `postinstall`)
5. Create the schema in your database: `npx prisma migrate dev --name init`
   (no migrations have been generated yet in this repo — there's no live
   database to generate them against — so this first run creates
   `prisma/migrations/`). This is also the step that will fail with
   `Can't reach database server` if Postgres isn't actually running yet —
   go back to step 1 if you hit that.
6. `npm run dev` — open [http://localhost:3000](http://localhost:3000)

Sign up, create an organization when prompted (`/onboarding`), then add
vendors and start verification cycles from `/vendors`.

## What's built vs. what's next

**Built:** Clerk auth + organizations with `proxy.ts` route protection,
Clerk-to-Postgres sync (webhook + lazy-sync fallback), vendor CRUD with
plan-based vendor-count limits, and the annual verification cycle (send a
magic-link request, vendor responds on an unauthenticated
`/verify/[token]` form, which marks the vendor compliant).

**Not yet wired** (installed, scaffolded in `.env.example`, no UI/logic
yet):

- Stripe Checkout + Customer Portal for the three subscription tiers
- Scheduled reminder cascade (60/30/7-day escalation) — needs Inngest or
  Trigger.dev; `VerificationRequest.reminderCount`/`lastReminderAt`
  already exist to support it
- AI risk scoring (Claude API) on uploaded vendor documentation
- Audit-ready PDF/CSV export
- Vendor document upload (Supabase Storage, or any object storage —
  `BaaRecord.fileUrl` already exists to point at it; no upload UI yet)
