-- =============================================================================
-- Add score validation to report_match_result RPC
-- =============================================================================
--
-- The existing report_match_result function only checks that scores are >= 0.
-- This migration adds two additional validations:
-- 1. Winner's score must be strictly greater than loser's score
-- 2. Total games (score1 + score2) must not exceed best_of for the phase

CREATE OR REPLACE FUNCTION public.report_match_result(
  p_match_id bigint,
  p_winner_id bigint,
  p_score1 integer,
  p_score2 integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_match record;
  v_is_participant boolean;
  v_org_id bigint;
  v_is_staff boolean;
  v_best_of integer;
  v_winner_score integer;
  v_loser_score integer;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get match details
  SELECT m.id, m.status, m.alt1_id, m.alt2_id, m.round_id
  INTO v_match
  FROM public.tournament_matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Check if caller is a match participant
  SELECT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.user_id = v_user_id
    AND (v_match.alt1_id = a.id OR v_match.alt2_id = a.id)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    -- Check if caller is org staff with tournament.manage permission
    SELECT t.organization_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Match not found';
    END IF;

    SELECT public.has_org_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

    IF NOT v_is_staff THEN
      RAISE EXCEPTION 'Only match participants or org staff can report match results';
    END IF;
  END IF;

  -- Validate match is active
  IF v_match.status != 'active' THEN
    IF v_match.status = 'pending' THEN
      RAISE EXCEPTION 'Match is not active yet. The round must be started first.';
    ELSE
      RAISE EXCEPTION 'Cannot report result for match with status "%"', v_match.status;
    END IF;
  END IF;

  -- Validate winner is one of the players
  IF p_winner_id != v_match.alt1_id AND p_winner_id != v_match.alt2_id THEN
    RAISE EXCEPTION 'Winner must be one of the match participants';
  END IF;

  -- Validate scores are non-negative
  IF p_score1 < 0 OR p_score2 < 0 THEN
    RAISE EXCEPTION 'Scores cannot be negative';
  END IF;

  -- Determine winner and loser scores
  IF p_winner_id = v_match.alt1_id THEN
    v_winner_score := p_score1;
    v_loser_score := p_score2;
  ELSE
    v_winner_score := p_score2;
    v_loser_score := p_score1;
  END IF;

  -- Validate winner's score is strictly greater than loser's score
  IF v_winner_score <= v_loser_score THEN
    RAISE EXCEPTION 'Winner''s score must be strictly greater than loser''s score';
  END IF;

  -- Validate total games do not exceed best_of for the phase
  SELECT COALESCE(tp.best_of, 3)
  INTO v_best_of
  FROM public.tournament_rounds r
  JOIN public.tournament_phases tp ON tp.id = r.phase_id
  WHERE r.id = v_match.round_id;

  IF v_best_of IS NULL THEN
    v_best_of := 3;
  END IF;

  IF (p_score1 + p_score2) > v_best_of THEN
    RAISE EXCEPTION 'Total games (%) cannot exceed best-of-%', (p_score1 + p_score2), v_best_of;
  END IF;

  -- Update match
  UPDATE public.tournament_matches
  SET winner_alt_id = p_winner_id,
      game_wins1 = p_score1,
      game_wins2 = p_score2,
      status = 'completed',
      end_time = now()
  WHERE id = p_match_id;
END;
$$;
