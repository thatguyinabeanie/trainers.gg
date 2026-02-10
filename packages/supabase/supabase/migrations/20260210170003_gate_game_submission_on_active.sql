-- =============================================================================
-- Gate submit_game_selection on match being active
-- =============================================================================
-- Prevents players from submitting game results before both players have
-- checked in. The match must be 'active' (both confirmed) before game
-- selections are accepted.

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
  v_match_status text;
  v_game_status public.match_game_status;
  v_game_number smallint;
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_caller_alt_id bigint;
  v_is_alt1 boolean;
  v_already_submitted boolean;
BEGIN
  -- Get the game and match info (now also fetching match status)
  SELECT g.match_id, g.status, g.game_number, m.alt1_id, m.alt2_id, m.status
  INTO v_match_id, v_game_status, v_game_number, v_alt1_id, v_alt2_id, v_match_status
  FROM public.match_games g
  JOIN public.tournament_matches m ON g.match_id = m.id
  WHERE g.id = p_game_id;

  IF v_match_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;

  -- Gate: match must be active (both players checked in)
  IF v_match_status != 'active' THEN
    IF v_match_status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Match is not active. Both players must check in first.');
    ELSE
      RETURN jsonb_build_object('success', false, 'error',
        format('Cannot submit for match with status "%s"', v_match_status));
    END IF;
  END IF;

  -- Accept submissions on pending games + agreed games (self-correction window)
  IF v_game_status NOT IN ('pending', 'awaiting_both', 'awaiting_one', 'agreed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not accepting submissions');
  END IF;

  -- Lock check: reject if any later game in this match has been reported.
  -- Once the next game has activity, this game's result is final.
  IF v_game_status = 'agreed' THEN
    IF EXISTS (
      SELECT 1
        FROM public.match_games
       WHERE match_id = v_match_id
         AND game_number > v_game_number
         AND status NOT IN ('pending', 'cancelled')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Game result is locked — a later game has already been reported');
    END IF;
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
