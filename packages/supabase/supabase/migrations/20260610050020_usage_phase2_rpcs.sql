-- Phase 2 usage RPCs for the /data Meta Explorer:
--   get_usage_by_source   — per-species usage % broken out by source (source dumbbells)
--   get_usage_conversion  — per-species overall usage vs. top-N% placement conversion
-- Both follow Phase 1 conventions: sql STABLE SECURITY INVOKER, empty search_path,
-- anon+authenticated execute grants, distinct-(source,event_key,division) denominators.

DROP FUNCTION IF EXISTS public.get_usage_by_source(text, date, date, int);

CREATE OR REPLACE FUNCTION public.get_usage_by_source(
  p_format      text,
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0
)
RETURNS TABLE (
  species    text,
  source     text,
  players    bigint,
  usage_pct  numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.total_players, ts.event_date
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  source_denoms AS (
    SELECT s.source, SUM(s.total_players) AS source_total
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) s
    GROUP BY s.source
    HAVING SUM(s.total_players) >= p_min_players
  ),
  species_counts AS (
    SELECT s.source, s.species, COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    INNER JOIN source_denoms d ON d.source = s.source
    GROUP BY s.source, s.species
  )
  SELECT
    sc.species,
    sc.source,
    sc.player_count AS players,
    CASE WHEN d.source_total > 0
      THEN round(100.0 * sc.player_count / d.source_total, 2) ELSE 0 END AS usage_pct
  FROM species_counts sc
  INNER JOIN source_denoms d ON d.source = sc.source
  ORDER BY sc.species ASC, sc.source ASC
$$;

COMMENT ON FUNCTION public.get_usage_by_source(text, date, date, int) IS
  'Per-species usage % broken out by source (rk9/limitless/trainers.gg). Denominator is computed per source over distinct (event_key, division). Powers the source-comparison dumbbell chart.';

GRANT EXECUTE ON FUNCTION public.get_usage_by_source(text, date, date, int) TO anon, authenticated;


DROP FUNCTION IF EXISTS public.get_usage_conversion(text, text, date, date, int, numeric);

CREATE OR REPLACE FUNCTION public.get_usage_conversion(
  p_format         text,
  p_source         text    DEFAULT 'all',
  p_start          date    DEFAULT NULL,
  p_end            date    DEFAULT NULL,
  p_min_players    int     DEFAULT 0,
  p_top_percentile numeric DEFAULT 0.10
)
RETURNS TABLE (
  species         text,
  players         bigint,
  usage_pct       numeric,
  top_players     bigint,
  top_field       bigint,
  top_share_pct   numeric,
  conversion_pct  numeric,
  ranked_players  bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.placement, ts.total_players, ts.event_date
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  denom AS (
    SELECT SUM(d.total_players) AS total
    FROM (SELECT DISTINCT source, event_key, division, total_players FROM slots) d
    HAVING SUM(d.total_players) >= p_min_players
  ),
  usage_counts AS (
    SELECT s.species, COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s CROSS JOIN denom
    GROUP BY s.species
  ),
  placement_players AS (
    SELECT DISTINCT source, event_key, division, player_key, placement
    FROM slots
    WHERE placement IS NOT NULL
  ),
  ranked AS (
    SELECT
      source, event_key, division, player_key,
      percent_rank() OVER (
        PARTITION BY source, event_key, division
        ORDER BY placement ASC
      ) AS pr
    FROM placement_players
  ),
  species_ranked AS (
    SELECT s.species,
           COUNT(DISTINCT s.player_key) AS ranked_players,
           COUNT(DISTINCT s.player_key) FILTER (WHERE r.pr <= p_top_percentile)
             AS top_players
    FROM slots s
    INNER JOIN ranked r
      ON r.source = s.source AND r.event_key = s.event_key
     AND r.division IS NOT DISTINCT FROM s.division
     AND r.player_key = s.player_key
    GROUP BY s.species
  ),
  top_field_total AS (
    -- COUNT(DISTINCT player_key), not COUNT(*): a player who placed in the top
    -- N% across multiple events must count once, matching top_players above
    -- (which also uses COUNT(DISTINCT player_key)). COUNT(*) would overcount the
    -- denominator and deflate top_share_pct for any multi-event format.
    SELECT COUNT(DISTINCT player_key) FILTER (WHERE pr <= p_top_percentile) AS top_field
    FROM ranked
  )
  SELECT
    uc.species,
    uc.player_count AS players,
    CASE WHEN d.total > 0
      THEN round(100.0 * uc.player_count / d.total, 2) ELSE 0 END AS usage_pct,
    COALESCE(sr.top_players, 0)::bigint AS top_players,
    tf.top_field::bigint AS top_field,
    CASE WHEN tf.top_field > 0
      THEN round(100.0 * COALESCE(sr.top_players, 0) / tf.top_field, 2)
      ELSE 0 END AS top_share_pct,
    CASE WHEN sr.ranked_players IS NULL OR sr.ranked_players = 0
      THEN NULL
      ELSE round(100.0 * sr.top_players / sr.ranked_players, 2) END AS conversion_pct,
    COALESCE(sr.ranked_players, 0)::bigint AS ranked_players
  FROM usage_counts uc
  CROSS JOIN denom d
  CROSS JOIN top_field_total tf
  LEFT JOIN species_ranked sr ON sr.species = uc.species
  ORDER BY usage_pct DESC, uc.species ASC
$$;

COMMENT ON FUNCTION public.get_usage_conversion(text, text, date, date, int, numeric) IS
  'Per-species overall usage vs. top-N% placement conversion for one slice. p_top_percentile in [0,1] (default 0.10 = "Top 10%"). NULL-placement rows count toward usage only. conversion_pct is NULL when a species has no placement-bearing events. Powers the usage-vs-conversion scatter and overall-vs-Top-10% dumbbell.';

GRANT EXECUTE ON FUNCTION public.get_usage_conversion(text, text, date, date, int, numeric) TO anon, authenticated;
