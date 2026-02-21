-- =============================================================================
-- Update Round Start Notification URLs
-- =============================================================================
-- Changes action_url from /tournaments/{slug}/matches/{matchId}
-- to /tournaments/{slug}/r/{round}/t/{table} to match the new route structure.
--
-- This is idempotent — CREATE OR REPLACE safely overwrites the previous version.

CREATE OR REPLACE FUNCTION public.notify_round_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_tournament_name text;
  v_tournament_slug text;
  v_round_number int;
  v_match record;
  v_alt1 record;
  v_alt2 record;
  v_title text;
  v_body text;
  v_action_url text;
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    -- Get tournament info via join chain
    SELECT t.id, t.name, t.slug, NEW.round_number
    INTO v_tournament_id, v_tournament_name, v_tournament_slug, v_round_number
    FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE p.id = NEW.phase_id;

    v_title := v_tournament_name || ' — Round ' || v_round_number;

    -- Loop through all matches
    FOR v_match IN
      SELECT m.id, m.alt1_id, m.alt2_id, m.table_number, m.is_bye
      FROM public.tournament_matches m
      WHERE m.round_id = NEW.id
    LOOP
      v_action_url := '/tournaments/' || v_tournament_slug || '/r/' || v_round_number || '/t/' || COALESCE(v_match.table_number, 0);

      IF v_match.is_bye THEN
        -- Bye match: notify single player
        SELECT a.user_id INTO v_alt1
        FROM public.alts a
        WHERE a.id = v_match.alt1_id;

        v_body := 'You have a bye this round.';

        INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
        VALUES (v_alt1.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);
      ELSE
        -- Regular match: notify both players
        SELECT a.user_id, a.display_name INTO v_alt1
        FROM public.alts a WHERE a.id = v_match.alt1_id;

        SELECT a.user_id, a.display_name INTO v_alt2
        FROM public.alts a WHERE a.id = v_match.alt2_id;

        -- Notify player 1
        v_body := 'Round ' || v_round_number;
        IF v_match.table_number IS NOT NULL THEN
          v_body := v_body || ', Table ' || v_match.table_number;
        END IF;
        v_body := v_body || ' — vs ' || COALESCE(v_alt2.display_name, 'Opponent');

        INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
        VALUES (v_alt1.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);

        -- Notify player 2
        v_body := 'Round ' || v_round_number;
        IF v_match.table_number IS NOT NULL THEN
          v_body := v_body || ', Table ' || v_match.table_number;
        END IF;
        v_body := v_body || ' — vs ' || COALESCE(v_alt1.display_name, 'Opponent');

        INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
        VALUES (v_alt2.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
