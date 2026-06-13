-- Migration: Public user profiles view + lock users SELECT (RLS audit finding #1)
--
-- ROOT CAUSE
-- ----------
-- public.users carried a permissive SELECT policy ("Users are viewable by
-- everyone", USING (true)) from the baseline. Because anon/authenticated reach
-- the table over the PostgREST API, this leaked EVERY column of EVERY user to
-- anyone with the anon key, including sensitive PII and security-relevant
-- fields:
--   email, phone_number, birth_date, first_name, last_name,
--   external_accounts, last_sign_in_at, is_locked
-- Public-facing features (profiles, player search, member lists, coach pages,
-- community activity) only ever needed a small set of SAFE columns.
--
-- STRATEGY (decision #1 — rejected column-REVOKE and a users_private split)
-- ------------------------------------------------------------------------
-- 1. Expose ONLY the safe public columns through a dedicated view
--    public.public_user_profiles. The view is SECURITY DEFINER-style
--    (security_invoker = false) so it reads past the caller's own-row RLS on
--    public.users, but it can only ever project the safe columns it selects —
--    the sensitive columns are simply not in the view.
-- 2. Lock public.users SELECT down to own-row + site admin. service_role
--    bypasses RLS, so server-side/edge code is unaffected.
-- 3. Sign-in resolves a username -> email for ANON before a session exists.
--    That path used to read public.users directly; with the lock in place it
--    needs a SECURITY DEFINER function. A prior migration
--    (20260611020600_default_deny_function_execute) set default-deny EXECUTE
--    on public functions, so the explicit GRANT below is REQUIRED.

-- ---------------------------------------------------------------------------
-- 1. Safe public projection of users.
--    Included safe columns (all confirmed to exist on public.users):
--      id, username, bio, country, image, did, pds_handle, main_alt_id,
--      created_at, name, is_coach
--    name and is_coach are already surfaced on public-facing pages: `name` is
--    the account display name (NOT legal first/last name, which are excluded)
--    rendered on profile / coach pages, and `is_coach` gates the public coach
--    directory and coach profile pages. Both are non-sensitive.
--    Deliberately EXCLUDED (PII / security-relevant):
--      email, phone_number, birth_date, first_name, last_name,
--      external_accounts, public_metadata, last_sign_in_at, last_active_at,
--      is_locked, updated_at, pds_status, show_discord_publicly,
--      sprite_preference, discord_dm_warn_until
--
--    security_invoker = false: the view runs with the view owner's privileges,
--    so it reads past the new own-row RLS on public.users while exposing only
--    the safe columns projected here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_user_profiles
  WITH (security_invoker = false) AS
SELECT
  id,
  username,
  bio,
  country,
  image,
  did,
  pds_handle,
  main_alt_id,
  created_at,
  name,
  is_coach
FROM public.users;

COMMENT ON VIEW public.public_user_profiles IS
  'RLS audit #1: safe public projection of public.users. Exposes only non-PII '
  'columns; PUBLIC reads (profiles, search, member lists) point here instead of '
  'the locked-down users table. security_invoker=false so it reads past users '
  'own-row RLS while projecting only safe columns.';

-- SELECT only — never grant write access to the view.
GRANT SELECT ON public.public_user_profiles TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Lock public.users SELECT to own-row + site admin.
--    Drops the baseline "Users are viewable by everyone" USING (true) policy.
--    service_role bypasses RLS entirely, so server/edge reads are unaffected.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;

DROP POLICY IF EXISTS "Users read own row" ON public.users;
CREATE POLICY "Users read own row"
  ON public.users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id OR public.is_site_admin());

-- ---------------------------------------------------------------------------
-- 3. Username -> email lookup for the ANON sign-in path.
--    Sign-in needs to resolve a username to an email before a session exists,
--    so it cannot rely on the own-row policy (no auth.uid() yet). SECURITY
--    DEFINER lets anon resolve exactly one email by exact username match and
--    nothing else.
--
--    The default-deny EXECUTE migration revoked the implicit PUBLIC grant on
--    public functions, so the explicit REVOKE + GRANT below is REQUIRED for
--    anon/authenticated to call this.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.users WHERE username = p_username
$$;

COMMENT ON FUNCTION public.get_email_by_username(text) IS
  'RLS audit #1: anon sign-in path resolves username -> email before a session '
  'exists. SECURITY DEFINER reads past the locked-down users SELECT policy and '
  'returns only the matching email.';

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
