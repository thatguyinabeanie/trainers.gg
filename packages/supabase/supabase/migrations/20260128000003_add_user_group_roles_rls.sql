-- Add RLS policies for user_group_roles table
-- Allows org owners and admins to manage staff group assignments
-- Currently only has SELECT for everyone and ALL for service_role

-- =============================================================================
-- 1. Policy: Org owners can manage user_group_roles for their org's groups
-- =============================================================================

-- INSERT: Org owners can add users to groups in their org
CREATE POLICY "Org owners can add users to their groups"
ON public.user_group_roles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.group_roles gr
    JOIN public.groups g ON gr.id = user_group_roles.group_role_id AND gr.group_id = g.id
    JOIN public.organizations o ON g.organization_id = o.id
    WHERE o.owner_user_id = (SELECT auth.uid())
  )
);

-- UPDATE: Org owners can update user_group_roles for their org's groups
CREATE POLICY "Org owners can update their group roles"
ON public.user_group_roles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_roles gr
    JOIN public.groups g ON gr.id = user_group_roles.group_role_id AND gr.group_id = g.id
    JOIN public.organizations o ON g.organization_id = o.id
    WHERE o.owner_user_id = (SELECT auth.uid())
  )
);

-- DELETE: Org owners can remove users from groups in their org
CREATE POLICY "Org owners can remove users from their groups"
ON public.user_group_roles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_roles gr
    JOIN public.groups g ON gr.id = user_group_roles.group_role_id AND gr.group_id = g.id
    JOIN public.organizations o ON g.organization_id = o.id
    WHERE o.owner_user_id = (SELECT auth.uid())
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
  EXISTS (
    SELECT 1 
    FROM public.group_roles gr
    JOIN public.groups g ON gr.id = user_group_roles.group_role_id AND gr.group_id = g.id
    JOIN public.roles r ON gr.role_id = r.id
    -- User must have org_admin permission for this org
    WHERE r.name IN ('org_head_judge', 'org_judge')
      AND public.has_org_permission(g.organization_id, 'org.staff.manage')
      -- Ensure the current user is not just any staff, but an admin
      AND EXISTS (
        SELECT 1
        FROM public.user_group_roles ugr2
        JOIN public.group_roles gr2 ON ugr2.group_role_id = gr2.id
        JOIN public.groups g2 ON gr2.group_id = g2.id
        JOIN public.roles r2 ON gr2.role_id = r2.id
        WHERE ugr2.user_id = (SELECT auth.uid())
          AND g2.organization_id = g.organization_id
          AND r2.name = 'org_admin'
      )
  )
);

-- DELETE: Org admins can remove users from head_judge and judge groups
CREATE POLICY "Org admins can remove users from lower groups"
ON public.user_group_roles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_roles gr
    JOIN public.groups g ON gr.id = user_group_roles.group_role_id AND gr.group_id = g.id
    JOIN public.roles r ON gr.role_id = r.id
    -- Target role must be head_judge or judge (not admin)
    WHERE r.name IN ('org_head_judge', 'org_judge')
      -- User must be an admin in this org
      AND EXISTS (
        SELECT 1
        FROM public.user_group_roles ugr2
        JOIN public.group_roles gr2 ON ugr2.group_role_id = gr2.id
        JOIN public.groups g2 ON gr2.group_id = g2.id
        JOIN public.roles r2 ON gr2.role_id = r2.id
        WHERE ugr2.user_id = (SELECT auth.uid())
          AND g2.organization_id = g.organization_id
          AND r2.name = 'org_admin'
      )
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
  EXISTS (
    SELECT 1 
    FROM public.group_roles gr
    JOIN public.groups g ON gr.id = user_group_roles.group_role_id AND gr.group_id = g.id
    JOIN public.roles r ON gr.role_id = r.id
    -- Target role must be judge only
    WHERE r.name = 'org_judge'
      -- User must be a head_judge in this org
      AND EXISTS (
        SELECT 1
        FROM public.user_group_roles ugr2
        JOIN public.group_roles gr2 ON ugr2.group_role_id = gr2.id
        JOIN public.groups g2 ON gr2.group_id = g2.id
        JOIN public.roles r2 ON gr2.role_id = r2.id
        WHERE ugr2.user_id = (SELECT auth.uid())
          AND g2.organization_id = g.organization_id
          AND r2.name = 'org_head_judge'
      )
  )
);

-- DELETE: Head judges can remove users from judge groups
CREATE POLICY "Head judges can remove users from judge groups"
ON public.user_group_roles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_roles gr
    JOIN public.groups g ON gr.id = user_group_roles.group_role_id AND gr.group_id = g.id
    JOIN public.roles r ON gr.role_id = r.id
    -- Target role must be judge only
    WHERE r.name = 'org_judge'
      -- User must be a head_judge in this org
      AND EXISTS (
        SELECT 1
        FROM public.user_group_roles ugr2
        JOIN public.group_roles gr2 ON ugr2.group_role_id = gr2.id
        JOIN public.groups g2 ON gr2.group_id = g2.id
        JOIN public.roles r2 ON gr2.role_id = r2.id
        WHERE ugr2.user_id = (SELECT auth.uid())
          AND g2.organization_id = g.organization_id
          AND r2.name = 'org_head_judge'
      )
  )
);
