-- Add dynamic social_links JSONB column to organizations
-- Replaces the static website_url, discord_url, twitter_url columns
-- Each entry: { "platform": "discord"|"twitter"|"youtube"|"twitch"|"website"|"custom", "url": "https://...", "label": "optional" }

-- 1. Add the new column
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Migrate existing data into social_links
UPDATE public.organizations
SET social_links = (
  SELECT coalesce(jsonb_agg(link ORDER BY link->>'platform'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object('platform', 'website', 'url', website_url) AS link
    WHERE website_url IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object('platform', 'discord', 'url', discord_url)
    WHERE discord_url IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object('platform', 'twitter', 'url', twitter_url)
    WHERE twitter_url IS NOT NULL
  ) AS links
)
WHERE website_url IS NOT NULL
   OR discord_url IS NOT NULL
   OR twitter_url IS NOT NULL;

-- 3. Drop the old columns
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS website_url,
  DROP COLUMN IF EXISTS discord_url,
  DROP COLUMN IF EXISTS twitter_url;

-- 4. Add column description
COMMENT ON COLUMN public.organizations.social_links IS 'JSONB array of social link objects ({platform, url, label?})';
