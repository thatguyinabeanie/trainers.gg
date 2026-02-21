-- =============================================================================
-- Fix audit trigger: profile_id → alt_id
-- =============================================================================
-- The tournament_registrations table uses alt_id, not profile_id.
-- This replaces the function to reference the correct column.

CREATE OR REPLACE FUNCTION public.audit_registration_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id bigint;
  v_actor_user_id uuid;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get organization context from the tournament
  SELECT t.organization_id
    INTO v_org_id
    FROM public.tournaments t
   WHERE t.id = NEW.tournament_id;

  -- -----------------------------------------------------------------------
  -- registration.dropped — player dropped from tournament
  -- -----------------------------------------------------------------------
  IF NEW.status = 'dropped' THEN
    -- Actor is the staff member who dropped the player, falling back to
    -- the current session user (self-drop)
    v_actor_user_id := COALESCE(NEW.dropped_by, (SELECT auth.uid()));

    INSERT INTO public.audit_log
      (action, actor_user_id, tournament_id, organization_id, metadata)
    VALUES (
      'registration.dropped',
      v_actor_user_id,
      NEW.tournament_id,
      v_org_id,
      jsonb_build_object(
        'registration_id', NEW.id,
        'alt_id', NEW.alt_id,
        'previous_status', OLD.status::text,
        'drop_category', NEW.drop_category,
        'drop_notes', NEW.drop_notes,
        'dropped_by', NEW.dropped_by
      )
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- registration.checked_in — player checked in to tournament
  -- -----------------------------------------------------------------------
  IF NEW.status = 'checked_in' THEN
    v_actor_user_id := (SELECT auth.uid());

    INSERT INTO public.audit_log
      (action, actor_user_id, tournament_id, organization_id, metadata)
    VALUES (
      'registration.checked_in',
      v_actor_user_id,
      NEW.tournament_id,
      v_org_id,
      jsonb_build_object(
        'registration_id', NEW.id,
        'alt_id', NEW.alt_id,
        'previous_status', OLD.status::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
