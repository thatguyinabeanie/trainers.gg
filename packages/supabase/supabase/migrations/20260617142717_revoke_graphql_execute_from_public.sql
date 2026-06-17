-- =============================================================================
-- Revoke GraphQL EXECUTE from PUBLIC (supersedes 20260615195830)
-- =============================================================================
-- 20260615195830 revoked EXECUTE on graphql.resolve FROM anon, authenticated —
-- but that is a no-op: anon/authenticated inherit EXECUTE from PUBLIC (pg_graphql
-- grants EXECUTE to PUBLIC on the resolver), so revoking the named roles leaves
-- the PUBLIC grant intact and `has_function_privilege('anon', …)` stays true.
--
-- The effective revoke is FROM PUBLIC. This migration does that, robustly:
--   • loops over every graphql.resolve overload by oid (no hard-coded signature
--     — addresses the "guessing the signature / multiple overloads" concern),
--   • no-ops cleanly when the graphql schema/function is absent,
--   • also names anon/authenticated for clarity.
--
-- WHO CAN RUN IT: revoking a PUBLIC grant requires the grant's owner
-- (supabase_admin) or a superuser. On hosted Supabase the migration role can
-- perform it; on the local image migrations run as a non-superuser `postgres`
-- that CANNOT (it emits "WARNING: no privileges could be revoked" and the grant
-- remains). Local enforcement is therefore handled by ensure-cron.sh, which runs
-- the same REVOKE as supabase_admin on every DB bring-up (same split as pg_cron).
-- A WARNING is not an ERROR, so this never breaks db:reset / supabase db push.
--
-- Note: this is defense-in-depth. anon SELECT is already revoked on the 19
-- S-bucket base tables, so GraphQL-via-anon cannot read protected data even
-- where this revoke no-ops.
-- =============================================================================

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'graphql' AND p.proname = 'resolve'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn
    );
  END LOOP;
END $$;
