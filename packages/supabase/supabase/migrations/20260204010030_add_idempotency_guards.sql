-- =============================================================================
-- Idempotency guards for previously-applied DDL
-- =============================================================================
--
-- This migration is a DEFENSIVE NO-OP. Under normal operation every object
-- referenced here already exists, so every statement short-circuits.
--
-- Purpose: if the full migration set is ever replayed from scratch (database
-- rebuild, disaster recovery, or migration testing), these guards prevent
-- failures caused by duplicate CREATE statements in earlier migrations that
-- lacked IF NOT EXISTS / DROP IF EXISTS.
--
-- Source migrations covered:
--   20260202200000_match_system_tables.sql
--   20260202200001_notifications_table.sql
--   20260202200002_audit_log_table.sql
--   20260203030300_staff_view_tournament_teams.sql
--   20260203030400_single_report_scoring.sql
--   20260203030500_game_status_system_messages.sql
--   20260203030700_tournament_matches_realtime.sql
--   20260203181757_comprehensive_audit_log_triggers.sql
-- =============================================================================


-- =============================================================================
-- 1. ENUMS (already guarded with DO $$ IF NOT EXISTS in original migrations)
-- =============================================================================
-- match_game_status, match_message_type, notification_type, audit_action
-- are all created inside DO blocks with pg_type checks. No action needed.


-- =============================================================================
-- 2. TABLES
-- =============================================================================
-- PostgreSQL does not support ALTER TABLE ... IF NOT EXISTS retroactively,
-- but CREATE TABLE IF NOT EXISTS is safe. These are no-ops when tables exist.
-- We only define the columns needed for the table to be created; constraints
-- and defaults match the original migration exactly.

CREATE TABLE IF NOT EXISTS public.match_games (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  match_id bigint NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  game_number smallint NOT NULL,
  alt1_selection bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  alt2_selection bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  alt1_submitted_at timestamptz,
  alt2_submitted_at timestamptz,
  winner_alt_id bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  status public.match_game_status NOT NULL DEFAULT 'pending',
  resolved_by bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_games_unique_game UNIQUE (match_id, game_number),
  CONSTRAINT match_games_game_number_positive CHECK (game_number >= 1 AND game_number <= 9)
);

CREATE TABLE IF NOT EXISTS public.match_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  match_id bigint NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  alt_id bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  message_type public.match_message_type NOT NULL DEFAULT 'player',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_messages_content_length CHECK (char_length(content) <= 500)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text,
  tournament_id bigint REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id bigint REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  action_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_title_length CHECK (char_length(title) <= 200),
  CONSTRAINT notifications_body_length CHECK (body IS NULL OR char_length(body) <= 500),
  -- Uses the tightened constraint from 20260204000003
  CONSTRAINT notifications_action_url_relative CHECK (action_url IS NULL OR action_url ~ '^/[^/\\]')
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  action public.audit_action NOT NULL,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_alt_id bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  tournament_id bigint REFERENCES public.tournaments(id) ON DELETE SET NULL,
  match_id bigint REFERENCES public.tournament_matches(id) ON DELETE SET NULL,
  game_id bigint REFERENCES public.match_games(id) ON DELETE SET NULL,
  organization_id bigint REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 3. INDEXES
-- =============================================================================
-- All use IF NOT EXISTS so they are safe to replay.

-- match_games indexes (from 20260202200000)
CREATE INDEX IF NOT EXISTS match_games_match_id_idx
  ON public.match_games (match_id);
CREATE INDEX IF NOT EXISTS match_games_status_idx
  ON public.match_games (status)
  WHERE status NOT IN ('agreed', 'resolved', 'cancelled');
CREATE INDEX IF NOT EXISTS match_games_winner_alt_id_idx
  ON public.match_games (winner_alt_id)
  WHERE winner_alt_id IS NOT NULL;

-- match_messages indexes (from 20260202200000)
CREATE INDEX IF NOT EXISTS match_messages_match_id_idx
  ON public.match_messages (match_id);
CREATE INDEX IF NOT EXISTS match_messages_match_id_created_at_idx
  ON public.match_messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS match_messages_alt_id_idx
  ON public.match_messages (alt_id)
  WHERE alt_id IS NOT NULL;

