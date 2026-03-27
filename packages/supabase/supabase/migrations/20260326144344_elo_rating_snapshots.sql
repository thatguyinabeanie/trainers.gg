-- Migration: elo_rating_snapshots
-- Stores each player's rating and games_played immediately before a match is
-- scored. This makes result corrections fully reversible: restore from snapshot,
-- reset elo_applied, replay matches in order.
--
-- Also adds recalculate_tournament_elo() for admin use after corrections.

-- ─────────────────────────────────────────────
-- 1. Add pre-match rating snapshots to tournament_matches
--    NULL = match not yet completed (no snapshot taken yet)
-- ─────────────────────────────────────────────
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS alt1_rating_before         numeric(8, 2),
  ADD COLUMN IF NOT EXISTS alt2_rating_before         numeric(8, 2),
  ADD COLUMN IF NOT EXISTS alt1_overall_rating_before numeric(8, 2),
  ADD COLUMN IF NOT EXISTS alt2_overall_rating_before numeric(8, 2),
  ADD COLUMN IF NOT EXISTS alt1_games_before          integer,
  ADD COLUMN IF NOT EXISTS alt2_games_before          integer,
  ADD COLUMN IF NOT EXISTS alt1_overall_games_before  integer,
  ADD COLUMN IF NOT EXISTS alt2_overall_games_before  integer;

-- ─────────────────────────────────────────────
-- 2. Update the per-match ELO trigger to capture snapshots before applying
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
  v_games1    integer;
  v_games2    integer;
  v_overall1  numeric;
  v_overall2  numeric;
  v_ogames1   integer;
  v_ogames2   integer;
BEGIN
  -- Only process: newly completed, non-bye matches with both players and a winner
  IF NEW.status <> 'completed'
     OR NEW.is_bye
     OR NEW.alt1_id IS NULL
     OR NEW.alt2_id IS NULL
     OR NEW.winner_alt_id IS NULL
     OR OLD.elo_applied
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

  -- Snapshot format-specific ratings and games_played before applying ELO
  SELECT rating, games_played INTO v_rating1, v_games1
  FROM public.player_ratings WHERE alt_id = NEW.alt1_id AND format = v_format;

  SELECT rating, games_played INTO v_rating2, v_games2
  FROM public.player_ratings WHERE alt_id = NEW.alt2_id AND format = v_format;

  -- Snapshot overall ratings and games_played
  SELECT rating, games_played INTO v_overall1, v_ogames1
  FROM public.player_ratings WHERE alt_id = NEW.alt1_id AND format = 'overall';

  SELECT rating, games_played INTO v_overall2, v_ogames2
  FROM public.player_ratings WHERE alt_id = NEW.alt2_id AND format = 'overall';

  -- Persist snapshots on the match row
  NEW.alt1_rating_before         := v_rating1;
  NEW.alt2_rating_before         := v_rating2;
  NEW.alt1_overall_rating_before := v_overall1;
  NEW.alt2_overall_rating_before := v_overall2;
  NEW.alt1_games_before          := v_games1;
  NEW.alt2_games_before          := v_games2;
  NEW.alt1_overall_games_before  := v_ogames1;
  NEW.alt2_overall_games_before  := v_ogames2;

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
    PERFORM public.apply_elo_result(
      NEW.alt1_id, 'overall',
      CASE WHEN NEW.winner_alt_id = NEW.alt1_id THEN 1.0 ELSE 0.0 END,
      v_overall2
    );
    PERFORM public.apply_elo_result(
      NEW.alt2_id, 'overall',
      CASE WHEN NEW.winner_alt_id = NEW.alt2_id THEN 1.0 ELSE 0.0 END,
      v_overall1
    );
  END IF;

  NEW.elo_applied := true;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- 3. Admin recalculation function
