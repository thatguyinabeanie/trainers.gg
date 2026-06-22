-- =============================================================================
-- Revoke public GraphQL access (existence-guarded; real revoke is in 20260617142717)
-- =============================================================================
-- ORIGINAL FORM (bare `REVOKE EXECUTE ON FUNCTION graphql.resolve ...`) errored
-- with SQLSTATE 42883 on instances without pg_graphql, blocking all later
-- migrations. It also could never have had its intended effect: pg_graphql grants
-- EXECUTE to PUBLIC, so anon/authenticated inherit through PUBLIC and a named-role
-- revoke is a semantic no-op. The effective FROM PUBLIC revoke is done by
-- 20260617142717 (+ ensure-cron.sh locally).
--
-- This migration is therefore reduced to an existence-guarded named-role revoke:
--   • zero iterations (clean no-op) when graphql.resolve is absent — fixes 42883,
--   • harmless where present (superseded immediately by 20260617142717).
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
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', fn);
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipped REVOKE on % (insufficient privilege; real revoke in 20260617142717)', fn;
    END;
  END LOOP;
END $$;
