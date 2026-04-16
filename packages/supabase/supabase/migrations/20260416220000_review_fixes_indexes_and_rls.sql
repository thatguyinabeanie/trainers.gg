-- =============================================================================
-- Review fixes: indexes, delivery-failure RLS, anon-role denial
-- =============================================================================
-- Addresses three issues from the database review of the-builder branch:
--
--   1. The partial index on `users.id WHERE discord_dm_warn_until IS NOT NULL`
--      duplicates the primary key and cannot serve any query. Replace with a
--      partial index on the actual `discord_dm_warn_until` column.
--
--   2. The `discord_delivery_failures` SELECT policy resolves `community_id`
--      via a correlated subquery on `discord_servers` evaluated per row. As
--      the table grows this degrades query plans. Denormalize `community_id`
--      directly onto the failure row so the policy can use it in a simple
--      equality check.
--
--   3. The pipeline-table write-denial policies (external_players, data_imports,
--      imported_team_sheets, format_meta_stats, pokemon_usage_stats,
--      pokemon_detail_stats) target `authenticated` only, leaving the `anon`
--      role ungated. Extend denial to `anon` so INSERT/UPDATE/DELETE fail
--      closed regardless of the caller's auth state.

-- =============================================================================
-- 1. users: rebuild the discord_dm_warn_until partial index
-- =============================================================================

DROP INDEX IF EXISTS public.idx_users_discord_dm_warn_until_not_null;

CREATE INDEX IF NOT EXISTS idx_users_discord_dm_warn_until
  ON public.users (discord_dm_warn_until)
  WHERE discord_dm_warn_until IS NOT NULL;

-- =============================================================================
-- 2. discord_delivery_failures: denormalize community_id + rewrite policy
-- =============================================================================

ALTER TABLE public.discord_delivery_failures
  ADD COLUMN IF NOT EXISTS community_id bigint
    REFERENCES public.communities(id) ON DELETE CASCADE;

-- Backfill any existing rows from the linked discord_servers row
UPDATE public.discord_delivery_failures AS df
SET community_id = ds.community_id
FROM public.discord_servers AS ds
WHERE df.discord_server_id = ds.id
  AND df.community_id IS NULL;

ALTER TABLE public.discord_delivery_failures
  ALTER COLUMN community_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discord_delivery_failures_community_id
  ON public.discord_delivery_failures (community_id);

DROP POLICY IF EXISTS "Community leaders can view delivery failures"
  ON public.discord_delivery_failures;

CREATE POLICY "Community leaders can view delivery failures"
  ON public.discord_delivery_failures FOR SELECT TO authenticated
  USING (public.has_community_permission(community_id, 'community.manage'));

-- =============================================================================
-- 3. Pipeline tables: extend write-denial policies to the anon role
-- =============================================================================
-- For each pipeline table, drop the existing authenticated-only denial
-- policies and replace them with denial policies that cover both roles.
-- The inserting path (ETL jobs) uses the service role, which bypasses RLS,
-- so this does not break ingestion.

-- -----------------------------------------------------------------------------
-- 3a. external_players
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_external_players" ON external_players;
CREATE POLICY "no_user_writes_external_players" ON external_players
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_external_players" ON external_players;
CREATE POLICY "no_user_updates_external_players" ON external_players
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_external_players" ON external_players;
CREATE POLICY "no_user_deletes_external_players" ON external_players
  FOR DELETE TO authenticated, anon USING (false);

-- -----------------------------------------------------------------------------
-- 3b. data_imports
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_data_imports" ON data_imports;
CREATE POLICY "no_user_writes_data_imports" ON data_imports
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_data_imports" ON data_imports;
CREATE POLICY "no_user_updates_data_imports" ON data_imports
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_data_imports" ON data_imports;
CREATE POLICY "no_user_deletes_data_imports" ON data_imports
  FOR DELETE TO authenticated, anon USING (false);

-- -----------------------------------------------------------------------------
-- 3c. imported_team_sheets
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_imported_team_sheets" ON imported_team_sheets;
CREATE POLICY "no_user_writes_imported_team_sheets" ON imported_team_sheets
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_imported_team_sheets" ON imported_team_sheets;
CREATE POLICY "no_user_updates_imported_team_sheets" ON imported_team_sheets
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_imported_team_sheets" ON imported_team_sheets;
CREATE POLICY "no_user_deletes_imported_team_sheets" ON imported_team_sheets
  FOR DELETE TO authenticated, anon USING (false);

-- -----------------------------------------------------------------------------
-- 3d. format_meta_stats
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_format_meta_stats" ON format_meta_stats;
CREATE POLICY "no_user_writes_format_meta_stats" ON format_meta_stats
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_format_meta_stats" ON format_meta_stats;
CREATE POLICY "no_user_updates_format_meta_stats" ON format_meta_stats
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_format_meta_stats" ON format_meta_stats;
CREATE POLICY "no_user_deletes_format_meta_stats" ON format_meta_stats
  FOR DELETE TO authenticated, anon USING (false);

-- -----------------------------------------------------------------------------
-- 3e. pokemon_usage_stats
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_pokemon_usage_stats" ON pokemon_usage_stats;
CREATE POLICY "no_user_writes_pokemon_usage_stats" ON pokemon_usage_stats
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_pokemon_usage_stats" ON pokemon_usage_stats;
CREATE POLICY "no_user_updates_pokemon_usage_stats" ON pokemon_usage_stats
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_pokemon_usage_stats" ON pokemon_usage_stats;
CREATE POLICY "no_user_deletes_pokemon_usage_stats" ON pokemon_usage_stats
  FOR DELETE TO authenticated, anon USING (false);

-- -----------------------------------------------------------------------------
-- 3f. pokemon_detail_stats
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_pokemon_detail_stats" ON pokemon_detail_stats;
CREATE POLICY "no_user_writes_pokemon_detail_stats" ON pokemon_detail_stats
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_pokemon_detail_stats" ON pokemon_detail_stats;
CREATE POLICY "no_user_updates_pokemon_detail_stats" ON pokemon_detail_stats
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_pokemon_detail_stats" ON pokemon_detail_stats;
CREATE POLICY "no_user_deletes_pokemon_detail_stats" ON pokemon_detail_stats
  FOR DELETE TO authenticated, anon USING (false);
