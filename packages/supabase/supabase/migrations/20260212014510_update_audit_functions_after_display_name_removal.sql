-- Update audit log functions to use username instead of display_name
--
-- Context: The display_name column was removed from the alts table in
-- migration 20260212014029. This migration updates the audit log trigger
-- functions that were using COALESCE(display_name, username) to just use username.

-- Replace audit_match_game_events function
CREATE OR REPLACE FUNCTION public.audit_match_game_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_match_id bigint;
  v_round_number int;
  v_submitter_alt_id bigint;
  v_actor_user_id uuid;
  v_actor_name text;
  v_winner_name text;
  v_other_name text;
  v_description text;
BEGIN
  -- Fetch match context
  SELECT player1_alt_id, player2_alt_id, match_id, round_number
    INTO v_alt1_id, v_alt2_id, v_match_id, v_round_number
    FROM public.match_games
   WHERE id = NEW.id;

  -- Identify the submitter (who performed the action)
  IF NEW.last_submitted_by = v_alt1_id THEN
    v_submitter_alt_id := v_alt1_id;
  ELSIF NEW.last_submitted_by = v_alt2_id THEN
    v_submitter_alt_id := v_alt2_id;
  END IF;

  -- Look up submitter's user_id and username
  IF v_submitter_alt_id IS NOT NULL THEN
    SELECT user_id, username
      INTO v_actor_user_id, v_actor_name
      FROM public.alts WHERE id = v_submitter_alt_id;
  END IF;

  -- Look up winner name when available
  IF NEW.winner_alt_id IS NOT NULL THEN
    SELECT username
      INTO v_winner_name
      FROM public.alts
     WHERE id = NEW.winner_alt_id;
  END IF;

  -- -----------------------------------------------------------------
  -- match.score_submitted — a player submitted or corrected a result
  -- -----------------------------------------------------------------
  IF v_submitter_alt_id IS NOT NULL THEN
    -- Look up the other player's name for the description
    IF v_submitter_alt_id = v_alt1_id THEN
      SELECT username INTO v_other_name
        FROM public.alts WHERE id = v_alt2_id;
    ELSE
      SELECT username INTO v_other_name
        FROM public.alts WHERE id = v_alt1_id;
    END IF;

    -- Build description: "Ash reported Game 2 — Brock won"
    v_description := format('%s reported Game %s',
                            COALESCE(v_actor_name, 'A player'),
                            v_round_number);
    IF v_winner_name IS NOT NULL THEN
      v_description := v_description || ' — ' || v_winner_name || ' won';
    END IF;

    INSERT INTO public.audit_log (
      entity_type, entity_id, event_type,
      user_id, actor_name, description
    ) VALUES (
      'match', v_match_id, 'match.score_submitted',
      v_actor_user_id, v_actor_name, v_description
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Replace audit_match_game_disputes function
CREATE OR REPLACE FUNCTION public.audit_match_game_disputes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_match_id bigint;
  v_round_number int;
  v_actor_user_id uuid;
  v_actor_name text;
  v_actor_alt_id bigint;
  v_description text;
BEGIN
  -- Fetch match context
  SELECT player1_alt_id, player2_alt_id, match_id, round_number
    INTO v_alt1_id, v_alt2_id, v_match_id, v_round_number
    FROM public.match_games
   WHERE id = NEW.game_id;

  -- -----------------------------------------------------------------
  -- dispute.resolved — judge resolved a disputed game
  -- -----------------------------------------------------------------
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    -- Use resolved_by to identify the judge
    v_actor_user_id := NULL;
    v_actor_name := NULL;
    IF NEW.resolved_by IS NOT NULL THEN
      SELECT user_id, username
        INTO v_actor_user_id, v_actor_name
        FROM public.alts WHERE id = NEW.resolved_by;
    END IF;

    v_description := format('%s resolved Game %s — %s won',
                            COALESCE(v_actor_name, 'A judge'),
                            v_round_number,
                            CASE NEW.resolution_outcome
                              WHEN 'player1_won' THEN (SELECT username FROM public.alts WHERE id = v_alt1_id)
                              WHEN 'player2_won' THEN (SELECT username FROM public.alts WHERE id = v_alt2_id)
                              ELSE 'unknown'
                            END);

    INSERT INTO public.audit_log (
      entity_type, entity_id, event_type,
      user_id, actor_name, description
    ) VALUES (
      'match', v_match_id, 'dispute.resolved',
      v_actor_user_id, v_actor_name, v_description
    );
  END IF;

  -- -----------------------------------------------------------------
  -- dispute.reset — judge reset a disputed game
  -- -----------------------------------------------------------------
  IF NEW.status = 'pending' AND OLD.status = 'resolved' THEN
    -- Use auth.uid() to identify the judge who performed the reset
    v_actor_user_id := (SELECT auth.uid());
    v_actor_name := NULL;
    v_actor_alt_id := NULL;
    IF v_actor_user_id IS NOT NULL THEN
      SELECT id, username
        INTO v_actor_alt_id, v_actor_name
        FROM public.alts WHERE user_id = v_actor_user_id LIMIT 1;
    END IF;

    v_description := format('%s reset Game %s (was: %s)',
                            COALESCE(v_actor_name, 'A judge'),
                            v_round_number,
                            CASE OLD.resolution_outcome
                              WHEN 'player1_won' THEN (SELECT username FROM public.alts WHERE id = v_alt1_id)
                              WHEN 'player2_won' THEN (SELECT username FROM public.alts WHERE id = v_alt2_id)
                              ELSE 'unknown'
                            END || ' won');

    INSERT INTO public.audit_log (
      entity_type, entity_id, event_type,
      user_id, actor_name, description
    ) VALUES (
      'match', v_match_id, 'dispute.reset',
      v_actor_user_id, v_actor_name, v_description
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Replace audit_round_status_changes function
CREATE OR REPLACE FUNCTION public.audit_round_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_round_number int;
  v_actor_user_id uuid;
  v_actor_alt_id bigint;
  v_actor_name text;
  v_description text;
BEGIN
  -- Fetch tournament context
  SELECT tournament_id, round_number
    INTO v_tournament_id, v_round_number
    FROM public.rounds
   WHERE id = NEW.id;

  -- Identify the actor from the current session
  v_actor_user_id := (SELECT auth.uid());
  IF v_actor_user_id IS NOT NULL THEN
    SELECT id, username
      INTO v_actor_alt_id, v_actor_name
      FROM public.alts WHERE user_id = v_actor_user_id LIMIT 1;
  END IF;

  -- -----------------------------------------------------------------
  -- round.started — TO started a round
  -- -----------------------------------------------------------------
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    v_description := format('%s started Round %s',
                            COALESCE(v_actor_name, 'A TO'),
                            v_round_number);

    INSERT INTO public.audit_log (
      entity_type, entity_id, event_type,
      user_id, actor_name, description
    ) VALUES (
      'tournament', v_tournament_id, 'round.started',
      v_actor_user_id, v_actor_name, v_description
    );
  END IF;

  -- -----------------------------------------------------------------
  -- round.completed — TO completed a round
  -- -----------------------------------------------------------------
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_description := format('%s completed Round %s',
                            COALESCE(v_actor_name, 'A TO'),
                            v_round_number);

    INSERT INTO public.audit_log (
      entity_type, entity_id, event_type,
      user_id, actor_name, description
    ) VALUES (
      'tournament', v_tournament_id, 'round.completed',
      v_actor_user_id, v_actor_name, v_description
    );
  END IF;

  RETURN NEW;
END;
$$;
