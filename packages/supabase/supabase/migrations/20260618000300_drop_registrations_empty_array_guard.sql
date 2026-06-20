-- =============================================================================
-- T2: Guard drop_registrations against empty/NULL p_registration_ids
-- =============================================================================
-- RATIONALE
-- ----------
-- The 3-arg drop_registrations(bigint[], drop_category, text) function from
-- 20260617235512_drop_registrations_derive_actor.sql performs its
-- tournament.manage permission check inside a FOR loop that iterates over
-- distinct community_ids derived from p_registration_ids. When p_registration_ids
-- is NULL or an empty array, array_length() returns NULL, the FOR loop body
-- never executes, the permission check is skipped entirely, and the function
-- returns an empty SETOF bigint indicating silent "success".
--
-- An adversarial caller could pass an empty array to probe the function's
-- existence and return shape without triggering any authorization check.
-- More practically, a frontend bug that calls drop_registrations([]) would
-- silently succeed instead of surfacing an error, masking the bug.
--
-- This migration adds an early NULL/empty guard immediately after BEGIN.
-- The function body is otherwise identical to 20260617235512 — SECURITY
-- DEFINER, SET search_path = '', same 3-arg signature, same EXECUTE grants.
--
-- CREATE OR REPLACE preserves the existing EXECUTE grant on the function
-- (no DROP + re-GRANT required).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.drop_registrations(
  p_registration_ids bigint[],
  p_drop_category    public.drop_category,
  p_drop_notes       text
)
RETURNS SETOF bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r_community_id bigint;
  v_dropped_by   uuid := (SELECT auth.uid());
BEGIN
  -- -------------------------------------------------------------------------
  -- Guard: reject empty or NULL input before any permission checks or writes.
  -- array_length(arr, 1) returns NULL for an empty array and for a NULL array.
  -- -------------------------------------------------------------------------
  IF p_registration_ids IS NULL OR array_length(p_registration_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No registration ids provided'
      USING ERRCODE = '22023';
  END IF;

  -- -------------------------------------------------------------------------
  -- 0. Authorization guard (MUST run before any writes).
  --    For every distinct tournament touched by p_registration_ids, verify the
  --    caller holds tournament.manage on that tournament's community.
  --    has_community_permission() is SECURITY DEFINER and resolves the caller via
  --    (SELECT auth.uid()) from the JWT claims — so it evaluates the real calling
  --    user, not the function owner. Any failure raises 42501 and aborts the txn.
  -- -------------------------------------------------------------------------
  FOR r_community_id IN
    SELECT DISTINCT t.community_id
    FROM   public.tournament_registrations tr
    JOIN   public.tournaments t ON t.id = tr.tournament_id
    WHERE  tr.id = ANY(p_registration_ids)
  LOOP
    IF NOT public.has_community_permission(r_community_id, 'tournament.manage') THEN
      RAISE EXCEPTION
        'Caller does not have tournament.manage permission for community %',
        r_community_id
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 1. Upsert staff drop metadata FIRST. The audit_registration_status_change
  --    trigger fires on the status UPDATE below and reads
  --    drop_category/drop_notes/dropped_by from tournament_registration_staff.
  --    Both writes are in the same transaction, so the trigger sees these rows.
  --    The actor (dropped_by) is the authenticated caller — never caller-supplied.
  -- -------------------------------------------------------------------------
  INSERT INTO public.tournament_registration_staff
    (registration_id, drop_category, drop_notes, dropped_by, dropped_at)
  SELECT
    id,
    p_drop_category,
    NULLIF(p_drop_notes, ''),
    v_dropped_by,
    now()
  FROM unnest(p_registration_ids) AS id
  ON CONFLICT (registration_id) DO UPDATE SET
    drop_category = EXCLUDED.drop_category,
    drop_notes    = EXCLUDED.drop_notes,
    dropped_by    = EXCLUDED.dropped_by,
    dropped_at    = EXCLUDED.dropped_at;

  -- -------------------------------------------------------------------------
  -- 2. Flip status to 'dropped' on the base table — same transaction, so the
  --    audit trigger reads the staff rows written above. Atomic.
  -- -------------------------------------------------------------------------
  RETURN QUERY
  UPDATE public.tournament_registrations
  SET    status = 'dropped'
  WHERE  id = ANY(p_registration_ids)
  RETURNING id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.drop_registrations(bigint[], public.drop_category, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.drop_registrations(bigint[], public.drop_category, text) TO authenticated;
