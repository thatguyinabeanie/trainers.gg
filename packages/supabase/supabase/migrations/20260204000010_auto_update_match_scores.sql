-- =============================================================================
-- Auto-update match scores from game results
-- =============================================================================
-- When a match_game status changes to 'agreed' or 'resolved', recount all
-- resolved game wins for that match and update tournament_matches.game_wins1
-- and game_wins2. When a player reaches the best-of threshold, auto-complete
-- the match and set winner_alt_id.
--
-- This is an AFTER trigger — it reads the final row state produced by the
-- BEFORE trigger (compare_game_selections). No conflict.

CREATE OR REPLACE FUNCTION public.update_match_scores_from_games()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_match record;
  v_wins1 integer;
  v_wins2 integer;
  v_best_of integer;
  v_wins_needed integer;
  v_winner bigint;
BEGIN
  -- Only act when status changes to agreed or resolved
  IF NEW.status NOT IN ('agreed', 'resolved') THEN
    RETURN NULL;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NULL;
  END IF;

  -- Get match info (alt1_id, alt2_id, round_id)
  SELECT m.id, m.alt1_id, m.alt2_id, m.round_id, m.status AS match_status
  INTO v_match
  FROM public.tournament_matches m
  WHERE m.id = NEW.match_id;

  IF v_match IS NULL THEN
    RETURN NULL;
  END IF;

  -- Don't update if match is already completed
  IF v_match.match_status = 'completed' THEN
    RETURN NULL;
  END IF;

  -- Count wins for each player across all agreed/resolved games
  SELECT
    COALESCE(SUM(CASE WHEN g.winner_alt_id = v_match.alt1_id THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN g.winner_alt_id = v_match.alt2_id THEN 1 ELSE 0 END), 0)
  INTO v_wins1, v_wins2
  FROM public.match_games g
  WHERE g.match_id = NEW.match_id
    AND g.status IN ('agreed', 'resolved');

  -- Get best_of from the phase config
  SELECT COALESCE(tp.best_of, 3)
  INTO v_best_of
  FROM public.tournament_rounds r
  JOIN public.tournament_phases tp ON tp.id = r.phase_id
  WHERE r.id = v_match.round_id;

  -- Default to 3 if we couldn't find it
  IF v_best_of IS NULL THEN
    v_best_of := 3;
  END IF;

  v_wins_needed := (v_best_of / 2) + 1;

  -- Check if someone has won the series
  v_winner := NULL;
  IF v_wins1 >= v_wins_needed THEN
    v_winner := v_match.alt1_id;
  ELSIF v_wins2 >= v_wins_needed THEN
    v_winner := v_match.alt2_id;
  END IF;

  -- Update match scores (and complete if threshold reached)
  IF v_winner IS NOT NULL THEN
    UPDATE public.tournament_matches
    SET game_wins1 = v_wins1,
        game_wins2 = v_wins2,
        winner_alt_id = v_winner,
        status = 'completed',
        end_time = now()
    WHERE id = NEW.match_id;
  ELSE
    UPDATE public.tournament_matches
    SET game_wins1 = v_wins1,
        game_wins2 = v_wins2
    WHERE id = NEW.match_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Fire AFTER UPDATE so we read the final row state (after compare_game_selections)
CREATE TRIGGER update_match_scores_trigger
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_scores_from_games();
