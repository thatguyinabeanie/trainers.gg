-- =============================================================================
-- Atomic invitation acceptance with tournament status check, row locking,
-- duplicate registration guard, and narrowed exception handling
-- =============================================================================
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
  v_tournament record;
  v_is_registration_open boolean;
  v_new_reg_id bigint;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Fetch invitation WITH FOR UPDATE to lock the row and prevent stale reads
  SELECT i.id, i.invited_alt_id, i.tournament_id, i.status, i.expires_at
  INTO v_invitation
  FROM public.tournament_invitations i
  WHERE i.id = p_invitation_id
  FOR UPDATE;

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

  -- Validate invitation state
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation already responded to');
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Lock tournament row and fetch status for registration check
  SELECT t.id, t.status, t.allow_late_registration
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = v_invitation.tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Check tournament is open for registration (mirrors register_for_tournament_atomic)
  v_is_registration_open := (
    v_tournament.status = 'draft'
    OR v_tournament.status = 'upcoming'
    OR (v_tournament.status = 'active' AND v_tournament.allow_late_registration = true)
  );

  IF NOT v_is_registration_open THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  -- Guard against alt already being registered (e.g. direct registration happened concurrently)
  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = v_invitation.tournament_id
      AND alt_id = v_invitation.invited_alt_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already registered for this tournament');
  END IF;

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
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already registered for this tournament'
    );
  WHEN OTHERS THEN
    RAISE;
END;
$$;
