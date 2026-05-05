-- Fix user_group_roles SELECT RLS policy
--
-- Problem: The existing SELECT policy only allows users to see their OWN
-- group role assignments (user_id = auth.uid()). This prevents community
-- owners and staff managers from seeing other users' role assignments,
-- which breaks the staff management UI (everyone appears "Unassigned")
-- and causes duplicate-key errors when moving staff (DELETE can't "see"
-- rows to delete them via PostgREST).
--
-- Fix: Add a SELECT policy that allows community owners and admins to
-- see all user_group_roles for groups in their community.

-- Community owners and admins can view all group role assignments for their community
CREATE POLICY "Community managers can view group roles"
  ON public.user_group_roles
  FOR SELECT
  TO authenticated
  USING (
    is_community_owner(
      get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid())
    )
    OR user_has_community_role(
      get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_admin'
    )
  );
