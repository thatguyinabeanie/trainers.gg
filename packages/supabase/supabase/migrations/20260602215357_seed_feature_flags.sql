-- Insert known feature flags if they don't exist.
-- Uses ON CONFLICT DO NOTHING so existing enabled/metadata states are preserved
-- (e.g. a flag already toggled on in production won't be reset to false).

INSERT INTO public.feature_flags (key, description, enabled, metadata)
VALUES
  (
    'coaching',
    'Coaching surface — profiles, directory, and the coach badge (per-user allowlist via metadata.allowed_users)',
    false,
    '{"allowed_users": []}'::jsonb
  ),
  (
    'dashboard_stats',
    'Enable Stats & History page (supports per-user allowlist via metadata.allowed_users)',
    false,
    '{"allowed_users": []}'::jsonb
  )
ON CONFLICT (key) DO NOTHING;
