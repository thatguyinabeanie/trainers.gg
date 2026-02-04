-- =============================================================================
-- Add write RLS policies for tournament_opponent_history and
-- tournament_player_stats
-- =============================================================================
--
-- These two tables were missed in 20260203000000_add_round_match_rls.sql which
-- added write policies for tournament_rounds, tournament_matches,
-- tournament_pairings, and tournament_standings.
--
-- tournament_opponent_history is written during generateRoundPairings() and
-- tournament_player_stats is written during generateRoundPairings() (bye
-- handling) and recalculateStandings().
--
-- Both tables have a direct tournament_id FK to tournaments, so the policy
-- pattern matches tournament_standings.
--
-- Permission model:
-- - SELECT: Everyone (already exists, unchanged)
-- - INSERT/UPDATE/DELETE: Users with 'tournament.manage' permission
--   This includes: org_owner, org_admin, org_tournament_organizer

-- =============================================================================
-- tournament_opponent_history
-- Joins: tournament_opponent_history → tournaments (direct FK)
-- =============================================================================

DROP POLICY IF EXISTS "Staff can insert tournament opponent history" ON "public"."tournament_opponent_history";
CREATE POLICY "Staff can insert tournament opponent history"
    ON "public"."tournament_opponent_history" FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_opponent_history"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can update tournament opponent history" ON "public"."tournament_opponent_history";
CREATE POLICY "Staff can update tournament opponent history"
    ON "public"."tournament_opponent_history" FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_opponent_history"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can delete tournament opponent history" ON "public"."tournament_opponent_history";
CREATE POLICY "Staff can delete tournament opponent history"
    ON "public"."tournament_opponent_history" FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_opponent_history"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

-- =============================================================================
-- tournament_player_stats
-- Joins: tournament_player_stats → tournaments (direct FK)
-- =============================================================================

DROP POLICY IF EXISTS "Staff can insert tournament player stats" ON "public"."tournament_player_stats";
CREATE POLICY "Staff can insert tournament player stats"
    ON "public"."tournament_player_stats" FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_player_stats"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can update tournament player stats" ON "public"."tournament_player_stats";
CREATE POLICY "Staff can update tournament player stats"
    ON "public"."tournament_player_stats" FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_player_stats"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );

DROP POLICY IF EXISTS "Staff can delete tournament player stats" ON "public"."tournament_player_stats";
CREATE POLICY "Staff can delete tournament player stats"
    ON "public"."tournament_player_stats" FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM "public"."tournaments" "t"
            WHERE "t"."id" = "tournament_player_stats"."tournament_id"
            AND "public"."has_org_permission"("t"."organization_id", 'tournament.manage')
        )
    );
