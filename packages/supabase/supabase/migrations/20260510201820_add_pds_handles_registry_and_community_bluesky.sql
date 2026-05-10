-- PDS Handles Registry & Community Bluesky Identity
-- Creates a shared handle registry for the PDS namespace (users + communities)
-- and adds Bluesky identity columns to the communities table.

-- =============================================================================
-- 1. Create pds_handles registry table
-- =============================================================================
-- Single source of truth for all handles on our PDS.
-- Prevents collisions between user handles and community handles.

CREATE TABLE IF NOT EXISTS public.pds_handles (
  handle text PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('user', 'community')),
  entity_id text NOT NULL,
  did text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enforce 1:1 — each entity can only have one handle
CREATE UNIQUE INDEX IF NOT EXISTS idx_pds_handles_entity_unique
  ON public.pds_handles (entity_type, entity_id);

-- Index for DID lookups
CREATE INDEX IF NOT EXISTS idx_pds_handles_did
  ON public.pds_handles (did) WHERE did IS NOT NULL;

-- Enable RLS
ALTER TABLE public.pds_handles ENABLE ROW LEVEL SECURITY;

-- Anyone can read handles (they're public identities)
DROP POLICY IF EXISTS "Anyone can read handles" ON public.pds_handles;
CREATE POLICY "Anyone can read handles"
  ON public.pds_handles FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert/update/delete (provisioning happens server-side)
-- No INSERT/UPDATE/DELETE policies for authenticated users — only service_role bypasses RLS

-- =============================================================================
-- 2. Add Bluesky identity columns to communities
-- =============================================================================

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS bluesky_did text,
  ADD COLUMN IF NOT EXISTS bluesky_handle text,
  ADD COLUMN IF NOT EXISTS pds_status pds_account_status DEFAULT 'pending'::pds_account_status;

-- Unique constraint on bluesky_did (one DID per community)
CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_bluesky_did
  ON public.communities (bluesky_did) WHERE bluesky_did IS NOT NULL;

-- Unique constraint on bluesky_handle
CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_bluesky_handle
  ON public.communities (bluesky_handle) WHERE bluesky_handle IS NOT NULL;

-- =============================================================================
-- 3. Create vault_read_secret function
-- =============================================================================
-- Reads decrypted secret value from Supabase Vault by name.
-- Only accessible via service role (SECURITY DEFINER with vault search_path).

CREATE OR REPLACE FUNCTION public.vault_read_secret(
  secret_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault
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

  -- Read decrypted secret from vault
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

COMMENT ON FUNCTION public.vault_read_secret IS 'Reads a decrypted secret from Supabase Vault by name. Only accessible via service role.';

-- =============================================================================
-- 4. Backfill pds_handles with existing user handles
-- =============================================================================
-- Populate the registry with existing active user PDS handles

INSERT INTO public.pds_handles (handle, entity_type, entity_id, did, created_at)
SELECT
  u.pds_handle,
  'user',
  u.id::text,
  u.did,
  COALESCE(u.created_at, now())
FROM public.users u
WHERE u.pds_handle IS NOT NULL
  AND u.pds_status = 'active'
ON CONFLICT (handle) DO NOTHING;
