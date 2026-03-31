-- Seed tournament data for admin user's alts
-- This gives the admin user real tournament stats for dashboard testing

DO $$
DECLARE
  v_main_id bigint;
  v_vgc_id bigint;
  v_draft_id bigint;
  v_team1_id bigint;
  v_team2_id bigint;
  v_team3_id bigint;
  v_t1 CONSTANT int := 1; -- VGC League Week 1 (completed)
  v_t2 CONSTANT int := 2; -- Pallet Town Week 1 (completed)
  v_t3 CONSTANT int := 3; -- VGC League Week 2 (active)
  v_t5 CONSTANT int := 5; -- VGC League Week 3 (upcoming)
  v_round_id bigint;
  v_opp_id bigint;
  v_won boolean;
BEGIN
  -- Get alt IDs for admin user
  SELECT a.id INTO v_main_id FROM alts a JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = 'admin@trainers.local' AND a.username = 'admin_trainer';
  SELECT a.id INTO v_vgc_id FROM alts a JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = 'admin@trainers.local' AND a.username = 'admin_trainer_vgc';
  SELECT a.id INTO v_draft_id FROM alts a JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = 'admin@trainers.local' AND a.username = 'admin_trainer_draft';

  IF v_main_id IS NULL OR v_vgc_id IS NULL OR v_draft_id IS NULL THEN
    RAISE NOTICE 'Admin alts not found, skipping tournament seed data';
    RETURN;
  END IF;

  -- Create teams for each alt
  INSERT INTO teams (created_by, name) VALUES (v_vgc_id, 'Rain Balance') RETURNING id INTO v_team1_id;
  INSERT INTO teams (created_by, name) VALUES (v_vgc_id, 'Sun Room') RETURNING id INTO v_team2_id;
  INSERT INTO teams (created_by, name) VALUES (v_draft_id, 'Stall Core') RETURNING id INTO v_team3_id;

  -- Register admin_trainer_vgc in 4 tournaments
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id)
  VALUES (v_vgc_id, v_t1, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id)
  VALUES (v_vgc_id, v_t2, 'checked_in', v_team2_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id)
  VALUES (v_vgc_id, v_t3, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status)
  VALUES (v_vgc_id, v_t5, 'registered') ON CONFLICT DO NOTHING;

  -- Register admin_trainer (main) in tournament 2 + active
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id)
  VALUES (v_main_id, v_t2, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id)
  VALUES (v_main_id, v_t3, 'checked_in', v_team1_id) ON CONFLICT DO NOTHING;

  -- Register admin_trainer_draft in tournament 1 + upcoming
  INSERT INTO tournament_registrations (alt_id, tournament_id, status, team_id)
  VALUES (v_draft_id, v_t1, 'checked_in', v_team3_id) ON CONFLICT DO NOTHING;
  INSERT INTO tournament_registrations (alt_id, tournament_id, status)
  VALUES (v_draft_id, v_t5, 'registered') ON CONFLICT DO NOTHING;

  -- Create matches for admin_trainer_vgc in completed tournaments
  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = v_t1 ORDER BY tr.round_number LIMIT 5
  LOOP
    SELECT alt_id INTO v_opp_id FROM tournament_registrations
    WHERE tournament_id = v_t1 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;
    v_won := random() > 0.25;
    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, winner_alt_id, game_wins1, game_wins2, table_number, start_time, end_time)
      VALUES (v_round_id, v_vgc_id, v_opp_id, 'completed',
              CASE WHEN v_won THEN v_vgc_id ELSE v_opp_id END,
              CASE WHEN v_won THEN 2 ELSE floor(random()*2)::int END,
              CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
              floor(random()*10+1)::int, now() - interval '7 days', now() - interval '7 days' + interval '30 minutes');
    END IF;
  END LOOP;

  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = v_t2 ORDER BY tr.round_number LIMIT 5
  LOOP
    SELECT alt_id INTO v_opp_id FROM tournament_registrations
    WHERE tournament_id = v_t2 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;
    v_won := random() > 0.3;
    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, winner_alt_id, game_wins1, game_wins2, table_number, start_time, end_time)
      VALUES (v_round_id, v_vgc_id, v_opp_id, 'completed',
              CASE WHEN v_won THEN v_vgc_id ELSE v_opp_id END,
              CASE WHEN v_won THEN 2 ELSE floor(random()*2)::int END,
              CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
              floor(random()*10+1)::int, now() - interval '3 days', now() - interval '3 days' + interval '25 minutes');
    END IF;
  END LOOP;

  -- Matches for admin_trainer (main) in tournament 2
  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = v_t2 ORDER BY tr.round_number LIMIT 5
  LOOP
    SELECT alt_id INTO v_opp_id FROM tournament_registrations
    WHERE tournament_id = v_t2 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;
    v_won := random() > 0.4;
    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, winner_alt_id, game_wins1, game_wins2, table_number, start_time, end_time)
      VALUES (v_round_id, v_main_id, v_opp_id, 'completed',
              CASE WHEN v_won THEN v_main_id ELSE v_opp_id END,
              CASE WHEN v_won THEN 2 ELSE floor(random()*2)::int END,
              CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
              floor(random()*10+1)::int, now() - interval '5 days', now() - interval '5 days' + interval '20 minutes');
    END IF;
  END LOOP;

  -- Matches for admin_trainer_draft in tournament 1
  FOR v_round_id IN
    SELECT tr.id FROM tournament_rounds tr JOIN tournament_phases tp ON tr.phase_id = tp.id
    WHERE tp.tournament_id = v_t1 ORDER BY tr.round_number LIMIT 4
  LOOP
    SELECT alt_id INTO v_opp_id FROM tournament_registrations
    WHERE tournament_id = v_t1 AND alt_id NOT IN (v_main_id, v_vgc_id, v_draft_id)
    ORDER BY random() LIMIT 1;
    v_won := random() > 0.5;
    IF v_opp_id IS NOT NULL THEN
      INSERT INTO tournament_matches (round_id, alt1_id, alt2_id, status, winner_alt_id, game_wins1, game_wins2, table_number, start_time, end_time)
      VALUES (v_round_id, v_draft_id, v_opp_id, 'completed',
              CASE WHEN v_won THEN v_draft_id ELSE v_opp_id END,
              CASE WHEN v_won THEN 2 ELSE floor(random()*2)::int END,
              CASE WHEN v_won THEN floor(random()*2)::int ELSE 2 END,
              floor(random()*10+1)::int, now() - interval '8 days', now() - interval '8 days' + interval '25 minutes');
    END IF;
  END LOOP;

  -- Player stats
  INSERT INTO tournament_player_stats (tournament_id, alt_id, matches_played, match_wins, match_losses, game_wins, game_losses, final_ranking)
  VALUES
    (v_t1, v_vgc_id, 5, 4, 1, 9, 3, 2),
    (v_t2, v_vgc_id, 5, 3, 2, 7, 5, 5),
    (v_t2, v_main_id, 5, 3, 2, 7, 5, 6),
    (v_t1, v_draft_id, 4, 2, 2, 5, 5, 10)
  ON CONFLICT DO NOTHING;

  -- Standings
  INSERT INTO tournament_standings (tournament_id, alt_id, round_number, rank, game_wins, game_losses, match_points, match_win_percentage, game_win_percentage)
  VALUES
    (v_t1, v_vgc_id, 5, 2, 9, 3, 12, 0.8000, 0.7500),
    (v_t2, v_vgc_id, 5, 5, 7, 5, 9, 0.6000, 0.5833),
    (v_t1, v_draft_id, 4, 10, 5, 5, 6, 0.5000, 0.5000),
    (v_t2, v_main_id, 5, 6, 5, 7, 9, 0.6000, 0.4167)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Admin tournament seed data created: main=%, vgc=%, draft=%', v_main_id, v_vgc_id, v_draft_id;
END $$;
