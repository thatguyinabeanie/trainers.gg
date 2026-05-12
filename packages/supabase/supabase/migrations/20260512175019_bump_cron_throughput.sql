-- Increase cron throughput:
--   rk9-worker: every 1 min with maxTeams=100 (was every 5 min, fixed 25 teams)
--   limitless-import-queue: every 5 min with batchSize=20 (was every 15 min, batchSize=5)
--   limitless-sync: every 5 min (unchanged)

DO $$
BEGIN
  -- Limitless sync: every 5 minutes (unchanged)
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

  RAISE NOTICE 'pg_cron throughput bumped successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — skipping throughput bump';
END $$;
