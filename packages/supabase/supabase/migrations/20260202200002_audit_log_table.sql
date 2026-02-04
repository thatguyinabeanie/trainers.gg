-- Audit Log System
-- Structured audit logging for judge actions, match events,
-- tournament state transitions, and team locks.
--
-- IMMUTABILITY: Audit log entries cannot be modified or deleted once created.
-- A trigger enforces this at the database level.
-- INSERT only via SECURITY DEFINER triggers or service role.

-- =============================================================================
-- ENUM: audit_action
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE public.audit_action AS ENUM (
      -- Match actions
      'match.score_submitted',     -- player submitted blind score
      'match.score_agreed',        -- both players agreed on game result
      'match.score_disputed',      -- scoring disagreement
      'match.result_reported',     -- match result finalized
      'match.staff_requested',     -- judge called
      'match.staff_resolved',      -- judge resolved dispute
      -- Judge actions
      'judge.game_reset',          -- judge reset a game
      'judge.match_reset',         -- judge reset entire match
      'judge.game_override',       -- judge overrode a game result
      'judge.match_override',      -- judge overrode match result
      -- Tournament state
      'tournament.started',        -- tournament started
      'tournament.round_created',  -- new round created
      'tournament.round_started',  -- round activated
      'tournament.round_completed',-- round completed
      'tournament.phase_advanced', -- advanced to next phase
      'tournament.completed',      -- tournament completed
      -- Team actions
      'team.submitted',            -- team submitted for tournament
      'team.locked',               -- team locked at tournament start
      'team.unlocked',             -- team unlocked (admin action)
      -- Registration actions
      'registration.checked_in',   -- player checked in
      'registration.dropped',      -- player dropped
      'registration.late_checkin'  -- player used late check-in
    );
  END IF;
END $$;

COMMENT ON TYPE public.audit_action IS 'Enumerated audit log actions for type-safe filtering';

-- =============================================================================
-- TABLE: audit_log
-- =============================================================================
-- Uses ON DELETE SET NULL for all FKs to preserve audit history when
-- referenced entities are deleted.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  -- What happened
  action public.audit_action NOT NULL,
  -- Who did it (null for trigger-created entries)
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_alt_id bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  -- Context references (all optional, depends on action type)
  -- SET NULL preserves the audit entry when the referenced entity is deleted
  tournament_id bigint REFERENCES public.tournaments(id) ON DELETE SET NULL,
  match_id bigint REFERENCES public.tournament_matches(id) ON DELETE SET NULL,
  game_id bigint REFERENCES public.match_games(id) ON DELETE SET NULL,
  organization_id bigint REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Flexible metadata for action-specific details
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log OWNER TO postgres;

COMMENT ON TABLE public.audit_log IS 'Immutable structured audit log for judge actions, match events, and tournament state transitions';
COMMENT ON COLUMN public.audit_log.id IS 'Primary key';
COMMENT ON COLUMN public.audit_log.action IS 'What action was performed';
COMMENT ON COLUMN public.audit_log.actor_user_id IS 'User who performed the action (null for system/trigger actions)';
COMMENT ON COLUMN public.audit_log.actor_alt_id IS 'Alt identity used for the action';
COMMENT ON COLUMN public.audit_log.tournament_id IS 'Related tournament';
COMMENT ON COLUMN public.audit_log.match_id IS 'Related match (if applicable)';
COMMENT ON COLUMN public.audit_log.game_id IS 'Related game (if applicable)';
COMMENT ON COLUMN public.audit_log.organization_id IS 'Related organization';
COMMENT ON COLUMN public.audit_log.metadata IS 'Action-specific details as JSON';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS audit_log_tournament_id_idx ON public.audit_log (tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_tournament_action_idx ON public.audit_log (tournament_id, action) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_tournament_created_at_idx ON public.audit_log (tournament_id, created_at DESC) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_match_id_idx ON public.audit_log (match_id) WHERE match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_organization_id_idx ON public.audit_log (organization_id) WHERE organization_id IS NOT NULL;

-- =============================================================================
-- IMMUTABILITY: Prevent UPDATE/DELETE on audit_log
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_log_modification ON public.audit_log;
CREATE TRIGGER prevent_audit_log_modification
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- =============================================================================
-- RLS: audit_log
-- =============================================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Org staff with tournament.manage can view audit logs for their tournaments
DROP POLICY IF EXISTS "Tournament staff can view audit logs" ON public.audit_log;
CREATE POLICY "Tournament staff can view audit logs"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    -- Via tournament
    (
      tournament_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id
          AND public.has_org_permission(t.organization_id, 'tournament.manage')
      )
    )
    OR
    -- Via organization directly
    (
      organization_id IS NOT NULL
      AND public.has_org_permission(organization_id, 'tournament.manage')
    )
    OR
    -- Site admins can see everything
    public.is_site_admin()
  );

-- No INSERT policy for authenticated users.
-- Audit entries are created by:
--   1. SECURITY DEFINER trigger functions (bypass RLS)
--   2. Server actions using the service role client (bypass RLS)
-- This ensures audit log integrity — no user can forge entries.

-- =============================================================================
-- TRIGGER: auto_audit_staff_request
-- =============================================================================
-- Automatically log when staff is requested on a match.

CREATE OR REPLACE FUNCTION public.audit_staff_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
BEGIN
  IF NEW.staff_requested = true AND (OLD.staff_requested IS NULL OR OLD.staff_requested = false) THEN
    SELECT t.id, t.organization_id
    INTO v_tournament_id, v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE r.id = NEW.round_id;

    INSERT INTO public.audit_log (action, tournament_id, match_id, organization_id, metadata)
    VALUES (
      'match.staff_requested',
      v_tournament_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'table_number', NEW.table_number,
        'alt1_id', NEW.alt1_id,
        'alt2_id', NEW.alt2_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_staff_request_trigger ON public.tournament_matches;
CREATE TRIGGER audit_staff_request_trigger
  AFTER UPDATE ON public.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_staff_request();

-- =============================================================================
-- TRIGGER: auto_audit_game_dispute
-- =============================================================================
-- Automatically log when a game enters disputed status.

CREATE OR REPLACE FUNCTION public.audit_game_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
BEGIN
  IF NEW.status = 'disputed' AND (OLD.status IS NULL OR OLD.status != 'disputed') THEN
    SELECT t.id, t.organization_id
    INTO v_tournament_id, v_org_id
    FROM public.tournament_matches m
    JOIN public.tournament_rounds r ON m.round_id = r.id
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE m.id = NEW.match_id;

    INSERT INTO public.audit_log (action, tournament_id, match_id, game_id, organization_id, metadata)
    VALUES (
      'match.score_disputed',
      v_tournament_id,
      NEW.match_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'game_number', NEW.game_number,
        'alt1_selection', NEW.alt1_selection,
        'alt2_selection', NEW.alt2_selection
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_game_dispute_trigger ON public.match_games;
CREATE TRIGGER audit_game_dispute_trigger
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_game_dispute();
