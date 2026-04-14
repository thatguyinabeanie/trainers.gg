-- =============================================================================
-- Discord Bot — Beanie Bot Integration Tables
-- =============================================================================
--
-- Adds all tables and enums needed for the Discord bot integration:
--   - Enum types for DM event types and role types
--   - discord_servers: one row per Discord guild where bot is installed
--   - discord_channels: channel → event type mapping for notifications
--   - discord_notification_queue: outbox for channel notifications (cron-driven)
--   - discord_channel_failures: dead-letter counter for failed channel sends
--   - discord_dm_queue: outbox for user DMs (cron-driven)
--   - discord_user_dm_preferences: per-user, per-event opt-in settings
--   - discord_dm_settings: community-level delivery mode config
--   - discord_role_mappings: community → Discord role config
--   - discord_role_sync_queue: outbox for role assignments/removals
--   - users.show_discord_publicly: opt-in for public Discord handle display
--
-- RLS SUMMARY:
--   - Queue tables (notification, dm, role_sync): service role only — cron
--     workers read/write these, never authenticated users directly.
--   - Settings tables (servers, channels, dm_settings, role_mappings): community
--     leaders with community.manage permission for SELECT; owners only for writes.
--   - discord_channel_failures: community leaders can SELECT; service role writes.
--   - discord_user_dm_preferences: users manage their own rows.
-- =============================================================================

