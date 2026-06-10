-- Fix: get_species_teammates focal_count denominator
--
-- BUG: focal_count used COUNT(*) over focal_teams, which contains DISTINCT
-- (source, event_key, division, player_key) tuples. A player who ran the focal
-- species across N tournaments contributed N rows, so COUNT(*) overcounted the
-- denominator relative to pair_count's COUNT(DISTINCT player_key), allowing
-- pair_pct to exceed 100% for multi-event players.
--
-- FIX: Change focal_count to COUNT(DISTINCT player_key) so both the numerator
-- (pair_count) and denominator (focal_players) count distinct players consistently.

DROP FUNCTION IF EXISTS public.get_species_teammates(text, text, text, date, date, int, int);

CREATE OR REPLACE FUNCTION public.get_species_teammates(
  p_format      text,
  p_species     text,
  p_source      text  DEFAULT 'all',
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0,
  p_top_n       int   DEFAULT 12   -- teammates returned; matrix uses min(p_top_n, 8)
)
RETURNS TABLE (
  focal_players bigint,   -- distinct players running the focal species (constant on every row; the pair-rate denominator)
  teammate      text,     -- teammate species slug
  pair_count    bigint,   -- distinct players running BOTH focal + teammate on the same team
  pair_pct      numeric,  -- round(100.0 * pair_count / focal_players, 2)
  teammate_rank int,      -- dense_rank by pair_count desc, teammate asc
  matrix        jsonb     -- top-N co-occurrence among teammates (see shape below); identical on every row
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.total_players
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Min-players floor: per-event (each event-division clears p_min_players
  -- individually), matching "ignore tournaments under X players" — see the note
  -- on the same CTE in get_species_move_combos above.
  qualifying_events AS (
    SELECT source, event_key, division
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    WHERE d.total_players >= p_min_players
  ),
  -- All slots in qualifying events (the working set for both halves).
  qslots AS (
    SELECT s.source, s.event_key, s.division, s.player_key, s.species
    FROM slots s
    INNER JOIN qualifying_events qe
      ON qe.source = s.source
     AND qe.event_key = s.event_key
     AND qe.division IS NOT DISTINCT FROM s.division
  ),
  -- Focal teams: distinct (source, event_key, player_key) tuples whose team
  -- contains the focal species. This is the shared CTE both halves reuse.
  focal_teams AS (
    SELECT DISTINCT source, event_key, division, player_key
    FROM qslots
    WHERE species = p_species
  ),
  focal_count AS (
    -- COUNT(DISTINCT player_key): a player who ran the focal species across
    -- multiple tournaments appears once per tournament in focal_teams, but should
    -- count as one player in the denominator — matching pair_count's semantics.
    SELECT COUNT(DISTINCT player_key) AS focal_players FROM focal_teams
  ),
  -- Teammate slots: the OTHER species on those same focal teams.
  -- DISTINCT player_key (not slot count) so a doubled species can't double-count.
  teammate_slots AS (
    SELECT q.player_key, q.species
    FROM qslots q
    INNER JOIN focal_teams ft
      ON ft.source = q.source
     AND ft.event_key = q.event_key
     AND ft.division IS NOT DISTINCT FROM q.division
     AND ft.player_key = q.player_key
    WHERE q.species <> p_species
  ),
  teammate_counts AS (
    SELECT species AS teammate,
           COUNT(DISTINCT player_key) AS pair_count
    FROM teammate_slots
    GROUP BY species
  ),
  teammate_ranked AS (
    SELECT teammate, pair_count,
           dense_rank() OVER (ORDER BY pair_count DESC, teammate ASC)::int AS teammate_rank
    FROM teammate_counts
  ),
  top_teammates AS (
    SELECT teammate, pair_count, teammate_rank
    FROM teammate_ranked
    ORDER BY pair_count DESC, teammate ASC
    LIMIT p_top_n
  ),
  -- Matrix scope: the top min(p_top_n, 8) teammates.
  matrix_members AS (
    SELECT teammate
    FROM teammate_ranked
    ORDER BY pair_count DESC, teammate ASC
    LIMIT LEAST(p_top_n, 8)
  ),
  -- Co-occurrence among matrix members on focal teams: for each unordered pair
  -- (a < b), count distinct players whose focal team runs BOTH a and b.
  -- Self-join teammate_slots on player tuple is implicit via player_key here
  -- (teammate_slots already restricted to focal teams), but we re-derive the
  -- per-team membership to pair them. Use a per-(team, member) presence set.
  member_presence AS (
    SELECT DISTINCT ts.source, ts.event_key, ts.division, ts.player_key, ts.species AS member
    FROM qslots ts
    INNER JOIN focal_teams ft
      ON ft.source = ts.source
     AND ft.event_key = ts.event_key
     AND ft.division IS NOT DISTINCT FROM ts.division
     AND ft.player_key = ts.player_key
    INNER JOIN matrix_members mm ON mm.teammate = ts.species
  ),
  pair_cells AS (
    SELECT a.member AS member_a, b.member AS member_b,
           -- member_presence is already DISTINCT on (source,event_key,division,
           -- player_key,member) and the self-join matches all four identity keys,
           -- so each joined pair row is one player per pair — COUNT(*) suffices
           -- (avoids a row-constructor COUNT DISTINCT with a nullable division).
           COUNT(*) AS cnt
    FROM member_presence a
    INNER JOIN member_presence b
      ON a.source = b.source
     AND a.event_key = b.event_key
     AND a.division IS NOT DISTINCT FROM b.division
     AND a.player_key = b.player_key
     AND a.member < b.member          -- unordered pairs, no self-pairs
    GROUP BY a.member, b.member
  ),
  matrix_json AS (
    SELECT jsonb_build_object(
      -- ordered member list (top → down) so the client lays out the grid
      -- deterministically without re-sorting.
      'order',
        COALESCE(
          (SELECT jsonb_agg(teammate ORDER BY pair_count DESC, teammate ASC)
           FROM teammate_ranked tr
           WHERE tr.teammate IN (SELECT teammate FROM matrix_members)),
          '[]'::jsonb),
      -- cells keyed "a||b" (a < b), each { count, pct } where pct is over focal_players.
      'cells',
        COALESCE(
          (SELECT jsonb_object_agg(
             pc.member_a || '||' || pc.member_b,
             jsonb_build_object(
               'count', pc.cnt,
               'pct', CASE WHEN fc.focal_players > 0
                        THEN round(100.0 * pc.cnt / fc.focal_players, 2) ELSE 0 END))
           FROM pair_cells pc CROSS JOIN focal_count fc),
          '{}'::jsonb)
    ) AS matrix
  )
  SELECT
    fc.focal_players,
    tt.teammate,
    tt.pair_count,
    CASE WHEN fc.focal_players > 0
      THEN round(100.0 * tt.pair_count / fc.focal_players, 2) ELSE 0 END AS pair_pct,
    tt.teammate_rank,
    mj.matrix
  FROM top_teammates tt
  CROSS JOIN focal_count fc
  CROSS JOIN matrix_json mj
  ORDER BY tt.pair_count DESC, tt.teammate ASC
$$;

COMMENT ON FUNCTION public.get_species_teammates(text, text, text, date, date, int, int) IS
  'Teammate pair rates + a top-N co-occurrence matrix for one species, both scoped to teams that include the focal species. focal_players = distinct players running the focal species (the pair-rate denominator). teammate rows: distinct players running both focal + teammate. matrix jsonb: { order: text[], cells: { "a||b": { count, pct } } } over the top min(p_top_n,8) teammates, duplicated on every row (cheap). Powers the teammate constellation + core heatmap.';

GRANT EXECUTE ON FUNCTION public.get_species_teammates(text, text, text, date, date, int, int)
  TO anon, authenticated;
