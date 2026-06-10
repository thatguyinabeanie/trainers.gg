-- =============================================================================
-- create_team_slots — slot-grain fact table + live SQL aggregation RPCs
--
-- WHY: Replacing the two-layer rollup architecture (event_usage → usage_dirty
-- → format_meta_stats worker) with a single denormalized fact table (team_slots,
-- one row per Pokemon slot per player per tournament) and four live SQL RPCs
-- that aggregate on demand. The rollup worker and its dependency tables
-- (event_usage, format_meta_stats, usage_dirty) are dropped in a follow-up
-- migration once callers are migrated. There is no first-party tournament data
-- yet; rk9/limitless data is fully re-importable, so no migration of existing
-- rows is needed.
-- =============================================================================


-- =============================================================================
-- team_slots — one row per slot per player per tournament
-- =============================================================================
-- PUBLIC DATA ONLY: this table must never contain player names, EVs, IVs,
-- gender, level, or any other PII.  Source: rk9, limitless, trainers.gg
-- public standing/registration records.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.team_slots (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- ── Event dimensions ────────────────────────────────────────────────────
  source        text NOT NULL,              -- 'rk9' | 'limitless' | 'trainers.gg'
  event_key     text NOT NULL,              -- source-qualified event id, e.g. 'rk9:TO027'
  format        text NOT NULL,             -- Showdown format id, e.g. 'gen9vgc2025regg'
  event_date    date NOT NULL,
  event_tier    text,                       -- rk9 only ('regional'|'international'|'special'|'worlds')
  is_online     boolean NOT NULL,
  total_players int  NOT NULL,             -- players WITH team sheets in this event(-division); usage % denominator

  -- ── Player dimensions (public tournament data ONLY) ───────────────────
  player_key    text NOT NULL,             -- source-qualified standing/registration id; groups one player's 6 slots
  division      text,                      -- rk9 only ('masters'|'senior'|'junior')
  placement     int,
  wins          int,
  losses        int,
  ties          int,
  country       text,                      -- ISO alpha-2

  -- ── Slot ─────────────────────────────────────────────────────────────
  position      int  NOT NULL CHECK (position BETWEEN 1 AND 6),
  species       text NOT NULL,             -- normalized slug, e.g. 'calyrex-ice-rider'
  held_item     text,
  ability       text,
  tera_type     text,
  moves         text[] NOT NULL DEFAULT '{}',
  nature        text,
  compiled_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.team_slots IS
  'One row per Pokemon slot per player per tournament. '
  'PUBLIC DATA ONLY — never contains PII (no player names, EVs, IVs, gender, level). '
  'Fact table for live SQL aggregation RPCs; replaces the event_usage → rollup pipeline.';

-- ── CHECK constraints (idempotent via DROP/ADD) ──────────────────────────────

ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_source_check;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_source_check
  CHECK (source IN ('rk9', 'limitless', 'trainers.gg'));

ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_division_check;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_division_check
  CHECK (division IS NULL OR division IN ('masters', 'senior', 'junior'));

ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_tier_check;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_tier_check
  CHECK (event_tier IS NULL OR event_tier IN ('regional', 'international', 'special', 'worlds'));

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Dedup guard: one slot per player per position per event.
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_slots_dedup
  ON public.team_slots (source, event_key, player_key, position);

-- Time-series queries: filter by format + scan event_date ranges.
CREATE INDEX IF NOT EXISTS idx_team_slots_format_date
  ON public.team_slots (format, event_date);

-- Species aggregations: COUNT(DISTINCT player_key) WHERE format + species.
CREATE INDEX IF NOT EXISTS idx_team_slots_format_species
  ON public.team_slots (format, species);

-- Source-filtered aggregations.
CREATE INDEX IF NOT EXISTS idx_team_slots_format_source
  ON public.team_slots (format, source);

-- GIN index for move histogram queries (unnest + count patterns).
CREATE INDEX IF NOT EXISTS idx_team_slots_moves
  ON public.team_slots USING gin (moves);

-- Event-level scans (e.g. get_format_events, importer dedup lookups).
CREATE INDEX IF NOT EXISTS idx_team_slots_source_event
  ON public.team_slots (source, event_key);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.team_slots ENABLE ROW LEVEL SECURITY;

-- Public read: usage stats contain no user-private data.
DROP POLICY IF EXISTS "team_slots_read" ON public.team_slots;
CREATE POLICY "team_slots_read"
  ON public.team_slots FOR SELECT
  USING (true);

-- Write-deny: defense-in-depth — the service-role client (importer) bypasses RLS,
-- so these policies only block authenticated user requests.  Matches the pattern
-- used by event_usage in migration 20260604225054_usage_stats_schema.sql.
DROP POLICY IF EXISTS "no_user_writes_team_slots" ON public.team_slots;
CREATE POLICY "no_user_writes_team_slots"
  ON public.team_slots FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_team_slots" ON public.team_slots;
CREATE POLICY "no_user_updates_team_slots"
  ON public.team_slots FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_team_slots" ON public.team_slots;
CREATE POLICY "no_user_deletes_team_slots"
  ON public.team_slots FOR DELETE TO authenticated
  USING (false);


-- =============================================================================
-- Shared aggregation notes (applies to all four RPCs below)
-- =============================================================================
--
-- Denominator logic (reproduces rollup.ts rollupBucket):
--   Each (source, event_key, division) tuple contributes total_players exactly
--   once, regardless of how many species/slot rows it has.  This prevents
--   double-counting when the 'all' source combines rows from multiple sources.
--
-- Source filter: p_source = 'all' passes all sources; otherwise exact match.
-- Min players: only buckets with at least p_min_players total players are used.
-- Period bucketing: date_trunc(p_period_type, event_date)::date.
--   Postgres date_trunc('week', ...) truncates to Monday (ISO 8601), matching
--   the TS bucketStart() function in rollup.ts.
-- Period end: bucket_start + (1 day/week/month) - 1 day (inclusive last day).
--
-- Histogram jsonb shape matches UsageDetailEntry in aggregate.ts:
--   [{"value": text, "count": int, "pct": numeric}, ...] ordered count DESC, value ASC.
--   Histogram pct denominator = distinct player_keys running that species in the slice.
--   NULL dimension values are excluded (e.g. null held_item rows skipped from items).
--
-- ability_items histogram: groups by ability || ' + ' || COALESCE(held_item, 'No Item')
--   (only when ability IS NOT NULL), matching the encoding in aggregate.ts:
--   `${ability} + ${heldItem ?? 'No Item'}`.
-- =============================================================================


-- =============================================================================
-- Helper macro: period_end from bucket start + period type
-- =============================================================================
-- Used inline in each RPC via CASE expression (no separate function needed).
-- day:   same date
-- week:  start + 6 days (Sunday)
-- month: first day of next month - 1 day


-- =============================================================================
-- RPC 1: get_usage_timeseries
-- =============================================================================
-- Time-bucketed usage percentages for all species in a format.
-- Returns all buckets in range, all species per bucket.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_usage_timeseries(text, text, text, date, date, int);

CREATE OR REPLACE FUNCTION public.get_usage_timeseries(
  p_format      text,
  p_source      text    DEFAULT 'all',
  p_period_type text    DEFAULT 'week',
  p_start       date    DEFAULT NULL,
  p_end         date    DEFAULT NULL,
  p_min_players int     DEFAULT 0
)
RETURNS TABLE (
  period_start   date,
  period_end     date,
  species        text,
  players        bigint,
  total_players  bigint,
  usage_pct      numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH slots AS (
    -- Apply source + format + date range filters
    SELECT
      ts.source,
      ts.event_key,
      ts.division,
      ts.player_key,
      ts.species,
      ts.total_players,
      ts.event_date,
      date_trunc(p_period_type, ts.event_date)::date AS bucket
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Denominator: SUM(total_players) over DISTINCT (source, event_key, division) per bucket.
  -- Each event-division pair counted exactly once.
  denoms AS (
    SELECT
      s.bucket,
      SUM(s.total_players) AS bucket_total
    FROM (
      SELECT DISTINCT bucket, source, event_key, division, total_players
      FROM slots
    ) s
    GROUP BY s.bucket
    HAVING SUM(s.total_players) >= p_min_players
  ),
  -- Numerator: COUNT(DISTINCT player_key) per (bucket, species)
  species_counts AS (
    SELECT
      s.bucket,
      s.species,
      COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    INNER JOIN denoms d ON d.bucket = s.bucket
    GROUP BY s.bucket, s.species
  )
  SELECT
    sc.bucket AS period_start,
    (
      CASE p_period_type
        WHEN 'day'   THEN sc.bucket
        WHEN 'week'  THEN sc.bucket + INTERVAL '6 days'
        WHEN 'month' THEN (date_trunc('month', sc.bucket) + INTERVAL '1 month' - INTERVAL '1 day')::date
      END
    )::date AS period_end,
    sc.species,
    sc.player_count               AS players,
    d.bucket_total                AS total_players,
    CASE
      WHEN d.bucket_total > 0
        THEN round(100.0 * sc.player_count / d.bucket_total, 2)
      ELSE 0
    END                           AS usage_pct
  FROM species_counts sc
  INNER JOIN denoms d ON d.bucket = sc.bucket
  ORDER BY sc.bucket ASC, usage_pct DESC
$$;

COMMENT ON FUNCTION public.get_usage_timeseries(text, text, text, date, date, int) IS
  'Time-bucketed Pokemon usage percentages for a format. Returns all buckets and all species. '
  'p_source=''all'' aggregates across sources. p_period_type: day|week|month.';

GRANT EXECUTE ON FUNCTION public.get_usage_timeseries(text, text, text, date, date, int)
  TO anon, authenticated;


-- =============================================================================
-- RPC 2: get_usage_pipeline
-- =============================================================================
-- Full meta snapshot for a single time slice: usage % + histograms for every
-- species in the format.  Used by the /data Meta Explorer pipeline view.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_usage_pipeline(text, text, date, date, int);

CREATE OR REPLACE FUNCTION public.get_usage_pipeline(
  p_format    text,
  p_source    text  DEFAULT 'all',
  p_start     date  DEFAULT NULL,
  p_end       date  DEFAULT NULL,
  p_min_players int DEFAULT 0
)
RETURNS TABLE (
  species       text,
  players       bigint,
  usage_pct     numeric,
  rank          int,
  abilities     jsonb,
  items         jsonb,
  natures       jsonb,
  moves         jsonb,
  tera_types    jsonb,
  ability_items jsonb,
  period_start  date,
  period_end    date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH slots AS (
    SELECT
      ts.source,
      ts.event_key,
      ts.division,
      ts.player_key,
      ts.species,
      ts.held_item,
      ts.ability,
      ts.tera_type,
      ts.moves,
      ts.nature,
      ts.total_players,
      ts.event_date
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Denominator: SUM(total_players) over DISTINCT (source, event_key, division)
  denom AS (
    SELECT SUM(d.total_players) AS total
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    HAVING SUM(d.total_players) >= p_min_players
  ),
  -- Numerator: COUNT(DISTINCT player_key) per species
  species_counts AS (
    SELECT
      s.species,
      COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    CROSS JOIN denom d
    GROUP BY s.species
  ),
  -- Slice date extent (same on every row)
  date_extent AS (
    SELECT
      MIN(event_date)::date AS slice_start,
      MAX(event_date)::date AS slice_end
    FROM slots
  ),
  -- Per-species detail histograms
  species_histograms AS (
    SELECT
      s.species,
      COUNT(DISTINCT s.player_key) AS sp_players,
      -- abilities
      jsonb_agg(
        jsonb_build_object('value', s.ability, 'count', cnt_ability, 'pct', pct_ability)
        ORDER BY cnt_ability DESC, s.ability ASC
      ) FILTER (WHERE s.ability IS NOT NULL) AS abilities,
      -- items
      jsonb_agg(
        jsonb_build_object('value', s.held_item, 'count', cnt_item, 'pct', pct_item)
        ORDER BY cnt_item DESC, s.held_item ASC
      ) FILTER (WHERE s.held_item IS NOT NULL) AS items,
      -- natures
      jsonb_agg(
        jsonb_build_object('value', s.nature, 'count', cnt_nature, 'pct', pct_nature)
        ORDER BY cnt_nature DESC, s.nature ASC
      ) FILTER (WHERE s.nature IS NOT NULL) AS natures,
      -- tera types
      jsonb_agg(
        jsonb_build_object('value', s.tera_type, 'count', cnt_tera, 'pct', pct_tera)
        ORDER BY cnt_tera DESC, s.tera_type ASC
      ) FILTER (WHERE s.tera_type IS NOT NULL) AS tera_types,
      -- ability+item combos
      jsonb_agg(
        jsonb_build_object('value', s.combo, 'count', cnt_combo, 'pct', pct_combo)
        ORDER BY cnt_combo DESC, s.combo ASC
      ) FILTER (WHERE s.combo IS NOT NULL) AS ability_items
    FROM (
      -- Expand and count per-species per-dimension, with pct relative to species player_count
      SELECT
        outer_s.species,
        outer_s.player_key,
        -- ability dim
        outer_s.ability,
        COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.ability) AS cnt_ability,
        CASE WHEN sc.player_count > 0
          THEN round(100.0 * COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.ability) / sc.player_count, 2)
          ELSE 0 END AS pct_ability,
        -- item dim
        outer_s.held_item,
        COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.held_item) AS cnt_item,
        CASE WHEN sc.player_count > 0
          THEN round(100.0 * COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.held_item) / sc.player_count, 2)
          ELSE 0 END AS pct_item,
        -- nature dim
        outer_s.nature,
        COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.nature) AS cnt_nature,
        CASE WHEN sc.player_count > 0
          THEN round(100.0 * COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.nature) / sc.player_count, 2)
          ELSE 0 END AS pct_nature,
        -- tera dim
        outer_s.tera_type,
        COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.tera_type) AS cnt_tera,
        CASE WHEN sc.player_count > 0
          THEN round(100.0 * COUNT(outer_s.player_key) OVER (PARTITION BY outer_s.species, outer_s.tera_type) / sc.player_count, 2)
          ELSE 0 END AS pct_tera,
        -- ability+item combo
        CASE WHEN outer_s.ability IS NOT NULL
          THEN outer_s.ability || ' + ' || COALESCE(outer_s.held_item, 'No Item')
          ELSE NULL END AS combo,
        CASE WHEN outer_s.ability IS NOT NULL
          THEN COUNT(outer_s.player_key) OVER (
            PARTITION BY outer_s.species,
            CASE WHEN outer_s.ability IS NOT NULL
              THEN outer_s.ability || ' + ' || COALESCE(outer_s.held_item, 'No Item')
              ELSE NULL END)
          ELSE NULL END AS cnt_combo,
        CASE WHEN outer_s.ability IS NOT NULL AND sc.player_count > 0
          THEN round(100.0 * COUNT(outer_s.player_key) OVER (
            PARTITION BY outer_s.species,
            CASE WHEN outer_s.ability IS NOT NULL
              THEN outer_s.ability || ' + ' || COALESCE(outer_s.held_item, 'No Item')
              ELSE NULL END) / sc.player_count, 2)
          ELSE 0 END AS pct_combo
      FROM slots outer_s
      INNER JOIN species_counts sc ON sc.species = outer_s.species
    ) s
    GROUP BY s.species
  ),
  -- Moves histogram (unnest required — separate CTE)
  moves_agg AS (
    SELECT
      s.species,
      m.move,
      COUNT(DISTINCT s.player_key) AS cnt,
      sp.player_count
    FROM slots s
    CROSS JOIN LATERAL unnest(s.moves) AS m(move)
    INNER JOIN species_counts sp ON sp.species = s.species
    GROUP BY s.species, m.move, sp.player_count
  ),
  moves_hist AS (
    SELECT
      species,
      jsonb_agg(
        jsonb_build_object(
          'value', move,
          'count', cnt,
          'pct', CASE WHEN player_count > 0 THEN round(100.0 * cnt / player_count, 2) ELSE 0 END
        )
        ORDER BY cnt DESC, move ASC
      ) AS moves
    FROM moves_agg
    GROUP BY species
  )
  SELECT
    sc.species,
    sc.player_count                                    AS players,
    CASE WHEN d.total > 0
      THEN round(100.0 * sc.player_count / d.total, 2)
      ELSE 0 END                                       AS usage_pct,
    dense_rank() OVER (
      ORDER BY CASE WHEN d.total > 0
        THEN round(100.0 * sc.player_count / d.total, 2)
        ELSE 0 END DESC, sc.species ASC
    )::int                                             AS rank,
    COALESCE(sh.abilities,     '[]'::jsonb)            AS abilities,
    COALESCE(sh.items,         '[]'::jsonb)            AS items,
    COALESCE(sh.natures,       '[]'::jsonb)            AS natures,
    COALESCE(mh.moves,         '[]'::jsonb)            AS moves,
    COALESCE(sh.tera_types,    '[]'::jsonb)            AS tera_types,
    COALESCE(sh.ability_items, '[]'::jsonb)            AS ability_items,
    de.slice_start                                     AS period_start,
    de.slice_end                                       AS period_end
  FROM species_counts sc
  CROSS JOIN denom d
  CROSS JOIN date_extent de
  LEFT JOIN species_histograms sh ON sh.species = sc.species
  LEFT JOIN moves_hist mh ON mh.species = sc.species
  ORDER BY usage_pct DESC, sc.species ASC
