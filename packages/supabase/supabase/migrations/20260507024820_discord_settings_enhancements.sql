-- =============================================================================
-- Discord Settings Enhancements
-- =============================================================================
--
-- Adds features needed for the Discord integration settings UI:
--   - ping_role_id column on discord_channels (per-channel ping role override)
--   - check_in_reminder value to discord_dm_event_type enum
--   - verified value to discord_role_type enum
--   - discord_delivery_log table for activity feed / delivery stats
--
-- All statements are idempotent for preview branch replays.
-- =============================================================================

-- =============================================================================
-- 1. Add ping_role_id to discord_channels
-- =============================================================================

ALTER TABLE public.discord_channels
  ADD COLUMN IF NOT EXISTS ping_role_id text;

COMMENT ON COLUMN public.discord_channels.ping_role_id IS
  'Optional Discord role ID to @mention when posting to this channel';

-- =============================================================================
-- 2. Add check_in_reminder to discord_dm_event_type enum
-- =============================================================================

-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block when using
-- IF NOT EXISTS, but Supabase migrations run each file in its own transaction.
-- We use a DO block with exception handling as a safe alternative.
DO $$ BEGIN
  ALTER TYPE public.discord_dm_event_type ADD VALUE IF NOT EXISTS 'check_in_reminder';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 3. Add verified to discord_role_type enum
-- =============================================================================

DO $$ BEGIN
  ALTER TYPE public.discord_role_type ADD VALUE IF NOT EXISTS 'verified';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 4. discord_delivery_log — activity feed for Discord notifications
-- =============================================================================
--
-- Tracks all notification deliveries (channel posts, DMs, role syncs) for
-- the admin activity feed and delivery stats dashboard.
--
-- type: 'channel' | 'dm' | 'role_sync'
-- event_type: the specific event (e.g. 'round_posted', 'match_ready')
-- target: human-readable target (e.g. '#general', '@user', 'role: Verified')
-- metadata: optional JSONB for additional context

CREATE TABLE IF NOT EXISTS public.discord_delivery_log (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id bigint NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  community_id      bigint NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  type              text   NOT NULL,
  event_type        text   NOT NULL,
  target            text   NOT NULL,
  metadata          jsonb  NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_discord_delivery_log_server_created
  ON public.discord_delivery_log (discord_server_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discord_delivery_log_community_created
  ON public.discord_delivery_log (community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discord_delivery_log_type
  ON public.discord_delivery_log (type, created_at DESC);

-- =============================================================================
-- RLS for discord_delivery_log
-- =============================================================================

ALTER TABLE public.discord_delivery_log ENABLE ROW LEVEL SECURITY;

-- Community leaders can view delivery logs for their community
DROP POLICY IF EXISTS "Community leaders can view delivery logs" ON public.discord_delivery_log;
CREATE POLICY "Community leaders can view delivery logs"
  ON public.discord_delivery_log FOR SELECT
  TO authenticated
  USING (
    public.has_community_permission(community_id, 'community.manage')
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users — only service role
-- (edge functions / cron workers) writes to this table.
