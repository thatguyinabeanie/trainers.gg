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

-- ---------------------------------------------------------------------------
-- 1. Ensure extensions are available (idempotent)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant pg_cron usage to postgres role (required for scheduling)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

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
-- 3. Helper function: invoke an edge function via pg_net
--
-- Checks auto_import_enabled before making the HTTP call.
-- Returns the request_id from pg_net (or NULL if skipped).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invoke_edge_function(
  function_name text,
  body jsonb DEFAULT '{}'::jsonb,
  check_auto_import boolean DEFAULT true
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auto_import boolean;
  _project_url text;
  _service_key text;
  _request_id bigint;
BEGIN
  -- Check auto_import_enabled if requested
  IF check_auto_import THEN
    SELECT (value::text)::boolean INTO _auto_import
    FROM public.site_config
    WHERE key = 'auto_import_enabled';

    IF NOT coalesce(_auto_import, false) THEN
      RETURN NULL; -- Auto-import disabled, skip
    END IF;
  END IF;

  -- Get secrets from vault
  SELECT decrypted_secret INTO _project_url
  FROM vault.decrypted_secrets WHERE name = 'project_url';

  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Make the HTTP POST call
  SELECT net.http_post(
    url := _project_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := body
  ) INTO _request_id;

  RETURN _request_id;
END;
$$;

-- Restrict to postgres role only (cron runs as postgres)
REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_edge_function(text, jsonb, boolean) TO postgres;

COMMENT ON FUNCTION public.invoke_edge_function IS
  'Invoke a Supabase edge function via pg_net. Used by pg_cron schedules. '
  'Checks auto_import_enabled in site_config before making the call (unless check_auto_import=false).';

-- ---------------------------------------------------------------------------
-- 4. Schedule cron jobs (idempotent — unschedule first if exists)
-- ---------------------------------------------------------------------------

-- Limitless sync: every 5 minutes
-- Fetches tournament list from Limitless API, upserts metadata
SELECT cron.unschedule('limitless-sync') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'limitless-sync'
);
SELECT cron.schedule(
  'limitless-sync',
  '*/5 * * * *',
  $$SELECT public.invoke_edge_function('limitless-import', '{"action":"sync"}'::jsonb)$$
);

-- Limitless import queue: every 15 minutes
-- Processes queued tournaments (fetches full data + imports)
SELECT cron.unschedule('limitless-import-queue') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'limitless-import-queue'
);
SELECT cron.schedule(
  'limitless-import-queue',
  '*/15 * * * *',
  $$SELECT public.invoke_edge_function('limitless-import', '{"action":"process-queue","batchSize":5}'::jsonb)$$
);

-- RK9 worker: every 5 minutes
-- Discovers events, scrapes rosters, scrapes team batches (one unit per invocation)
SELECT cron.unschedule('rk9-worker') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'rk9-worker'
);
SELECT cron.schedule(
  'rk9-worker',
  '*/5 * * * *',
  $$SELECT public.invoke_edge_function('rk9-worker', '{}'::jsonb)$$
);
