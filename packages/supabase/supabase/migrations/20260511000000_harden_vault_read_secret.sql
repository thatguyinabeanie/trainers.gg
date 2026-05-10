-- Harden vault_read_secret: use immutable search path and restrict execution to service_role
-- This aligns with the existing vault_create_secret hardening pattern

CREATE OR REPLACE FUNCTION public.vault_read_secret(
  secret_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  secret_value text;
BEGIN
  -- Validate input
  IF secret_name IS NULL OR length(secret_name) = 0 THEN
    RAISE EXCEPTION 'secret_name cannot be null or empty';
  END IF;

  IF NOT secret_name ~ '^[a-zA-Z0-9_-]+$' THEN
    RAISE EXCEPTION 'secret_name must contain only alphanumeric characters, underscores, and hyphens';
  END IF;

  -- Read decrypted secret from vault (fully qualified)
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  IF secret_value IS NULL THEN
    RAISE EXCEPTION 'Secret "%" not found', secret_name;
  END IF;

  RETURN secret_value;
END;
$$;

-- Restrict execution to service_role only
REVOKE ALL ON FUNCTION public.vault_read_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_read_secret(text) TO service_role;
