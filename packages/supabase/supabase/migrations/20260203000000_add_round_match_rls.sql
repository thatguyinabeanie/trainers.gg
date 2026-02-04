-- =============================================================================
-- Add write RLS policies for tournament_rounds, tournament_matches,
-- tournament_pairings, and tournament_standings
-- =============================================================================
--
-- These tables had RLS enabled with only SELECT policies, blocking all writes
-- from authenticated users even when they had the correct org permissions.
--
-- Permission model (matches tournament_phases pattern):
-- - SELECT: Everyone (already exists, unchanged)
-- - INSERT/UPDATE/DELETE: Users with 'tournament.manage' permission
--   This includes: org_owner, org_admin, org_tournament_organizer
--
-- For tournament_matches, UPDATE is also allowed for match participants
-- (players reporting their own match results).

-- =============================================================================
-- tournament_rounds
-- Joins: tournament_rounds → tournament_phases → tournaments
-- =============================================================================

DROP POLICY IF EXISTS "Staff can insert tournament rounds" ON "public"."tournament_rounds";
CREATE POLICY "Staff can insert tournament rounds"
    ON "public"."tournament_rounds" FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_phases" "p"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "p"."id" = "tournament_rounds"."phase_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can update tournament rounds" ON "public"."tournament_rounds";
CREATE POLICY "Staff can update tournament rounds"
    ON "public"."tournament_rounds" FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_phases" "p"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "p"."id" = "tournament_rounds"."phase_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can delete tournament rounds" ON "public"."tournament_rounds";
CREATE POLICY "Staff can delete tournament rounds"
    ON "public"."tournament_rounds" FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_phases" "p"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "p"."id" = "tournament_rounds"."phase_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

-- =============================================================================
-- tournament_matches
-- Joins: tournament_matches → tournament_rounds → tournament_phases → tournaments
-- =============================================================================

DROP POLICY IF EXISTS "Staff can insert tournament matches" ON "public"."tournament_matches";
CREATE POLICY "Staff can insert tournament matches"
    ON "public"."tournament_matches" FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_rounds" "r"
            JOIN "public"."tournament_phases" "p" ON "p"."id" = "r"."phase_id"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "r"."id" = "tournament_matches"."round_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can update tournament matches" ON "public"."tournament_matches";
CREATE POLICY "Staff can update tournament matches"
    ON "public"."tournament_matches" FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_rounds" "r"
            JOIN "public"."tournament_phases" "p" ON "p"."id" = "r"."phase_id"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "r"."id" = "tournament_matches"."round_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

-- Also allow match participants to update their own matches (for result reporting)
DROP POLICY IF EXISTS "Participants can update their matches" ON "public"."tournament_matches";
CREATE POLICY "Participants can update their matches"
    ON "public"."tournament_matches" FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM "public"."alts" "a"
            WHERE "a"."user_id" = (SELECT auth.uid())
            AND ("tournament_matches"."alt1_id" = "a"."id" OR "tournament_matches"."alt2_id" = "a"."id")
        )
    );

DROP POLICY IF EXISTS "Staff can delete tournament matches" ON "public"."tournament_matches";
CREATE POLICY "Staff can delete tournament matches"
    ON "public"."tournament_matches" FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_rounds" "r"
            JOIN "public"."tournament_phases" "p" ON "p"."id" = "r"."phase_id"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "r"."id" = "tournament_matches"."round_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

-- =============================================================================
-- tournament_pairings
-- Joins: tournament_pairings → tournament_rounds → tournament_phases → tournaments
-- =============================================================================

DROP POLICY IF EXISTS "Staff can insert tournament pairings" ON "public"."tournament_pairings";
CREATE POLICY "Staff can insert tournament pairings"
    ON "public"."tournament_pairings" FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_rounds" "r"
            JOIN "public"."tournament_phases" "p" ON "p"."id" = "r"."phase_id"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "r"."id" = "tournament_pairings"."round_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can update tournament pairings" ON "public"."tournament_pairings";
CREATE POLICY "Staff can update tournament pairings"
    ON "public"."tournament_pairings" FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_rounds" "r"
            JOIN "public"."tournament_phases" "p" ON "p"."id" = "r"."phase_id"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "r"."id" = "tournament_pairings"."round_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can delete tournament pairings" ON "public"."tournament_pairings";
CREATE POLICY "Staff can delete tournament pairings"
    ON "public"."tournament_pairings" FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournament_rounds" "r"
            JOIN "public"."tournament_phases" "p" ON "p"."id" = "r"."phase_id"
            JOIN "public"."tournaments" "t" ON "t"."id" = "p"."tournament_id"
            WHERE "r"."id" = "tournament_pairings"."round_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

-- =============================================================================
-- tournament_standings
-- Joins: tournament_standings → tournaments (direct FK)
-- =============================================================================

DROP POLICY IF EXISTS "Staff can insert tournament standings" ON "public"."tournament_standings";
CREATE POLICY "Staff can insert tournament standings"
    ON "public"."tournament_standings" FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_standings"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can update tournament standings" ON "public"."tournament_standings";
CREATE POLICY "Staff can update tournament standings"
    ON "public"."tournament_standings" FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_standings"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can delete tournament standings" ON "public"."tournament_standings";
CREATE POLICY "Staff can delete tournament standings"
    ON "public"."tournament_standings" FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_standings"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );
