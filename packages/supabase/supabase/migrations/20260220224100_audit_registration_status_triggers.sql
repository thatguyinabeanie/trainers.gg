-- =============================================================================
-- Audit triggers for registration status changes (dropped, checked_in)
-- =============================================================================
-- Automatically logs to audit_log when a player's registration status changes
-- to 'dropped' or 'checked_in'. Follows the same pattern as the existing
-- audit triggers in 20260203181757_comprehensive_audit_log_triggers.sql.

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
        'profile_id', NEW.profile_id,
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
        'profile_id', NEW.profile_id,
        'previous_status', OLD.status::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_registration_status_change_trigger ON public.tournament_registrations;
CREATE TRIGGER audit_registration_status_change_trigger
  AFTER UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_registration_status_change();
