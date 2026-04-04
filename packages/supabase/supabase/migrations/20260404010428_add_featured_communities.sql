-- Add featured columns to communities
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer;

-- Clean up tier values: set verified/regular to null
UPDATE public.communities SET tier = NULL WHERE tier IN ('regular', 'verified');

-- Recreate the enum without 'regular' and 'verified'
-- PostgreSQL doesn't support removing enum values directly,
-- so we create a new enum, migrate the column, and drop the old one.
--
-- Drop the column default first — the old default ('regular') can't be cast
-- to the new enum and blocks the ALTER COLUMN TYPE statement.
ALTER TABLE public.communities ALTER COLUMN tier DROP DEFAULT;

ALTER TYPE public.community_tier RENAME TO community_tier_old;
CREATE TYPE public.community_tier AS ENUM ('partner');

ALTER TABLE public.communities
  ALTER COLUMN tier TYPE public.community_tier
  USING (tier::text::public.community_tier);

DROP TYPE public.community_tier_old;

-- Index for featured queries (ordered by featured_order)
CREATE INDEX IF NOT EXISTS idx_communities_featured
  ON public.communities (featured_order ASC)
  WHERE is_featured = true;
