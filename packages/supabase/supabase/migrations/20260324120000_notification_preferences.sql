-- =============================================================================
-- Notification Preferences
-- =============================================================================
-- Per-user notification preferences. Each user has at most one row.
-- The `preferences` JSONB column maps notification_type keys to booleans.
-- When no row exists for a user, all notifications default to enabled
-- (backwards compatible).

-- =============================================================================
-- TABLE: notification_preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.notification_preferences OWNER TO postgres;

COMMENT ON TABLE public.notification_preferences IS 'Per-user notification preferences (opt-out per type)';
COMMENT ON COLUMN public.notification_preferences.user_id IS 'User who owns these preferences';
COMMENT ON COLUMN public.notification_preferences.preferences IS 'JSONB map of notification_type -> boolean (false = opted out)';

-- Index on user_id for fast lookup (unique constraint already creates one,
-- but being explicit for clarity)
CREATE INDEX IF NOT EXISTS notification_preferences_user_id_idx
  ON public.notification_preferences (user_id);

-- =============================================================================
-- RLS: notification_preferences
-- =============================================================================

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
DROP POLICY IF EXISTS "Users can read own preferences" ON public.notification_preferences;
CREATE POLICY "Users can read own preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- FUNCTION: updated_at trigger for notification_preferences
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at
  ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- =============================================================================
-- HELPER: Check if a user has opted out of a notification type
-- =============================================================================
-- Returns TRUE if the notification should be sent (default behavior).
-- Returns FALSE only if the user has explicitly set the type to false.

CREATE OR REPLACE FUNCTION public.should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pref_value BOOLEAN;
BEGIN
  SELECT (preferences->>p_notification_type)::boolean
  INTO v_pref_value
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- No row or no key for this type = default enabled
  IF v_pref_value IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN v_pref_value;
END;
$$;

-- =============================================================================
-- UPDATE TRIGGERS: Add preference checks to existing notification triggers
-- =============================================================================

-- Update notify_judge_call to check preferences
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
      -- Check if user has opted out of judge_call notifications
      IF public.should_send_notification(v_staff_user_id, 'judge_call') THEN
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
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Update notify_round_start to check preferences
CREATE OR REPLACE FUNCTION public.notify_round_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_tournament_name text;
  v_tournament_slug text;
  v_round_number int;
  v_match record;
  v_alt1 record;
  v_alt2 record;
  v_title text;
  v_body text;
  v_action_url text;
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    -- Get tournament info via join chain
    SELECT t.id, t.name, t.slug, NEW.round_number
    INTO v_tournament_id, v_tournament_name, v_tournament_slug, v_round_number
    FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE p.id = NEW.phase_id;

    v_title := v_tournament_name || ' — Round ' || v_round_number;

    -- Loop through all matches
    FOR v_match IN
      SELECT m.id, m.alt1_id, m.alt2_id, m.table_number, m.is_bye
      FROM public.tournament_matches m
      WHERE m.round_id = NEW.id
    LOOP
      v_action_url := '/tournaments/' || v_tournament_slug || '/matches/' || v_match.id;

      IF v_match.is_bye THEN
        -- Bye match: notify single player
        SELECT a.user_id INTO v_alt1
        FROM public.alts a
        WHERE a.id = v_match.alt1_id;

        v_body := 'You have a bye this round.';

        -- Check preferences before inserting
        IF public.should_send_notification(v_alt1.user_id, 'tournament_round') THEN
          INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
          VALUES (v_alt1.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);
        END IF;
      ELSE
        -- Regular match: notify both players
        SELECT a.user_id, a.display_name INTO v_alt1
        FROM public.alts a WHERE a.id = v_match.alt1_id;

        SELECT a.user_id, a.display_name INTO v_alt2
        FROM public.alts a WHERE a.id = v_match.alt2_id;

        -- Notify player 1
        v_body := 'Round ' || v_round_number;
        IF v_match.table_number IS NOT NULL THEN
          v_body := v_body || ', Table ' || v_match.table_number;
        END IF;
        v_body := v_body || ' — vs ' || COALESCE(v_alt2.display_name, 'Opponent');

        IF public.should_send_notification(v_alt1.user_id, 'tournament_round') THEN
          INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
          VALUES (v_alt1.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);
        END IF;

        -- Notify player 2
        v_body := 'Round ' || v_round_number;
        IF v_match.table_number IS NOT NULL THEN
          v_body := v_body || ', Table ' || v_match.table_number;
        END IF;
        v_body := v_body || ' — vs ' || COALESCE(v_alt1.display_name, 'Opponent');

        IF public.should_send_notification(v_alt2.user_id, 'tournament_round') THEN
          INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
          VALUES (v_alt2.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Update notify_checkin_open to check preferences
CREATE OR REPLACE FUNCTION public.notify_checkin_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_name text;
  v_tournament_slug text;
  v_player record;
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    v_tournament_name := NEW.name;
    v_tournament_slug := NEW.slug;

    -- Notify each registered (but not checked-in) player
    FOR v_player IN
      SELECT DISTINCT a.user_id
      FROM public.tournament_registrations tr
      JOIN public.alts a ON a.id = tr.alt_id
      WHERE tr.tournament_id = NEW.id
        AND tr.status = 'registered'
    LOOP
      -- Check preferences before inserting
      IF public.should_send_notification(v_player.user_id, 'tournament_start') THEN
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          body,
          tournament_id,
          action_url
        ) VALUES (
          v_player.user_id,
          'tournament_start',
          v_tournament_name || ' has started',
          'Check in now to secure your spot',
          NEW.id,
          '/tournaments/' || v_tournament_slug
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
