-- Fire multiple concurrent edge function invocations per cron tick
-- to improve throughput. Each invocation independently picks work.

DO $$
BEGIN
  -- Remove old single-instance jobs
  PERFORM cron.unschedule('limitless-sync');
  PERFORM cron.unschedule('limitless-import-queue');
  PERFORM cron.unschedule('rk9-worker');

  -- Limitless sync: 1 instance every 5 minutes (lightweight API poll)
  PERFORM cron.schedule(
    'limitless-sync',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"sync"}'::jsonb, 'limitless_backend_auto_import')$cmd$
  );

  -- Limitless import queue: 3 concurrent instances every 5 minutes
  PERFORM cron.schedule(
    'limitless-queue-a',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"process-queue","batchSize":20}'::jsonb, 'limitless_backend_auto_import')$cmd$
  );
  PERFORM cron.schedule(
    'limitless-queue-b',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"process-queue","batchSize":20}'::jsonb, 'limitless_backend_auto_import')$cmd$
  );
  PERFORM cron.schedule(
    'limitless-queue-c',
    '*/5 * * * *',
    $cmd$SELECT public.invoke_edge_function('limitless-import', '{"action":"process-queue","batchSize":20}'::jsonb, 'limitless_backend_auto_import')$cmd$
  );

  -- RK9 worker: 3 concurrent instances every minute
  PERFORM cron.schedule(
    'rk9-worker-a',
    '* * * * *',
    $cmd$SELECT public.invoke_edge_function('rk9-worker', '{}'::jsonb, 'rk9_backend_auto_import')$cmd$
  );
  PERFORM cron.schedule(
    'rk9-worker-b',
    '* * * * *',
    $cmd$SELECT public.invoke_edge_function('rk9-worker', '{}'::jsonb, 'rk9_backend_auto_import')$cmd$
  );
  PERFORM cron.schedule(
    'rk9-worker-c',
    '* * * * *',
    $cmd$SELECT public.invoke_edge_function('rk9-worker', '{}'::jsonb, 'rk9_backend_auto_import')$cmd$
  );

  RAISE NOTICE 'concurrent cron jobs scheduled';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — concurrent jobs not scheduled';
END $$;
