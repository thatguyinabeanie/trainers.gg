-- =============================================================================
-- Service-role lookup RPCs for the PII split (Copilot review, PR #361)
-- =============================================================================
-- Two cross-user lookups that the PII split (20260616100000) left needing a
-- proper path. Both read schemas that PostgREST cannot serve to the JS client:
--   • private.user_pii  — the `private` schema is NOT in config.toml's exposed
--     schemas, so `supabase.schema('private').from('user_pii')` returns PGRST106.
--   • auth.users        — not a PostgREST-exposed schema either.
--
-- These are SECURITY DEFINER (read past the API-exposure boundary) and granted
-- EXECUTE to service_role ONLY. They expose cross-user PII (names) / an
-- email→id reverse lookup, so they must never be callable by anon/authenticated
-- — only server-side service-role code (admin pages, staff-gated routes, edge
-- functions) may call them. search_path='' + full qualification prevents
-- search_path injection.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_users_pii(uuid[]) — batch first/last name lookup from private.user_pii
-- -----------------------------------------------------------------------------
-- Replaces the broken `supabase.schema('private')` reads in getPiiByUserIds
-- (admin user lists, site-admin list, community staff rosters). Returns one row
-- per matching user_id; callers build a Map.
CREATE OR REPLACE FUNCTION public.get_users_pii(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, first_name text, last_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.user_id, p.first_name, p.last_name
  FROM private.user_pii p
  WHERE p.user_id = ANY(p_user_ids)
$$;

COMMENT ON FUNCTION public.get_users_pii(uuid[]) IS
  'Batch first/last name lookup from private.user_pii for a set of user_ids. '
  'SECURITY DEFINER (private schema is unreachable via PostgREST). EXECUTE is '
  'service_role-only — exposes cross-user PII, so only server-side admin/staff '
  'code may call it. Returns one row per matching user_id.';

REVOKE EXECUTE ON FUNCTION public.get_users_pii(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_pii(uuid[]) TO service_role;

-- -----------------------------------------------------------------------------
-- get_user_id_by_email(text) — reverse lookup, replaces unpaginated listUsers
-- -----------------------------------------------------------------------------
-- The Bluesky placeholder-email lookups used auth.admin.listUsers() (default
-- 50/page) and assumed the user was on page 1 — broken once the user count
-- exceeds the page size. This is a deterministic lookup against auth.users with
-- no pagination. Case-insensitive to match auth's email handling.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.id
  FROM auth.users au
  WHERE lower(au.email) = lower(p_email)
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_user_id_by_email(text) IS
  'Resolves an email to its auth.users id (deterministic, no pagination). '
  'SECURITY DEFINER reads auth.users. EXECUTE is service_role-only — used by '
  'server-side OAuth/Bluesky flows to find an existing account by its '
  '(deterministic placeholder) email. Never exposed to anon/authenticated.';

REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
