-- =============================================================================
-- Waitlist auto-promotion trigger
-- =============================================================================
-- When a player drops or withdraws from a tournament that has capacity limits,
-- automatically promote the earliest waitlisted player to 'registered'.
--
-- Fires on:
--   - UPDATE: when status changes FROM registered/checked_in/confirmed
--             TO dropped/withdrawn
--   - DELETE: when a row with status registered/checked_in/confirmed is removed

CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_old_status text;
  v_new_status text;
  v_tournament_status text;
  v_max_participants integer;
  v_current_count integer;
  v_waitlist_reg_id bigint;
BEGIN
  -- Determine context based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_tournament_id := OLD.tournament_id;
    v_old_status := OLD.status::text;
    v_new_status := NULL;
  ELSE
    v_tournament_id := NEW.tournament_id;
    v_old_status := OLD.status::text;
    v_new_status := NEW.status::text;
  END IF;

  -- Only act when a player leaves an active registration slot
  IF v_old_status NOT IN ('registered', 'checked_in', 'confirmed') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- For UPDATE: only act when new status is dropped or withdrawn
  IF TG_OP = 'UPDATE' AND v_new_status NOT IN ('dropped', 'withdrawn') THEN
    RETURN NEW;
  END IF;

  -- Check tournament is still in a registerable state
  SELECT t.status, t.max_participants
  INTO v_tournament_status, v_max_participants
  FROM public.tournaments t
  WHERE t.id = v_tournament_id;

  IF v_tournament_status IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Don't promote if tournament is active, completed, or cancelled
  IF v_tournament_status IN ('active', 'completed', 'cancelled') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- No capacity limit means no waitlist
  IF v_max_participants IS NULL OR v_max_participants <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count current registered/confirmed/checked-in players
  SELECT COUNT(*)
  INTO v_current_count
  FROM public.tournament_registrations r
  WHERE r.tournament_id = v_tournament_id
    AND r.status IN ('registered', 'checked_in', 'confirmed')
    -- Exclude the row being updated/deleted (it hasn't committed yet for UPDATE)
    AND (TG_OP = 'DELETE' OR r.id != NEW.id);

  -- If still at or over capacity, no room to promote
  IF v_current_count >= v_max_participants THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Find the earliest waitlisted player
  SELECT r.id
  INTO v_waitlist_reg_id
  FROM public.tournament_registrations r
  WHERE r.tournament_id = v_tournament_id
    AND r.status = 'waitlist'
  ORDER BY r.registered_at ASC
  LIMIT 1;

  -- Promote the waitlisted player
  IF v_waitlist_reg_id IS NOT NULL THEN
    UPDATE public.tournament_registrations
    SET status = 'registered'
    WHERE id = v_waitlist_reg_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER promote_waitlist_on_update
  AFTER UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_from_waitlist();

CREATE TRIGGER promote_waitlist_on_delete
  AFTER DELETE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_from_waitlist();
