-- ============================================================================
-- Migration: admin_get_cron_schedules read RPC (Decision 2)
--
-- Returns the LIVE schedule string for each of the three import-tick jobs from
-- cron.job, so the Config tab shows the real production cadence (not just the
-- seeded defaults). SECURITY DEFINER + site-admin gate (user_roles.role_id = 1).
--
-- Local dev has no pg_cron: the cron.job read is wrapped so a missing schema /
-- missing job falls back to the seeded migration defaults
-- (sync */5, import *, compile */2). The function therefore ALWAYS returns
-- exactly three rows, one per job, whether or not pg_cron is installed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_cron_schedules()
RETURNS TABLE (job_name text, schedule text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron, pg_catalog
AS $$
DECLARE
  v_sync    text := '*/5 * * * *';   -- seeded default (20260611014924)
  v_import  text := '* * * * *';     -- seeded default
  v_compile text := '*/2 * * * *';   -- seeded default
BEGIN
  -- 1. Authorization: site admins only.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role_id = 1
  ) THEN
    RAISE EXCEPTION 'Not authorized: site admin required';
  END IF;

  -- 2. Read the live schedule from cron.job, overriding the defaults when the
  --    job exists. Guarded on pg_extension so a missing cron schema (local dev)
  --    keeps the seeded defaults instead of erroring. A reference into the
  --    missing `cron` schema raises invalid_schema_name (3F000), NOT
  --    undefined_table (42P01) — so an `EXCEPTION WHEN undefined_table` would
  --    not catch it. Checking the extension up front avoids the error entirely.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT j.schedule INTO v_sync    FROM cron.job j WHERE j.jobname = 'import-tick-sync';
    SELECT j.schedule INTO v_import  FROM cron.job j WHERE j.jobname = 'import-tick-import';
    SELECT j.schedule INTO v_compile FROM cron.job j WHERE j.jobname = 'import-tick-compile';
    -- A SELECT ... INTO that finds no row leaves the variable unchanged, so a
    -- missing job also falls back to its seeded default. No extra guard needed.
  END IF;

  RETURN QUERY
    SELECT 'import-tick-sync'::text,    v_sync
    UNION ALL
    SELECT 'import-tick-import'::text,  v_import
    UNION ALL
    SELECT 'import-tick-compile'::text, v_compile;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_cron_schedules() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_cron_schedules() TO authenticated;
