-- BAA Sentinel initial schema
-- Hierarchy: organizations (billing account) -> practices (tenant units;
-- a solo practice org has exactly one, an MSP org has many) -> vendors ->
-- verification_cycles (the annual written-verification workflow).
-- No PHI is stored anywhere in this schema -- vendor/contract metadata only.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- organizations & membership
-- ---------------------------------------------------------------------------

create type public.org_plan as enum ('starter', 'growth', 'msp');
create type public.org_role as enum ('owner', 'admin', 'member');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan public.org_plan not null default 'starter',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ---------------------------------------------------------------------------
-- practices (tenant units under an org; MSP orgs have many)
-- ---------------------------------------------------------------------------

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- vendors & documents
-- ---------------------------------------------------------------------------

create type public.vendor_status as enum (
  'active',
  'pending_verification',
  'verified',
  'overdue',
  'inactive'
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text not null,
  service_description text,
  status public.vendor_status not null default 'pending_verification',
  baa_signed_date date,
  verification_due_date date,
  risk_score smallint check (risk_score between 0 and 100),
  risk_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_practice_id_idx on public.vendors (practice_id);
create index vendors_verification_due_date_idx on public.vendors (verification_due_date);

create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  storage_path text not null,
  label text not null,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- annual verification workflow
-- ---------------------------------------------------------------------------

create type public.verification_cycle_status as enum (
  'scheduled',
  'sent',
  'reminded',
  'responded',
  'verified',
  'overdue'
);

create table public.verification_cycles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  status public.verification_cycle_status not null default 'scheduled',
  due_date date not null,
  sent_at timestamptz,
  last_reminder_at timestamptz,
  reminder_count smallint not null default 0,
  responded_at timestamptz,
  response_summary text,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index verification_cycles_vendor_id_idx on public.verification_cycles (vendor_id);
create index verification_cycles_due_date_idx on public.verification_cycles (due_date);

-- Tokenized magic links for the vendor-facing verification form. Never
-- expose verification_cycles rows directly to unauthenticated requests --
-- the token is the only credential a vendor holds.
create table public.verification_tokens (
  token uuid primary key default gen_random_uuid(),
  verification_cycle_id uuid not null references public.verification_cycles (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger practices_set_updated_at
  before update on public.practices
  for each row execute function public.set_updated_at();

create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.practices enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.verification_cycles enable row level security;
alter table public.verification_tokens enable row level security;

-- organizations: visible/editable only to members
create policy "org members can view their orgs"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id and m.user_id = auth.uid()
    )
  );

create policy "org admins can update their org"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- organization_members: visible to fellow members; only owners/admins manage
create policy "org members can view fellow members"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "org admins can manage members"
  on public.organization_members for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- practices: any org member can view; admins manage
create policy "org members can view practices"
  on public.practices for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = practices.organization_id and m.user_id = auth.uid()
    )
  );

create policy "org admins can manage practices"
  on public.practices for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = practices.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- vendors: any org member (via practice -> org) can view/manage
create policy "org members can view vendors"
  on public.vendors for select
  using (
    exists (
      select 1 from public.practices p
      join public.organization_members m on m.organization_id = p.organization_id
      where p.id = vendors.practice_id and m.user_id = auth.uid()
    )
  );

create policy "org members can manage vendors"
  on public.vendors for all
  using (
    exists (
      select 1 from public.practices p
      join public.organization_members m on m.organization_id = p.organization_id
      where p.id = vendors.practice_id and m.user_id = auth.uid()
    )
  );

-- vendor_documents: follow vendor access
create policy "org members can view vendor documents"
  on public.vendor_documents for select
  using (
    exists (
      select 1 from public.vendors v
      join public.practices p on p.id = v.practice_id
      join public.organization_members m on m.organization_id = p.organization_id
      where v.id = vendor_documents.vendor_id and m.user_id = auth.uid()
    )
  );

create policy "org members can manage vendor documents"
  on public.vendor_documents for all
  using (
    exists (
      select 1 from public.vendors v
      join public.practices p on p.id = v.practice_id
      join public.organization_members m on m.organization_id = p.organization_id
      where v.id = vendor_documents.vendor_id and m.user_id = auth.uid()
    )
  );

-- verification_cycles: follow vendor access
create policy "org members can view verification cycles"
  on public.verification_cycles for select
  using (
    exists (
      select 1 from public.vendors v
      join public.practices p on p.id = v.practice_id
      join public.organization_members m on m.organization_id = p.organization_id
      where v.id = verification_cycles.vendor_id and m.user_id = auth.uid()
    )
  );

create policy "org members can manage verification cycles"
  on public.verification_cycles for all
  using (
    exists (
      select 1 from public.vendors v
      join public.practices p on p.id = v.practice_id
      join public.organization_members m on m.organization_id = p.organization_id
      where v.id = verification_cycles.vendor_id and m.user_id = auth.uid()
    )
  );

-- verification_tokens: never selectable via the anon/authenticated roles.
-- The vendor-facing verification form is looked up with the Supabase
-- service-role key from a server action, matching the raw token from the
-- magic-link URL -- not via a client-side RLS-scoped query. No policies are
-- added, so RLS default-denies all access through the public API.
