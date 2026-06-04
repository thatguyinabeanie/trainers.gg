-- =============================================================================
-- Usage Stats Schema
-- Adds Layer 1 atomic per-event facts (event_usage), a dirty-flag table
-- (usage_dirty) for the rollup worker, and source/period_type dimensions to
-- the Layer 2 rollup table (format_meta_stats).
--
-- WHY: Three data sources (RK9, Limitless, first-party) now feed into a single
-- usage-stats pipeline.  We need:
--   1. A normalized atomic fact store (event_usage) so the rollup worker can
--      recompute any time-bucket without re-scraping.
--   2. A lightweight dirty-flag table (usage_dirty) so the worker knows which
--      format+source combinations have new data without full-table scans.
--   3. Source and period-type dimensions on format_meta_stats so rollups can
--      be bucketed by source ('rk9'|'limitless'|'first_party'|'all') and
--      time-granularity ('day'|'week'|'month').
--   4. site_config keys for the rollup worker's runtime control flags.
-- =============================================================================


-- =============================================================================
-- Layer 1: event_usage — atomic per-event, per-species usage facts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_usage (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  -- Which data pipeline produced this row
  source        text NOT NULL,           -- 'rk9' | 'limitless' | 'first_party'

  -- Globally unique key for the event within that source
  -- Examples: 'rk9:0000123', 'limitless:abc', 'first_party:42'
  event_key     text NOT NULL,

  -- Canonical Showdown format identifier (e.g. 'gen9vgc2025regg')
  format        text NOT NULL,

  -- Age division from RK9; NULL for Limitless and first-party events
  division      text,                    -- 'masters' | 'senior' | 'junior' | NULL

  event_date    date NOT NULL,

  species       text NOT NULL,

  -- Number of teams at this event+division that ran this species
  team_count    int  NOT NULL,

  -- Total teams in this event+division (the denominator for usage %)
  sample_size   int  NOT NULL,

  -- Breakdown details: moves, tera types, held items
  -- Shape: { "moves": [{"v":"fake-out","n":118}], "tera": [...], "item": [...] }
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,

  computed_at   timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness: one row per (source, event, division, species).
-- Division is nullable; NULLs are distinct in standard UNIQUE constraints, so
-- two first-party rows for the same (event_key, species) would not conflict.
-- COALESCE to '' normalises NULL → empty-string so deduplication works correctly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_usage_dedup
  ON public.event_usage (source, event_key, COALESCE(division, ''), species);

-- Time-series queries filter by format + date range
CREATE INDEX IF NOT EXISTS idx_event_usage_format_date
  ON public.event_usage (format, event_date);

ALTER TABLE public.event_usage ENABLE ROW LEVEL SECURITY;

-- Public read: usage stats contain no user-private data.
-- Writes are performed exclusively by the service-role client (rollup worker)
-- which bypasses RLS, so no INSERT/UPDATE/DELETE policies are needed.
DROP POLICY IF EXISTS "event_usage_read" ON public.event_usage;
CREATE POLICY "event_usage_read"
  ON public.event_usage FOR SELECT
  USING (true);


-- =============================================================================
-- Layer 2: add source + period_type dimensions to format_meta_stats
-- =============================================================================

-- source: which data pipeline produced this rollup snapshot
ALTER TABLE public.format_meta_stats
  ADD COLUMN IF NOT EXISTS source      text NOT NULL DEFAULT 'all';
  -- 'rk9' | 'limitless' | 'first_party' | 'all'

-- period_type: time-bucket granularity for this snapshot
ALTER TABLE public.format_meta_stats
  ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'week';
  -- 'day' | 'week' | 'month'

-- Uniqueness: one rollup snapshot per (format, source, period_type, period_start).
-- Deduplicates worker re-runs and prevents accidental double-inserts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_format_meta_stats_dedup
  ON public.format_meta_stats (format, source, period_type, period_start);


-- =============================================================================
-- usage_dirty — dirty-flag table for the rollup worker
-- =============================================================================
-- Each row says "format X from source Y has new event_usage facts since
-- dirty_since; the rollup for this combination needs to be recomputed."
-- The worker deletes or clears rows after it finishes a rollup pass.

CREATE TABLE IF NOT EXISTS public.usage_dirty (
  format        text NOT NULL,
  source        text NOT NULL,   -- 'rk9' | 'limitless' | 'first_party'

  -- Earliest event_date that changed; worker recomputes from here forward
  dirty_since   date NOT NULL,

  updated_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (format, source)
);

ALTER TABLE public.usage_dirty ENABLE ROW LEVEL SECURITY;

-- Public read: operational state only, no sensitive data.
-- Writes are performed exclusively by the service-role client (rollup worker)
-- which bypasses RLS, so no INSERT/UPDATE/DELETE policies are needed.
DROP POLICY IF EXISTS "usage_dirty_read" ON public.usage_dirty;
CREATE POLICY "usage_dirty_read"
  ON public.usage_dirty FOR SELECT
  USING (true);


-- =============================================================================
-- site_config keys for the rollup worker
-- =============================================================================

-- Feature flag: allows ops to disable the rollup without a deploy
INSERT INTO public.site_config (key, value)
VALUES ('usage_rollup_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- How often the rollup worker should run (in seconds)
INSERT INTO public.site_config (key, value)
VALUES ('usage_rollup_interval_seconds', '3600'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Timestamp of the most recent completed rollup run (NULL until first run)
INSERT INTO public.site_config (key, value)
VALUES ('usage_rollup_last_run_at', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;
