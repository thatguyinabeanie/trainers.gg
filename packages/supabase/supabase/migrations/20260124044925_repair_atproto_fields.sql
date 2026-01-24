-- Repair migration: Re-add AT Protocol fields to users table
-- 
-- The original migration 20260123184335_add_atproto_fields.sql was recorded
-- as applied but the columns were not actually created in production.
-- This repair migration ensures the columns exist.

-- Create the enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pds_account_status') THEN
        CREATE TYPE public.pds_account_status AS ENUM (
          'pending',
          'active',
          'failed',
          'suspended'
        );
    END IF;
END $$;

-- Add columns if they don't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS did text UNIQUE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pds_handle text UNIQUE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pds_status public.pds_account_status DEFAULT 'pending';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_did ON public.users(did) WHERE did IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_pds_handle ON public.users(pds_handle) WHERE pds_handle IS NOT NULL;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION public.generate_pds_handle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.pds_handle := lower(NEW.username) || '.trainers.gg';
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_generate_pds_handle ON public.users;
CREATE TRIGGER trg_generate_pds_handle
  BEFORE INSERT OR UPDATE OF username ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_pds_handle();

-- Update existing users to have pds_handle based on their username
UPDATE public.users
SET pds_handle = lower(username) || '.trainers.gg'
WHERE username IS NOT NULL AND pds_handle IS NULL;

-- Add column comments
COMMENT ON COLUMN public.users.did IS 'AT Protocol Decentralized Identifier (did:plc:xxx) - permanent Bluesky identity';
COMMENT ON COLUMN public.users.pds_handle IS 'Full Bluesky handle (username.trainers.gg) - derived from username';
COMMENT ON COLUMN public.users.pds_status IS 'Status of the PDS account: pending, active, failed, suspended';
