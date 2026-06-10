-- =============================================================================
-- Retire the precomputed usage rollup layer.
--
-- WHY: team_slots (one row per Pokemon slot per player per event) + four live
-- aggregation RPCs (get_species_usage, get_species_usage_detail,
-- get_usage_timeseries, get_usage_pipeline) replace the entire two-layer
-- pipeline. All five tables hold derived data that is rebuildable from
-- rk9.*, limitless.*, and tournament_team_sheets via compileEventTeamSlots.
-- No first-party tournament data exists yet; rk9/limitless data is fully
-- re-importable, so nothing is lost.
--
-- Dependency order (children before parents):
--   pokemon_detail_stats → format_meta_stats (FK)
--   pokemon_usage_stats  → format_meta_stats (FK)
--   format_meta_stats    (parent, dropped last)
--   event_usage          (independent)
--   usage_dirty          (independent)
-- =============================================================================

-- get_format_events currently queries event_usage; replace with a team_slots
-- version so the function survives the table drops.
--
-- WHY team_slots: The event annotation pins on the usage timeline need one row
-- per distinct (event_key, event_date, source) per format.  team_slots carries
-- all three columns with the same semantics as the old event_usage table.
-- DISTINCT collapses the per-slot rows to per-event rows server-side.
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

-- Drop children first (FK references to format_meta_stats)
DROP TABLE IF EXISTS public.pokemon_detail_stats;
DROP TABLE IF EXISTS public.pokemon_usage_stats;

-- Drop parents
DROP TABLE IF EXISTS public.format_meta_stats;
DROP TABLE IF EXISTS public.event_usage;
DROP TABLE IF EXISTS public.usage_dirty;

-- Remove rollup worker control flags from site_config.
-- These were seeded in 20260604225054_usage_stats_schema.sql.
-- The DELETE is idempotent — harmless if the keys were never seeded.
DELETE FROM public.site_config
WHERE key IN (
  'usage_rollup_enabled',
  'usage_rollup_interval_seconds',
  'usage_rollup_last_run_at'
);
