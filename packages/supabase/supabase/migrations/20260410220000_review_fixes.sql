-- =============================================================================
-- Review fixes: indexes, duplicate policy cleanup, NOT NULL hardening,
-- FK ON DELETE behavior, table documentation, and atomic RPCs
-- =============================================================================

-- =============================================================================
-- 1. Missing FK index on teams.parent_team_id
-- =============================================================================
-- Partial index — only rows that have a parent benefit from this index.
-- Used for fork lineage queries and ON DELETE SET NULL cascade lookups.

CREATE INDEX IF NOT EXISTS idx_teams_parent_team_id
  ON teams(parent_team_id)
  WHERE parent_team_id IS NOT NULL;

-- =============================================================================
-- 2. Missing index on format_meta_stats.format
-- =============================================================================
-- Primary lookup column for meta snapshot queries by format.

CREATE INDEX IF NOT EXISTS idx_format_meta_stats_format
  ON format_meta_stats(format);

-- =============================================================================
-- 3. Drop duplicate DELETE policy on pokemon
-- =============================================================================
-- "players_delete_own_pokemon" was created in 20260201000002 and conflicts
-- with the ownership-scoped "Users can delete pokemon" policy added in
-- 20260410152630_harden_pokemon_rls_and_fork_fk. Multiple permissive DELETE
-- policies on the same table cause a pg_multiple_permissive_policies warning
-- and subtle behavioural differences. Drop the older one.

DROP POLICY IF EXISTS "players_delete_own_pokemon" ON pokemon;

-- =============================================================================
-- 4. Fix nullable timestamps — columns that must never be null
-- =============================================================================

-- external_players.created_at: always set by DEFAULT now(), never optional
ALTER TABLE external_players
  ALTER COLUMN created_at SET NOT NULL;

-- data_imports.imported_at: always set by DEFAULT now(), never optional
ALTER TABLE data_imports
  ALTER COLUMN imported_at SET NOT NULL;

-- imported_team_sheets.created_at: always set by DEFAULT now(), never optional
ALTER TABLE imported_team_sheets
  ALTER COLUMN created_at SET NOT NULL;

-- =============================================================================
-- 5. Add explicit ON DELETE behaviour to pipeline FK columns
-- =============================================================================
-- The original schema used the default RESTRICT. These columns need explicit
-- ON DELETE to express intent and prevent unintended blocking deletes.

-- external_players.linked_alt_id → SET NULL
-- Deleting an alt should unlink the external player, not block deletion.
ALTER TABLE external_players
  DROP CONSTRAINT IF EXISTS external_players_linked_alt_id_fkey;
ALTER TABLE external_players
  ADD CONSTRAINT external_players_linked_alt_id_fkey
  FOREIGN KEY (linked_alt_id) REFERENCES alts(id) ON DELETE SET NULL;

-- imported_team_sheets.import_id → CASCADE
-- Team sheets are meaningless without their parent import. Delete them together.
ALTER TABLE imported_team_sheets
  DROP CONSTRAINT IF EXISTS imported_team_sheets_import_id_fkey;
ALTER TABLE imported_team_sheets
  ADD CONSTRAINT imported_team_sheets_import_id_fkey
  FOREIGN KEY (import_id) REFERENCES data_imports(id) ON DELETE CASCADE;

-- imported_team_sheets.external_player_id → SET NULL
-- Deleting an external player should detach the sheet, not delete it.
ALTER TABLE imported_team_sheets
  DROP CONSTRAINT IF EXISTS imported_team_sheets_external_player_id_fkey;
ALTER TABLE imported_team_sheets
  ADD CONSTRAINT imported_team_sheets_external_player_id_fkey
  FOREIGN KEY (external_player_id) REFERENCES external_players(id) ON DELETE SET NULL;

-- =============================================================================
-- 6. Pipeline table documentation
-- =============================================================================
-- These tables are read-only from the API. All writes are via service role
-- only (data pipeline or admin tooling). RLS SELECT policies are intentionally
-- permissive — they contain no user-private data.

