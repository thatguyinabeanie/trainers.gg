-- Migration: elo_per_match
-- Changes ELO computation from tournament-completion (batch) to
-- per-match (real-time): ratings update the moment a match result is recorded.
--
-- Also adds elo_applied to tournament_matches to guard against double-counting
-- if a match's status is ever toggled or a result is corrected.

-- ─────────────────────────────────────────────
-- 1. Track whether ELO has been applied for each match
-- ─────────────────────────────────────────────
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS elo_applied boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────
-- 2. Drop the old tournament-completion trigger (no longer needed)
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS elo_on_tournament_complete ON public.tournaments;

-- ─────────────────────────────────────────────
-- 3. Per-match ELO trigger function
--    Fires when a match transitions to 'completed'.
--    Seeds player ratings on their first match, then applies ELO for both sides.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_elo_on_match_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_format    text;
  v_rating1   numeric;
  v_rating2   numeric;
BEGIN
  -- Only process: newly completed, non-bye matches with both players and a winner
  IF NEW.status <> 'completed'
     OR NEW.is_bye
     OR NEW.alt1_id IS NULL
     OR NEW.alt2_id IS NULL
     OR NEW.winner_alt_id IS NULL
     OR OLD.elo_applied  -- guard: skip if already processed
  THEN
    RETURN NEW;
  END IF;

  -- Resolve the tournament format via phase → tournament chain
  SELECT coalesce(t.format, 'overall')
  INTO v_format
  FROM public.tournament_phases  tp
  JOIN public.tournaments         t  ON t.id = tp.tournament_id
  JOIN public.tournament_rounds   tr ON tr.phase_id = tp.id
  WHERE tr.id = NEW.round_id;

  -- Seed format-specific ratings for both players if they don't exist yet
  INSERT INTO public.player_ratings (alt_id, format, rating, peak_rating, games_played, skill_bracket)
  VALUES
    (NEW.alt1_id, v_format, 1200, 1200, 0, 'beginner'),
    (NEW.alt2_id, v_format, 1200, 1200, 0, 'beginner')
  ON CONFLICT (alt_id, format) DO NOTHING;

  -- Seed overall ratings for both players if they don't exist yet
  INSERT INTO public.player_ratings (alt_id, format, rating, peak_rating, games_played, skill_bracket)
  VALUES
    (NEW.alt1_id, 'overall', 1200, 1200, 0, 'beginner'),
    (NEW.alt2_id, 'overall', 1200, 1200, 0, 'beginner')
  ON CONFLICT (alt_id, format) DO NOTHING;

  -- Snapshot both ratings before applying changes (preserves fairness within a round)
  SELECT rating INTO v_rating1 FROM public.player_ratings
  WHERE alt_id = NEW.alt1_id AND format = v_format;

  SELECT rating INTO v_rating2 FROM public.player_ratings
  WHERE alt_id = NEW.alt2_id AND format = v_format;

  -- Apply format-specific ELO
  PERFORM public.apply_elo_result(
    NEW.alt1_id, v_format,
    CASE WHEN NEW.winner_alt_id = NEW.alt1_id THEN 1.0 ELSE 0.0 END,
    v_rating2
  );
  PERFORM public.apply_elo_result(
    NEW.alt2_id, v_format,
    CASE WHEN NEW.winner_alt_id = NEW.alt2_id THEN 1.0 ELSE 0.0 END,
    v_rating1
  );

  -- Apply overall ELO (skip if format is already 'overall' to avoid double-counting)
  IF v_format <> 'overall' THEN
    SELECT rating INTO v_rating1 FROM public.player_ratings
    WHERE alt_id = NEW.alt1_id AND format = 'overall';

    SELECT rating INTO v_rating2 FROM public.player_ratings
    WHERE alt_id = NEW.alt2_id AND format = 'overall';

    PERFORM public.apply_elo_result(
      NEW.alt1_id, 'overall',
      CASE WHEN NEW.winner_alt_id = NEW.alt1_id THEN 1.0 ELSE 0.0 END,
      v_rating2
    );
    PERFORM public.apply_elo_result(
      NEW.alt2_id, 'overall',
      CASE WHEN NEW.winner_alt_id = NEW.alt2_id THEN 1.0 ELSE 0.0 END,
      v_rating1
    );
  END IF;

  -- Mark this match as processed so corrections don't double-apply
  NEW.elo_applied := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elo_on_match_complete ON public.tournament_matches;

CREATE TRIGGER elo_on_match_complete
  BEFORE UPDATE OF status ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_elo_on_match_complete();
