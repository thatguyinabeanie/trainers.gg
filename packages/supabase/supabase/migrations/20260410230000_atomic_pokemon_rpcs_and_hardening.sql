-- =============================================================================
-- Atomic pokemon RPCs and database hardening
-- 1. add_pokemon_to_team RPC — atomic insert of pokemon + join row
-- 2. remove_pokemon_from_team RPC — atomic delete of pokemon + join row
-- 3. reorder_team_pokemon RPC — fix snake_case key + add validation
-- 4. format_meta_stats.computed_at NOT NULL
-- 5. Pipeline write-denial policies (INSERT/UPDATE/DELETE blocked for authenticated)
-- 6. EV total CHECK constraint on pokemon
-- =============================================================================

-- =============================================================================
-- 1. add_pokemon_to_team RPC
-- =============================================================================
-- Atomically inserts a new pokemon row from JSONB data and creates the
-- team_pokemon join row in a single transaction.
-- Ownership verified via teams → alts → auth.uid().
-- Position must be between 1 and 6.

CREATE OR REPLACE FUNCTION add_pokemon_to_team(
  p_team_id  bigint,
  p_pokemon  jsonb,
  p_position int
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_pokemon_id bigint;
BEGIN
  -- Verify caller owns the team (via alts chain)
  IF NOT EXISTS (
    SELECT 1 FROM teams t
    JOIN alts a ON a.id = t.created_by
    WHERE t.id = p_team_id
      AND a.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to add pokemon to team %', p_team_id;
  END IF;

  -- Validate position range
  IF p_position < 1 OR p_position > 6 THEN
    RAISE EXCEPTION 'Position must be between 1 and 6, got %', p_position;
  END IF;

  -- Insert pokemon row from JSONB data
  INSERT INTO pokemon (
    species,
    ability,
    held_item,
    nature,
    gender,
    level,
    tera_type,
    is_shiny,
    move1, move2, move3, move4,
    ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
    iv_hp, iv_attack, iv_defense, iv_special_attack, iv_special_defense, iv_speed,
    nickname,
    notes
  ) VALUES (
    p_pokemon->>'species',
    p_pokemon->>'ability',
    p_pokemon->>'held_item',
    p_pokemon->>'nature',
    (p_pokemon->>'gender')::pokemon_gender,
    COALESCE((p_pokemon->>'level')::int, 50),
    p_pokemon->>'tera_type',
    COALESCE((p_pokemon->>'is_shiny')::boolean, false),
    p_pokemon->>'move1',
    p_pokemon->>'move2',
    p_pokemon->>'move3',
    p_pokemon->>'move4',
    COALESCE((p_pokemon->>'ev_hp')::int, 0),
    COALESCE((p_pokemon->>'ev_attack')::int, 0),
    COALESCE((p_pokemon->>'ev_defense')::int, 0),
    COALESCE((p_pokemon->>'ev_special_attack')::int, 0),
    COALESCE((p_pokemon->>'ev_special_defense')::int, 0),
    COALESCE((p_pokemon->>'ev_speed')::int, 0),
    COALESCE((p_pokemon->>'iv_hp')::int, 31),
    COALESCE((p_pokemon->>'iv_attack')::int, 31),
    COALESCE((p_pokemon->>'iv_defense')::int, 31),
    COALESCE((p_pokemon->>'iv_special_attack')::int, 31),
    COALESCE((p_pokemon->>'iv_special_defense')::int, 31),
    COALESCE((p_pokemon->>'iv_speed')::int, 31),
    p_pokemon->>'nickname',
    p_pokemon->>'notes'
  )
  RETURNING id INTO v_new_pokemon_id;

  -- Create the team_pokemon join row
  INSERT INTO team_pokemon (team_id, pokemon_id, team_position)
  VALUES (p_team_id, v_new_pokemon_id, p_position);

  RETURN v_new_pokemon_id;
END;
$$;

-- Lock down execute privileges: authenticated only
REVOKE ALL ON FUNCTION add_pokemon_to_team(bigint, jsonb, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_pokemon_to_team(bigint, jsonb, int) TO authenticated;

-- =============================================================================
-- 2. remove_pokemon_from_team RPC
-- =============================================================================
-- Atomically removes a pokemon from a team by deleting the team_pokemon join
-- row and the pokemon record itself in a single transaction.
-- Ownership verified via teams → alts → auth.uid().
-- Membership verified via team_pokemon join.

CREATE OR REPLACE FUNCTION remove_pokemon_from_team(
  p_team_id    bigint,
  p_pokemon_id bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller owns the team (via alts chain)
  IF NOT EXISTS (
    SELECT 1 FROM teams t
    JOIN alts a ON a.id = t.created_by
    WHERE t.id = p_team_id
      AND a.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to remove pokemon from team %', p_team_id;
  END IF;

  -- Verify the pokemon belongs to this team
  IF NOT EXISTS (
    SELECT 1 FROM team_pokemon
    WHERE team_id = p_team_id
      AND pokemon_id = p_pokemon_id
  ) THEN
    RAISE EXCEPTION 'Pokemon % does not belong to team %', p_pokemon_id, p_team_id;
  END IF;

  -- Delete the join row first (FK constraint on team_pokemon.pokemon_id)
  DELETE FROM team_pokemon
  WHERE team_id = p_team_id
    AND pokemon_id = p_pokemon_id;

  -- Delete the pokemon record
  DELETE FROM pokemon WHERE id = p_pokemon_id;
END;
$$;

-- Lock down execute privileges: authenticated only
REVOKE ALL ON FUNCTION remove_pokemon_from_team(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_pokemon_from_team(bigint, bigint) TO authenticated;

-- =============================================================================
-- 3. Fix reorder_team_pokemon RPC
-- =============================================================================
-- Corrects two bugs from the original implementation:
--   - JSONB key was camelCase `pokemonId` — changed to snake_case `pokemon_id`
--   - No validation that all supplied pokemon_ids belong to the team
--   - No position range validation (1-6)
-- Ownership check retained from original.

CREATE OR REPLACE FUNCTION reorder_team_pokemon(
  p_team_id   bigint,
  p_positions jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry      jsonb;
  v_pokemon_id bigint;
  v_position   int;
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

  -- Pre-loop: validate all pokemon_ids belong to this team
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_positions) AS e
    WHERE NOT EXISTS (
      SELECT 1 FROM team_pokemon
      WHERE team_id = p_team_id
        AND pokemon_id = (e->>'pokemon_id')::bigint
    )
  ) THEN
    RAISE EXCEPTION 'One or more pokemon_ids do not belong to team %', p_team_id;
  END IF;

  -- Pre-loop: validate all positions are in range 1-6
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_positions) AS e
    WHERE ((e->>'position')::int < 1 OR (e->>'position')::int > 6)
  ) THEN
    RAISE EXCEPTION 'All positions must be between 1 and 6';
  END IF;

  -- Update each pokemon's position
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_positions)
  LOOP
    v_pokemon_id := (v_entry->>'pokemon_id')::bigint;
    v_position   := (v_entry->>'position')::int;

    UPDATE team_pokemon
       SET team_position = v_position
     WHERE team_id = p_team_id
       AND pokemon_id = v_pokemon_id;
  END LOOP;
END;
$$;

-- Lock down execute privileges: authenticated only
REVOKE ALL ON FUNCTION reorder_team_pokemon(bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_team_pokemon(bigint, jsonb) TO authenticated;

-- =============================================================================
-- 4. format_meta_stats.computed_at NOT NULL
-- =============================================================================
-- computed_at is always set by DEFAULT now() — it should never be null.

ALTER TABLE format_meta_stats
  ALTER COLUMN computed_at SET NOT NULL;

-- =============================================================================
-- 5. Pipeline write-denial policies
-- =============================================================================
-- These six tables are populated exclusively by the data pipeline via service
-- role. Authenticated users must never be able to INSERT, UPDATE, or DELETE
-- rows. These explicit DENY policies harden the tables against any future RLS
-- policy gaps.

-- -----------------------------------------------------------------------------
-- 5a. external_players
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_external_players" ON external_players;
CREATE POLICY "no_user_writes_external_players" ON external_players
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_external_players" ON external_players;
CREATE POLICY "no_user_updates_external_players" ON external_players
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_external_players" ON external_players;
CREATE POLICY "no_user_deletes_external_players" ON external_players
  FOR DELETE TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 5b. data_imports
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_data_imports" ON data_imports;
CREATE POLICY "no_user_writes_data_imports" ON data_imports
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_data_imports" ON data_imports;
CREATE POLICY "no_user_updates_data_imports" ON data_imports
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_data_imports" ON data_imports;
CREATE POLICY "no_user_deletes_data_imports" ON data_imports
  FOR DELETE TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 5c. imported_team_sheets
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_imported_team_sheets" ON imported_team_sheets;
CREATE POLICY "no_user_writes_imported_team_sheets" ON imported_team_sheets
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_imported_team_sheets" ON imported_team_sheets;
CREATE POLICY "no_user_updates_imported_team_sheets" ON imported_team_sheets
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_imported_team_sheets" ON imported_team_sheets;
CREATE POLICY "no_user_deletes_imported_team_sheets" ON imported_team_sheets
  FOR DELETE TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 5d. format_meta_stats
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_format_meta_stats" ON format_meta_stats;
CREATE POLICY "no_user_writes_format_meta_stats" ON format_meta_stats
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_format_meta_stats" ON format_meta_stats;
CREATE POLICY "no_user_updates_format_meta_stats" ON format_meta_stats
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_format_meta_stats" ON format_meta_stats;
CREATE POLICY "no_user_deletes_format_meta_stats" ON format_meta_stats
  FOR DELETE TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 5e. pokemon_usage_stats
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_pokemon_usage_stats" ON pokemon_usage_stats;
CREATE POLICY "no_user_writes_pokemon_usage_stats" ON pokemon_usage_stats
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_pokemon_usage_stats" ON pokemon_usage_stats;
CREATE POLICY "no_user_updates_pokemon_usage_stats" ON pokemon_usage_stats
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_pokemon_usage_stats" ON pokemon_usage_stats;
CREATE POLICY "no_user_deletes_pokemon_usage_stats" ON pokemon_usage_stats
  FOR DELETE TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 5f. pokemon_detail_stats
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "no_user_writes_pokemon_detail_stats" ON pokemon_detail_stats;
CREATE POLICY "no_user_writes_pokemon_detail_stats" ON pokemon_detail_stats
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_updates_pokemon_detail_stats" ON pokemon_detail_stats;
CREATE POLICY "no_user_updates_pokemon_detail_stats" ON pokemon_detail_stats
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_user_deletes_pokemon_detail_stats" ON pokemon_detail_stats;
CREATE POLICY "no_user_deletes_pokemon_detail_stats" ON pokemon_detail_stats
  FOR DELETE TO authenticated USING (false);

-- =============================================================================
-- 6. EV total CHECK constraint on pokemon
-- =============================================================================
-- Enforces the competitive rule: total EVs across all six stats cannot exceed
-- 510. Uses DROP … IF EXISTS for idempotency — safe to replay on a fresh DB.
-- Note: baseline migration has a legacy `ev_total_check` constraint with the
-- same logic. This migration establishes the canonical named constraint
-- `pokemon_ev_total_max` and removes the old one if present.

ALTER TABLE pokemon DROP CONSTRAINT IF EXISTS ev_total_check;
ALTER TABLE pokemon DROP CONSTRAINT IF EXISTS pokemon_ev_total_max;
ALTER TABLE pokemon ADD CONSTRAINT pokemon_ev_total_max CHECK (
  COALESCE(ev_hp, 0) + COALESCE(ev_attack, 0) + COALESCE(ev_defense, 0) +
  COALESCE(ev_special_attack, 0) + COALESCE(ev_special_defense, 0) + COALESCE(ev_speed, 0) <= 510
);
