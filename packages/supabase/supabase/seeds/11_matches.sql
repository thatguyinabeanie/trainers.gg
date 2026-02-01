-- =============================================================================
-- 11_matches.sql - Create Rounds, Matches, and Games
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-02-01T23:55:30.239Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 10_tournaments.sql
-- Generated: 1246 matches, 2733 games
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
      (seed_now - interval '8 days 3 hours 56 minutes'), (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 28 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '8 days 3 hours 6 minutes'), (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 6 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '8 days 2 hours 16 minutes'), (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 16 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 45 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '8 days 1 hours 26 minutes'), (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 26 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 55 minutes')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '8 days 36 minutes'), (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 36 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 35 minutes'),
      (seed_now - interval '8 days 5 minutes')
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
      (seed_now - interval '8 days 3 hours 56 minutes'), (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 56 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
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
      (seed_now - interval '8 days 3 hours 55 minutes'),
      (seed_now - interval '8 days 3 hours 25 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '8 days 3 hours 6 minutes'), (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 6 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 35 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 40 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 40 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 40 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 40 minutes')
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
      (seed_now - interval '8 days 3 hours 5 minutes'),
      (seed_now - interval '8 days 2 hours 40 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '8 days 2 hours 16 minutes'), (seed_now - interval '8 days 1 hours 50 minutes')
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
      (seed_now - interval '8 days 2 hours 16 minutes'),
      (seed_now - interval '8 days 1 hours 50 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 50 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 50 minutes')
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
      (seed_now - interval '8 days 2 hours 15 minutes'),
      (seed_now - interval '8 days 1 hours 50 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '8 days 1 hours 26 minutes'), (seed_now - interval '8 days 1 hours')
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
      (seed_now - interval '8 days 1 hours 26 minutes'),
      (seed_now - interval '8 days 1 hours')
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
      (seed_now - interval '8 days 1 hours 25 minutes'),
      (seed_now - interval '8 days 1 hours')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '8 days 36 minutes'), (seed_now - interval '8 days 10 minutes')
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
      (seed_now - interval '8 days 36 minutes'),
      (seed_now - interval '8 days 10 minutes')
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
      (seed_now - interval '7 days 3 hours 56 minutes'), (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '7 days 3 hours 6 minutes'), (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 6 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '7 days 2 hours 16 minutes'), (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 16 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '7 days 1 hours 26 minutes'), (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 26 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '7 days 36 minutes'), (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 36 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 35 minutes'),
      (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 3 hours 56 minutes'), (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 56 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
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
      (seed_now - interval '7 days 3 hours 55 minutes'),
      (seed_now - interval '7 days 3 hours 30 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '7 days 3 hours 6 minutes'), (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 6 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
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
      (seed_now - interval '7 days 3 hours 5 minutes'),
      (seed_now - interval '7 days 2 hours 40 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '7 days 2 hours 16 minutes'), (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 16 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
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
      (seed_now - interval '7 days 2 hours 15 minutes'),
      (seed_now - interval '7 days 1 hours 50 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'completed'::phase_status,
      (seed_now - interval '7 days 1 hours 26 minutes'), (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 26 minutes'),
      (seed_now - interval '7 days 1 hours')
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
      (seed_now - interval '7 days 1 hours 25 minutes'),
      (seed_now - interval '7 days 1 hours')
    );
    -- Round 5
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 5, 'Round 5', 'completed'::phase_status,
      (seed_now - interval '7 days 36 minutes'), (seed_now - interval '7 days 10 minutes')
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
      (seed_now - interval '7 days 36 minutes'),
      (seed_now - interval '7 days 10 minutes')
    );
  END IF;

  -- Tournament: VGC League Week 2 Championship
  -- Phase: Swiss Rounds
  SELECT p.id INTO phase_id FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE t.slug = 'vgc-league-championship-week-02' AND p.phase_order = 1;
  IF phase_id IS NULL THEN
    RAISE NOTICE 'Phase not found for vgc-league-championship-week-02 order 1';
  ELSE
    -- Round 1
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 1, 'Round 1', 'completed'::phase_status,
      (seed_now - interval '3 hours'), (seed_now - interval '2 hours 33 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilyne_bogan7'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'assuntaschoen_koelpi'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilyne_bogan7'),
      2,
      1,
      'completed'::phase_status,
      1,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bustling_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_champio'),
      2,
      1,
      'completed'::phase_status,
      2,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nicolaconn45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marguerite_hintz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marguerite_hintz'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'romaine_homenick'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'janellebradtke25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'romaine_homenick'),
      2,
      1,
      'completed'::phase_status,
      4,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lance'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'runny_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lance'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'candid_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adolfomoen96'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'adolfomoen96'),
      0,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'houston_walter'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'houston_walter'),
      2,
      0,
      'completed'::phase_status,
      7,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'domenic_jast43'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_kuphal'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'domenic_jast43'),
      2,
      1,
      'completed'::phase_status,
      8,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'katheryn_braun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adela1'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katheryn_braun'),
      2,
      0,
      'completed'::phase_status,
      9,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'vincent_hickle19'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stanley_schneider'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stanley_schneider'),
      1,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashleylueilwitz37'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiya_renner'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiya_renner'),
      1,
      2,
      'completed'::phase_status,
      11,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'caleighparker77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'treviono_kon17'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'caleighparker77'),
      2,
      0,
      'completed'::phase_status,
      12,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clint_denesik'),
      2,
      0,
      'completed'::phase_status,
      13,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'distinct_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scary_trainer_677'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'distinct_breeder'),
      2,
      0,
      'completed'::phase_status,
      14,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilie_medhurst82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eminent_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eminent_ranger'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'taut_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lorna_effertz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lorna_effertz'),
      1,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jaydeemard34'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'flo_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jaydeemard34'),
      2,
      1,
      'completed'::phase_status,
      17,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pastel_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'odd_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pastel_gym'),
      2,
      0,
      'completed'::phase_status,
      18,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marquis78'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'amber_reichel25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      2,
      0,
      'completed'::phase_status,
      19,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'parched_trainer_151'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'artfritsch16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'parched_trainer_151'),
      2,
      0,
      'completed'::phase_status,
      20,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sniveling_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chaz13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chaz13'),
      0,
      2,
      'completed'::phase_status,
      21,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'arnoldo81'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'blanca13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blanca13'),
      0,
      2,
      'completed'::phase_status,
      22,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delilaho_hara84'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinemiller24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delilaho_hara84'),
      2,
      1,
      'completed'::phase_status,
      23,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faint_trainer_713'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ronny_koss27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ronny_koss27'),
      0,
      2,
      'completed'::phase_status,
      24,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jaeden50'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'prime_trainer_706'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'prime_trainer_706'),
      1,
      2,
      'completed'::phase_status,
      25,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'submissive_trainer_7'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brannonlarkin62'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brannonlarkin62'),
      1,
      2,
      'completed'::phase_status,
      26,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ornery_trainer_904'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'emiliebednar53'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'emiliebednar53'),
      0,
      2,
      'completed'::phase_status,
      27,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rare_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brilliant_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rare_master'),
      2,
      0,
      'completed'::phase_status,
      28,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jayson63'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'estell85'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jayson63'),
      2,
      1,
      'completed'::phase_status,
      29,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nervous_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayla75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nervous_trainer'),
      2,
      0,
      'completed'::phase_status,
      30,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      2,
      1,
      'completed'::phase_status,
      31,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'krystina_beatty85'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jazmyne80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'krystina_beatty85'),
      2,
      1,
      'completed'::phase_status,
      32,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'defensive_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lenore_schulist95'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lenore_schulist95'),
      0,
      2,
      'completed'::phase_status,
      33,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'happy_trainer_400'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delta_olson'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delta_olson'),
      0,
      2,
      'completed'::phase_status,
      34,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ash_ketchum'),
      1,
      2,
      'completed'::phase_status,
      35,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ivah_mcglynn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kiplarkin25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kiplarkin25'),
      0,
      2,
      'completed'::phase_status,
      36,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'entire_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'malvinamitchell24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'malvinamitchell24'),
      0,
      2,
      'completed'::phase_status,
      37,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'garricklindgren16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nettie_hermiston'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nettie_hermiston'),
      0,
      2,
      'completed'::phase_status,
      38,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurettayundt22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'awful_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'awful_ranger'),
      0,
      2,
      'completed'::phase_status,
      39,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vidaboyle57'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vidaboyle57'),
      1,
      2,
      'completed'::phase_status,
      40,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_161'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bowed_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      1,
      2,
      'completed'::phase_status,
      41,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'well_to_do_trainer_5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pertinent_trainer_27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_to_do_trainer_5'),
      2,
      1,
      'completed'::phase_status,
      42,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frequent_trainer_572'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ordinary_trainer_36'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frequent_trainer_572'),
      2,
      0,
      'completed'::phase_status,
      43,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kelli_buckridge72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katrina16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katrina16'),
      0,
      2,
      'completed'::phase_status,
      44,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'teagan92'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frivolous_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frivolous_master'),
      1,
      2,
      'completed'::phase_status,
      45,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ellis_paucek'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scottie17'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ellis_paucek'),
      2,
      0,
      'completed'::phase_status,
      46,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      1,
      2,
      'completed'::phase_status,
      47,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jessicaleannon22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jessicaleannon22'),
      0,
      2,
      'completed'::phase_status,
      48,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nella_russel'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nigeljerde94'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nigeljerde94'),
      0,
      2,
      'completed'::phase_status,
      49,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'titus_kohler60'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'reidstamm21'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'reidstamm21'),
      0,
      2,
      'completed'::phase_status,
      50,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'charlotteschoen99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'francesco_nader66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'francesco_nader66'),
      0,
      2,
      'completed'::phase_status,
      51,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'major_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'major_breeder'),
      2,
      0,
      'completed'::phase_status,
      52,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'price45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'elaina_nitzsche'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'price45'),
      2,
      0,
      'completed'::phase_status,
      53,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanie_maggio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'memorable_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanie_maggio'),
      2,
      0,
      'completed'::phase_status,
      54,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nicola69'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jermaineharvey25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jermaineharvey25'),
      0,
      2,
      'completed'::phase_status,
      55,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bad_trainer_106'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alda_rau2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alda_rau2'),
      0,
      2,
      'completed'::phase_status,
      56,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jeraldferry81'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'total_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jeraldferry81'),
      2,
      1,
      'completed'::phase_status,
      57,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'garett_bergnaum'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ashamed_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'garett_bergnaum'),
      2,
      0,
      'completed'::phase_status,
      58,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cristobalupton55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'halliefay16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'halliefay16'),
      0,
      2,
      'completed'::phase_status,
      59,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wallace_reichert'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'foolhardy_trainer_79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wallace_reichert'),
      2,
      0,
      'completed'::phase_status,
      60,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'unselfish_trainer_12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'joshweimann33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'unselfish_trainer_12'),
      2,
      1,
      'completed'::phase_status,
      61,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'liquid_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'beloved_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'beloved_leader'),
      1,
      2,
      'completed'::phase_status,
      62,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sally_block33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rey_bode55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rey_bode55'),
      1,
      2,
      'completed'::phase_status,
      63,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cooperative_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'myrtice66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'myrtice66'),
      0,
      2,
      'completed'::phase_status,
      64,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sophieorn25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'novakuhic68'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sophieorn25'),
      2,
      0,
      'completed'::phase_status,
      65,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jackiebins45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chance65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jackiebins45'),
      2,
      0,
      'completed'::phase_status,
      66,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'savanah33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'treverhartmann73'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'treverhartmann73'),
      0,
      2,
      'completed'::phase_status,
      67,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bart74'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'filthy_trainer_361'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bart74'),
      2,
      0,
      'completed'::phase_status,
      68,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cathrinemosciski_wun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brock'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cathrinemosciski_wun'),
      2,
      0,
      'completed'::phase_status,
      69,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'courteous_trainer_87'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'courteous_trainer_87'),
      2,
      1,
      'completed'::phase_status,
      70,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thoramarvin72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thoramarvin72'),
      0,
      2,
      'completed'::phase_status,
      71,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lexieerdman24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'powerless_trainer_33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lexieerdman24'),
      2,
      1,
      'completed'::phase_status,
      72,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'uncomfortable_traine'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'robust_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'uncomfortable_traine'),
      2,
      0,
      'completed'::phase_status,
      73,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jaleelstracke93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ashton_kshlerin'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jaleelstracke93'),
      2,
      0,
      'completed'::phase_status,
      74,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'late_trainer_395'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'colby_roberts52'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'colby_roberts52'),
      0,
      2,
      'completed'::phase_status,
      75,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sigmund_senger46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'godfreyjenkins91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigmund_senger46'),
      2,
      0,
      'completed'::phase_status,
      76,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'norene68'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'coralie_bernhard'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'norene68'),
      2,
      1,
      'completed'::phase_status,
      77,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quincy_pouros90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quincy_pouros90'),
      2,
      0,
      'completed'::phase_status,
      78,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'stunning_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rubbery_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stunning_gym'),
      2,
      0,
      'completed'::phase_status,
      79,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'viviane_rempel'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'violent_trainer_345'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'violent_trainer_345'),
      1,
      2,
      'completed'::phase_status,
      80,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delores_orn44'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_trainer_532'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delores_orn44'),
      2,
      1,
      'completed'::phase_status,
      81,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sneaky_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'monica_crist_fahey79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sneaky_master'),
      2,
      0,
      'completed'::phase_status,
      82,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'smooth_trainer_36'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'karen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'smooth_trainer_36'),
      2,
      1,
      'completed'::phase_status,
      83,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oval_trainer_521'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oval_trainer_521'),
      2,
      1,
      'completed'::phase_status,
      84,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'slushy_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brody25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'slushy_breeder'),
      2,
      1,
      'completed'::phase_status,
      85,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'millie_zieme65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_trainer_5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'millie_zieme65'),
      2,
      0,
      'completed'::phase_status,
      86,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jeffryyost15'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jeffryyost15'),
      2,
      0,
      'completed'::phase_status,
      87,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'practical_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tianna46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tianna46'),
      0,
      2,
      'completed'::phase_status,
      88,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bill_pacocha'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'mallory39'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bill_pacocha'),
      2,
      0,
      'completed'::phase_status,
      89,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delectable_trainer_3'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'long_trainer_533'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delectable_trainer_3'),
      2,
      1,
      'completed'::phase_status,
      90,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sammy_pouros'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'khalillarson_schuppe'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'khalillarson_schuppe'),
      1,
      2,
      'completed'::phase_status,
      91,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'happy_trainer_413'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'happy_trainer_413'),
      2,
      0,
      'completed'::phase_status,
      92,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'unused_trainer_669'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chad_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'unused_trainer_669'),
      2,
      1,
      'completed'::phase_status,
      93,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'claudestreich31'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fortunate_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'claudestreich31'),
      2,
      0,
      'completed'::phase_status,
      94,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'skylar_bednar'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'noted_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'noted_gym'),
      0,
      2,
      'completed'::phase_status,
      95,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ciara_heidenreich33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shanelfeeney90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ciara_heidenreich33'),
      2,
      0,
      'completed'::phase_status,
      96,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cruel_trainer_440'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cruel_trainer_440'),
      2,
      1,
      'completed'::phase_status,
      97,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ella_ratke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'felicia62'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ella_ratke'),
      2,
      0,
      'completed'::phase_status,
      98,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dallas56'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'izabellabeahan79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dallas56'),
      2,
      1,
      'completed'::phase_status,
      99,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'waynegorczany73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'heavy_trainer_256'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'heavy_trainer_256'),
      1,
      2,
      'completed'::phase_status,
      100,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gaston_funk5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thorny_trainer_213'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gaston_funk5'),
      2,
      1,
      'completed'::phase_status,
      101,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lee51'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'incomplete_trainer_6'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'incomplete_trainer_6'),
      0,
      2,
      'completed'::phase_status,
      102,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianna_stokes'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jabari_pagac18'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianna_stokes'),
      2,
      0,
      'completed'::phase_status,
      103,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'substantial_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'johnnievandervort55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'substantial_trainer_'),
      2,
      1,
      'completed'::phase_status,
      104,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'irma58'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette_harber2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette_harber2'),
      0,
      2,
      'completed'::phase_status,
      105,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusting_trainer_973'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'red'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'red'),
      0,
      2,
      'completed'::phase_status,
      106,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hilbert38'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pitiful_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilbert38'),
      2,
      0,
      'completed'::phase_status,
      107,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_witted_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_witted_leader'),
      1,
      2,
      'completed'::phase_status,
      108,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'salty_trainer_403'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'madyson24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'salty_trainer_403'),
      2,
      0,
      'completed'::phase_status,
      109,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nippy_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dixiesanford87'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nippy_elite'),
      2,
      0,
      'completed'::phase_status,
      110,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eryn_stracke_hand41'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'laurynbalistreri76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      2,
      0,
      'completed'::phase_status,
      111,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robin_schultz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lucy_reilly'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robin_schultz'),
      2,
      0,
      'completed'::phase_status,
      112,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cynthia'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arturofahey55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'arturofahey55'),
      1,
      2,
      'completed'::phase_status,
      113,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmin_lubowitz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'early_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'early_master'),
      1,
      2,
      'completed'::phase_status,
      114,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'michale_orn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'unpleasant_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'unpleasant_pro'),
      0,
      2,
      'completed'::phase_status,
      115,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fausto_mraz11'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'angelic_trainer_423'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fausto_mraz11'),
      2,
      0,
      'completed'::phase_status,
      116,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'squeaky_trainer_454'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'huge_trainer_672'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'huge_trainer_672'),
      1,
      2,
      'completed'::phase_status,
      117,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dariusschneider93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scornful_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dariusschneider93'),
      2,
      0,
      'completed'::phase_status,
      118,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'big_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'winifred46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'big_gym'),
      2,
      0,
      'completed'::phase_status,
      119,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'casimer_baumbach'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frozen_trainer_101'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'casimer_baumbach'),
      2,
      1,
      'completed'::phase_status,
      120,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wilhelmmccullough77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wilhelmmccullough77'),
      2,
      0,
      'completed'::phase_status,
      121,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'werner_auer80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_12'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_12'),
      0,
      2,
      'completed'::phase_status,
      122,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faraway_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'leta_kunde1'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      2,
      1,
      'completed'::phase_status,
      123,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'easy_trainer_738'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fake_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fake_ace'),
      1,
      2,
      'completed'::phase_status,
      124,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'those_trainer_198'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'mariannamacejkovic76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'those_trainer_198'),
      2,
      1,
      'completed'::phase_status,
      125,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rosy_trainer_409'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hilma_veum18'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rosy_trainer_409'),
      2,
      0,
      'completed'::phase_status,
      126,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kamron_kemmer91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'firsthand_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kamron_kemmer91'),
      2,
      0,
      'completed'::phase_status,
      127,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fred_pacocha47'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gregorio_schuster_ke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fred_pacocha47'),
      2,
      1,
      'completed'::phase_status,
      128,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '2 hours 10 minutes'), (seed_now - interval '1 hours 43 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tianna46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaleelstracke93'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tianna46'),
      2,
      1,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quincy_pouros90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adolfomoen96'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quincy_pouros90'),
      2,
      1,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'smooth_trainer_36'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilyne_bogan7'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilyne_bogan7'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'unpleasant_pro'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'halliefay16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'unpleasant_pro'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nervous_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fausto_mraz11'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nervous_trainer'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'domenic_jast43'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'huge_trainer_672'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'huge_trainer_672'),
      1,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gaston_funk5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gaston_funk5'),
      0,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dariusschneider93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lorna_effertz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lorna_effertz'),
      1,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'noted_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'parched_trainer_151'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'noted_gym'),
      2,
      0,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'krystina_beatty85'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      2,
      1,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiya_renner'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'prime_trainer_706'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'prime_trainer_706'),
      1,
      2,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hilbert38'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'unused_trainer_669'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilbert38'),
      2,
      1,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'claudestreich31'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'uncomfortable_traine'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'claudestreich31'),
      2,
      1,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sneaky_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delores_orn44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delores_orn44'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delilaho_hara84'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'happy_trainer_413'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'happy_trainer_413'),
      1,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'red'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'red'),
      2,
      1,
      'completed'::phase_status,
      17,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'stanley_schneider'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'malvinamitchell24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stanley_schneider'),
      2,
      0,
      'completed'::phase_status,
      18,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nigeljerde94'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'major_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'major_breeder'),
      0,
      2,
      'completed'::phase_status,
      19,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jaydeemard34'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'distinct_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'distinct_breeder'),
      1,
      2,
      'completed'::phase_status,
      20,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eminent_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sigmund_senger46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigmund_senger46'),
      0,
      2,
      'completed'::phase_status,
      21,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'courteous_trainer_87'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thoramarvin72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'courteous_trainer_87'),
      2,
      1,
      'completed'::phase_status,
      22,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wallace_reichert'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'big_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'big_gym'),
      1,
      2,
      'completed'::phase_status,
      23,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'emiliebednar53'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jermaineharvey25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jermaineharvey25'),
      1,
      2,
      'completed'::phase_status,
      24,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alda_rau2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katheryn_braun'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alda_rau2'),
      2,
      0,
      'completed'::phase_status,
      25,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'awful_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bowed_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      1,
      2,
      'completed'::phase_status,
      26,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jayson63'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marguerite_hintz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marguerite_hintz'),
      1,
      2,
      'completed'::phase_status,
      27,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'heavy_trainer_256'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bart74'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'heavy_trainer_256'),
      2,
      1,
      'completed'::phase_status,
      28,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'norene68'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fred_pacocha47'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'norene68'),
      2,
      1,
      'completed'::phase_status,
      29,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rare_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jackiebins45'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rare_master'),
      2,
      1,
      'completed'::phase_status,
      30,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pastel_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'robin_schultz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robin_schultz'),
      0,
      2,
      'completed'::phase_status,
      31,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'caleighparker77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katrina16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katrina16'),
      0,
      2,
      'completed'::phase_status,
      32,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sophieorn25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brannonlarkin62'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sophieorn25'),
      2,
      0,
      'completed'::phase_status,
      33,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ciara_heidenreich33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ciara_heidenreich33'),
      2,
      0,
      'completed'::phase_status,
      34,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delectable_trainer_3'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delta_olson'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delta_olson'),
      1,
      2,
      'completed'::phase_status,
      35,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jeffryyost15'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'slushy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jeffryyost15'),
      2,
      1,
      'completed'::phase_status,
      36,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'well_to_do_trainer_5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ella_ratke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_to_do_trainer_5'),
      2,
      1,
      'completed'::phase_status,
      37,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'casimer_baumbach'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'early_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'casimer_baumbach'),
      2,
      1,
      'completed'::phase_status,
      38,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'violent_trainer_345'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bill_pacocha'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'violent_trainer_345'),
      2,
      0,
      'completed'::phase_status,
      39,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'stunning_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jessicaleannon22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stunning_gym'),
      2,
      0,
      'completed'::phase_status,
      40,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rosy_trainer_409'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shanie_maggio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanie_maggio'),
      1,
      2,
      'completed'::phase_status,
      41,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cruel_trainer_440'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vidaboyle57'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cruel_trainer_440'),
      2,
      0,
      'completed'::phase_status,
      42,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kiplarkin25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frivolous_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kiplarkin25'),
      2,
      0,
      'completed'::phase_status,
      43,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colby_roberts52'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nippy_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'colby_roberts52'),
      2,
      0,
      'completed'::phase_status,
      44,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lenore_schulist95'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oval_trainer_521'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lenore_schulist95'),
      2,
      1,
      'completed'::phase_status,
      45,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cathrinemosciski_wun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fake_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fake_ace'),
      0,
      2,
      'completed'::phase_status,
      46,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ellis_paucek'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      0,
      2,
      'completed'::phase_status,
      47,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'myrtice66'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'millie_zieme65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'myrtice66'),
      2,
      0,
      'completed'::phase_status,
      48,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nettie_hermiston'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_champio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_champio'),
      0,
      2,
      'completed'::phase_status,
      49,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'incomplete_trainer_6'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lance'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'incomplete_trainer_6'),
      2,
      1,
      'completed'::phase_status,
      50,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chaz13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chaz13'),
      0,
      2,
      'completed'::phase_status,
      51,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'reidstamm21'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'khalillarson_schuppe'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'khalillarson_schuppe'),
      1,
      2,
      'completed'::phase_status,
      52,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lexieerdman24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      0,
      2,
      'completed'::phase_status,
      53,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianna_stokes'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'francesco_nader66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'francesco_nader66'),
      0,
      2,
      'completed'::phase_status,
      54,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dallas56'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'romaine_homenick'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dallas56'),
      2,
      0,
      'completed'::phase_status,
      55,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'garett_bergnaum'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ronny_koss27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'garett_bergnaum'),
      2,
      1,
      'completed'::phase_status,
      56,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jeraldferry81'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jeraldferry81'),
      0,
      2,
      'completed'::phase_status,
      57,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'beloved_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arturofahey55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'beloved_leader'),
      2,
      0,
      'completed'::phase_status,
      58,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'price45'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_12'),
      2,
      0,
      'completed'::phase_status,
      59,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'treverhartmann73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'treverhartmann73'),
      2,
      0,
      'completed'::phase_status,
      60,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'substantial_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'unselfish_trainer_12'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'substantial_trainer_'),
      2,
      1,
      'completed'::phase_status,
      61,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wilhelmmccullough77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frequent_trainer_572'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frequent_trainer_572'),
      0,
      2,
      'completed'::phase_status,
      62,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'those_trainer_198'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'salty_trainer_403'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'salty_trainer_403'),
      1,
      2,
      'completed'::phase_status,
      63,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'blanca13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kamron_kemmer91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blanca13'),
      2,
      0,
      'completed'::phase_status,
      64,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'taut_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shanelfeeney90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanelfeeney90'),
      0,
      2,
      'completed'::phase_status,
      65,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'angelic_trainer_423'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusting_trainer_973'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusting_trainer_973'),
      1,
      2,
      'completed'::phase_status,
      66,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brilliant_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oleflatley25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oleflatley25'),
      0,
      2,
      'completed'::phase_status,
      67,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_kuphal'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'odd_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'odd_ranger'),
      1,
      2,
      'completed'::phase_status,
      68,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'adela1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'madyson24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'madyson24'),
      0,
      2,
      'completed'::phase_status,
      69,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'liquid_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dixiesanford87'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'liquid_ace'),
      2,
      0,
      'completed'::phase_status,
      70,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'happy_trainer_400'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      0,
      'completed'::phase_status,
      71,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'richardswaniawski20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'entire_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      2,
      1,
      'completed'::phase_status,
      72,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sniveling_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'michale_orn'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'michale_orn'),
      0,
      2,
      'completed'::phase_status,
      73,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashamed_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lee51'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lee51'),
      1,
      2,
      'completed'::phase_status,
      74,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bad_trainer_106'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      2,
      0,
      'completed'::phase_status,
      75,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'johnnievandervort55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nicola69'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nicola69'),
      0,
      2,
      'completed'::phase_status,
      76,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'total_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cynthia'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cynthia'),
      0,
      2,
      'completed'::phase_status,
      77,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gregorio_schuster_ke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gregorio_schuster_ke'),
      2,
      1,
      'completed'::phase_status,
      78,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurynbalistreri76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'coralie_bernhard'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'coralie_bernhard'),
      0,
      2,
      'completed'::phase_status,
      79,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'foolhardy_trainer_79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'karen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'karen'),
      0,
      2,
      'completed'::phase_status,
      80,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'artfritsch16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'runny_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      2,
      0,
      'completed'::phase_status,
      81,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'firsthand_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thorny_trainer_213'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'firsthand_gym'),
      2,
      0,
      'completed'::phase_status,
      82,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'submissive_trainer_7'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'submissive_trainer_7'),
      0,
      2,
      'completed'::phase_status,
      83,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'defensive_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'godfreyjenkins91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'defensive_champion'),
      2,
      1,
      'completed'::phase_status,
      84,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dirty_trainer_951'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dirty_trainer_951'),
      2,
      0,
      'completed'::phase_status,
      85,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scary_trainer_677'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frozen_trainer_101'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frozen_trainer_101'),
      1,
      2,
      'completed'::phase_status,
      86,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'estell85'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasey_jacobi99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      1,
      2,
      'completed'::phase_status,
      87,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mallory39'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilie_medhurst82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mallory39'),
      2,
      0,
      'completed'::phase_status,
      88,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'novakuhic68'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'easy_trainer_738'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'easy_trainer_738'),
      1,
      2,
      'completed'::phase_status,
      89,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'leta_kunde1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ashton_kshlerin'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ashton_kshlerin'),
      0,
      2,
      'completed'::phase_status,
      90,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'powerless_trainer_33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sammy_pouros'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'powerless_trainer_33'),
      2,
      1,
      'completed'::phase_status,
      91,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'charlotteschoen99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chad_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chad_friesen'),
      0,
      2,
      'completed'::phase_status,
      92,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lucy_reilly'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scottie17'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lucy_reilly'),
      2,
      0,
      'completed'::phase_status,
      93,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scornful_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brock'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brock'),
      0,
      2,
      'completed'::phase_status,
      94,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bustling_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'candid_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bustling_elite'),
      2,
      1,
      'completed'::phase_status,
      95,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'late_trainer_395'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garricklindgren16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'late_trainer_395'),
      2,
      0,
      'completed'::phase_status,
      96,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robust_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'memorable_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'memorable_master'),
      0,
      2,
      'completed'::phase_status,
      97,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'felicia62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fortunate_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'felicia62'),
      2,
      0,
      'completed'::phase_status,
      98,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_trainer_5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_trainer'),
      2,
      1,
      'completed'::phase_status,
      99,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brody25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'viviane_rempel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brody25'),
      2,
      1,
      'completed'::phase_status,
      100,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'squeaky_trainer_454'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chance65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'squeaky_trainer_454'),
      2,
      0,
      'completed'::phase_status,
      101,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'winifred46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vincent_hickle19'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vincent_hickle19'),
      0,
      2,
      'completed'::phase_status,
      102,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'treviono_kon17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'treviono_kon17'),
      2,
      0,
      'completed'::phase_status,
      103,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'overcooked_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faint_trainer_713'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'overcooked_ranger'),
      2,
      0,
      'completed'::phase_status,
      104,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'flo_friesen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'teagan92'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'flo_friesen'),
      2,
      1,
      'completed'::phase_status,
      105,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hilma_veum18'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilma_veum18'),
      2,
      0,
      'completed'::phase_status,
      106,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurettayundt22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nicolaconn45'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurettayundt22'),
      2,
      0,
      'completed'::phase_status,
      107,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'amber_reichel25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jabari_pagac18'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'amber_reichel25'),
      2,
      0,
      'completed'::phase_status,
      108,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'izabellabeahan79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shad_williamson9'),
      1,
      2,
      'completed'::phase_status,
      109,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'waynegorczany73'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette20'),
      2,
      0,
      'completed'::phase_status,
      110,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'assuntaschoen_koelpi'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jailyn75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'assuntaschoen_koelpi'),
      2,
      0,
      'completed'::phase_status,
      111,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_trainer_532'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ornery_trainer_904'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ornery_trainer_904'),
      0,
      2,
      'completed'::phase_status,
      112,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinemiller24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pertinent_trainer_27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinemiller24'),
      2,
      0,
      'completed'::phase_status,
      113,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'long_trainer_533'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'long_trainer_533'),
      0,
      2,
      'completed'::phase_status,
      114,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kayla75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ashleylueilwitz37'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kayla75'),
      2,
      0,
      'completed'::phase_status,
      115,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'elaina_nitzsche'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'elaina_nitzsche'),
      2,
      0,
      'completed'::phase_status,
      116,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'westonwilderman14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nella_russel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nella_russel'),
      0,
      2,
      'completed'::phase_status,
      117,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kelli_buckridge72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kelli_buckridge72'),
      2,
      1,
      'completed'::phase_status,
      118,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ordinary_trainer_36'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'impossible_trainer_9'),
      0,
      2,
      'completed'::phase_status,
      119,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmin_lubowitz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaeden50'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jazmin_lubowitz'),
      2,
      0,
      'completed'::phase_status,
      120,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'werner_auer80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'janellebradtke25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'werner_auer80'),
      2,
      0,
      'completed'::phase_status,
      121,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'practical_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arnoldo81'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'practical_leader'),
      2,
      1,
      'completed'::phase_status,
      122,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nolanlangosh54'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'joshweimann33'),
      2,
      0,
      'completed'::phase_status,
      123,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmyne80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ivah_mcglynn'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ivah_mcglynn'),
      0,
      2,
      'completed'::phase_status,
      124,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pitiful_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pitiful_elite'),
      2,
      0,
      'completed'::phase_status,
      125,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'titus_kohler60'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'mariannamacejkovic76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mariannamacejkovic76'),
      1,
      2,
      'completed'::phase_status,
      126,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiyaabshire82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rubbery_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rubbery_elite'),
      1,
      2,
      'completed'::phase_status,
      127,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sally_block33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'skylar_bednar'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'skylar_bednar'),
      1,
      2,
      'completed'::phase_status,
      128,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '1 hours 20 minutes'), (seed_now - interval '53 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marguerite_hintz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gaston_funk5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marguerite_hintz'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanie_maggio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quincy_pouros90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanie_maggio'),
      2,
      0,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kiplarkin25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      2,
      0,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'happy_trainer_413'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stunning_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'happy_trainer_413'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'red'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jeraldferry81'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jeraldferry81'),
      1,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'substantial_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stanley_schneider'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stanley_schneider'),
      0,
      2,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'big_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katrina16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katrina16'),
      0,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'blanca13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sophieorn25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blanca13'),
      2,
      0,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'casimer_baumbach'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'casimer_baumbach'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fake_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bowed_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      0,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'violent_trainer_345'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frequent_trainer_572'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frequent_trainer_572'),
      1,
      2,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'incomplete_trainer_6'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rare_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'incomplete_trainer_6'),
      2,
      0,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cruel_trainer_440'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'unpleasant_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'unpleasant_pro'),
      0,
      2,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marquis78'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'francesco_nader66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      2,
      1,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'khalillarson_schuppe'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garett_bergnaum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'garett_bergnaum'),
      0,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'prime_trainer_706'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'myrtice66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'myrtice66'),
      0,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faraway_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nervous_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      2,
      0,
      'completed'::phase_status,
      17,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sigmund_senger46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delores_orn44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigmund_senger46'),
      2,
      1,
      'completed'::phase_status,
      18,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'major_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'claudestreich31'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'claudestreich31'),
      0,
      2,
      'completed'::phase_status,
      19,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dallas56'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'distinct_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'distinct_breeder'),
      0,
      2,
      'completed'::phase_status,
      20,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'heavy_trainer_256'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ciara_heidenreich33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'heavy_trainer_256'),
      2,
      0,
      'completed'::phase_status,
      21,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'huge_trainer_672'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'courteous_trainer_87'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'huge_trainer_672'),
      2,
      1,
      'completed'::phase_status,
      22,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'norene68'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_champio'),
      2,
      1,
      'completed'::phase_status,
      23,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hilbert38'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jeffryyost15'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilbert38'),
      2,
      0,
      'completed'::phase_status,
      24,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'salty_trainer_403'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'diamond_kunze75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'diamond_kunze75'),
      0,
      2,
      'completed'::phase_status,
      25,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lorna_effertz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jermaineharvey25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jermaineharvey25'),
      0,
      2,
      'completed'::phase_status,
      26,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chaz13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tianna46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chaz13'),
      2,
      0,
      'completed'::phase_status,
      27,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'treverhartmann73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alda_rau2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alda_rau2'),
      0,
      2,
      'completed'::phase_status,
      28,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'well_to_do_trainer_5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'robin_schultz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_to_do_trainer_5'),
      2,
      0,
      'completed'::phase_status,
      29,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilyne_bogan7'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lenore_schulist95'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilyne_bogan7'),
      2,
      1,
      'completed'::phase_status,
      30,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'beloved_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'colby_roberts52'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'beloved_leader'),
      2,
      0,
      'completed'::phase_status,
      31,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'noted_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delta_olson'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delta_olson'),
      0,
      2,
      'completed'::phase_status,
      32,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ella_ratke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'richardswaniawski20'),
      0,
      2,
      'completed'::phase_status,
      33,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'katheryn_braun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katheryn_braun'),
      2,
      0,
      'completed'::phase_status,
      34,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'memorable_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'domenic_jast43'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'domenic_jast43'),
      1,
      2,
      'completed'::phase_status,
      35,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'vidaboyle57'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arturofahey55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'arturofahey55'),
      0,
      2,
      'completed'::phase_status,
      36,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'joshweimann33'),
      2,
      1,
      'completed'::phase_status,
      37,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jessicaleannon22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'werner_auer80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'werner_auer80'),
      0,
      2,
      'completed'::phase_status,
      38,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jaydeemard34'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'uncomfortable_traine'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'uncomfortable_traine'),
      0,
      2,
      'completed'::phase_status,
      39,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'karen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pitiful_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pitiful_elite'),
      0,
      2,
      'completed'::phase_status,
      40,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'powerless_trainer_33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'squeaky_trainer_454'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'squeaky_trainer_454'),
      0,
      2,
      'completed'::phase_status,
      41,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaleelstracke93'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rey_bode55'),
      2,
      0,
      'completed'::phase_status,
      42,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'long_trainer_533'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'emiliebednar53'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'long_trainer_533'),
      2,
      0,
      'completed'::phase_status,
      43,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eminent_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'mariannamacejkovic76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eminent_ranger'),
      2,
      1,
      'completed'::phase_status,
      44,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'overcooked_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'unselfish_trainer_12'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'overcooked_ranger'),
      2,
      0,
      'completed'::phase_status,
      45,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bustling_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vincent_hickle19'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bustling_elite'),
      2,
      0,
      'completed'::phase_status,
      46,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lance'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'treviono_kon17'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'treviono_kon17'),
      1,
      2,
      'completed'::phase_status,
      47,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinemiller24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinemiller24'),
      1,
      2,
      'completed'::phase_status,
      48,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rubbery_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette20'),
      0,
      2,
      'completed'::phase_status,
      49,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dariusschneider93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'price45'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dariusschneider93'),
      2,
      1,
      'completed'::phase_status,
      50,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nigeljerde94'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hilma_veum18'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilma_veum18'),
      0,
      2,
      'completed'::phase_status,
      51,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusting_trainer_973'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      0,
      'completed'::phase_status,
      52,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bart74'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiya_renner'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bart74'),
      2,
      0,
      'completed'::phase_status,
      53,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'liquid_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thoramarvin72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thoramarvin72'),
      0,
      2,
      'completed'::phase_status,
      54,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmin_lubowitz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'laurettayundt22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurettayundt22'),
      1,
      2,
      'completed'::phase_status,
      55,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'millie_zieme65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lucy_reilly'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'millie_zieme65'),
      2,
      0,
      'completed'::phase_status,
      56,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nippy_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'elaina_nitzsche'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nippy_elite'),
      2,
      1,
      'completed'::phase_status,
      57,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'halliefay16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shanelfeeney90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanelfeeney90'),
      0,
      2,
      'completed'::phase_status,
      58,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'caleighparker77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'odd_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'odd_ranger'),
      0,
      2,
      'completed'::phase_status,
      59,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'parched_trainer_151'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'coralie_bernhard'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'parched_trainer_151'),
      2,
      0,
      'completed'::phase_status,
      60,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'unused_trainer_669'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delilaho_hara84'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delilaho_hara84'),
      1,
      2,
      'completed'::phase_status,
      61,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'slushy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'slushy_breeder'),
      0,
      2,
      'completed'::phase_status,
      62,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashton_kshlerin'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lee51'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ashton_kshlerin'),
      2,
      1,
      'completed'::phase_status,
      63,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'houston_walter'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chad_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chad_friesen'),
      0,
      2,
      'completed'::phase_status,
      64,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'amber_reichel25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'defensive_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'defensive_champion'),
      1,
      2,
      'completed'::phase_status,
      65,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'flo_friesen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'skylar_bednar'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'skylar_bednar'),
      0,
      2,
      'completed'::phase_status,
      66,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      2,
      0,
      'completed'::phase_status,
      67,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frivolous_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jayson63'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frivolous_master'),
      2,
      1,
      'completed'::phase_status,
      68,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brody25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cynthia'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cynthia'),
      1,
      2,
      'completed'::phase_status,
      69,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bill_pacocha'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'practical_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bill_pacocha'),
      2,
      0,
      'completed'::phase_status,
      70,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '54 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianna_stokes'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasey_jacobi99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      0,
      2,
      'completed'::phase_status,
      71,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'artfritsch16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'reidstamm21'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      2,
      0,
      'completed'::phase_status,
      72,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brock'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'krystina_beatty85'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'krystina_beatty85'),
      1,
      2,
      'completed'::phase_status,
      73,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'smooth_trainer_36'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nettie_hermiston'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'smooth_trainer_36'),
      2,
      1,
      'completed'::phase_status,
      74,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ivah_mcglynn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'awful_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'awful_ranger'),
      1,
      2,
      'completed'::phase_status,
      75,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ronny_koss27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'malvinamitchell24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'malvinamitchell24'),
      1,
      2,
      'completed'::phase_status,
      76,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nicola69'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'felicia62'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nicola69'),
      2,
      0,
      'completed'::phase_status,
      77,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sneaky_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brannonlarkin62'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brannonlarkin62'),
      0,
      2,
      'completed'::phase_status,
      78,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'firsthand_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dirty_trainer_951'),
      1,
      2,
      'completed'::phase_status,
      79,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'madyson24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gregorio_schuster_ke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'madyson24'),
      2,
      0,
      'completed'::phase_status,
      80,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delectable_trainer_3'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frozen_trainer_101'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frozen_trainer_101'),
      1,
      2,
      'completed'::phase_status,
      81,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fred_pacocha47'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fred_pacocha47'),
      2,
      1,
      'completed'::phase_status,
      82,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jackiebins45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nella_russel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nella_russel'),
      0,
      2,
      'completed'::phase_status,
      83,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ornery_trainer_904'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cathrinemosciski_wun'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ornery_trainer_904'),
      2,
      0,
      'completed'::phase_status,
      84,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'adolfomoen96'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wallace_reichert'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wallace_reichert'),
      1,
      2,
      'completed'::phase_status,
      85,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rosy_trainer_409'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clint_denesik'),
      2,
      1,
      'completed'::phase_status,
      86,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pastel_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wilhelmmccullough77'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wilhelmmccullough77'),
      1,
      2,
      'completed'::phase_status,
      87,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'submissive_trainer_7'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lexieerdman24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'submissive_trainer_7'),
      2,
      1,
      'completed'::phase_status,
      88,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'easy_trainer_738'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'assuntaschoen_koelpi'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'assuntaschoen_koelpi'),
      0,
      2,
      'completed'::phase_status,
      89,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ellis_paucek'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayla75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ellis_paucek'),
      2,
      0,
      'completed'::phase_status,
      90,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'early_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'michale_orn'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'michale_orn'),
      1,
      2,
      'completed'::phase_status,
      91,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fausto_mraz11'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oleflatley25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oleflatley25'),
      0,
      2,
      'completed'::phase_status,
      92,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oval_trainer_521'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kamron_kemmer91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oval_trainer_521'),
      2,
      0,
      'completed'::phase_status,
      93,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'romaine_homenick'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_witted_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'romaine_homenick'),
      2,
      0,
      'completed'::phase_status,
      94,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'late_trainer_395'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'those_trainer_198'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'late_trainer_395'),
      2,
      0,
      'completed'::phase_status,
      95,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mallory39'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kelli_buckridge72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mallory39'),
      2,
      0,
      'completed'::phase_status,
      96,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_trainer_5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusty_gym'),
      2,
      0,
      'completed'::phase_status,
      97,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'titus_kohler60'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilie_medhurst82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilie_medhurst82'),
      0,
      2,
      'completed'::phase_status,
      98,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thorny_trainer_213'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fortunate_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fortunate_champion'),
      1,
      2,
      'completed'::phase_status,
      99,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'janellebradtke25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      2,
      0,
      'completed'::phase_status,
      100,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'taut_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nicolaconn45'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'taut_leader'),
      2,
      0,
      'completed'::phase_status,
      101,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'novakuhic68'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scornful_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scornful_elite'),
      0,
      2,
      'completed'::phase_status,
      102,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'charlotteschoen99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'happy_trainer_400'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'charlotteschoen99'),
      2,
      1,
      'completed'::phase_status,
      103,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'entire_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'teagan92'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'entire_trainer'),
      2,
      0,
      'completed'::phase_status,
      104,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_kuphal'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brilliant_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_kuphal'),
      2,
      1,
      'completed'::phase_status,
      105,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'angelic_trainer_423'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      0,
      2,
      'completed'::phase_status,
      106,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sniveling_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'robust_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robust_elite'),
      0,
      2,
      'completed'::phase_status,
      107,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'foolhardy_trainer_79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bad_trainer_106'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bad_trainer_106'),
      0,
      2,
      'completed'::phase_status,
      108,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scottie17'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'monica_crist_fahey79'),
      2,
      1,
      'completed'::phase_status,
      109,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'adela1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'adela1'),
      2,
      0,
      'completed'::phase_status,
      110,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cooperative_trainer_'),
      1,
      2,
      'completed'::phase_status,
      111,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashleylueilwitz37'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arnoldo81'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ashleylueilwitz37'),
      2,
      1,
      'completed'::phase_status,
      112,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faint_trainer_713'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faint_trainer_713'),
      1,
      2,
      'completed'::phase_status,
      113,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'total_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pertinent_trainer_27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pertinent_trainer_27'),
      0,
      2,
      'completed'::phase_status,
      114,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'westonwilderman14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'godfreyjenkins91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'westonwilderman14'),
      2,
      0,
      'completed'::phase_status,
      115,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'winifred46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_trainer_532'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'winifred46'),
      2,
      0,
      'completed'::phase_status,
      116,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jabari_pagac18'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jabari_pagac18'),
      2,
      0,
      'completed'::phase_status,
      117,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmyne80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jazmyne80'),
      2,
      1,
      'completed'::phase_status,
      118,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurynbalistreri76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'izabellabeahan79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurynbalistreri76'),
      2,
      1,
      'completed'::phase_status,
      119,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trentheaney20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dixiesanford87'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dixiesanford87'),
      0,
      2,
      'completed'::phase_status,
      120,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'garricklindgren16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scary_trainer_677'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scary_trainer_677'),
      1,
      2,
      'completed'::phase_status,
      121,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'candid_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'leta_kunde1'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'leta_kunde1'),
      1,
      2,
      'completed'::phase_status,
      122,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chance65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sammy_pouros'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sammy_pouros'),
      1,
      2,
      'completed'::phase_status,
      123,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sally_block33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaeden50'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jaeden50'),
      1,
      2,
      'completed'::phase_status,
      124,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'waynegorczany73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ordinary_trainer_36'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'waynegorczany73'),
      2,
      0,
      'completed'::phase_status,
      125,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashamed_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiyaabshire82'),
      0,
      2,
      'completed'::phase_status,
      126,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'viviane_rempel'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'runny_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'runny_champion'),
      0,
      2,
      'completed'::phase_status,
      127,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'johnnievandervort55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'estell85'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'johnnievandervort55'),
      2,
      0,
      'completed'::phase_status,
      128,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '53 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'active'::phase_status,
      (seed_now - interval '30 minutes'), (seed_now - interval '3 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chaz13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shanie_maggio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanie_maggio'),
      0,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jeraldferry81'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'casimer_baumbach'),
      NULL,
      1,
      1,
      'active'::phase_status,
      2,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'katrina16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'unpleasant_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'unpleasant_pro'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'incomplete_trainer_6'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stanley_schneider'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'incomplete_trainer_6'),
      2,
      1,
      'completed'::phase_status,
      4,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'garett_bergnaum'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'heavy_trainer_256'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'heavy_trainer_256'),
      1,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bowed_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'well_to_do_trainer_5'),
      NULL,
      1,
      1,
      'active'::phase_status,
      6,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'beloved_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alda_rau2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'beloved_leader'),
      2,
      0,
      'completed'::phase_status,
      7,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'diamond_kunze75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'myrtice66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'myrtice66'),
      1,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '5 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marguerite_hintz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      NULL,
      1,
      1,
      'active'::phase_status,
      9,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'huge_trainer_672'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'happy_trainer_413'),
      NULL,
      1,
      1,
      'active'::phase_status,
      10,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'blanca13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delta_olson'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blanca13'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faraway_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'claudestreich31'),
      NULL,
      1,
      1,
      'active'::phase_status,
      12,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frequent_trainer_572'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sigmund_senger46'),
      NULL,
      1,
      1,
      'active'::phase_status,
      13,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jermaineharvey25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilyne_bogan7'),
      NULL,
      1,
      1,
      'active'::phase_status,
      14,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marquis78'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_champio'),
      NULL,
      1,
      1,
      'active'::phase_status,
      15,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hilbert38'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'distinct_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilbert38'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'khalillarson_schuppe'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'khalillarson_schuppe'),
      0,
      2,
      'completed'::phase_status,
      17,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'francesco_nader66'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'uncomfortable_traine'),
      NULL,
      1,
      1,
      'active'::phase_status,
      18,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brannonlarkin62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'parched_trainer_151'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'parched_trainer_151'),
      0,
      2,
      'completed'::phase_status,
      19,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nervous_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eminent_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nervous_trainer'),
      2,
      1,
      'completed'::phase_status,
      20,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'slushy_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinaklocko65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      0,
      2,
      'completed'::phase_status,
      21,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'red'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bustling_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'red'),
      2,
      0,
      'completed'::phase_status,
      22,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'odd_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nicola69'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'odd_ranger'),
      2,
      0,
      'completed'::phase_status,
      23,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'smooth_trainer_36'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katheryn_braun'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katheryn_braun'),
      0,
      2,
      'completed'::phase_status,
      24,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hilma_veum18'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nella_russel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilma_veum18'),
      2,
      0,
      'completed'::phase_status,
      25,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delilaho_hara84'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delilaho_hara84'),
      1,
      2,
      'completed'::phase_status,
      26,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'krystina_beatty85'),
      NULL,
      1,
      1,
      'active'::phase_status,
      27,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colby_roberts52'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_ranger'),
      NULL,
      1,
      1,
      'active'::phase_status,
      28,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'big_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'violent_trainer_345'),
      NULL,
      0,
      0,
      'pending'::phase_status,
      29,
      NULL,
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanelfeeney90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thoramarvin72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thoramarvin72'),
      0,
      2,
      'completed'::phase_status,
      30,
      (seed_now - interval '30 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dirty_trainer_951'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frozen_trainer_101'),
      NULL,
      1,
      1,
      'active'::phase_status,
      31,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'noted_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'treverhartmann73'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'treverhartmann73'),
      1,
      2,
      'completed'::phase_status,
      32,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'awful_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'madyson24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'madyson24'),
      0,
      2,
      'completed'::phase_status,
      33,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dallas56'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lorna_effertz'),
      NULL,
      1,
      1,
      'active'::phase_status,
      34,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quincy_pouros90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pitiful_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quincy_pouros90'),
      2,
      0,
      'completed'::phase_status,
      35,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'skylar_bednar'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ashton_kshlerin'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'skylar_bednar'),
      2,
      1,
      'completed'::phase_status,
      36,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ornery_trainer_904'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'richardswaniawski20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ornery_trainer_904'),
      2,
      0,
      'completed'::phase_status,
      37,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'stunning_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sophieorn25'),
      NULL,
      1,
      1,
      'active'::phase_status,
      38,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wilhelmmccullough77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dariusschneider93'),
      NULL,
      0,
      0,
      'pending'::phase_status,
      39,
      NULL,
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kiplarkin25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'long_trainer_533'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'long_trainer_533'),
      1,
      2,
      'completed'::phase_status,
      40,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinemiller24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'assuntaschoen_koelpi'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinemiller24'),
      2,
      1,
      'completed'::phase_status,
      41,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robin_schultz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'courteous_trainer_87'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robin_schultz'),
      2,
      1,
      'completed'::phase_status,
      42,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'submissive_trainer_7'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'domenic_jast43'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'submissive_trainer_7'),
      2,
      0,
      'completed'::phase_status,
      43,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'salty_trainer_403'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lenore_schulist95'),
      NULL,
      1,
      1,
      'active'::phase_status,
      44,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bill_pacocha'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tianna46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tianna46'),
      0,
      2,
      'completed'::phase_status,
      45,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oval_trainer_521'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cruel_trainer_440'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oval_trainer_521'),
      2,
      1,
      'completed'::phase_status,
      46,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ciara_heidenreich33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arturofahey55'),
      NULL,
      1,
      1,
      'active'::phase_status,
      47,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chad_friesen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'millie_zieme65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'millie_zieme65'),
      0,
      2,
      'completed'::phase_status,
      48,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mallory39'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'late_trainer_395'),
      NULL,
      1,
      1,
      'active'::phase_status,
      49,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rare_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_12'),
      2,
      0,
      'completed'::phase_status,
      50,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'werner_auer80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bart74'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bart74'),
      0,
      2,
      'completed'::phase_status,
      51,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fred_pacocha47'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cynthia'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cynthia'),
      0,
      2,
      'completed'::phase_status,
      52,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'major_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'artfritsch16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'artfritsch16'),
      0,
      2,
      'completed'::phase_status,
      53,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'defensive_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wallace_reichert'),
      NULL,
      1,
      1,
      'active'::phase_status,
      54,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'norene68'),
      NULL,
      1,
      1,
      'active'::phase_status,
      55,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'romaine_homenick'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rey_bode55'),
      2,
      0,
      'completed'::phase_status,
      56,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurettayundt22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'substantial_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'substantial_trainer_'),
      0,
      2,
      'completed'::phase_status,
      57,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frivolous_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'squeaky_trainer_454'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'squeaky_trainer_454'),
      0,
      2,
      'completed'::phase_status,
      58,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ellis_paucek'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'malvinamitchell24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ellis_paucek'),
      2,
      0,
      'completed'::phase_status,
      59,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fake_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'joshweimann33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fake_ace'),
      2,
      0,
      'completed'::phase_status,
      60,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gaston_funk5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delores_orn44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delores_orn44'),
      0,
      2,
      'completed'::phase_status,
      61,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nippy_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jeffryyost15'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nippy_elite'),
      2,
      1,
      'completed'::phase_status,
      62,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'treviono_kon17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'clint_denesik'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clint_denesik'),
      1,
      2,
      'completed'::phase_status,
      63,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'michale_orn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'prime_trainer_706'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'michale_orn'),
      2,
      0,
      'completed'::phase_status,
      64,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmin_lubowitz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      NULL,
      1,
      1,
      'active'::phase_status,
      65,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'impossible_trainer_9'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_trainer'),
      NULL,
      1,
      1,
      'active'::phase_status,
      66,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lee51'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brody25'),
      NULL,
      1,
      1,
      'active'::phase_status,
      67,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'westonwilderman14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'memorable_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'westonwilderman14'),
      2,
      0,
      'completed'::phase_status,
      68,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'karen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lucy_reilly'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lucy_reilly'),
      1,
      2,
      'completed'::phase_status,
      69,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'charlotteschoen99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adolfomoen96'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'adolfomoen96'),
      1,
      2,
      'completed'::phase_status,
      70,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '4 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'early_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fausto_mraz11'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'early_master'),
      2,
      0,
      'completed'::phase_status,
      71,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ronny_koss27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'runny_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ronny_koss27'),
      2,
      0,
      'completed'::phase_status,
      72,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianna_stokes'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rosy_trainer_409'),
      NULL,
      1,
      1,
      'active'::phase_status,
      73,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mariannamacejkovic76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sneaky_master'),
      NULL,
      1,
      1,
      'active'::phase_status,
      74,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurynbalistreri76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'entire_trainer'),
      NULL,
      1,
      1,
      'active'::phase_status,
      75,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'halliefay16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delectable_trainer_3'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'halliefay16'),
      2,
      0,
      'completed'::phase_status,
      76,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiya_renner'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilie_medhurst82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilie_medhurst82'),
      0,
      2,
      'completed'::phase_status,
      77,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'felicia62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'johnnievandervort55'),
      NULL,
      1,
      1,
      'active'::phase_status,
      78,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jabari_pagac18'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'flo_friesen'),
      NULL,
      1,
      1,
      'active'::phase_status,
      79,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'price45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'powerless_trainer_33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'powerless_trainer_33'),
      0,
      2,
      'completed'::phase_status,
      80,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jessicaleannon22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'taut_leader'),
      NULL,
      1,
      1,
      'active'::phase_status,
      81,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'amber_reichel25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaleelstracke93'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'amber_reichel25'),
      2,
      1,
      'completed'::phase_status,
      82,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'caleighparker77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pastel_gym'),
      NULL,
      1,
      1,
      'active'::phase_status,
      83,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faint_trainer_713'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vincent_hickle19'),
      NULL,
      1,
      1,
      'active'::phase_status,
      84,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lexieerdman24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jazmyne80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lexieerdman24'),
      2,
      1,
      'completed'::phase_status,
      85,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dixiesanford87'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      NULL,
      1,
      1,
      'active'::phase_status,
      86,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'unused_trainer_669'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'emiliebednar53'),
      NULL,
      1,
      1,
      'active'::phase_status,
      87,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'unselfish_trainer_12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scornful_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'unselfish_trainer_12'),
      2,
      0,
      'completed'::phase_status,
      88,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jayson63'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gregorio_schuster_ke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gregorio_schuster_ke'),
      0,
      2,
      'completed'::phase_status,
      89,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'firsthand_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'firsthand_gym'),
      0,
      2,
      'completed'::phase_status,
      90,
      (seed_now - interval '29 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusting_trainer_973'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nigeljerde94'),
      NULL,
      1,
      1,
      'active'::phase_status,
      91,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'elaina_nitzsche'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaydeemard34'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'elaina_nitzsche'),
      2,
      0,
      'completed'::phase_status,
      92,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cathrinemosciski_wun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fortunate_champion'),
      NULL,
      1,
      1,
      'active'::phase_status,
      93,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cooperative_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      NULL,
      1,
      1,
      'active'::phase_status,
      94,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'reidstamm21'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'leta_kunde1'),
      NULL,
      1,
      1,
      'active'::phase_status,
      95,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'coralie_bernhard'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ashleylueilwitz37'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ashleylueilwitz37'),
      0,
      2,
      'completed'::phase_status,
      96,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kayla75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'practical_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'practical_leader'),
      1,
      2,
      'completed'::phase_status,
      97,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiyaabshire82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pertinent_trainer_27'),
      NULL,
      1,
      1,
      'active'::phase_status,
      98,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kamron_kemmer91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ivah_mcglynn'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ivah_mcglynn'),
      0,
      2,
      'completed'::phase_status,
      99,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'those_trainer_198'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'waynegorczany73'),
      NULL,
      1,
      1,
      'active'::phase_status,
      100,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robust_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rubbery_elite'),
      NULL,
      1,
      1,
      'active'::phase_status,
      101,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      NULL,
      1,
      1,
      'active'::phase_status,
      102,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_kuphal'),
      NULL,
      1,
      1,
      'active'::phase_status,
      103,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brock'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nettie_hermiston'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nettie_hermiston'),
      0,
      2,
      'completed'::phase_status,
      104,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sammy_pouros'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vidaboyle57'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sammy_pouros'),
      2,
      1,
      'completed'::phase_status,
      105,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'easy_trainer_738'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaeden50'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'easy_trainer_738'),
      2,
      0,
      'completed'::phase_status,
      106,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kelli_buckridge72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jackiebins45'),
      NULL,
      0,
      0,
      'pending'::phase_status,
      107,
      NULL,
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ash_ketchum'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lance'),
      NULL,
      1,
      1,
      'active'::phase_status,
      108,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scary_trainer_677'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bad_trainer_106'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bad_trainer_106'),
      1,
      2,
      'completed'::phase_status,
      109,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'adela1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      NULL,
      1,
      1,
      'active'::phase_status,
      110,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'winifred46'),
      NULL,
      1,
      1,
      'active'::phase_status,
      111,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'liquid_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ella_ratke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ella_ratke'),
      0,
      2,
      'completed'::phase_status,
      112,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'godfreyjenkins91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_trainer_5'),
      NULL,
      1,
      1,
      'active'::phase_status,
      113,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thorny_trainer_213'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nicolaconn45'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thorny_trainer_213'),
      2,
      1,
      'completed'::phase_status,
      114,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashamed_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sally_block33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ashamed_elite'),
      2,
      0,
      'completed'::phase_status,
      115,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'garricklindgren16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'foolhardy_trainer_79'),
      NULL,
      1,
      1,
      'active'::phase_status,
      116,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'janellebradtke25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'filthy_trainer_361'),
      2,
      0,
      'completed'::phase_status,
      117,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_161'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sniveling_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_161'),
      2,
      0,
      'completed'::phase_status,
      118,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'happy_trainer_400'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'viviane_rempel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'viviane_rempel'),
      1,
      2,
      'completed'::phase_status,
      119,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cristobalupton55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arnoldo81'),
      NULL,
      1,
      1,
      'active'::phase_status,
      120,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chance65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ordinary_trainer_36'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chance65'),
      2,
      0,
      'completed'::phase_status,
      121,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brilliant_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'novakuhic68'),
      NULL,
      1,
      1,
      'active'::phase_status,
      122,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scottie17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jailyn75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jailyn75'),
      0,
      2,
      'completed'::phase_status,
      123,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'estell85'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'candid_breeder'),
      NULL,
      1,
      1,
      'active'::phase_status,
      124,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_trainer_532'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'titus_kohler60'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_trainer_532'),
      2,
      0,
      'completed'::phase_status,
      125,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'angelic_trainer_423'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'irma58'),
      NULL,
      1,
      1,
      'active'::phase_status,
      126,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'total_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'teagan92'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'teagan92'),
      1,
      2,
      'completed'::phase_status,
      127,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'izabellabeahan79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trentheaney20'),
      0,
      2,
      'completed'::phase_status,
      128,
      (seed_now - interval '28 minutes'),
      (seed_now - interval '3 minutes')
    );
  END IF;

  -- Tournament: Pallet Town Trainers Week 2 Championship
  -- Phase: Swiss Rounds
  SELECT p.id INTO phase_id FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE t.slug = 'pallet-town-championship-week-02' AND p.phase_order = 1;
  IF phase_id IS NULL THEN
    RAISE NOTICE 'Phase not found for pallet-town-championship-week-02 order 1';
  ELSE
    -- Round 1
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 1, 'Round 1', 'completed'::phase_status,
      (seed_now - interval '3 hours'), (seed_now - interval '2 hours 33 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oval_trainer_521'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'robin_schultz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robin_schultz'),
      1,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nolanlangosh54'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinemiller24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayden33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinemiller24'),
      2,
      0,
      'completed'::phase_status,
      3,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eugene_huel73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'woeful_trainer_243'),
      1,
      2,
      'completed'::phase_status,
      4,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_653'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'powerless_trainer_33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frozen_trainer_653'),
      2,
      0,
      'completed'::phase_status,
      5,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brody25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'domenic_jast43'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brody25'),
      2,
      0,
      'completed'::phase_status,
      6,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scottie17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'elsie_stroman'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'elsie_stroman'),
      1,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashtyn_vonrueden'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bad_trainer_106'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bad_trainer_106'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'halliefay16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianamitchell71'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianna_stokes'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'myrtice66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianna_stokes'),
      2,
      0,
      'completed'::phase_status,
      10,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 35 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scornful_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scornful_elite'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'krystina_beatty85'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kenna_beahan'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'krystina_beatty85'),
      2,
      1,
      'completed'::phase_status,
      12,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fredrick_hagenes66'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fredrick_hagenes66'),
      2,
      1,
      'completed'::phase_status,
      13,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delectable_trainer_3'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alvertalemke46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alvertalemke46'),
      1,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mariannamacejkovic76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hope_cummerata20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mariannamacejkovic76'),
      2,
      1,
      'completed'::phase_status,
      15,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lance'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'filthy_trainer_361'),
      2,
      0,
      'completed'::phase_status,
      16,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'liquid_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'well_to_do_trainer_5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_to_do_trainer_5'),
      1,
      2,
      'completed'::phase_status,
      17,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'substantial_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garett_bergnaum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'garett_bergnaum'),
      0,
      2,
      'completed'::phase_status,
      18,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dariusschneider93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'carleykerluke47'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dariusschneider93'),
      2,
      0,
      'completed'::phase_status,
      19,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'millie_zieme65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'monica_crist_fahey79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'millie_zieme65'),
      2,
      1,
      'completed'::phase_status,
      20,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'michale_orn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'viviane_rempel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'viviane_rempel'),
      1,
      2,
      'completed'::phase_status,
      21,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lonny_bechtelar49'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lonny_bechtelar49'),
      2,
      0,
      'completed'::phase_status,
      22,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'neat_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'laurynbalistreri76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurynbalistreri76'),
      0,
      2,
      'completed'::phase_status,
      23,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'stanley_schneider'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'purple_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stanley_schneider'),
      2,
      0,
      'completed'::phase_status,
      24,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colorless_trainer_93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_champio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'colorless_trainer_93'),
      2,
      0,
      'completed'::phase_status,
      25,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'long_trainer_533'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'opheliadicki91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'long_trainer_533'),
      2,
      0,
      'completed'::phase_status,
      26,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eryn_stracke_hand41'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cynthia'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      2,
      1,
      'completed'::phase_status,
      27,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faint_trainer_713'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jeffryyost15'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jeffryyost15'),
      1,
      2,
      'completed'::phase_status,
      28,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enlightened_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinaklocko65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      0,
      2,
      'completed'::phase_status,
      29,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'aliviashields97'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jermaineharvey25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jermaineharvey25'),
      1,
      2,
      'completed'::phase_status,
      30,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'angelic_trainer_423'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'uncomfortable_traine'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'uncomfortable_traine'),
      0,
      2,
      'completed'::phase_status,
      31,
      (seed_now - interval '3 hours'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'casimer_baumbach'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'winifred46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'winifred46'),
      0,
      2,
      'completed'::phase_status,
      32,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'claudestreich31'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sigrid67'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigrid67'),
      0,
      2,
      'completed'::phase_status,
      33,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiyaabshire82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lera_reilly90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiyaabshire82'),
      2,
      0,
      'completed'::phase_status,
      34,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanie_maggio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kelli_buckridge72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kelli_buckridge72'),
      0,
      2,
      'completed'::phase_status,
      35,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delores_orn44'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fortunate_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fortunate_champion'),
      0,
      2,
      'completed'::phase_status,
      36,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'drab_trainer_487'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'qualified_trainer_61'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'qualified_trainer_61'),
      1,
      2,
      'completed'::phase_status,
      37,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'johnnievandervort55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'johnnievandervort55'),
      2,
      0,
      'completed'::phase_status,
      38,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dario_west44'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sorrowful_trainer_13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dario_west44'),
      2,
      0,
      'completed'::phase_status,
      39,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trentheaney20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'laurettayundt22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurettayundt22'),
      0,
      2,
      'completed'::phase_status,
      40,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'joshweimann33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette_harber2'),
      2,
      1,
      'completed'::phase_status,
      41,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sneaky_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'short_term_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'short_term_elite'),
      1,
      2,
      'completed'::phase_status,
      42,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nigeljerde94'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dixiesanford87'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dixiesanford87'),
      0,
      2,
      'completed'::phase_status,
      43,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jaydeemard34'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gregorio_schuster_ke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jaydeemard34'),
      2,
      0,
      'completed'::phase_status,
      44,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'emiliebednar53'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hilbert38'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'emiliebednar53'),
      2,
      0,
      'completed'::phase_status,
      45,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'blank_trainer_642'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vernie34'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blank_trainer_642'),
      2,
      0,
      'completed'::phase_status,
      46,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wicked_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sally_block33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wicked_trainer'),
      2,
      0,
      'completed'::phase_status,
      47,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chaz13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chaunceyjohnson55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chaunceyjohnson55'),
      0,
      2,
      'completed'::phase_status,
      48,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sammy_pouros'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'felicia62'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'felicia62'),
      0,
      2,
      'completed'::phase_status,
      49,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'norene68'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ronny_koss27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ronny_koss27'),
      1,
      2,
      'completed'::phase_status,
      50,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'heavy_trainer_256'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frequent_trainer_572'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'heavy_trainer_256'),
      2,
      0,
      'completed'::phase_status,
      51,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilie_medhurst82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'violent_trainer_345'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'violent_trainer_345'),
      0,
      2,
      'completed'::phase_status,
      52,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gloomy_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rosy_trainer_409'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rosy_trainer_409'),
      0,
      2,
      'completed'::phase_status,
      53,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bustling_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'demetrius_gutkowski'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bustling_elite'),
      2,
      0,
      'completed'::phase_status,
      54,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scornful_trainer_666'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'aged_trainer_120'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scornful_trainer_666'),
      2,
      1,
      'completed'::phase_status,
      55,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jailyn75'),
      2,
      1,
      'completed'::phase_status,
      56,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'elaina_nitzsche'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wilsontrantow30'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'elaina_nitzsche'),
      2,
      1,
      'completed'::phase_status,
      57,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'huge_trainer_672'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'huge_trainer_672'),
      2,
      0,
      'completed'::phase_status,
      58,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'distinct_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusty_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusty_gym'),
      0,
      2,
      'completed'::phase_status,
      59,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'khalillarson_schuppe'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette20'),
      0,
      2,
      'completed'::phase_status,
      60,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'twin_trainer_704'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lucius41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lucius41'),
      0,
      2,
      'completed'::phase_status,
      61,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'smooth_trainer_36'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hildegard_predovic'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'smooth_trainer_36'),
      2,
      0,
      'completed'::phase_status,
      62,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brilliant_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'weldon_bergnaum_schu'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brilliant_breeder'),
      2,
      1,
      'completed'::phase_status,
      63,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mauricelittel79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eminent_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mauricelittel79'),
      2,
      0,
      'completed'::phase_status,
      64,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fausto_mraz11'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chad_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chad_friesen'),
      1,
      2,
      'completed'::phase_status,
      65,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dirty_trainer_951'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adela1'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'adela1'),
      0,
      2,
      'completed'::phase_status,
      66,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'abelardo_konopelski'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'insistent_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'abelardo_konopelski'),
      2,
      0,
      'completed'::phase_status,
      67,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'treviono_kon17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marguerite_hintz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'treviono_kon17'),
      2,
      0,
      'completed'::phase_status,
      68,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'price45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_12'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_12'),
      0,
      2,
      'completed'::phase_status,
      69,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scary_trainer_677'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'big_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scary_trainer_677'),
      2,
      0,
      'completed'::phase_status,
      70,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tianna46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      1,
      2,
      'completed'::phase_status,
      71,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'werner_auer80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sick_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'werner_auer80'),
      2,
      1,
      'completed'::phase_status,
      72,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'assuntaschoen_koelpi'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thorny_trainer_213'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'assuntaschoen_koelpi'),
      2,
      0,
      'completed'::phase_status,
      73,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'malvinamitchell24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      1,
      2,
      'completed'::phase_status,
      74,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'red'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oleflatley25'),
      2,
      0,
      'completed'::phase_status,
      75,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmin_lubowitz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'caleighparker77'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'caleighparker77'),
      0,
      2,
      'completed'::phase_status,
      76,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brown_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaeden50'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brown_gym'),
      2,
      1,
      'completed'::phase_status,
      77,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brannonlarkin62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sigmund_senger46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brannonlarkin62'),
      2,
      0,
      'completed'::phase_status,
      78,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'front_trainer_895'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jazmyne80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'front_trainer_895'),
      2,
      0,
      'completed'::phase_status,
      79,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'emmittdubuque80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'total_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'total_champion'),
      1,
      2,
      'completed'::phase_status,
      80,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'late_trainer_395'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tressa72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'late_trainer_395'),
      2,
      1,
      'completed'::phase_status,
      81,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cathrinemosciski_wun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'coralie_bernhard'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cathrinemosciski_wun'),
      2,
      1,
      'completed'::phase_status,
      82,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'defensive_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'colby_roberts52'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'defensive_champion'),
      2,
      0,
      'completed'::phase_status,
      83,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'awful_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'squeaky_trainer_454'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'awful_ranger'),
      2,
      1,
      'completed'::phase_status,
      84,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lee51'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jessicaleannon22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lee51'),
      2,
      1,
      'completed'::phase_status,
      85,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rare_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cyrilfriesen33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cyrilfriesen33'),
      0,
      2,
      'completed'::phase_status,
      86,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'odd_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'candid_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'odd_ranger'),
      2,
      0,
      'completed'::phase_status,
      87,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'entire_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'beloved_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'beloved_leader'),
      0,
      2,
      'completed'::phase_status,
      88,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jabari_pagac18'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ella_ratke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jabari_pagac18'),
      2,
      0,
      'completed'::phase_status,
      89,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'katheryn_braun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_zulauf'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katheryn_braun'),
      2,
      0,
      'completed'::phase_status,
      90,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nervous_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ciara_heidenreich33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ciara_heidenreich33'),
      0,
      2,
      'completed'::phase_status,
      91,
      (seed_now - interval '2 hours 59 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'itzel12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sophieorn25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sophieorn25'),
      1,
      2,
      'completed'::phase_status,
      92,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'broderick40'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'well_lit_trainer_814'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_lit_trainer_814'),
      0,
      2,
      'completed'::phase_status,
      93,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'orland_kihn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'orland_kihn'),
      2,
      1,
      'completed'::phase_status,
      94,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanelfeeney90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'noted_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanelfeeney90'),
      2,
      1,
      'completed'::phase_status,
      95,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frivolous_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'soupy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'soupy_breeder'),
      1,
      2,
      'completed'::phase_status,
      96,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jacynthe_klein'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'salty_trainer_403'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'salty_trainer_403'),
      0,
      2,
      'completed'::phase_status,
      97,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marquis78'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_161'),
      1,
      2,
      'completed'::phase_status,
      98,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bowed_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'karen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      2,
      1,
      'completed'::phase_status,
      99,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'garricklindgren16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'leta_kunde1'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'garricklindgren16'),
      2,
      0,
      'completed'::phase_status,
      100,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vincent_hickle19'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vincent_hickle19'),
      1,
      2,
      'completed'::phase_status,
      101,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'waynegorczany73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sniveling_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sniveling_trainer'),
      1,
      2,
      'completed'::phase_status,
      102,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'those_trainer_198'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delilaho_hara84'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delilaho_hara84'),
      0,
      2,
      'completed'::phase_status,
      103,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressie65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stunning_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tressie65'),
      2,
      0,
      'completed'::phase_status,
      104,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alda_rau2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oswaldo_kling'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alda_rau2'),
      2,
      1,
      'completed'::phase_status,
      105,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gummy_pro'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wilhelmmccullough77'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gummy_pro'),
      2,
      0,
      'completed'::phase_status,
      106,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'weekly_trainer_641'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shy_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'weekly_trainer_641'),
      2,
      0,
      'completed'::phase_status,
      107,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'janellebradtke25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_witted_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_witted_leader'),
      1,
      2,
      'completed'::phase_status,
      108,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'taut_trainer_671'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tatyanahintz44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tatyanahintz44'),
      0,
      2,
      'completed'::phase_status,
      109,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'crooked_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'price_fay82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'crooked_gym'),
      2,
      0,
      'completed'::phase_status,
      110,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'incomplete_trainer_6'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'admin_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'admin_trainer'),
      0,
      2,
      'completed'::phase_status,
      111,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pertinent_trainer_27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pertinent_trainer_27'),
      2,
      0,
      'completed'::phase_status,
      112,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thoramarvin72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'izabellabeahan79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thoramarvin72'),
      2,
      0,
      'completed'::phase_status,
      113,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lenore_schulist95'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasandracronin25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasandracronin25'),
      1,
      2,
      'completed'::phase_status,
      114,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thrifty_trainer_14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adolfomoen96'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thrifty_trainer_14'),
      2,
      1,
      'completed'::phase_status,
      115,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delta_olson'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'flaviedare76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delta_olson'),
      2,
      1,
      'completed'::phase_status,
      116,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'practical_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayla75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'practical_leader'),
      2,
      1,
      'completed'::phase_status,
      117,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'overcooked_trainer_5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'corrupt_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'corrupt_trainer'),
      1,
      2,
      'completed'::phase_status,
      118,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusting_trainer_973'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fred_pacocha47'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusting_trainer_973'),
      2,
      0,
      'completed'::phase_status,
      119,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robust_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'arnoldo81'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'arnoldo81'),
      0,
      2,
      'completed'::phase_status,
      120,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cooperative_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_trainer_532'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cooperative_trainer_'),
      2,
      1,
      'completed'::phase_status,
      121,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ophelia96'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ophelia96'),
      1,
      2,
      'completed'::phase_status,
      122,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'westonwilderman14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'flo_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'westonwilderman14'),
      2,
      0,
      'completed'::phase_status,
      123,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'vidaboyle57'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'enriquebalistreri40'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'enriquebalistreri40'),
      0,
      2,
      'completed'::phase_status,
      124,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ornery_trainer_904'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'blanca13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blanca13'),
      1,
      2,
      'completed'::phase_status,
      125,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'godfreyjenkins91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'godfreyjenkins91'),
      2,
      1,
      'completed'::phase_status,
      126,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clevekling88'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'slushy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clevekling88'),
      2,
      0,
      'completed'::phase_status,
      127,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shad_williamson9'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vain_trainer_113'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vain_trainer_113'),
      1,
      2,
      'completed'::phase_status,
      128,
      (seed_now - interval '2 hours 58 minutes'),
      (seed_now - interval '2 hours 33 minutes')
    );
    -- Round 2
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 2, 'Round 2', 'completed'::phase_status,
      (seed_now - interval '2 hours 10 minutes'), (seed_now - interval '1 hours 43 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'winifred46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'winifred46'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'salty_trainer_403'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wicked_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wicked_trainer'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_653'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'enriquebalistreri40'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frozen_trainer_653'),
      2,
      0,
      'completed'::phase_status,
      3,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chad_friesen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'filthy_trainer_361'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chad_friesen'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'werner_auer80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cathrinemosciski_wun'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cathrinemosciski_wun'),
      0,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'heavy_trainer_256'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'clevekling88'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'heavy_trainer_256'),
      2,
      1,
      'completed'::phase_status,
      6,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'maiyaabshire82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bustling_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bustling_elite'),
      1,
      2,
      'completed'::phase_status,
      7,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'vain_trainer_113'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'viviane_rempel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'viviane_rempel'),
      0,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thoramarvin72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'beloved_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thoramarvin72'),
      2,
      1,
      'completed'::phase_status,
      9,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jabari_pagac18'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jeffryyost15'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jabari_pagac18'),
      2,
      1,
      'completed'::phase_status,
      10,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 45 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'defensive_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'defensive_champion'),
      2,
      1,
      'completed'::phase_status,
      11,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'assuntaschoen_koelpi'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vincent_hickle19'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'assuntaschoen_koelpi'),
      2,
      1,
      'completed'::phase_status,
      12,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delta_olson'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianna_stokes'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delta_olson'),
      2,
      1,
      'completed'::phase_status,
      13,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ciara_heidenreich33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'huge_trainer_672'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'huge_trainer_672'),
      1,
      2,
      'completed'::phase_status,
      14,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ophelia96'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'millie_zieme65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ophelia96'),
      2,
      0,
      'completed'::phase_status,
      15,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'violent_trainer_345'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fredrick_hagenes66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fredrick_hagenes66'),
      0,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ronny_koss27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garett_bergnaum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ronny_koss27'),
      2,
      0,
      'completed'::phase_status,
      17,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusting_trainer_973'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'practical_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'practical_leader'),
      0,
      2,
      'completed'::phase_status,
      18,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'felicia62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brannonlarkin62'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'felicia62'),
      2,
      0,
      'completed'::phase_status,
      19,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dim_trainer_491'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'godfreyjenkins91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'godfreyjenkins91'),
      0,
      2,
      'completed'::phase_status,
      20,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delilaho_hara84'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'elsie_stroman'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'elsie_stroman'),
      0,
      2,
      'completed'::phase_status,
      21,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kelli_buckridge72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alda_rau2'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alda_rau2'),
      0,
      2,
      'completed'::phase_status,
      22,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'well_to_do_trainer_5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gummy_pro'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_to_do_trainer_5'),
      2,
      0,
      'completed'::phase_status,
      23,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bad_trainer_106'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'admin_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bad_trainer_106'),
      2,
      0,
      'completed'::phase_status,
      24,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'late_trainer_395'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'crooked_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'late_trainer_395'),
      2,
      1,
      'completed'::phase_status,
      25,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sniveling_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette20'),
      2,
      0,
      'completed'::phase_status,
      26,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'quick_witted_leader'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garricklindgren16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'garricklindgren16'),
      1,
      2,
      'completed'::phase_status,
      27,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dariusschneider93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scary_trainer_677'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dariusschneider93'),
      2,
      0,
      'completed'::phase_status,
      28,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mariannamacejkovic76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'awful_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mariannamacejkovic76'),
      2,
      0,
      'completed'::phase_status,
      29,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mauricelittel79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fortunate_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fortunate_champion'),
      0,
      2,
      'completed'::phase_status,
      30,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sophieorn25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katheryn_braun'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katheryn_braun'),
      1,
      2,
      'completed'::phase_status,
      31,
      (seed_now - interval '2 hours 10 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brilliant_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'laurynbalistreri76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurynbalistreri76'),
      1,
      2,
      'completed'::phase_status,
      32,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'krystina_beatty85'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'krystina_beatty85'),
      0,
      2,
      'completed'::phase_status,
      33,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cyrilfriesen33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'total_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'total_champion'),
      0,
      2,
      'completed'::phase_status,
      34,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bowed_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'pertinent_trainer_27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      2,
      1,
      'completed'::phase_status,
      35,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette_harber2'),
      2,
      0,
      'completed'::phase_status,
      36,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'soupy_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'abelardo_konopelski'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'abelardo_konopelski'),
      0,
      2,
      'completed'::phase_status,
      37,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colorless_trainer_93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'corrupt_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'colorless_trainer_93'),
      2,
      0,
      'completed'::phase_status,
      38,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'arnoldo81'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'uncomfortable_traine'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'arnoldo81'),
      2,
      1,
      'completed'::phase_status,
      39,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cooperative_trainer_'),
      1,
      2,
      'completed'::phase_status,
      40,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'blanca13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaydeemard34'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blanca13'),
      2,
      1,
      'completed'::phase_status,
      41,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lonny_bechtelar49'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lee51'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lonny_bechtelar49'),
      2,
      0,
      'completed'::phase_status,
      42,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurettayundt22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'caleighparker77'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'caleighparker77'),
      1,
      2,
      'completed'::phase_status,
      43,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'weekly_trainer_641'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      2,
      0,
      'completed'::phase_status,
      44,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robin_schultz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'blank_trainer_642'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blank_trainer_642'),
      0,
      2,
      'completed'::phase_status,
      45,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rosy_trainer_409'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dixiesanford87'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rosy_trainer_409'),
      2,
      1,
      'completed'::phase_status,
      46,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alvertalemke46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scornful_trainer_666'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alvertalemke46'),
      2,
      0,
      'completed'::phase_status,
      47,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'emiliebednar53'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thrifty_trainer_14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'emiliebednar53'),
      2,
      0,
      'completed'::phase_status,
      48,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianamitchell71'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'johnnievandervort55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      2,
      0,
      'completed'::phase_status,
      49,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'orland_kihn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasandracronin25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'orland_kihn'),
      2,
      0,
      'completed'::phase_status,
      50,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'qualified_trainer_61'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'front_trainer_895'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'front_trainer_895'),
      0,
      2,
      'completed'::phase_status,
      51,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressie65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brody25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tressie65'),
      2,
      0,
      'completed'::phase_status,
      52,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'adela1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tatyanahintz44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tatyanahintz44'),
      0,
      2,
      'completed'::phase_status,
      53,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'long_trainer_533'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'short_term_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'long_trainer_533'),
      2,
      1,
      'completed'::phase_status,
      54,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'elaina_nitzsche'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'well_lit_trainer_814'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_lit_trainer_814'),
      1,
      2,
      'completed'::phase_status,
      55,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shanelfeeney90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oleflatley25'),
      2,
      0,
      'completed'::phase_status,
      56,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sigrid67'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dario_west44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigrid67'),
      2,
      0,
      'completed'::phase_status,
      57,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lucius41'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'woeful_trainer_243'),
      0,
      2,
      'completed'::phase_status,
      58,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stanley_schneider'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jailyn75'),
      2,
      0,
      'completed'::phase_status,
      59,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'savanah33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'smooth_trainer_36'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      2,
      0,
      'completed'::phase_status,
      60,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chaunceyjohnson55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinemiller24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chaunceyjohnson55'),
      2,
      1,
      'completed'::phase_status,
      61,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'odd_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_12'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_12'),
      1,
      2,
      'completed'::phase_status,
      62,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scornful_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jermaineharvey25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scornful_elite'),
      2,
      1,
      'completed'::phase_status,
      63,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'treviono_kon17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brown_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brown_gym'),
      0,
      2,
      'completed'::phase_status,
      64,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'demetrius_gutkowski'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'candid_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'demetrius_gutkowski'),
      2,
      0,
      'completed'::phase_status,
      65,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'opheliadicki91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'insistent_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'opheliadicki91'),
      2,
      0,
      'completed'::phase_status,
      66,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delectable_trainer_3'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'price_fay82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'price_fay82'),
      1,
      2,
      'completed'::phase_status,
      67,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hope_cummerata20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hope_cummerata20'),
      1,
      2,
      'completed'::phase_status,
      68,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'casimer_baumbach'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'those_trainer_198'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'those_trainer_198'),
      1,
      2,
      'completed'::phase_status,
      69,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faraway_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faraway_master'),
      2,
      0,
      'completed'::phase_status,
      70,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 44 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'leta_kunde1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shanie_maggio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'leta_kunde1'),
      2,
      0,
      'completed'::phase_status,
      71,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'khalillarson_schuppe'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'noted_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'khalillarson_schuppe'),
      2,
      1,
      'completed'::phase_status,
      72,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stunning_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      2,
      0,
      'completed'::phase_status,
      73,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nervous_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adolfomoen96'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nervous_trainer'),
      2,
      0,
      'completed'::phase_status,
      74,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'price45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'enlightened_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'price45'),
      2,
      1,
      'completed'::phase_status,
      75,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'coralie_bernhard'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marguerite_hintz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'coralie_bernhard'),
      2,
      0,
      'completed'::phase_status,
      76,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'big_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lance'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'big_gym'),
      2,
      0,
      'completed'::phase_status,
      77,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wilhelmmccullough77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gloomy_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wilhelmmccullough77'),
      2,
      0,
      'completed'::phase_status,
      78,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'flaviedare76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sammy_pouros'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sammy_pouros'),
      1,
      2,
      'completed'::phase_status,
      79,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'impossible_trainer_9'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faint_trainer_713'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'impossible_trainer_9'),
      2,
      1,
      'completed'::phase_status,
      80,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frequent_trainer_572'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_trainer_5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frequent_trainer_572'),
      2,
      1,
      'completed'::phase_status,
      81,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ornery_trainer_904'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'emmittdubuque80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ornery_trainer_904'),
      2,
      0,
      'completed'::phase_status,
      82,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scottie17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'waynegorczany73'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'waynegorczany73'),
      1,
      2,
      'completed'::phase_status,
      83,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'liquid_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jazmin_lubowitz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jazmin_lubowitz'),
      0,
      2,
      'completed'::phase_status,
      84,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'entire_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eminent_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'entire_trainer'),
      2,
      0,
      'completed'::phase_status,
      85,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'multicolored_champio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'itzel12'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_champio'),
      2,
      1,
      'completed'::phase_status,
      86,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmyne80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delores_orn44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delores_orn44'),
      0,
      2,
      'completed'::phase_status,
      87,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thorny_trainer_213'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thorny_trainer_213'),
      2,
      0,
      'completed'::phase_status,
      88,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_zulauf'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trentheaney20'),
      0,
      2,
      'completed'::phase_status,
      89,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'michale_orn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'aged_trainer_120'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'aged_trainer_120'),
      0,
      2,
      'completed'::phase_status,
      90,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shy_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cristobalupton55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      0,
      2,
      'completed'::phase_status,
      91,
      (seed_now - interval '2 hours 9 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fred_pacocha47'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'domenic_jast43'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fred_pacocha47'),
      2,
      1,
      'completed'::phase_status,
      92,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jaeden50'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rare_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jaeden50'),
      2,
      0,
      'completed'::phase_status,
      93,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'carleykerluke47'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vernie34'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'carleykerluke47'),
      2,
      1,
      'completed'::phase_status,
      94,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'twin_trainer_704'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sally_block33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'twin_trainer_704'),
      2,
      1,
      'completed'::phase_status,
      95,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hildegard_predovic'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasey_jacobi99'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      0,
      2,
      'completed'::phase_status,
      96,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lera_reilly90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'weldon_bergnaum_schu'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'weldon_bergnaum_schu'),
      1,
      2,
      'completed'::phase_status,
      97,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'slushy_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rey_bode55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'slushy_breeder'),
      2,
      0,
      'completed'::phase_status,
      98,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'monica_crist_fahey79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oswaldo_kling'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      0,
      2,
      'completed'::phase_status,
      99,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'drab_trainer_487'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sorrowful_trainer_13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sorrowful_trainer_13'),
      1,
      2,
      'completed'::phase_status,
      100,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sick_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'izabellabeahan79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sick_trainer'),
      2,
      0,
      'completed'::phase_status,
      101,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'squeaky_trainer_454'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      1,
      2,
      'completed'::phase_status,
      102,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'karen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tressa72'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tressa72'),
      1,
      2,
      'completed'::phase_status,
      103,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kayla75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sigmund_senger46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kayla75'),
      2,
      0,
      'completed'::phase_status,
      104,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lenore_schulist95'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'distinct_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lenore_schulist95'),
      2,
      1,
      'completed'::phase_status,
      105,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nigeljerde94'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'incomplete_trainer_6'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nigeljerde94'),
      2,
      0,
      'completed'::phase_status,
      106,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chaz13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marilie_medhurst82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chaz13'),
      2,
      1,
      'completed'::phase_status,
      107,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'angelic_trainer_423'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fausto_mraz11'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'angelic_trainer_423'),
      2,
      1,
      'completed'::phase_status,
      108,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'flo_friesen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dirty_trainer_951'),
      0,
      2,
      'completed'::phase_status,
      109,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'substantial_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'powerless_trainer_33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'powerless_trainer_33'),
      1,
      2,
      'completed'::phase_status,
      110,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gregorio_schuster_ke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gregorio_schuster_ke'),
      2,
      1,
      'completed'::phase_status,
      111,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'janellebradtke25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cynthia'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cynthia'),
      1,
      2,
      'completed'::phase_status,
      112,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'houston_walter'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hilbert38'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'houston_walter'),
      2,
      0,
      'completed'::phase_status,
      113,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frivolous_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'norene68'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'norene68'),
      0,
      2,
      'completed'::phase_status,
      114,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tianna46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'broderick40'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tianna46'),
      2,
      0,
      'completed'::phase_status,
      115,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashtyn_vonrueden'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'robust_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robust_elite'),
      1,
      2,
      'completed'::phase_status,
      116,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colby_roberts52'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'aliviashields97'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'aliviashields97'),
      1,
      2,
      'completed'::phase_status,
      117,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'halliefay16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oval_trainer_521'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oval_trainer_521'),
      1,
      2,
      'completed'::phase_status,
      118,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sneaky_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayden33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kayden33'),
      1,
      2,
      'completed'::phase_status,
      119,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wilsontrantow30'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'myrtice66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'myrtice66'),
      0,
      2,
      'completed'::phase_status,
      120,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clint_denesik'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jessicaleannon22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clint_denesik'),
      2,
      0,
      'completed'::phase_status,
      121,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ella_ratke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_trainer_532'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ella_ratke'),
      2,
      1,
      'completed'::phase_status,
      122,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'malvinamitchell24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kenna_beahan'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kenna_beahan'),
      1,
      2,
      'completed'::phase_status,
      123,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'overcooked_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jacynthe_klein'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'overcooked_ranger'),
      2,
      1,
      'completed'::phase_status,
      124,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sincere98'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'claudestreich31'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'claudestreich31'),
      0,
      2,
      'completed'::phase_status,
      125,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'red'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vidaboyle57'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'red'),
      2,
      0,
      'completed'::phase_status,
      126,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eugene_huel73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'taut_trainer_671'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'taut_trainer_671'),
      0,
      2,
      'completed'::phase_status,
      127,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'purple_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'neat_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'purple_champion'),
      2,
      0,
      'completed'::phase_status,
      128,
      (seed_now - interval '2 hours 8 minutes'),
      (seed_now - interval '1 hours 43 minutes')
    );
    -- Round 3
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 3, 'Round 3', 'completed'::phase_status,
      (seed_now - interval '1 hours 20 minutes'), (seed_now - interval '32 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'elsie_stroman'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette20'),
      2,
      0,
      'completed'::phase_status,
      1,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jabari_pagac18'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brown_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jabari_pagac18'),
      2,
      0,
      'completed'::phase_status,
      2,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurynbalistreri76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'long_trainer_533'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'long_trainer_533'),
      0,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fredrick_hagenes66'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'abelardo_konopelski'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fredrick_hagenes66'),
      2,
      0,
      'completed'::phase_status,
      4,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'savanah33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'caleighparker77'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'caleighparker77'),
      1,
      2,
      'completed'::phase_status,
      5,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'well_lit_trainer_814'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tatyanahintz44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_lit_trainer_814'),
      2,
      0,
      'completed'::phase_status,
      6,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'viviane_rempel'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wicked_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'viviane_rempel'),
      2,
      1,
      'completed'::phase_status,
      7,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'arnoldo81'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bad_trainer_106'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bad_trainer_106'),
      1,
      2,
      'completed'::phase_status,
      8,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alda_rau2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'winifred46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alda_rau2'),
      2,
      0,
      'completed'::phase_status,
      9,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '55 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressie65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lonny_bechtelar49'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lonny_bechtelar49'),
      1,
      2,
      'completed'::phase_status,
      10,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'huge_trainer_672'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'godfreyjenkins91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'huge_trainer_672'),
      2,
      0,
      'completed'::phase_status,
      11,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sigrid67'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garricklindgren16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigrid67'),
      2,
      0,
      'completed'::phase_status,
      12,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cooperative_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chad_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cooperative_trainer_'),
      2,
      0,
      'completed'::phase_status,
      13,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frozen_trainer_653'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oleflatley25'),
      2,
      1,
      'completed'::phase_status,
      14,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'blanca13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bustling_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bustling_elite'),
      1,
      2,
      'completed'::phase_status,
      15,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianamitchell71'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ronny_koss27'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ronny_koss27'),
      0,
      2,
      'completed'::phase_status,
      16,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thoramarvin72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'defensive_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thoramarvin72'),
      2,
      1,
      'completed'::phase_status,
      17,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chaunceyjohnson55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'annette_harber2'),
      2,
      0,
      'completed'::phase_status,
      18,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katheryn_braun'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'katheryn_braun'),
      1,
      2,
      'completed'::phase_status,
      19,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'assuntaschoen_koelpi'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'heavy_trainer_256'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'heavy_trainer_256'),
      0,
      2,
      'completed'::phase_status,
      20,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fortunate_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jailyn75'),
      2,
      0,
      'completed'::phase_status,
      21,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colorless_trainer_93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'late_trainer_395'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'colorless_trainer_93'),
      2,
      0,
      'completed'::phase_status,
      22,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'front_trainer_895'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'orland_kihn'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'orland_kihn'),
      0,
      2,
      'completed'::phase_status,
      23,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bowed_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'bowed_ace'),
      2,
      0,
      'completed'::phase_status,
      24,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ophelia96'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'blank_trainer_642'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ophelia96'),
      2,
      0,
      'completed'::phase_status,
      25,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '34 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'felicia62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'total_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'felicia62'),
      2,
      0,
      'completed'::phase_status,
      26,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delta_olson'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'krystina_beatty85'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'krystina_beatty85'),
      1,
      2,
      'completed'::phase_status,
      27,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alvertalemke46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'well_to_do_trainer_5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_to_do_trainer_5'),
      0,
      2,
      'completed'::phase_status,
      28,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'mariannamacejkovic76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mariannamacejkovic76'),
      0,
      2,
      'completed'::phase_status,
      29,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rosy_trainer_409'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dariusschneider93'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rosy_trainer_409'),
      2,
      0,
      'completed'::phase_status,
      30,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cathrinemosciski_wun'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'emiliebednar53'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cathrinemosciski_wun'),
      2,
      1,
      'completed'::phase_status,
      31,
      (seed_now - interval '1 hours 20 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scornful_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'practical_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scornful_elite'),
      2,
      1,
      'completed'::phase_status,
      32,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frequent_trainer_572'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frequent_trainer_572'),
      2,
      1,
      'completed'::phase_status,
      33,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gregorio_schuster_ke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'millie_zieme65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'millie_zieme65'),
      0,
      2,
      'completed'::phase_status,
      34,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sniveling_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaeden50'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sniveling_trainer'),
      2,
      1,
      'completed'::phase_status,
      35,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robust_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'leta_kunde1'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robust_elite'),
      2,
      0,
      'completed'::phase_status,
      36,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'elaina_nitzsche'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaydeemard34'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'elaina_nitzsche'),
      2,
      0,
      'completed'::phase_status,
      37,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'aged_trainer_120'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayden33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'aged_trainer_120'),
      2,
      0,
      'completed'::phase_status,
      38,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'odd_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'purple_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'odd_ranger'),
      2,
      1,
      'completed'::phase_status,
      39,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'vain_trainer_113'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'westonwilderman14'),
      0,
      2,
      'completed'::phase_status,
      40,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'aliviashields97'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marianna_stokes'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianna_stokes'),
      1,
      2,
      'completed'::phase_status,
      41,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jermaineharvey25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'slushy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jermaineharvey25'),
      2,
      1,
      'completed'::phase_status,
      42,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'red'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'overcooked_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'red'),
      2,
      1,
      'completed'::phase_status,
      43,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'adela1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sorrowful_trainer_13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'adela1'),
      2,
      0,
      'completed'::phase_status,
      44,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dixiesanford87'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'made_up_trainer_161'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'made_up_trainer_161'),
      0,
      2,
      'completed'::phase_status,
      45,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brody25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brody25'),
      0,
      2,
      'completed'::phase_status,
      46,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delilaho_hara84'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'treviono_kon17'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delilaho_hara84'),
      2,
      1,
      'completed'::phase_status,
      47,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sammy_pouros'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nigeljerde94'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nigeljerde94'),
      0,
      2,
      'completed'::phase_status,
      48,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'coralie_bernhard'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_witted_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'coralie_bernhard'),
      2,
      0,
      'completed'::phase_status,
      49,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'clevekling88'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayla75'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kayla75'),
      1,
      2,
      'completed'::phase_status,
      50,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'stanley_schneider'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vincent_hickle19'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vincent_hickle19'),
      0,
      2,
      'completed'::phase_status,
      51,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ella_ratke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'powerless_trainer_33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'powerless_trainer_33'),
      1,
      2,
      'completed'::phase_status,
      52,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cristobalupton55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'price45'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'cristobalupton55'),
      2,
      0,
      'completed'::phase_status,
      53,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cynthia'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'maiyaabshire82'),
      0,
      2,
      'completed'::phase_status,
      54,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robin_schultz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fred_pacocha47'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'robin_schultz'),
      2,
      0,
      'completed'::phase_status,
      55,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brilliant_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'twin_trainer_704'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brilliant_breeder'),
      2,
      0,
      'completed'::phase_status,
      56,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hope_cummerata20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lucius41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hope_cummerata20'),
      2,
      0,
      'completed'::phase_status,
      57,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sick_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tianna46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sick_trainer'),
      2,
      1,
      'completed'::phase_status,
      58,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enriquebalistreri40'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dirty_trainer_951'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'enriquebalistreri40'),
      2,
      0,
      'completed'::phase_status,
      59,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'johnnievandervort55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lenore_schulist95'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'johnnievandervort55'),
      2,
      0,
      'completed'::phase_status,
      60,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eryn_stracke_hand41'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'price_fay82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      2,
      1,
      'completed'::phase_status,
      61,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'entire_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oval_trainer_521'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'entire_trainer'),
      2,
      0,
      'completed'::phase_status,
      62,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jeffryyost15'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'norene68'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'norene68'),
      0,
      2,
      'completed'::phase_status,
      63,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurettayundt22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'soupy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurettayundt22'),
      2,
      0,
      'completed'::phase_status,
      64,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kelli_buckridge72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'corrupt_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'corrupt_trainer'),
      1,
      2,
      'completed'::phase_status,
      65,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mauricelittel79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'violent_trainer_345'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'mauricelittel79'),
      2,
      0,
      'completed'::phase_status,
      66,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chaz13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'clint_denesik'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'clint_denesik'),
      0,
      2,
      'completed'::phase_status,
      67,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pertinent_trainer_27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'claudestreich31'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pertinent_trainer_27'),
      2,
      0,
      'completed'::phase_status,
      68,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'angelic_trainer_423'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lee51'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'angelic_trainer_423'),
      2,
      0,
      'completed'::phase_status,
      69,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'waynegorczany73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'waynegorczany73'),
      2,
      0,
      'completed'::phase_status,
      70,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'weekly_trainer_641'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garett_bergnaum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'garett_bergnaum'),
      1,
      2,
      'completed'::phase_status,
      71,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasandracronin25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_champio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasandracronin25'),
      2,
      1,
      'completed'::phase_status,
      72,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gummy_pro'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'uncomfortable_traine'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'uncomfortable_traine'),
      0,
      2,
      'completed'::phase_status,
      73,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wilhelmmccullough77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jazmin_lubowitz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wilhelmmccullough77'),
      2,
      0,
      'completed'::phase_status,
      74,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanelfeeney90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'alyson_stiedemann'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'alyson_stiedemann'),
      1,
      2,
      'completed'::phase_status,
      75,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'taut_trainer_671'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delores_orn44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'delores_orn44'),
      0,
      2,
      'completed'::phase_status,
      76,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusting_trainer_973'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thrifty_trainer_14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusting_trainer_973'),
      2,
      0,
      'completed'::phase_status,
      77,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dario_west44'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oswaldo_kling'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      0,
      2,
      'completed'::phase_status,
      78,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kenna_beahan'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dim_trainer_491'),
      0,
      2,
      'completed'::phase_status,
      79,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scornful_trainer_666'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'smooth_trainer_36'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'smooth_trainer_36'),
      1,
      2,
      'completed'::phase_status,
      80,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ciara_heidenreich33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'filthy_trainer_361'),
      2,
      1,
      'completed'::phase_status,
      81,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressa72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinemiller24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tressa72'),
      2,
      1,
      'completed'::phase_status,
      82,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sophieorn25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'myrtice66'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'myrtice66'),
      0,
      2,
      'completed'::phase_status,
      83,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'carleykerluke47'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'admin_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'carleykerluke47'),
      2,
      0,
      'completed'::phase_status,
      84,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marquis78'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'khalillarson_schuppe'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marquis78'),
      2,
      1,
      'completed'::phase_status,
      85,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '33 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'weldon_bergnaum_schu'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trusty_gym'),
      2,
      0,
      'completed'::phase_status,
      86,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'opheliadicki91'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'opheliadicki91'),
      2,
      0,
      'completed'::phase_status,
      87,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'awful_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nervous_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'awful_ranger'),
      2,
      1,
      'completed'::phase_status,
      88,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scary_trainer_677'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'those_trainer_198'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scary_trainer_677'),
      2,
      0,
      'completed'::phase_status,
      89,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'crooked_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'salty_trainer_403'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'crooked_gym'),
      2,
      0,
      'completed'::phase_status,
      90,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ornery_trainer_904'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'big_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ornery_trainer_904'),
      2,
      1,
      'completed'::phase_status,
      91,
      (seed_now - interval '1 hours 19 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nolanlangosh54'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'werner_auer80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nolanlangosh54'),
      2,
      0,
      'completed'::phase_status,
      92,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'short_term_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'short_term_elite'),
      2,
      1,
      'completed'::phase_status,
      93,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'qualified_trainer_61'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cyrilfriesen33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'qualified_trainer_61'),
      2,
      0,
      'completed'::phase_status,
      94,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'demetrius_gutkowski'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'beloved_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'demetrius_gutkowski'),
      2,
      1,
      'completed'::phase_status,
      95,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brannonlarkin62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thorny_trainer_213'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thorny_trainer_213'),
      1,
      2,
      'completed'::phase_status,
      96,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gloomy_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shy_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gloomy_champion'),
      2,
      0,
      'completed'::phase_status,
      97,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'casimer_baumbach'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'noted_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'noted_gym'),
      0,
      2,
      'completed'::phase_status,
      98,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ashtyn_vonrueden'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scottie17'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ashtyn_vonrueden'),
      2,
      1,
      'completed'::phase_status,
      99,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sneaky_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'insistent_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'insistent_ranger'),
      0,
      2,
      'completed'::phase_status,
      100,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rare_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rare_master'),
      2,
      0,
      'completed'::phase_status,
      101,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hildegard_predovic'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'flaviedare76'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hildegard_predovic'),
      2,
      0,
      'completed'::phase_status,
      102,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eminent_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'enlightened_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eminent_ranger'),
      2,
      0,
      'completed'::phase_status,
      103,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fausto_mraz11'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wilsontrantow30'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'wilsontrantow30'),
      0,
      2,
      'completed'::phase_status,
      104,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'neat_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stunning_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stunning_gym'),
      1,
      2,
      'completed'::phase_status,
      105,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'vernie34'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'itzel12'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'itzel12'),
      0,
      2,
      'completed'::phase_status,
      106,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jazmyne80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hilbert38'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilbert38'),
      0,
      2,
      'completed'::phase_status,
      107,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colby_roberts52'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marguerite_hintz'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marguerite_hintz'),
      0,
      2,
      'completed'::phase_status,
      108,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frivolous_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delectable_trainer_3'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frivolous_master'),
      2,
      1,
      'completed'::phase_status,
      109,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'overcooked_trainer_5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lera_reilly90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'lera_reilly90'),
      1,
      2,
      'completed'::phase_status,
      110,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'halliefay16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'broderick40'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'halliefay16'),
      2,
      0,
      'completed'::phase_status,
      111,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'flo_friesen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'flo_friesen'),
      2,
      1,
      'completed'::phase_status,
      112,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'janellebradtke25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vidaboyle57'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'janellebradtke25'),
      2,
      0,
      'completed'::phase_status,
      113,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'malvinamitchell24'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ash_ketchum'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ash_ketchum'),
      0,
      2,
      'completed'::phase_status,
      114,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rey_bode55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lance'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rey_bode55'),
      2,
      0,
      'completed'::phase_status,
      115,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jacynthe_klein'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'squeaky_trainer_454'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jacynthe_klein'),
      2,
      0,
      'completed'::phase_status,
      116,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'adolfomoen96'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'distinct_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'adolfomoen96'),
      2,
      0,
      'completed'::phase_status,
      117,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'michale_orn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'drab_trainer_487'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'drab_trainer_487'),
      0,
      2,
      'completed'::phase_status,
      118,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'substantial_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'monica_crist_fahey79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'substantial_trainer_'),
      2,
      1,
      'completed'::phase_status,
      119,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'izabellabeahan79'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'joshweimann33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'izabellabeahan79'),
      2,
      0,
      'completed'::phase_status,
      120,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilie_medhurst82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'emmittdubuque80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marilie_medhurst82'),
      2,
      0,
      'completed'::phase_status,
      121,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanie_maggio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sally_block33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sally_block33'),
      0,
      2,
      'completed'::phase_status,
      122,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'incomplete_trainer_6'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_trainer_532'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_trainer_532'),
      1,
      2,
      'completed'::phase_status,
      123,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'liquid_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eugene_huel73'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eugene_huel73'),
      0,
      2,
      'completed'::phase_status,
      124,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sigmund_senger46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jessicaleannon22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jessicaleannon22'),
      0,
      2,
      'completed'::phase_status,
      125,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dominic_zulauf'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sincere98'),
      0,
      2,
      'completed'::phase_status,
      126,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'faint_trainer_713'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'domenic_jast43'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'domenic_jast43'),
      1,
      2,
      'completed'::phase_status,
      127,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'karen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'candid_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'karen'),
      2,
      1,
      'completed'::phase_status,
      128,
      (seed_now - interval '1 hours 18 minutes'),
      (seed_now - interval '32 minutes')
    );
    -- Round 4
    INSERT INTO public.tournament_rounds (
      phase_id, round_number, name, status, start_time, end_time
    ) VALUES (
      phase_id, 4, 'Round 4', 'active'::phase_status,
      (seed_now - interval '30 minutes'), (seed_now + interval '18 minutes')
    ) RETURNING id INTO round_id;
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bad_trainer_106'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'long_trainer_533'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'long_trainer_533'),
      1,
      2,
      'completed'::phase_status,
      1,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'heavy_trainer_256'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'well_lit_trainer_814'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'well_lit_trainer_814'),
      0,
      2,
      'completed'::phase_status,
      2,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ophelia96'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rosy_trainer_409'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'rosy_trainer_409'),
      1,
      2,
      'completed'::phase_status,
      3,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'annette_harber2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'thoramarvin72'),
      NULL,
      0,
      0,
      'active'::phase_status,
      4,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ronny_koss27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'well_to_do_trainer_5'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ronny_koss27'),
      2,
      1,
      'completed'::phase_status,
      5,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'krystina_beatty85'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jabari_pagac18'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'krystina_beatty85'),
      2,
      0,
      'completed'::phase_status,
      6,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'orland_kihn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cathrinemosciski_wun'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'orland_kihn'),
      2,
      1,
      'completed'::phase_status,
      7,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fredrick_hagenes66'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cooperative_trainer_'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fredrick_hagenes66'),
      2,
      0,
      'completed'::phase_status,
      8,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'mariannamacejkovic76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'scornful_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'scornful_elite'),
      0,
      2,
      'completed'::phase_status,
      9,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alda_rau2'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'bustling_elite'),
      NULL,
      0,
      0,
      'active'::phase_status,
      10,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oleflatley25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'caleighparker77'),
      NULL,
      0,
      0,
      'active'::phase_status,
      11,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colorless_trainer_93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'annette20'),
      NULL,
      0,
      0,
      'active'::phase_status,
      12,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'felicia62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'huge_trainer_672'),
      NULL,
      0,
      0,
      'active'::phase_status,
      13,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sigrid67'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'viviane_rempel'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigrid67'),
      2,
      0,
      'completed'::phase_status,
      14,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'bowed_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lonny_bechtelar49'),
      NULL,
      0,
      0,
      'active'::phase_status,
      15,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jailyn75'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'katheryn_braun'),
      NULL,
      0,
      0,
      'active'::phase_status,
      16,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianna_stokes'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'red'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianna_stokes'),
      2,
      1,
      'completed'::phase_status,
      17,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'smooth_trainer_36'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'maiyaabshire82'),
      NULL,
      0,
      0,
      'pending'::phase_status,
      18,
      NULL,
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressa72'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayla75'),
      NULL,
      0,
      0,
      'pending'::phase_status,
      19,
      NULL,
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'total_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'westonwilderman14'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'total_champion'),
      2,
      0,
      'completed'::phase_status,
      20,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'qualified_trainer_61'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'savanah33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'savanah33'),
      1,
      2,
      'completed'::phase_status,
      21,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_161'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'uncomfortable_traine'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'uncomfortable_traine'),
      0,
      2,
      'completed'::phase_status,
      22,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'coralie_bernhard'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'millie_zieme65'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'millie_zieme65'),
      1,
      2,
      'completed'::phase_status,
      23,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brilliant_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'practical_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'practical_leader'),
      1,
      2,
      'completed'::phase_status,
      24,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '16 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'entire_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'carleykerluke47'),
      NULL,
      0,
      0,
      'active'::phase_status,
      25,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delta_olson'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'blanca13'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'blanca13'),
      0,
      2,
      'completed'::phase_status,
      26,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'odd_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'angelic_trainer_423'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'angelic_trainer_423'),
      1,
      2,
      'completed'::phase_status,
      27,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'elsie_stroman'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'eryn_stracke_hand41'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'eryn_stracke_hand41'),
      1,
      2,
      'completed'::phase_status,
      28,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tressie65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vincent_hickle19'),
      NULL,
      0,
      0,
      'active'::phase_status,
      29,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'valentinaklocko65'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'robust_elite'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'valentinaklocko65'),
      2,
      0,
      'completed'::phase_status,
      30,
      (seed_now - interval '30 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'short_term_elite'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'enriquebalistreri40'),
      NULL,
      0,
      0,
      'active'::phase_status,
      31,
      (seed_now - interval '30 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'myrtice66'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'opheliadicki91'),
      NULL,
      0,
      0,
      'active'::phase_status,
      32,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thorny_trainer_213'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trusting_trainer_973'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'thorny_trainer_213'),
      2,
      0,
      'completed'::phase_status,
      33,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'arnoldo81'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'winifred46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'arnoldo81'),
      2,
      0,
      'completed'::phase_status,
      34,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sick_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garett_bergnaum'),
      NULL,
      0,
      0,
      'active'::phase_status,
      35,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scary_trainer_677'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'godfreyjenkins91'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'godfreyjenkins91'),
      1,
      2,
      'completed'::phase_status,
      36,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sniveling_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'woeful_trainer_243'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'woeful_trainer_243'),
      0,
      2,
      'completed'::phase_status,
      37,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'norene68'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dim_trainer_491'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'norene68'),
      2,
      0,
      'completed'::phase_status,
      38,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'trusty_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'abelardo_konopelski'),
      NULL,
      0,
      0,
      'active'::phase_status,
      39,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'robin_schultz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'nolanlangosh54'),
      NULL,
      0,
      0,
      'active'::phase_status,
      40,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'pertinent_trainer_27'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'aged_trainer_120'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'pertinent_trainer_27'),
      2,
      0,
      'completed'::phase_status,
      41,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'demetrius_gutkowski'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'laurettayundt22'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'demetrius_gutkowski'),
      2,
      0,
      'completed'::phase_status,
      42,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'front_trainer_895'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kasandracronin25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasandracronin25'),
      0,
      2,
      'completed'::phase_status,
      43,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fortunate_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adela1'),
      NULL,
      0,
      0,
      'active'::phase_status,
      44,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'late_trainer_395'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'elaina_nitzsche'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'late_trainer_395'),
      2,
      0,
      'completed'::phase_status,
      45,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alvertalemke46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'emiliebednar53'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'emiliebednar53'),
      0,
      2,
      'completed'::phase_status,
      46,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'hope_cummerata20'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brody25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hope_cummerata20'),
      2,
      0,
      'completed'::phase_status,
      47,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'assuntaschoen_koelpi'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'oswaldo_kling'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'oswaldo_kling'),
      0,
      2,
      'completed'::phase_status,
      48,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dariusschneider93'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'clint_denesik'),
      NULL,
      0,
      0,
      'active'::phase_status,
      49,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wilhelmmccullough77'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'powerless_trainer_33'),
      NULL,
      0,
      0,
      'active'::phase_status,
      50,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nigeljerde94'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delores_orn44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'nigeljerde94'),
      2,
      0,
      'completed'::phase_status,
      51,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'frozen_trainer_653'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'johnnievandervort55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frozen_trainer_653'),
      2,
      0,
      'completed'::phase_status,
      52,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cristobalupton55'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'garricklindgren16'),
      NULL,
      0,
      0,
      'active'::phase_status,
      53,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'crooked_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chaunceyjohnson55'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'crooked_gym'),
      2,
      1,
      'completed'::phase_status,
      54,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'blank_trainer_642'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'tatyanahintz44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'tatyanahintz44'),
      1,
      2,
      'completed'::phase_status,
      55,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'alyson_stiedemann'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'chad_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'chad_friesen'),
      0,
      2,
      'completed'::phase_status,
      56,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'waynegorczany73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'delilaho_hara84'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'waynegorczany73'),
      2,
      1,
      'completed'::phase_status,
      57,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'laurynbalistreri76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'mauricelittel79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'laurynbalistreri76'),
      2,
      0,
      'completed'::phase_status,
      58,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marianamitchell71'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'marquis78'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'marianamitchell71'),
      2,
      1,
      'completed'::phase_status,
      59,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ornery_trainer_904'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frequent_trainer_572'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ornery_trainer_904'),
      2,
      0,
      'completed'::phase_status,
      60,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'filthy_trainer_361'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'brown_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'filthy_trainer_361'),
      2,
      1,
      'completed'::phase_status,
      61,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'wicked_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'corrupt_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'corrupt_trainer'),
      1,
      2,
      'completed'::phase_status,
      62,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'defensive_champion'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jermaineharvey25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jermaineharvey25'),
      1,
      2,
      'completed'::phase_status,
      63,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'made_up_trainer_12'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'awful_ranger'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'awful_ranger'),
      1,
      2,
      'completed'::phase_status,
      64,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eminent_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'multicolored_champio'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'multicolored_champio'),
      1,
      2,
      'completed'::phase_status,
      65,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'weekly_trainer_641'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'izabellabeahan79'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'izabellabeahan79'),
      0,
      2,
      'completed'::phase_status,
      66,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'nervous_trainer'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'wilsontrantow30'),
      NULL,
      0,
      0,
      'active'::phase_status,
      67,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kasey_jacobi99'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'werner_auer80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kasey_jacobi99'),
      2,
      0,
      'completed'::phase_status,
      68,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jacynthe_klein'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'slushy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jacynthe_klein'),
      2,
      0,
      'completed'::phase_status,
      69,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'chaz13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'trentheaney20'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'trentheaney20'),
      0,
      2,
      'completed'::phase_status,
      70,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sally_block33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kayden33'),
      NULL,
      0,
      0,
      'active'::phase_status,
      71,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'gummy_pro'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'claudestreich31'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gummy_pro'),
      2,
      1,
      'completed'::phase_status,
      72,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'karen'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaeden50'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jaeden50'),
      0,
      2,
      'completed'::phase_status,
      73,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'kenna_beahan'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'adolfomoen96'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'kenna_beahan'),
      2,
      0,
      'completed'::phase_status,
      74,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'tianna46'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lenore_schulist95'),
      NULL,
      0,
      0,
      'active'::phase_status,
      75,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'sorrowful_trainer_13'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'frivolous_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'frivolous_master'),
      1,
      2,
      'completed'::phase_status,
      76,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'twin_trainer_704'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'noted_gym'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'twin_trainer_704'),
      2,
      1,
      'completed'::phase_status,
      77,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'janellebradtke25'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'clevekling88'),
      NULL,
      0,
      0,
      'active'::phase_status,
      78,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jessicaleannon22'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jazmin_lubowitz'),
      NULL,
      0,
      0,
      'active'::phase_status,
      79,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marguerite_hintz'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'itzel12'),
      NULL,
      0,
      0,
      'active'::phase_status,
      80,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'taut_trainer_671'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'khalillarson_schuppe'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'taut_trainer_671'),
      2,
      1,
      'completed'::phase_status,
      81,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'rare_master'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'price_fay82'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'price_fay82'),
      1,
      2,
      'completed'::phase_status,
      82,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanelfeeney90'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ciara_heidenreich33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanelfeeney90'),
      2,
      1,
      'completed'::phase_status,
      83,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ella_ratke'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'flo_friesen'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'ella_ratke'),
      2,
      1,
      'completed'::phase_status,
      84,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'salty_trainer_403'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jaydeemard34'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jaydeemard34'),
      0,
      2,
      'completed'::phase_status,
      85,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '17 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'domenic_jast43'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'impossible_trainer_9'),
      NULL,
      0,
      0,
      'active'::phase_status,
      86,
      (seed_now - interval '29 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'substantial_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faraway_master'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'substantial_trainer_'),
      2,
      0,
      'completed'::phase_status,
      87,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dixiesanford87'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'purple_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dixiesanford87'),
      2,
      1,
      'completed'::phase_status,
      88,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'ash_ketchum'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sophieorn25'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sophieorn25'),
      0,
      2,
      'completed'::phase_status,
      89,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'cynthia'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gloomy_champion'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'gloomy_champion'),
      1,
      2,
      'completed'::phase_status,
      90,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'leta_kunde1'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dario_west44'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'leta_kunde1'),
      2,
      0,
      'completed'::phase_status,
      91,
      (seed_now - interval '29 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scornful_trainer_666'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sammy_pouros'),
      NULL,
      0,
      0,
      'active'::phase_status,
      92,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'halliefay16'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'lera_reilly90'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'halliefay16'),
      2,
      0,
      'completed'::phase_status,
      93,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'oval_trainer_521'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'soupy_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'soupy_breeder'),
      0,
      2,
      'completed'::phase_status,
      94,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'weldon_bergnaum_schu'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'aliviashields97'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'aliviashields97'),
      0,
      2,
      'completed'::phase_status,
      95,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'jeffryyost15'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hildegard_predovic'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jeffryyost15'),
      2,
      0,
      'completed'::phase_status,
      96,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'marilie_medhurst82'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'fred_pacocha47'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'fred_pacocha47'),
      1,
      2,
      'completed'::phase_status,
      97,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'those_trainer_198'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'hilbert38'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'hilbert38'),
      1,
      2,
      'completed'::phase_status,
      98,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lucius41'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_trainer_532'),
      NULL,
      0,
      0,
      'active'::phase_status,
      99,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'stunning_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'beloved_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'beloved_leader'),
      0,
      2,
      'completed'::phase_status,
      100,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'dirty_trainer_951'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'rey_bode55'),
      NULL,
      0,
      0,
      'active'::phase_status,
      101,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'insistent_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'kelli_buckridge72'),
      NULL,
      0,
      0,
      'active'::phase_status,
      102,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'violent_trainer_345'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sincere98'),
      NULL,
      0,
      0,
      'active'::phase_status,
      103,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'price45'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'ashtyn_vonrueden'),
      NULL,
      0,
      0,
      'active'::phase_status,
      104,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'thrifty_trainer_14'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'quick_witted_leader'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'quick_witted_leader'),
      1,
      2,
      'completed'::phase_status,
      105,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'overcooked_ranger'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'admin_trainer'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'admin_trainer'),
      0,
      2,
      'completed'::phase_status,
      106,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'drab_trainer_487'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'stanley_schneider'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'stanley_schneider'),
      0,
      2,
      'completed'::phase_status,
      107,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'big_gym'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'valentinemiller24'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'big_gym'),
      2,
      1,
      'completed'::phase_status,
      108,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'treviono_kon17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'gregorio_schuster_ke'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'treviono_kon17'),
      2,
      0,
      'completed'::phase_status,
      109,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lee51'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vain_trainer_113'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vain_trainer_113'),
      0,
      2,
      'completed'::phase_status,
      110,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'brannonlarkin62'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'cyrilfriesen33'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'brannonlarkin62'),
      2,
      1,
      'completed'::phase_status,
      111,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'eugene_huel73'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'houston_walter'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'houston_walter'),
      0,
      2,
      'completed'::phase_status,
      112,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shy_ace'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'casimer_baumbach'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'casimer_baumbach'),
      1,
      2,
      'completed'::phase_status,
      113,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'broderick40'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'vernie34'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vernie34'),
      0,
      2,
      'completed'::phase_status,
      114,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'shanie_maggio'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'squeaky_trainer_454'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'shanie_maggio'),
      2,
      1,
      'completed'::phase_status,
      115,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'lance'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'faint_trainer_713'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'faint_trainer_713'),
      0,
      2,
      'completed'::phase_status,
      116,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'michale_orn'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'candid_breeder'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'michale_orn'),
      2,
      1,
      'completed'::phase_status,
      117,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'scottie17'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'neat_ace'),
      NULL,
      0,
      0,
      'active'::phase_status,
      118,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'distinct_breeder'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sneaky_master'),
      NULL,
      0,
      0,
      'active'::phase_status,
      119,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'vidaboyle57'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'liquid_ace'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'vidaboyle57'),
      2,
      0,
      'completed'::phase_status,
      120,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'fausto_mraz11'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'sigmund_senger46'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'sigmund_senger46'),
      0,
      2,
      'completed'::phase_status,
      121,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'joshweimann33'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'malvinamitchell24'),
      NULL,
      0,
      0,
      'pending'::phase_status,
      122,
      NULL,
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'flaviedare76'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'jazmyne80'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'jazmyne80'),
      0,
      2,
      'completed'::phase_status,
      123,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'delectable_trainer_3'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'dominic_zulauf'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'dominic_zulauf'),
      1,
      2,
      'completed'::phase_status,
      124,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'enlightened_trainer_'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'incomplete_trainer_6'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = 'enlightened_trainer_'),
      2,
      1,
      'completed'::phase_status,
      125,
      (seed_now - interval '28 minutes'),
      (seed_now + interval '18 minutes')
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'emmittdubuque80'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'monica_crist_fahey79'),
      NULL,
      0,
      0,
      'active'::phase_status,
      126,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'colby_roberts52'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shaylee16'),
      NULL,
      0,
      0,
      'active'::phase_status,
      127,
      (seed_now - interval '28 minutes'),
      NULL
    );
    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = 'overcooked_trainer_5'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = 'shad_williamson9'),
      NULL,
      0,
      0,
      'active'::phase_status,
      128,
      (seed_now - interval '28 minutes'),
      NULL
    );
  END IF;

  RAISE NOTICE 'Created 28 rounds and 1246 matches';
END $$;
