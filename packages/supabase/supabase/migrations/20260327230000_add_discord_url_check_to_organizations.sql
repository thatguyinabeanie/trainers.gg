-- Add URL format constraint to organizations.discord_invite_url
-- Matches the constraint on organization_requests.discord_invite_url
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_discord_invite_url_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_discord_invite_url_check
  CHECK (discord_invite_url IS NULL OR discord_invite_url ~ '^https?://');
