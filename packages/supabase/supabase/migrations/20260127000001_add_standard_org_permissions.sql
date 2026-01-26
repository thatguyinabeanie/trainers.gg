-- =============================================================================
-- Migration: Add Standard Organization Permissions and Roles
-- =============================================================================
-- This migration adds system-level permissions and roles required for
-- organization management. These are hardcoded infrastructure (not test data).
--
-- Creates:
-- - Standard permissions (org.manage, org.staff.manage, etc.)
-- - Standard organization roles (org_owner, org_admin, etc.)
-- - Fixed role-permission mappings
--
-- All statements are idempotent using ON CONFLICT.
-- =============================================================================

-- =============================================================================
-- Standard Permissions
-- =============================================================================
-- These permissions are referenced in application code and RLS policies.

INSERT INTO public.permissions (key, name, description) VALUES
  ('org.manage', 'Manage Organization', 'Full control over organization settings and configuration'),
  ('org.staff.manage', 'Manage Staff', 'Add, remove, and manage organization staff members'),
  ('tournament.create', 'Create Tournament', 'Create new tournaments for the organization'),
  ('tournament.manage', 'Manage Tournament', 'Edit, update, and manage tournament settings and operations'),
  ('tournament.judge', 'Judge Matches', 'Resolve match disputes and make tournament rulings'),
  ('content.moderate', 'Moderate Content', 'Moderate user-generated content within the organization')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Standard Organization Roles
-- =============================================================================
-- These roles are available to all organizations for staff management.

INSERT INTO public.roles (name, description, scope) VALUES
  ('org_owner', 'Full control over the organization', 'organization'),
  ('org_admin', 'Administrative privileges', 'organization'),
  ('org_moderator', 'Can moderate content and users', 'organization'),
  ('org_tournament_organizer', 'Can create and manage tournaments', 'organization'),
  ('org_judge', 'Can resolve match disputes', 'organization')
ON CONFLICT (name, scope) DO UPDATE SET
  description = EXCLUDED.description;

-- =============================================================================
-- Role-Permission Mappings
-- =============================================================================
-- Fixed mappings that define what each standard role can do.

-- Helper function to safely insert role-permission mappings
DO $$
DECLARE
  v_org_owner_id bigint;
  v_org_admin_id bigint;
  v_org_moderator_id bigint;
  v_org_to_id bigint;
  v_org_judge_id bigint;
  
  v_perm_org_manage bigint;
  v_perm_staff_manage bigint;
  v_perm_tournament_create bigint;
  v_perm_tournament_manage bigint;
  v_perm_tournament_judge bigint;
  v_perm_content_mod bigint;
BEGIN
  -- Get role IDs
  SELECT id INTO v_org_owner_id FROM public.roles WHERE name = 'org_owner' AND scope = 'organization';
  SELECT id INTO v_org_admin_id FROM public.roles WHERE name = 'org_admin' AND scope = 'organization';
  SELECT id INTO v_org_moderator_id FROM public.roles WHERE name = 'org_moderator' AND scope = 'organization';
  SELECT id INTO v_org_to_id FROM public.roles WHERE name = 'org_tournament_organizer' AND scope = 'organization';
  SELECT id INTO v_org_judge_id FROM public.roles WHERE name = 'org_judge' AND scope = 'organization';
  
  -- Get permission IDs
  SELECT id INTO v_perm_org_manage FROM public.permissions WHERE key = 'org.manage';
  SELECT id INTO v_perm_staff_manage FROM public.permissions WHERE key = 'org.staff.manage';
  SELECT id INTO v_perm_tournament_create FROM public.permissions WHERE key = 'tournament.create';
  SELECT id INTO v_perm_tournament_manage FROM public.permissions WHERE key = 'tournament.manage';
  SELECT id INTO v_perm_tournament_judge FROM public.permissions WHERE key = 'tournament.judge';
  SELECT id INTO v_perm_content_mod FROM public.permissions WHERE key = 'content.moderate';
  
  -- org_owner: All permissions
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_owner_id, v_perm_org_manage),
    (v_org_owner_id, v_perm_staff_manage),
    (v_org_owner_id, v_perm_tournament_create),
    (v_org_owner_id, v_perm_tournament_manage),
    (v_org_owner_id, v_perm_tournament_judge),
    (v_org_owner_id, v_perm_content_mod)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- org_admin: Everything except org.manage
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_admin_id, v_perm_staff_manage),
    (v_org_admin_id, v_perm_tournament_create),
    (v_org_admin_id, v_perm_tournament_manage),
    (v_org_admin_id, v_perm_tournament_judge),
    (v_org_admin_id, v_perm_content_mod)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- org_moderator: Content moderation only
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_moderator_id, v_perm_content_mod)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- org_tournament_organizer: Tournament management
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_to_id, v_perm_tournament_create),
    (v_org_to_id, v_perm_tournament_manage)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- org_judge: Tournament judging only
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_judge_id, v_perm_tournament_judge)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
END $$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.permissions IS 'System-level permissions that can be assigned to roles. These are hardcoded in application logic.';
COMMENT ON TABLE public.roles IS 'Standard roles available for organizations and site administration. Organization roles are shared across all orgs.';
COMMENT ON TABLE public.role_permissions IS 'Defines which permissions each role has. These mappings are fixed for standard roles.';

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Standard permissions and roles are now available for all organizations.
-- Next: Refactor organization membership from alt-based to user-based.
-- =============================================================================
