-- Add required discord_invite_url column to organization_requests
-- Every org request must include a Discord server invite link
ALTER TABLE public.organization_requests
  ADD COLUMN IF NOT EXISTS discord_invite_url text NOT NULL DEFAULT '';

-- Add URL format constraint
ALTER TABLE public.organization_requests
  ADD CONSTRAINT organization_requests_discord_invite_url_check
  CHECK (discord_invite_url ~ '^https?://');

-- Remove the default now that existing rows are backfilled
ALTER TABLE public.organization_requests
  ALTER COLUMN discord_invite_url DROP DEFAULT;
