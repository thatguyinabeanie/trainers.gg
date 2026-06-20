-- ============================================================================
-- Migration: schedule import-tick crons
--
-- Three pg_cron jobs invoke the import-tick edge function via net.http_post,
-- authenticated with the Vault-stored service_role_key. Reuses the project_url
-- + service_role_key Vault secrets seeded in 20260511202236. All pg_cron work is
-- guarded so local dev (no pg_cron) skips gracefully.
--
--   import-tick-sync     ?stage=sync     every 5 minutes
--   import-tick-import   ?stage=import   every 1 minute
--   import-tick-compile  ?stage=compile  every 2 minutes
--
-- Also unschedules the retired Next.js-route jobs:
--   limitless-sync, limitless-import-queue, rk9-worker, import-queue-cron
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  GRANT USAGE ON SCHEMA cron TO postgres;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — skipping cron setup';
END $$;

-- Ensure the Vault secrets exist (idempotent; mirrors 20260511202236).
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

-- Schedule the three stage jobs (idempotent: unschedule any prior, then create).
DO $$
DECLARE
  v_url  text;
  v_key  text;
  v_body jsonb := '{}'::jsonb;
  v_job  text;
BEGIN
  -- Skip entirely if pg_cron is not installed (local dev without the extension).
  -- A function call into the missing `cron` schema raises invalid_schema_name
  -- (3F000), which the trailing handler's `WHEN undefined_table` (42P01) does NOT
  -- catch — so returning early here is what keeps `db:reset`/`db:start` green
  -- on a cron-less local Postgres image.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed — cron scheduling skipped';
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Remove the retired Next.js-route jobs and any prior import-tick jobs.
  FOR v_job IN
    SELECT unnest(ARRAY[
      'limitless-sync', 'limitless-import-queue', 'rk9-worker', 'import-queue-cron',
      'import-tick-sync', 'import-tick-import', 'import-tick-compile'
    ])
  LOOP
    BEGIN
      PERFORM cron.unschedule(v_job);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'unschedule % skipped: %', v_job, SQLERRM;
    END;
  END LOOP;

  PERFORM cron.schedule(
    'import-tick-sync', '*/5 * * * *',
    format($f$
      SELECT net.http_post(
        url := %L || '/functions/v1/import-tick?stage=sync',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := %L::jsonb
      );
    $f$, v_url, v_key, v_body)
  );

  PERFORM cron.schedule(
    'import-tick-import', '* * * * *',
    format($f$
      SELECT net.http_post(
        url := %L || '/functions/v1/import-tick?stage=import',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := %L::jsonb
      );
    $f$, v_url, v_key, v_body)
  );

  PERFORM cron.schedule(
    'import-tick-compile', '*/2 * * * *',
    format($f$
      SELECT net.http_post(
        url := %L || '/functions/v1/import-tick?stage=compile',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := %L::jsonb
      );
    $f$, v_url, v_key, v_body)
  );

  RAISE NOTICE 'import-tick crons scheduled (sync 5m, import 1m, compile 2m)';
-- Note: this handler is unreachable for the cron-less case — the early RETURN
-- guard above (pg_extension check) exits before any cron.* call when pg_cron is
-- absent. Retained as belt-and-suspenders; the early RETURN is what keeps
-- db:reset/db:start green.
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — cron scheduling skipped';
WHEN OTHERS THEN
  RAISE;
END $$;
