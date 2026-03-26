-- Migration: elo_auto_recalculate_on_correction
-- When a TO corrects a match result (winner_alt_id changes on a completed,
-- already-scored match), ELO automatically recalculates for the whole
-- tournament — no manual intervention required.

CREATE OR REPLACE FUNCTION public.trigger_elo_on_result_correction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament_id bigint;
BEGIN
  -- Only fire when the winner actually changed on an already-scored match
  IF OLD.winner_alt_id IS NOT DISTINCT FROM NEW.winner_alt_id
     OR NOT OLD.elo_applied
  THEN
    RETURN NEW;
  END IF;

  SELECT tp.tournament_id INTO v_tournament_id
  FROM public.tournament_rounds tr
  JOIN public.tournament_phases tp ON tp.id = tr.phase_id
  WHERE tr.id = NEW.round_id;

  PERFORM public.recalculate_tournament_elo(v_tournament_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elo_on_result_correction ON public.tournament_matches;

-- AFTER UPDATE so the corrected winner_alt_id is committed before recalculation reads it
CREATE TRIGGER elo_on_result_correction
  AFTER UPDATE OF winner_alt_id ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_elo_on_result_correction();
