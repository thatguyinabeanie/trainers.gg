-- Comprehensive audit log triggers for match and game events.
--
-- Previously only 2 of the 24 defined audit actions were actually logged
-- (match.staff_requested and match.score_disputed). This migration adds
-- triggers for all match/game-level actions:
--
--   match.score_submitted  — player submitted or corrected a game result
--   match.score_agreed     — game resolved via player report
--   match.score_disputed   — players disagreed (replaces old trigger)
--   match.staff_requested  — judge called (enhanced with actor tracking)
--   match.staff_resolved   — judge request cleared
--   judge.game_override    — judge overrode a game result
--   judge.game_reset       — judge reset a game to pending
--   judge.match_reset      — judge reset entire match

-- =============================================================================
-- 1. Replace match_games audit trigger
-- =============================================================================
-- Drop the old limited trigger that only handled disputes.

DROP TRIGGER IF EXISTS audit_game_dispute_trigger ON public.match_games;
DROP FUNCTION IF EXISTS public.audit_game_dispute();

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
BEGIN
  -- Get tournament context + match participant alt IDs
  SELECT t.id, t.organization_id, m.alt1_id, m.alt2_id
    INTO v_tournament_id, v_org_id, v_alt1_id, v_alt2_id
    FROM public.tournament_matches m
    JOIN public.tournament_rounds r ON m.round_id = r.id
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
   WHERE m.id = NEW.match_id;

  -- Determine the submitter by checking which submitted_at went from
  -- NULL → non-NULL (new submission) or changed (self-correction).
  -- Does NOT trigger on non-NULL → NULL (reset).
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

  -- Look up the submitter's user_id
  IF v_submitter_alt_id IS NOT NULL THEN
    SELECT user_id INTO v_actor_user_id
      FROM public.alts WHERE id = v_submitter_alt_id;
  END IF;

  -- -----------------------------------------------------------------
  -- match.score_submitted — a player submitted or corrected a result
  -- -----------------------------------------------------------------
  IF v_submitter_alt_id IS NOT NULL THEN
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
        'is_correction', (OLD.status = 'agreed')
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- match.score_agreed — game resolved via player report
  -- -----------------------------------------------------------------
  IF NEW.status = 'agreed' AND OLD.status IS DISTINCT FROM 'agreed' THEN
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
        'winner_alt_id', NEW.winner_alt_id
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- match.score_disputed — players disagreed on the result
  -- -----------------------------------------------------------------
  IF NEW.status = 'disputed' AND OLD.status IS DISTINCT FROM 'disputed' THEN
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
        'alt2_selection', NEW.alt2_selection
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- judge.game_override — judge resolved a game
  -- -----------------------------------------------------------------
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    -- Use resolved_by to identify the judge
    v_actor_user_id := NULL;
    IF NEW.resolved_by IS NOT NULL THEN
      SELECT user_id INTO v_actor_user_id
        FROM public.alts WHERE id = NEW.resolved_by;
    END IF;

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
        'resolution_notes', NEW.resolution_notes
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- judge.game_reset — game reset back to pending
  -- -----------------------------------------------------------------
  IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
    -- Use auth.uid() to identify the judge who performed the reset
    v_actor_user_id := (SELECT auth.uid());
    v_submitter_alt_id := NULL;
    IF v_actor_user_id IS NOT NULL THEN
      SELECT id INTO v_submitter_alt_id
        FROM public.alts WHERE user_id = v_actor_user_id LIMIT 1;
    END IF;

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
        'previous_winner_alt_id', OLD.winner_alt_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_match_game_events_trigger
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_match_game_events();


-- =============================================================================
-- 2. Replace tournament_matches audit trigger
-- =============================================================================
-- Enhance to also track the actor, staff resolution, and match resets.

DROP TRIGGER IF EXISTS audit_staff_request_trigger ON public.tournament_matches;
DROP FUNCTION IF EXISTS public.audit_staff_request();

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
    SELECT id INTO v_actor_alt_id
      FROM public.alts WHERE user_id = v_actor_user_id LIMIT 1;
  END IF;

  -- -----------------------------------------------------------------
  -- match.staff_requested — judge called
  -- -----------------------------------------------------------------
  IF NEW.staff_requested = true
     AND (OLD.staff_requested IS NULL OR OLD.staff_requested = false) THEN
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
        'alt2_id', NEW.alt2_id
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- match.staff_resolved — judge request cleared
  -- -----------------------------------------------------------------
  IF NEW.staff_requested = false AND OLD.staff_requested = true THEN
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
        'table_number', NEW.table_number
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- judge.match_reset — match scores zeroed from non-zero
  -- -----------------------------------------------------------------
  IF NEW.game_wins1 = 0 AND NEW.game_wins2 = 0
     AND (OLD.game_wins1 > 0 OR OLD.game_wins2 > 0) THEN
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
        'previous_score', format('%s-%s', OLD.game_wins1, OLD.game_wins2)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_match_events_trigger
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_match_events();
