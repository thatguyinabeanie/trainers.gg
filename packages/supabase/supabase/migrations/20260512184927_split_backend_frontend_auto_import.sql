-- Split per-source auto-import into frontend (client-side loop) and backend (pg_cron) toggles.
-- Inherits current values so existing behavior is preserved.

DO $$
DECLARE
  _rk9_val boolean;
  _lim_val boolean;
BEGIN
  SELECT coalesce((value::text)::boolean, false) INTO _rk9_val
  FROM public.site_config WHERE key = 'auto_import_rk9_enabled';
  _rk9_val := coalesce(_rk9_val, false);

  SELECT coalesce((value::text)::boolean, false) INTO _lim_val
  FROM public.site_config WHERE key = 'auto_import_limitless_enabled';
  _lim_val := coalesce(_lim_val, false);

  INSERT INTO public.site_config (key, value)
  VALUES
    ('rk9_frontend_auto_import', to_jsonb(_rk9_val)),
    ('rk9_backend_auto_import', to_jsonb(_rk9_val)),
    ('limitless_frontend_auto_import', to_jsonb(_lim_val)),
    ('limitless_backend_auto_import', to_jsonb(_lim_val))
  ON CONFLICT (key) DO NOTHING;
END $$;

-- Update cron jobs to use backend-specific config keys
DO $$
BEGIN
  PERFORM cron.unschedule('limitless-sync');
  PERFORM cron.schedule(
    'limitless-sync',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"sync"}'::jsonb, 'limitless_backend_auto_import')$cmd$
  );

  PERFORM cron.unschedule('limitless-import-queue');
  PERFORM cron.schedule(
    'limitless-import-queue',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"process-queue","batchSize":20}'::jsonb, 'limitless_backend_auto_import')$cmd$
  );

  PERFORM cron.unschedule('rk9-worker');
  PERFORM cron.schedule(
    'rk9-worker',
    '*/1 * * * *',
    $cmd$SELECT public.invoke_edge_function('rk9-worker', '{"maxTeams":100}'::jsonb, 'rk9_backend_auto_import')$cmd$
  );

  RAISE NOTICE 'cron jobs updated to use backend config keys';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — cron keys not updated in this migration';
END $$;
