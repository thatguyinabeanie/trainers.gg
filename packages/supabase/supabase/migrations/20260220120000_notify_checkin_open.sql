-- =============================================================================
-- Check-in Open Notifications (Tournament Start)
-- =============================================================================
-- When a tournament status changes to 'active', notify all registered players
-- who have NOT yet checked in. This prompts them to check in before the window
-- closes.
--
-- Notifications include:
--   - Type: 'tournament_start' (existing enum value)
--   - Title: "{Tournament Name} has started"
--   - Body: "Check in now to secure your spot"
--   - Action URL: "/tournaments/{slug}"

CREATE OR REPLACE FUNCTION public.notify_checkin_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_name text;
  v_tournament_slug text;
  v_player record;
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    v_tournament_name := NEW.name;
    v_tournament_slug := NEW.slug;

    -- Notify each registered (but not checked-in) player
    FOR v_player IN
      SELECT DISTINCT a.user_id
      FROM public.tournament_registrations tr
      JOIN public.alts a ON a.id = tr.alt_id
      WHERE tr.tournament_id = NEW.id
        AND tr.status = 'registered'
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        body,
        tournament_id,
        action_url
      ) VALUES (
        v_player.user_id,
        'tournament_start',
        v_tournament_name || ' has started',
        'Check in now to secure your spot',
        NEW.id,
        '/tournaments/' || v_tournament_slug
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_checkin_open_trigger ON public.tournaments;
CREATE TRIGGER notify_checkin_open_trigger
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_checkin_open();
