-- =============================================================================
-- Migration: Simplify Organization Roles and Create Default Groups
-- =============================================================================
-- This migration:
-- 1. Adds org_head_judge role (manages judges, runs tournaments)
-- 2. Updates permission mappings for simplified role structure
-- 3. Creates trigger to auto-create default groups on org creation
-- 4. Backfills groups for existing organizations
--
-- Role structure after this migration:
-- - org_admin: Full org management (except ownership)
-- - org_head_judge: Manages judges, runs tournaments
-- - org_judge: Tournament operations (judging matches)
--
-- Deprecated roles (kept for backwards compatibility but not used):
-- - org_owner (owner is a column on organizations, not a role)
-- - org_moderator (merged into judge)
-- - org_tournament_organizer (merged into admin/head_judge)
-- =============================================================================

-- =============================================================================
-- 1. Add org_head_judge role
-- =============================================================================

INSERT INTO public.roles (name, description, scope) VALUES
  ('org_head_judge', 'Manages judges and runs tournament operations', 'organization')
ON CONFLICT (name, scope) DO UPDATE SET
  description = EXCLUDED.description;

-- =============================================================================
-- 2. Update role-permission mappings
-- =============================================================================

DO $$
DECLARE
  v_org_admin_id bigint;
  v_org_head_judge_id bigint;
  v_org_judge_id bigint;
  
  v_perm_staff_manage bigint;
  v_perm_tournament_create bigint;
  v_perm_tournament_manage bigint;
  v_perm_tournament_judge bigint;
  v_perm_content_mod bigint;
BEGIN
  -- Get role IDs
  SELECT id INTO v_org_admin_id FROM public.roles WHERE name = 'org_admin' AND scope = 'organization';
  SELECT id INTO v_org_head_judge_id FROM public.roles WHERE name = 'org_head_judge' AND scope = 'organization';
  SELECT id INTO v_org_judge_id FROM public.roles WHERE name = 'org_judge' AND scope = 'organization';
  
  -- Get permission IDs
  SELECT id INTO v_perm_staff_manage FROM public.permissions WHERE key = 'org.staff.manage';
  SELECT id INTO v_perm_tournament_create FROM public.permissions WHERE key = 'tournament.create';
  SELECT id INTO v_perm_tournament_manage FROM public.permissions WHERE key = 'tournament.manage';
  SELECT id INTO v_perm_tournament_judge FROM public.permissions WHERE key = 'tournament.judge';
  SELECT id INTO v_perm_content_mod FROM public.permissions WHERE key = 'content.moderate';
  
  -- org_admin: Staff management, tournament creation/management, judging, moderation
  -- (Already has these from previous migration, ensure they exist)
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_admin_id, v_perm_staff_manage),
    (v_org_admin_id, v_perm_tournament_create),
    (v_org_admin_id, v_perm_tournament_manage),
    (v_org_admin_id, v_perm_tournament_judge),
    (v_org_admin_id, v_perm_content_mod)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- org_head_judge: Tournament management, judging, content moderation
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_head_judge_id, v_perm_tournament_manage),
    (v_org_head_judge_id, v_perm_tournament_judge),
    (v_org_head_judge_id, v_perm_content_mod)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- org_judge: Judging only (already set from previous migration)
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (v_org_judge_id, v_perm_tournament_judge)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
END $$;

-- =============================================================================
-- 3. Create function to create default groups for an organization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_default_org_groups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_admin_role_id bigint;
  v_org_head_judge_role_id bigint;
  v_org_judge_role_id bigint;
  v_admins_group_id bigint;
  v_head_judges_group_id bigint;
  v_judges_group_id bigint;