-- notifications indexes (from 20260202200001)
CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_tournament_id_idx
  ON public.notifications (tournament_id)
  WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_match_id_idx
  ON public.notifications (match_id)
  WHERE match_id IS NOT NULL;

-- audit_log indexes (from 20260202200002)
CREATE INDEX IF NOT EXISTS audit_log_tournament_id_idx
  ON public.audit_log (tournament_id)
  WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_tournament_action_idx
  ON public.audit_log (tournament_id, action)
  WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_tournament_created_at_idx
  ON public.audit_log (tournament_id, created_at DESC)
  WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_match_id_idx
  ON public.audit_log (match_id)
  WHERE match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_organization_id_idx
  ON public.audit_log (organization_id)
  WHERE organization_id IS NOT NULL;


-- =============================================================================
-- 4. TRIGGERS (DROP IF EXISTS + CREATE)
-- =============================================================================
-- Triggers cannot use IF NOT EXISTS, so we drop-then-create.
-- Functions are all CREATE OR REPLACE in the originals, so only triggers need
-- the guard. We re-create each trigger exactly as it should exist after all
-- previous migrations have been applied.

-- 4a. match_games: update_match_games_updated_at (from 20260202200000)
DROP TRIGGER IF EXISTS update_match_games_updated_at ON public.match_games;
CREATE TRIGGER update_match_games_updated_at
  BEFORE UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_games_updated_at();

-- 4b. match_games: compare_game_selections_trigger (from 20260202200000)
DROP TRIGGER IF EXISTS compare_game_selections_trigger ON public.match_games;
CREATE TRIGGER compare_game_selections_trigger
  BEFORE UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.compare_game_selections();

-- 4c. match_games: auto_request_staff_on_dispute_trigger (from 20260202200000)
DROP TRIGGER IF EXISTS auto_request_staff_on_dispute_trigger ON public.match_games;
CREATE TRIGGER auto_request_staff_on_dispute_trigger
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_request_staff_on_dispute();

-- 4d. match_games: trg_game_status_message (from 20260203030500)
DROP TRIGGER IF EXISTS trg_game_status_message ON public.match_games;
CREATE TRIGGER trg_game_status_message
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.send_game_status_message();

-- 4e. match_games: update_match_scores_trigger (from 20260204000010)
--     Original migration already had DROP IF EXISTS; included here for completeness.
DROP TRIGGER IF EXISTS update_match_scores_trigger ON public.match_games;
CREATE TRIGGER update_match_scores_trigger
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_scores_from_games();

-- 4f. match_games: audit_match_game_events_trigger (from 20260203181757)
DROP TRIGGER IF EXISTS audit_match_game_events_trigger ON public.match_games;
CREATE TRIGGER audit_match_game_events_trigger
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_match_game_events();

-- 4g. tournament_matches: notify_judge_call_trigger (from 20260202200001)
DROP TRIGGER IF EXISTS notify_judge_call_trigger ON public.tournament_matches;
CREATE TRIGGER notify_judge_call_trigger
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_judge_call();

-- 4h. tournament_matches: audit_match_events_trigger (from 20260203181757)
DROP TRIGGER IF EXISTS audit_match_events_trigger ON public.tournament_matches;
CREATE TRIGGER audit_match_events_trigger
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_match_events();

-- 4i. audit_log: prevent_audit_log_modification (from 20260202200002)
DROP TRIGGER IF EXISTS prevent_audit_log_modification ON public.audit_log;
CREATE TRIGGER prevent_audit_log_modification
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 4j. tournament_registrations: promote_waitlist_on_update (from 20260204000020)
--     Original migration already had DROP IF EXISTS; included here for completeness.
DROP TRIGGER IF EXISTS promote_waitlist_on_update ON public.tournament_registrations;
CREATE TRIGGER promote_waitlist_on_update
  AFTER UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_from_waitlist();

-- 4k. tournament_registrations: promote_waitlist_on_delete (from 20260204000020)
--     Original migration already had DROP IF EXISTS; included here for completeness.
DROP TRIGGER IF EXISTS promote_waitlist_on_delete ON public.tournament_registrations;
CREATE TRIGGER promote_waitlist_on_delete
  AFTER DELETE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_from_waitlist();


