-- Notifications System
-- Per-user notifications with Realtime support.
-- Used for judge calls, match updates, tournament events.
--
-- NOTE: Notifications are created by SECURITY DEFINER triggers and server actions
-- (via service role). No direct user INSERT is allowed.

-- =============================================================================
-- ENUM: notification_type
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'match_ready',        -- your match is ready to play
      'match_result',       -- match result reported
      'match_disputed',     -- scoring dispute on your match
      'judge_call',         -- judge requested on a match (for staff)
      'judge_resolved',     -- judge resolved a dispute
      'tournament_start',   -- tournament you're registered in started
      'tournament_round',   -- new round started
      'tournament_complete' -- tournament completed
    );
  END IF;
END $$;

COMMENT ON TYPE public.notification_type IS 'Types of notifications sent to users';

-- =============================================================================
-- TABLE: notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text,
  -- Polymorphic reference to the source entity
  tournament_id bigint REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id bigint REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  -- Action URL for navigation (relative paths only)
  action_url text,
  -- Read tracking
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Title length limit
  CONSTRAINT notifications_title_length CHECK (char_length(title) <= 200),
  -- Body length limit
  CONSTRAINT notifications_body_length CHECK (body IS NULL OR char_length(body) <= 500),
  -- Action URL must be a relative path (starts with /)
  CONSTRAINT notifications_action_url_relative CHECK (action_url IS NULL OR action_url LIKE '/%')
);

ALTER TABLE public.notifications OWNER TO postgres;

COMMENT ON TABLE public.notifications IS 'User notifications for match events, judge calls, and tournament updates';
COMMENT ON COLUMN public.notifications.id IS 'Primary key';
COMMENT ON COLUMN public.notifications.user_id IS 'User who receives this notification';
COMMENT ON COLUMN public.notifications.type IS 'Notification type for categorization and display';
COMMENT ON COLUMN public.notifications.title IS 'Short notification title';
COMMENT ON COLUMN public.notifications.body IS 'Optional longer notification body';
COMMENT ON COLUMN public.notifications.tournament_id IS 'Related tournament (if applicable)';
COMMENT ON COLUMN public.notifications.match_id IS 'Related match (if applicable)';
COMMENT ON COLUMN public.notifications.action_url IS 'Relative URL to navigate to when notification is clicked';
COMMENT ON COLUMN public.notifications.read_at IS 'When the notification was read (null if unread)';

-- Indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_unread_idx ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_tournament_id_idx ON public.notifications (tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_match_id_idx ON public.notifications (match_id) WHERE match_id IS NOT NULL;

-- =============================================================================
-- RLS: notifications
-- =============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users can mark their own notifications as read (UPDATE read_at only)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- No direct INSERT from authenticated users.
-- Notifications are created by:
--   1. SECURITY DEFINER trigger functions (e.g. notify_judge_call)
--   2. Server actions using the service role client
-- This prevents users from creating fake/spoofed notifications.

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- FUNCTION: notify_judge_call
-- =============================================================================
-- When staff_requested is set on a match, create notifications for all org staff
-- who have the tournament.manage permission.
-- Uses the correct join path: user_group_roles -> group_roles -> roles -> role_permissions -> permissions

CREATE OR REPLACE FUNCTION public.notify_judge_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
  v_tournament_name text;
  v_tournament_slug text;
  v_org_slug text;
  v_match_round_number int;
  v_table_number int;
  v_staff_user_id uuid;
BEGIN
  -- Only trigger when staff_requested changes from false to true
  IF NEW.staff_requested = true AND (OLD.staff_requested IS NULL OR OLD.staff_requested = false) THEN
    -- Get tournament info via the join chain
    SELECT t.id, t.organization_id, t.name, t.slug, o.slug,
           r.round_number, NEW.table_number
    INTO v_tournament_id, v_org_id, v_tournament_name, v_tournament_slug, v_org_slug,
         v_match_round_number, v_table_number
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
    JOIN public.organizations o ON t.organization_id = o.id
    WHERE r.id = NEW.round_id;

    -- Create notification for each staff member with tournament.manage permission.
    -- Join path: organization_staff -> user_group_roles -> group_roles -> groups (verify org)
    --            group_roles -> roles -> role_permissions -> permissions (verify permission)
    FOR v_staff_user_id IN
      SELECT DISTINCT os.user_id
      FROM public.organization_staff os
      JOIN public.user_group_roles ugr ON ugr.user_id = os.user_id
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      JOIN public.groups g ON gr.group_id = g.id
      JOIN public.roles r ON gr.role_id = r.id
      JOIN public.role_permissions rp ON r.id = rp.role_id
      JOIN public.permissions perm ON rp.permission_id = perm.id
      WHERE os.organization_id = v_org_id
        AND g.organization_id = v_org_id
        AND perm.key = 'tournament.manage'
      UNION
      -- Also notify org owner
      SELECT o.owner_user_id
      FROM public.organizations o
      WHERE o.id = v_org_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
      VALUES (
        v_staff_user_id,
        'judge_call',
        'Judge requested',
        'Round ' || v_match_round_number ||
          CASE WHEN v_table_number IS NOT NULL THEN ', Table ' || v_table_number ELSE '' END ||
          ' — ' || v_tournament_name,
        v_tournament_id,
        NEW.id,
        '/to-dashboard/' || v_org_slug || '/tournaments/' || v_tournament_slug || '/manage'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_judge_call_trigger ON public.tournament_matches;
CREATE TRIGGER notify_judge_call_trigger
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_judge_call();

-- =============================================================================
-- REALTIME: Enable for notifications
-- =============================================================================
-- NOTE: Realtime RLS must be enabled in Supabase dashboard (Realtime > Settings)
-- for per-user filtering to work. Clients should subscribe with a filter:
-- .on('postgres_changes', { filter: 'user_id=eq.{userId}' })
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
