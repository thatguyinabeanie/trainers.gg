-- =============================================================================
-- Atomic drop_registrations RPC
-- =============================================================================
-- RATIONALE
-- ----------
-- The two-step drop flow (upsert tournament_registration_staff THEN update
-- tournament_registrations.status) was non-atomic: if the status update failed
-- after the staff upsert succeeded, you ended up with a staff-drop row but no
-- 'dropped' status — inconsistent state with no clear recovery path.
--
-- This function wraps both writes in a single plpgsql function. Both the staff
-- upsert and the status UPDATE execute in the same transaction, so they either
-- both commit or both roll back together. The audit_registration_status_change
-- trigger fires on the status UPDATE and reads drop_category/drop_notes/
-- dropped_by from tournament_registration_staff — because the INSERT precedes
-- the UPDATE within the same transaction, the trigger sees the staff rows even
-- though the transaction has not yet committed.
--
-- SECURITY DEFINER + internal tournament.manage guard
-- ----------------------------------------------------
-- SECURITY DEFINER means the function executes as the function owner (postgres)
-- rather than as the calling authenticated user. This is required because
-- tournament_registrations has only a "Users can update own registration" UPDATE
-- policy — a manager trying to drop another player's registration would be
-- filtered to 0 rows under SECURITY INVOKER, making the RPC silently do
-- nothing instead of actually dropping the registration.
--
-- Every other peer manager-action RPC in this schema uses the same pattern
-- (report_match_result, start_match, advance_to_top_cut,
-- accept_tournament_invitation_atomic).
--
-- Because SECURITY DEFINER bypasses all RLS, an explicit authorization guard
-- runs FIRST inside the function body. The guard resolves the community_id for
-- every target tournament and calls public.has_community_permission() for each.
-- If ANY tournament fails the check, the function raises SQLSTATE 42501
-- (insufficient_privilege) and the entire transaction is aborted — no writes
-- occur. Without this guard any authenticated user could drop arbitrary
-- registrations via a direct PostgREST rpc() call.
--
-- auth.uid() returns the CALLER's id even inside a SECURITY DEFINER function —
-- Supabase sets request.jwt.claims before the function is invoked, and
-- has_community_permission() reads (SELECT auth.uid()) from that JWT claim.
--
-- GRANT EXECUTE TO authenticated
-- --------------------------------
-- The function is callable by any authenticated session; the internal
-- tournament.manage guard is the real access gate. Anon callers cannot execute
-- this function (not granted to anon).
--
-- IDEMPOTENCY
-- -----------
-- CREATE OR REPLACE FUNCTION is safe to replay. The GRANT is a no-op if it
-- was already issued.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.drop_registrations(
  p_registration_ids bigint[],
  p_drop_category    public.drop_category,
  p_drop_notes       text,
  p_dropped_by       uuid
)
RETURNS SETOF bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r_community_id bigint;
BEGIN
  -- -------------------------------------------------------------------------
  -- 0. Authorization guard (MUST run before any writes).
  --
  --    For every distinct tournament touched by p_registration_ids, verify
  --    the caller holds tournament.manage on that tournament's community.
  --    has_community_permission() is SECURITY DEFINER itself and resolves
  --    the caller via (SELECT auth.uid()) from the JWT claims — so this check
  --    always evaluates the real calling user, not the function owner.
  --
  --    If any community fails the check, raise insufficient_privilege (42501)
  --    and abort the entire transaction.
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
  -- 1. Upsert staff drop metadata FIRST.
  --    The audit_registration_status_change trigger fires on the status UPDATE
  --    below and SELECTs drop_category/drop_notes/dropped_by from
  --    tournament_registration_staff. Because both writes are in the same
  --    transaction, the trigger sees these rows even before COMMIT.
  -- -------------------------------------------------------------------------
  INSERT INTO public.tournament_registration_staff
    (registration_id, drop_category, drop_notes, dropped_by, dropped_at)
  SELECT
    id,
    p_drop_category,
    p_drop_notes,
    p_dropped_by,
    now()
  FROM unnest(p_registration_ids) AS id
  ON CONFLICT (registration_id) DO UPDATE SET
    drop_category = EXCLUDED.drop_category,
    drop_notes    = EXCLUDED.drop_notes,
    dropped_by    = EXCLUDED.dropped_by,
    dropped_at    = EXCLUDED.dropped_at;

  -- -------------------------------------------------------------------------
  -- 2. Flip status to 'dropped' on the base table.
  --    The audit trigger fires here and reads the staff rows written above.
  --    Both writes commit or roll back together — atomicity guaranteed.
  -- -------------------------------------------------------------------------
  RETURN QUERY
  UPDATE public.tournament_registrations
  SET    status = 'dropped'
  WHERE  id = ANY(p_registration_ids)
  RETURNING id;
END;
$$;

COMMENT ON FUNCTION public.drop_registrations(bigint[], public.drop_category, text, uuid) IS
  'Atomically upserts staff drop metadata and flips registration status to '
  '''dropped'' in a single transaction. The audit_registration_status_change '
  'trigger fires on the UPDATE and reads drop_category/drop_notes/dropped_by '
  'from tournament_registration_staff — the INSERT precedes the UPDATE in the '
  'same transaction so the trigger always sees the staff rows. '
  'SECURITY DEFINER: bypasses RLS so managers can drop other players'' '
  'registrations (the own-row UPDATE policy would otherwise block them). '
  'An internal tournament.manage authorization guard runs first — it resolves '
  'community_id for every target tournament and calls '
  'has_community_permission(community_id, ''tournament.manage'') for each; any '
  'failure raises SQLSTATE 42501 (insufficient_privilege) and aborts the '
  'transaction. auth.uid() inside has_community_permission() always resolves '
  'the JWT caller, not the function owner.';

-- Allow any authenticated user to call the function; the internal
-- tournament.manage authorization guard is the real access gate.
-- Anon callers are not granted.
GRANT EXECUTE ON FUNCTION public.drop_registrations(bigint[], public.drop_category, text, uuid)
  TO authenticated;
