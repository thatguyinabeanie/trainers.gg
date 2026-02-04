-- =============================================================================
-- Atomic reset_match RPC
-- =============================================================================
--
-- Resets all games in a match back to pending AND clears the match score
-- in a single atomic transaction. Previously these were two separate writes
-- that could leave the match in an inconsistent state if the second failed.
--
-- Authorization: org staff with tournament.manage permission (same as before).

CREATE OR REPLACE FUNCTION public.reset_match(p_match_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_org_id bigint;
  v_is_staff boolean;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get org for permission check
  SELECT t.organization_id INTO v_org_id
  FROM public.tournament_matches m
  JOIN public.tournament_rounds r ON m.round_id = r.id
  JOIN public.tournament_phases p ON r.phase_id = p.id
  JOIN public.tournaments t ON p.tournament_id = t.id
  WHERE m.id = p_match_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  SELECT public.has_org_permission(v_org_id, 'tournament.manage') INTO v_is_staff;
  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Only org staff can reset matches';
  END IF;

  -- Reset all match_games rows to pending (atomic — same transaction)
  UPDATE public.match_games
  SET alt1_selection = NULL,
      alt2_selection = NULL,
      alt1_submitted_at = NULL,
      alt2_submitted_at = NULL,
      winner_alt_id = NULL,
      status = 'pending',
      resolved_by = NULL,
      resolved_at = NULL,
      resolution_notes = NULL
  WHERE match_id = p_match_id;

  -- Reset match score to 0-0
  UPDATE public.tournament_matches
  SET game_wins1 = 0,
      game_wins2 = 0
  WHERE id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_match(bigint) TO authenticated;
