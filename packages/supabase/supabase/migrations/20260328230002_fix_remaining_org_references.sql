-- =============================================================================
-- Part 2: Functions 11-13 (split to avoid Supabase preview parser issue
-- with EXCEPTION blocks in multi-statement migration files)
-- =============================================================================

-- 11. send_tournament_invitations_atomic
CREATE OR REPLACE FUNCTION public.send_tournament_invitations_atomic(p_tournament_id bigint, p_invited_alt_ids bigint[], p_invited_by_alt_id bigint, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_tournament record;
  v_occupied integer;
  v_available integer;
  v_new_ids bigint[];
  v_new_count integer;
  v_already_count integer;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate that invited_by_alt_id belongs to the authenticated user
  IF NOT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.id = p_invited_by_alt_id AND a.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invited_by_alt_id');
  END IF;

  -- Lock tournament row and fetch details (includes status)
  SELECT t.id, t.max_participants, t.community_id, t.status
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Tournament must be in a state that allows invitations
  IF v_tournament.status NOT IN ('draft', 'upcoming', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not accepting invitations');
  END IF;

  -- Check permission using existing has_community_permission function
  IF NOT public.has_community_permission(v_tournament.community_id, 'tournament.manage') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You don''t have permission to send invitations');
  END IF;

  -- Count occupied spots: registered + pending non-expired
  SELECT (
    (SELECT COUNT(*) FROM public.tournament_registrations
     WHERE tournament_id = p_tournament_id AND status = 'registered') +
    (SELECT COUNT(*) FROM public.tournament_invitations
     WHERE tournament_id = p_tournament_id
       AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > now()))
  )::integer INTO v_occupied;

  -- Filter to only alts not already invited (any status)
  SELECT ARRAY(
    SELECT unnest(p_invited_alt_ids)
    EXCEPT
    SELECT invited_alt_id FROM public.tournament_invitations
    WHERE tournament_id = p_tournament_id
  ) INTO v_new_ids;

  v_new_count := COALESCE(array_length(v_new_ids, 1), 0);
  v_already_count := COALESCE(array_length(p_invited_alt_ids, 1), 0) - v_new_count;

  -- Check capacity only for new invitations
  IF v_tournament.max_participants IS NOT NULL AND
     v_occupied + v_new_count > v_tournament.max_participants THEN
    v_available := GREATEST(v_tournament.max_participants - v_occupied, 0);
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Not enough spots available. %s spot(s) available, %s requested.',
        v_available, v_new_count
      ),
      'availableSpots', v_available
    );
  END IF;

  -- Insert invitations for new alts only; ON CONFLICT DO NOTHING handles rare concurrent duplicates
  IF v_new_count > 0 THEN
    INSERT INTO public.tournament_invitations (
      tournament_id, invited_alt_id, invited_by_alt_id,
      status, message, invited_at, expires_at
    )
    SELECT
      p_tournament_id,
      unnest(v_new_ids),
      p_invited_by_alt_id,
      'pending',
      p_message,
      now(),
      now() + interval '14 days'
    ON CONFLICT (tournament_id, invited_alt_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitationsSent', v_new_count,
    'alreadyInvited', v_already_count,
    'availableSpots', CASE
      WHEN v_tournament.max_participants IS NULL THEN NULL
      ELSE v_tournament.max_participants - v_occupied - v_new_count
    END
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'One or more invitations already exist. Please refresh and try again.'
    );
  WHEN OTHERS THEN
    RAISE;
END;
$function$;

-- 12. start_match
CREATE OR REPLACE FUNCTION public.start_match(p_match_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- Check if caller is community staff with tournament.manage permission
    SELECT t.community_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Match not found';
    END IF;

    SELECT public.has_community_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

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
$function$;

-- 13. start_round
CREATE OR REPLACE FUNCTION public.start_round(p_round_id bigint, p_best_of_override integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- Get phase with tournament/community info
  SELECT tp.id, tp.tournament_id, tp.best_of,
         t.community_id, t.status AS tournament_status
  INTO v_phase
  FROM public.tournament_phases tp
  JOIN public.tournaments t ON t.id = tp.tournament_id
  WHERE tp.id = v_round.phase_id;

  IF v_phase IS NULL THEN
    RAISE EXCEPTION 'Phase not found';
  END IF;

  -- Permission check: community owner or staff with tournament.manage
  IF NOT public.has_community_permission(v_phase.community_id, 'tournament.manage') THEN
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
$function$;
