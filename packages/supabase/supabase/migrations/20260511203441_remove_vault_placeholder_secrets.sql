-- =============================================================================
-- Remove placeholder vault secrets created by 20260511202236
--
-- The prior migration inserted vault entries with placeholders:
--   project_url       = 'http://127.0.0.1:54321'    (local-only)
--   service_role_key  = 'placeholder-replace-in-production'
--
-- Those placeholders break pg_cron in BOTH environments:
--   - Local dev: service_role_key is a placeholder, so edge function 401s.
--   - Production: project_url points to localhost, so HTTP call fails.
--
-- This migration removes ONLY rows whose decrypted value matches the known
-- placeholder, so it is safe to re-run after an admin has updated either
-- secret to a real value.
--
-- After this migration:
--   - Local dev: re-seeded by ./seeds/15_vault_secrets.sql
--   - Production: site_admin must create the secrets via the Supabase
--     dashboard (Project Settings → Vault) before pg_cron jobs can succeed.
-- =============================================================================

DELETE FROM vault.secrets
WHERE id IN (
  SELECT id FROM vault.decrypted_secrets
  WHERE (name = 'project_url'      AND decrypted_secret = 'http://127.0.0.1:54321')
     OR (name = 'service_role_key' AND decrypted_secret = 'placeholder-replace-in-production')
);
