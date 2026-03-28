-- Add discord_invite_url to organizations table
-- This stores the Discord invite URL for the community directory / Discord server index.
-- Nullable because existing orgs don't have one yet.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS discord_invite_url text;

-- Index for non-null Discord URLs (used by the community directory page)
CREATE INDEX IF NOT EXISTS idx_organizations_discord_invite_url
  ON public.organizations (discord_invite_url)
  WHERE discord_invite_url IS NOT NULL;
