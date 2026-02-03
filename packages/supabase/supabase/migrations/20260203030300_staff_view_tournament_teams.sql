-- =============================================================================
-- Staff Team Viewing RLS Policies
-- =============================================================================
-- Allows org staff with tournament.manage permission to view teams, team_pokemon,
-- and pokemon for players registered in tournaments belonging to their org.
-- This enables staff/judges to see both players' team sheets on match pages.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Staff can view teams for tournaments in their org
-- ---------------------------------------------------------------------------
CREATE POLICY "staff_view_tournament_teams"
ON teams FOR SELECT USING (
  id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.team_id IS NOT NULL
    AND public.has_org_permission(t.organization_id, 'tournament.manage')
  )
);

-- ---------------------------------------------------------------------------
-- 2. Staff can view team_pokemon for tournaments in their org
-- ---------------------------------------------------------------------------
CREATE POLICY "staff_view_tournament_team_pokemon"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.team_id IS NOT NULL
    AND public.has_org_permission(t.organization_id, 'tournament.manage')
  )
);

-- ---------------------------------------------------------------------------
-- 3. Staff can view pokemon for tournaments in their org
-- ---------------------------------------------------------------------------
CREATE POLICY "staff_view_tournament_pokemon"
ON pokemon FOR SELECT USING (
  id IN (
    SELECT tp.pokemon_id
    FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT tr.team_id
      FROM tournament_registrations tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.team_id IS NOT NULL
      AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  )
);
