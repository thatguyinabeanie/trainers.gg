-- Seed dynamic cron interval config keys
INSERT INTO public.site_config (key, value)
VALUES
  ('rk9_cron_interval_seconds', '60'::jsonb),
  ('limitless_cron_interval_seconds', '300'::jsonb)
ON CONFLICT (key) DO NOTHING;
