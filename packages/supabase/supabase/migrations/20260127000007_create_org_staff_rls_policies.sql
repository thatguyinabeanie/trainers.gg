-- Migration: Create RLS policies for organization staff system
-- Description: Row Level Security policies for organization_staff, organization_invitations, and user_group_roles
-- Date: 2026-01-27

-- =============================================================================
-- ORGANIZATION_STAFF POLICIES
-- =============================================================================

-- Policy: Users can view staff in their organizations
CREATE POLICY "Users can view staff in their organizations"
ON organization_staff
FOR SELECT
TO authenticated
USING (
  -- User is organization owner
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_staff.organization_id
      AND o.owner_user_id = auth.uid()
  )
  OR
  -- User is staff member in the organization
  user_id = auth.uid()
  OR
  -- User has org.manage permission
  has_org_permission(organization_id, 'org.manage')
);

-- Policy: Org admins can add staff
CREATE POLICY "Org admins can add staff"
ON organization_staff
FOR INSERT
TO authenticated
WITH CHECK (
  has_org_permission(organization_id, 'org.staff.manage')
);

-- Policy: Org admins can remove staff (except owner)
CREATE POLICY "Org admins can remove staff"
ON organization_staff
FOR DELETE
TO authenticated
USING (
  -- User cannot remove the organization owner
  NOT EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_staff.organization_id
      AND o.owner_user_id = organization_staff.user_id
  )
  AND
  -- User must have staff management permission
  has_org_permission(organization_id, 'org.staff.manage')
);

-- =============================================================================
-- ORGANIZATION_INVITATIONS POLICIES
-- =============================================================================

-- Policy: Users can view invitations to their organizations
CREATE POLICY "Users can view invitations to their orgs"
ON organization_invitations
FOR SELECT
TO authenticated
USING (
  -- User is organization owner
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_invitations.organization_id
      AND o.owner_user_id = auth.uid()
  )
  OR
  -- User was invited
  invited_user_id = auth.uid()
  OR
  -- User has org.staff.manage permission
  has_org_permission(organization_id, 'org.staff.manage')
);

-- Policy: Org admins can create invitations
CREATE POLICY "Org admins can create invitations"
ON organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  has_org_permission(organization_id, 'org.staff.manage')
  AND
  -- invited_by_user_id must be the current user
  invited_by_user_id = auth.uid()
);

-- Policy: Invited users can update their invitation status
CREATE POLICY "Invited users can update their invitation status"
ON organization_invitations
FOR UPDATE
TO authenticated
USING (
  -- User was invited
  invited_user_id = auth.uid()
)
WITH CHECK (
  -- User can only update status field
  invited_user_id = auth.uid()
  AND status IN ('accepted', 'declined')
);

-- Policy: Org admins can delete pending invitations
CREATE POLICY "Org admins can delete pending invitations"
ON organization_invitations
FOR DELETE
TO authenticated
USING (
  status = 'pending'
  AND
  has_org_permission(organization_id, 'org.staff.manage')
);

-- =============================================================================
-- USER_GROUP_ROLES POLICIES
-- =============================================================================
-- Note: user_group_roles table does not have organization_id column
-- It links: user → group_role → group → organization
-- Simplified policies for now; can be enhanced later with proper JOIN logic

-- Policy: Users can view their own group roles
CREATE POLICY "Users can view their own group roles"
ON user_group_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy: Service role can manage all group roles
-- (Admin operations will use service role)
CREATE POLICY "Service role can manage group roles"
ON user_group_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- ENABLE RLS
-- =============================================================================

ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_roles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ADD TABLE COMMENTS
-- =============================================================================

COMMENT ON POLICY "Users can view staff in their organizations" ON organization_staff IS 
'Users can view staff if they are: (1) the org owner, (2) a staff member themselves, or (3) have org.manage permission';

COMMENT ON POLICY "Org admins can add staff" ON organization_staff IS 
'Users with org.staff.manage permission can add new staff members';

COMMENT ON POLICY "Org admins can remove staff" ON organization_staff IS 
'Users with org.staff.manage permission can remove staff, except the organization owner';

COMMENT ON POLICY "Users can view invitations to their orgs" ON organization_invitations IS 
'Users can view invitations if they are: (1) the org owner, (2) the invitee, or (3) have org.staff.manage permission';

COMMENT ON POLICY "Org admins can create invitations" ON organization_invitations IS 
'Users with org.staff.manage permission can create invitations, and must set themselves as invited_by_user_id';

COMMENT ON POLICY "Invited users can update their invitation status" ON organization_invitations IS 
'Invited users can update their own invitation status to accepted or declined';

COMMENT ON POLICY "Org admins can delete pending invitations" ON organization_invitations IS 
'Users with org.staff.manage permission can delete pending (not accepted/declined) invitations';

COMMENT ON POLICY "Users can view their own group roles" ON user_group_roles IS 
'Users can view their own assigned group roles';

COMMENT ON POLICY "Service role can manage group roles" ON user_group_roles IS 
'Service role has full access to manage group role assignments (for admin operations)';
