-- Split auto_import_enabled into per-source toggles:
--   auto_import_rk9_enabled       — controls RK9 cron worker
--   auto_import_limitless_enabled  — controls Limitless sync + import queue
--
-- Migrates existing auto_import_enabled value to both new keys,
-- then removes the old key.

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

