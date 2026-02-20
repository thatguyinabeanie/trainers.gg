-- =============================================================================
-- Atomic invitation sending with capacity enforcement, status check, and
-- conflict handling
-- =============================================================================
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

  -- Validate that invited_by_alt_id belongs to the authenticated user
  IF NOT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.id = p_invited_by_alt_id AND a.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invited_by_alt_id');
  END IF;

  -- Lock tournament row and fetch details (includes status)
  SELECT t.id, t.max_participants, t.organization_id, t.status
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
$$;
