-- Auto-dismiss match notifications when match completes
-- When a match status changes to 'completed' or 'cancelled', automatically mark
-- all unread notifications for that match as read.

CREATE OR REPLACE FUNCTION public.auto_dismiss_match_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only trigger when status changes to completed or cancelled
  IF NEW.status IN ('completed', 'cancelled') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'cancelled')) THEN

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

DROP TRIGGER IF EXISTS auto_dismiss_match_notifications_trigger ON public.tournament_matches;
CREATE TRIGGER auto_dismiss_match_notifications_trigger
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_dismiss_match_notifications();

COMMENT ON FUNCTION public.auto_dismiss_match_notifications() IS
  'Automatically marks match notifications as read when the match completes or is cancelled';
