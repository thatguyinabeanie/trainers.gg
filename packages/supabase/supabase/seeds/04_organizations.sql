-- =============================================================================
-- 04_organizations.sql - Create Organizations and Staff
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-02-03T01:10:30.373Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 03_users.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Organizations
-- -----------------------------------------------------------------------------

INSERT INTO public.communities (
  name, slug, description, status, owner_user_id, tier, subscription_tier
) VALUES (
  'VGC League', 'vgc-league',
  'VGC League - Pokemon VGC Tournament Organization',
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'partner', 'community_plus'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Pallet Town Trainers', 'pallet-town',
  'Pallet Town Trainers - Pokemon VGC Tournament Organization',
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Stellar Novas', 'stellar-novas',
  'An organization that runs tournaments for people who love competitive Pokemon and have done so for over 5 years.',
  '⭐', 'https://discord.gg/stellar-novas',
  '[{"platform": "discord", "url": "https://discord.gg/stellar-novas"}, {"platform": "twitter", "url": "https://x.com/stellarnovas"}, {"platform": "youtube", "url": "https://youtube.com/@stellarnovas"}, {"platform": "twitch", "url": "https://twitch.tv/stellarnovas"}]'::jsonb,
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'partner', 'community_plus'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Hatterene Series', 'hatterene-series',
  'A tournament series and community for women and femme-oriented players.',
  '🎀', 'https://discord.gg/hatterene',
  '[{"platform": "discord", "url": "https://discord.gg/hatterene"}, {"platform": "twitter", "url": "https://x.com/hatterene-series"}]'::jsonb,
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Showdown Academy', 'showdown-academy',
  'Learn competitive Pokemon from the ground up. Weekly workshops, mentoring, and beginner-friendly tournaments on Pokemon Showdown.',
  '📚', 'https://discord.gg/showdown-academy',
  '[{"platform": "discord", "url": "https://discord.gg/showdown-academy"}, {"platform": "youtube", "url": "https://youtube.com/@showdownacademy"}, {"platform": "website", "url": "https://showdownacademy.gg"}]'::jsonb,
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Draft League Central', 'draft-league-central',
  'The home of Pokemon draft leagues. Season-based drafting, weekly matchups, and a thriving community of draft enthusiasts.',
  '📋', 'https://discord.gg/draft-league',
  '[{"platform": "discord", "url": "https://discord.gg/draft-league"}, {"platform": "twitter", "url": "https://x.com/draftleaguecentral"}, {"platform": "reddit", "url": "https://reddit.com/r/draftleague"}]'::jsonb,
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'VGC Latin America', 'vgc-latam',
  'Comunidad de Pokemon VGC para Latinoamérica. Torneos semanales y recursos en español.',
  '🌎', 'https://discord.gg/vgc-latam',
  '[{"platform": "discord", "url": "https://discord.gg/vgc-latam"}, {"platform": "twitter", "url": "https://x.com/vgclatam"}, {"platform": "instagram", "url": "https://instagram.com/vgclatam"}]'::jsonb,
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Nuzlocke Union', 'nuzlocke-union',
  'A community dedicated to Nuzlocke challenges. Share your runs, get tips, and compete in Nuzlocke-themed tournaments.',
  '💀', null,
  '[{"platform": "reddit", "url": "https://reddit.com/r/nuzlocke"}, {"platform": "youtube", "url": "https://youtube.com/@nuzlockeunion"}]'::jsonb,
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Worlds Watch Party', 'worlds-watch-party',
  'Get together to watch Pokemon World Championships and major events. Live commentary, predictions, and community viewing parties.',
  '🏟️', 'https://discord.gg/worlds-watch',
  '[{"platform": "discord", "url": "https://discord.gg/worlds-watch"}, {"platform": "twitch", "url": "https://twitch.tv/worldswatchparty"}]'::jsonb,
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, icon, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Competitive Casual', 'competitive-casual',
  null,
  '🎮', 'https://discord.gg/comp-casual',
  '[{"platform": "discord", "url": "https://discord.gg/comp-casual"}]'::jsonb,
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;


-- -----------------------------------------------------------------------------
-- Organization Staff
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  vgc_league_id bigint;
  pallet_town_id bigint;
BEGIN
  SELECT id INTO vgc_league_id FROM public.communities WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.communities WHERE slug = 'pallet-town';

  -- Add staff members
  INSERT INTO public.community_staff (community_id, user_id) VALUES
    (vgc_league_id, '711a6f78-b52d-dd77-fddb-e13dd02e03cf'),
    (vgc_league_id, '711a6f77-c285-5f8d-dbbc-a4f60e3eee80'),
    (vgc_league_id, '4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0'),
    (vgc_league_id, '4dcc804e-2edb-d817-b078-be77a94933a9'),
    (vgc_league_id, '711a6f7b-d716-7aed-a2fa-caab9020e6bd'),
    (vgc_league_id, '4dcc8033-2a48-bf0b-d1de-16ba448ad8aa'),
    (vgc_league_id, '4dcc802e-3ad2-1f1c-f11f-88befa81bc9d'),
    (vgc_league_id, '4dcc8035-9f28-fdb5-3eec-c6a479b52d6c'),
    (vgc_league_id, '711a6f7c-c4fb-edde-1407-85c76b3b1fa4'),
    (vgc_league_id, '4dcc804b-b5ea-da97-ecf2-ae31acc3b433'),
    (pallet_town_id, '4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad'),
    (pallet_town_id, '4dcc8034-5580-7472-ddeb-a1bca9267ec7'),
    (pallet_town_id, '4dcc804e-2edb-d817-b078-be77a94933a9'),
    (pallet_town_id, '711a6f77-c285-5f8d-dbbc-a4f60e3eee80'),
    (pallet_town_id, '4dcc8031-c592-ed5e-d72e-babcccd820ad'),
    (pallet_town_id, '4dcc802c-ace8-fd41-202f-17c0b62fddab'),
    (pallet_town_id, '711a6f76-2df3-bdaf-f76b-bdebbbefbd78'),
    (pallet_town_id, '4dcc8032-7bb8-dce3-ea5a-fa7d512233e4'),
    (pallet_town_id, '711a6f74-57a0-210c-fa2a-a398dd08dbce'),
    (pallet_town_id, '4dcc802d-9aa2-dbc7-d80d-27eecd967eab')
  ON CONFLICT DO NOTHING;
END $$;
