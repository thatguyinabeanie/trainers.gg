-- =============================================================================
-- 15_vault_secrets.sql - Vault Secrets (Local Dev Only)
-- =============================================================================
-- Seeds the vault entries that pg_cron needs to call edge functions locally.
--
-- These values are local-only:
--   - project_url       = local Supabase API gateway
--   - service_role_key  = published supabase-demo JWT (NOT a real secret)
--
-- In production, a site_admin must create these via the Supabase dashboard
-- (Project Settings → Vault). The migration that creates the cron schedules
-- does not insert defaults — missing vault rows cause the cron call to error
-- visibly, which is the desired prod failure mode.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret(
      'http://127.0.0.1:54321',
      'project_url',
      'Local Supabase API gateway URL (seeded; prod must set via dashboard)'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
    -- This is the published supabase-demo service role JWT used by ALL local
    -- Supabase projects. It is NOT a real secret — the value is hardcoded in
    -- the supabase-demo image and documented at supabase.com/docs.
    -- In production, the real service_role_key must be set via the Supabase
    -- dashboard (Project Settings → Vault) and must never be committed.
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      'service_role_key',
      'Local supabase-demo service role JWT (seeded; prod must set via dashboard)'
    );
  END IF;
END $$;
