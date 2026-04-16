-- =============================================================================
-- Workflow migration: replace queue tables with discord_delivery_failures
-- =============================================================================
--
-- The three queue tables (discord_notification_queue, discord_dm_queue,
-- discord_role_sync_queue) are replaced by Vercel Workflow for event-driven
-- delivery. This migration creates a unified failure log table and drops
-- the queue tables.
--
-- discord_channel_failures is KEPT — it tracks consecutive failures per
-- channel for dead-letter email escalation, separate from individual
-- delivery attempt logging.

-- =============================================================================
-- New table: discord_delivery_failures
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.discord_delivery_failures (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id      bigint NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  type                   text   NOT NULL CHECK (type IN ('channel', 'dm', 'role_sync')),
  event_type             text   NOT NULL,
  target                 text   NOT NULL,
  error_code             text,
  error_reason           text   NOT NULL,
  payload                jsonb,
  delivered_via_fallback boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_delivery_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community leaders can view delivery failures"
  ON public.discord_delivery_failures;
CREATE POLICY "Community leaders can view delivery failures"
  ON public.discord_delivery_failures FOR SELECT TO authenticated
  USING (
    public.has_community_permission(
      (SELECT community_id FROM public.discord_servers WHERE id = discord_server_id),
      'community.manage'
    )
  );

-- Service role can insert (from workflow steps)
DROP POLICY IF EXISTS "Service role can insert delivery failures"
  ON public.discord_delivery_failures;
CREATE POLICY "Service role can insert delivery failures"
  ON public.discord_delivery_failures FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_discord_delivery_failures_server_created
  ON public.discord_delivery_failures (discord_server_id, created_at DESC);

-- =============================================================================
-- Drop queue tables (cascade removes indexes, policies, constraints)
-- =============================================================================

DROP TABLE IF EXISTS public.discord_notification_queue CASCADE;
DROP TABLE IF EXISTS public.discord_dm_queue CASCADE;
DROP TABLE IF EXISTS public.discord_role_sync_queue CASCADE;
