-- =============================================================================
-- 10_tournaments.sql - Create Tournaments, Phases, and Registrations
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-01-27T02:02:03.118Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 03_users.sql, 04_organizations.sql
-- =============================================================================

DO $$
DECLARE
  vgc_league_id bigint;
  pallet_town_id bigint;
  sinnoh_champions_id bigint;
  kanto_elite_id bigint;
  johto_masters_id bigint;
  tournament_1_id bigint;
  tournament_2_id bigint;
  tournament_3_id bigint;
  tournament_4_id bigint;
  tournament_5_id bigint;
  tournament_6_id bigint;
  tournament_7_id bigint;
  tournament_8_id bigint;
  tournament_9_id bigint;
  tournament_10_id bigint;
  tournament_11_id bigint;
  tournament_12_id bigint;
  tournament_13_id bigint;
  tournament_14_id bigint;
  tournament_15_id bigint;
  tournament_16_id bigint;
  tournament_17_id bigint;
  tournament_18_id bigint;
  tournament_19_id bigint;
  tournament_20_id bigint;
  tournament_21_id bigint;
  tournament_22_id bigint;
  tournament_23_id bigint;
  tournament_24_id bigint;
  tournament_25_id bigint;
  tournament_26_id bigint;
  tournament_27_id bigint;
  tournament_28_id bigint;
  tournament_29_id bigint;
  tournament_30_id bigint;
  tournament_31_id bigint;
  tournament_32_id bigint;
  tournament_33_id bigint;
  tournament_34_id bigint;
  tournament_35_id bigint;
  tournament_36_id bigint;
  tournament_37_id bigint;
  tournament_38_id bigint;
  tournament_39_id bigint;
  tournament_40_id bigint;
  tournament_41_id bigint;
  tournament_42_id bigint;
  tournament_43_id bigint;
  tournament_44_id bigint;
  tournament_45_id bigint;
  tournament_46_id bigint;
  tournament_47_id bigint;
  tournament_48_id bigint;
  tournament_49_id bigint;
  tournament_50_id bigint;
  tournaments_exist boolean;
