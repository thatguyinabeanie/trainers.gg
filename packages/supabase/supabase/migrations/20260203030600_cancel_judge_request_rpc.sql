-- SECURITY DEFINER RPC: cancel_judge_request
--
-- Allows match participants to cancel their own judge request
-- (sets staff_requested = false). Only participants can cancel;
-- staff use clear_judge_request instead.

CREATE OR REPLACE FUNCTION public.cancel_judge_request(p_match_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_participant boolean;
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
    RAISE EXCEPTION 'Only match participants can cancel judge requests';
  END IF;

  -- Clear staff_requested
  UPDATE public.tournament_matches
  SET staff_requested = false
  WHERE id = p_match_id
    AND staff_requested = true;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_judge_request(bigint) TO authenticated;