-- =============================================================================
-- 5. RLS POLICIES (DROP IF EXISTS + CREATE)
-- =============================================================================
-- Policies do not support IF NOT EXISTS. We drop-then-create to be idempotent.

-- 5a. match_games policies
-- NOTE: The original permissive "Authenticated users can view match games" policy
-- was intentionally replaced by "Match participants and staff can view match games"
-- in 20260202200003_tighten_match_games_rls.sql. We guard the TIGHTENED version here.
DROP POLICY IF EXISTS "Authenticated users can view match games" ON public.match_games;
DROP POLICY IF EXISTS "Match participants and staff can view match games" ON public.match_games;
CREATE POLICY "Match participants and staff can view match games"
  ON public.match_games
  FOR SELECT
  TO authenticated
  USING (
    -- Match participant
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    -- Org staff with tournament.manage permission
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );

DROP POLICY IF EXISTS "Tournament staff can manage match games" ON public.match_games;
CREATE POLICY "Tournament staff can manage match games"
  ON public.match_games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );

-- 5b. match_messages policies (from 20260202200000)
DROP POLICY IF EXISTS "Match participants and staff can view messages" ON public.match_messages;
CREATE POLICY "Match participants and staff can view messages"
  ON public.match_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );

DROP POLICY IF EXISTS "Match participants can send messages" ON public.match_messages;
CREATE POLICY "Match participants can send messages"
  ON public.match_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    message_type = 'player'
    AND alt_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND a.id = alt_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
  );

DROP POLICY IF EXISTS "Tournament staff can send judge/system messages" ON public.match_messages;
CREATE POLICY "Tournament staff can send judge/system messages"
  ON public.match_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    message_type IN ('judge', 'system')
    AND EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );

-- 5c. notifications policies (from 20260202200001)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 5d. audit_log policies (from 20260202200002)
DROP POLICY IF EXISTS "Tournament staff can view audit logs" ON public.audit_log;
CREATE POLICY "Tournament staff can view audit logs"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    (
      tournament_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id
          AND public.has_org_permission(t.organization_id, 'tournament.manage')
      )
    )
    OR
    (
      organization_id IS NOT NULL
      AND public.has_org_permission(organization_id, 'tournament.manage')
    )
    OR
    public.is_site_admin()
  );

-- 5e. staff team viewing policies (from 20260203030300)
DROP POLICY IF EXISTS "staff_view_tournament_teams" ON teams;
CREATE POLICY "staff_view_tournament_teams"
ON teams FOR SELECT USING (
  id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.team_id IS NOT NULL
    AND public.has_org_permission(t.organization_id, 'tournament.manage')
  )
);

DROP POLICY IF EXISTS "staff_view_tournament_team_pokemon" ON team_pokemon;
CREATE POLICY "staff_view_tournament_team_pokemon"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.team_id IS NOT NULL
    AND public.has_org_permission(t.organization_id, 'tournament.manage')
  )
);

DROP POLICY IF EXISTS "staff_view_tournament_pokemon" ON pokemon;
CREATE POLICY "staff_view_tournament_pokemon"
ON pokemon FOR SELECT USING (
  id IN (
    SELECT tp.pokemon_id
    FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT tr.team_id
      FROM tournament_registrations tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.team_id IS NOT NULL
      AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  )
);


-- =============================================================================
-- 6. REALTIME PUBLICATION
-- =============================================================================
-- ALTER PUBLICATION ... ADD TABLE errors if the table is already a member.
-- We use a DO block with exception handling to make this idempotent.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.match_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already a member, ignore
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.match_games;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================================
-- 7. RLS ENABLE (idempotent by default -- re-enabling is a no-op)
-- =============================================================================
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 8. TABLE OWNERSHIP (idempotent -- setting same owner is a no-op)
-- =============================================================================
ALTER TABLE public.match_games OWNER TO postgres;
ALTER TABLE public.match_messages OWNER TO postgres;
ALTER TABLE public.notifications OWNER TO postgres;
ALTER TABLE public.audit_log OWNER TO postgres;
