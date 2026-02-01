-- =============================================================================
-- 12_standings.sql - Create Tournament Standings
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-02-01T23:33:10.287Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 11_matches.sql
-- Generated: 637 standings entries
-- =============================================================================

DO $$
DECLARE
  standings_exist boolean;
  t_id bigint;
BEGIN
  -- Check if standings already exist
  SELECT EXISTS(SELECT 1 FROM public.tournament_standings LIMIT 1) INTO standings_exist;
  IF standings_exist THEN
    RAISE NOTICE 'Standings already exist, skipping';
    RETURN;
  END IF;

  -- Tournament: VGC League Week 1 Championship
  SELECT t.id INTO t_id FROM public.tournaments t
    WHERE t.slug = 'vgc-league-week-01';
  IF t_id IS NOT NULL THEN
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'oswaldo_kling'),
      5,
      21,
      15,
      7,
      0.7,
      0.6818,
      0.4943,
      0.468,
      1
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'richardswaniawski20'),
      5,
      24,
      18,
      9,
      0.8,
      0.6667,
      0.47,
      0.4869,
      2
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'marianamitchell71'),
      5,
      18,
      14,
      8,
      0.6667,
      0.6364,
      0.5526,
      0.5325,
      3
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'diamond_kunze75'),
      5,
      18,
      14,
      9,
      0.6667,
      0.6087,
      0.4798,
      0.4767,
      4
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'kasey_jacobi99'),
      5,
      18,
      13,
      7,
      0.75,
      0.65,
      0.4189,
      0.4667,
      5
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'kamron_kemmer91'),
      5,
      12,
      11,
      9,
      0.5,
      0.55,
      0.5077,
      0.5036,
      6
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'ash_ketchum'),
      5,
      12,
      8,
      9,
      0.5,
      0.4706,
      0.4756,
      0.4857,
      7
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'trusty_gym'),
      5,
      9,
      8,
      12,
      0.375,
      0.4,
      0.4807,
      0.4758,
      8
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'cristobalupton55'),
      5,
      18,
      12,
      4,
      0.8571,
      0.75,
      0.517,
      0.5097,
      9
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'alvertalemke46'),
      5,
      15,
      11,
      6,
      0.7143,
      0.6471,
      0.551,
      0.5355,
      10
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'valentinaklocko65'),
      5,
      12,
      8,
      9,
      0.5714,
      0.4706,
      0.5291,
      0.5219,
      11
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'enlightened_trainer_'),
      5,
      12,
      8,
      7,
      0.5714,
      0.5333,
      0.4884,
      0.4641,
      12
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'marquis78'),
      5,
      12,
      9,
      7,
      0.5714,
      0.5625,
      0.4864,
      0.4895,
      13
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'joshweimann33'),
      5,
      9,
      8,
      8,
      0.4286,
      0.5,
      0.5743,
      0.5338,
      14
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'made_up_trainer_161'),
      5,
      9,
      6,
      8,
      0.4286,
      0.4286,
      0.494,
      0.4722,
      15
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'multicolored_champio'),
      5,
      6,
      8,
      10,
      0.2857,
      0.4444,
      0.5119,
      0.4781,
      16
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'dominic_kuphal'),
      5,
      12,
      9,
      5,
      0.6667,
      0.6429,
      0.5079,
      0.4793,
      17
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'alyson_stiedemann'),
      5,
      12,
      9,
      5,
      0.6667,
      0.6429,
      0.4921,
      0.5178,
      18
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'bowed_ace'),
      5,
      9,
      7,
      7,
      0.5,
      0.5,
      0.7004,
      0.6265,
      19
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'pertinent_trainer_27'),
      5,
      9,
      8,
      7,
      0.5,
      0.5333,
      0.5903,
      0.5637,
      20
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'khalillarson_schuppe'),
      5,
      9,
      7,
      7,
      0.5,
      0.5,
      0.5897,
      0.5724,
      21
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'marilie_medhurst82'),
      5,
      9,
      6,
      7,
      0.5,
      0.4615,
      0.4921,
      0.5159,
      22
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'rey_bode55'),
      5,
      9,
      6,
      9,
      0.5,
      0.4,
      0.4643,
      0.5027,
      23
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'jailyn75'),
      5,
      9,
      7,
      6,
      0.5,
      0.5385,
      0.4583,
      0.4456,
      24
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'annette20'),
      5,
      6,
      6,
      8,
      0.3333,
      0.4286,
      0.4722,
      0.4845,
      25
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'bart74'),
      5,
      6,
      4,
      9,
      0.3333,
      0.3077,
      0.4722,
      0.4902,
      26
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'clint_denesik'),
      5,
      6,
      5,
      8,
      0.3333,
      0.3846,
      0.4181,
      0.4222,
      27
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'shaylee16'),
      5,
      3,
      3,
      10,
      0.1667,
      0.2308,
      0.5333,
      0.5274,
      28
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'cooperative_trainer_'),
      5,
      3,
      4,
      10,
      0.1667,
      0.2857,
      0.494,
      0.5075,
      29
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'firsthand_gym'),
      5,
      3,
      3,
      10,
      0.1667,
      0.2308,
      0.4817,
      0.4996,
      30
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'houston_walter'),
      5,
      3,
      3,
      10,
      0.1667,
      0.2308,
      0.3562,
      0.3795,
      31
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'woeful_trainer_243'),
      5,
      0,
      1,
      12,
      0,
      0.0769,
      0.4667,
      0.442,
      32
    );
  END IF;

  -- Tournament: Pallet Town Trainers Week 1 Championship
  SELECT t.id INTO t_id FROM public.tournaments t
    WHERE t.slug = 'pallet-town-week-01';
  IF t_id IS NOT NULL THEN
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'alyson_stiedemann'),
      5,
      24,
      17,
      8,
      0.8,
      0.68,
      0.5699,
      0.5463,
      1
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'dim_trainer_491'),
      5,
      24,
      17,
      7,
      0.8,
      0.7083,
      0.4768,
      0.4849,
      2
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'charlotteschoen99'),
      5,
      21,
      15,
      6,
      0.7778,
      0.7143,
      0.568,
      0.5353,
      3
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'savanah33'),
      5,
      15,
      13,
      10,
      0.5556,
      0.5652,
      0.3958,
      0.4155,
      4
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'artfritsch16'),
      5,
      15,
      11,
      7,
      0.625,
      0.6111,
      0.4712,
      0.4918,
      5
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'sincere98'),
      5,
      12,
      11,
      10,
      0.5,
      0.5238,
      0.6345,
      0.6115,
      6
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'quick_witted_leader'),
      5,
      12,
      9,
      10,
      0.5,
      0.4737,
      0.5038,
      0.4992,
      7
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'monica_crist_fahey79'),
      5,
      9,
      7,
      11,
      0.375,
      0.3889,
      0.5405,
      0.5214,
      8
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'irma58'),
      5,
      15,
      11,
      5,
      0.7143,
      0.6875,
      0.5905,
      0.5765,
      9
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'impossible_trainer_9'),
      5,
      15,
      10,
      6,
      0.7143,
      0.625,
      0.5077,
      0.5169,
      10
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'nolanlangosh54'),
      5,
      15,
      10,
      5,
      0.7143,
      0.6667,
      0.491,
      0.4829,
      11
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'faraway_master'),
      5,
      12,
      8,
      8,
      0.5714,
      0.5,
      0.491,
      0.4869,
      12
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'maiyaabshire82'),
      5,
      12,
      9,
      7,
      0.5714,
      0.5625,
      0.3991,
      0.4082,
      13
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'trentheaney20'),
      5,
      9,
      7,
      9,
      0.4286,
      0.4375,
      0.5601,
      0.5463,
      14
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'diamond_kunze75'),
      5,
      6,
      4,
      11,
      0.2857,
      0.2667,
      0.3719,
      0.4156,
      15
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'frozen_trainer_101'),
      5,
      3,
      4,
      12,
      0.1429,
      0.25,
      0.4385,
      0.4403,
      16
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'eryn_stracke_hand41'),
      5,
      15,
      10,
      3,
      0.8333,
      0.7692,
      0.5794,
      0.5531,
      17
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'woeful_trainer_243'),
      5,
      9,
      7,
      7,
      0.5,
      0.5,
      0.6796,
      0.6251,
      18
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'lonny_bechtelar49'),
      5,
      9,
      7,
      6,
      0.5,
      0.5385,
      0.5159,
      0.4811,
      19
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'shad_williamson9'),
      5,
      9,
      6,
      7,
      0.5,
      0.4615,
      0.4987,
      0.5032,
      20
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'gummy_pro'),
      5,
      9,
      9,
      8,
      0.5,
      0.5294,
      0.4825,
      0.4878,
      21
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'purple_champion'),
      5,
      9,
      7,
      7,
      0.5,
      0.5,
      0.4769,
      0.4694,
      22
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'outstanding_elite'),
      5,
      9,
      7,
      6,
      0.5,
      0.5385,
      0.4111,
      0.4117,
      23
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'thrifty_trainer_14'),
      5,
      6,
      4,
      8,
      0.3333,
      0.3333,
      0.5659,
      0.5516,
      24
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'westonwilderman14'),
      5,
      6,
      4,
      8,
      0.3333,
      0.3333,
      0.5212,
      0.512,
      25
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'dominic_zulauf'),
      5,
      6,
      6,
      8,
      0.3333,
      0.4286,
      0.4864,
      0.4849,
      26
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'tressa72'),
      5,
      6,
      4,
      9,
      0.3333,
      0.3077,
      0.4749,
      0.5022,
      27
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'filthy_trainer_361'),
      5,
      6,
      5,
      9,
      0.3333,
      0.3571,
      0.465,
      0.4825,
      28
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'oleflatley25'),
      5,
      6,
      6,
      8,
      0.3333,
      0.4286,
      0.38,
      0.392,
      29
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'annette_harber2'),
      5,
      3,
      4,
      10,
      0.1667,
      0.2857,
      0.5044,
      0.5118,
      30
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'dirty_trainer_951'),
      5,
      3,
      4,
      10,
      0.1667,
      0.2857,
      0.4656,
      0.4836,
      31
    );
    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage,
      opponent_game_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = 'titus_kohler60'),
      5,
      3,
      3,
      10,
      0.1667,
      0.2308,
      0.4444,
      0.4385,
      32
    );
  END IF;

  RAISE NOTICE 'Created 64 standings entries for 2 tournaments';
END $$;
