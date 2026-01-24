-- Add AT Protocol / Bluesky fields to users table
-- Every trainers.gg user gets a @username.trainers.gg Bluesky identity

-- Add DID (Decentralized Identifier) - the permanent identity on AT Protocol
-- Format: did:plc:xxxxxxxxxxxxxxxxxxxx
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS did text UNIQUE;

-- Add PDS handle - the full Bluesky handle (username.trainers.gg)
-- This is derived from username but stored for quick lookups
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pds_handle text UNIQUE;

-- Add PDS account status for tracking account creation state
CREATE TYPE public.pds_account_status AS ENUM (
  'pending',      -- Supabase account created, PDS account not yet created
  'active',       -- Both accounts exist and are linked
  'failed',       -- PDS account creation failed (needs retry)
  'suspended'     -- PDS account suspended
);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pds_status public.pds_account_status DEFAULT 'pending';

-- Index for DID lookups (used for AT Protocol operations)
CREATE INDEX IF NOT EXISTS idx_users_did ON public.users(did) WHERE did IS NOT NULL;

-- Index for handle lookups
CREATE INDEX IF NOT EXISTS idx_users_pds_handle ON public.users(pds_handle) WHERE pds_handle IS NOT NULL;

-- Function to generate PDS handle from username
-- Called by trigger when username is set/updated
CREATE OR REPLACE FUNCTION public.generate_pds_handle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generate handle from username (lowercase, append domain)
  IF NEW.username IS NOT NULL THEN
    NEW.pds_handle := lower(NEW.username) || '.trainers.gg';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate pds_handle when username changes
DROP TRIGGER IF EXISTS trg_generate_pds_handle ON public.users;
CREATE TRIGGER trg_generate_pds_handle
  BEFORE INSERT OR UPDATE OF username ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_pds_handle();

-- Update existing users to have pds_handle based on their username
UPDATE public.users
SET pds_handle = lower(username) || '.trainers.gg'
WHERE username IS NOT NULL AND pds_handle IS NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN public.users.did IS 'AT Protocol Decentralized Identifier (did:plc:xxx) - permanent Bluesky identity';
COMMENT ON COLUMN public.users.pds_handle IS 'Full Bluesky handle (username.trainers.gg) - derived from username';
COMMENT ON COLUMN public.users.pds_status IS 'Status of the PDS account: pending, active, failed, suspended';
