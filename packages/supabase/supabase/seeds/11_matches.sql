-- =============================================================================
-- 11_matches.sql - Create Rounds, Matches, and Games
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-02-03T01:10:30.377Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 10_tournaments.sql
-- Generated: 222 matches, 515 games
-- =============================================================================

DO $$
DECLARE
  seed_now timestamptz := NOW();
  matches_exist boolean;
  phase_id bigint;
  round_id bigint;
BEGIN
  -- Check if matches already exist
  SELECT EXISTS(SELECT 1 FROM public.tournament_matches LIMIT 1) INTO matches_exist;
  IF matches_exist THEN
    RAISE NOTICE 'Matches already exist, skipping';
    RETURN;
  END IF;

  -- Tournament: VGC League Week 1 Championship
  -- Phase: Swiss Rounds
  SELECT p.id INTO phase_id FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE t.slug = 'vgc-league-week-01' AND p.phase_order = 1;
  IF phase_id IS NULL THEN
    RAISE NOTICE 'Phase not found for vgc-league-week-01 order 1';
  ELSE
    -- Round 1
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 1, 'Round 1', 'completed'::phase_status,
      (seed_now - interval '2 days 5 hours 11 minutes'), (seed_now - interval '2 days 4 hours 40 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pertinent_trainer_27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pertinent_trainer_27'),
      2,
      1,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'houston_walter'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'enlightened_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'enlightened_trainer_'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rey_bode55'),
      2,
      1,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_161'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_161'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_kuphal'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_kuphal'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alvertalemke46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alvertalemke46'),
      2,
      1,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      1,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasey_jacobi99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilie_medhurst82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilie_medhurst82'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'khalillarson_schuppe'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_champio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'khalillarson_schuppe'),
      2,
      1,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      0,
      2,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kamron_kemmer91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bart74'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bart74'),
      1,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      0,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'firsthand_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      1,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oswaldo_kling'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bowed_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'joshweimann33'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '2 days 4 hours 21 minutes'), (seed_now - interval '2 days 3 hours 50 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enlightened_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rey_bode55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'enlightened_trainer_'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 4 hours 21 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_161'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasey_jacobi99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_161'),
      2,
      0,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilie_medhurst82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alvertalemke46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alvertalemke46'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pertinent_trainer_27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      1,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bowed_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      0,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'khalillarson_schuppe'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_kuphal'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'khalillarson_schuppe'),
      2,
      0,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianamitchell71'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bart74'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      2,
      0,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shaylee16'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      2,
      1,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jailyn75'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'firsthand_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_champio'),
      2,
      0,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      2,
      1,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kamron_kemmer91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      1,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ash_ketchum'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oswaldo_kling'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'houston_walter'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusty_gym'),
      1,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '2 days 3 hours 31 minutes'), (seed_now - interval '2 days 3 hours')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'richardswaniawski20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bowed_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      1,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 3 hours 31 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enlightened_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_161'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alvertalemke46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'khalillarson_schuppe'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alvertalemke46'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      2,
      1,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      2,
      1,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      0,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oswaldo_kling'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pertinent_trainer_27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pertinent_trainer_27'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilie_medhurst82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_kuphal'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_kuphal'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rey_bode55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rey_bode55'),
      1,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      0,
      2,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bart74'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'joshweimann33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'joshweimann33'),
      0,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'woeful_trainer_243'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ash_ketchum'),
      0,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kamron_kemmer91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kamron_kemmer91'),
      0,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'firsthand_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'firsthand_gym'),
      2,
      0,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cooperative_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette20'),
      0,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '2 days 2 hours 41 minutes'), (seed_now - interval '2 days 2 hours 10 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cristobalupton55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      2,
      1,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 2 hours 41 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bowed_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alvertalemke46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alvertalemke46'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marquis78'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'khalillarson_schuppe'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'khalillarson_schuppe'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enlightened_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      0,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pertinent_trainer_27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      0,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_161'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      0,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_kuphal'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_kuphal'),
      0,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasey_jacobi99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilie_medhurst82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilie_medhurst82'),
      1,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jailyn75'),
      2,
      0,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bart74'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bart74'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kamron_kemmer91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette20'),
      0,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinaklocko65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      0,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'firsthand_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oswaldo_kling'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      0,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'woeful_trainer_243'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'clint_denesik'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clint_denesik'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cooperative_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cooperative_trainer_'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 10 minutes')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '2 days 1 hours 51 minutes'), (seed_now - interval '2 days 1 hours 20 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alvertalemke46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      1,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 1 hours 51 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_kuphal'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_kuphal'),
      2,
      1,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'khalillarson_schuppe'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      1,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bowed_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pertinent_trainer_27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pertinent_trainer_27'),
      2,
      0,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oswaldo_kling'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinaklocko65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      1,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilie_medhurst82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bart74'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilie_medhurst82'),
      2,
      0,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enlightened_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'joshweimann33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'enlightened_trainer_'),
      2,
      1,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jailyn75'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_champio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rey_bode55'),
      2,
      1,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'clint_denesik'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clint_denesik'),
      0,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kamron_kemmer91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kamron_kemmer91'),
      2,
      0,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ash_ketchum'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'firsthand_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ash_ketchum'),
      2,
      0,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'houston_walter'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'houston_walter'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 days 1 hours 50 minutes'),
      (seed_now - interval '2 days 1 hours 20 minutes')
    );
  END IF;

  -- Phase: Top Cut
  SELECT p.id INTO phase_id FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE t.slug = 'vgc-league-week-01' AND p.phase_order = 2;
  IF phase_id IS NULL THEN
    RAISE NOTICE 'Phase not found for vgc-league-week-01 order 2';
  ELSE
    -- Round 1
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 1, 'Round 1', 'completed'::phase_status,
      (seed_now - interval '2 days 5 hours 11 minutes'), (seed_now - interval '2 days 4 hours 40 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shaylee16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oswaldo_kling'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      0,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 5 hours 11 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bowed_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinaklocko65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      1,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'firsthand_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'enlightened_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'enlightened_trainer_'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'khalillarson_schuppe'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ash_ketchum'),
      1,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilie_medhurst82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_champio'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      2,
      1,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bart74'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      0,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianamitchell71'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jailyn75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      2,
      0,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_kuphal'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alvertalemke46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alvertalemke46'),
      1,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pertinent_trainer_27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusty_gym'),
      2,
      1,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_161'),
      0,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'joshweimann33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'joshweimann33'),
      0,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'richardswaniawski20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      2,
      0,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kamron_kemmer91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kamron_kemmer91'),
      1,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cristobalupton55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 days 5 hours 10 minutes'),
      (seed_now - interval '2 days 4 hours 40 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '2 days 4 hours 21 minutes'), (seed_now - interval '2 days 3 hours 50 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oswaldo_kling'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinaklocko65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 4 hours 21 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enlightened_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ash_ketchum'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasey_jacobi99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      1,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 50 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marquis78'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      0,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alvertalemke46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusty_gym'),
      2,
      0,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      1,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kamron_kemmer91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kamron_kemmer91'),
      2,
      0,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 days 4 hours 20 minutes'),
      (seed_now - interval '2 days 3 hours 55 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '2 days 3 hours 31 minutes'), (seed_now - interval '2 days 3 hours 5 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oswaldo_kling'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 3 hours 31 minutes'),
      (seed_now - interval '2 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      1,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      2,
      1,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'richardswaniawski20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kamron_kemmer91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      2,
      1,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 days 3 hours 30 minutes'),
      (seed_now - interval '2 days 3 hours 5 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '2 days 2 hours 41 minutes'), (seed_now - interval '2 days 2 hours 15 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oswaldo_kling'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 2 hours 41 minutes'),
      (seed_now - interval '2 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      1,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 days 2 hours 40 minutes'),
      (seed_now - interval '2 days 2 hours 15 minutes')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '2 days 1 hours 51 minutes'), (seed_now - interval '2 days 1 hours 25 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oswaldo_kling'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      2,
      1,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 days 1 hours 51 minutes'),
      (seed_now - interval '2 days 1 hours 25 minutes')
    );
  END IF;

  -- Tournament: Pallet Town Trainers Week 1 Championship
  -- Phase: Swiss Rounds
  SELECT p.id INTO phase_id FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE t.slug = 'pallet-town-week-01' AND p.phase_order = 1;
  IF phase_id IS NULL THEN
    RAISE NOTICE 'Phase not found for pallet-town-week-01 order 1';
  ELSE
    -- Round 1
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 1, 'Round 1', 'completed'::phase_status,
      (seed_now - interval '1 days 5 hours 11 minutes'), (seed_now - interval '1 days 4 hours 45 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'charlotteschoen99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      0,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      2,
      1,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_zulauf'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gummy_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gummy_pro'),
      1,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'purple_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'purple_champion'),
      0,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressa72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'titus_kohler60'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'titus_kohler60'),
      0,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'outstanding_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      1,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lonny_bechtelar49'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'irma58'),
      0,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'impossible_trainer_9'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oleflatley25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'impossible_trainer_9'),
      2,
      0,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thrifty_trainer_14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thrifty_trainer_14'),
      2,
      0,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiyaabshire82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'woeful_trainer_243'),
      0,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'westonwilderman14'),
      0,
      2,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      1,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_101'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trentheaney20'),
      0,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shad_williamson9'),
      1,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'artfritsch16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'savanah33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_witted_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_witted_leader'),
      1,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '1 days 4 hours 21 minutes'), (seed_now - interval '1 days 3 hours 55 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faraway_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shad_williamson9'),
      0,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 4 hours 21 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'titus_kohler60'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'irma58'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'artfritsch16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'charlotteschoen99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thrifty_trainer_14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thrifty_trainer_14'),
      0,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'woeful_trainer_243'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_witted_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'woeful_trainer_243'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'purple_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gummy_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'purple_champion'),
      2,
      1,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'impossible_trainer_9'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'impossible_trainer_9'),
      2,
      1,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'westonwilderman14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      1,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_101'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette_harber2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette_harber2'),
      0,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressa72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_zulauf'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tressa72'),
      2,
      1,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'savanah33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      1,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'monica_crist_fahey79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'monica_crist_fahey79'),
      1,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      1,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lonny_bechtelar49'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lonny_bechtelar49'),
      2,
      0,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dirty_trainer_951'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'outstanding_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'outstanding_elite'),
      0,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '1 days 3 hours 31 minutes'), (seed_now - interval '1 days 3 hours 5 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thrifty_trainer_14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'impossible_trainer_9'),
      0,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 3 hours 31 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eryn_stracke_hand41'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      2,
      0,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'woeful_trainer_243'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'charlotteschoen99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'woeful_trainer_243'),
      2,
      1,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'purple_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shad_williamson9'),
      0,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'artfritsch16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faraway_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trentheaney20'),
      0,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gummy_pro'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      1,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'titus_kohler60'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_witted_leader'),
      2,
      1,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'outstanding_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tressa72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tressa72'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lonny_bechtelar49'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lonny_bechtelar49'),
      2,
      0,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dim_trainer_491'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette_harber2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nolanlangosh54'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      0,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dirty_trainer_951'),
      0,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frozen_trainer_101'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'filthy_trainer_361'),
      2,
      1,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiyaabshire82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiyaabshire82'),
      2,
      0,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_zulauf'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_zulauf'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '1 days 2 hours 41 minutes'), (seed_now - interval '1 days 2 hours 15 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shad_williamson9'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      0,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 2 hours 41 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'woeful_trainer_243'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'impossible_trainer_9'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'charlotteschoen99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'purple_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      2,
      1,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      0,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trentheaney20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nolanlangosh54'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      0,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'irma58'),
      0,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dim_trainer_491'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thrifty_trainer_14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      2,
      0,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressa72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lonny_bechtelar49'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lonny_bechtelar49'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dirty_trainer_951'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiyaabshire82'),
      1,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'outstanding_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'titus_kohler60'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'outstanding_elite'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_zulauf'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_zulauf'),
      2,
      0,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'artfritsch16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette_harber2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      2,
      0,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gummy_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gummy_pro'),
      0,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oleflatley25'),
      2,
      0,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_101'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      0,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '1 days 1 hours 51 minutes'), (seed_now - interval '1 days 1 hours 25 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eryn_stracke_hand41'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 1 hours 51 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shad_williamson9'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'charlotteschoen99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'irma58'),
      1,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lonny_bechtelar49'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'woeful_trainer_243'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      1,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressa72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiyaabshire82'),
      0,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thrifty_trainer_14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'purple_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'purple_champion'),
      0,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'artfritsch16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_zulauf'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      2,
      0,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gummy_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gummy_pro'),
      1,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'outstanding_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'outstanding_elite'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'titus_kohler60'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'filthy_trainer_361'),
      2,
      0,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'savanah33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      2,
      1,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'westonwilderman14'),
      0,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette_harber2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oleflatley25'),
      2,
      0,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_101'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      1,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 days 1 hours 50 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
  END IF;

  -- Phase: Top Cut
  SELECT p.id INTO phase_id FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE t.slug = 'pallet-town-week-01' AND p.phase_order = 2;
  IF phase_id IS NULL THEN
    RAISE NOTICE 'Phase not found for pallet-town-week-01 order 2';
  ELSE
    -- Round 1
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 1, 'Round 1', 'completed'::phase_status,
      (seed_now - interval '1 days 5 hours 11 minutes'), (seed_now - interval '1 days 4 hours 45 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'irma58'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'irma58'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 5 hours 11 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thrifty_trainer_14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_101'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frozen_trainer_101'),
      2,
      0,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'outstanding_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      0,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'artfritsch16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      1,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lonny_bechtelar49'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'impossible_trainer_9'),
      1,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'charlotteschoen99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tressa72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      2,
      0,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gummy_pro'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trentheaney20'),
      1,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      0,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      1,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'purple_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'monica_crist_fahey79'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_zulauf'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiyaabshire82'),
      0,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_witted_leader'),
      2,
      0,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'woeful_trainer_243'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nolanlangosh54'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      0,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'titus_kohler60'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'savanah33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'filthy_trainer_361'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 days 5 hours 10 minutes'),
      (seed_now - interval '1 days 4 hours 45 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '1 days 4 hours 21 minutes'), (seed_now - interval '1 days 3 hours 55 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'irma58'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      1,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 4 hours 21 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_101'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'artfritsch16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      2,
      0,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'charlotteschoen99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'monica_crist_fahey79'),
      2,
      0,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nolanlangosh54'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_witted_leader'),
      2,
      0,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 days 4 hours 20 minutes'),
      (seed_now - interval '1 days 3 hours 55 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '1 days 3 hours 31 minutes'), (seed_now - interval '1 days 3 hours 5 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      1,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 3 hours 31 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'artfritsch16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'charlotteschoen99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      1,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'monica_crist_fahey79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      1,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      1,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 days 3 hours 30 minutes'),
      (seed_now - interval '1 days 3 hours 5 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '1 days 2 hours 41 minutes'), (seed_now - interval '1 days 2 hours 15 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dim_trainer_491'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'charlotteschoen99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 2 hours 41 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      1,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 days 2 hours 40 minutes'),
      (seed_now - interval '1 days 2 hours 15 minutes')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '1 days 1 hours 51 minutes'), (seed_now - interval '1 days 1 hours 25 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dim_trainer_491'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      0,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 days 1 hours 51 minutes'),
      (seed_now - interval '1 days 1 hours 25 minutes')
    );
  END IF;

  -- Tournament: VGC League Week 2 Championship
  -- Tournament: Pallet Town Trainers Week 2 Championship
  RAISE NOTICE 'Created 20 rounds and 222 matches';
END $$;
