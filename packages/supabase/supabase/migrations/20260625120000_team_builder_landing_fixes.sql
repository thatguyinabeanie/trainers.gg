-- Team Builder Landing — Phase 2 follow-up fixes
-- 1. Redefine reorder_teams as SECURITY INVOKER (removes unnecessary privilege
--    escalation — the existing teams UPDATE RLS policy enforces ownership, so
--    running as the function owner adds no benefit and defeats layered RLS).
-- 2. Add NULL/type guard so reorder_teams handles null or non-array input safely.
-- 3. Add column comments for non-obvious nullable semantics.
-- 4. Document the intentional absence of an UPDATE policy on team_folder_members.

-- =============================================================================
-- 1. Redefine reorder_teams as SECURITY INVOKER + add NULL guard
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reorder_teams(p_orders jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item jsonb;
BEGIN
  IF p_orders IS NULL OR jsonb_typeof(p_orders) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_orders)
  LOOP
    UPDATE public.teams t
    SET sort_order = (v_item->>'sort_order')::integer
    WHERE t.id = (v_item->>'team_id')::bigint
      AND t.created_by IN (
        SELECT id FROM public.alts WHERE user_id = (SELECT auth.uid())
      );
  END LOOP;
END;
$$;

-- REVOKE/GRANT unchanged — callers are already restricted to authenticated.
-- Re-applying to be explicit after CREATE OR REPLACE resets grants.
REVOKE ALL ON FUNCTION public.reorder_teams(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_teams(jsonb) TO authenticated;

-- =============================================================================
-- 2. Column comments
-- =============================================================================
COMMENT ON COLUMN public.teams.sort_order IS
  'NULL = default (updated_at desc) sort; non-null = user-defined custom position within Custom-order sort mode.';

COMMENT ON COLUMN public.smart_folders.is_seeded IS
  'TRUE = system-seeded default folder (Incomplete / Illegal / Recently edited). '
  'App layer must not allow users to set this flag directly — RLS permits the write '
  'but server actions must never expose is_seeded as a user-controlled field.';

-- =============================================================================
-- 3. Document the intentional absence of an UPDATE policy on team_folder_members
-- =============================================================================
COMMENT ON TABLE public.team_folder_members IS
  'Many-to-many join between team_folders and teams. '
  'Rows are immutable once inserted — no UPDATE policy is intentional. '
  'The only write operations are INSERT (add team to folder) and DELETE (remove team from folder).';