-- =============================================================================
-- Enums
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.discord_dm_event_type AS ENUM (
    'match_ready',
    'match_starting_soon',
    'match_result_to_confirm',
    'match_disputed',
    'team_sheet_needed',
    'team_sheet_approved',
    'team_sheet_rejected',
    'you_dropped',
    'top_cut_made',
    'tournament_starting',
    'tournament_cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discord_role_type AS ENUM (
    'member',
    'participant',
    'winner',
    'staff',
    'currently_playing'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- discord_servers — one row per Discord guild where the bot is installed
-- =============================================================================
--
-- One community can only link one Discord server (UNIQUE on community_id).
-- installed_by uses RESTRICT so accidental user deletion doesn't silently
-- remove the server record — must be handled explicitly.

CREATE TABLE IF NOT EXISTS public.discord_servers (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guild_id        text    NOT NULL UNIQUE,
  community_id    bigint  NOT NULL UNIQUE REFERENCES public.communities(id) ON DELETE CASCADE,
  installed_by    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  settings        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discord_servers_community_id
  ON public.discord_servers (community_id);

CREATE INDEX IF NOT EXISTS idx_discord_servers_guild_id
  ON public.discord_servers (guild_id);

CREATE INDEX IF NOT EXISTS idx_discord_servers_installed_by
  ON public.discord_servers (installed_by);

ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;

-- Community leaders (via has_community_permission) can view their server record
DROP POLICY IF EXISTS "Community leaders can view their discord server" ON public.discord_servers;
CREATE POLICY "Community leaders can view their discord server"
  ON public.discord_servers FOR SELECT TO authenticated
  USING (
    public.has_community_permission(community_id, 'community.manage')
  );

-- Only community owners can install/update/remove the bot
DROP POLICY IF EXISTS "Community owners can insert discord server" ON public.discord_servers;
CREATE POLICY "Community owners can insert discord server"
  ON public.discord_servers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Community owners can update discord server" ON public.discord_servers;
CREATE POLICY "Community owners can update discord server"
  ON public.discord_servers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Community owners can delete discord server" ON public.discord_servers;
CREATE POLICY "Community owners can delete discord server"
  ON public.discord_servers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- discord_channels — channel → event type mapping for notifications
-- =============================================================================
--
-- Multiple event types can be routed to different channels within a server.
-- Unique on (discord_server_id, channel_id, event_type) to prevent duplicates.

CREATE TABLE IF NOT EXISTS public.discord_channels (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id  bigint NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  channel_id         text   NOT NULL,
  event_type         text   NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discord_server_id, channel_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_discord_channels_server_id
  ON public.discord_channels (discord_server_id);

CREATE INDEX IF NOT EXISTS idx_discord_channels_event_type
  ON public.discord_channels (event_type);

ALTER TABLE public.discord_channels ENABLE ROW LEVEL SECURITY;

-- Community leaders can view channel mappings for their server
DROP POLICY IF EXISTS "Community leaders can view discord channels" ON public.discord_channels;
CREATE POLICY "Community leaders can view discord channels"
  ON public.discord_channels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

-- Community leaders can manage (add/update/remove) channel mappings
DROP POLICY IF EXISTS "Community leaders can insert discord channels" ON public.discord_channels;
CREATE POLICY "Community leaders can insert discord channels"
  ON public.discord_channels FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can update discord channels" ON public.discord_channels;
CREATE POLICY "Community leaders can update discord channels"
  ON public.discord_channels FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can delete discord channels" ON public.discord_channels;
CREATE POLICY "Community leaders can delete discord channels"
  ON public.discord_channels FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

-- =============================================================================
-- discord_notification_queue — outbox for channel notifications
-- =============================================================================
--
-- Cron worker reads pending rows, sends to Discord, marks as sent/failed.
-- Unique on (event_type, source_id) enforces strict idempotency — one
-- notification per event per source entity.
-- No authenticated user policies — only the service role (cron) may access.

CREATE TABLE IF NOT EXISTS public.discord_notification_queue (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel_id     text   NOT NULL,
  event_type     text   NOT NULL,
  source_id      text   NOT NULL,
  payload        jsonb  NOT NULL,
  status         text   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed')),
  attempts       int    NOT NULL DEFAULT 0,
  failed_reason  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  UNIQUE (event_type, source_id)
);

-- Composite index for cron query: WHERE status = 'pending' ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_discord_notif_queue_status_created
  ON public.discord_notification_queue (status, created_at);

ALTER TABLE public.discord_notification_queue ENABLE ROW LEVEL SECURITY;

-- Service role only — cron workers use the service role key
DROP POLICY IF EXISTS "Service role manages notification queue" ON public.discord_notification_queue;
CREATE POLICY "Service role manages notification queue"
  ON public.discord_notification_queue FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- discord_channel_failures — failure counter for dead-letter email triggers
-- =============================================================================
--
-- Tracks consecutive failures per (server, channel) pair. When the counter
-- exceeds a threshold, a dead-letter email is sent to the community owner.
-- email_sent_at is cleared on recovery (reset to NULL when channel works again).

CREATE TABLE IF NOT EXISTS public.discord_channel_failures (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id     bigint NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  channel_id            text   NOT NULL,
  consecutive_failures  int    NOT NULL DEFAULT 0,
  last_failed_at        timestamptz,
  email_sent_at         timestamptz,
  -- Set when dead-letter email has been sent; cleared on successful delivery recovery
  UNIQUE (discord_server_id, channel_id)
);

-- Unique constraint provides the index — no extra index needed for the PK pattern.
-- Add an explicit index for server-scoped lookups from the UI.
CREATE INDEX IF NOT EXISTS idx_discord_channel_failures_server_id
  ON public.discord_channel_failures (discord_server_id);

ALTER TABLE public.discord_channel_failures ENABLE ROW LEVEL SECURITY;

-- Community leaders can view failure counters for their channels (for UI display)
DROP POLICY IF EXISTS "Community leaders can view channel failures" ON public.discord_channel_failures;
CREATE POLICY "Community leaders can view channel failures"
  ON public.discord_channel_failures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

-- Service role writes failure records (cron worker)
DROP POLICY IF EXISTS "Service role manages channel failures" ON public.discord_channel_failures;
CREATE POLICY "Service role manages channel failures"
  ON public.discord_channel_failures FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- discord_dm_queue — outbox for user DMs
-- =============================================================================
--
-- Cron worker sends pending DMs to Discord users.
-- delivery_mode is snapshotted at enqueue time from discord_dm_settings so
-- changes to settings don't affect already-queued messages.
-- Unique on (event_type, source_id, discord_user_id) prevents duplicate DMs.

CREATE TABLE IF NOT EXISTS public.discord_dm_queue (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_user_id      text   NOT NULL,
  user_id              uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id         bigint NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  event_type           public.discord_dm_event_type NOT NULL,
  source_id            text   NOT NULL,
  payload              jsonb  NOT NULL,
  delivery_mode        text   NOT NULL
                              CHECK (delivery_mode IN ('dm_only', 'channel_only', 'dm_with_fallback')),
  fallback_channel_id  text,
  status               text   NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts             int    NOT NULL DEFAULT 0,
  failed_reason        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  sent_at              timestamptz,
  UNIQUE (event_type, source_id, discord_user_id)
);

-- Composite index for cron query: WHERE status = 'pending' ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_discord_dm_queue_status_created
  ON public.discord_dm_queue (status, created_at);

-- Index for user-scoped lookups (pref check joins)
CREATE INDEX IF NOT EXISTS idx_discord_dm_queue_user_id
  ON public.discord_dm_queue (user_id);

ALTER TABLE public.discord_dm_queue ENABLE ROW LEVEL SECURITY;

-- Service role only — cron workers use the service role key
DROP POLICY IF EXISTS "Service role manages dm queue" ON public.discord_dm_queue;
CREATE POLICY "Service role manages dm queue"
  ON public.discord_dm_queue FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- discord_user_dm_preferences — per-user, per-event opt-in
-- =============================================================================
--
-- Users can opt into DM notifications on a per-event-type basis.
-- Default is false (opt-in model) to respect Discord's DM privacy.

CREATE TABLE IF NOT EXISTS public.discord_user_dm_preferences (
  user_id     uuid                         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  public.discord_dm_event_type NOT NULL,
  enabled     boolean                      NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, event_type)
);

-- PK (user_id, event_type) already covers user-scoped lookups — no extra index needed.

ALTER TABLE public.discord_user_dm_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage only their own preferences
DROP POLICY IF EXISTS "Users can view own dm preferences" ON public.discord_user_dm_preferences;
CREATE POLICY "Users can view own dm preferences"
  ON public.discord_user_dm_preferences FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dm preferences" ON public.discord_user_dm_preferences;
CREATE POLICY "Users can insert own dm preferences"
  ON public.discord_user_dm_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own dm preferences" ON public.discord_user_dm_preferences;
CREATE POLICY "Users can update own dm preferences"
  ON public.discord_user_dm_preferences FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dm preferences" ON public.discord_user_dm_preferences;
CREATE POLICY "Users can delete own dm preferences"
  ON public.discord_user_dm_preferences FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- discord_dm_settings — community-level delivery mode config
-- =============================================================================
--
-- Controls how DMs are delivered for each event type within a community.
-- One row per (server, event_type). Community leaders manage these settings.

CREATE TABLE IF NOT EXISTS public.discord_dm_settings (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id    bigint                       NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  event_type           public.discord_dm_event_type NOT NULL,
  delivery_mode        text                         NOT NULL DEFAULT 'channel_only'
                                                   CHECK (delivery_mode IN ('dm_only', 'channel_only', 'dm_with_fallback')),
  fallback_channel_id  text,
  -- fallback_channel_id should be set when delivery_mode is channel_only or dm_with_fallback
  UNIQUE (discord_server_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_discord_dm_settings_server_id
  ON public.discord_dm_settings (discord_server_id);

ALTER TABLE public.discord_dm_settings ENABLE ROW LEVEL SECURITY;

-- Community leaders can view DM settings for their server
DROP POLICY IF EXISTS "Community leaders can view discord dm settings" ON public.discord_dm_settings;
CREATE POLICY "Community leaders can view discord dm settings"
  ON public.discord_dm_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can insert discord dm settings" ON public.discord_dm_settings;
CREATE POLICY "Community leaders can insert discord dm settings"
  ON public.discord_dm_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can update discord dm settings" ON public.discord_dm_settings;
CREATE POLICY "Community leaders can update discord dm settings"
  ON public.discord_dm_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can delete discord dm settings" ON public.discord_dm_settings;
CREATE POLICY "Community leaders can delete discord dm settings"
  ON public.discord_dm_settings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

-- =============================================================================
-- discord_role_mappings — community → Discord role config
-- =============================================================================
--
-- Maps trainers.gg role types (member, participant, winner, etc.) to Discord
-- role IDs within a server. enabled=false pauses sync without deleting the mapping.

CREATE TABLE IF NOT EXISTS public.discord_role_mappings (
  id                 bigint                      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id  bigint                      NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  role_type          public.discord_role_type    NOT NULL,
  discord_role_id    text                        NOT NULL,
  enabled            boolean                     NOT NULL DEFAULT true,
  created_at         timestamptz                 NOT NULL DEFAULT now(),
  UNIQUE (discord_server_id, role_type)
);

CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_server_id
  ON public.discord_role_mappings (discord_server_id);

ALTER TABLE public.discord_role_mappings ENABLE ROW LEVEL SECURITY;

-- Community leaders can view role mappings for their server
DROP POLICY IF EXISTS "Community leaders can view discord role mappings" ON public.discord_role_mappings;
CREATE POLICY "Community leaders can view discord role mappings"
  ON public.discord_role_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can insert discord role mappings" ON public.discord_role_mappings;
CREATE POLICY "Community leaders can insert discord role mappings"
  ON public.discord_role_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can update discord role mappings" ON public.discord_role_mappings;
CREATE POLICY "Community leaders can update discord role mappings"
  ON public.discord_role_mappings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

DROP POLICY IF EXISTS "Community leaders can delete discord role mappings" ON public.discord_role_mappings;
CREATE POLICY "Community leaders can delete discord role mappings"
  ON public.discord_role_mappings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discord_servers ds
      WHERE ds.id = discord_server_id
        AND public.has_community_permission(ds.community_id, 'community.manage')
    )
  );

-- =============================================================================
-- discord_role_sync_queue — outbox for role assignments/removals
-- =============================================================================
--
-- Cron worker reads pending rows and calls the Discord API to add/remove roles.
-- Unique on (server, user, role, action, source_event) prevents double-queuing
-- the same role change from the same source event (e.g., tournament registration).

CREATE TABLE IF NOT EXISTS public.discord_role_sync_queue (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id  bigint NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  discord_user_id    text   NOT NULL,
  discord_role_id    text   NOT NULL,
  action             text   NOT NULL CHECK (action IN ('add', 'remove')),
  source_event       text   NOT NULL,
  status             text   NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'sent', 'failed')),
  attempts           int    NOT NULL DEFAULT 0,
  failed_reason      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  UNIQUE (discord_server_id, discord_user_id, discord_role_id, action, source_event)
);

-- Composite index for cron query: WHERE status = 'pending' ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_discord_role_sync_queue_status_created
  ON public.discord_role_sync_queue (status, created_at);

-- Index for server + user lookups (reconciliation queries)
CREATE INDEX IF NOT EXISTS idx_discord_role_sync_queue_server_user
  ON public.discord_role_sync_queue (discord_server_id, discord_user_id);

ALTER TABLE public.discord_role_sync_queue ENABLE ROW LEVEL SECURITY;

-- Service role only — cron workers use the service role key
DROP POLICY IF EXISTS "Service role manages role sync queue" ON public.discord_role_sync_queue;
CREATE POLICY "Service role manages role sync queue"
  ON public.discord_role_sync_queue FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- users.show_discord_publicly — opt-in for public Discord handle display
-- =============================================================================
--
-- When true, the user's linked Discord handle appears on their public profile.
-- Default false: opt-in model to respect Discord privacy expectations.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS show_discord_publicly boolean NOT NULL DEFAULT false;
