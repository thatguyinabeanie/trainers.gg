-- =============================================================================
-- 08_tournaments.sql - Create Tournaments and Registrations
-- =============================================================================
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- Depends on: 04_organizations.sql, 03_users.sql
-- =============================================================================

DO $$
DECLARE
  -- Organization IDs
  vgc_league_id bigint;
  pallet_town_id bigint;
  sinnoh_champs_id bigint;
  
  -- Alt IDs
  ash_alt_id bigint;
  cynthia_alt_id bigint;
  brock_alt_id bigint;
  karen_alt_id bigint;
  red_alt_id bigint;
  
  -- Tournament IDs
  weekly_id bigint;
  monthly_id bigint;
  regional_id bigint;
  friendly_id bigint;
  
  -- Check flag
  tournaments_exist boolean;
BEGIN
  -- Check if tournaments already exist
  SELECT EXISTS(
    SELECT 1 FROM public.tournaments WHERE slug = 'vgc-weekly-42'
  ) INTO tournaments_exist;
  
  IF tournaments_exist THEN
    RAISE NOTICE 'Tournaments already exist, skipping';
    RETURN;
  END IF;

  -- Get organization IDs
  SELECT id INTO vgc_league_id FROM public.organizations WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.organizations WHERE slug = 'pallet-town';
  SELECT id INTO sinnoh_champs_id FROM public.organizations WHERE slug = 'sinnoh-champions';
  
  IF vgc_league_id IS NULL THEN
    RAISE NOTICE 'Organizations not found, skipping tournament creation';
    RETURN;
  END IF;

  -- Get alt IDs
  SELECT id INTO ash_alt_id FROM public.alts WHERE user_id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';
  SELECT id INTO cynthia_alt_id FROM public.alts WHERE user_id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';
  SELECT id INTO brock_alt_id FROM public.alts WHERE user_id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a';
  SELECT id INTO karen_alt_id FROM public.alts WHERE user_id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b';
  SELECT id INTO red_alt_id FROM public.alts WHERE user_id = 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c';

  -- Create tournaments
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC Weekly #42', 'vgc-weekly-42',
    'Weekly VGC tournament. Bo3 Swiss into Top 8 cut.',
    'VGC Regulation G', 'upcoming',
    NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '6 hours',
    NOW() + INTERVAL '2 days', 32,
    'swiss_with_cut', 5, 50, false, NULL
  ) RETURNING id INTO weekly_id;
  
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC Monthly Championship', 'vgc-monthly-jan',
    'Monthly championship series. Top 8 earns Championship Points!',
    'VGC Regulation G', 'active',
    NOW() - INTERVAL '2 hours', NOW() + INTERVAL '6 hours',
    NOW() - INTERVAL '1 day', 64,
    'swiss_with_cut', 6, 50, true, 8
  ) RETURNING id INTO monthly_id;
  
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champs_id, 'Sinnoh Regional Qualifier', 'sinnoh-regional-q1',
    'Qualify for the Sinnoh Regional Championship!',
    'VGC Regulation G', 'completed',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '8 hours',
    NOW() - INTERVAL '8 days', 128,
    'swiss_with_cut', 7, 50, false, NULL
  ) RETURNING id INTO regional_id;
  
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Friendly', 'pallet-friendly-feb',
    'Casual tournament for beginners and experienced players alike!',
    'VGC Regulation G', 'draft',
    NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '4 hours',
    NOW() + INTERVAL '13 days', 16,
    'swiss_only', NULL, 50, false, NULL
  ) RETURNING id INTO friendly_id;

  -- Tournament Registrations for upcoming tournament (Weekly #42)
  INSERT INTO public.tournament_registrations (tournament_id, alt_id, status, team_name) VALUES
    (weekly_id, ash_alt_id, 'registered', 'Kanto Classics'),
    (weekly_id, cynthia_alt_id, 'registered', 'Sinnoh Elite'),
    (weekly_id, brock_alt_id, 'registered', NULL),
    (weekly_id, karen_alt_id, 'pending', NULL);

  -- Registrations for active tournament (Monthly Championship)
  INSERT INTO public.tournament_registrations (tournament_id, alt_id, status, team_name, checked_in_at) VALUES
    (monthly_id, ash_alt_id, 'checked_in', 'Kanto Classics', NOW() - INTERVAL '3 hours'),
    (monthly_id, cynthia_alt_id, 'checked_in', 'Sinnoh Elite', NOW() - INTERVAL '2 hours'),
    (monthly_id, brock_alt_id, 'checked_in', NULL, NOW() - INTERVAL '2 hours'),
    (monthly_id, karen_alt_id, 'checked_in', NULL, NOW() - INTERVAL '1 hour'),
    (monthly_id, red_alt_id, 'checked_in', NULL, NOW() - INTERVAL '30 minutes');

  RAISE NOTICE 'Tournaments and registrations created successfully';
END $$;
