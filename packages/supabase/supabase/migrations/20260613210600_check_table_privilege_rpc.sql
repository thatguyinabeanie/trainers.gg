-- =============================================================================
-- check_table_privilege(role, table, privilege) — grant introspection RPC
-- =============================================================================
-- Support function for the Phase 2 Task 9 revoke test suite
-- (phase2-anon-revoke-grants.test.ts). The suite must produce REAL evidence
-- that the anon-revoke migration left `authenticated` SELECT intact — not a
-- vacuous "couldn't check, assume fine" pass.
--
-- PostgREST does not expose `information_schema` over the data API, so the test
-- cannot read `role_table_grants` directly. This thin SECURITY DEFINER wrapper
-- around the built-in `has_table_privilege()` gives the service-role test client
-- a callable RPC to verify a role's table privilege deterministically.
--
-- Locked down: EXECUTE revoked from PUBLIC and granted only to service_role
-- (the role the admin test client authenticates as). It is read-only and
-- returns a boolean; it grants no access, it only reports existing grants.

CREATE OR REPLACE FUNCTION public.check_table_privilege(
  p_role text,
  p_table text,
  p_privilege text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.has_table_privilege(
    p_role,
    pg_catalog.format('public.%I', p_table)::regclass,
    p_privilege
  );
$$;

COMMENT ON FUNCTION public.check_table_privilege(text, text, text) IS
  'Grant-introspection helper for the Phase 2 revoke test suite. Returns whether p_role holds p_privilege on public.p_table via has_table_privilege(). Read-only; EXECUTE limited to service_role.';

-- Lock down EXECUTE: only the service-role test client may call it.
REVOKE EXECUTE ON FUNCTION public.check_table_privilege(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_table_privilege(text, text, text) TO service_role;
