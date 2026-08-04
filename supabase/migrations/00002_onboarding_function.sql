-- Organizations have no insert policy (deliberately -- see 00001), so a
-- brand-new user has no membership row to satisfy any RLS check yet. This
-- function runs as the definer (bypassing RLS) to create the org, the
-- caller's owner membership, and a default practice atomically, then hands
-- control back to normal RLS-scoped access for everything after.

create or replace function public.create_organization_with_owner(
  org_name text,
  practice_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  insert into public.organizations (name)
  values (org_name)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  insert into public.practices (organization_id, name)
  values (new_org_id, coalesce(nullif(practice_name, ''), org_name));

  return new_org_id;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text) from public;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;
