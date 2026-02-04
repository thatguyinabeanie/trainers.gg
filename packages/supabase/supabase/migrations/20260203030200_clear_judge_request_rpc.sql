-- SECURITY DEFINER RPC: clear_judge_request
--
-- Allows org staff with tournament.manage permission to clear staff_requested
-- on a tournament match. Only staff can clear the request (not participants).

CREATE OR REPLACE FUNCTION public.clear_judge_request(p_match_id bigint)
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

  -- Get the org for this match
  SELECT t.organization_id INTO v_org_id
  FROM public.tournament_matches m
  JOIN public.tournament_rounds r ON m.round_id = r.id
  JOIN public.tournament_phases p ON r.phase_id = p.id
  JOIN public.tournaments t ON p.tournament_id = t.id
  WHERE m.id = p_match_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Only org staff with tournament.manage can clear judge requests
  SELECT public.has_org_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Only org staff can clear judge requests';
  END IF;

  -- Clear staff_requested
  UPDATE public.tournament_matches
  SET staff_requested = false,
      staff_resolved_by = (
        SELECT a.id FROM public.alts a
        WHERE a.user_id = v_user_id
        ORDER BY a.id
        LIMIT 1
      )
  WHERE id = p_match_id
    AND staff_requested = true;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.clear_judge_request(bigint) TO authenticated;
