-- =============================================================================
-- Add missing UPDATE and DELETE RLS policies for pokemon and team_pokemon,
-- plus ON DELETE SET NULL for fork lineage
-- =============================================================================
-- The baseline migration only defined SELECT + INSERT for pokemon and
-- SELECT + INSERT + DELETE for team_pokemon. The team builder mutations
-- (updatePokemon, reorderTeamPokemon, removePokemonFromTeam) need UPDATE
-- and DELETE policies to function under RLS.
--
-- Pokemon UPDATE/DELETE are ownership-scoped via the
-- team_pokemon → teams → alts → auth.uid() chain, restricted to
-- authenticated role only.

-- =============================================================================
-- 1. Ownership-scoped pokemon UPDATE policy
-- =============================================================================

DROP POLICY IF EXISTS "Users can update pokemon" ON pokemon;
CREATE POLICY "Users can update pokemon"
  ON pokemon FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_pokemon tp
      JOIN teams t ON t.id = tp.team_id
      JOIN alts a ON a.id = t.created_by
      WHERE tp.pokemon_id = pokemon.id
        AND a.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_pokemon tp
      JOIN teams t ON t.id = tp.team_id
      JOIN alts a ON a.id = t.created_by
      WHERE tp.pokemon_id = pokemon.id
        AND a.user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- 2. Ownership-scoped pokemon DELETE policy
-- =============================================================================

DROP POLICY IF EXISTS "Users can delete pokemon" ON pokemon;
CREATE POLICY "Users can delete pokemon"
  ON pokemon FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_pokemon tp
      JOIN teams t ON t.id = tp.team_id
      JOIN alts a ON a.id = t.created_by
      WHERE tp.pokemon_id = pokemon.id
        AND a.user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- 3. Ownership-scoped team_pokemon UPDATE policy
-- =============================================================================

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

-- =============================================================================
-- 4. Replace parent_team_id FK with ON DELETE SET NULL
-- =============================================================================
-- Dropping a source team should null out fork references, not fail.

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_parent_team_id_fkey;
ALTER TABLE teams
  ADD CONSTRAINT teams_parent_team_id_fkey
  FOREIGN KEY (parent_team_id) REFERENCES teams(id) ON DELETE SET NULL;
