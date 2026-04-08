-- Migration: Add RPC function for fetching player ratings with global rank
-- Replaces N+1 count queries in getPlayerRatingsBulk with a single SQL call.
-- Uses a correlated subquery for rank computation (count of players with
-- strictly higher rating + 1).

CREATE OR REPLACE FUNCTION public.get_player_ratings_with_rank(
  p_alt_ids bigint[],
  p_format text DEFAULT 'overall'
)
RETURNS TABLE (
  alt_id bigint,
  format text,
  rating numeric,
  peak_rating numeric,
  games_played integer,
  skill_bracket text,
  global_rank bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pr.alt_id,
    pr.format,
    pr.rating,
    pr.peak_rating,
    pr.games_played,
    pr.skill_bracket,
    (
      SELECT COUNT(*) + 1
      FROM player_ratings pr2
      WHERE pr2.format = p_format
        AND pr2.games_played > 0
        AND pr2.rating > pr.rating
    ) AS global_rank
  FROM player_ratings pr
  WHERE pr.alt_id = ANY(p_alt_ids)
    AND pr.format = p_format;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_ratings_with_rank(bigint[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_ratings_with_rank(bigint[], text) TO anon;

COMMENT ON FUNCTION public.get_player_ratings_with_rank(bigint[], text) IS
  'Returns player ratings with global rank for multiple alts in a single query. Rank = count of players with strictly higher rating + 1.';
