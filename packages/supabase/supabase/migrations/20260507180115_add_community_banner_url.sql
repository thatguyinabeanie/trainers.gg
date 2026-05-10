-- Add banner_url column to communities table for personalized header images
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS banner_url text;

COMMENT ON COLUMN public.communities.banner_url IS 'URL for a community banner/header image uploaded by the owner';
