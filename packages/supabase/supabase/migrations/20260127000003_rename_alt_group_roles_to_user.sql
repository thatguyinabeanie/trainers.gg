-- Migration: Rename alt_group_roles to user_group_roles
-- Description: Converts RBAC system from alt-level to user-level
-- Changes alt_id (bigint) to user_id (uuid) to reference auth users
-- Date: 2026-01-27

-- =============================================================================
-- DEFENSIVE CHECKS
-- =============================================================================

-- Verify no orphaned alt_id references exist
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM alt_group_roles agr
  WHERE NOT EXISTS (
    SELECT 1 FROM alts a WHERE a.id = agr.alt_id
  );
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned alt_id references in alt_group_roles. Clean up data before migration.', orphaned_count;
  END IF;
END $$;

-- =============================================================================
-- DROP OLD RLS POLICIES
-- =============================================================================
-- Will be recreated in migration 20260127000007

DROP POLICY IF EXISTS "Users can view group roles in their organizations" ON alt_group_roles;
DROP POLICY IF EXISTS "Org admins can assign group roles" ON alt_group_roles;
DROP POLICY IF EXISTS "Org admins can remove group roles" ON alt_group_roles;

-- =============================================================================
-- RENAME TABLE
-- =============================================================================

-- Rename the table
ALTER TABLE IF EXISTS alt_group_roles RENAME TO user_group_roles;

-- Rename the sequence
ALTER SEQUENCE IF EXISTS alt_group_roles_id_seq RENAME TO user_group_roles_id_seq;

-- =============================================================================
-- RENAME AND CONVERT COLUMN: alt_id → user_id
-- =============================================================================

-- Drop existing foreign key constraint
ALTER TABLE user_group_roles
DROP CONSTRAINT IF EXISTS alt_group_roles_alt_id_fkey;

-- Change column type from bigint to uuid and rename
ALTER TABLE user_group_roles
RENAME COLUMN alt_id TO user_id;

-- Drop NOT NULL constraint before type change
ALTER TABLE user_group_roles
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE user_group_roles
ALTER COLUMN user_id TYPE uuid USING NULL; -- Set all to NULL first (we have no production data)

-- Make column NOT NULL
ALTER TABLE user_group_roles
ALTER COLUMN user_id SET NOT NULL;

-- Add new foreign key constraint referencing users table
ALTER TABLE user_group_roles
ADD CONSTRAINT user_group_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- =============================================================================
-- UPDATE INDEXES
-- =============================================================================

-- Rename primary key constraint
ALTER INDEX IF EXISTS alt_group_roles_pkey RENAME TO user_group_roles_pkey;

-- Rename indexes
ALTER INDEX IF EXISTS idx_alt_group_roles_alt_id RENAME TO idx_user_group_roles_user_id;
ALTER INDEX IF EXISTS idx_alt_group_roles_group_role_id RENAME TO idx_user_group_roles_group_role_id;

-- =============================================================================
-- UPDATE UNIQUE CONSTRAINTS
-- =============================================================================

-- Drop old constraint
ALTER TABLE user_group_roles
DROP CONSTRAINT IF EXISTS alt_group_roles_alt_id_group_role_id_key;

-- Add new constraint with updated column name
ALTER TABLE user_group_roles
ADD CONSTRAINT user_group_roles_user_id_group_role_id_key 
  UNIQUE (user_id, group_role_id);

-- =============================================================================
-- UPDATE GRANTS
-- =============================================================================

-- Revoke old grants (use new table name since table was already renamed)
REVOKE ALL ON user_group_roles FROM authenticated;

-- Grant new permissions
GRANT SELECT, INSERT, DELETE ON user_group_roles TO authenticated;

-- =============================================================================
-- ADD COMMENTS
-- =============================================================================

COMMENT ON TABLE user_group_roles IS 
'Maps users to permission groups within organizations. This is the RBAC system for organization-level permissions. Note: This is user-level (staff identity), not alt-level (tournament identity).';

COMMENT ON COLUMN user_group_roles.user_id IS 
'References users table - the staff member receiving this role';

COMMENT ON COLUMN user_group_roles.group_role_id IS 
'References group_roles - the role being assigned (e.g., org_admin, org_moderator)';