$$;

COMMENT ON FUNCTION public.get_usage_pipeline(text, text, date, date, int) IS
  'Full meta snapshot for a single time slice: usage % + detail histograms for all species. '
  'Used by the /data Meta Explorer pipeline view.';

GRANT EXECUTE ON FUNCTION public.get_usage_pipeline(text, text, date, date, int)
  TO anon, authenticated;


-- =============================================================================
-- RPC 3: get_species_usage
-- =============================================================================
-- Latest-bucket usage rankings for a format, with 7-day delta.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_species_usage(text, text, text, int);

CREATE OR REPLACE FUNCTION public.get_species_usage(
  p_format      text,
  p_source      text DEFAULT 'all',
  p_period_type text DEFAULT 'week',
  p_min_players int  DEFAULT 0
)
RETURNS TABLE (
  species           text,
  usage_pct         numeric,
  rank              int,
  usage_change_7d   numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH slots AS (
    SELECT
      ts.source,
      ts.event_key,
      ts.division,
      ts.player_key,
      ts.species,
      ts.total_players,
      ts.event_date,
      date_trunc(p_period_type, ts.event_date)::date AS bucket
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
  ),
  denoms AS (
    SELECT
      s.bucket,
      SUM(s.total_players) AS bucket_total
    FROM (
      SELECT DISTINCT bucket, source, event_key, division, total_players FROM slots
    ) s
    GROUP BY s.bucket
    HAVING SUM(s.total_players) >= p_min_players
  ),
  latest_bucket AS (
    SELECT MAX(bucket) AS bucket FROM denoms
  ),
  prior_bucket AS (
    -- The bucket whose period_start = date_trunc(period_type, latest - 7 days)
    -- This matches computeDelta semantics in rollup.ts.
    SELECT date_trunc(p_period_type, (SELECT bucket FROM latest_bucket) - INTERVAL '7 days')::date AS bucket
  ),
  species_counts AS (
    SELECT
      s.bucket,
      s.species,
      COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    INNER JOIN denoms d ON d.bucket = s.bucket
    GROUP BY s.bucket, s.species
  ),
  latest_usage AS (
    SELECT
      sc.species,
      sc.player_count,
      d.bucket_total,
      CASE WHEN d.bucket_total > 0
        THEN round(100.0 * sc.player_count / d.bucket_total, 2)
        ELSE 0 END AS usage_pct
    FROM species_counts sc
    INNER JOIN denoms d ON d.bucket = sc.bucket
    WHERE sc.bucket = (SELECT bucket FROM latest_bucket)
  ),
  prior_usage AS (
    SELECT
      sc.species,
      CASE WHEN d.bucket_total > 0
        THEN round(100.0 * sc.player_count / d.bucket_total, 2)
        ELSE 0 END AS usage_pct
    FROM species_counts sc
    INNER JOIN denoms d ON d.bucket = sc.bucket
    WHERE sc.bucket = (SELECT bucket FROM prior_bucket)
  )
  SELECT
    lu.species,
    lu.usage_pct,
    dense_rank() OVER (ORDER BY lu.usage_pct DESC, lu.species ASC)::int AS rank,
    -- NULL when prior bucket has no row for the species (matches computeDelta)
    CASE WHEN pu.usage_pct IS NOT NULL
      THEN round(lu.usage_pct - pu.usage_pct, 2)
      ELSE NULL END AS usage_change_7d
  FROM latest_usage lu
  LEFT JOIN prior_usage pu ON pu.species = lu.species
  ORDER BY lu.usage_pct DESC, lu.species ASC
$$;

COMMENT ON FUNCTION public.get_species_usage(text, text, text, int) IS
  'Latest-bucket usage rankings for a format with 7-day delta. '
  'Used by the species usage leaderboard.';

GRANT EXECUTE ON FUNCTION public.get_species_usage(text, text, text, int)
  TO anon, authenticated;


-- =============================================================================
-- RPC 4: get_species_usage_detail
-- =============================================================================
-- Trailing p_limit buckets for one species with histograms + deltas.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_species_usage_detail(text, text, text, text, int, int);

CREATE OR REPLACE FUNCTION public.get_species_usage_detail(
  p_format      text,
  p_species     text,
  p_source      text DEFAULT 'all',
  p_period_type text DEFAULT 'week',
  p_limit       int  DEFAULT 12,
  p_min_players int  DEFAULT 0
)
RETURNS TABLE (
  period_start      date,
  period_end        date,
  usage_pct         numeric,
  rank              int,
  sample_size       bigint,
  usage_change_7d   numeric,
  usage_change_30d  numeric,
  abilities         jsonb,
  items             jsonb,
  natures           jsonb,
  moves             jsonb,
  tera_types        jsonb,
  ability_items     jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH slots AS (
    SELECT
      ts.source,
      ts.event_key,
      ts.division,
      ts.player_key,
      ts.species,
      ts.held_item,
      ts.ability,
      ts.tera_type,
      ts.moves,
      ts.nature,
      ts.total_players,
      ts.event_date,
      date_trunc(p_period_type, ts.event_date)::date AS bucket
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
  ),
  -- Denominator per bucket
  denoms AS (
    SELECT
      s.bucket,
      SUM(s.total_players) AS bucket_total
    FROM (
      SELECT DISTINCT bucket, source, event_key, division, total_players FROM slots
    ) s
    GROUP BY s.bucket
    HAVING SUM(s.total_players) >= p_min_players
  ),
  -- All-species counts per bucket (for rank computation within each bucket)
  all_species_counts AS (
    SELECT
      s.bucket,
      s.species,
      COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    INNER JOIN denoms d ON d.bucket = s.bucket
    GROUP BY s.bucket, s.species
  ),
  -- Buckets that contain the target species, limited to trailing p_limit
  target_buckets AS (
    SELECT bucket
    FROM all_species_counts
    WHERE species = p_species
    ORDER BY bucket DESC
    LIMIT p_limit
  ),
  -- Target species counts for those buckets
  target_counts AS (
    SELECT
      asc_inner.bucket,
      asc_inner.player_count
    FROM all_species_counts asc_inner
    INNER JOIN target_buckets tb ON tb.bucket = asc_inner.bucket
    WHERE asc_inner.species = p_species
  ),
  -- Rank of target species within each bucket across all species
  bucket_ranks AS (
    SELECT
      asc_inner.bucket,
      dense_rank() OVER (
        PARTITION BY asc_inner.bucket
        ORDER BY asc_inner.player_count DESC, asc_inner.species ASC
      )::int AS species_rank
    FROM all_species_counts asc_inner
    INNER JOIN target_buckets tb ON tb.bucket = asc_inner.bucket
    WHERE asc_inner.species = p_species
  ),
  -- Detail histograms for target species in target buckets (non-move dimensions)
  detail_slots AS (
    SELECT
      s.bucket,
      s.player_key,
      s.ability,
      s.held_item,
      s.nature,
      s.tera_type,
      s.moves,
      CASE WHEN s.ability IS NOT NULL
        THEN s.ability || ' + ' || COALESCE(s.held_item, 'No Item')
        ELSE NULL END AS combo
    FROM slots s
    INNER JOIN target_buckets tb ON tb.bucket = s.bucket
    WHERE s.species = p_species
  ),
  species_histograms AS (
    SELECT
      ds.bucket,
      COUNT(DISTINCT ds.player_key)          AS sp_players,
      -- abilities
      jsonb_agg(DISTINCT jsonb_build_object(
        'value', ds.ability,
        'count', cnt_ability,
        'pct',   pct_ability
      ) ORDER BY jsonb_build_object(
        'value', ds.ability,
        'count', cnt_ability,
        'pct',   pct_ability
      )) FILTER (WHERE ds.ability IS NOT NULL) AS abilities,
      -- items
      jsonb_agg(DISTINCT jsonb_build_object(
        'value', ds.held_item,
        'count', cnt_item,
        'pct',   pct_item
      ) ORDER BY jsonb_build_object(
        'value', ds.held_item,
        'count', cnt_item,
        'pct',   pct_item
      )) FILTER (WHERE ds.held_item IS NOT NULL) AS items,
      -- natures
      jsonb_agg(DISTINCT jsonb_build_object(
        'value', ds.nature,
        'count', cnt_nature,
        'pct',   pct_nature
      ) ORDER BY jsonb_build_object(
        'value', ds.nature,
        'count', cnt_nature,
        'pct',   pct_nature
      )) FILTER (WHERE ds.nature IS NOT NULL) AS natures,
      -- tera types
      jsonb_agg(DISTINCT jsonb_build_object(
        'value', ds.tera_type,
        'count', cnt_tera,
        'pct',   pct_tera
      ) ORDER BY jsonb_build_object(
        'value', ds.tera_type,
        'count', cnt_tera,
        'pct',   pct_tera
      )) FILTER (WHERE ds.tera_type IS NOT NULL) AS tera_types,
      -- ability+item combos
      jsonb_agg(DISTINCT jsonb_build_object(
        'value', ds.combo,
        'count', cnt_combo,
        'pct',   pct_combo
      ) ORDER BY jsonb_build_object(
        'value', ds.combo,
        'count', cnt_combo,
        'pct',   pct_combo
      )) FILTER (WHERE ds.combo IS NOT NULL) AS ability_items
    FROM (
      SELECT
        ds_inner.bucket,
        ds_inner.player_key,
        ds_inner.ability,
        ds_inner.held_item,
        ds_inner.nature,
        ds_inner.tera_type,
        ds_inner.combo,
        -- window counts per (bucket, dimension_value)
        COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.ability)   AS cnt_ability,
        COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.held_item) AS cnt_item,
        COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.nature)    AS cnt_nature,
        COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.tera_type) AS cnt_tera,
        COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.combo)     AS cnt_combo,
        -- pct relative to species player count in the bucket
        CASE WHEN tc.player_count > 0
          THEN round(100.0 * COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.ability)   / tc.player_count, 2)
          ELSE 0 END AS pct_ability,
        CASE WHEN tc.player_count > 0
          THEN round(100.0 * COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.held_item) / tc.player_count, 2)
          ELSE 0 END AS pct_item,
        CASE WHEN tc.player_count > 0
          THEN round(100.0 * COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.nature)    / tc.player_count, 2)
          ELSE 0 END AS pct_nature,
        CASE WHEN tc.player_count > 0
          THEN round(100.0 * COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.tera_type) / tc.player_count, 2)
          ELSE 0 END AS pct_tera,
        CASE WHEN tc.player_count > 0
          THEN round(100.0 * COUNT(ds_inner.player_key) OVER (PARTITION BY ds_inner.bucket, ds_inner.combo)     / tc.player_count, 2)
          ELSE 0 END AS pct_combo
      FROM detail_slots ds_inner
      INNER JOIN target_counts tc
        ON tc.bucket = ds_inner.bucket
    ) ds
    GROUP BY ds.bucket
  ),
  -- Moves histogram (unnest in separate CTE)
  moves_agg AS (
    SELECT
      ds.bucket,
      m.move,
      COUNT(DISTINCT ds.player_key)  AS cnt,
      tc.player_count
    FROM detail_slots ds
    CROSS JOIN LATERAL unnest(ds.moves) AS m(move)
    INNER JOIN target_counts tc ON tc.bucket = ds.bucket
    GROUP BY ds.bucket, m.move, tc.player_count
  ),
  moves_hist AS (
    SELECT
      bucket,
      jsonb_agg(
        jsonb_build_object(
          'value', move,
          'count', cnt,
          'pct', CASE WHEN player_count > 0 THEN round(100.0 * cnt / player_count, 2) ELSE 0 END
        )
        ORDER BY cnt DESC, move ASC
      ) AS moves
    FROM moves_agg
    GROUP BY bucket
  ),
  -- Delta lookup: for each target bucket, find usage_pct at -7d and -30d buckets
  delta_buckets AS (
    SELECT
      tc.bucket                                                                    AS current_bucket,
      date_trunc(p_period_type, tc.bucket - INTERVAL '7 days')::date              AS bucket_7d,
      date_trunc(p_period_type, tc.bucket - INTERVAL '30 days')::date             AS bucket_30d
    FROM target_counts tc
  ),
  prior_7d AS (
    SELECT
      db.current_bucket,
      CASE WHEN d.bucket_total > 0
        THEN round(100.0 * asc_inner.player_count / d.bucket_total, 2)
        ELSE 0 END AS usage_pct
    FROM delta_buckets db
    JOIN all_species_counts asc_inner
      ON asc_inner.bucket = db.bucket_7d AND asc_inner.species = p_species
    JOIN denoms d ON d.bucket = db.bucket_7d
  ),
  prior_30d AS (
    SELECT
      db.current_bucket,
      CASE WHEN d.bucket_total > 0
        THEN round(100.0 * asc_inner.player_count / d.bucket_total, 2)
        ELSE 0 END AS usage_pct
    FROM delta_buckets db
    JOIN all_species_counts asc_inner
      ON asc_inner.bucket = db.bucket_30d AND asc_inner.species = p_species
    JOIN denoms d ON d.bucket = db.bucket_30d
  )
  SELECT
    tc.bucket AS period_start,
    (
      CASE p_period_type
        WHEN 'day'   THEN tc.bucket
        WHEN 'week'  THEN tc.bucket + INTERVAL '6 days'
        WHEN 'month' THEN (date_trunc('month', tc.bucket) + INTERVAL '1 month' - INTERVAL '1 day')::date
      END
    )::date AS period_end,
    CASE WHEN d.bucket_total > 0
      THEN round(100.0 * tc.player_count / d.bucket_total, 2)
      ELSE 0 END                                                  AS usage_pct,
    COALESCE(br.species_rank, 0)                                  AS rank,
    d.bucket_total                                                AS sample_size,
    -- NULL when prior bucket has no row for the species (matches computeDelta semantics)
    CASE WHEN p7.usage_pct IS NOT NULL
      THEN round(
        (CASE WHEN d.bucket_total > 0 THEN round(100.0 * tc.player_count / d.bucket_total, 2) ELSE 0 END)
        - p7.usage_pct, 2)
      ELSE NULL END                                               AS usage_change_7d,
    CASE WHEN p30.usage_pct IS NOT NULL
      THEN round(
        (CASE WHEN d.bucket_total > 0 THEN round(100.0 * tc.player_count / d.bucket_total, 2) ELSE 0 END)
        - p30.usage_pct, 2)
      ELSE NULL END                                               AS usage_change_30d,
    COALESCE(sh.abilities,     '[]'::jsonb)                       AS abilities,
    COALESCE(sh.items,         '[]'::jsonb)                       AS items,
    COALESCE(sh.natures,       '[]'::jsonb)                       AS natures,
    COALESCE(mh.moves,         '[]'::jsonb)                       AS moves,
    COALESCE(sh.tera_types,    '[]'::jsonb)                       AS tera_types,
    COALESCE(sh.ability_items, '[]'::jsonb)                       AS ability_items
  FROM target_counts tc
  INNER JOIN denoms d ON d.bucket = tc.bucket
  LEFT JOIN bucket_ranks br ON br.bucket = tc.bucket
  LEFT JOIN species_histograms sh ON sh.bucket = tc.bucket
  LEFT JOIN moves_hist mh ON mh.bucket = tc.bucket
  LEFT JOIN prior_7d  p7  ON p7.current_bucket  = tc.bucket
  LEFT JOIN prior_30d p30 ON p30.current_bucket = tc.bucket
  ORDER BY tc.bucket ASC
$$;

COMMENT ON FUNCTION public.get_species_usage_detail(text, text, text, text, int, int) IS
  'Trailing p_limit buckets for one species: usage %, rank, sample size, '
  '7d/30d deltas, and full detail histograms. Used by species detail pages.';

GRANT EXECUTE ON FUNCTION public.get_species_usage_detail(text, text, text, text, int, int)
  TO anon, authenticated;


-- =============================================================================
-- Replace get_format_events — now reads from team_slots
-- =============================================================================
-- Keeps the identical return signature (event_key text, event_date date, source text)
-- so all callers are unaffected.  New body reads from team_slots instead of
-- event_usage, with the same stable ORDER BY for deterministic results.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_format_events(p_format text)
RETURNS TABLE (event_key text, event_date date, source text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT DISTINCT ts.event_key, ts.event_date, ts.source
  FROM public.team_slots ts
  WHERE ts.format = p_format
  ORDER BY ts.event_date, ts.event_key, ts.source;
$$;

GRANT EXECUTE ON FUNCTION public.get_format_events(text) TO anon, authenticated;
