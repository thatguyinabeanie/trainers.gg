-- Add RLS policies for user_group_roles table
-- Allows org owners and admins to manage staff group assignments
-- Uses helper functions to properly reference columns in policy context

-- =============================================================================
-- Helper function to get organization_id from a group_role_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_org_id_from_group_role(p_group_role_id bigint)
RETURNS bigint AS $$
  SELECT g.organization_id
  FROM public.group_roles gr
  JOIN public.groups g ON gr.group_id = g.id
  WHERE gr.id = p_group_role_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- Helper function to get role name from a group_role_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_role_name_from_group_role(p_group_role_id bigint)
RETURNS text AS $$
  SELECT r.name
  FROM public.group_roles gr
  JOIN public.roles r ON gr.role_id = r.id
  WHERE gr.id = p_group_role_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- Helper function to check if user is org owner
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id bigint, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id AND owner_user_id = p_user_id
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- Helper function to check if user has a specific role in an org
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_has_org_role(p_org_id bigint, p_user_id uuid, p_role_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    JOIN public.groups g ON gr.group_id = g.id
    JOIN public.roles r ON gr.role_id = r.id
    WHERE ugr.user_id = p_user_id
      AND g.organization_id = p_org_id
      AND r.name = p_role_name
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- 1. Policy: Org owners can manage user_group_roles for their org's groups
-- =============================================================================

-- INSERT: Org owners can add users to groups in their org
CREATE POLICY "Org owners can add users to their groups"
ON public.user_group_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_owner(
    public.get_org_id_from_group_role(group_role_id),
    auth.uid()
  )
);

-- UPDATE: Org owners can update user_group_roles for their org's groups
CREATE POLICY "Org owners can update their group roles"
ON public.user_group_roles
FOR UPDATE TO authenticated
USING (
  public.is_org_owner(
    public.get_org_id_from_group_role(group_role_id),
    auth.uid()
  )
);

-- DELETE: Org owners can remove users from groups in their org
CREATE POLICY "Org owners can remove users from their groups"
ON public.user_group_roles
FOR DELETE TO authenticated
USING (
  public.is_org_owner(
    public.get_org_id_from_group_role(group_role_id),
    auth.uid()
  )
);

-- =============================================================================
-- 2. Policy: Org admins can manage lower-level roles
-- Admins can manage head_judges and judges but not other admins
-- =============================================================================

-- INSERT: Org admins can add users to head_judge and judge groups
CREATE POLICY "Org admins can add users to lower groups"
ON public.user_group_roles
FOR INSERT TO authenticated
WITH CHECK (
  -- Target role must be head_judge or judge (not admin)
  public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
  -- User must be an admin in this org
  AND public.user_has_org_role(
    public.get_org_id_from_group_role(group_role_id),
    auth.uid(),
    'org_admin'
  )
);

-- DELETE: Org admins can remove users from head_judge and judge groups
CREATE POLICY "Org admins can remove users from lower groups"
ON public.user_group_roles
FOR DELETE TO authenticated
USING (
  -- Target role must be head_judge or judge (not admin)
  public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
  -- User must be an admin in this org
  AND public.user_has_org_role(
    public.get_org_id_from_group_role(group_role_id),
    auth.uid(),
    'org_admin'
  )
);

-- =============================================================================
-- 3. Policy: Head judges can manage judges
-- =============================================================================

-- INSERT: Head judges can add users to judge groups
CREATE POLICY "Head judges can add users to judge groups"
ON public.user_group_roles
FOR INSERT TO authenticated
WITH CHECK (
  -- Target role must be judge only
  public.get_role_name_from_group_role(group_role_id) = 'org_judge'
  -- User must be a head_judge in this org
  AND public.user_has_org_role(
    public.get_org_id_from_group_role(group_role_id),
    auth.uid(),
    'org_head_judge'
  )
);

-- DELETE: Head judges can remove users from judge groups
CREATE POLICY "Head judges can remove users from judge groups"
ON public.user_group_roles
FOR DELETE TO authenticated
USING (
  -- Target role must be judge only
  public.get_role_name_from_group_role(group_role_id) = 'org_judge'
  -- User must be a head_judge in this org
  AND public.user_has_org_role(
    public.get_org_id_from_group_role(group_role_id),
    auth.uid(),
    'org_head_judge'
  )
);
