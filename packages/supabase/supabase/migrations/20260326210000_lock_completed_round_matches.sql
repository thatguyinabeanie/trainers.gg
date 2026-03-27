-- Migration: lock_completed_round_matches
--
-- Once a round is completed AND a later round in the same phase has started
-- (status != 'pending'), match results in that round are immutable.
--
-- This prevents result corrections from affecting players who have already
-- been paired using those results in subsequent rounds, and eliminates the
-- recalculate_tournament_elo limitation where corrections to early rounds
-- would clobber ratings earned in later tournaments.
--
-- Correction window: a TO may still fix a result after the round completes,
-- as long as the next round has NOT yet been started.

CREATE OR REPLACE FUNCTION public.prevent_locked_round_result_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_round_status text;
  v_round_number int;
  v_phase_id     bigint;
BEGIN
  -- Only enforce when winner_alt_id is changing
  IF OLD.winner_alt_id IS NOT DISTINCT FROM NEW.winner_alt_id THEN
    RETURN NEW;
  END IF;

  -- Fetch the round's current status, number, and phase
  SELECT tr.status, tr.round_number, tr.phase_id
  INTO v_round_status, v_round_number, v_phase_id
  FROM public.tournament_rounds tr
  WHERE tr.id = NEW.round_id;

  -- Only enforce the lock on completed rounds
  IF v_round_status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Check whether any later round in this phase has already started
  IF EXISTS (
    SELECT 1
    FROM public.tournament_rounds tr
    WHERE tr.phase_id   = v_phase_id
      AND tr.round_number > v_round_number
      AND tr.status      != 'pending'
  ) THEN
    RAISE EXCEPTION
      'Cannot update match result: round % is locked because a later round has already started. '
      'Result corrections are only allowed before the next round begins.',
      v_round_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_completed_round_matches ON public.tournament_matches;

CREATE TRIGGER lock_completed_round_matches
  BEFORE UPDATE OF winner_alt_id ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_locked_round_result_change();
