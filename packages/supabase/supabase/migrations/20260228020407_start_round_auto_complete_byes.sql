-- =============================================================================
-- start_round: auto-complete bye matches
-- =============================================================================
-- Bye matches were left as 'pending' after start_round(), which breaks
-- elimination bracket progression. generateEliminationPairings queries for
-- completed matches to find winners — bye players weren't advancing.
--
-- This adds a step to mark bye matches as 'completed' with winner_alt_id
-- set to alt1_id (the only player in a bye match).

CREATE OR REPLACE FUNCTION public.start_round(
  p_round_id bigint,
  p_best_of_override integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_round record;
  v_phase record;
  v_org_id bigint;
  v_best_of integer;
  v_non_bye_ids bigint[];
  v_match_count integer;
  v_game_count integer;
  v_bye_count integer;
  v_now timestamptz := now();
BEGIN
  -- Authenticate
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get round with phase info
  SELECT r.id, r.status, r.round_number, r.phase_id
  INTO v_round
  FROM public.tournament_rounds r
  WHERE r.id = p_round_id;

  IF v_round IS NULL THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  -- Get phase with tournament/org info
  SELECT tp.id, tp.tournament_id, tp.best_of,
         t.organization_id, t.status AS tournament_status
  INTO v_phase
  FROM public.tournament_phases tp
  JOIN public.tournaments t ON t.id = tp.tournament_id
  WHERE tp.id = v_round.phase_id;

  IF v_phase IS NULL THEN
    RAISE EXCEPTION 'Phase not found';
  END IF;

  -- Permission check: org owner or staff with tournament.manage
  IF NOT public.has_org_permission(v_phase.organization_id, 'tournament.manage') THEN
    RAISE EXCEPTION 'You do not have permission to start this round';
  END IF;

  -- Validate round is pending
  IF v_round.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot start round with status "%"', v_round.status;
  END IF;

  -- If not round 1, ensure previous round is completed
  IF v_round.round_number > 1 THEN
    PERFORM 1
    FROM public.tournament_rounds pr
    WHERE pr.phase_id = v_round.phase_id
      AND pr.round_number = v_round.round_number - 1
      AND pr.status != 'completed';

    IF FOUND THEN
      RAISE EXCEPTION 'Previous round must be completed before starting round %', v_round.round_number;
    END IF;
  END IF;

  -- Verify matches exist
  SELECT COUNT(*) INTO v_match_count
  FROM public.tournament_matches m
  WHERE m.round_id = p_round_id;

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'Cannot start round without pairings. Generate pairings first.';
  END IF;

  -- 1. Update round status to active
  UPDATE public.tournament_rounds
  SET status = 'active',
      start_time = v_now
  WHERE id = p_round_id;

  -- 2. Auto-complete bye matches (player auto-advances)
  UPDATE public.tournament_matches
  SET status = 'completed',
      winner_alt_id = alt1_id,
      end_time = v_now
  WHERE round_id = p_round_id
    AND is_bye = true
    AND status = 'pending';

  GET DIAGNOSTICS v_bye_count = ROW_COUNT;

  -- 3. Set non-bye matches to pending with start_time (clock starts now)
  --    Reset confirmation flags so players must check in fresh
  SELECT ARRAY_AGG(m.id)
  INTO v_non_bye_ids
  FROM public.tournament_matches m
  WHERE m.round_id = p_round_id
    AND m.is_bye = false;

  IF v_non_bye_ids IS NOT NULL AND array_length(v_non_bye_ids, 1) > 0 THEN
    UPDATE public.tournament_matches
    SET start_time = v_now,
        player1_match_confirmed = false,
        player2_match_confirmed = false,
        match_confirmed_at = NULL
    WHERE id = ANY(v_non_bye_ids);

    -- 4. Create games for each non-bye match
    v_best_of := COALESCE(p_best_of_override, v_phase.best_of, 3);

    INSERT INTO public.match_games (match_id, game_number)
    SELECT m.id, gs.n
    FROM public.tournament_matches m
    CROSS JOIN generate_series(1, v_best_of) AS gs(n)
    WHERE m.id = ANY(v_non_bye_ids);

    GET DIAGNOSTICS v_game_count = ROW_COUNT;
  ELSE
    v_game_count := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'matches_activated', COALESCE(array_length(v_non_bye_ids, 1), 0),
    'byes_completed', v_bye_count,
    'games_created', v_game_count,
    'best_of', COALESCE(p_best_of_override, v_phase.best_of, 3)
  );
END;
$$;
