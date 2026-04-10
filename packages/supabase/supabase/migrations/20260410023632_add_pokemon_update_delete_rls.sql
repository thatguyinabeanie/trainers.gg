-- =============================================================================
-- Add missing UPDATE and DELETE RLS policies for pokemon and team_pokemon
-- =============================================================================
-- The baseline migration only defined SELECT + INSERT for pokemon and
-- SELECT + INSERT + DELETE for team_pokemon. The team builder mutations
-- (updatePokemon, reorderTeamPokemon, removePokemonFromTeam) need UPDATE
-- and DELETE policies to function under RLS.

-- Pokemon UPDATE: matches existing INSERT pattern (true — ownership
-- controlled at the team_pokemon join layer, not the pokemon row itself)
DROP POLICY IF EXISTS "Users can update pokemon" ON pokemon;
CREATE POLICY "Users can update pokemon"
  ON pokemon FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Pokemon DELETE: same permissive pattern as INSERT
DROP POLICY IF EXISTS "Users can delete pokemon" ON pokemon;
CREATE POLICY "Users can delete pokemon"
  ON pokemon FOR DELETE
  USING (true);

-- Team_pokemon UPDATE: ownership check matching INSERT/DELETE pattern
DROP POLICY IF EXISTS "Team owners can update team pokemon" ON team_pokemon;
CREATE POLICY "Team owners can update team pokemon"
  ON team_pokemon FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN alts a ON a.id = t.created_by
      WHERE t.id = team_pokemon.team_id
        AND a.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN alts a ON a.id = t.created_by
      WHERE t.id = team_pokemon.team_id
        AND a.user_id = (SELECT auth.uid())
    )
  );
