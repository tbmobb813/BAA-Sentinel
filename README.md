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
- **Stripe** — subscription billing (Checkout + Customer Portal wired for
  the three tiers)
- **Anthropic (Claude API)** — AI risk scoring on Growth/MSP tiers, via
  `messages.parse()` + `zodOutputFormat()` for structured `{score, rationale}`
  output (Haiku 4.5)
- **Vercel Cron** — daily reminder-cascade sweep (see "Reminder cascade
  setup" below)
- **Vercel Blob** — vendor document upload, via direct browser-to-Blob
  uploads (`@vercel/blob/client`'s `upload()`), no new account beyond the
  Vercel account already required for hosting

## Data model

Schema lives in `prisma/schema.prisma` (originally committed as
`client.sql` — same content, relocated to the conventional Prisma path,
plus a few additive fields: `Organization.plan`/Stripe IDs,
`Vendor.riskScore`/`riskRationale`, due-date/reminder tracking on
`VerificationRequest`, and `BaaRecord.label`).

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

### Stripe billing setup

1. In the Stripe dashboard (test mode), create three recurring Products/Prices
   matching the tiers in `src/lib/billing/plans.ts` ($29/$59/$99 per month),
   and set their price IDs as `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`,
   `NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID`, `NEXT_PUBLIC_STRIPE_MSP_PRICE_ID`.
2. Set `STRIPE_SECRET_KEY` from the dashboard's API keys page. Checkout is
   disabled on `/billing` (buttons render but are inert) until this is set.
3. For webhooks locally, use the Stripe CLI: `stripe listen --forward-to
   localhost:3000/api/webhooks/stripe` — it prints a signing secret, which
   is your `STRIPE_WEBHOOK_SECRET`. In production, register the same
   endpoint URL in the dashboard instead and use the secret it generates
   there. Without this, `Organization.plan` never updates after checkout
   completes — the checkout session itself will still succeed, but the
   app won't know about it.

### Reminder cascade setup (Vercel Cron)

`src/app/api/cron/reminders/route.ts` runs `processVerificationReminders`
(`src/lib/reminders/process-verification-reminders.ts`) on the schedule
defined in `vercel.json` — daily, nudging vendors at 60/30/7 days before
their verification is due (reusing the same Resend email path, so it also
no-ops to a console log without `RESEND_API_KEY`), and flipping a vendor to
`OVERDUE` once its due date passes. Each checkpoint write is a
compare-and-swap against `reminderCount`, so an overlapping invocation (a
manual re-run from the Vercel dashboard, a retry) can't double-send.

Only relevant once deployed to Vercel: set `CRON_SECRET` to any random
16+ character string as an environment variable in the Vercel project
(Vercel then sends it back automatically as `Authorization: Bearer
$CRON_SECRET` on every cron invocation, which the route verifies). There's
nothing to configure for local dev — Vercel Cron doesn't run against `next
dev`; trigger a run manually with `curl -H "Authorization: Bearer
$CRON_SECRET" localhost:3000/api/cron/reminders` instead.

Vercel does not retry a failed cron invocation, so a failure here is
silent until the next day's run — an accepted tradeoff at day-granularity
due-date checkpoints; revisit if this ever needs stronger delivery
guarantees than a bare cron endpoint provides.

### Vendor document upload setup

Uploads go straight from the browser to Vercel Blob
(`@vercel/blob/client`'s `upload()`, authorized by
`src/app/api/blob/upload/route.ts`), then the client calls the
`createBaaRecord` Server Action directly once the upload resolves — no
dependency on Vercel's `onUploadCompleted` webhook callback, which (like
the Clerk webhook) needs a publicly reachable URL that most dev
environments don't have.

1. In the Vercel dashboard, connect a Blob store to the project (**Storage**
   tab -> **Create Database** -> **Blob**). This auto-populates
   `BLOB_READ_WRITE_TOKEN` for deployed environments; copy the same value
   into `.env.local` for local dev.
2. That's it — no other setup. Uploads are capped at 20MB and restricted to
   PDF/PNG/JPEG in `src/app/api/blob/upload/route.ts`'s
   `allowedContentTypes`.

**Security note:** blobs are uploaded with `access: "public"` — the file is
reachable by anyone with its exact URL, which Vercel Blob generates with a
random, unguessable suffix. This is the same trust model already used for
`/verify/[token]`'s magic links elsewhere in this app: the confidentiality
boundary that matters (who ever *sees* the link) is enforced by
`getVendorDetail`'s `organizationId` scoping, not by Vercel Blob itself.
Vercel Blob does support fully access-controlled private blobs via a
signed-URL flow (`presignUrl`), which this app doesn't use — consciously
traded off for consistency with the app's existing token-based pattern and
to avoid a second, more complex upload flow for what's currently a small
feature.

### AI risk scoring setup

Set `ANTHROPIC_API_KEY` from the [Anthropic Console](https://console.anthropic.com).
Without it, scoring silently no-ops (`scoreVendorRisk` returns `null`) rather
than failing whatever triggered it. Scoring runs two ways, both gated to
Growth/MSP plans (`Organization.plan !== "STARTER"`):

- **Automatically** at the end of `submitVerificationResponse`, right after
  a vendor's `/verify/[token]` submission marks them compliant. Best-effort —
  a Claude API failure is logged, not surfaced to the vendor, since their
  submission already succeeded.
- **Manually** via the "Run risk scoring" button on a vendor's detail page,
  which re-scores off that vendor's most recent completed response.

### Audit export

"Export CSV" / "Export PDF" on `/vendors` hit `/api/export/csv` and
`/api/export/pdf` (plain GET route handlers, no setup required beyond what's
already configured). They intentionally export different granularity:

- **CSV** — one row per verification cycle (not per vendor), so the full
  multi-year history is there for an auditor to dig into. A vendor with no
  cycles yet still gets a row rather than silently disappearing.
- **PDF** (`src/components/export/audit-report-pdf.tsx`, via
  `@react-pdf/renderer`'s `renderToBuffer` — pure JS, no headless browser)
  — a presentable one-vendor-per-row summary with status counts up top,
  meant to be handed to someone directly rather than analyzed.

## What's built vs. what's next

**Built:** Clerk auth + organizations with `proxy.ts` route protection,
Clerk-to-Postgres sync (webhook + lazy-sync fallback), vendor CRUD with
plan-based vendor-count limits, the annual verification cycle (send a
magic-link request, vendor responds on an unauthenticated
`/verify/[token]` form, which marks the vendor compliant), Stripe
Checkout + Customer Portal for the three subscription tiers (`/billing`),
the reminder cascade on Vercel Cron, AI risk scoring (Growth/MSP tiers) on
vendor verification responses, CSV/PDF audit export, and vendor document
upload via Vercel Blob.

**Not yet wired:** nothing outstanding from the original feature list.
Worth keeping an eye on: this project has no automated test suite yet.
