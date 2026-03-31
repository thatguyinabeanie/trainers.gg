-- =============================================================================
-- 10_tournaments.sql - Create Tournaments, Phases, and Registrations
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-02-03T01:10:30.376Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 03_users.sql, 04_organizations.sql
-- NOTE: All dates use relative expressions (interval offsets from
-- NOW()) so seed data never goes stale.
-- =============================================================================

DO $$
DECLARE
  seed_now timestamptz := NOW();
  vgc_league_id bigint;
  pallet_town_id bigint;
  tournament_1_id bigint;
  tournament_2_id bigint;
  tournament_3_id bigint;
  tournament_4_id bigint;
  tournament_5_id bigint;
  tournament_6_id bigint;
  tournaments_exist boolean;
BEGIN
  -- Check if tournaments already seeded
  SELECT EXISTS(SELECT 1 FROM public.tournaments LIMIT 1) INTO tournaments_exist;
  IF tournaments_exist THEN
    RAISE NOTICE 'Tournaments already exist, skipping';
    RETURN;
  END IF;

  -- Get organization IDs
  SELECT id INTO vgc_league_id FROM public.communities WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.communities WHERE slug = 'pallet-town';

  -- Tournaments batch 1
  INSERT INTO public.tournaments (
    community_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 1 Championship', 'vgc-league-week-01',
    'VGC League tournament for week 1',
    'VGC', 'upcoming',
    (seed_now - interval '2 days 5 hours 11 minutes'), (seed_now - interval '1 days 23 hours 11 minutes'), 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_1_id;

  INSERT INTO public.tournaments (
    community_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 1 Championship', 'pallet-town-week-01',
    'Pallet Town Trainers tournament for week 1',
    'VGC', 'upcoming',
    (seed_now - interval '1 days 5 hours 11 minutes'), (seed_now - interval '23 hours 11 minutes'), 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_2_id;

  INSERT INTO public.tournaments (
    community_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
    , allow_late_registration, check_in_window_minutes, late_check_in_max_round
  ) VALUES (
    vgc_league_id, 'VGC League Week 2 Championship', 'vgc-league-championship-week-02',
    'VGC League tournament for week 2',
    'VGC', 'upcoming',
    (seed_now - interval '3 hours'), (seed_now + interval '5 hours'), NULL,
    'swiss_with_cut', 6, 50, true, 8
    , true, 60, 3
  ) RETURNING id INTO tournament_3_id;

  INSERT INTO public.tournaments (
    community_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
    , allow_late_registration, check_in_window_minutes, late_check_in_max_round
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 2 Championship', 'pallet-town-championship-week-02',
    'Pallet Town Trainers tournament for week 2',
    'VGC', 'upcoming',
    (seed_now - interval '3 hours'), (seed_now + interval '5 hours'), NULL,
    'swiss_with_cut', 6, 50, true, 8
    , true, 60, 3
  ) RETURNING id INTO tournament_4_id;

  INSERT INTO public.tournaments (
    community_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 3 Championship', 'vgc-league-week-03',
    'VGC League tournament for week 3 — check-in open!',
    'VGC', 'upcoming',
    (seed_now + interval '1 hours'), (seed_now + interval '7 hours'), 64,
    'swiss_with_cut', 6, 50, false, 8
  ) RETURNING id INTO tournament_5_id;

  INSERT INTO public.tournaments (
    community_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 3 Championship', 'pallet-town-week-03',
    'Pallet Town Trainers tournament for week 3 — check-in open!',
    'VGC', 'upcoming',
    (seed_now + interval '1 hours'), (seed_now + interval '7 hours'), 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_6_id;


  -- Compute tournament status from dates
  UPDATE public.tournaments SET status = (CASE
    WHEN seed_now < start_date THEN 'upcoming'
    WHEN seed_now < end_date THEN 'active'
    ELSE 'completed'
  END)::tournament_status;

  RAISE NOTICE 'Created 6 tournaments';
END $$;

-- Tournament Phases
DO $$
DECLARE
  t_id bigint;
BEGIN
  -- Phases for: VGC League Week 1 Championship
  SELECT id INTO t_id FROM public.tournaments WHERE slug = 'vgc-league-week-01';
  IF t_id IS NOT NULL THEN
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Swiss Rounds', 1, 'swiss', 'completed',
      3, 50, 5, 5,
      NULL, 5
    ) ON CONFLICT DO NOTHING;
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Top Cut', 2, 'single_elimination', 'completed',
      3, 50, NULL, 2,
      'top-4', 5
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Phases for: Pallet Town Trainers Week 1 Championship
  SELECT id INTO t_id FROM public.tournaments WHERE slug = 'pallet-town-week-01';
  IF t_id IS NOT NULL THEN
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Swiss Rounds', 1, 'swiss', 'completed',
      3, 50, 5, 5,
      NULL, 5
    ) ON CONFLICT DO NOTHING;
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Top Cut', 2, 'single_elimination', 'completed',
      3, 50, NULL, 2,
      'top-4', 5
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Phases for: VGC League Week 2 Championship
  SELECT id INTO t_id FROM public.tournaments WHERE slug = 'vgc-league-championship-week-02';
  IF t_id IS NOT NULL THEN
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Swiss Rounds', 1, 'swiss', 'active',
      3, 50, 6, 0,
      NULL, 5
    ) ON CONFLICT DO NOTHING;
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Top Cut', 2, 'single_elimination', 'pending',
      3, 50, NULL, 0,
      'top-8', 5
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Phases for: Pallet Town Trainers Week 2 Championship
  SELECT id INTO t_id FROM public.tournaments WHERE slug = 'pallet-town-championship-week-02';
  IF t_id IS NOT NULL THEN
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Swiss Rounds', 1, 'swiss', 'active',
      3, 50, 6, 0,
      NULL, 5
    ) ON CONFLICT DO NOTHING;
    INSERT INTO public.tournament_phases (
      tournament_id, name, phase_order, phase_type, status,
      best_of, round_time_minutes, planned_rounds, current_round,
      cut_rule, check_in_time_minutes
    ) VALUES (
      t_id, 'Top Cut', 2, 'single_elimination', 'pending',
      3, 50, NULL, 0,
      'top-8', 5
    ) ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Created phases for 4 tournaments';
