-- =============================================================================
-- Atomic invitation capacity enforcement
-- =============================================================================
-- 1. Modify register_for_tournament_atomic: capacity check now includes pending
--    non-expired invitations so direct registrations can't bypass reserved spots.
-- 2. New send_tournament_invitations_atomic: atomic capacity-aware invite sending.
-- 3. New accept_tournament_invitation_atomic: atomic invite acceptance.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Modify register_for_tournament_atomic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_for_tournament_atomic(
  p_tournament_id bigint,
  p_alt_id bigint DEFAULT NULL,
  p_team_name text DEFAULT NULL,
  p_in_game_name text DEFAULT NULL,
  p_display_name_option text DEFAULT NULL,
  p_show_country_flag boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_alt record;
  v_tournament record;
  v_existing_registration_id bigint;
  v_current_count integer;
  v_registration_status public.registration_status;
  v_new_registration_id bigint;
  v_is_registration_open boolean;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_alt_id IS NOT NULL THEN
    SELECT a.id, a.user_id INTO v_alt
    FROM public.alts a
    WHERE a.id = p_alt_id AND a.user_id = v_user_id;
  ELSE
    SELECT a.id, a.user_id INTO v_alt
    FROM public.alts a
    WHERE a.user_id = v_user_id
      AND a.id = (SELECT u.main_alt_id FROM public.users u WHERE u.id = v_user_id)
    LIMIT 1;
  END IF;

  IF v_alt IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unable to load your account. Please try signing out and back in, or contact support.'
    );
  END IF;

  SELECT tr.id INTO v_existing_registration_id
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = p_tournament_id AND tr.alt_id = v_alt.id;

  IF v_existing_registration_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already registered for this tournament');
  END IF;

  SELECT t.id, t.status, t.max_participants, t.allow_late_registration
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  v_is_registration_open := (
    v_tournament.status = 'draft'
    OR v_tournament.status = 'upcoming'
    OR (v_tournament.status = 'active' AND v_tournament.allow_late_registration = true)
  );

  IF NOT v_is_registration_open THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  -- Count registered + pending non-expired invitations (both reserve spots)
  SELECT (
    (SELECT COUNT(*) FROM public.tournament_registrations
     WHERE tournament_id = p_tournament_id AND status = 'registered') +
    (SELECT COUNT(*) FROM public.tournament_invitations
     WHERE tournament_id = p_tournament_id
       AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > now()))
  )::integer INTO v_current_count;

  IF v_tournament.max_participants IS NOT NULL
     AND v_current_count >= v_tournament.max_participants THEN
    v_registration_status := 'waitlist';
  ELSE
    v_registration_status := 'registered';
  END IF;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at,
    team_name, in_game_name, display_name_option, show_country_flag
  ) VALUES (
    p_tournament_id, v_alt.id, v_registration_status, now(),
    p_team_name, p_in_game_name, p_display_name_option, p_show_country_flag
  )
  RETURNING id INTO v_new_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'registrationId', v_new_registration_id,
    'status', v_registration_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'register_for_tournament_atomic failed for tournament % alt %: %',
      p_tournament_id, p_alt_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registration failed. Please try again or contact support if the issue persists.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. New send_tournament_invitations_atomic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_tournament_invitations_atomic(
  p_tournament_id bigint,
  p_invited_alt_ids bigint[],
  p_invited_by_alt_id bigint,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  -- Lock tournament row and fetch details
  SELECT t.id, t.max_participants, t.organization_id
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Check permission using existing has_org_permission function
  IF NOT public.has_org_permission(v_tournament.organization_id, 'tournament.manage') THEN
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
  v_already_count := array_length(p_invited_alt_ids, 1) - v_new_count;

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

  -- Insert invitations for new alts only
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
      now() + interval '14 days';
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
  WHEN OTHERS THEN
    RAISE WARNING 'send_tournament_invitations_atomic failed for tournament %: %',
      p_tournament_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to send invitations. Please try again or contact support.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. New accept_tournament_invitation_atomic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_tournament_invitation_atomic(
  p_invitation_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_invitation record;
  v_new_reg_id bigint;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Fetch invitation
  SELECT i.id, i.invited_alt_id, i.tournament_id, i.status, i.expires_at
  INTO v_invitation
  FROM public.tournament_invitations i
  WHERE i.id = p_invitation_id;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Verify invitation belongs to caller's alt
  IF NOT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.id = v_invitation.invited_alt_id AND a.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation is not for you');
  END IF;

  -- Validate state
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation already responded to');
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Lock tournament row (prevents concurrent duplicate accepts for the same invitation)
  PERFORM 1 FROM public.tournaments WHERE id = v_invitation.tournament_id FOR UPDATE;

  -- Accept: update invitation + insert registration atomically
  UPDATE public.tournament_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = p_invitation_id;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at
  ) VALUES (
    v_invitation.tournament_id, v_invitation.invited_alt_id, 'registered', now()
  )
  RETURNING id INTO v_new_reg_id;

  RETURN jsonb_build_object(
    'success', true,
    'registrationId', v_new_reg_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'accept_tournament_invitation_atomic failed for invitation %: %',
      p_invitation_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to accept invitation. Please try again or contact support.'
    );
END;
$$;
