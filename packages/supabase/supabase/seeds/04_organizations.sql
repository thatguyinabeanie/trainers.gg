-- =============================================================================
-- 04_organizations.sql - Create Organizations and Staff
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 03_users.sql (users must exist)
-- =============================================================================

-- Create organizations (idempotent via slug unique constraint)
INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier,
  discord_url, twitter_url, website_url
) VALUES (
  'VGC League', 'vgc-league',
  'Premier Pokemon VGC tournament organization. Weekly locals and monthly championships.',
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'partner', 'organization_plus',
  'https://discord.gg/vgcleague', 'https://twitter.com/vgcleague', 'https://vgcleague.com'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier,
  discord_url, twitter_url, website_url
) VALUES (
  'Pallet Town Trainers', 'pallet-town',
  'A friendly community for trainers from Pallet Town and beyond. Casual and competitive events.',
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'regular', 'free',
  NULL, NULL, NULL
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier,
  discord_url, twitter_url, website_url
) VALUES (
  'Sinnoh Champions', 'sinnoh-champions',
  'Elite tournament series for Sinnoh region trainers. High-level competitive play.',
  'active', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'verified', 'organization_plus',
  'https://discord.gg/sinnoh', NULL, NULL
) ON CONFLICT (slug) DO NOTHING;

-- Add organization staff members
-- Note: Owners are implicitly staff and have all permissions
-- These are additional staff members beyond the owners

DO $$
DECLARE
  vgc_league_id bigint;
  pallet_town_id bigint;
  sinnoh_champs_id bigint;
BEGIN
  -- Look up org IDs by slug
  SELECT id INTO vgc_league_id FROM public.organizations WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.organizations WHERE slug = 'pallet-town';
  SELECT id INTO sinnoh_champs_id FROM public.organizations WHERE slug = 'sinnoh-champions';
  
  -- Exit if orgs don't exist
  IF vgc_league_id IS NULL THEN
    RAISE NOTICE 'Organizations not found, skipping staff creation';
    RETURN;
  END IF;
  
  -- Add staff members (idempotent via unique constraint)
  INSERT INTO public.organization_staff (organization_id, user_id) VALUES
    -- VGC League: Admin (owner) + Ash and Cynthia as staff
    (vgc_league_id, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'), -- Ash
    (vgc_league_id, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'), -- Cynthia
    -- Pallet Town: Ash (owner) + Admin as staff
    (pallet_town_id, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'), -- Admin
    -- Sinnoh Champions: Cynthia (owner) + Admin as staff
    (sinnoh_champs_id, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d') -- Admin
  ON CONFLICT DO NOTHING;
END $$;
