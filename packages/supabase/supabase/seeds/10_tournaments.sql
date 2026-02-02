-- =============================================================================
-- 10_tournaments.sql - Create Tournaments, Phases, and Registrations
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-02-01T23:55:30.237Z
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
  SELECT id INTO vgc_league_id FROM public.organizations WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.organizations WHERE slug = 'pallet-town';

  -- Tournaments batch 1
  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 1 Championship', 'vgc-league-week-01',
    'VGC League tournament for week 1',
    'VGC', 'upcoming',
    (seed_now - interval '8 days 3 hours 56 minutes'), (seed_now - interval '7 days 21 hours 56 minutes'), 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_1_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 1 Championship', 'pallet-town-week-01',
    'Pallet Town Trainers tournament for week 1',
    'VGC', 'upcoming',
    (seed_now - interval '7 days 3 hours 56 minutes'), (seed_now - interval '6 days 21 hours 56 minutes'), 32,
    'swiss_with_cut', 5, 50, false, 4
  ) RETURNING id INTO tournament_2_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    vgc_league_id, 'VGC League Week 2 Championship', 'vgc-league-championship-week-02',
    'VGC League tournament for week 2',
    'VGC', 'upcoming',
    (seed_now - interval '3 hours'), (seed_now + interval '5 hours'), 256,
    'swiss_with_cut', 8, 50, true, 8
  ) RETURNING id INTO tournament_3_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
    start_date, end_date, max_participants,
    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size
  ) VALUES (
    pallet_town_id, 'Pallet Town Trainers Week 2 Championship', 'pallet-town-championship-week-02',
    'Pallet Town Trainers tournament for week 2',
    'VGC', 'upcoming',
    (seed_now - interval '3 hours'), (seed_now + interval '5 hours'), 256,
    'swiss_with_cut', 8, 50, true, 8
  ) RETURNING id INTO tournament_4_id;

  INSERT INTO public.tournaments (
    organization_id, name, slug, description, format, status,
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
    organization_id, name, slug, description, format, status,
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
      3, 50, 8, 0,
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
      3, 50, 8, 0,
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
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-1'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'khalillarson_schuppe'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-2'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'firsthand_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-3'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'dominic_kuphal'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-4'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'woeful_trainer_243'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-5'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'pertinent_trainer_27'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-6'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'alyson_stiedemann'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-7'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'diamond_kunze75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '9 days 1 hours'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-8'),
      (seed_now - interval '9 days 1 hours'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'ash_ketchum'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-9'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'joshweimann33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-10'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'clint_denesik'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-11'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'oswaldo_kling'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-12'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'annette20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-13'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'multicolored_champio'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-14'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'alvertalemke46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-15'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'rey_bode55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '9 days 3 hours 26 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-16'),
      (seed_now - interval '9 days 3 hours 26 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'valentinaklocko65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-17'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'bowed_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-18'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'jailyn75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-19'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'cooperative_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-20'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'trusty_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-21'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'houston_walter'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-22'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'marilie_medhurst82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-23'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'cristobalupton55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-24'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'enlightened_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-25'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'marianamitchell71'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-26'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'kamron_kemmer91'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-27'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'made_up_trainer_161'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-28'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'bart74'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-29'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'kasey_jacobi99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-30'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'marquis78'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-31'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-week-01'
      AND a.username = 'richardswaniawski20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '12 days 11 hours 43 minutes'),
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-32'),
      (seed_now - interval '12 days 11 hours 43 minutes'),
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
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-33'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'frozen_trainer_101'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-34'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'nolanlangosh54'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-35'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'maiyaabshire82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-36'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'purple_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-37'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'impossible_trainer_9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-38'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'faraway_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-39'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'dim_trainer_491'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '8 days 3 hours 26 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-40'),
      (seed_now - interval '8 days 3 hours 26 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'trentheaney20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-41'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'oleflatley25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-42'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'eryn_stracke_hand41'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-43'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'dirty_trainer_951'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-44'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'sincere98'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-45'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'quick_witted_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-46'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'woeful_trainer_243'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-47'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'annette_harber2'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '8 days 3 hours 26 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-48'),
      (seed_now - interval '8 days 3 hours 26 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'charlotteschoen99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-49'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'diamond_kunze75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-50'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'gummy_pro'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-51'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'monica_crist_fahey79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-52'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'savanah33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-53'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'lonny_bechtelar49'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-54'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'thrifty_trainer_14'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-55'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'outstanding_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-56'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'shad_williamson9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-57'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'alyson_stiedemann'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-58'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'westonwilderman14'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-59'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'titus_kohler60'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-60'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'filthy_trainer_361'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-61'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'tressa72'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-62'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'dominic_zulauf'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-63'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'artfritsch16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '11 days 11 hours 48 minutes'),
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-64'),
      (seed_now - interval '11 days 11 hours 48 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-week-01'
      AND a.username = 'irma58'
  ON CONFLICT DO NOTHING;

  -- Registrations for: VGC League Week 2 Championship (256 players)
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
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
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-127'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'dallas56'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-128'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'flo_friesen'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-129'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'overcooked_trainer_5'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-130'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'sally_block33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-131'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'sophieorn25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-132'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'janellebradtke25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-133'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'teagan92'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-134'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'khalillarson_schuppe'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-135'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'cruel_trainer_440'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-136'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'brilliant_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-137'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'chance65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-138'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'delores_orn44'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-139'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'made_up_trainer_12'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-140'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'beloved_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-141'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'coralie_bernhard'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-142'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'fortunate_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-143'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'clint_denesik'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-144'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'fred_pacocha47'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-145'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'katheryn_braun'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-146'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jaydeemard34'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-147'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'robust_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-148'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'brock'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-149'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'quick_witted_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-150'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ashamed_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-151'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'maiya_renner'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-152'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'assuntaschoen_koelpi'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-153'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'brody25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-154'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'sincere98'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-155'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'delta_olson'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-156'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'runny_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-157'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'multicolored_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-158'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'bart74'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-159'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'kayla75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-160'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'happy_trainer_413'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-161'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'garett_bergnaum'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-162'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ashleylueilwitz37'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-163'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'malvinamitchell24'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-164'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'candid_breeder'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-165'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'trusting_trainer_973'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-166'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'entire_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-167'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'annette_harber2'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-168'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'long_trainer_533'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-169'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'rubbery_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-170'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'huge_trainer_672'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-171'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'kiplarkin25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-172'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'dirty_trainer_951'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-173'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'powerless_trainer_33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-174'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'caleighparker77'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-175'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jabari_pagac18'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-176'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'domenic_jast43'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-177'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'vincent_hickle19'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-178'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'early_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-179'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'filthy_trainer_361'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-180'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jaleelstracke93'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-181'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'alyson_stiedemann'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-182'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'marguerite_hintz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-183'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'stunning_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-184'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'faint_trainer_713'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-185'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nettie_hermiston'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-186'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'myrtice66'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-187'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'memorable_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-188'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'rey_bode55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-189'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'johnnievandervort55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-190'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'kasey_jacobi99'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-191'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nella_russel'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-192'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'treviono_kon17'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-193'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'adela1'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-194'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'casimer_baumbach'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-195'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'marilie_medhurst82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-196'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'joshweimann33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-197'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jaeden50'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-198'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'gaston_funk5'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-199'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'total_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-200'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'millie_zieme65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-201'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'dominic_kuphal'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-202'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'courteous_trainer_87'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-203'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'arnoldo81'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-204'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'thorny_trainer_213'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-205'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'kelli_buckridge72'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-206'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'reidstamm21'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-207'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'taut_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-208'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'marianna_stokes'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-209'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'lucy_reilly'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-210'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'felicia62'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-211'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'frequent_trainer_572'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-212'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'lee51'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-213'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ashton_kshlerin'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-214'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'wilhelmmccullough77'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-215'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'practical_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-216'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'sammy_pouros'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-217'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'savanah33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-218'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'rare_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-219'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'easy_trainer_738'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-220'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nolanlangosh54'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-221'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'prime_trainer_706'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-222'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'sigmund_senger46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-223'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'bustling_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-224'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'trusty_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-225'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'substantial_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-226'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'incomplete_trainer_6'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-227'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jazmin_lubowitz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-228'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'richardswaniawski20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-229'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'estell85'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-230'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'krystina_beatty85'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-231'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'parched_trainer_151'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-232'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'irma58'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-233'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'heavy_trainer_256'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-234'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ornery_trainer_904'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-235'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'made_up_trainer_161'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-236'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'michale_orn'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-237'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'oval_trainer_521'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-238'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'blanca13'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-239'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'delectable_trainer_3'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-240'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'diamond_kunze75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-241'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'garricklindgren16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-242'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'shanie_maggio'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-243'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'maiyaabshire82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-244'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'colby_roberts52'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-245'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'artfritsch16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-246'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'arturofahey55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-247'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'laurettayundt22'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-248'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'cathrinemosciski_wun'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-249'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'awful_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-250'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'noted_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-251'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'happy_trainer_400'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-252'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'unselfish_trainer_12'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-253'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nicolaconn45'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-254'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'fake_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-255'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jessicaleannon22'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-256'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'mallory39'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-257'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'dariusschneider93'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-258'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'godfreyjenkins91'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-259'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'overcooked_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-260'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'scottie17'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-261'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ordinary_trainer_36'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-262'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'angelic_trainer_423'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-263'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'lexieerdman24'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-264'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'sneaky_master'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-265'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'francesco_nader66'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-266'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'impossible_trainer_9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-267'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'liquid_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-268'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ella_ratke'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-269'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'elaina_nitzsche'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-270'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'lenore_schulist95'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-271'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'scary_trainer_677'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-272'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'firsthand_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-273'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jermaineharvey25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-274'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'halliefay16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-275'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'pitiful_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-276'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'scornful_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-277'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'dixiesanford87'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-278'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'slushy_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-279'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'adolfomoen96'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-280'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'uncomfortable_traine'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-281'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'chad_friesen'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-282'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'pertinent_trainer_27'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-283'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'mariannamacejkovic76'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-284'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'nippy_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-285'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jailyn75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-286'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'brannonlarkin62'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-287'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'stanley_schneider'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-288'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'laurynbalistreri76'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-289'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'hilma_veum18'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-290'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'faraway_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-291'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'red'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-292'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'monica_crist_fahey79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-293'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'madyson24'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-294'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'jazmyne80'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-295'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'odd_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 5 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-296'),
      (seed_now - interval '1 days 5 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'cynthia'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-297'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'bad_trainer_106'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-298'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'waynegorczany73'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-299'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'unpleasant_pro'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-300'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'bill_pacocha'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-301'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'romaine_homenick'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-302'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'bowed_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-303'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'westonwilderman14'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-304'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'cooperative_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-305'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'foolhardy_trainer_79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-306'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'delilaho_hara84'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-307'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'annette20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-308'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'robin_schultz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-309'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'eryn_stracke_hand41'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-310'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'price45'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-311'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'valentinemiller24'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-312'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ciara_heidenreich33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-313'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'gregorio_schuster_ke'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-314'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'tianna46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-315'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'ivah_mcglynn'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-316'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'pastel_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-317'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'trentheaney20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-318'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'wallace_reichert'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-319'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'violent_trainer_345'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 37 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-320'),
      (seed_now - interval '4 days 10 hours 37 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'vgc-league-championship-week-02'
      AND a.username = 'late_trainer_395'
  ON CONFLICT DO NOTHING;

  -- Registrations for: Pallet Town Trainers Week 2 Championship (256 players)
  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-321'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-322'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-323'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-324'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-325'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-326'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-327'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-328'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-329'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-330'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-331'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-332'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-333'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-334'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-335'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-336'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-337'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-338'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-339'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-340'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-341'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-342'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-343'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-344'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-345'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-346'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-347'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-348'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-349'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-350'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-351'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-352'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-353'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-354'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-355'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-356'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-357'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-358'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-359'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-360'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-361'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-362'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-363'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-364'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-365'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-366'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-367'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-368'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-369'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-370'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-371'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-372'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-373'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-374'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-375'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-376'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-377'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-378'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-379'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-380'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-381'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-382'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-383'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'domenic_jast43'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-384'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'blank_trainer_642'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-385'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'dario_west44'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-386'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'stanley_schneider'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-387'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'heavy_trainer_256'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-388'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'tressa72'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-389'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'shanelfeeney90'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-390'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'frozen_trainer_653'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-391'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'angelic_trainer_423'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-392'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'annette_harber2'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-393'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'alyson_stiedemann'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-394'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'ophelia96'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-395'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'trentheaney20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-396'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'robust_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-397'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jeffryyost15'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-398'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'annette20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-399'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'hildegard_predovic'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-400'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'aliviashields97'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-401'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sorrowful_trainer_13'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-402'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'fortunate_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-403'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'marguerite_hintz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-404'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'wilhelmmccullough77'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-405'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'rare_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-406'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'cooperative_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-407'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'arnoldo81'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-408'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'frequent_trainer_572'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-409'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'long_trainer_533'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-410'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'substantial_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-411'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'clint_denesik'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-412'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'clevekling88'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-413'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'bustling_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-414'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'chaunceyjohnson55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-415'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'scary_trainer_677'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-416'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'alvertalemke46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-417'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'quick_trainer_532'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-418'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'mauricelittel79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-419'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jazmyne80'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-420'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'huge_trainer_672'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-421'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'ciara_heidenreich33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-422'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'odd_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-423'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'soupy_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-424'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'emmittdubuque80'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-425'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'joshweimann33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-426'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'werner_auer80'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-427'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'bad_trainer_106'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-428'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'drab_trainer_487'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-429'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sophieorn25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-430'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'slushy_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-431'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'colorless_trainer_93'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-432'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'marianna_stokes'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-433'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'late_trainer_395'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-434'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'nigeljerde94'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-435'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'kelli_buckridge72'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-436'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'hope_cummerata20'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-437'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'overcooked_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-438'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'michale_orn'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-439'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'dim_trainer_491'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-440'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'alda_rau2'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-441'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'orland_kihn'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-442'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'taut_trainer_671'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-443'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'hilbert38'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-444'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sammy_pouros'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-445'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'eryn_stracke_hand41'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-446'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'quick_witted_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-447'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'tianna46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-448'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'powerless_trainer_33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-449'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'gummy_pro'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-450'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'laurynbalistreri76'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-451'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'entire_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-452'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'millie_zieme65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-453'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'winifred46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-454'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'lucius41'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-455'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'total_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-456'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'woeful_trainer_243'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-457'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'myrtice66'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-458'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'halliefay16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-459'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'katheryn_braun'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-460'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'kayla75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-461'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'lenore_schulist95'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-462'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'well_lit_trainer_814'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-463'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'elaina_nitzsche'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-464'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'johnnievandervort55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-465'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'enlightened_trainer_'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-466'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'scornful_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-467'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'savanah33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-468'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'waynegorczany73'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-469'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jabari_pagac18'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-470'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'delores_orn44'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-471'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'tressie65'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-472'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'purple_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-473'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'overcooked_trainer_5'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-474'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'cyrilfriesen33'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-475'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'flaviedare76'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-476'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'vain_trainer_113'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-477'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'vernie34'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-478'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jailyn75'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-479'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'distinct_breeder'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-480'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'marianamitchell71'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-481'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'defensive_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-482'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'weldon_bergnaum_schu'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-483'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'nervous_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-484'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'leta_kunde1'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-485'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'nolanlangosh54'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-486'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'filthy_trainer_361'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-487'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sincere98'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-488'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'salty_trainer_403'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-489'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'brannonlarkin62'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-490'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'felicia62'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-491'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'oval_trainer_521'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-492'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'enriquebalistreri40'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-493'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'made_up_trainer_161'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-494'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'itzel12'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-495'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'liquid_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-496'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'short_term_elite'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-497'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'thoramarvin72'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-498'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'valentinemiller24'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-499'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'thrifty_trainer_14'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-500'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'price_fay82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-501'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'gloomy_champion'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-502'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'pertinent_trainer_27'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-503'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'carleykerluke47'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-504'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'thorny_trainer_213'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-505'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'ronny_koss27'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-506'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'faraway_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-507'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'kasandracronin25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-508'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'assuntaschoen_koelpi'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-509'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'gregorio_schuster_ke'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-510'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'laurettayundt22'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-511'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'practical_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-512'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'weekly_trainer_641'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-513'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'lance'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-514'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'made_up_trainer_12'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-515'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jaeden50'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-516'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sigmund_senger46'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-517'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'impossible_trainer_9'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-518'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'vidaboyle57'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-519'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'eugene_huel73'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-520'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'colby_roberts52'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at, checked_in_at, team_id, team_submitted_at, team_locked
  )
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-521'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'chaz13'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-522'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jaydeemard34'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-523'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'dixiesanford87'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-524'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'brody25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-525'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'dirty_trainer_951'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-526'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jazmin_lubowitz'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-527'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sick_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-528'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'price45'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-529'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'garricklindgren16'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-530'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'ashtyn_vonrueden'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-531'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'fredrick_hagenes66'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-532'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'bowed_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-533'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'opheliadicki91'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-534'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'godfreyjenkins91'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-535'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'demetrius_gutkowski'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-536'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sneaky_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-537'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'viviane_rempel'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-538'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'violent_trainer_345'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-539'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'flo_friesen'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-540'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'rey_bode55'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-541'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'maiyaabshire82'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 5 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-542'),
      (seed_now - interval '1 days 5 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'ash_ketchum'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-543'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'insistent_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-544'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'casimer_baumbach'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-545'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'scottie17'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-546'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'coralie_bernhard'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-547'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'adolfomoen96'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-548'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'smooth_trainer_36'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-549'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'marquis78'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-550'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'oleflatley25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-551'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'vincent_hickle19'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 5 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-552'),
      (seed_now - interval '1 days 5 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'cynthia'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-553'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'lera_reilly90'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-554'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'monica_crist_fahey79'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-555'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'caleighparker77'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-556'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'sigrid67'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-557'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'neat_ace'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-558'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'trusty_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-559'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'corrupt_trainer'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-560'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'aged_trainer_120'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-561'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'rosy_trainer_409'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-562'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'wilsontrantow30'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-563'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'frivolous_master'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-564'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'jermaineharvey25'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-565'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'dariusschneider93'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-566'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'faint_trainer_713'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-567'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'garett_bergnaum'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '1 days 2 hours 30 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-568'),
      (seed_now - interval '1 days 2 hours 30 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'brown_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-569'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'beloved_leader'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-570'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'delta_olson'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-571'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'uncomfortable_traine'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-572'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'stunning_gym'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-573'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'houston_walter'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-574'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'tatyanahintz44'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-575'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'awful_ranger'
  UNION ALL
  SELECT
      t.id,
      a.id,
      'checked_in'::registration_status,
      (seed_now - interval '4 days 10 hours 43 minutes'),
      (seed_now - interval '3 hours'),
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-576'),
      (seed_now - interval '4 days 10 hours 43 minutes'),
      TRUE
    FROM public.tournaments t, public.alts a
    WHERE t.slug = 'pallet-town-championship-week-02'
      AND a.username = 'ella_ratke'
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-577'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-578'),
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
      (SELECT tm.id FROM public.teams tm WHERE tm.name = 'team-seed-579'),
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

  RAISE NOTICE 'Created 637 tournament registrations';
END $$;
