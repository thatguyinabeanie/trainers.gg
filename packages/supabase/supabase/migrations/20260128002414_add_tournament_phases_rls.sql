-- =============================================================================
-- Add RLS policies for tournament_phases
-- =============================================================================
--
-- The tournament_phases table has RLS enabled but was missing INSERT/UPDATE/DELETE
-- policies, causing phase creation to fail.
--
-- Permission model:
-- - SELECT: Everyone can view tournament phases (public data)
-- - INSERT/UPDATE/DELETE: Users with 'tournament.manage' permission
--   This includes: org_owner, org_admin, org_tournament_organizer
--
-- Uses has_org_permission() helper function for consistent permission checking.

-- =============================================================================
-- Tournament Phases Policies
-- =============================================================================

-- Allow everyone to view tournament phases
DROP POLICY IF EXISTS "Tournament phases are viewable by everyone" ON "public"."tournament_phases";
CREATE POLICY "Tournament phases are viewable by everyone"
    ON "public"."tournament_phases" FOR SELECT USING (true);

-- Allow users with tournament.manage permission to insert phases
DROP POLICY IF EXISTS "Org owners can insert tournament phases" ON "public"."tournament_phases";
DROP POLICY IF EXISTS "Staff with permission can insert tournament phases" ON "public"."tournament_phases";
CREATE POLICY "Staff with permission can insert tournament phases"
    ON "public"."tournament_phases" FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_phases"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

-- Allow users with tournament.manage permission to update phases
DROP POLICY IF EXISTS "Org owners can update tournament phases" ON "public"."tournament_phases";
DROP POLICY IF EXISTS "Staff with permission can update tournament phases" ON "public"."tournament_phases";
CREATE POLICY "Staff with permission can update tournament phases"
    ON "public"."tournament_phases" FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_phases"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

-- Allow users with tournament.manage permission to delete phases
DROP POLICY IF EXISTS "Org owners can delete tournament phases" ON "public"."tournament_phases";
DROP POLICY IF EXISTS "Staff with permission can delete tournament phases" ON "public"."tournament_phases";
CREATE POLICY "Staff with permission can delete tournament phases"
    ON "public"."tournament_phases" FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_phases"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );
