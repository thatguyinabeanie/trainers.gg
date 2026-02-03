-- Enrich audit log metadata with human-readable descriptions and actor names.
--
-- The audit log entries previously only stored IDs (alt IDs, winner IDs).
-- The UI checks for metadata.description but it was never populated.
--
-- This migration replaces both trigger functions to embed:
--   - description: human-readable sentence (e.g. "Ash reported Game 2 — Brock won")
--   - actor_name:  display name of the person who performed the action
--   - winner_name: display name of the game winner (where applicable)
--
-- Name lookups use COALESCE(display_name, username) from the alts table,
-- matching the pattern used in send_game_status_message().

-- =============================================================================
-- 1. Replace audit_match_game_events() with enriched metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_match_game_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_submitter_alt_id bigint;
  v_actor_user_id uuid;
  v_actor_name text;
  v_winner_name text;
  v_other_name text;
  v_description text;
BEGIN
  -- Get tournament context + match participant alt IDs
  SELECT t.id, t.organization_id, m.alt1_id, m.alt2_id
    INTO v_tournament_id, v_org_id, v_alt1_id, v_alt2_id
    FROM public.tournament_matches m
    JOIN public.tournament_rounds r ON m.round_id = r.id
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
   WHERE m.id = NEW.match_id;

  -- Determine the submitter by checking which submitted_at changed
  IF OLD.alt1_submitted_at IS NULL AND NEW.alt1_submitted_at IS NOT NULL THEN
    v_submitter_alt_id := v_alt1_id;
  ELSIF OLD.alt2_submitted_at IS NULL AND NEW.alt2_submitted_at IS NOT NULL THEN
    v_submitter_alt_id := v_alt2_id;
  ELSIF OLD.alt1_submitted_at IS NOT NULL AND NEW.alt1_submitted_at IS NOT NULL
        AND OLD.alt1_submitted_at != NEW.alt1_submitted_at THEN
    v_submitter_alt_id := v_alt1_id;
  ELSIF OLD.alt2_submitted_at IS NOT NULL AND NEW.alt2_submitted_at IS NOT NULL
        AND OLD.alt2_submitted_at != NEW.alt2_submitted_at THEN
    v_submitter_alt_id := v_alt2_id;
  END IF;

  -- Look up submitter's user_id and display name
  IF v_submitter_alt_id IS NOT NULL THEN
    SELECT user_id, COALESCE(display_name, username)
      INTO v_actor_user_id, v_actor_name
      FROM public.alts WHERE id = v_submitter_alt_id;
  END IF;

  -- Look up winner name when available
  IF NEW.winner_alt_id IS NOT NULL THEN
    SELECT COALESCE(display_name, username)
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
      SELECT COALESCE(display_name, username) INTO v_other_name
        FROM public.alts WHERE id = v_alt2_id;
    ELSE
      SELECT COALESCE(display_name, username) INTO v_other_name
        FROM public.alts WHERE id = v_alt1_id;
    END IF;

    -- Build description: "Ash reported Game 2 — Brock won"
    v_description := format('%s reported Game %s',
      COALESCE(v_actor_name, 'Unknown'), NEW.game_number);
    -- Append winner info from submitter's perspective
    IF v_submitter_alt_id = v_alt1_id AND NEW.alt1_selection IS NOT NULL THEN
      IF NEW.alt1_selection = v_alt1_id THEN
        v_description := v_description || format(' — %s won', COALESCE(v_actor_name, 'Unknown'));
      ELSE
        v_description := v_description || format(' — %s won', COALESCE(v_other_name, 'Unknown'));
      END IF;
    ELSIF v_submitter_alt_id = v_alt2_id AND NEW.alt2_selection IS NOT NULL THEN
      IF NEW.alt2_selection = v_alt2_id THEN
        v_description := v_description || format(' — %s won', COALESCE(v_actor_name, 'Unknown'));
      ELSE
        v_description := v_description || format(' — %s won', COALESCE(v_other_name, 'Unknown'));
      END IF;
    END IF;

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, game_id, organization_id, metadata)
    VALUES (
      'match.score_submitted',
      v_actor_user_id,
      v_submitter_alt_id,
      v_tournament_id,
      NEW.match_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'game_number', NEW.game_number,
        'selected_winner_alt_id',
          CASE WHEN v_submitter_alt_id = v_alt1_id
               THEN NEW.alt1_selection
               ELSE NEW.alt2_selection END,
        'is_correction', (OLD.status = 'agreed'),
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- match.score_agreed — game resolved via player report
  -- -----------------------------------------------------------------
  IF NEW.status = 'agreed' AND OLD.status IS DISTINCT FROM 'agreed' THEN
    v_description := format('Game %s agreed — %s won',
      NEW.game_number, COALESCE(v_winner_name, 'Unknown'));

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, game_id, organization_id, metadata)
    VALUES (
      'match.score_agreed',
      v_actor_user_id,
      v_submitter_alt_id,
      v_tournament_id,
      NEW.match_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'game_number', NEW.game_number,
        'winner_alt_id', NEW.winner_alt_id,
        'description', v_description,
        'actor_name', v_actor_name,
        'winner_name', v_winner_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- match.score_disputed — players disagreed on the result
  -- -----------------------------------------------------------------
  IF NEW.status = 'disputed' AND OLD.status IS DISTINCT FROM 'disputed' THEN
    v_description := format('Game %s disputed — players disagree', NEW.game_number);

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, game_id, organization_id, metadata)
    VALUES (
      'match.score_disputed',
      v_actor_user_id,
      v_submitter_alt_id,
      v_tournament_id,
      NEW.match_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'game_number', NEW.game_number,
        'alt1_selection', NEW.alt1_selection,
        'alt2_selection', NEW.alt2_selection,
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- judge.game_override — judge resolved a game
  -- -----------------------------------------------------------------
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    -- Use resolved_by to identify the judge
    v_actor_user_id := NULL;
    v_actor_name := NULL;
    IF NEW.resolved_by IS NOT NULL THEN
      SELECT user_id, COALESCE(display_name, username)
        INTO v_actor_user_id, v_actor_name
        FROM public.alts WHERE id = NEW.resolved_by;
    END IF;

    v_description := format('%s resolved Game %s — %s won',
      COALESCE(v_actor_name, 'Judge'),
      NEW.game_number,
      COALESCE(v_winner_name, 'Unknown'));

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, game_id, organization_id, metadata)
    VALUES (
      'judge.game_override',
      v_actor_user_id,
      NEW.resolved_by,
      v_tournament_id,
      NEW.match_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'game_number', NEW.game_number,
        'winner_alt_id', NEW.winner_alt_id,
        'previous_status', OLD.status::text,
        'resolution_notes', NEW.resolution_notes,
        'description', v_description,
        'actor_name', v_actor_name,
        'winner_name', v_winner_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- judge.game_reset — game reset back to pending
  -- -----------------------------------------------------------------
  IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
    -- Use auth.uid() to identify the judge who performed the reset
    v_actor_user_id := (SELECT auth.uid());
    v_actor_name := NULL;
    v_submitter_alt_id := NULL;
    IF v_actor_user_id IS NOT NULL THEN
      SELECT id, COALESCE(display_name, username)
        INTO v_submitter_alt_id, v_actor_name
        FROM public.alts WHERE user_id = v_actor_user_id LIMIT 1;
    END IF;

    v_description := format('%s reset Game %s (was: %s)',
      COALESCE(v_actor_name, 'Judge'),
      NEW.game_number,
      OLD.status::text);

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, game_id, organization_id, metadata)
    VALUES (
      'judge.game_reset',
      v_actor_user_id,
      v_submitter_alt_id,
      v_tournament_id,
      NEW.match_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'game_number', NEW.game_number,
        'previous_status', OLD.status::text,
        'previous_winner_alt_id', OLD.winner_alt_id,
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


-- =============================================================================
-- 2. Replace audit_match_events() with enriched metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_match_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
  v_actor_user_id uuid;
  v_actor_alt_id bigint;
  v_actor_name text;
  v_description text;
BEGIN
  -- Get tournament context
  SELECT t.id, t.organization_id
    INTO v_tournament_id, v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
   WHERE r.id = NEW.round_id;

  -- Identify the actor from the current session
  v_actor_user_id := (SELECT auth.uid());
  IF v_actor_user_id IS NOT NULL THEN
    SELECT id, COALESCE(display_name, username)
      INTO v_actor_alt_id, v_actor_name
      FROM public.alts WHERE user_id = v_actor_user_id LIMIT 1;
  END IF;

  -- -----------------------------------------------------------------
  -- match.staff_requested — judge called
  -- -----------------------------------------------------------------
  IF NEW.staff_requested = true
     AND (OLD.staff_requested IS NULL OR OLD.staff_requested = false) THEN

    v_description := format('%s requested a judge', COALESCE(v_actor_name, 'A player'));
    IF NEW.table_number IS NOT NULL THEN
      v_description := v_description || format(' (Table %s)', NEW.table_number);
    END IF;

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, organization_id, metadata)
    VALUES (
      'match.staff_requested',
      v_actor_user_id,
      v_actor_alt_id,
      v_tournament_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'table_number', NEW.table_number,
        'alt1_id', NEW.alt1_id,
        'alt2_id', NEW.alt2_id,
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- match.staff_resolved — judge request cleared
  -- -----------------------------------------------------------------
  IF NEW.staff_requested = false AND OLD.staff_requested = true THEN

    v_description := format('%s resolved judge request', COALESCE(v_actor_name, 'Staff'));
    IF NEW.table_number IS NOT NULL THEN
      v_description := v_description || format(' (Table %s)', NEW.table_number);
    END IF;

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, organization_id, metadata)
    VALUES (
      'match.staff_resolved',
      v_actor_user_id,
      v_actor_alt_id,
      v_tournament_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'table_number', NEW.table_number,
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- judge.match_reset — match scores zeroed from non-zero
  -- -----------------------------------------------------------------
  IF NEW.game_wins1 = 0 AND NEW.game_wins2 = 0
     AND (OLD.game_wins1 > 0 OR OLD.game_wins2 > 0) THEN

    v_description := format('%s reset match (was %s-%s)',
      COALESCE(v_actor_name, 'Staff'),
      OLD.game_wins1,
      OLD.game_wins2);

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, organization_id, metadata)
    VALUES (
      'judge.match_reset',
      v_actor_user_id,
      v_actor_alt_id,
      v_tournament_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'previous_score', format('%s-%s', OLD.game_wins1, OLD.game_wins2),
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
