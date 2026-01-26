-- Migration: Create has_org_permission() helper function
-- Description: Centralized permission checking for organization RLS policies
-- Checks if a user has a specific permission within an organization
-- Date: 2026-01-27

-- =============================================================================
-- CREATE HELPER FUNCTION: has_org_permission
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_org_permission(
  org_id uuid,
  permission_key text
)
RETURNS boolean AS $$
BEGIN
  -- Check 1: Is the user the organization owner?
  -- Organization owners have implicit all permissions
  IF EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = org_id
      AND o.owner_user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  -- Check 2: Does the user have the permission via group roles?
  -- User must be in organization_staff AND have a role with the permission
  IF EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    INNER JOIN permission_groups pg ON ugr.group_id = pg.id
    INNER JOIN group_permissions gp ON pg.id = gp.group_id
    INNER JOIN permissions p ON gp.permission_id = p.id
    WHERE ugr.organization_id = org_id
      AND ugr.user_id = auth.uid()
      AND p.key = permission_key
  ) THEN
    RETURN true;
  END IF;

  -- No permission found
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- ADD FUNCTION COMMENT
-- =============================================================================

COMMENT ON FUNCTION public.has_org_permission(uuid, text) IS 
'Checks if the current authenticated user has a specific permission within an organization. 
First checks if user is the organization owner (implicit all permissions), 
then checks if user has the permission through their assigned roles.
Returns true if permission granted, false otherwise.';

-- =============================================================================
-- GRANT EXECUTE PERMISSION
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, text) TO authenticated;
