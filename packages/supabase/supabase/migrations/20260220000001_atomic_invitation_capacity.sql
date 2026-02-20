-- =============================================================================
-- Atomic registration: capacity check includes pending non-expired invitations
-- =============================================================================
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
