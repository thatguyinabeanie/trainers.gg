-- Include the reporter's name in game status system messages.
-- Previously: "Game 1 reported — Player won"
-- Now:        "Game 1 reported by Reporter — Player won"
--
-- Determines the reporter by checking which altN_submitted_at changed,
-- then looks up their display name via the match's alt IDs.

CREATE OR REPLACE FUNCTION public.send_game_status_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_winner_name text;
  v_reporter_name text;
  v_resolver_name text;
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_message text;
BEGIN
  -- Look up winner display name when available
  IF NEW.winner_alt_id IS NOT NULL THEN
    SELECT COALESCE(display_name, username)
      INTO v_winner_name
      FROM public.alts
     WHERE id = NEW.winner_alt_id;
  END IF;

  -- Determine who submitted by checking which submitted_at changed
  SELECT m.alt1_id, m.alt2_id
    INTO v_alt1_id, v_alt2_id
    FROM public.tournament_matches m
   WHERE m.id = NEW.match_id;

  IF OLD.alt1_submitted_at IS DISTINCT FROM NEW.alt1_submitted_at THEN
    SELECT COALESCE(display_name, username)
      INTO v_reporter_name
      FROM public.alts
     WHERE id = v_alt1_id;
  ELSIF OLD.alt2_submitted_at IS DISTINCT FROM NEW.alt2_submitted_at THEN
    SELECT COALESCE(display_name, username)
      INTO v_reporter_name
      FROM public.alts
     WHERE id = v_alt2_id;
  END IF;

  -- Self-correction: status stays agreed but winner changed
  IF OLD.status = 'agreed' AND NEW.status = 'agreed'
     AND OLD.winner_alt_id IS DISTINCT FROM NEW.winner_alt_id THEN
    v_message := format('Game %s result corrected by %s — %s won',
                        NEW.game_number,
                        COALESCE(v_reporter_name, 'Unknown'),
                        COALESCE(v_winner_name, 'Unknown'));

  -- Status changed
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'agreed' THEN
        v_message := format('Game %s reported by %s — %s won',
                            NEW.game_number,
                            COALESCE(v_reporter_name, 'Unknown'),
                            COALESCE(v_winner_name, 'Unknown'));
      WHEN 'disputed' THEN
        v_message := format('Game %s disputed — results don''t match',
                            NEW.game_number);
      WHEN 'resolved' THEN
        -- Look up judge name from resolved_by
        IF NEW.resolved_by IS NOT NULL THEN
          SELECT COALESCE(display_name, username)
            INTO v_resolver_name
            FROM public.alts
           WHERE id = NEW.resolved_by;
        END IF;
        v_message := format('Game %s resolved by %s — %s won',
                            NEW.game_number,
                            COALESCE(v_resolver_name, 'judge'),
                            COALESCE(v_winner_name, 'Unknown'));
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
