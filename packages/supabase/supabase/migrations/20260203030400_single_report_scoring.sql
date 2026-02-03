-- =============================================================================
-- Single Report Scoring
-- =============================================================================
-- Changes game scoring from blind dual-report to single-report.
-- When one player reports a result, the game resolves immediately. No
-- confirmation from the opponent is needed. If there's a dispute, a judge
-- must be requested to reset/override.
--
-- Also adds match_games to Realtime publication so game updates push to all
-- viewers in real time.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Replace compare_game_selections trigger function
-- ---------------------------------------------------------------------------
-- Old behavior: required both players to submit, then compared.
-- New behavior: first submission resolves the game immediately.

CREATE OR REPLACE FUNCTION public.compare_game_selections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- First submission resolves the game
  IF NEW.alt1_selection IS NOT NULL AND NEW.alt2_selection IS NULL THEN
    NEW.winner_alt_id := NEW.alt1_selection;
    NEW.status := 'agreed';
  ELSIF NEW.alt1_selection IS NULL AND NEW.alt2_selection IS NOT NULL THEN
    NEW.winner_alt_id := NEW.alt2_selection;
    NEW.status := 'agreed';
  -- Both present (e.g. judge reset then re-submit edge case)
  ELSIF NEW.alt1_selection IS NOT NULL AND NEW.alt2_selection IS NOT NULL THEN
    IF NEW.alt1_selection = NEW.alt2_selection THEN
      NEW.winner_alt_id := NEW.alt1_selection;
      NEW.status := 'agreed';
    ELSE
      NEW.winner_alt_id := NULL;
      NEW.status := 'disputed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Replace submit_game_selection RPC
-- ---------------------------------------------------------------------------
-- Allows submission on pending games (first report) and agreed games
-- (self-correction by the same player who reported). Once a game is
-- resolved by a judge, only a judge can change it.

CREATE OR REPLACE FUNCTION public.submit_game_selection(
  p_game_id bigint,
  p_selected_winner_alt_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_match_id bigint;
  v_game_status public.match_game_status;
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_caller_alt_id bigint;
  v_is_alt1 boolean;
  v_already_submitted boolean;
BEGIN
  -- Get the game and match info
  SELECT g.match_id, g.status, m.alt1_id, m.alt2_id
  INTO v_match_id, v_game_status, v_alt1_id, v_alt2_id
  FROM public.match_games g
  JOIN public.tournament_matches m ON g.match_id = m.id
  WHERE g.id = p_game_id;

  IF v_match_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;

  -- Accept submissions on pending games + agreed games (self-correction window)
  IF v_game_status NOT IN ('pending', 'awaiting_both', 'awaiting_one', 'agreed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not accepting submissions');
  END IF;

  -- Verify selected winner is one of the match participants
  IF p_selected_winner_alt_id != v_alt1_id AND p_selected_winner_alt_id != v_alt2_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selected winner must be a match participant');
  END IF;

  -- Find caller's alt that matches a match participant
  SELECT a.id, (a.id = v_alt1_id)
  INTO v_caller_alt_id, v_is_alt1
  FROM public.alts a
  WHERE a.user_id = (SELECT auth.uid())
    AND (a.id = v_alt1_id OR a.id = v_alt2_id)
  LIMIT 1;

  IF v_caller_alt_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a participant in this match');
  END IF;

  -- For agreed games: only the player who already submitted can re-submit
  -- (self-correction). The other player cannot submit on agreed games.
  IF v_game_status = 'agreed' THEN
    IF v_is_alt1 THEN
      SELECT alt1_selection IS NOT NULL INTO v_already_submitted
      FROM public.match_games WHERE id = p_game_id;
    ELSE
      SELECT alt2_selection IS NOT NULL INTO v_already_submitted
      FROM public.match_games WHERE id = p_game_id;
    END IF;

    IF NOT v_already_submitted THEN
      RETURN jsonb_build_object('success', false, 'error', 'Game has already been reported');
    END IF;
  END IF;

  -- Update only the caller's selection column
  IF v_is_alt1 THEN
    UPDATE public.match_games
    SET alt1_selection = p_selected_winner_alt_id,
        alt1_submitted_at = now()
    WHERE id = p_game_id
      AND status IN ('pending', 'awaiting_both', 'awaiting_one', 'agreed');
  ELSE
    UPDATE public.match_games
    SET alt2_selection = p_selected_winner_alt_id,
        alt2_submitted_at = now()
    WHERE id = p_game_id
      AND status IN ('pending', 'awaiting_both', 'awaiting_one', 'agreed');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Add match_games to Realtime publication
-- ---------------------------------------------------------------------------
-- Previously excluded to prevent leaking blind selections. Now that games
-- resolve on first report, there are no blind selections to protect.

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_games;
