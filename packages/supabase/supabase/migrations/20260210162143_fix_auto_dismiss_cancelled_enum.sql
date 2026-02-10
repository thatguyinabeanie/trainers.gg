-- =============================================================================
-- Fix auto_dismiss_match_notifications trigger
-- =============================================================================
-- The trigger referenced 'cancelled' which is not a valid value in the
-- phase_status enum (only: pending, active, completed). This caused:
--   "invalid input value for enum public.phase_status: 'cancelled'"
-- when starting a round, because PostgreSQL casts all IN-list literals
-- to the column's enum type at plan time.

CREATE OR REPLACE FUNCTION public.auto_dismiss_match_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only trigger when status changes to completed
  IF NEW.status = 'completed' AND
     (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Mark all unread match notifications as read
    UPDATE public.notifications
    SET read_at = now()
    WHERE match_id = NEW.id
      AND type IN ('match_ready', 'tournament_round')
      AND read_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_dismiss_match_notifications() IS
  'Automatically marks match notifications as read when the match completes';
