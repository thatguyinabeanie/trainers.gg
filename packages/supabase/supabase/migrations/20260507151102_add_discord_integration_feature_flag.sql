-- =============================================================================
-- Add discord_integration feature flag
-- =============================================================================
-- Gates the Discord bot integration behind a per-community feature flag.
--
-- When enabled=true, all communities have access.
-- When enabled=false, only communities listed in
-- metadata.allowed_communities have access.
--
-- Admins toggle access per-community via the admin config page.
-- =============================================================================

INSERT INTO public.feature_flags (key, description, enabled, metadata)
VALUES (
  'discord_integration',
  'Controls access to the Discord bot integration per community',
  false,
  '{"allowed_communities": []}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
