-- =============================================================================
-- Merge duplicate permissive SELECT policies on user_group_roles
-- =============================================================================
--
-- RLS Audit finding #8: Two permissive SELECT policies exist for the
-- `authenticated` role on public.user_group_roles. Because PostgreSQL ORs
-- all permissive policies for the same role together, having two separate
-- policies is functionally equivalent but triggers the Supabase
-- "multiple permissive policies" performance/clarity advisory.
--
-- Policies being merged:
--   1. "Users can view their own group roles"
--      USING (user_id = (SELECT auth.uid()))
--      Created: 20260328023929_rename_organizations_to_communities.sql
--
--   2. "Community managers can view group roles"
--      USING (
--        is_community_owner(get_community_id_from_group_role(group_role_id), (SELECT auth.uid()))
--        OR user_has_community_role(get_community_id_from_group_role(group_role_id), (SELECT auth.uid()), 'org_admin')
--      )
--      Created: 20260505194312_fix_user_group_roles_select_rls.sql
--
-- The merged policy ORs all three conditions into a single USING clause,
-- which is semantically identical and resolves the advisory.
-- =============================================================================

-- Drop both existing SELECT policies (idempotent)
DROP POLICY IF EXISTS "Users can view their own group roles" ON public.user_group_roles;
DROP POLICY IF EXISTS "Community managers can view group roles" ON public.user_group_roles;

-- Merged SELECT policy: users see their own rows OR rows in communities they manage
CREATE POLICY "Authenticated users can view relevant group roles"
  ON public.user_group_roles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own role assignments
    user_id = (SELECT auth.uid())
    -- Community owners can see all role assignments for their community's groups
    OR is_community_owner(
      get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid())
    )
    -- Community admins (org_admin role) can see all role assignments for their community's groups
    OR user_has_community_role(
      get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_admin'
    )
  );
