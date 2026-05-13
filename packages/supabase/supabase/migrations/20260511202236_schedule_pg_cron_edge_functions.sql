-- =============================================================================
-- pg_cron unschedules — removes previously scheduled edge function jobs
--
-- The cron-based import pipeline has been replaced by manual CLI tooling.
-- This migration cleans up the old schedules.
--
-- Uses:
--   - pg_cron for scheduling
--   - pg_net (net.http_post) for async HTTP calls to edge functions
--   - vault for storing project URL and service role key
--
-- The edge functions themselves check auto_import_enabled internally.
-- =============================================================================

-- pg_net is always available locally; pg_cron is production-only.
-- Wrap all pg_cron-dependent operations in a block that skips gracefully
-- if the extension isn't available (local dev).

-- ---------------------------------------------------------------------------
-- 1. Ensure extensions are available (idempotent)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  GRANT USAGE ON SCHEMA cron TO postgres;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — skipping cron setup';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Store secrets in vault (project URL + service role key)
--
-- These are seeded with placeholders. In production, update via:
--   SELECT vault.update_secret(id, 'real-value')
-- where id is from vault.secrets.
--
-- For local dev, supabase CLI auto-injects these env vars into edge functions,
-- so vault values don't matter locally — the cron SQL just needs them to exist.
-- ---------------------------------------------------------------------------

-- Only insert if not already present (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret(
      coalesce(current_setting('app.supabase_url', true), 'http://127.0.0.1:54321'),
      'project_url',
      'Supabase project URL for pg_cron edge function calls'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
    PERFORM vault.create_secret(
      coalesce(current_setting('app.service_role_key', true), 'placeholder-replace-in-production'),
      'service_role_key',
      'Supabase service role key for pg_cron edge function auth'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Schedule cron jobs (idempotent — unschedule first if exists)
-- Only runs when pg_cron is available.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('limitless-sync');
    RAISE NOTICE 'limitless-sync unscheduled (job removed)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'limitless-sync unschedule skipped: %', SQLERRM;
  END;

  BEGIN
    PERFORM cron.unschedule('limitless-import-queue');
    RAISE NOTICE 'limitless-import-queue unscheduled (job removed)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'limitless-import-queue unschedule skipped: %', SQLERRM;
  END;

  BEGIN
    PERFORM cron.unschedule('rk9-worker');
    RAISE NOTICE 'rk9-worker unscheduled (job removed)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'rk9-worker unschedule skipped: %', SQLERRM;
  END;

  RAISE NOTICE 'pg_cron job cleanup complete — limitless-import and rk9-worker edge functions have been removed';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — cron cleanup skipped';
WHEN OTHERS THEN
  RAISE;
END $$;
