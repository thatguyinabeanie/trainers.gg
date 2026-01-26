-- =============================================================================
-- Migration: Rename organization_members to organization_staff
-- =============================================================================
-- Refactors organization membership from alt-based to user-based identity.
--
-- Changes:
-- - organization_members → organization_staff (table rename)
-- - alt_id → user_id (column rename + type change bigint → uuid)
-- - Update all constraints, indexes, and foreign keys
-- - Drop old policies (will be recreated in later migration)
--
-- Rationale:
-- - "Staff" terminology is clearer (not confused with tournament participants)
-- - User-level identity for organization roles (alts are for tournament play)
-- - Org staff/permissions are tied to the person, not competitive identity
-- =============================================================================

-- =============================================================================
-- Defensive Checks
-- =============================================================================
-- Verify no orphaned references before migration

DO $$
BEGIN
  -- Check for invalid alt_id references
  IF EXISTS (
    SELECT 1 FROM public.organization_members om
    LEFT JOIN public.alts a ON a.id = om.alt_id
    WHERE om.alt_id IS NOT NULL AND a.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Found organization_members records with invalid alt_id references. Please clean data before migration.';
  END IF;
  
  RAISE NOTICE 'Data validation passed: No orphaned references found';
END $$;

-- =============================================================================
-- Drop Existing Policies
-- =============================================================================
-- These will be recreated in migration 20260127000007 with new table/column names

DROP POLICY IF EXISTS "Org members are viewable by everyone" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can remove members" ON public.organization_members;

-- Drop tournament policies that reference organization_members/organization_staff
-- These will be recreated after the table/column migration completes
DROP POLICY IF EXISTS "Org members can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Org members can update tournaments" ON public.tournaments;

-- =============================================================================
-- Rename Table
-- =============================================================================

ALTER TABLE public.organization_members RENAME TO organization_staff;

-- =============================================================================
-- Rename Sequence
-- =============================================================================

ALTER SEQUENCE IF EXISTS public.organization_members_id_seq 
  RENAME TO organization_staff_id_seq;

-- =============================================================================
-- Rename Indexes
-- =============================================================================

ALTER INDEX IF EXISTS public.organization_members_pkey 
  RENAME TO organization_staff_pkey;

ALTER INDEX IF EXISTS public.idx_org_members_org 
  RENAME TO idx_org_staff_org;

ALTER INDEX IF EXISTS public.idx_org_members_alt 
  RENAME TO idx_org_staff_user;

-- =============================================================================
-- Update Constraints - Drop Old
-- =============================================================================

ALTER TABLE public.organization_staff 
  DROP CONSTRAINT IF EXISTS organization_members_organization_id_alt_id_key;

ALTER TABLE public.organization_staff 
  DROP CONSTRAINT IF EXISTS organization_members_alt_id_fkey;

ALTER TABLE public.organization_staff 
  DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;

-- =============================================================================
-- Rename Column: alt_id → user_id
-- =============================================================================

ALTER TABLE public.organization_staff 
  RENAME COLUMN alt_id TO user_id;

-- =============================================================================
-- Change Column Type: bigint → uuid
-- =============================================================================
-- Using NULL since there's no production data to migrate

-- Drop NOT NULL constraint before type change
ALTER TABLE public.organization_staff 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.organization_staff 
  ALTER COLUMN user_id TYPE uuid USING NULL;

-- Re-add NOT NULL constraint after type change
ALTER TABLE public.organization_staff 
  ALTER COLUMN user_id SET NOT NULL;

-- =============================================================================
-- Update Constraints - Add New
-- =============================================================================

-- Unique constraint: one user can only be staff once per organization
ALTER TABLE public.organization_staff 
  ADD CONSTRAINT organization_staff_organization_id_user_id_key 
  UNIQUE (organization_id, user_id);

-- Foreign key to organizations (keep ON DELETE CASCADE)
ALTER TABLE public.organization_staff 
  ADD CONSTRAINT organization_staff_organization_id_fkey 
  FOREIGN KEY (organization_id) 
  REFERENCES public.organizations(id) 
  ON DELETE CASCADE;

-- Foreign key to users (CASCADE removes staff when user deleted)
ALTER TABLE public.organization_staff 
  ADD CONSTRAINT organization_staff_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

-- =============================================================================
-- Update Grants
-- =============================================================================

GRANT ALL ON TABLE public.organization_staff TO anon;
GRANT ALL ON TABLE public.organization_staff TO authenticated;
GRANT ALL ON TABLE public.organization_staff TO service_role;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.organization_staff IS 
  'Organization staff members (user-level). Staff roles and permissions are tied to users, not alts. Alts are used for tournament participation only.';

COMMENT ON COLUMN public.organization_staff.user_id IS 
  'The user who is a staff member. Uses user_id (not alt_id) because staff roles are person-level.';

-- =============================================================================
-- Recreate Tournament Policies
-- =============================================================================
-- Recreate tournament policies that were dropped earlier with updated table name

CREATE POLICY "Org members can create tournaments" ON public.tournaments 
    FOR INSERT WITH CHECK (EXISTS ( 
        SELECT 1 FROM public.organizations o
        WHERE o.id = tournaments.organization_id 
        AND (
            o.owner_user_id = auth.uid()
            OR EXISTS ( 
                SELECT 1 FROM public.organization_staff os
                WHERE os.organization_id = tournaments.organization_id 
                AND os.user_id = auth.uid()
            )
        )
    ));

CREATE POLICY "Org members can update tournaments" ON public.tournaments
    FOR UPDATE USING (EXISTS ( 
        SELECT 1 FROM public.organizations o
        WHERE o.id = tournaments.organization_id 
        AND (
            o.owner_user_id = auth.uid()
            OR EXISTS ( 
                SELECT 1 FROM public.organization_staff os
                WHERE os.organization_id = tournaments.organization_id 
                AND os.user_id = auth.uid()
            )
        )
    ));

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- organization_members → organization_staff (user-based)
-- Next: Rename alt_group_roles → user_group_roles
-- =============================================================================
