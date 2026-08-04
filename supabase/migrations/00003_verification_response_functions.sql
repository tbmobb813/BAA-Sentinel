-- The vendor-facing verification form at /verify/[token] is unauthenticated
-- (the vendor is not a Supabase user), so it can't go through the normal
-- RLS-scoped client. verification_tokens and verification_cycles have no
-- policies for anon/authenticated, so these SECURITY DEFINER functions are
-- the only way in, each doing its own token validation before touching data.

create or replace function public.get_verification_request(p_token uuid)
returns table (
  vendor_name text,
  due_date date,
  status public.verification_cycle_status,
  expired boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select v.name, vc.due_date, vc.status, (t.expires_at < now()) as expired
    from public.verification_tokens t
    join public.verification_cycles vc on vc.id = t.verification_cycle_id
    join public.vendors v on v.id = vc.vendor_id
    where t.token = p_token;
end;
$$;

create or replace function public.submit_verification_response(
  p_token uuid,
  p_summary text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id uuid;
  v_expires_at timestamptz;
  v_used_at timestamptz;
begin
  select verification_cycle_id, expires_at, used_at
    into v_cycle_id, v_expires_at, v_used_at
    from public.verification_tokens
    where token = p_token;

  if v_cycle_id is null then
    raise exception 'invalid verification link';
  end if;

  if v_expires_at < now() then
    raise exception 'this verification link has expired';
  end if;

  if v_used_at is not null then
    raise exception 'this verification link has already been used';
  end if;

  update public.verification_cycles
    set status = 'responded',
        responded_at = now(),
        response_summary = p_summary
    where id = v_cycle_id;

  update public.verification_tokens
    set used_at = now()
    where token = p_token;

  return true;
end;
$$;

revoke all on function public.get_verification_request(uuid) from public;
revoke all on function public.submit_verification_response(uuid, text) from public;
grant execute on function public.get_verification_request(uuid) to anon, authenticated;
grant execute on function public.submit_verification_response(uuid, text) to anon, authenticated;
