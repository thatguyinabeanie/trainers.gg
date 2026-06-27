-- ============================================================================
-- Migration: schedule import_runs retention cron
--
-- import_runs is pure import-pipeline observability (one row per pg_cron
-- import-tick invocation — ~432 rows/day baseline). It has no long-term value
-- beyond debugging recent imports, but nothing ever deleted it, so it grows
-- unboundedly (~156k rows/year). This adds a daily pg_cron janitor that trims
-- rows older than 30 days.
--
-- 30 days is a deliberate, tunable window: long enough to debug seasonal import
-- patterns, short enough to keep the table small. Adjust the interval in the
-- DELETE below if a longer retention is ever needed.
--
-- Reuses the cron-availability guard pattern from
-- 20260611014924_schedule_import_tick_crons.sql so local dev (no pg_cron)
-- replays this migration as a no-op and db:reset / db:start stay green.
-- ============================================================================

DO $$
DECLARE
  v_job text := 'import-runs-cleanup';
BEGIN
  -- Skip entirely if pg_cron is not installed (local dev without the extension).
  -- Calling into the missing `cron` schema raises invalid_schema_name (3F000),
  -- which the trailing `WHEN undefined_table` handler does NOT catch — so the
  -- early RETURN here is what keeps db:reset / db:start green on a cron-less
  -- local Postgres image.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed — import_runs retention cron skipped';
    RETURN;
  END IF;

  -- Idempotent: drop any prior schedule before recreating.
  BEGIN
    PERFORM cron.unschedule(v_job);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'unschedule % skipped: %', v_job, SQLERRM;
  END;

  -- Daily at 03:30 UTC — off-peak, and well clear of the import-tick stages
  -- (which run as often as every 1 minute; see 20260611014924_schedule_import_tick_crons).
  PERFORM cron.schedule(
    v_job, '30 3 * * *',
    $f$ DELETE FROM public.import_runs WHERE started_at < now() - interval '30 days'; $f$
  );

  RAISE NOTICE 'import_runs retention cron scheduled (daily 03:30 UTC, 30-day window)';

-- Note: the early RETURN above exits before any cron.* call when pg_cron is
-- absent, so this handler is belt-and-suspenders for the cron-less case.
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — retention cron skipped';
WHEN OTHERS THEN
  RAISE;
END $$;
