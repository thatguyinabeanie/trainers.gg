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

  -- Remove the old per-source keys now that they've been copied
  DELETE FROM public.site_config WHERE key IN ('auto_import_rk9_enabled', 'auto_import_limitless_enabled');
END $$;

