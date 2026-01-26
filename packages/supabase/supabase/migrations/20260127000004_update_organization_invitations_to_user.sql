-- Migration: Update organization_invitations to use user_id
-- Description: Converts invitation system from alt-level to user-level
-- Changes invited_alt_id and invited_by_alt_id to uuid user references
-- Date: 2026-01-27

-- =============================================================================
-- DEFENSIVE CHECKS
-- =============================================================================

-- Verify no orphaned alt_id references exist
DO $$
DECLARE
  orphaned_invited_count INTEGER;
  orphaned_invited_by_count INTEGER;
BEGIN
  -- Check invited_alt_id
  SELECT COUNT(*) INTO orphaned_invited_count
  FROM organization_invitations oi
  WHERE oi.invited_alt_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM alts a WHERE a.id = oi.invited_alt_id
    );
  
  -- Check invited_by_alt_id
  SELECT COUNT(*) INTO orphaned_invited_by_count
  FROM organization_invitations oi
  WHERE oi.invited_by_alt_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM alts a WHERE a.id = oi.invited_by_alt_id
    );
  
  IF orphaned_invited_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned invited_alt_id references in organization_invitations. Clean up data before migration.', orphaned_invited_count;
  END IF;
  
  IF orphaned_invited_by_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned invited_by_alt_id references in organization_invitations. Clean up data before migration.', orphaned_invited_by_count;
  END IF;
END $$;

-- =============================================================================
-- DROP OLD RLS POLICIES
-- =============================================================================
-- Will be recreated in migration 20260127000007

DROP POLICY IF EXISTS "Users can view invitations to their orgs" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Invited users can update their invitation status" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can delete pending invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Org invitations viewable by involved parties" ON organization_invitations;

-- =============================================================================
-- UPDATE invited_alt_id → invited_user_id
-- =============================================================================

-- Drop existing foreign key constraint
ALTER TABLE organization_invitations
DROP CONSTRAINT IF EXISTS organization_invitations_invited_alt_id_fkey;

-- Rename column
ALTER TABLE organization_invitations
RENAME COLUMN invited_alt_id TO invited_user_id;

-- Change type from bigint to uuid
ALTER TABLE organization_invitations
ALTER COLUMN invited_user_id TYPE uuid USING NULL; -- Set all to NULL first (we have no production data)

-- Add new foreign key constraint referencing users table
ALTER TABLE organization_invitations
ADD CONSTRAINT organization_invitations_invited_user_id_fkey 
  FOREIGN KEY (invited_user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- =============================================================================
-- UPDATE invited_by_alt_id → invited_by_user_id
-- =============================================================================

-- Drop existing foreign key constraint
ALTER TABLE organization_invitations
DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_alt_id_fkey;

-- Rename column
ALTER TABLE organization_invitations
RENAME COLUMN invited_by_alt_id TO invited_by_user_id;

-- Drop NOT NULL constraint before type change
ALTER TABLE organization_invitations
ALTER COLUMN invited_by_user_id DROP NOT NULL;

-- Change type from bigint to uuid
ALTER TABLE organization_invitations
ALTER COLUMN invited_by_user_id TYPE uuid USING NULL; -- Set all to NULL first (we have no production data)

-- Make column NOT NULL (invited_by is required)
ALTER TABLE organization_invitations
ALTER COLUMN invited_by_user_id SET NOT NULL;

-- Add new foreign key constraint referencing users table
ALTER TABLE organization_invitations
ADD CONSTRAINT organization_invitations_invited_by_user_id_fkey 
  FOREIGN KEY (invited_by_user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- =============================================================================
-- UPDATE INDEXES
-- =============================================================================

-- Rename indexes
ALTER INDEX IF EXISTS idx_organization_invitations_invited_alt_id 
  RENAME TO idx_organization_invitations_invited_user_id;

ALTER INDEX IF EXISTS idx_organization_invitations_invited_by_alt_id 
  RENAME TO idx_organization_invitations_invited_by_user_id;

ALTER INDEX IF EXISTS idx_organization_invitations_organization_id 
  RENAME TO idx_organization_invitations_org_id;

ALTER INDEX IF EXISTS idx_organization_invitations_status 
  RENAME TO idx_organization_invitations_status;

-- =============================================================================
-- UPDATE UNIQUE CONSTRAINTS
-- =============================================================================

-- Drop old constraint (if it exists)
ALTER TABLE organization_invitations
DROP CONSTRAINT IF EXISTS organization_invitations_organization_id_invited_alt_id_key;

-- Add new constraint to prevent duplicate invitations
-- One invitation per user per organization (regardless of status)
ALTER TABLE organization_invitations
DROP CONSTRAINT IF EXISTS organization_invitations_org_user_unique;

ALTER TABLE organization_invitations
ADD CONSTRAINT organization_invitations_org_user_unique 
  UNIQUE (organization_id, invited_user_id);

-- =============================================================================
-- ADD COMMENTS
-- =============================================================================

COMMENT ON TABLE organization_invitations IS 
'Invitations to join an organization as staff. Uses user_id (staff identity), not alt_id (tournament identity). Acceptance automatically creates organization_staff record via trigger.';

COMMENT ON COLUMN organization_invitations.invited_user_id IS 
'References users table - the user being invited to join the organization staff';

COMMENT ON COLUMN organization_invitations.invited_by_user_id IS 
'References users table - the staff member who sent the invitation';

COMMENT ON COLUMN organization_invitations.status IS 
'Invitation status: pending (default), accepted, declined, expired';
