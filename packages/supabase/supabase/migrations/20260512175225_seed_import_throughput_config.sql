-- Seed runtime-configurable import throughput settings
INSERT INTO public.site_config (key, value)
VALUES
  ('rk9_max_teams_per_tick', '100'::jsonb),
  ('limitless_batch_size', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;