--    Use after correcting a match result in a tournament.
--    Restores all affected players to their pre-tournament state using
--    stored snapshots, then replays all matches in round order.
--
--    The UPDATE SET elo_applied does NOT fire the status trigger, so replay
--    is safe to do directly without recursion risk.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_tournament_elo(p_tournament_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_format  text;
  v_match   record;
  v_r1      numeric;
  v_r2      numeric;
BEGIN
  SELECT coalesce(format, 'overall') INTO v_format
  FROM public.tournaments WHERE id = p_tournament_id;

  -- Step 1: Restore each player's rating to their pre-tournament snapshot.
  -- We use the earliest completed match in the tournament for each player
  -- to find their entry state (rating + games_played).
  WITH first_match AS (
    SELECT DISTINCT ON (alt_id)
      alt_id,
      format_rating,
      format_games,
      overall_rating,
      overall_games
    FROM (
      SELECT
        tm.alt1_id          AS alt_id,
        tm.alt1_rating_before         AS format_rating,
        tm.alt1_games_before          AS format_games,
        tm.alt1_overall_rating_before AS overall_rating,
        tm.alt1_overall_games_before  AS overall_games,
        tr.round_number,
        tm.id
      FROM public.tournament_matches tm
      JOIN public.tournament_rounds  tr ON tr.id = tm.round_id
      JOIN public.tournament_phases  tp ON tp.id = tr.phase_id
      WHERE tp.tournament_id = p_tournament_id
        AND tm.alt1_rating_before IS NOT NULL
      UNION ALL
      SELECT
        tm.alt2_id,
        tm.alt2_rating_before,
        tm.alt2_games_before,
        tm.alt2_overall_rating_before,
        tm.alt2_overall_games_before,
        tr.round_number,
        tm.id
      FROM public.tournament_matches tm
      JOIN public.tournament_rounds  tr ON tr.id = tm.round_id
      JOIN public.tournament_phases  tp ON tp.id = tr.phase_id
      WHERE tp.tournament_id = p_tournament_id
        AND tm.alt2_rating_before IS NOT NULL
    ) sub
    ORDER BY alt_id, round_number ASC, id ASC
  )
  -- Note: peak_rating is intentionally not restored. It is a monotonic high-water
  -- mark (peak_rating >= rating always holds) and must never decrease — even after
  -- a result correction. Only rating/games_played/skill_bracket are rewound.
  UPDATE public.player_ratings pr
  SET
    rating        = fm.format_rating,
    games_played  = fm.format_games,
    skill_bracket = public.skill_bracket_for_rating(fm.format_rating),
    updated_at    = now()
  FROM first_match fm
  WHERE pr.alt_id = fm.alt_id
    AND pr.format = v_format
    AND fm.format_rating IS NOT NULL;

  -- Restore overall ratings separately
  -- Note: peak_rating is intentionally not restored here either (same monotonic invariant).
  WITH first_match AS (
    SELECT DISTINCT ON (alt_id)
      alt_id,
      overall_rating,
      overall_games
    FROM (
      SELECT tm.alt1_id AS alt_id, tm.alt1_overall_rating_before AS overall_rating,
             tm.alt1_overall_games_before AS overall_games, tr.round_number, tm.id
      FROM public.tournament_matches tm
      JOIN public.tournament_rounds  tr ON tr.id = tm.round_id
      JOIN public.tournament_phases  tp ON tp.id = tr.phase_id
      WHERE tp.tournament_id = p_tournament_id AND tm.alt1_overall_rating_before IS NOT NULL
      UNION ALL
      SELECT tm.alt2_id, tm.alt2_overall_rating_before, tm.alt2_overall_games_before,
             tr.round_number, tm.id
      FROM public.tournament_matches tm
      JOIN public.tournament_rounds  tr ON tr.id = tm.round_id
      JOIN public.tournament_phases  tp ON tp.id = tr.phase_id
      WHERE tp.tournament_id = p_tournament_id AND tm.alt2_overall_rating_before IS NOT NULL
    ) sub
    ORDER BY alt_id, round_number ASC, id ASC
  )
  UPDATE public.player_ratings pr
  SET
    rating        = fm.overall_rating,
    games_played  = fm.overall_games,
    skill_bracket = public.skill_bracket_for_rating(fm.overall_rating),
    updated_at    = now()
  FROM first_match fm
  WHERE pr.alt_id = fm.alt_id
    AND pr.format = 'overall'
    AND fm.overall_rating IS NOT NULL;

  -- Step 2: Clear elo_applied on all matches in this tournament.
  -- This UPDATE only touches elo_applied — NOT status — so the BEFORE UPDATE OF
  -- status trigger does not fire. Safe to do directly.
  UPDATE public.tournament_matches tm
  SET elo_applied = false
  FROM public.tournament_rounds  tr
  JOIN public.tournament_phases  tp ON tp.id = tr.phase_id
  WHERE tm.round_id = tr.id
    AND tp.tournament_id = p_tournament_id;

  -- Step 3: Replay all completed non-bye matches in round order.
  -- Apply ELO directly (not via the trigger) so we control the loop.
  FOR v_match IN
    SELECT
      tm.alt1_id,
      tm.alt2_id,
      tm.winner_alt_id,
      tm.id AS match_id
    FROM public.tournament_matches tm
    JOIN public.tournament_rounds  tr ON tr.id = tm.round_id
    JOIN public.tournament_phases  tp ON tp.id = tr.phase_id
    WHERE tp.tournament_id = p_tournament_id
      AND tm.status        = 'completed'
      AND (tm.is_bye IS NULL OR tm.is_bye = false)
      AND tm.alt1_id       IS NOT NULL
      AND tm.alt2_id       IS NOT NULL
      AND tm.winner_alt_id IS NOT NULL
    ORDER BY tr.round_number ASC, tm.id ASC
  LOOP
    -- Snapshot current (restored or previously replayed) ratings
    SELECT rating INTO v_r1 FROM public.player_ratings
    WHERE alt_id = v_match.alt1_id AND format = v_format;

    SELECT rating INTO v_r2 FROM public.player_ratings
    WHERE alt_id = v_match.alt2_id AND format = v_format;

    PERFORM public.apply_elo_result(
      v_match.alt1_id, v_format,
      CASE WHEN v_match.winner_alt_id = v_match.alt1_id THEN 1.0 ELSE 0.0 END,
      v_r2
    );
    PERFORM public.apply_elo_result(
      v_match.alt2_id, v_format,
      CASE WHEN v_match.winner_alt_id = v_match.alt2_id THEN 1.0 ELSE 0.0 END,
      v_r1
    );

    IF v_format <> 'overall' THEN
      SELECT rating INTO v_r1 FROM public.player_ratings
      WHERE alt_id = v_match.alt1_id AND format = 'overall';

      SELECT rating INTO v_r2 FROM public.player_ratings
      WHERE alt_id = v_match.alt2_id AND format = 'overall';

      PERFORM public.apply_elo_result(
        v_match.alt1_id, 'overall',
        CASE WHEN v_match.winner_alt_id = v_match.alt1_id THEN 1.0 ELSE 0.0 END,
        v_r2
      );
      PERFORM public.apply_elo_result(
        v_match.alt2_id, 'overall',
        CASE WHEN v_match.winner_alt_id = v_match.alt2_id THEN 1.0 ELSE 0.0 END,
        v_r1
      );
    END IF;

    -- Mark replayed — directly updating elo_applied does not fire the status trigger
    UPDATE public.tournament_matches SET elo_applied = true WHERE id = v_match.match_id;
  END LOOP;
END;
$$;

-- Restrict direct invocation: only service_role / postgres may call this function.
-- It is invoked internally by trigger_elo_on_result_correction — not by API roles.
REVOKE EXECUTE ON FUNCTION public.recalculate_tournament_elo(bigint) FROM PUBLIC, anon, authenticated;