COMMENT ON TABLE external_players IS
  'Data pipeline table. Writes via service role only. '
  'Maps external source identities (Limitless, RK9, Showdown) to trainers.gg alts.';

COMMENT ON TABLE data_imports IS
  'Data pipeline table. Writes via service role only. '
  'Tracks raw tournament data import jobs with source and format metadata.';

COMMENT ON TABLE imported_team_sheets IS
  'Data pipeline table. Writes via service role only. '
  'Normalised pokemon team sheets from tournament results across all import sources.';

COMMENT ON TABLE format_meta_stats IS
  'Data pipeline table. Writes via service role only. '
  'Aggregated meta snapshots per format — one row per computed period.';

COMMENT ON TABLE pokemon_usage_stats IS
  'Data pipeline table. Writes via service role only. '
  'Per-species usage percentages and rankings for a format_meta_stats snapshot.';

COMMENT ON TABLE pokemon_detail_stats IS
  'Data pipeline table. Writes via service role only. '
  'Per-species breakdowns (items, moves, spreads, tera types, teammates) for a snapshot.';

-- =============================================================================
-- 7. Atomic delete_team RPC
-- =============================================================================
-- Deletes a team and all associated pokemon in a single transaction.
-- Ownership verified via teams → alts → auth.uid().
-- Steps: collect pokemon_ids, delete team_pokemon, delete pokemon, delete team.

CREATE OR REPLACE FUNCTION delete_team(
  p_team_id bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pokemon_ids bigint[];
BEGIN
  -- Verify caller owns the team (via alts chain)
  IF NOT EXISTS (
    SELECT 1 FROM teams t
    JOIN alts a ON a.id = t.created_by
    WHERE t.id = p_team_id
      AND a.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete team %', p_team_id;
  END IF;

  -- Collect pokemon IDs before removing join rows
  SELECT array_agg(tp.pokemon_id)
    INTO v_pokemon_ids
    FROM team_pokemon tp
    WHERE tp.team_id = p_team_id;

  -- Remove join rows first (FK constraint on team_pokemon.team_id)
  DELETE FROM team_pokemon WHERE team_id = p_team_id;

  -- Remove the pokemon rows (only if there were any)
  IF v_pokemon_ids IS NOT NULL THEN
    DELETE FROM pokemon WHERE id = ANY(v_pokemon_ids);
  END IF;

  -- Remove the team
  DELETE FROM teams WHERE id = p_team_id;
END;
$$;

-- Lock down execute privileges: authenticated only
REVOKE ALL ON FUNCTION delete_team(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_team(bigint) TO authenticated;

-- =============================================================================
-- 8. Atomic reorder_team_pokemon RPC
-- =============================================================================
-- Updates team_pokemon.team_position for each pokemon in one transaction.
-- Accepts a JSONB array of {pokemonId, position} objects.
-- Ownership verified via team_pokemon → teams → alts → auth.uid().

CREATE OR REPLACE FUNCTION reorder_team_pokemon(
  p_team_id bigint,
  p_positions jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry jsonb;
BEGIN
  -- Verify caller owns the team (via alts chain)
  IF NOT EXISTS (
    SELECT 1 FROM teams t
    JOIN alts a ON a.id = t.created_by
    WHERE t.id = p_team_id
      AND a.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to reorder pokemon for team %', p_team_id;
  END IF;

  -- Update each pokemon's position
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_positions)
  LOOP
    UPDATE team_pokemon
       SET team_position = (v_entry->>'position')::int
     WHERE team_id = p_team_id
       AND pokemon_id = (v_entry->>'pokemonId')::bigint;
  END LOOP;
END;
$$;

-- Lock down execute privileges: authenticated only
REVOKE ALL ON FUNCTION reorder_team_pokemon(bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_team_pokemon(bigint, jsonb) TO authenticated;
