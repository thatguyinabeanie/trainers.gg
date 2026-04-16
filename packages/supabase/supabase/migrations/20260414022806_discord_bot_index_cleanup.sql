-- =============================================================================
-- Discord bot: index cleanup + documentation
-- =============================================================================
-- Follow-up to 20260414021700_add_discord_bot_tables.sql per code review:
--   1. Remove redundant indexes already covered by UNIQUE constraints
--   2. Add missing FK-covering index on discord_dm_queue.community_id
--   3. Document ON DELETE RESTRICT behavior on discord_servers.installed_by

-- Redundant: UNIQUE on guild_id already creates a backing btree index.
DROP INDEX IF EXISTS public.idx_discord_servers_guild_id;

-- Redundant: UNIQUE on community_id already creates a backing btree index.
DROP INDEX IF EXISTS public.idx_discord_servers_community_id;

-- Missing: FK to communities(id) with ON DELETE CASCADE but no covering index.
-- Without it, community deletion triggers a full scan on discord_dm_queue.
CREATE INDEX IF NOT EXISTS idx_discord_dm_queue_community_id
  ON public.discord_dm_queue (community_id);

-- Document the operational implication of ON DELETE RESTRICT so it's visible
-- in pg_catalog (not just in the original migration comments).
COMMENT ON COLUMN public.discord_servers.installed_by IS
  'User who installed the bot. ON DELETE RESTRICT — admins must uninstall the bot or re-assign installed_by before deleting this user account.';
