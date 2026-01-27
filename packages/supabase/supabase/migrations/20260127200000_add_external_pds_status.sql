-- Add 'external' value to pds_account_status enum
-- This is used for Bluesky OAuth users who already have a PDS account elsewhere
-- (e.g., @username.bsky.social) and don't need one on pds.trainers.gg

ALTER TYPE public.pds_account_status ADD VALUE IF NOT EXISTS 'external';

-- Add comment explaining the enum values
COMMENT ON TYPE public.pds_account_status IS 'PDS account provisioning status:
- pending: Account not yet created (Social OAuth users before onboarding)
- active: Account created on pds.trainers.gg
- failed: Account creation failed
- suspended: Account suspended
- external: User has existing PDS account elsewhere (Bluesky OAuth)';

-- Create a function to store secrets in Vault
-- This is called by edge functions to store PDS passwords securely
CREATE OR REPLACE FUNCTION public.vault_create_secret(
  secret_value text,
  secret_name text,
  secret_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault
AS $$
DECLARE
  secret_id uuid;
BEGIN
  -- Insert the secret into the vault.secrets table
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (secret_value, secret_name, secret_description)
  RETURNING id INTO secret_id;

  RETURN secret_id;
END;
$$;

-- Revoke direct access, only allow via service role
REVOKE ALL ON FUNCTION public.vault_create_secret FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vault_create_secret FROM anon;
REVOKE ALL ON FUNCTION public.vault_create_secret FROM authenticated;

COMMENT ON FUNCTION public.vault_create_secret IS 'Stores a secret in Supabase Vault. Only accessible via service role.';