BEGIN
  -- Check if tournaments already seeded
  SELECT EXISTS(SELECT 1 FROM public.tournaments LIMIT 1) INTO tournaments_exist;
  IF tournaments_exist THEN
    RAISE NOTICE 'Tournaments already exist, skipping';
    RETURN;
  END IF;

  -- Get organization IDs
  SELECT id INTO vgc_league_id FROM public.organizations WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.organizations WHERE slug = 'pallet-town';
  SELECT id INTO sinnoh_champions_id FROM public.organizations WHERE slug = 'sinnoh-champions';
  SELECT id INTO kanto_elite_id FROM public.organizations WHERE slug = 'kanto-elite';
  SELECT id INTO johto_masters_id FROM public.organizations WHERE slug = 'johto-masters';

  -- Tournaments batch 1
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 1 Championship', 'vgc-league-week-01',
    'VGC League tournament for week 1',
    'VGC', 'completed',
    '2025-11-08T20:00:00.000Z'::timestamptz, '2025-11-09T02:00:00.000Z'::timestamptz,
    '2025-11-08T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_1_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 1 Practice', 'vgc-league-practice-week-01',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-11-05T01:00:00.000Z'::timestamptz, '2025-11-05T05:00:00.000Z'::timestamptz,
    '2025-11-05T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_2_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 1 Championship', 'pallet-town-week-01',
    'Pallet Town Trainers tournament for week 1',
    'VGC', 'completed',
    '2025-11-09T20:00:00.000Z'::timestamptz, '2025-11-10T02:00:00.000Z'::timestamptz,
    '2025-11-09T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_3_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 1 Practice', 'pallet-town-practice-week-01',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-11-04T01:00:00.000Z'::timestamptz, '2025-11-04T05:00:00.000Z'::timestamptz,
    '2025-11-04T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) RETURNING id INTO tournament_4_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 1 Championship', 'sinnoh-champions-week-01',
    'Sinnoh Champions tournament for week 1',
    'VGC', 'completed',
    '2025-11-07T20:00:00.000Z'::timestamptz, '2025-11-08T02:00:00.000Z'::timestamptz,
    '2025-11-07T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_5_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 1 Practice', 'sinnoh-champions-practice-week-01',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-11-06T01:00:00.000Z'::timestamptz, '2025-11-06T05:00:00.000Z'::timestamptz,
    '2025-11-06T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_6_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 1 Championship', 'kanto-elite-week-01',
    'Kanto Elite Series tournament for week 1',
    'VGC', 'completed',
    '2025-11-06T20:00:00.000Z'::timestamptz, '2025-11-07T02:00:00.000Z'::timestamptz,
    '2025-11-06T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_7_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 1 Practice', 'kanto-elite-practice-week-01',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-11-04T01:00:00.000Z'::timestamptz, '2025-11-04T05:00:00.000Z'::timestamptz,
    '2025-11-04T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_8_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 1 Championship', 'johto-masters-week-01',
    'Johto Masters League tournament for week 1',
    'VGC', 'completed',
    '2025-11-05T20:00:00.000Z'::timestamptz, '2025-11-06T02:00:00.000Z'::timestamptz,
    '2025-11-05T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_9_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 1 Practice', 'johto-masters-practice-week-01',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-11-05T01:00:00.000Z'::timestamptz, '2025-11-05T05:00:00.000Z'::timestamptz,
    '2025-11-05T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_10_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 2 Championship', 'vgc-league-week-02',
    'VGC League tournament for week 2',
    'VGC', 'completed',
    '2025-11-15T20:00:00.000Z'::timestamptz, '2025-11-16T02:00:00.000Z'::timestamptz,
    '2025-11-15T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_11_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 2 Practice', 'vgc-league-practice-week-02',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-11-12T01:00:00.000Z'::timestamptz, '2025-11-12T05:00:00.000Z'::timestamptz,
    '2025-11-12T00:30:00.000Z'::timestamptz, 32,
    'double_elimination', NULL, 50, false, NULL
  ) RETURNING id INTO tournament_12_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 2 Championship', 'pallet-town-week-02',
    'Pallet Town Trainers tournament for week 2',
    'VGC', 'completed',
    '2025-11-16T20:00:00.000Z'::timestamptz, '2025-11-17T02:00:00.000Z'::timestamptz,
    '2025-11-16T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_13_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 2 Practice', 'pallet-town-practice-week-02',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-11-11T01:00:00.000Z'::timestamptz, '2025-11-11T05:00:00.000Z'::timestamptz,
    '2025-11-11T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) RETURNING id INTO tournament_14_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 2 Championship', 'sinnoh-champions-week-02',
    'Sinnoh Champions tournament for week 2',
    'VGC', 'completed',
    '2025-11-14T20:00:00.000Z'::timestamptz, '2025-11-15T02:00:00.000Z'::timestamptz,
    '2025-11-14T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_15_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 2 Practice', 'sinnoh-champions-practice-week-02',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-11-13T01:00:00.000Z'::timestamptz, '2025-11-13T05:00:00.000Z'::timestamptz,
    '2025-11-13T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_16_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 2 Championship', 'kanto-elite-week-02',
    'Kanto Elite Series tournament for week 2',
    'VGC', 'completed',
    '2025-11-13T20:00:00.000Z'::timestamptz, '2025-11-14T02:00:00.000Z'::timestamptz,
    '2025-11-13T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) RETURNING id INTO tournament_17_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 2 Practice', 'kanto-elite-practice-week-02',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-11-11T01:00:00.000Z'::timestamptz, '2025-11-11T05:00:00.000Z'::timestamptz,
    '2025-11-11T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_18_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 2 Championship', 'johto-masters-week-02',
    'Johto Masters League tournament for week 2',
    'VGC', 'completed',
    '2025-11-12T20:00:00.000Z'::timestamptz, '2025-11-13T02:00:00.000Z'::timestamptz,
    '2025-11-12T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_19_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 2 Practice', 'johto-masters-practice-week-02',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-11-12T01:00:00.000Z'::timestamptz, '2025-11-12T05:00:00.000Z'::timestamptz,
    '2025-11-12T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) RETURNING id INTO tournament_20_id;

  -- Tournaments batch 2
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 3 Championship', 'vgc-league-week-03',
    'VGC League tournament for week 3',
    'VGC', 'completed',
    '2025-11-22T20:00:00.000Z'::timestamptz, '2025-11-23T02:00:00.000Z'::timestamptz,
    '2025-11-22T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_21_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 3 Practice', 'vgc-league-practice-week-03',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-11-19T01:00:00.000Z'::timestamptz, '2025-11-19T05:00:00.000Z'::timestamptz,
    '2025-11-19T00:30:00.000Z'::timestamptz, 32,
    'double_elimination', NULL, 50, false, NULL
  ) RETURNING id INTO tournament_22_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 3 Championship', 'pallet-town-week-03',
    'Pallet Town Trainers tournament for week 3',
    'VGC', 'completed',
    '2025-11-23T20:00:00.000Z'::timestamptz, '2025-11-24T02:00:00.000Z'::timestamptz,
    '2025-11-23T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_23_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 3 Practice', 'pallet-town-practice-week-03',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-11-18T01:00:00.000Z'::timestamptz, '2025-11-18T05:00:00.000Z'::timestamptz,
    '2025-11-18T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_24_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 3 Championship', 'sinnoh-champions-week-03',
    'Sinnoh Champions tournament for week 3',
    'VGC', 'completed',
    '2025-11-21T20:00:00.000Z'::timestamptz, '2025-11-22T02:00:00.000Z'::timestamptz,
    '2025-11-21T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_25_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 3 Practice', 'sinnoh-champions-practice-week-03',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-11-20T01:00:00.000Z'::timestamptz, '2025-11-20T05:00:00.000Z'::timestamptz,
    '2025-11-20T00:30:00.000Z'::timestamptz, 32,
    'double_elimination', NULL, 50, false, NULL
  ) RETURNING id INTO tournament_26_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 3 Championship', 'kanto-elite-week-03',
    'Kanto Elite Series tournament for week 3',
    'VGC', 'completed',
    '2025-11-20T20:00:00.000Z'::timestamptz, '2025-11-21T02:00:00.000Z'::timestamptz,
    '2025-11-20T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_27_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 3 Practice', 'kanto-elite-practice-week-03',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-11-18T01:00:00.000Z'::timestamptz, '2025-11-18T05:00:00.000Z'::timestamptz,
    '2025-11-18T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) RETURNING id INTO tournament_28_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 3 Championship', 'johto-masters-week-03',
    'Johto Masters League tournament for week 3',
    'VGC', 'completed',
    '2025-11-19T20:00:00.000Z'::timestamptz, '2025-11-20T02:00:00.000Z'::timestamptz,
    '2025-11-19T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_29_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 3 Practice', 'johto-masters-practice-week-03',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-11-19T01:00:00.000Z'::timestamptz, '2025-11-19T05:00:00.000Z'::timestamptz,
    '2025-11-19T00:30:00.000Z'::timestamptz, 32,
    'swiss_only', 5, 50, false, NULL
  ) RETURNING id INTO tournament_30_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 4 Championship', 'vgc-league-week-04',
    'VGC League tournament for week 4',
    'VGC', 'completed',
    '2025-11-29T20:00:00.000Z'::timestamptz, '2025-11-30T02:00:00.000Z'::timestamptz,
    '2025-11-29T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_31_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 4 Practice', 'vgc-league-practice-week-04',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-11-26T01:00:00.000Z'::timestamptz, '2025-11-26T05:00:00.000Z'::timestamptz,
    '2025-11-26T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_32_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 4 Championship', 'pallet-town-week-04',
    'Pallet Town Trainers tournament for week 4',
    'VGC', 'completed',
    '2025-11-30T20:00:00.000Z'::timestamptz, '2025-12-01T02:00:00.000Z'::timestamptz,
    '2025-11-30T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_33_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 4 Practice', 'pallet-town-practice-week-04',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-11-25T01:00:00.000Z'::timestamptz, '2025-11-25T05:00:00.000Z'::timestamptz,
    '2025-11-25T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) RETURNING id INTO tournament_34_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 4 Championship', 'sinnoh-champions-week-04',
    'Sinnoh Champions tournament for week 4',
    'VGC', 'completed',
    '2025-11-28T20:00:00.000Z'::timestamptz, '2025-11-29T02:00:00.000Z'::timestamptz,
    '2025-11-28T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) RETURNING id INTO tournament_35_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 4 Practice', 'sinnoh-champions-practice-week-04',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-11-27T01:00:00.000Z'::timestamptz, '2025-11-27T05:00:00.000Z'::timestamptz,
    '2025-11-27T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) RETURNING id INTO tournament_36_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 4 Championship', 'kanto-elite-week-04',
    'Kanto Elite Series tournament for week 4',
    'VGC', 'completed',
    '2025-11-27T20:00:00.000Z'::timestamptz, '2025-11-28T02:00:00.000Z'::timestamptz,
    '2025-11-27T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_37_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 4 Practice', 'kanto-elite-practice-week-04',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-11-25T01:00:00.000Z'::timestamptz, '2025-11-25T05:00:00.000Z'::timestamptz,
    '2025-11-25T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) RETURNING id INTO tournament_38_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 4 Championship', 'johto-masters-week-04',
    'Johto Masters League tournament for week 4',
    'VGC', 'completed',
    '2025-11-26T20:00:00.000Z'::timestamptz, '2025-11-27T02:00:00.000Z'::timestamptz,
    '2025-11-26T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_39_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 4 Practice', 'johto-masters-practice-week-04',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-11-26T01:00:00.000Z'::timestamptz, '2025-11-26T05:00:00.000Z'::timestamptz,
    '2025-11-26T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_40_id;

  -- Tournaments batch 3
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 5 Championship', 'vgc-league-week-05',
    'VGC League tournament for week 5',
    'VGC', 'completed',
    '2025-12-06T20:00:00.000Z'::timestamptz, '2025-12-07T02:00:00.000Z'::timestamptz,
    '2025-12-06T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_41_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 5 Practice', 'vgc-league-practice-week-05',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-12-03T01:00:00.000Z'::timestamptz, '2025-12-03T05:00:00.000Z'::timestamptz,
    '2025-12-03T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_42_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 5 Championship', 'pallet-town-week-05',
    'Pallet Town Trainers tournament for week 5',
    'VGC', 'completed',
    '2025-12-07T20:00:00.000Z'::timestamptz, '2025-12-08T02:00:00.000Z'::timestamptz,
    '2025-12-07T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_43_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 5 Practice', 'pallet-town-practice-week-05',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-12-02T01:00:00.000Z'::timestamptz, '2025-12-02T05:00:00.000Z'::timestamptz,
    '2025-12-02T00:30:00.000Z'::timestamptz, 32,
    'double_elimination', NULL, 50, false, NULL
  ) RETURNING id INTO tournament_44_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 5 Championship', 'sinnoh-champions-week-05',
    'Sinnoh Champions tournament for week 5',
    'VGC', 'completed',
    '2025-12-05T20:00:00.000Z'::timestamptz, '2025-12-06T02:00:00.000Z'::timestamptz,
    '2025-12-05T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) RETURNING id INTO tournament_45_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 5 Practice', 'sinnoh-champions-practice-week-05',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-12-04T01:00:00.000Z'::timestamptz, '2025-12-04T05:00:00.000Z'::timestamptz,
    '2025-12-04T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) RETURNING id INTO tournament_46_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 5 Championship', 'kanto-elite-week-05',
    'Kanto Elite Series tournament for week 5',
    'VGC', 'completed',
    '2025-12-04T20:00:00.000Z'::timestamptz, '2025-12-05T02:00:00.000Z'::timestamptz,
    '2025-12-04T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_47_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 5 Practice', 'kanto-elite-practice-week-05',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-12-02T01:00:00.000Z'::timestamptz, '2025-12-02T05:00:00.000Z'::timestamptz,
    '2025-12-02T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_48_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 5 Championship', 'johto-masters-week-05',
    'Johto Masters League tournament for week 5',
    'VGC', 'completed',
    '2025-12-03T20:00:00.000Z'::timestamptz, '2025-12-04T02:00:00.000Z'::timestamptz,
    '2025-12-03T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_49_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 5 Practice', 'johto-masters-practice-week-05',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-12-03T01:00:00.000Z'::timestamptz, '2025-12-03T05:00:00.000Z'::timestamptz,
    '2025-12-03T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) RETURNING id INTO tournament_50_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Championship', 'vgc-league-championship-week-06',
    'VGC League tournament for week 6',
    'VGC', 'completed',
    '2025-12-13T20:00:00.000Z'::timestamptz, '2025-12-14T02:00:00.000Z'::timestamptz,
    '2025-12-13T19:00:00.000Z'::timestamptz, 256,
    'swiss_with_cut', 8, 50, true, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 6 Practice', 'vgc-league-practice-week-06',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-12-10T01:00:00.000Z'::timestamptz, '2025-12-10T05:00:00.000Z'::timestamptz,
    '2025-12-10T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 6 Championship', 'pallet-town-week-06',
    'Pallet Town Trainers tournament for week 6',
    'VGC', 'completed',
    '2025-12-14T20:00:00.000Z'::timestamptz, '2025-12-15T02:00:00.000Z'::timestamptz,
    '2025-12-14T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 6 Practice', 'pallet-town-practice-week-06',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-12-09T01:00:00.000Z'::timestamptz, '2025-12-09T05:00:00.000Z'::timestamptz,
    '2025-12-09T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 6 Championship', 'sinnoh-champions-week-06',
    'Sinnoh Champions tournament for week 6',
    'VGC', 'completed',
    '2025-12-12T20:00:00.000Z'::timestamptz, '2025-12-13T02:00:00.000Z'::timestamptz,
    '2025-12-12T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 6 Practice', 'sinnoh-champions-practice-week-06',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-12-11T01:00:00.000Z'::timestamptz, '2025-12-11T05:00:00.000Z'::timestamptz,
    '2025-12-11T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 6 Championship', 'kanto-elite-week-06',
    'Kanto Elite Series tournament for week 6',
    'VGC', 'completed',
    '2025-12-11T20:00:00.000Z'::timestamptz, '2025-12-12T02:00:00.000Z'::timestamptz,
    '2025-12-11T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 6 Practice', 'kanto-elite-practice-week-06',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-12-09T01:00:00.000Z'::timestamptz, '2025-12-09T05:00:00.000Z'::timestamptz,
    '2025-12-09T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 6 Championship', 'johto-masters-week-06',
    'Johto Masters League tournament for week 6',
    'VGC', 'completed',
    '2025-12-10T20:00:00.000Z'::timestamptz, '2025-12-11T02:00:00.000Z'::timestamptz,
    '2025-12-10T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 6 Practice', 'johto-masters-practice-week-06',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-12-10T01:00:00.000Z'::timestamptz, '2025-12-10T05:00:00.000Z'::timestamptz,
    '2025-12-10T00:30:00.000Z'::timestamptz, 32,
    'double_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  -- Tournaments batch 4
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 7 Championship', 'vgc-league-week-07',
    'VGC League tournament for week 7',
    'VGC', 'completed',
    '2025-12-20T20:00:00.000Z'::timestamptz, '2025-12-21T02:00:00.000Z'::timestamptz,
    '2025-12-20T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 7 Practice', 'vgc-league-practice-week-07',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-12-17T01:00:00.000Z'::timestamptz, '2025-12-17T05:00:00.000Z'::timestamptz,
    '2025-12-17T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 7 Championship', 'pallet-town-week-07',
    'Pallet Town Trainers tournament for week 7',
    'VGC', 'completed',
    '2025-12-21T20:00:00.000Z'::timestamptz, '2025-12-22T02:00:00.000Z'::timestamptz,
    '2025-12-21T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 7 Practice', 'pallet-town-practice-week-07',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-12-16T01:00:00.000Z'::timestamptz, '2025-12-16T05:00:00.000Z'::timestamptz,
    '2025-12-16T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 7 Championship', 'sinnoh-champions-week-07',
    'Sinnoh Champions tournament for week 7',
    'VGC', 'completed',
    '2025-12-19T20:00:00.000Z'::timestamptz, '2025-12-20T02:00:00.000Z'::timestamptz,
    '2025-12-19T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 7 Practice', 'sinnoh-champions-practice-week-07',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-12-18T01:00:00.000Z'::timestamptz, '2025-12-18T05:00:00.000Z'::timestamptz,
    '2025-12-18T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 7 Championship', 'kanto-elite-week-07',
    'Kanto Elite Series tournament for week 7',
    'VGC', 'completed',
    '2025-12-18T20:00:00.000Z'::timestamptz, '2025-12-19T02:00:00.000Z'::timestamptz,
    '2025-12-18T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 7 Practice', 'kanto-elite-practice-week-07',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-12-16T01:00:00.000Z'::timestamptz, '2025-12-16T05:00:00.000Z'::timestamptz,
    '2025-12-16T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 7 Championship', 'johto-masters-week-07',
    'Johto Masters League tournament for week 7',
    'VGC', 'completed',
    '2025-12-17T20:00:00.000Z'::timestamptz, '2025-12-18T02:00:00.000Z'::timestamptz,
    '2025-12-17T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 7 Practice', 'johto-masters-practice-week-07',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-12-17T01:00:00.000Z'::timestamptz, '2025-12-17T05:00:00.000Z'::timestamptz,
    '2025-12-17T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 8 Championship', 'vgc-league-week-08',
    'VGC League tournament for week 8',
    'VGC', 'completed',
    '2025-12-27T20:00:00.000Z'::timestamptz, '2025-12-28T02:00:00.000Z'::timestamptz,
    '2025-12-27T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 8 Practice', 'vgc-league-practice-week-08',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-12-24T01:00:00.000Z'::timestamptz, '2025-12-24T05:00:00.000Z'::timestamptz,
    '2025-12-24T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 8 Championship', 'pallet-town-week-08',
    'Pallet Town Trainers tournament for week 8',
    'VGC', 'completed',
    '2025-12-28T20:00:00.000Z'::timestamptz, '2025-12-29T02:00:00.000Z'::timestamptz,
    '2025-12-28T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 8 Practice', 'pallet-town-practice-week-08',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-12-23T01:00:00.000Z'::timestamptz, '2025-12-23T05:00:00.000Z'::timestamptz,
    '2025-12-23T00:30:00.000Z'::timestamptz, 32,
    'double_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 8 Championship', 'sinnoh-champions-week-08',
    'Sinnoh Champions tournament for week 8',
    'VGC', 'completed',
    '2025-12-26T20:00:00.000Z'::timestamptz, '2025-12-27T02:00:00.000Z'::timestamptz,
    '2025-12-26T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 8 Practice', 'sinnoh-champions-practice-week-08',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2025-12-25T01:00:00.000Z'::timestamptz, '2025-12-25T05:00:00.000Z'::timestamptz,
    '2025-12-25T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 8 Championship', 'kanto-elite-week-08',
    'Kanto Elite Series tournament for week 8',
    'VGC', 'completed',
    '2025-12-25T20:00:00.000Z'::timestamptz, '2025-12-26T02:00:00.000Z'::timestamptz,
    '2025-12-25T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 8 Practice', 'kanto-elite-practice-week-08',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-12-23T01:00:00.000Z'::timestamptz, '2025-12-23T05:00:00.000Z'::timestamptz,
    '2025-12-23T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 8 Championship', 'johto-masters-week-08',
    'Johto Masters League tournament for week 8',
    'VGC', 'completed',
    '2025-12-24T20:00:00.000Z'::timestamptz, '2025-12-25T02:00:00.000Z'::timestamptz,
    '2025-12-24T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 8 Practice', 'johto-masters-practice-week-08',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-12-24T01:00:00.000Z'::timestamptz, '2025-12-24T05:00:00.000Z'::timestamptz,
    '2025-12-24T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  -- Tournaments batch 5
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 9 Championship', 'vgc-league-week-09',
    'VGC League tournament for week 9',
    'VGC', 'completed',
    '2026-01-03T20:00:00.000Z'::timestamptz, '2026-01-04T02:00:00.000Z'::timestamptz,
    '2026-01-03T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 9 Practice', 'vgc-league-practice-week-09',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2025-12-31T01:00:00.000Z'::timestamptz, '2025-12-31T05:00:00.000Z'::timestamptz,
    '2025-12-31T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 9 Championship', 'pallet-town-week-09',
    'Pallet Town Trainers tournament for week 9',
    'VGC', 'completed',
    '2026-01-04T20:00:00.000Z'::timestamptz, '2026-01-05T02:00:00.000Z'::timestamptz,
    '2026-01-04T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 9 Practice', 'pallet-town-practice-week-09',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2025-12-30T01:00:00.000Z'::timestamptz, '2025-12-30T05:00:00.000Z'::timestamptz,
    '2025-12-30T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 9 Championship', 'sinnoh-champions-week-09',
    'Sinnoh Champions tournament for week 9',
    'VGC', 'completed',
    '2026-01-02T20:00:00.000Z'::timestamptz, '2026-01-03T02:00:00.000Z'::timestamptz,
    '2026-01-02T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 9 Practice', 'sinnoh-champions-practice-week-09',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2026-01-01T01:00:00.000Z'::timestamptz, '2026-01-01T05:00:00.000Z'::timestamptz,
    '2026-01-01T00:30:00.000Z'::timestamptz, 32,
    'double_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 9 Championship', 'kanto-elite-week-09',
    'Kanto Elite Series tournament for week 9',
    'VGC', 'completed',
    '2026-01-01T20:00:00.000Z'::timestamptz, '2026-01-02T02:00:00.000Z'::timestamptz,
    '2026-01-01T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 9 Practice', 'kanto-elite-practice-week-09',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2025-12-30T01:00:00.000Z'::timestamptz, '2025-12-30T05:00:00.000Z'::timestamptz,
    '2025-12-30T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 9 Championship', 'johto-masters-week-09',
    'Johto Masters League tournament for week 9',
    'VGC', 'completed',
    '2025-12-31T20:00:00.000Z'::timestamptz, '2026-01-01T02:00:00.000Z'::timestamptz,
    '2025-12-31T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 9 Practice', 'johto-masters-practice-week-09',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2025-12-31T01:00:00.000Z'::timestamptz, '2025-12-31T05:00:00.000Z'::timestamptz,
    '2025-12-31T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 10 Championship', 'vgc-league-week-10',
    'VGC League tournament for week 10',
    'VGC', 'completed',
    '2026-01-10T20:00:00.000Z'::timestamptz, '2026-01-11T02:00:00.000Z'::timestamptz,
    '2026-01-10T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 10 Practice', 'vgc-league-practice-week-10',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2026-01-07T01:00:00.000Z'::timestamptz, '2026-01-07T05:00:00.000Z'::timestamptz,
    '2026-01-07T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 10 Championship', 'pallet-town-week-10',
    'Pallet Town Trainers tournament for week 10',
    'VGC', 'completed',
    '2026-01-11T20:00:00.000Z'::timestamptz, '2026-01-12T02:00:00.000Z'::timestamptz,
    '2026-01-11T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 10 Practice', 'pallet-town-practice-week-10',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2026-01-06T01:00:00.000Z'::timestamptz, '2026-01-06T05:00:00.000Z'::timestamptz,
    '2026-01-06T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Grand Finals', 'sinnoh-champions-championship-week-10',
    'Sinnoh Champions tournament for week 10',
    'VGC', 'completed',
    '2026-01-09T20:00:00.000Z'::timestamptz, '2026-01-10T02:00:00.000Z'::timestamptz,
    '2026-01-09T19:00:00.000Z'::timestamptz, 256,
    'swiss_with_cut', 8, 50, true, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 10 Practice', 'sinnoh-champions-practice-week-10',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2026-01-08T01:00:00.000Z'::timestamptz, '2026-01-08T05:00:00.000Z'::timestamptz,
    '2026-01-08T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 10 Championship', 'kanto-elite-week-10',
    'Kanto Elite Series tournament for week 10',
    'VGC', 'completed',
    '2026-01-08T20:00:00.000Z'::timestamptz, '2026-01-09T02:00:00.000Z'::timestamptz,
    '2026-01-08T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 10 Practice', 'kanto-elite-practice-week-10',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2026-01-06T01:00:00.000Z'::timestamptz, '2026-01-06T05:00:00.000Z'::timestamptz,
    '2026-01-06T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 10 Championship', 'johto-masters-week-10',
    'Johto Masters League tournament for week 10',
    'VGC', 'completed',
    '2026-01-07T20:00:00.000Z'::timestamptz, '2026-01-08T02:00:00.000Z'::timestamptz,
    '2026-01-07T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 10 Practice', 'johto-masters-practice-week-10',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2026-01-07T01:00:00.000Z'::timestamptz, '2026-01-07T05:00:00.000Z'::timestamptz,
    '2026-01-07T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  -- Tournaments batch 6
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 11 Championship', 'vgc-league-week-11',
    'VGC League tournament for week 11',
    'VGC', 'completed',
    '2026-01-17T20:00:00.000Z'::timestamptz, '2026-01-18T02:00:00.000Z'::timestamptz,
    '2026-01-17T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 11 Practice', 'vgc-league-practice-week-11',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2026-01-14T01:00:00.000Z'::timestamptz, '2026-01-14T05:00:00.000Z'::timestamptz,
    '2026-01-14T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 11 Championship', 'pallet-town-week-11',
    'Pallet Town Trainers tournament for week 11',
    'VGC', 'completed',
    '2026-01-18T20:00:00.000Z'::timestamptz, '2026-01-19T02:00:00.000Z'::timestamptz,
    '2026-01-18T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 11 Practice', 'pallet-town-practice-week-11',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2026-01-13T01:00:00.000Z'::timestamptz, '2026-01-13T05:00:00.000Z'::timestamptz,
    '2026-01-13T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 11 Championship', 'sinnoh-champions-week-11',
    'Sinnoh Champions tournament for week 11',
    'VGC', 'completed',
    '2026-01-16T20:00:00.000Z'::timestamptz, '2026-01-17T02:00:00.000Z'::timestamptz,
    '2026-01-16T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 11 Practice', 'sinnoh-champions-practice-week-11',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2026-01-15T01:00:00.000Z'::timestamptz, '2026-01-15T05:00:00.000Z'::timestamptz,
    '2026-01-15T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 11 Championship', 'kanto-elite-week-11',
    'Kanto Elite Series tournament for week 11',
    'VGC', 'completed',
    '2026-01-15T20:00:00.000Z'::timestamptz, '2026-01-16T02:00:00.000Z'::timestamptz,
    '2026-01-15T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 11 Practice', 'kanto-elite-practice-week-11',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2026-01-13T01:00:00.000Z'::timestamptz, '2026-01-13T05:00:00.000Z'::timestamptz,
    '2026-01-13T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 11 Championship', 'johto-masters-week-11',
    'Johto Masters League tournament for week 11',
    'VGC', 'completed',
    '2026-01-14T20:00:00.000Z'::timestamptz, '2026-01-15T02:00:00.000Z'::timestamptz,
    '2026-01-14T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 11 Practice', 'johto-masters-practice-week-11',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2026-01-14T01:00:00.000Z'::timestamptz, '2026-01-14T05:00:00.000Z'::timestamptz,
    '2026-01-14T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 12 Championship', 'vgc-league-week-12',
    'VGC League tournament for week 12',
    'VGC', 'completed',
    '2026-01-24T20:00:00.000Z'::timestamptz, '2026-01-25T02:00:00.000Z'::timestamptz,
    '2026-01-24T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 12 Practice', 'vgc-league-practice-week-12',
    'Practice tournament for VGC League',
    'VGC', 'completed',
    '2026-01-21T01:00:00.000Z'::timestamptz, '2026-01-21T05:00:00.000Z'::timestamptz,
    '2026-01-21T00:30:00.000Z'::timestamptz, 32,
    'single_elimination', NULL, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 12 Championship', 'pallet-town-week-12',
    'Pallet Town Trainers tournament for week 12',
    'VGC', 'completed',
    '2026-01-25T20:00:00.000Z'::timestamptz, '2026-01-26T02:00:00.000Z'::timestamptz,
    '2026-01-25T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 12 Practice', 'pallet-town-practice-week-12',
    'Practice tournament for Pallet Town Trainers',
    'VGC', 'completed',
    '2026-01-20T01:00:00.000Z'::timestamptz, '2026-01-20T05:00:00.000Z'::timestamptz,
    '2026-01-20T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 12 Championship', 'sinnoh-champions-week-12',
    'Sinnoh Champions tournament for week 12',
    'VGC', 'completed',
    '2026-01-23T20:00:00.000Z'::timestamptz, '2026-01-24T02:00:00.000Z'::timestamptz,
    '2026-01-23T19:00:00.000Z'::timestamptz, 64,
    'swiss_with_cut', 6, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    sinnoh_champions_id, 'Sinnoh Champions Week 12 Practice', 'sinnoh-champions-practice-week-12',
    'Practice tournament for Sinnoh Champions',
    'VGC', 'completed',
    '2026-01-22T01:00:00.000Z'::timestamptz, '2026-01-22T05:00:00.000Z'::timestamptz,
    '2026-01-22T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 12 Championship', 'kanto-elite-week-12',
    'Kanto Elite Series tournament for week 12',
    'VGC', 'completed',
    '2026-01-22T20:00:00.000Z'::timestamptz, '2026-01-23T02:00:00.000Z'::timestamptz,
    '2026-01-22T19:00:00.000Z'::timestamptz, 128,
    'swiss_with_cut', 7, 50, false, 8
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    kanto_elite_id, 'Kanto Elite Series Week 12 Practice', 'kanto-elite-practice-week-12',
    'Practice tournament for Kanto Elite Series',
    'VGC', 'completed',
    '2026-01-20T01:00:00.000Z'::timestamptz, '2026-01-20T05:00:00.000Z'::timestamptz,
    '2026-01-20T00:30:00.000Z'::timestamptz, 24,
    'swiss_only', 5, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 12 Championship', 'johto-masters-week-12',
    'Johto Masters League tournament for week 12',
    'VGC', 'completed',
    '2026-01-21T20:00:00.000Z'::timestamptz, '2026-01-22T02:00:00.000Z'::timestamptz,
    '2026-01-21T19:00:00.000Z'::timestamptz, 32,
    'swiss_with_cut', 5, 50, false, 4
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, registration_deadline, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    johto_masters_id, 'Johto Masters League Week 12 Practice', 'johto-masters-practice-week-12',
    'Practice tournament for Johto Masters League',
    'VGC', 'completed',
    '2026-01-21T01:00:00.000Z'::timestamptz, '2026-01-21T05:00:00.000Z'::timestamptz,
    '2026-01-21T00:30:00.000Z'::timestamptz, 16,
    'swiss_only', 4, 50, false, NULL
  ) ON CONFLICT (slug) DO NOTHING;

  -- Note: Only first 50 tournaments have tracked IDs for registrations

  RAISE NOTICE 'Created 120 tournaments';
END $$;
