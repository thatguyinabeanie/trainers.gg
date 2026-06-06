-- =============================================================================
-- Add anon-role write-denial to event_usage and usage_dirty
-- =============================================================================
-- The migration 20260604225054_usage_stats_schema.sql added write-denial
-- policies for event_usage and usage_dirty, but targeted `authenticated` only.
-- This follows the same fix applied in 20260416220000_review_fixes_indexes_and_rls.sql
-- for the earlier pipeline tables (format_meta_stats, pokemon_usage_stats,
-- pokemon_detail_stats, etc.) — combine both roles into a single policy so
-- INSERT/UPDATE/DELETE fail closed regardless of the caller's auth state.
--
-- The ETL/rollup worker uses the service role, which bypasses RLS entirely,
-- so extending denial to anon does not break ingestion.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- event_usage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_event_usage" ON public.event_usage;
CREATE POLICY "no_user_writes_event_usage" ON public.event_usage
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_event_usage" ON public.event_usage;
CREATE POLICY "no_user_updates_event_usage" ON public.event_usage
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_event_usage" ON public.event_usage;
CREATE POLICY "no_user_deletes_event_usage" ON public.event_usage
  FOR DELETE TO authenticated, anon USING (false);

-- -----------------------------------------------------------------------------
-- usage_dirty
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_usage_dirty" ON public.usage_dirty;
CREATE POLICY "no_user_writes_usage_dirty" ON public.usage_dirty
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_usage_dirty" ON public.usage_dirty;
CREATE POLICY "no_user_updates_usage_dirty" ON public.usage_dirty
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_usage_dirty" ON public.usage_dirty;
CREATE POLICY "no_user_deletes_usage_dirty" ON public.usage_dirty
  FOR DELETE TO authenticated, anon USING (false);
