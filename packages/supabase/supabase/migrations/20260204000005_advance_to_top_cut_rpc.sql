-- =============================================================================
-- Atomic advance_to_top_cut RPC
-- =============================================================================
-- Wraps all phase transition operations into a single atomic transaction:
--   1. Complete Swiss phase
--   2. Activate elimination phase
--   3. Create Round 1
--   4. Get top N standings
--   5. Generate seeded bracket
--   6. Insert matches + pairings
--   7. Update tournament current_phase_id

-- Helper: generate standard bracket seed ordering
-- For a bracket of size N, produces the order of seeds such that
-- seed 1 and seed 2 meet in the final.
CREATE OR REPLACE FUNCTION public.generate_bracket_order(p_bracket_size integer)
RETURNS integer[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_smaller integer[];
  v_result integer[];
  v_seed integer;
BEGIN
  IF p_bracket_size = 1 THEN
    RETURN ARRAY[1];
  END IF;
  IF p_bracket_size = 2 THEN
    RETURN ARRAY[1, 2];
  END IF;

  v_smaller := public.generate_bracket_order(p_bracket_size / 2);
  v_result := ARRAY[]::integer[];

  FOREACH v_seed IN ARRAY v_smaller LOOP
    v_result := v_result || v_seed;
    v_result := v_result || (p_bracket_size + 1 - v_seed);
  END LOOP;

  RETURN v_result;
END;
$$;

-- Main RPC
CREATE OR REPLACE FUNCTION public.advance_to_top_cut(
  p_tournament_id bigint,
  p_top_cut_size integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_tournament record;
  v_org_id bigint;
  v_current_phase record;
  v_next_phase record;
  v_cut_size integer;
  v_elim_round_id bigint;
  v_bracket_size integer;
  v_seeds integer[];
  v_high_seed_idx integer;
  v_low_seed_idx integer;
  v_high_alt_id bigint;
  v_high_seed integer;
  v_low_alt_id bigint;
  v_low_seed integer;
  v_is_bye boolean;
  v_table_number integer := 1;
  v_match_id bigint;
  v_matches_created integer := 0;
  v_qualifier_count integer;
  i integer;
BEGIN
  -- Authenticate
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tournament
  SELECT t.id, t.status, t.top_cut_size, t.current_phase_id, t.organization_id
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id;

  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Permission check
  IF NOT public.has_org_permission(v_tournament.organization_id, 'tournament.manage') THEN
    RAISE EXCEPTION 'You do not have permission to advance this tournament';
  END IF;

  IF v_tournament.status != 'active' THEN
    RAISE EXCEPTION 'Tournament must be active to advance phases';
  END IF;

  -- Get current Swiss phase
  SELECT tp.*
  INTO v_current_phase
  FROM public.tournament_phases tp
  WHERE tp.id = v_tournament.current_phase_id;

  IF v_current_phase IS NULL OR v_current_phase.phase_type != 'swiss' THEN
    RAISE EXCEPTION 'Current phase must be Swiss to advance to Top Cut';
  END IF;

  -- Verify all Swiss rounds are completed
  IF EXISTS (
    SELECT 1
    FROM public.tournament_rounds r
    WHERE r.phase_id = v_current_phase.id
      AND r.status != 'completed'
  ) THEN
    RAISE EXCEPTION 'All Swiss rounds must be completed before advancing to Top Cut';
  END IF;

  -- Find the next elimination phase
  SELECT tp.*
  INTO v_next_phase
  FROM public.tournament_phases tp
  WHERE tp.tournament_id = p_tournament_id
    AND tp.phase_order = v_current_phase.phase_order + 1
    AND tp.phase_type IN ('single_elimination', 'double_elimination');

  IF v_next_phase IS NULL THEN
    RAISE EXCEPTION 'Next phase must be an elimination phase';
  END IF;

  -- Determine cut size
  v_cut_size := COALESCE(p_top_cut_size, v_tournament.top_cut_size, 8);

  -- Count qualifying players
  SELECT COUNT(*)::integer
  INTO v_qualifier_count
  FROM (
    SELECT ps.alt_id
    FROM public.tournament_player_stats ps
    WHERE ps.tournament_id = p_tournament_id
      AND ps.is_dropped = false
    ORDER BY ps.match_points DESC,
             ps.opponent_match_win_percentage DESC,
             ps.game_win_percentage DESC
    LIMIT v_cut_size
  ) s;

  IF v_qualifier_count = 0 THEN
    RAISE EXCEPTION 'No players available for top cut';
  END IF;

  -- 1. Complete Swiss phase
  UPDATE public.tournament_phases
  SET status = 'completed'
  WHERE id = v_current_phase.id;

  -- 2. Activate elimination phase
  UPDATE public.tournament_phases
  SET status = 'active'
  WHERE id = v_next_phase.id;

  -- 3. Create Round 1 for elimination phase
  INSERT INTO public.tournament_rounds (phase_id, round_number, status)
  VALUES (v_next_phase.id, 1, 'pending')
  RETURNING id INTO v_elim_round_id;

  -- 4. Generate seeded bracket
  -- Round up to nearest power of 2
  v_bracket_size := 1;
  WHILE v_bracket_size < v_qualifier_count LOOP
    v_bracket_size := v_bracket_size * 2;
  END LOOP;

  v_seeds := public.generate_bracket_order(v_bracket_size);

  -- 5. Create matches and pairings from bracket seeding
  i := 1;
  WHILE i <= array_length(v_seeds, 1) LOOP
    v_high_seed_idx := v_seeds[i];
    v_low_seed_idx := v_seeds[i + 1];

    -- Look up alt_ids from qualifiers array
    -- qualifiers are 1-indexed by seed position
    IF v_high_seed_idx <= v_qualifier_count THEN
      -- Get alt_id for the high seed from the standings query
      SELECT ps.alt_id INTO v_high_alt_id
      FROM public.tournament_player_stats ps
      WHERE ps.tournament_id = p_tournament_id
        AND ps.is_dropped = false
      ORDER BY ps.match_points DESC,
               ps.opponent_match_win_percentage DESC,
               ps.game_win_percentage DESC
      LIMIT 1 OFFSET v_high_seed_idx - 1;
    ELSE
      v_high_alt_id := NULL;
    END IF;

    v_high_seed := v_high_seed_idx;

    IF v_low_seed_idx <= v_qualifier_count THEN
      SELECT ps.alt_id INTO v_low_alt_id
      FROM public.tournament_player_stats ps
      WHERE ps.tournament_id = p_tournament_id
        AND ps.is_dropped = false
      ORDER BY ps.match_points DESC,
               ps.opponent_match_win_percentage DESC,
               ps.game_win_percentage DESC
      LIMIT 1 OFFSET v_low_seed_idx - 1;
    ELSE
      v_low_alt_id := NULL;
    END IF;

    v_low_seed := v_low_seed_idx;
    v_is_bye := (v_low_alt_id IS NULL);

    -- Skip if both are null (shouldn't happen but guard against it)
    IF v_high_alt_id IS NOT NULL THEN
      -- Insert match
      INSERT INTO public.tournament_matches (round_id, alt1_id, alt2_id, is_bye, table_number, status)
      VALUES (v_elim_round_id, v_high_alt_id, v_low_alt_id, v_is_bye, v_table_number, 'pending')
      RETURNING id INTO v_match_id;

      -- Insert pairing record
      INSERT INTO public.tournament_pairings (
        tournament_id, round_id, match_id, alt1_id, alt2_id,
        alt1_seed, alt2_seed, is_bye, pairing_reason, pairing_type, table_number
      )
      VALUES (
        p_tournament_id, v_elim_round_id, v_match_id, v_high_alt_id, v_low_alt_id,
        v_high_seed, CASE WHEN v_is_bye THEN NULL ELSE v_low_seed END,
        v_is_bye,
        'Seed ' || v_high_seed || ' vs ' || CASE WHEN v_is_bye THEN 'BYE' ELSE 'Seed ' || v_low_seed END,
        'elimination_seeded', v_table_number
      );

      v_matches_created := v_matches_created + 1;
      v_table_number := v_table_number + 1;
    END IF;

    i := i + 2;
  END LOOP;

  -- 6. Update tournament current phase
  UPDATE public.tournaments
  SET current_phase_id = v_next_phase.id,
      current_round = 1
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object(
    'success', true,
    'qualifiers', v_qualifier_count,
    'matches_created', v_matches_created,
    'phase_id', v_next_phase.id,
    'round_id', v_elim_round_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_to_top_cut(bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_bracket_order(integer) TO authenticated;
