-- =============================================================================
-- drop_registrations: derive actor from auth.uid() (anti-spoof) + NULL-normalize notes
-- =============================================================================
-- Supersedes the 4-arg drop_registrations from 20260617223912. That version took
-- `p_dropped_by uuid` and trusted it — but the function is SECURITY DEFINER, so a
-- manager could pass ANY uuid and spoof the actor recorded in
-- tournament_registration_staff (and therefore audit_log). Flagged in Copilot
-- security review.
--
-- This drops the 4-arg overload and recreates drop_registrations WITHOUT the
-- p_dropped_by param: the actor is derived inside the function via
-- `(SELECT auth.uid())`, which returns the real JWT caller even under SECURITY
-- DEFINER — so it cannot be spoofed. Empty notes are normalized to NULL via
-- NULLIF (callers pass "" to satisfy the non-nullable generated type).
--
-- A NEW migration (not an edit of 20260617223912) because that migration is
-- already applied on environments that apply migrations incrementally
-- (`supabase db push` by version) — an in-place edit would not re-run there, and
-- this is a SIGNATURE change (4-arg → 3-arg), so DROP + CREATE is required.
-- =============================================================================

-- Remove the old 4-arg overload so only the 3-arg (auth.uid-derived) form remains.
DROP FUNCTION IF EXISTS public.drop_registrations(bigint[], public.drop_category, text, uuid);

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
