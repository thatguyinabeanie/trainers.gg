-- ============================================================================
-- Migration: pipeline config — single kill-switch + Limitless batch size
--
-- Replaces the per-source auto_import_* toggles with one global pipeline_enabled
-- master switch, and seeds the runtime-tunable Limitless batch size. Cron
-- schedules are NOT stored here — they live in cron.job and are edited via the
-- alter-cron RPC.
-- ============================================================================

-- 1. Seed the new keys (idempotent — only insert when absent).
INSERT INTO public.site_config (key, value)
VALUES ('pipeline_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_config (key, value)
VALUES ('limitless_import_batch_size', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Retire the per-source flags. They are superseded by pipeline_enabled.
-- These keys are superseded by pipeline_enabled and must NOT be re-seeded.
-- Deleting already-absent rows is a no-op, so this is replay-safe.
DELETE FROM public.site_config
WHERE key IN (
  'auto_import_enabled',
  'rk9_backend_auto_import',
  'limitless_backend_auto_import',
  'rk9_frontend_auto_import',
  'limitless_frontend_auto_import',
  'rk9_cron_interval_seconds',
  'limitless_cron_interval_seconds',
  'rk9_last_run_at',
  'limitless_last_run_at'
);
