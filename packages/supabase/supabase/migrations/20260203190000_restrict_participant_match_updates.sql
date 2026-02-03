-- =============================================================================
-- Restrict participant UPDATE access on tournament_matches
-- =============================================================================
--
-- The existing "Participants can update their matches" RLS policy allows
-- participants to UPDATE any column (winner_alt_id, status, staff_requested,
-- etc.) directly. This is overly permissive — participants should only be able
-- to start matches and report results through controlled SECURITY DEFINER RPCs.
--
-- This migration:
-- 1. Drops the overly permissive participant UPDATE policy
-- 2. Creates start_match() RPC for participants to activate a pending match
-- 3. Creates report_match_result() RPC for participants to submit results

-- =============================================================================
-- Step 1: Drop the overly permissive policy
-- =============================================================================

DROP POLICY IF EXISTS "Participants can update their matches"
    ON "public"."tournament_matches";

-- =============================================================================
-- Step 2: start_match RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.start_match(p_match_id bigint)
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
      RAISE EXCEPTION 'Only match participants or org staff can start a match';
    END IF;
  END IF;

  -- Validate status
  IF v_match.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot start match with status "%"', v_match.status;
  END IF;

  -- Update match
  UPDATE public.tournament_matches
  SET status = 'active',
      start_time = now()
  WHERE id = p_match_id;
END;
$$;

-- =============================================================================
-- Step 3: report_match_result RPC
-- =============================================================================

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

  -- Validate scores
  IF p_score1 < 0 OR p_score2 < 0 THEN
    RAISE EXCEPTION 'Scores cannot be negative';
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

-- =============================================================================
-- Grant execute to authenticated users
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.start_match(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_match_result(bigint, bigint, integer, integer) TO authenticated;
