-- =============================================================================
-- T6: Restrict what managers may write on tournament_registrations
-- =============================================================================
-- RATIONALE
-- ----------
-- tournament_registrations is a "realtime-six" table with authenticated SELECT.
-- RLS can gate which *rows* are visible, but Postgres RLS cannot restrict which
-- *columns* may be updated — that requires a trigger-level check.
--
-- Two invariants this migration enforces:
--
--   1. IMMUTABLE COLUMNS — alt_id and tournament_id must never change after a
--      registration is created. They are the player-identity and tournament
--      anchor. Allowing them to be repointed would silently reassign a
--      registration to a different player or a different event.
--
--   2. MANAGER WRITE SCOPE — staff members hold the "tournament.manage"
--      permission and reach the row through the existing UPDATE RLS policy
--      (20260617232747_staff_update_tournament_registrations_policy.sql). But
--      that policy grants UPDATE on the whole row. This trigger narrows the
--      set of columns that non-owners (managers / staff) may actually modify to
--      just `status` and `team_locked` — the two columns the staff workflow
--      legitimately writes today. Any other column change from a non-owner
--      raises a 42501 error and rolls back the transaction.
--
-- SECURITY DEFINER is required because the ownership check must query
-- public.alts (to compare a.user_id against auth.uid()), and that table has
-- anon SELECT revoked and an authenticated-only RLS policy. Running the trigger
-- as the function owner (postgres / rls-exempt role) ensures the lookup works
-- regardless of who called the UPDATE. auth.uid() still returns the JWT caller
-- inside a SECURITY DEFINER function — it is not spoofable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_registration_write_rules()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_is_owner boolean;
BEGIN
  -- -------------------------------------------------------------------------
  -- Guard 1: alt_id and tournament_id are immutable after creation.
  -- Any caller — owner or manager — is blocked from repointing these.
  -- -------------------------------------------------------------------------
  IF NEW.alt_id IS DISTINCT FROM OLD.alt_id
     OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
  THEN
    RAISE EXCEPTION 'alt_id and tournament_id are immutable on a registration'
      USING ERRCODE = '42501';
  END IF;

  -- -------------------------------------------------------------------------
  -- Guard 2: non-owner (manager / staff) callers may only change status and
  -- team_locked. Check whether the caller owns the row by looking up the alt.
  -- -------------------------------------------------------------------------
  v_is_owner := EXISTS (
    SELECT 1
    FROM public.alts a
    WHERE a.id = OLD.alt_id
      AND a.user_id = (SELECT auth.uid())
  );

  IF NOT v_is_owner THEN
    -- Manager path: reject updates to any column other than status/team_locked.
    IF NEW.team_id              IS DISTINCT FROM OLD.team_id
       OR NEW.team_name         IS DISTINCT FROM OLD.team_name
       OR NEW.team_submitted_at IS DISTINCT FROM OLD.team_submitted_at
       OR NEW.in_game_name      IS DISTINCT FROM OLD.in_game_name
       OR NEW.display_name_option IS DISTINCT FROM OLD.display_name_option
       OR NEW.show_country_flag IS DISTINCT FROM OLD.show_country_flag
       OR NEW.checked_in_at     IS DISTINCT FROM OLD.checked_in_at
       OR NEW.registered_at     IS DISTINCT FROM OLD.registered_at
       OR NEW.created_at        IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Managers may only change status and team_locked on a registration'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Attach the trigger (BEFORE UPDATE so invalid writes are rejected before
--    any row data changes — no partial-write state is ever committed).
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS enforce_registration_write_rules
  ON public.tournament_registrations;

CREATE TRIGGER enforce_registration_write_rules
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_registration_write_rules();

-- ---------------------------------------------------------------------------
-- 3. Column comments documenting the ownership and write rules
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.tournament_registrations.alt_id IS
  'Immutable after registration. Identifies which player (alt) owns this row; '
  'the RLS/ownership anchor. Never repointed. Enforced by the '
  'enforce_registration_write_rules BEFORE UPDATE trigger.';

COMMENT ON COLUMN public.tournament_registrations.tournament_id IS
  'Immutable after registration. Enforced by the '
  'enforce_registration_write_rules BEFORE UPDATE trigger.';

COMMENT ON COLUMN public.tournament_registrations.status IS
  'Lifecycle state. Players set check-in (checked_in/registered); managers set '
  'confirmed/dropped (drop via drop_registrations RPC); system sets '
  'waitlist/registered. The only column besides team_locked a manager may '
  'write directly (enforced by enforce_registration_write_rules trigger).';

COMMENT ON COLUMN public.tournament_registrations.team_locked IS
  'Gates team edits. Today writable by the manager-run start flow; SHOULD '
  'become system-only (set only by tournament start) in the planned '
  'status-model redesign. Players must never flip it. Managers may write it '
  'alongside status (the only two columns permitted by the '
  'enforce_registration_write_rules trigger).';

COMMENT ON COLUMN public.tournament_registrations.team_id IS
  'Player-owned submitted team. Frozen at the application layer once '
  'team_locked is true (DB-level freeze is part of the planned '
  'status-model redesign). Managers may not alter this column '
  '(enforced by enforce_registration_write_rules trigger).';
