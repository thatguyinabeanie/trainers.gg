-- =============================================================================
-- pg_cron schedules for edge function invocation
--
-- Replaces Vercel cron jobs for:
--   - limitless-sync (every 5 min)
--   - limitless-import queue processor (every 15 min)
--   - rk9-worker (every 5 min)
--
-- Uses:
--   - pg_cron for scheduling
--   - pg_net (net.http_post) for async HTTP calls to edge functions
--   - vault for storing project URL and service role key
--
-- The edge functions themselves check auto_import_enabled internally,
-- but we also gate the HTTP calls here to avoid unnecessary network traffic
-- when auto-import is disabled.
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
  -- Limitless sync: every 5 minutes
  PERFORM cron.unschedule('limitless-sync');
  PERFORM cron.schedule(
    'limitless-sync',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"sync"}'::jsonb, 'auto_import_limitless_enabled')$cmd$
  );

  -- Limitless import queue: every 5 minutes, process 20 tournaments per tick
  PERFORM cron.unschedule('limitless-import-queue');
  PERFORM cron.schedule(
    'limitless-import-queue',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"process-queue","batchSize":20}'::jsonb, 'auto_import_limitless_enabled')$cmd$
  );

  -- RK9 worker: every 1 minute, process up to 100 teams per tick
  PERFORM cron.unschedule('rk9-worker');
  PERFORM cron.schedule(
    'rk9-worker',
    '*/1 * * * *',
    $cmd$SELECT public.invoke_edge_function('rk9-worker', '{"maxTeams":100}'::jsonb, 'auto_import_rk9_enabled')$cmd$
  );

  RAISE NOTICE 'pg_cron jobs scheduled successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — cron jobs not scheduled';
END $$;
