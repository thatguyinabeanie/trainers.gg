-- =============================================================================
-- T6 follow-up: service-role bypass for enforce_registration_write_rules
-- =============================================================================
-- RATIONALE
-- ----------
-- The enforce_registration_write_rules trigger (20260618000100) determines
-- whether the caller is the row owner via auth.uid(). For a service-role caller
-- (migrations, cron/backfills, SECURITY DEFINER ops run as the postgres role)
-- auth.uid() is NULL, so `a.user_id = NULL` is never true and the caller silently
-- falls into the NON-owner (manager) path. That path is restricted to writing
-- only `status` / `team_locked`, so any legitimate server-side UPDATE touching
-- other registration columns (e.g. a future data backfill correcting
-- in_game_name / display_name_option) would be rejected with an opaque 42501.
--
-- Not exploitable today (the only service-role UPDATE — drop_registrations —
-- writes only `status`), but a hidden footgun for future ops scripts. Add an
-- explicit service-role bypass AFTER the immutability guard: a NULL auth.uid()
-- here means a trusted server-side caller (RLS already blocks anon/authenticated
-- from reaching this trigger except through the owner/staff UPDATE policies).
-- Guard 1 (immutable alt_id / tournament_id) STILL runs for every caller,
-- including service-role — those columns must never change for anyone.
-- =============================================================================

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
  -- Service-role bypass: a NULL auth.uid() is a trusted server-side caller
  -- (migration / cron / backfill). They may write any non-immutable column.
  -- Placed AFTER Guard 1 so the immutability invariant still holds for them.
  -- -------------------------------------------------------------------------
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
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
