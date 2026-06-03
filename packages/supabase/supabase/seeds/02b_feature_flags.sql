-- =============================================================================
-- 03_feature_flags.sql - Enable Feature Flags for Local Development
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT DO UPDATE
-- Enables all feature flags in local dev so seeded users can access
-- gated features without manual database edits.
-- =============================================================================

INSERT INTO public.feature_flags (key, description, enabled, metadata)
VALUES (
  'team_builder',
  'Controls access to the team builder feature',
  true,
  '{"allowed_users": []}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET enabled = true;

INSERT INTO public.feature_flags (key, description, enabled, metadata)
VALUES (
  'coaching',
  'Controls access to the coaching surface (profiles, directory, coach badge)',
  true,
  '{"allowed_users": []}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET enabled = true;
