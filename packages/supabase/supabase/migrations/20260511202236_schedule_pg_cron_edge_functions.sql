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
EXCEPTION WHEN undefined_table THEN
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
    $cmd$SELECT net.http_post(
      url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url')||'/functions/v1/limitless-import',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key')),
      body:='{"action":"sync"}'::jsonb
    );$cmd$
  );

  -- Limitless import queue: every 5 minutes, process 20 tournaments per tick
  PERFORM cron.unschedule('limitless-import-queue');
  PERFORM cron.schedule(
    'limitless-import-queue',
    '*/5 * * * *',
    $cmd$SELECT net.http_post(
      url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url')||'/functions/v1/limitless-import',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key')),
      body:='{"action":"process-queue","batchSize":20}'::jsonb
    );$cmd$
  );

  -- RK9 worker: every 1 minute, process up to 100 teams per tick
  PERFORM cron.unschedule('rk9-worker');
  PERFORM cron.schedule(
    'rk9-worker',
    '*/1 * * * *',
    $cmd$SELECT net.http_post(
      url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url')||'/functions/v1/rk9-worker',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key')),
      body:='{"maxTeams":100}'::jsonb
    );$cmd$
  );

  RAISE NOTICE 'pg_cron jobs scheduled successfully';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — cron jobs not scheduled';
WHEN OTHERS THEN
  RAISE;
END $$;
