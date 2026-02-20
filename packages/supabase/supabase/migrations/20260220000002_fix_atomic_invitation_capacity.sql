-- Fix: 20260220000002_fix_atomic_invitation_capacity.sql
--
-- Patches the two atomic invitation functions introduced in 20260220000001:
--   1. send_tournament_invitations_atomic:
--      - Add ON CONFLICT DO NOTHING to bulk INSERT to handle concurrent sends (#2)
--      - Wrap array_length(p_invited_alt_ids, 1) in COALESCE to guard against NULL array (#3)
--      - Validate that p_invited_by_alt_id belongs to the authenticated user (#4)
--   2. accept_tournament_invitation_atomic:
--      - Add EXISTS check before INSERT into tournament_registrations to guard
--        against a concurrent direct registration that happened between the lock
--        and the insert (#1)

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
  WHEN OTHERS THEN
    RAISE WARNING 'send_tournament_invitations_atomic failed for tournament %: %',
      p_tournament_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to send invitations. Please try again or contact support.'
    );
END;
$$;

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
  WHEN OTHERS THEN
    RAISE WARNING 'accept_tournament_invitation_atomic failed for invitation %: %',
      p_invitation_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to accept invitation. Please try again or contact support.'
    );
END;
$$;
