-- OPTIONAL hardening: refuse sign-ups that have no pending application.
--
-- Today /api/auth/prepare-signup checks this, but anyone can call Supabase Auth
-- directly with the public key and skip that check. This hook enforces it in
-- Supabase itself.
--
-- Setup: run this in the SQL editor, then Dashboard -> Authentication -> Auth
-- Hooks -> "Before User Created" -> Postgres function -> public.hook_before_user_created.
-- Then run the live suite with E2E_EXPECT_SIGNUP_HOOK=yes.
--
-- Caveat: this also blocks admin-created users only if the admin API goes
-- through signup; createUser via the service key is NOT affected by this hook
-- in most versions, but check on your test project before relying on it.

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  signup_email text := lower(event -> 'user' ->> 'email');
begin
  if signup_email is not null and exists (
    select 1 from public.application_drafts d
    where lower(d.email) = signup_email
      and d.claimed_at is null
      and d.expires_at > now()
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Submit an application before creating an account.'
    )
  );
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

-- SECURITY DEFINER makes this lookup run with the function owner's privileges.
-- That is required because application_drafts has RLS enabled and intentionally
-- has no public policies.
revoke all on table public.application_drafts from supabase_auth_admin;
