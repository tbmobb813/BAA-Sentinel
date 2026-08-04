# BAA Sentinel

A focused HIPAA BAA (Business Associate Agreement) vendor-verification tracker.
Not a general compliance suite — just the annual vendor verification workflow:
send a request, track the response, flag overdue renewals, export an
audit-ready record.

## Stack

- **Next.js 16** (App Router, TypeScript) — note the `proxy.ts` naming
  (Next 16 renamed `middleware.ts`) and async `params`/`searchParams`/`cookies()`
  throughout; see `AGENTS.md` before assuming Next 15 conventions.
- **Supabase** — Postgres, Auth, Row Level Security, Storage
- **Tailwind CSS + shadcn/ui** (Base UI primitives — note the `render` prop
  for composition, not Radix's `asChild`)
- **Resend** — transactional email for verification requests/reminders
- **Stripe** — subscription billing (installed, not yet wired to checkout)
- **Anthropic (Claude API)** — AI risk scoring on paid tiers (installed, not
  yet wired)

## Data model

```
organizations (billing account; a solo practice has exactly one, an MSP has many)
  -> organization_members (user_id, role: owner/admin/member)
  -> practices (tenant units under an org)
    -> vendors
      -> vendor_documents (uploaded BAAs / proof docs)
      -> verification_cycles (the annual verification workflow)
        -> verification_tokens (magic links for the vendor-facing form)
```

No PHI is stored anywhere — vendor/contract metadata only. See
`supabase/migrations/` for the full schema, RLS policies, and the two
`SECURITY DEFINER` functions that back onboarding (`create_organization_with_owner`)
and the unauthenticated vendor-facing verification form
(`get_verification_request` / `submit_verification_response`).

## Getting started

1. Create a Supabase project, then run the migrations in `supabase/migrations/`
   against it (via the SQL editor, or `supabase db push` with the CLI).
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL/anon key
   at minimum. `RESEND_API_KEY` and `ANTHROPIC_API_KEY` are optional in dev —
   verification emails log to the console instead of sending when unset.
3. `npm install`
4. `npm run dev` — open [http://localhost:3000](http://localhost:3000)

Sign up at `/signup` (creates an organization + default practice via the
onboarding RPC), then add vendors and start verification cycles from
`/vendors`.

## What's built vs. what's next

**Built:** auth (Supabase Auth + `proxy.ts` session refresh), multi-tenant
org/practice/vendor data model with RLS, vendor CRUD, the annual verification
cycle (send a magic-link request, vendor responds on an unauthenticated
`/verify/[token]` form, mark verified), plan-based vendor-count limits.

**Not yet wired (installed, scaffolded in `.env.example`, no UI/logic yet):**

- Stripe Checkout + Customer Portal for the three subscription tiers
- Scheduled reminder cascade (60/30/7-day escalation) — needs Inngest or
  Trigger.dev; `verification_cycles.reminder_count` / `last_reminder_at`
  already exist to support it
- AI risk scoring (Claude API) on uploaded vendor documentation
- Audit-ready PDF/CSV export
- Vendor document upload (Supabase Storage bucket + `vendor_documents` table
  already exist; no upload UI yet)
