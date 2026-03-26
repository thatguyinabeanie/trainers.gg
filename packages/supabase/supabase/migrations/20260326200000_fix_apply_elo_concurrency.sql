-- Migration: fix_apply_elo_concurrency
--
-- apply_elo_result reads then writes player_ratings without holding a row lock.
-- Two concurrent completions for the same player (e.g. two matches submitted in
-- the same millisecond) could both read the pre-update rating, compute different
-- new values, and one UPDATE would silently overwrite the other (lost update).
--
-- Fix: add FOR UPDATE to the SELECT so the row is locked for the duration of
-- the caller's transaction, serialising concurrent ELO updates per player.

CREATE OR REPLACE FUNCTION public.apply_elo_result(
  p_alt_id          bigint,
  p_format          text,
  p_score           numeric,   -- 1.0 = win, 0.0 = loss
  p_opponent_rating numeric
)
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_rating      numeric;
  v_games       integer;
  v_k           numeric;
  v_expected    numeric;
  v_new_rating  numeric;
BEGIN
  -- Lock the row so concurrent transactions serialize on the same player/format
  SELECT rating, games_played INTO v_rating, v_games
  FROM public.player_ratings
  WHERE alt_id = p_alt_id AND format = p_format
  FOR UPDATE;

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
