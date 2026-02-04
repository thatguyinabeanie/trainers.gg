-- Send a system chat message whenever a game's status or winner changes.
-- Runs as SECURITY DEFINER so it can insert into match_messages with alt_id = NULL.

CREATE OR REPLACE FUNCTION public.send_game_status_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_winner_name text;
  v_message text;
BEGIN
  -- Look up winner display name when available
  IF NEW.winner_alt_id IS NOT NULL THEN
    SELECT COALESCE(display_name, username)
      INTO v_winner_name
      FROM public.alts
     WHERE id = NEW.winner_alt_id;
  END IF;

  -- Self-correction: status stays agreed but winner changed
  IF OLD.status = 'agreed' AND NEW.status = 'agreed'
     AND OLD.winner_alt_id IS DISTINCT FROM NEW.winner_alt_id THEN
    v_message := format('Game %s result corrected — %s won',
                        NEW.game_number, COALESCE(v_winner_name, 'Unknown'));

  -- Status changed
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'agreed' THEN
        v_message := format('Game %s reported — %s won',
                            NEW.game_number, COALESCE(v_winner_name, 'Unknown'));
      WHEN 'disputed' THEN
        v_message := format('Game %s disputed — results don''t match',
                            NEW.game_number);
      WHEN 'resolved' THEN
        v_message := format('Game %s resolved by judge — %s won',
                            NEW.game_number, COALESCE(v_winner_name, 'Unknown'));
      WHEN 'pending' THEN
        v_message := format('Game %s has been reset', NEW.game_number);
      ELSE
        -- No message for other transitions
    END CASE;
  END IF;

  -- Insert system message if we have one
  IF v_message IS NOT NULL THEN
    INSERT INTO public.match_messages (match_id, alt_id, content, message_type)
    VALUES (NEW.match_id, NULL, v_message, 'system');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_game_status_message ON public.match_games;
CREATE TRIGGER trg_game_status_message
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.send_game_status_message();
