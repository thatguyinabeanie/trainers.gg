-- Split auto_import_enabled into per-source toggles:
--   auto_import_rk9_enabled       — controls RK9 cron worker
--   auto_import_limitless_enabled  — controls Limitless sync + import queue
--
-- Migrates existing auto_import_enabled value to both new keys,
-- then removes the old key. Updates invoke_edge_function to accept
-- a config_key parameter instead of a boolean flag.

-- ---------------------------------------------------------------------------
-- 1. Seed per-source keys, inheriting from old value if present
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  _old_value boolean;
BEGIN
  -- Read the old flag (default false if missing)
  SELECT coalesce((value::text)::boolean, false)
  INTO _old_value
  FROM public.site_config
  WHERE key = 'auto_import_enabled';

  _old_value := coalesce(_old_value, false);

  -- Insert per-source keys (inherit old value)
  INSERT INTO public.site_config (key, value)
  VALUES
    ('auto_import_rk9_enabled', to_jsonb(_old_value)),
    ('auto_import_limitless_enabled', to_jsonb(_old_value))
  ON CONFLICT (key) DO NOTHING;

  -- Remove the old unified key
  DELETE FROM public.site_config WHERE key = 'auto_import_enabled';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Update invoke_edge_function to accept a config_key parameter
--
-- Old signature: (function_name text, body jsonb, check_auto_import boolean)
-- New signature: (function_name text, body jsonb, config_key text)
--
-- When config_key is NULL, no config check is performed (skip gate).
-- When non-NULL, reads that key from site_config and skips if false.
-- ---------------------------------------------------------------------------

-- Drop the old signature (text, jsonb, boolean) before creating the new one
DROP FUNCTION IF EXISTS public.invoke_edge_function(text, jsonb, boolean);

CREATE OR REPLACE FUNCTION public.invoke_edge_function(
  function_name text,
  body jsonb DEFAULT '{}'::jsonb,
  config_key text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled boolean;
  _project_url text;
  _service_key text;
  _request_id bigint;
BEGIN
  -- Check the specified config key if provided
  IF config_key IS NOT NULL THEN
    SELECT (value::text)::boolean INTO _enabled
    FROM public.site_config
    WHERE key = config_key;

    IF NOT coalesce(_enabled, false) THEN
      RETURN NULL; -- Config key is false or missing, skip
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
REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_edge_function(text, jsonb, text) TO postgres;

COMMENT ON FUNCTION public.invoke_edge_function(text, jsonb, text) IS
  'Invoke a Supabase edge function via pg_net. Used by pg_cron schedules. '
  'When config_key is provided, checks that key in site_config before making the call.';

-- ---------------------------------------------------------------------------
-- 3. Update cron jobs to pass per-source config keys
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Limitless sync: gated by auto_import_limitless_enabled
  PERFORM cron.unschedule('limitless-sync');
  PERFORM cron.schedule(
    'limitless-sync',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"sync"}'::jsonb, 'auto_import_limitless_enabled')$cmd$
  );

  -- Limitless import queue: gated by auto_import_limitless_enabled
  PERFORM cron.unschedule('limitless-import-queue');
  PERFORM cron.schedule(
    'limitless-import-queue',
    '*/15 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"process-queue","batchSize":5}'::jsonb, 'auto_import_limitless_enabled')$cmd$
  );

  -- RK9 worker: gated by auto_import_rk9_enabled
  PERFORM cron.unschedule('rk9-worker');
  PERFORM cron.schedule(
    'rk9-worker',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('rk9-worker', '{}'::jsonb, 'auto_import_rk9_enabled')$cmd$
  );

  RAISE NOTICE 'pg_cron jobs re-scheduled for per-source config keys';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — cron jobs not re-scheduled in this migration';
END $$;
