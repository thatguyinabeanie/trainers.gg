-- Improve vault_create_secret function with input validation
-- This prevents potential issues from empty or malformed inputs

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
  -- Validate inputs
  IF secret_value IS NULL OR length(secret_value) = 0 THEN
    RAISE EXCEPTION 'secret_value cannot be null or empty';
  END IF;
  
  IF secret_name IS NULL OR length(secret_name) = 0 THEN
    RAISE EXCEPTION 'secret_name cannot be null or empty';
  END IF;
  
  -- Validate secret_name format (alphanumeric, underscores, hyphens only)
  IF NOT secret_name ~ '^[a-zA-Z0-9_-]+$' THEN
    RAISE EXCEPTION 'secret_name must contain only alphanumeric characters, underscores, and hyphens';
  END IF;
  
  -- Limit secret_name length to prevent abuse
  IF length(secret_name) > 255 THEN
    RAISE EXCEPTION 'secret_name cannot exceed 255 characters';
  END IF;
  
  -- Limit secret_value length (reasonable limit for passwords/tokens)
  IF length(secret_value) > 4096 THEN
    RAISE EXCEPTION 'secret_value cannot exceed 4096 characters';
  END IF;

  -- Insert the secret into the vault.secrets table
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (secret_value, secret_name, secret_description)
  RETURNING id INTO secret_id;

  RETURN secret_id;
END;
$$;

COMMENT ON FUNCTION public.vault_create_secret IS 'Stores a secret in Supabase Vault with input validation. Only accessible via service role.';
