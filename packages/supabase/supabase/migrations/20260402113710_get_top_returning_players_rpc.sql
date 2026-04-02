-- RPC: get_top_returning_players
-- Returns the top N players by number of unique tournaments participated in
-- for a given community. Pushes GROUP BY / COUNT(DISTINCT) / ORDER BY / LIMIT
-- to the database instead of fetching all registrations into the app.

CREATE OR REPLACE FUNCTION get_top_returning_players(
  p_community_id bigint,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  event_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    a.user_id,
    a.username,
    a.avatar_url,
    COUNT(DISTINCT tr.tournament_id) AS event_count
  FROM tournament_registrations tr
  JOIN tournaments t ON t.id = tr.tournament_id
  JOIN alts a ON a.id = tr.alt_id
  WHERE t.community_id = p_community_id
    AND t.archived_at IS NULL
  GROUP BY a.user_id, a.username, a.avatar_url
  ORDER BY event_count DESC
  LIMIT p_limit;
$$;
