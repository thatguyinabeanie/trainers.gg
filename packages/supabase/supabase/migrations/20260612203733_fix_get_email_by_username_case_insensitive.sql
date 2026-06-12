-- Migration: Fix get_email_by_username to use case-insensitive username matching
--
-- PROBLEM
-- -------
-- The original get_email_by_username (20260611030000_public_user_profiles_view)
-- used `WHERE username = p_username` — a case-SENSITIVE equality match.
-- The alt-lookup fallback path in getEmailByUsername() uses `.ilike(...)` on
-- alts.username, which is case-INSENSITIVE. This means:
--
--   login("Ash_Ketchum") resolves if an alt matches, but NOT if the users.username
--   is "ash_ketchum" — the RPC fails silently and returns NULL instead of the
--   email, causing a spurious "user not found" on sign-in.
--
-- FIX
-- ---
-- Change the WHERE predicate from `username = p_username` to
-- `lower(username) = lower(p_username)`. This is preferred over ILIKE because:
--   1. It is index-friendly — an index on lower(username) satisfies this predicate
--   2. It avoids wildcard surprises (ILIKE accepts % and _ as glob patterns)
--   3. It mirrors the normalisation already applied to alts.username in the app layer
--
-- All other attributes (SECURITY DEFINER, search_path, return type, signature,
-- REVOKE/GRANT, function comment) are preserved exactly from the original.
-- CREATE OR REPLACE is idempotent — safe to replay on preview branches.

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.users WHERE lower(username) = lower(p_username)
$$;

COMMENT ON FUNCTION public.get_email_by_username(text) IS
  'RLS audit #1: anon sign-in path resolves username -> email before a session '
  'exists. SECURITY DEFINER reads past the locked-down users SELECT policy and '
  'returns only the matching email. Case-insensitive match (lower/lower) aligns '
  'with the ilike() used in the alt-lookup fallback path (CodeRabbit finding).';

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
