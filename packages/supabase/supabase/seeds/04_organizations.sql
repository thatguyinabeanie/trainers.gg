-- =============================================================================
-- 04_organizations.sql - Create Organizations and Staff
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-01-27T23:15:45.542Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 03_users.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Organizations
-- -----------------------------------------------------------------------------

INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier
) VALUES (
  'VGC League', 'vgc-league',
  'VGC League - Pokemon VGC Tournament Organization',
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'partner', 'organization_plus'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Pallet Town Trainers', 'pallet-town',
  'Pallet Town Trainers - Pokemon VGC Tournament Organization',
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'regular', 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Sinnoh Champions', 'sinnoh-champions',
  'Sinnoh Champions - Pokemon VGC Tournament Organization',
  'active', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'verified', 'organization_plus'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Kanto Elite Series', 'kanto-elite',
  'Kanto Elite Series - Pokemon VGC Tournament Organization',
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'verified', 'organization_plus'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organizations (
  name, slug, description, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Johto Masters League', 'johto-masters',
  'Johto Masters League - Pokemon VGC Tournament Organization',
  'active', 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'verified', 'organization_plus'
) ON CONFLICT (slug) DO NOTHING;


-- -----------------------------------------------------------------------------
-- Organization Staff
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  vgc_league_id bigint;
  pallet_town_id bigint;
  sinnoh_champions_id bigint;
  kanto_elite_id bigint;
  johto_masters_id bigint;
BEGIN
  SELECT id INTO vgc_league_id FROM public.organizations WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.organizations WHERE slug = 'pallet-town';
  SELECT id INTO sinnoh_champions_id FROM public.organizations WHERE slug = 'sinnoh-champions';
  SELECT id INTO kanto_elite_id FROM public.organizations WHERE slug = 'kanto-elite';
  SELECT id INTO johto_masters_id FROM public.organizations WHERE slug = 'johto-masters';

  -- Add staff members
  INSERT INTO public.organization_staff (organization_id, user_id) VALUES
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
    (pallet_town_id, '4dcc802d-9aa2-dbc7-d80d-27eecd967eab'),
    (sinnoh_champions_id, '4dcc802d-9aa2-dbc7-d80d-27eecd967eab'),
    (sinnoh_champions_id, '4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8'),
    (sinnoh_champions_id, '4dcc8031-c592-ed5e-d72e-babcccd820ad'),
    (sinnoh_champions_id, '4dcc8034-5580-7472-ddeb-a1bca9267ec7'),
    (sinnoh_champions_id, '711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf'),
    (sinnoh_champions_id, '4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad'),
    (sinnoh_champions_id, '711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef'),
    (sinnoh_champions_id, '711a6f76-2df3-bdaf-f76b-bdebbbefbd78'),
    (sinnoh_champions_id, '711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f'),
    (sinnoh_champions_id, '4dcc804b-b5ea-da97-ecf2-ae31acc3b433'),
    (kanto_elite_id, '4dcc804f-d1a4-d440-ac1b-9b98c34ce85e'),
    (kanto_elite_id, '4dcc804d-efb5-73dc-8ae3-cbd0decfef3c'),
    (kanto_elite_id, '711a6f7a-b4db-bd62-59bc-0b9427e7bf7f'),
    (johto_masters_id, '711a6f7a-b4db-bd62-59bc-0b9427e7bf7f')
  ON CONFLICT DO NOTHING;
END $$;
