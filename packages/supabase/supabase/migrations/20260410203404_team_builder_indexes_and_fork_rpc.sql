-- =============================================================================
-- Team Builder: FK indexes, policy comments, and atomic fork RPC
-- =============================================================================

-- 1. Missing FK indexes
-- Postgres does NOT auto-index FK columns. These are needed for JOIN
-- performance in RLS policy subqueries and application queries.

CREATE INDEX IF NOT EXISTS idx_external_players_linked_alt
  ON external_players(linked_alt_id);

CREATE INDEX IF NOT EXISTS idx_imported_team_sheets_external_player
  ON imported_team_sheets(external_player_id);

-- 2. Policy documentation
-- These tables are pipeline-populated reference data (meta stats, imports,
-- external player mappings). Public read access is intentional — they contain
-- no user-private data.

COMMENT ON POLICY "external_players_read" ON external_players
  IS 'Public read: reference data populated by data pipeline, no user-private fields';

COMMENT ON POLICY "data_imports_read" ON data_imports
  IS 'Public read: import metadata for provenance display, no user-private fields';

COMMENT ON POLICY "imported_team_sheets_read" ON imported_team_sheets
  IS 'Public read: tournament results and team data sourced from public events';

COMMENT ON POLICY "format_meta_stats_read" ON format_meta_stats
  IS 'Public read: aggregated format statistics, no user-private fields';

COMMENT ON POLICY "pokemon_usage_stats_read" ON pokemon_usage_stats
  IS 'Public read: aggregated species usage percentages, no user-private fields';

COMMENT ON POLICY "pokemon_detail_stats_read" ON pokemon_detail_stats
  IS 'Public read: aggregated species detail breakdowns, no user-private fields';

-- 3. Atomic fork_team RPC
-- Replaces the multi-step JS forkTeam mutation with a single transaction.
-- If any step fails, the entire operation rolls back — no partial copies.

CREATE OR REPLACE FUNCTION fork_team(
  p_source_team_id bigint,
  p_target_alt_id bigint,
  p_new_name text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source teams%ROWTYPE;
  v_new_team_id bigint;
  v_row RECORD;
  v_new_pokemon_id bigint;
BEGIN
  -- Fetch source team
  SELECT * INTO v_source FROM teams WHERE id = p_source_team_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source team % not found', p_source_team_id;
  END IF;

  -- Verify the calling user owns the target alt
  IF NOT EXISTS (
    SELECT 1 FROM alts
    WHERE id = p_target_alt_id
      AND user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to create teams for alt %', p_target_alt_id;
  END IF;

  -- Create forked team
  INSERT INTO teams (created_by, name, format, description, notes, tags, is_public, parent_team_id)
  VALUES (
    p_target_alt_id,
    COALESCE(p_new_name, v_source.name || ' (fork)'),
    v_source.format,
    v_source.description,
    v_source.notes,
    v_source.tags,
    v_source.is_public,
    p_source_team_id
  )
  RETURNING id INTO v_new_team_id;

  -- Copy each pokemon and create join rows
  FOR v_row IN
    SELECT tp.team_position, p.*
    FROM team_pokemon tp
    JOIN pokemon p ON p.id = tp.pokemon_id
    WHERE tp.team_id = p_source_team_id
    ORDER BY tp.team_position
  LOOP
    INSERT INTO pokemon (
      species, nickname, level, nature, ability, held_item, gender, is_shiny,
      move1, move2, move3, move4,
      ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
      iv_hp, iv_attack, iv_defense, iv_special_attack, iv_special_defense, iv_speed,
      tera_type, notes
    ) VALUES (
      v_row.species, v_row.nickname, v_row.level, v_row.nature, v_row.ability,
      v_row.held_item, v_row.gender, v_row.is_shiny,
      v_row.move1, v_row.move2, v_row.move3, v_row.move4,
      v_row.ev_hp, v_row.ev_attack, v_row.ev_defense,
      v_row.ev_special_attack, v_row.ev_special_defense, v_row.ev_speed,
      v_row.iv_hp, v_row.iv_attack, v_row.iv_defense,
      v_row.iv_special_attack, v_row.iv_special_defense, v_row.iv_speed,
      v_row.tera_type, v_row.notes
    )
    RETURNING id INTO v_new_pokemon_id;

    INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
    VALUES (v_new_team_id, v_new_pokemon_id, v_row.team_position);
  END LOOP;

  RETURN v_new_team_id;
END;
$$;
