-- =============================================================================
-- Harden fork_team RPC: access check + execute privileges
-- =============================================================================
-- 1. Recreate fork_team with source team visibility check:
--    caller must be able to read the source team (public OR owned by caller's alt)
-- 2. Restrict execute to authenticated role only

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

  -- Verify the caller can read the source team:
  -- must be public OR owned by one of the caller's alts
  IF NOT v_source.is_public AND NOT EXISTS (
    SELECT 1 FROM alts
    WHERE id = v_source.created_by
      AND user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to fork team %', p_source_team_id;
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

-- Lock down execute privileges: authenticated only
REVOKE ALL ON FUNCTION fork_team(bigint, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fork_team(bigint, bigint, text) TO authenticated;
