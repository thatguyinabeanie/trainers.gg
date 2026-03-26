-- Migration: player_ratings_elo
-- Creates the player_ratings table and ELO computation infrastructure.
-- ELO is computed from completed internal tournament matches only.
-- 'format' uses the tournament's format string (e.g. 'VGC'), or 'overall'
-- for the cross-format aggregate rating.

-- ─────────────────────────────────────────────
-- 1. player_ratings table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_ratings (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alt_id        bigint        NOT NULL REFERENCES public.alts(id) ON DELETE CASCADE,
  -- 'overall' = cross-format aggregate; otherwise the tournament's format string
  format        text          NOT NULL DEFAULT 'overall',
  rating        numeric(8, 2) NOT NULL DEFAULT 1200,
  peak_rating   numeric(8, 2) NOT NULL DEFAULT 1200,
  games_played  integer       NOT NULL DEFAULT 0,
  -- beginner < 1200 ≤ intermediate < 1500 ≤ advanced < 1800 ≤ expert
  skill_bracket text          NOT NULL DEFAULT 'beginner',
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (alt_id, format),
  CONSTRAINT valid_skill_bracket CHECK (
    skill_bracket IN ('beginner', 'intermediate', 'advanced', 'expert')
  )
);

ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

-- Public read: leaderboards and profile pages need this
CREATE POLICY "player_ratings_select"
  ON public.player_ratings FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service-role functions write to this table — no direct user mutations.

CREATE INDEX IF NOT EXISTS idx_player_ratings_alt_id ON public.player_ratings (alt_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_format ON public.player_ratings (format);
CREATE INDEX IF NOT EXISTS idx_player_ratings_rating ON public.player_ratings (rating DESC);

-- ─────────────────────────────────────────────
-- 2. Helper: derive skill bracket from rating
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.skill_bracket_for_rating(p_rating numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_rating >= 1800 THEN 'expert'
    WHEN p_rating >= 1500 THEN 'advanced'
    WHEN p_rating >= 1200 THEN 'intermediate'
    ELSE 'beginner'
  END;
$$;

-- ─────────────────────────────────────────────
-- 3. ELO computation helper
--    Updates both a specific format's rating and the 'overall' aggregate.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_elo_result(
  p_alt_id      bigint,
  p_format      text,
  p_score       numeric,   -- 1.0 = win, 0.0 = loss
  p_opponent_rating numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_rating      numeric;
  v_games       integer;
  v_k           numeric;
  v_expected    numeric;
  v_new_rating  numeric;
BEGIN
  SELECT rating, games_played INTO v_rating, v_games
  FROM public.player_ratings
  WHERE alt_id = p_alt_id AND format = p_format;

  v_k        := CASE WHEN v_games < 5 THEN 32 ELSE 16 END;
  v_expected := 1.0 / (1.0 + power(10.0, (p_opponent_rating - v_rating) / 400.0));
  v_new_rating := GREATEST(100, v_rating + v_k * (p_score - v_expected));

  UPDATE public.player_ratings
  SET
    rating        = v_new_rating,
    peak_rating   = GREATEST(peak_rating, v_new_rating),
    games_played  = games_played + 1,
    skill_bracket = public.skill_bracket_for_rating(v_new_rating),
    updated_at    = now()
  WHERE alt_id = p_alt_id AND format = p_format;
END;
$$;

-- ─────────────────────────────────────────────
-- 4. Core ELO computation function
--    Called after a tournament completes.
--    Processes all completed (non-bye) matches in round order.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_tournament_elo(p_tournament_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_format      text;
  v_match       record;
  v_rating1     numeric;
  v_rating2     numeric;
BEGIN
  SELECT coalesce(format, 'overall') INTO v_format
  FROM public.tournaments
  WHERE id = p_tournament_id;

  -- Seed baseline ratings for all checked-in participants who don't have one yet
  INSERT INTO public.player_ratings (alt_id, format, rating, peak_rating, games_played, skill_bracket)
  SELECT DISTINCT alt_id, v_format, 1200, 1200, 0, 'beginner'
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id AND status = 'checked_in'
  ON CONFLICT (alt_id, format) DO NOTHING;

  -- Seed overall ratings for same participants
  INSERT INTO public.player_ratings (alt_id, format, rating, peak_rating, games_played, skill_bracket)
  SELECT DISTINCT alt_id, 'overall', 1200, 1200, 0, 'beginner'
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id AND status = 'checked_in'
  ON CONFLICT (alt_id, format) DO NOTHING;

  -- Process matches in round order to preserve ELO sequence
  FOR v_match IN
    SELECT
      tm.alt1_id,
      tm.alt2_id,
      tm.winner_alt_id
    FROM public.tournament_matches   tm
    JOIN public.tournament_rounds    tr ON tr.id = tm.round_id
    JOIN public.tournament_phases    tp ON tp.id = tr.phase_id
    WHERE tp.tournament_id  = p_tournament_id
      AND tm.status         = 'completed'
      AND tm.is_bye         IS NOT TRUE
      AND tm.alt1_id        IS NOT NULL
      AND tm.alt2_id        IS NOT NULL
      AND tm.winner_alt_id  IS NOT NULL
    ORDER BY tr.round_number ASC, tm.id ASC
  LOOP
    -- Snapshot ratings before applying changes to avoid order dependency within round
    SELECT rating INTO v_rating1 FROM public.player_ratings
    WHERE alt_id = v_match.alt1_id AND format = v_format;

    SELECT rating INTO v_rating2 FROM public.player_ratings
    WHERE alt_id = v_match.alt2_id AND format = v_format;

    -- Apply format-specific ELO
    PERFORM public.apply_elo_result(
      v_match.alt1_id, v_format,
      CASE WHEN v_match.winner_alt_id = v_match.alt1_id THEN 1.0 ELSE 0.0 END,
      v_rating2
    );
    PERFORM public.apply_elo_result(
      v_match.alt2_id, v_format,
      CASE WHEN v_match.winner_alt_id = v_match.alt2_id THEN 1.0 ELSE 0.0 END,
      v_rating1
    );

    -- Apply overall ELO (only when format is not already 'overall' to avoid double-counting)
    IF v_format <> 'overall' THEN
      SELECT rating INTO v_rating1 FROM public.player_ratings
      WHERE alt_id = v_match.alt1_id AND format = 'overall';

      SELECT rating INTO v_rating2 FROM public.player_ratings
      WHERE alt_id = v_match.alt2_id AND format = 'overall';

      PERFORM public.apply_elo_result(
        v_match.alt1_id, 'overall',
        CASE WHEN v_match.winner_alt_id = v_match.alt1_id THEN 1.0 ELSE 0.0 END,
        v_rating2
      );
      PERFORM public.apply_elo_result(
        v_match.alt2_id, 'overall',
        CASE WHEN v_match.winner_alt_id = v_match.alt2_id THEN 1.0 ELSE 0.0 END,
        v_rating1
      );
    END IF;

  END LOOP;
END;
$$;

-- Restrict direct invocation: only service_role / postgres may call this function.
-- It is invoked internally by triggers and recalculate_tournament_elo — not by API roles.
REVOKE EXECUTE ON FUNCTION public.compute_tournament_elo(bigint) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────
-- 5. Trigger: fire ELO computation when a tournament completes
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_elo_on_tournament_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only fire when status transitions TO 'completed'
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM public.compute_tournament_elo(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elo_on_tournament_complete ON public.tournaments;

CREATE TRIGGER elo_on_tournament_complete
  AFTER UPDATE OF status ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_elo_on_tournament_complete();
