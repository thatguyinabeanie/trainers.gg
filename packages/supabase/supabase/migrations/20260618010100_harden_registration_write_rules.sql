-- =============================================================================
-- Fix #5 + #6: Harden enforce_registration_write_rules trigger function
-- =============================================================================
-- This migration recreates enforce_registration_write_rules() with two fixes
-- applied on top of the current body (20260618000100 original, last replaced
-- in 20260618000500).
--
-- FIX #5 — Service-role gate (closes anon bypass)
-- -------------------------------------------------
-- The previous bypass used:
--
--   IF (SELECT auth.uid()) IS NULL THEN RETURN NEW;
--
-- auth.uid() is NULL for BOTH service_role callers AND anon callers. An anon
-- UPDATE that somehow bypassed the RLS policy layer (e.g. via a SECURITY
-- DEFINER wrapper that does not itself call auth.uid()) would receive the same
-- early return and skip all write guards. This is a latent footgun.
--
-- The fix gates specifically on the role being service_role:
--
--   IF (SELECT auth.role()) = 'service_role' THEN RETURN NEW;
--
-- This matches the initplan pattern already established in this repo
-- (20260401234001_tournament_team_sheets_and_rls_lockdown.sql uses the same
-- form). auth.role() returns 'anon' for unauthenticated requests and
-- 'authenticated' for logged-in users, so anon callers are no longer exempted.
-- Guard 1 (immutability) still runs for service_role — the bypass is placed
-- AFTER it, as before.
--
-- FIX #6 — Allowlist instead of denylist for manager column guard
-- ---------------------------------------------------------------
-- The previous guard enumerated FORBIDDEN columns (team_id, team_name, …).
-- This fails open: a new column added to tournament_registrations is
-- implicitly permitted for non-owner writes until someone manually extends the
-- denylist. That is a security-by-omission pattern.
--
-- The fix uses an ALLOWLIST: compare the full JSON row after stripping the
-- permitted columns from both NEW and OLD. If anything outside the allowed set
-- changed, the write is rejected.
--
--   to_jsonb(NEW) - ARRAY[...allowed_keys...]
--     IS DISTINCT FROM
--   to_jsonb(OLD) - ARRAY[...allowed_keys...]
--
-- ALLOWED SET (columns a non-owner manager may change, or columns excluded
-- from the comparison for other reasons):
--   status       — the primary field managers write (confirm/drop transitions)
--   team_locked  — toggled by the tournament-start flow
--   id           — PK, never changes in an UPDATE (generated always as identity)
--   alt_id       — immutable; already guarded by Guard 1 for ALL callers
--   tournament_id — immutable; already guarded by Guard 1 for ALL callers
--
-- Any column added to tournament_registrations in the future will be
-- AUTOMATICALLY blocked for non-owners until it is explicitly added to this
-- allowed set. Fails closed.
--
-- PRESERVED UNCHANGED
-- --------------------
-- - Guard 1: alt_id and tournament_id immutability (runs for ALL callers)
-- - Owner detection via public.alts lookup
-- - RAISE EXCEPTION message and ERRCODE = '42501'
-- - SECURITY DEFINER, SET search_path = '', ownership
-- - Trigger attachment (BEFORE UPDATE FOR EACH ROW)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Recreate trigger function with both fixes applied
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
  -- Runs for ALL callers (owner, manager, AND service-role) — no exceptions.
  -- -------------------------------------------------------------------------
  IF NEW.alt_id IS DISTINCT FROM OLD.alt_id
     OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
  THEN
    RAISE EXCEPTION 'alt_id and tournament_id are immutable on a registration'
      USING ERRCODE = '42501';
  END IF;

  -- -------------------------------------------------------------------------
  -- Service-role bypass: gate on the actual role, not auth.uid() being NULL.
  -- auth.uid() is NULL for both service_role AND anon — using auth.uid() IS
  -- NULL as the gate would bypass the write guards for anon callers too.
  -- (SELECT auth.role()) = 'service_role' is role-specific and unambiguous.
  -- Placed AFTER Guard 1: the immutability invariant holds for service_role.
  -- -------------------------------------------------------------------------
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- -------------------------------------------------------------------------
  -- Guard 2: non-owner (manager / staff) callers may only change the allowed
  -- column set. Check whether the caller owns the row by looking up the alt.
  -- -------------------------------------------------------------------------
  v_is_owner := EXISTS (
    SELECT 1
    FROM public.alts a
    WHERE a.id = OLD.alt_id
      AND a.user_id = (SELECT auth.uid())
  );

  IF NOT v_is_owner THEN
    -- Manager path: allowlist check — reject if any column outside the
    -- permitted set changed. Stripping the allowed keys from both sides and
    -- comparing ensures that new columns added to the table are blocked by
    -- default (fails closed), unlike a denylist which fails open.
    --
    -- Allowed keys:
    --   status, team_locked  — the two columns managers legitimately write
    --   id                   — PK, never changes in UPDATE
    --   alt_id, tournament_id — covered by Guard 1 (immutable for everyone)
    IF (to_jsonb(NEW) - ARRAY['status', 'team_locked',
                               'id', 'alt_id', 'tournament_id'])
         IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['status', 'team_locked',
                               'id', 'alt_id', 'tournament_id'])
    THEN
      RAISE EXCEPTION 'Managers may only change status and team_locked on a registration'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Reattach the trigger (idempotent — DROP IF EXISTS before CREATE)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS enforce_registration_write_rules
  ON public.tournament_registrations;

CREATE TRIGGER enforce_registration_write_rules
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_registration_write_rules();

COMMENT ON FUNCTION public.enforce_registration_write_rules() IS
  'BEFORE UPDATE trigger on tournament_registrations. '
  'Guard 1 (runs for ALL callers): alt_id and tournament_id are immutable. '
  'Service-role bypass (AFTER Guard 1): service_role callers may write any '
  'non-immutable column (migration/cron/backfill path). Uses auth.role() = '
  '''service_role'' — NOT auth.uid() IS NULL, which would also exempt anon. '
  'Guard 2 (non-owner callers): allowlist — only status and team_locked may '
  'change. Any new column is blocked by default (fails closed).';
