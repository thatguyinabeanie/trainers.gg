-- =============================================================================
-- Match check-in: confirm_match_checkin() RPC
-- =============================================================================
-- Players confirm readiness ("check in") for a match. When both players have
-- confirmed, the match automatically transitions from pending to active.
-- Staff can force-check-in a specific player using the p_alt_id parameter.
--
-- System messages are inserted into match chat for transparency.

CREATE OR REPLACE FUNCTION public.confirm_match_checkin(
  p_match_id bigint,
  p_alt_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_match record;
  v_caller_alt_id bigint;
  v_is_alt1 boolean;
  v_org_id bigint;
  v_is_staff boolean := false;
  v_target_alt_id bigint;
  v_target_is_alt1 boolean;
  v_player_name text;
  v_both_confirmed boolean;
BEGIN
  -- Authenticate
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get match details
  SELECT m.id, m.status, m.alt1_id, m.alt2_id, m.round_id,
         m.player1_match_confirmed, m.player2_match_confirmed
  INTO v_match
  FROM public.tournament_matches m
  WHERE m.id = p_match_id;

  IF v_match IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  -- Match must be pending
  IF v_match.status != 'pending' THEN
    IF v_match.status = 'active' THEN
      RETURN jsonb_build_object('success', true, 'already_active', true);
    END IF;
    RETURN jsonb_build_object('success', false, 'error',
      format('Cannot check in for match with status "%s"', v_match.status));
  END IF;

  -- Check if caller is a participant
  SELECT a.id, (a.id = v_match.alt1_id)
  INTO v_caller_alt_id, v_is_alt1
  FROM public.alts a
  WHERE a.user_id = v_user_id
    AND (a.id = v_match.alt1_id OR a.id = v_match.alt2_id)
  LIMIT 1;

  -- If not a participant, check staff permission
  IF v_caller_alt_id IS NULL THEN
    SELECT t.organization_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NOT NULL THEN
      SELECT public.has_org_permission(v_org_id, 'tournament.manage')
      INTO v_is_staff;
    END IF;

    IF NOT v_is_staff THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Only match participants or tournament staff can check in');
    END IF;

    -- Staff must provide p_alt_id to specify which player to check in
    IF p_alt_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Staff must specify which player to check in (p_alt_id)');
    END IF;

    -- Validate p_alt_id is one of the match participants
    IF p_alt_id != v_match.alt1_id AND p_alt_id != v_match.alt2_id THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Specified alt is not a participant in this match');
    END IF;

    v_target_alt_id := p_alt_id;
    v_target_is_alt1 := (p_alt_id = v_match.alt1_id);
  ELSE
    -- Player checking in for themselves
    v_target_alt_id := v_caller_alt_id;
    v_target_is_alt1 := v_is_alt1;
  END IF;

  -- Check if already confirmed
  IF v_target_is_alt1 AND v_match.player1_match_confirmed THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true);
  END IF;
  IF NOT v_target_is_alt1 AND v_match.player2_match_confirmed THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true);
  END IF;

  -- Get player name for system message
  SELECT COALESCE(a.display_name, a.username)
  INTO v_player_name
  FROM public.alts a
  WHERE a.id = v_target_alt_id;

  -- Set the confirmation flag
  IF v_target_is_alt1 THEN
    UPDATE public.tournament_matches
    SET player1_match_confirmed = true
    WHERE id = p_match_id;
  ELSE
    UPDATE public.tournament_matches
    SET player2_match_confirmed = true
    WHERE id = p_match_id;
  END IF;

  -- Insert system message: "{player} checked in"
  INSERT INTO public.match_messages (match_id, alt_id, message_type, content)
  VALUES (p_match_id, v_target_alt_id, 'system',
    v_player_name || ' checked in');

  -- Check if both are now confirmed
  SELECT player1_match_confirmed AND player2_match_confirmed
  INTO v_both_confirmed
  FROM public.tournament_matches
  WHERE id = p_match_id;

  IF v_both_confirmed THEN
    -- Activate the match
    UPDATE public.tournament_matches
    SET status = 'active',
        match_confirmed_at = now()
    WHERE id = p_match_id;

    -- Insert system message: match started
    INSERT INTO public.match_messages (match_id, alt_id, message_type, content)
    VALUES (p_match_id, NULL, 'system',
      'Both players ready — match started!');

    RETURN jsonb_build_object(
      'success', true,
      'match_activated', true,
      'player_name', v_player_name
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'match_activated', false,
    'player_name', v_player_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_match_checkin(bigint, bigint) TO authenticated;
