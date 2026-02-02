-- SECURITY DEFINER RPC: request_judge
--
-- Allows match participants and org staff to set staff_requested = true
-- on a tournament match. This bypasses RLS (which has no UPDATE policy
-- on tournament_matches) while enforcing authorization server-side.

CREATE OR REPLACE FUNCTION public.request_judge(p_match_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_org_id bigint;
  v_is_participant boolean;
  v_is_staff boolean;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if caller is a match participant
  SELECT EXISTS (
    SELECT 1 FROM public.alts a
    JOIN public.tournament_matches m ON (m.alt1_id = a.id OR m.alt2_id = a.id)
    WHERE m.id = p_match_id AND a.user_id = v_user_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    -- Check if caller is org staff with tournament.manage permission
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
      RAISE EXCEPTION 'Only match participants or org staff can request a judge';
    END IF;
  END IF;

  -- Set staff_requested (only if not already set)
  UPDATE public.tournament_matches
  SET staff_requested = true,
      staff_requested_at = COALESCE(staff_requested_at, now())
  WHERE id = p_match_id
    AND staff_requested = false;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.request_judge(bigint) TO authenticated;