BEGIN
  -- Get role IDs
  SELECT id INTO v_org_admin_role_id FROM public.roles WHERE name = 'org_admin' AND scope = 'organization';
  SELECT id INTO v_org_head_judge_role_id FROM public.roles WHERE name = 'org_head_judge' AND scope = 'organization';
  SELECT id INTO v_org_judge_role_id FROM public.roles WHERE name = 'org_judge' AND scope = 'organization';
  
  -- Create Admins group
  INSERT INTO public.groups (organization_id, name, description)
  VALUES (NEW.id, 'Admins', 'Organization administrators with full management access')
  RETURNING id INTO v_admins_group_id;
  
  -- Create Head Judges group
  INSERT INTO public.groups (organization_id, name, description)
  VALUES (NEW.id, 'Head Judges', 'Senior judges who manage tournament operations and other judges')
  RETURNING id INTO v_head_judges_group_id;
  
  -- Create Judges group
  INSERT INTO public.groups (organization_id, name, description)
  VALUES (NEW.id, 'Judges', 'Tournament judges who handle match rulings')
  RETURNING id INTO v_judges_group_id;
  
  -- Link groups to roles
  INSERT INTO public.group_roles (group_id, role_id) VALUES
    (v_admins_group_id, v_org_admin_role_id),
    (v_head_judges_group_id, v_org_head_judge_role_id),
    (v_judges_group_id, v_org_judge_role_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists to ensure clean state)
DROP TRIGGER IF EXISTS create_default_org_groups_trigger ON public.organizations;

CREATE TRIGGER create_default_org_groups_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_org_groups();

COMMENT ON FUNCTION public.create_default_org_groups() IS 
  'Automatically creates default groups (Admins, Head Judges, Judges) when a new organization is created';

-- =============================================================================
-- 4. Backfill groups for existing organizations that don't have them
-- =============================================================================

DO $$
DECLARE
  v_org record;
  v_org_admin_role_id bigint;
  v_org_head_judge_role_id bigint;
  v_org_judge_role_id bigint;
  v_admins_group_id bigint;
  v_head_judges_group_id bigint;
  v_judges_group_id bigint;
BEGIN
  -- Get role IDs
  SELECT id INTO v_org_admin_role_id FROM public.roles WHERE name = 'org_admin' AND scope = 'organization';
  SELECT id INTO v_org_head_judge_role_id FROM public.roles WHERE name = 'org_head_judge' AND scope = 'organization';
  SELECT id INTO v_org_judge_role_id FROM public.roles WHERE name = 'org_judge' AND scope = 'organization';
  
  -- Loop through organizations that don't have an Admins group yet
  FOR v_org IN 
    SELECT o.id 
    FROM public.organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.organization_id = o.id AND g.name = 'Admins'
    )
  LOOP
    -- Create Admins group
    INSERT INTO public.groups (organization_id, name, description)
    VALUES (v_org.id, 'Admins', 'Organization administrators with full management access')
    RETURNING id INTO v_admins_group_id;
    
    -- Create Head Judges group
    INSERT INTO public.groups (organization_id, name, description)
    VALUES (v_org.id, 'Head Judges', 'Senior judges who manage tournament operations and other judges')
    RETURNING id INTO v_head_judges_group_id;
    
    -- Create Judges group
    INSERT INTO public.groups (organization_id, name, description)
    VALUES (v_org.id, 'Judges', 'Tournament judges who handle match rulings')
    RETURNING id INTO v_judges_group_id;
    
    -- Link groups to roles
    INSERT INTO public.group_roles (group_id, role_id) VALUES
      (v_admins_group_id, v_org_admin_role_id),
      (v_head_judges_group_id, v_org_head_judge_role_id),
      (v_judges_group_id, v_org_judge_role_id);
  END LOOP;
END $$;

-- =============================================================================
-- 5. Add comments for clarity
-- =============================================================================

COMMENT ON TABLE public.groups IS 
  'Organization-scoped groups that contain staff members. Each group is linked to a role via group_roles.';

COMMENT ON TABLE public.group_roles IS 
  'Links groups to roles. Defines what role(s) members of a group have within the organization.';

COMMENT ON TABLE public.user_group_roles IS 
  'Links users to group_roles. This is how staff members are assigned to groups and receive their permissions.';

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Organizations now have default groups created automatically.
-- Staff can be added to groups to receive appropriate permissions.
-- =============================================================================
