-- Seed team scraping concurrency config
INSERT INTO public.site_config (key, value)
VALUES ('rk9_team_concurrency', '3'::jsonb)
ON CONFLICT (key) DO NOTHING;
