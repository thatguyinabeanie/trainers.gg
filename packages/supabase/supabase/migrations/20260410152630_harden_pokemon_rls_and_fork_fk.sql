-- =============================================================================
-- Harden pokemon RLS policies and add ON DELETE SET NULL for fork lineage
-- =============================================================================
-- 1. Replace permissive pokemon UPDATE/DELETE policies with ownership-scoped
--    checks via the team_pokemon → teams → alts → auth.uid() chain.
--    Restrict to authenticated role only.
-- 2. Add ON DELETE SET NULL to parent_team_id so deleting a source team
--    doesn't cascade-fail on forked teams.

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
-- 3. Replace parent_team_id FK with ON DELETE SET NULL
-- =============================================================================
-- Dropping a source team should null out fork references, not fail.

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_parent_team_id_fkey;
ALTER TABLE teams
  ADD CONSTRAINT teams_parent_team_id_fkey
  FOREIGN KEY (parent_team_id) REFERENCES teams(id) ON DELETE SET NULL;
