-- =============================================================================
-- Team Submission Support
-- =============================================================================
-- Adds open team sheets setting to tournaments, team submission tracking to
-- registrations, tournament-scoped RLS policies for teams/pokemon/team_pokemon,
-- open teamsheet public visibility, pokemon DELETE policy, and an auto-lock
-- trigger when tournaments go active.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add open_team_sheets to tournaments
-- ---------------------------------------------------------------------------
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS open_team_sheets boolean DEFAULT true;

-- ---------------------------------------------------------------------------
-- 2. Add team submission tracking to tournament_registrations
-- ---------------------------------------------------------------------------
ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS team_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS team_locked boolean DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. RLS: Players can view their own team's pokemon (via tournament registration)
--    This is additive alongside the existing "Team pokemon viewable" policy.
-- ---------------------------------------------------------------------------
CREATE POLICY "players_view_own_tournament_team_pokemon"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    WHERE tr.alt_id IN (
      SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
    )
    AND tr.team_id IS NOT NULL
  )
);

-- ---------------------------------------------------------------------------
-- 4. RLS: Players can view their own team record (via tournament registration)
--    This is additive alongside the existing "Public teams are viewable" policy.
-- ---------------------------------------------------------------------------
CREATE POLICY "players_view_own_tournament_team"
ON teams FOR SELECT USING (
  id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    WHERE tr.alt_id IN (
      SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
    )
    AND tr.team_id IS NOT NULL
  )
);

-- ---------------------------------------------------------------------------
-- 5. RLS: Players can view pokemon records from their own teams
--    This is additive alongside the existing "Pokemon viewable via teams" policy.
-- ---------------------------------------------------------------------------
CREATE POLICY "players_view_own_tournament_pokemon"
ON pokemon FOR SELECT USING (
  id IN (
    SELECT tp.pokemon_id
    FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT tr.team_id
      FROM tournament_registrations tr
      WHERE tr.alt_id IN (
        SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
      )
      AND tr.team_id IS NOT NULL
    )
  )
);

-- ---------------------------------------------------------------------------
-- 6. RLS: Open teamsheet PUBLIC visibility (no auth required)
--    When a tournament has open_team_sheets = true and is active or completed,
--    anyone can view the team data.
-- ---------------------------------------------------------------------------
CREATE POLICY "open_teamsheet_team_pokemon_public"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE t.open_team_sheets = true
    AND t.status IN ('active', 'completed')
    AND tr.team_id IS NOT NULL
  )
);

CREATE POLICY "open_teamsheet_team_public"
ON teams FOR SELECT USING (
  id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE t.open_team_sheets = true
    AND t.status IN ('active', 'completed')
    AND tr.team_id IS NOT NULL
  )
);

CREATE POLICY "open_teamsheet_pokemon_public"
ON pokemon FOR SELECT USING (
  id IN (
    SELECT tp.pokemon_id
    FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT tr.team_id
      FROM tournament_registrations tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE t.open_team_sheets = true
      AND t.status IN ('active', 'completed')
      AND tr.team_id IS NOT NULL
    )
  )
);

-- ---------------------------------------------------------------------------
-- 7. RLS: Players can INSERT their own teams
--    NOTE: Equivalent policy "Users can insert own teams" already exists.
--    Skipping to avoid duplicate permissive policies on the same operation.
-- ---------------------------------------------------------------------------
-- (already covered by "Users can insert own teams")

-- ---------------------------------------------------------------------------
-- 8. RLS: Players can INSERT pokemon
--    NOTE: Equivalent policy "Authenticated users can create pokemon" already
--    exists. Skipping to avoid duplicate.
-- ---------------------------------------------------------------------------
-- (already covered by "Authenticated users can create pokemon")

-- ---------------------------------------------------------------------------
-- 9. RLS: Players can INSERT team_pokemon for their own teams
--    NOTE: Equivalent policy "Team owners can manage team pokemon" already
--    exists. Skipping to avoid duplicate.
-- ---------------------------------------------------------------------------
-- (already covered by "Team owners can manage team pokemon")

-- ---------------------------------------------------------------------------
-- 10. RLS: Players can DELETE their own team_pokemon (for team replacement)
--     NOTE: Equivalent policy "Team owners can delete team pokemon" already
--     exists. Skipping to avoid duplicate.
-- ---------------------------------------------------------------------------
-- (already covered by "Team owners can delete team pokemon")

-- ---------------------------------------------------------------------------
-- 11. RLS: Players can DELETE their own pokemon
--     This is a new policy — no existing DELETE policy on pokemon table.
-- ---------------------------------------------------------------------------
CREATE POLICY "players_delete_own_pokemon"
ON pokemon FOR DELETE USING (
  id IN (
    SELECT tp.pokemon_id FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT t.id FROM teams t
      WHERE t.created_by IN (
        SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- 12. Function to lock teams when tournament starts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lock_teams_on_tournament_start()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE tournament_registrations
    SET team_locked = true
    WHERE tournament_id = NEW.id
    AND team_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 13. Trigger: auto-lock teams when tournament goes active
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_lock_teams_on_start ON tournaments;
CREATE TRIGGER trigger_lock_teams_on_start
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION lock_teams_on_tournament_start();