END $$;

-- Tournament Registrations
DO $$
DECLARE
  seed_now timestamptz := NOW();
  registrations_exist boolean;
BEGIN
  -- Check if registrations already exist
  SELECT EXISTS(SELECT 1 FROM public.tournament_registrations LIMIT 1) INTO registrations_exist;
  IF registrations_exist THEN
    RAISE NOTICE 'Registrations already exist, skipping';
    RETURN;
  END IF;

  -- Registrations for: VGC League Week 1 Championship (32 players)
  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'khalillarson_schuppe'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'firsthand_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'dominic_kuphal'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'woeful_trainer_243'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'pertinent_trainer_27'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'alyson_stiedemann'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'diamond_kunze75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '3 days 2 hours 15 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      (seed_now - interval '3 days 2 hours 15 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'ash_ketchum'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'joshweimann33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'clint_denesik'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'oswaldo_kling'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'annette20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'multicolored_champio'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'alvertalemke46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'rey_bode55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '3 days 4 hours 41 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      (seed_now - interval '3 days 4 hours 41 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'valentinaklocko65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'bowed_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'jailyn75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'cooperative_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'trusty_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'houston_walter'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'marilie_medhurst82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'cristobalupton55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'enlightened_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'marianamitchell71'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'kamron_kemmer91'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'made_up_trainer_161'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'bart74'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'kasey_jacobi99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'marquis78'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'richardswaniawski20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '6 days 12 hours 58 minutes'),
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      (seed_now - interval '6 days 12 hours 58 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'shaylee16'
  ON CONFLICT DO NOTHING;

  -- Registrations for: Pallet Town Trainers Week 1 Championship (32 players)
  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'frozen_trainer_101'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'nolanlangosh54'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'maiyaabshire82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'purple_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'impossible_trainer_9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'faraway_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'dim_trainer_491'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '2 days 4 hours 41 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      (seed_now - interval '2 days 4 hours 41 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'trentheaney20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'oleflatley25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'eryn_stracke_hand41'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'dirty_trainer_951'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'sincere98'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'quick_witted_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'woeful_trainer_243'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'annette_harber2'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '2 days 4 hours 41 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      (seed_now - interval '2 days 4 hours 41 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'charlotteschoen99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'diamond_kunze75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'gummy_pro'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'monica_crist_fahey79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'savanah33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'lonny_bechtelar49'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'thrifty_trainer_14'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'outstanding_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'shad_williamson9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'alyson_stiedemann'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'westonwilderman14'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'titus_kohler60'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'filthy_trainer_361'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'tressa72'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'dominic_zulauf'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'artfritsch16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '5 days 13 hours 3 minutes'),
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      (seed_now - interval '5 days 13 hours 3 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'irma58'
  ON CONFLICT DO NOTHING;

  -- Registrations for: VGC League Week 2 Championship (63 players)
  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-65'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'frivolous_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-66'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'chaz13'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-67'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'unused_trainer_669'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-68'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'those_trainer_198'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-69'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'lorna_effertz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-70'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'thoramarvin72'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-71'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'big_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-72'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'marquis78'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-73'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'eminent_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-74'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'kamron_kemmer91'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-75'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'defensive_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-76'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'oleflatley25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-77'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'salty_trainer_403'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-78'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'well_to_do_trainer_5'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-79'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'quick_trainer_532'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-80'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'cristobalupton55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-81'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'izabellabeahan79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-82'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jackiebins45'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-83'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'leta_kunde1'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-84'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jeffryyost15'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-85'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ellis_paucek'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-86'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jeraldferry81'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-87'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'norene68'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-88'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'smooth_trainer_36'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-89'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'quincy_pouros90'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-90'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'skylar_bednar'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-91'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'viviane_rempel'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-92'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'houston_walter'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-93'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'shad_williamson9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-94'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'charlotteschoen99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-95'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'amber_reichel25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-96'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'fausto_mraz11'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-97'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jayson63'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-98'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nicola69'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-99'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'titus_kohler60'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-100'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'squeaky_trainer_454'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-101'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ronny_koss27'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-102'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'katrina16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-103'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nervous_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-104'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'marilyne_bogan7'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-105'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nigeljerde94'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-106'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'werner_auer80'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-107'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'hilbert38'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-108'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'lance'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-109'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'sniveling_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-110'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'distinct_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-111'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'vidaboyle57'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-112'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'claudestreich31'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'confirmed'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-113'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'major_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-114'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'rosy_trainer_409'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'confirmed'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-115'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'karen'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-116'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'emiliebednar53'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-117'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'winifred46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-118'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'submissive_trainer_7'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 5 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-119'),
      (seed_now - interval '1 days 5 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ash_ketchum'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'confirmed'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-120'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'novakuhic68'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-121'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'multicolored_champio'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'dropped'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-122'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'frozen_trainer_101'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-123'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'treverhartmann73'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'confirmed'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-124'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'valentinaklocko65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-125'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'alda_rau2'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'dropped'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-126'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'shanelfeeney90'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      NULL,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'dallas56'
  ON CONFLICT DO NOTHING;

  -- Registrations for: Pallet Town Trainers Week 2 Championship (63 players)
  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'those_trainer_198'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'well_to_do_trainer_5'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'eminent_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'incomplete_trainer_6'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'abelardo_konopelski'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'karen'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'blanca13'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'fausto_mraz11'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jacynthe_klein'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'front_trainer_895'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'chad_friesen'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'norene68'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'malvinamitchell24'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'dominic_zulauf'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'broderick40'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sniveling_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'khalillarson_schuppe'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'big_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'oswaldo_kling'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'qualified_trainer_61'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'crooked_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'kayden33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'kenna_beahan'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'cristobalupton55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'marilie_medhurst82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'ornery_trainer_904'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'delectable_trainer_3'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'brilliant_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'fred_pacocha47'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'multicolored_champio'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'twin_trainer_704'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'scornful_trainer_666'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'wicked_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'robin_schultz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'shanie_maggio'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'kasey_jacobi99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'shy_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'shad_williamson9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'squeaky_trainer_454'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'trusting_trainer_973'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'shaylee16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'red'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sally_block33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'westonwilderman14'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'izabellabeahan79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'adela1'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'delilaho_hara84'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'cathrinemosciski_wun'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'treviono_kon17'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'valentinaklocko65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'claudestreich31'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'noted_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'lonny_bechtelar49'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'emiliebednar53'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'janellebradtke25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'lee51'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 5 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      (seed_now - interval '1 days 5 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'admin_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'candid_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'elsie_stroman'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jessicaleannon22'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'krystina_beatty85'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'mariannamacejkovic76'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'domenic_jast43'
  ON CONFLICT DO NOTHING;

  -- Registrations for: VGC League Week 3 Championship (41 players)
  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'thorny_trainer_213'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'dariusschneider93'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'nicola69'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'chance65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'taut_trainer_671'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'easy_trainer_738'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'kasandracronin25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '23 hours 30 minutes'),
      NULL::timestamptz,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      (seed_now - interval '23 hours 30 minutes'),
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'blank_trainer_642'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'ettie_abbott24'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'true_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'frozen_trainer_101'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'nettie_hermiston'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'laurettayundt22'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'sammy_pouros'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'lenore_schulist95'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'nippy_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '23 hours 30 minutes'),
      NULL::timestamptz,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      (seed_now - interval '23 hours 30 minutes'),
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'made_up_trainer_12'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'impossible_trainer_9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'oval_trainer_521'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'ashton_kshlerin'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'major_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'stunning_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'lee51'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'felicia62'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'drab_trainer_487'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'violent_trainer_345'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'mallory39'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'happy_trainer_400'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'titus_kohler60'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'shanelfeeney90'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'annette_harber2'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'jaydeemard34'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'gloomy_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'clevekling88'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'insistent_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'clint_denesik'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'kasey_jacobi99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'overcooked_trainer_5'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'leta_kunde1'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'jazmin_lubowitz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 27 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-03'
      AND a.username = 'ripe_trainer_294'
  ON CONFLICT DO NOTHING;

  -- Registrations for: Pallet Town Trainers Week 3 Championship (20 players)
  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'price45'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'delectable_trainer_3'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'houston_walter'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'enlightened_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'rickylockman29'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'opheliadicki91'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'shaylee16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'artfritsch16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'sneaky_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'ornery_trainer_904'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'leta_kunde1'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'scornful_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'sniveling_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'treverhartmann73'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'faint_trainer_713'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'happy_trainer_400'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'marquis78'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '23 hours 30 minutes'),
      NULL::timestamptz,
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      (seed_now - interval '23 hours 30 minutes'),
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'lance'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'jazmyne80'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'registered'::registration_status,
      (seed_now - interval '4 days 7 hours 32 minutes'),
      NULL::timestamptz,
      NULL::bigint,
      NULL::timestamptz,
      FALSE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-03'
      AND a.username = 'pitiful_elite'
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 251 tournament registrations';
END $$;

-- =========================================================================
-- Admin user tournament data (for dashboard testing)
-- Separate DO block so it runs even when registrations already exist
-- =========================================================================
DO $$
DECLARE
  v_main_id  bigint;
  v_vgc_id   bigint;
  v_draft_id bigint;
  v_team1_id bigint;
  v_team2_id bigint;
  v_team3_id bigint;
  v_round_id bigint;
  v_opp_id   bigint;
  v_won      boolean;
  v_match_id bigint;
BEGIN
  SELECT a.id INTO v_main_id FROM alts a JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = 'admin@trainers.local' AND a.username = 'admin_trainer';
  SELECT a.id INTO v_vgc_id FROM alts a JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = 'admin@trainers.local' AND a.username = 'admin_trainer_vgc';
  SELECT a.id INTO v_draft_id FROM alts a JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = 'admin@trainers.local' AND a.username = 'admin_trainer_draft';

  IF v_main_id IS NULL OR v_vgc_id IS NULL OR v_draft_id IS NULL THEN
    RAISE NOTICE 'Admin alts not found, skipping admin tournament data';
    RETURN;
  END IF;

  -- Skip if admin already has tournament registrations (idempotent)
  IF EXISTS (SELECT 1 FROM tournament_registrations WHERE alt_id = v_vgc_id) THEN
    RAISE NOTICE 'Admin tournament data already exists, skipping';
    RETURN;
  END IF;

  -- -----------------------------------------------------------------------
  -- Rename admin_trainer (main) existing seed teams to something legible
  -- -----------------------------------------------------------------------
  UPDATE teams SET name = 'VGC Goodstuffs' WHERE created_by = v_main_id AND name LIKE 'team-seed-%';

  -- -----------------------------------------------------------------------
  -- Create teams with real competitive Pokemon
  -- -----------------------------------------------------------------------

  -- Team 1: Rain Balance (admin_trainer_vgc)
  INSERT INTO teams (created_by, name) VALUES (v_vgc_id, 'Rain Balance') RETURNING id INTO v_team1_id;

  INSERT INTO pokemon (species, level, nature, ability, held_item, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, tera_type)
  VALUES
    ('Kyogre',               50, 'Modest',   'Drizzle',       'Mystic Water',  'Water Spout',   'Origin Pulse', 'Ice Beam',      'Protect',      4,   0,   0,   252, 0,   252, 'Water'),
    ('Pelipper',             50, 'Bold',     'Drizzle',       'Focus Sash',    'Hurricane',     'Weather Ball', 'Tailwind',      'Protect',      252, 0,   252, 0,   4,   0,   'Flying'),
    ('Rillaboom',            50, 'Adamant',  'Grassy Surge',  'Miracle Seed',  'Grassy Glide',  'Wood Hammer',  'U-turn',        'Fake Out',     252, 252, 0,   0,   0,   4,   'Grass'),
    ('Urshifu-Rapid-Strike', 50, 'Jolly',    'Unseen Fist',   'Choice Band',   'Surging Strikes','Close Combat', 'Aqua Jet',      'Detect',       4,   252, 0,   0,   0,   252, 'Water'),
    ('Tornadus',             50, 'Timid',    'Prankster',     'Covert Cloak',  'Bleakwind Storm','Tailwind',     'Rain Dance',    'Protect',      4,   0,   0,   252, 0,   252, 'Flying'),
    ('Amoonguss',            50, 'Relaxed',  'Regenerator',   'Rocky Helmet',  'Spore',         'Rage Powder',  'Pollen Puff',   'Protect',      252, 0,   252, 0,   4,   0,   'Grass');

  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team1_id, p.id, 1 FROM pokemon p WHERE p.species = 'Kyogre'               AND p.ability = 'Drizzle'      AND p.nature = 'Modest'   AND p.move1 = 'Water Spout'    LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team1_id, p.id, 2 FROM pokemon p WHERE p.species = 'Pelipper'             AND p.ability = 'Drizzle'      AND p.nature = 'Bold'     AND p.move1 = 'Hurricane'      LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team1_id, p.id, 3 FROM pokemon p WHERE p.species = 'Rillaboom'            AND p.ability = 'Grassy Surge' AND p.nature = 'Adamant'  AND p.move1 = 'Grassy Glide'   LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team1_id, p.id, 4 FROM pokemon p WHERE p.species = 'Urshifu-Rapid-Strike' AND p.ability = 'Unseen Fist'  AND p.nature = 'Jolly'    AND p.move1 = 'Surging Strikes' LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team1_id, p.id, 5 FROM pokemon p WHERE p.species = 'Tornadus'             AND p.ability = 'Prankster'    AND p.nature = 'Timid'    AND p.move1 = 'Bleakwind Storm' LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team1_id, p.id, 6 FROM pokemon p WHERE p.species = 'Amoonguss'            AND p.ability = 'Regenerator'  AND p.nature = 'Relaxed'  AND p.move1 = 'Spore'          LIMIT 1 ON CONFLICT DO NOTHING;

  -- Team 2: Sun Room (admin_trainer_vgc)
  INSERT INTO teams (created_by, name) VALUES (v_vgc_id, 'Sun Room') RETURNING id INTO v_team2_id;

  INSERT INTO pokemon (species, level, nature, ability, held_item, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, iv_speed, tera_type)
  VALUES
    ('Koraidon',      50, 'Adamant', 'Orichalcum Pulse', 'Clear Amulet',   'Collision Course', 'Flare Blitz',   'Flame Charge', 'Protect',    4,   252, 0,   0,   0,   252, 31, 'Fire'),
    ('Flutter Mane',  50, 'Timid',   'Protosynthesis',   'Booster Energy', 'Moonblast',        'Shadow Ball',   'Dazzling Gleam','Protect',   4,   0,   0,   252, 0,   252, 31, 'Fairy'),
    ('Incineroar',    50, 'Careful', 'Intimidate',       'Safety Goggles', 'Flare Blitz',      'Fake Out',      'Parting Shot', 'Knock Off',  252, 0,   0,   0,   252, 4,  31, 'Dark'),
    ('Landorus',      50, 'Modest',  'Sheer Force',      'Life Orb',       'Sandsear Storm',   'Earth Power',   'Sludge Bomb',  'Protect',    4,   0,   0,   252, 0,   252, 31, 'Ground'),
    ('Farigiraf',     50, 'Quiet',   'Armor Tail',       'Sitrus Berry',   'Trick Room',       'Psychic',       'Hyper Voice',  'Protect',    252, 0,   4,   252, 0,   0,  0,  'Normal'),
    ('Raging Bolt',   50, 'Modest',  'Protosynthesis',   'Assault Vest',   'Thunderclap',      'Draco Meteor',  'Thunderbolt',  'Calm Mind',  252, 0,   0,   252, 4,   0,  31, 'Electric');

  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team2_id, p.id, 1 FROM pokemon p WHERE p.species = 'Koraidon'     AND p.ability = 'Orichalcum Pulse' AND p.nature = 'Adamant' AND p.move1 = 'Collision Course' LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team2_id, p.id, 2 FROM pokemon p WHERE p.species = 'Flutter Mane' AND p.ability = 'Protosynthesis'   AND p.nature = 'Timid'   AND p.move1 = 'Moonblast'        LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team2_id, p.id, 3 FROM pokemon p WHERE p.species = 'Incineroar'   AND p.ability = 'Intimidate'       AND p.nature = 'Careful' AND p.move1 = 'Flare Blitz'      LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team2_id, p.id, 4 FROM pokemon p WHERE p.species = 'Landorus'     AND p.ability = 'Sheer Force'      AND p.nature = 'Modest'  AND p.move1 = 'Sandsear Storm'   LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team2_id, p.id, 5 FROM pokemon p WHERE p.species = 'Farigiraf'    AND p.ability = 'Armor Tail'       AND p.nature = 'Quiet'   AND p.move1 = 'Trick Room'       LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team2_id, p.id, 6 FROM pokemon p WHERE p.species = 'Raging Bolt'  AND p.ability = 'Protosynthesis'   AND p.nature = 'Modest'  AND p.move1 = 'Thunderclap'      LIMIT 1 ON CONFLICT DO NOTHING;

  -- Team 3: Stall Core (admin_trainer_draft)
  INSERT INTO teams (created_by, name) VALUES (v_draft_id, 'Stall Core') RETURNING id INTO v_team3_id;

  INSERT INTO pokemon (species, level, nature, ability, held_item, move1, move2, move3, move4, ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed, iv_speed, tera_type)
  VALUES
    ('Dondozo',    50, 'Impish',  'Unaware',      'Leftovers',     'Order Up',      'Wave Crash',    'Earthquake',    'Protect',       252, 0,   252, 0,   4,   0,  31, 'Water'),
    ('Tatsugiri',  50, 'Modest',  'Commander',    'Focus Sash',    'Muddy Water',   'Draco Meteor',  'Icy Wind',      'Endure',        4,   0,   0,   252, 0,   252,31, 'Dragon'),
    ('Amoonguss',  50, 'Sassy',   'Regenerator',  'Sitrus Berry',  'Spore',         'Rage Powder',   'Pollen Puff',   'Protect',       252, 0,   4,   0,   252, 0,  0,  'Grass'),
    ('Cresselia',  50, 'Bold',    'Levitate',     'Mental Herb',   'Trick Room',    'Helping Hand',  'Lunar Blessing','Ally Switch',   252, 0,   252, 0,   4,   0,  31, 'Psychic'),
    ('Incineroar', 50, 'Careful', 'Intimidate',   'Safety Goggles','Flare Blitz',   'Fake Out',      'Parting Shot',  'Will-O-Wisp',   252, 0,   0,   0,   252, 4,  31, 'Fire'),
    ('Arcanine',   50, 'Calm',    'Intimidate',   'Assault Vest',  'Flamethrower',  'Snarl',         'Will-O-Wisp',   'Protect',       252, 0,   0,   0,   252, 4,  31, 'Normal');

  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team3_id, p.id, 1 FROM pokemon p WHERE p.species = 'Dondozo'    AND p.ability = 'Unaware'     AND p.nature = 'Impish'  AND p.move1 = 'Order Up'      LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team3_id, p.id, 2 FROM pokemon p WHERE p.species = 'Tatsugiri'  AND p.ability = 'Commander'   AND p.nature = 'Modest'  AND p.move1 = 'Muddy Water'   LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team3_id, p.id, 3 FROM pokemon p WHERE p.species = 'Amoonguss'  AND p.ability = 'Regenerator' AND p.nature = 'Sassy'   AND p.move1 = 'Spore'         LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team3_id, p.id, 4 FROM pokemon p WHERE p.species = 'Cresselia'  AND p.ability = 'Levitate'    AND p.nature = 'Bold'    AND p.move1 = 'Trick Room'    LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team3_id, p.id, 5 FROM pokemon p WHERE p.species = 'Incineroar' AND p.ability = 'Intimidate'  AND p.nature = 'Careful' AND p.move1 = 'Flare Blitz'   LIMIT 1 ON CONFLICT DO NOTHING;
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  SELECT v_team3_id, p.id, 6 FROM pokemon p WHERE p.species = 'Arcanine'   AND p.ability = 'Intimidate'  AND p.nature = 'Calm'    AND p.move1 = 'Flamethrower'  LIMIT 1 ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- Register admin alts in tournaments
  -- -----------------------------------------------------------------------
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id) VALUES (v_vgc_id,   1, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id) VALUES (v_vgc_id,   2, 'checked_in', v_team2_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id) VALUES (v_vgc_id,   3, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status)          VALUES (v_vgc_id,   5, 'registered')              ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id) VALUES (v_main_id,  2, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id) VALUES (v_main_id,  3, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id) VALUES (v_draft_id, 1, 'checked_in', v_team3_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status)          VALUES (v_draft_id, 5, 'registered')              ON CONFLICT DO NOTHING;

  -- -----------------------------------------------------------------------
  -- Create matches — insert as pending, then UPDATE to completed so the
  -- ELO trigger (BEFORE UPDATE OF status) fires correctly.
  -- -----------------------------------------------------------------------

  -- Matches for admin_trainer_vgc in tournament 1
  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = 1 ORDER BY tr.round_number LIMIT 5
  LOOP
    SELECT alt_id INTO v_opp_id
    FROM tournament_registrations
    WHERE tournament_id = 1 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;

    v_won := random() > 0.25;

    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, table_number, start_time)
      VALUES (v_round_id, v_vgc_id, v_opp_id, 'pending', floor(random()*10+1)::int, now() - interval '7 days')
      RETURNING id INTO v_match_id;

      UPDATE tournament_matches SET
        status        = 'completed',
        winner_alt_id = CASE WHEN v_won THEN v_vgc_id   ELSE v_opp_id END,
        game_wins1    = CASE WHEN v_won THEN 2           ELSE floor(random()*2)::int END,
        game_wins2    = CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
        end_time      = now() - interval '7 days' + interval '30 minutes'
      WHERE id = v_match_id;
    END IF;
  END LOOP;

  -- Matches for admin_trainer_vgc in tournament 2
  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = 2 ORDER BY tr.round_number LIMIT 5
  LOOP
    SELECT alt_id INTO v_opp_id
    FROM tournament_registrations
    WHERE tournament_id = 2 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;

    v_won := random() > 0.3;

    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, table_number, start_time)
      VALUES (v_round_id, v_vgc_id, v_opp_id, 'pending', floor(random()*10+1)::int, now() - interval '3 days')
      RETURNING id INTO v_match_id;

      UPDATE tournament_matches SET
        status        = 'completed',
        winner_alt_id = CASE WHEN v_won THEN v_vgc_id   ELSE v_opp_id END,
        game_wins1    = CASE WHEN v_won THEN 2           ELSE floor(random()*2)::int END,
        game_wins2    = CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
        end_time      = now() - interval '3 days' + interval '25 minutes'
      WHERE id = v_match_id;
    END IF;
  END LOOP;

  -- Matches for admin_trainer (main) in tournament 2
  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = 2 ORDER BY tr.round_number LIMIT 5
  LOOP
    SELECT alt_id INTO v_opp_id
    FROM tournament_registrations
    WHERE tournament_id = 2 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;

    v_won := random() > 0.4;

    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, table_number, start_time)
      VALUES (v_round_id, v_main_id, v_opp_id, 'pending', floor(random()*10+1)::int, now() - interval '5 days')
      RETURNING id INTO v_match_id;

      UPDATE tournament_matches SET
        status        = 'completed',
        winner_alt_id = CASE WHEN v_won THEN v_main_id  ELSE v_opp_id END,
        game_wins1    = CASE WHEN v_won THEN 2           ELSE floor(random()*2)::int END,
        game_wins2    = CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
        end_time      = now() - interval '5 days' + interval '20 minutes'
      WHERE id = v_match_id;
    END IF;
  END LOOP;

  -- Matches for admin_trainer_draft in tournament 1
  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = 1 ORDER BY tr.round_number LIMIT 4
  LOOP
    SELECT alt_id INTO v_opp_id
    FROM tournament_registrations
    WHERE tournament_id = 1 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;

    v_won := random() > 0.5;

    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, table_number, start_time)
      VALUES (v_round_id, v_draft_id, v_opp_id, 'pending', floor(random()*10+1)::int, now() - interval '8 days')
      RETURNING id INTO v_match_id;

      UPDATE tournament_matches SET
        status        = 'completed',
        winner_alt_id = CASE WHEN v_won THEN v_draft_id ELSE v_opp_id END,
        game_wins1    = CASE WHEN v_won THEN 2           ELSE floor(random()*2)::int END,
        game_wins2    = CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
        end_time      = now() - interval '8 days' + interval '25 minutes'
      WHERE id = v_match_id;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Player stats (final standings per tournament)
  -- -----------------------------------------------------------------------
  INSERT INTO tournament_player_stats (tournament_id, alt_id, matches_played, match_wins, match_losses, game_wins, game_losses, final_ranking) VALUES
    (1, v_vgc_id,   5, 4, 1, 9, 3,  2),
    (2, v_vgc_id,   5, 3, 2, 7, 5,  5),
    (2, v_main_id,  5, 3, 2, 7, 5,  6),
    (1, v_draft_id, 4, 2, 2, 5, 5, 10)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Admin tournament seed data created: main=%, vgc=%, draft=%', v_main_id, v_vgc_id, v_draft_id;
END $$;
