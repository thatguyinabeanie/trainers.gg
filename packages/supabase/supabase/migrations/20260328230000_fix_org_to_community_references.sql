-- =============================================================================
-- Migration: Fix stale organization_id references in 13 database functions
-- =============================================================================
-- The rename_organizations_to_communities migration (20260328023929) renamed
-- tables and columns but missed updating references inside these function
-- bodies. This migration recreates each function with the correct column,
-- table, and function names:
--
--   t.organization_id  → t.community_id
--   public.organizations → public.communities
--   public.organization_staff → public.community_staff
--   has_org_permission( → has_community_permission(
--   audit_log.organization_id → audit_log.community_id
--   os.organization_id → os.community_id
--   g.organization_id  → g.community_id
--
-- All 13 functions use CREATE OR REPLACE for idempotency.
-- =============================================================================

-- 1. advance_to_top_cut
CREATE OR REPLACE FUNCTION public.advance_to_top_cut(p_tournament_id bigint, p_top_cut_size integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn1$
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
  SELECT t.id, t.status, t.top_cut_size, t.current_phase_id, t.community_id
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id;

  IF v_tournament IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Permission check
  IF NOT public.has_community_permission(v_tournament.community_id, 'tournament.manage') THEN
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
$fn1$;

-- 2. audit_match_events
CREATE OR REPLACE FUNCTION public.audit_match_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn2$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
  v_actor_user_id uuid;
  v_actor_alt_id bigint;
  v_actor_name text;
  v_description text;
BEGIN
  -- Get tournament context
  SELECT t.id, t.community_id
    INTO v_tournament_id, v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
   WHERE r.id = NEW.round_id;

  -- Identify the actor from the current session
  v_actor_user_id := (SELECT auth.uid());
  IF v_actor_user_id IS NOT NULL THEN
    SELECT id, username
      INTO v_actor_alt_id, v_actor_name
      FROM public.alts WHERE user_id = v_actor_user_id LIMIT 1;
  END IF;

  -- -----------------------------------------------------------------
  -- match.staff_requested — judge called
  -- -----------------------------------------------------------------
  IF NEW.staff_requested = true
     AND (OLD.staff_requested IS NULL OR OLD.staff_requested = false) THEN

    v_description := format('%s requested a judge', COALESCE(v_actor_name, 'A player'));
    IF NEW.table_number IS NOT NULL THEN
      v_description := v_description || format(' (Table %s)', NEW.table_number);
    END IF;

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, community_id, metadata)
    VALUES (
      'match.staff_requested',
      v_actor_user_id,
      v_actor_alt_id,
      v_tournament_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'table_number', NEW.table_number,
        'alt1_id', NEW.alt1_id,
        'alt2_id', NEW.alt2_id,
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- match.staff_resolved — judge request cleared
  -- -----------------------------------------------------------------
  IF NEW.staff_requested = false AND OLD.staff_requested = true THEN

    v_description := format('%s resolved judge request', COALESCE(v_actor_name, 'Staff'));
    IF NEW.table_number IS NOT NULL THEN
      v_description := v_description || format(' (Table %s)', NEW.table_number);
    END IF;

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, community_id, metadata)
    VALUES (
      'match.staff_resolved',
      v_actor_user_id,
      v_actor_alt_id,
      v_tournament_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'table_number', NEW.table_number,
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  -- -----------------------------------------------------------------
  -- judge.match_reset — match scores zeroed from non-zero
  -- -----------------------------------------------------------------
  IF NEW.game_wins1 = 0 AND NEW.game_wins2 = 0
     AND (OLD.game_wins1 > 0 OR OLD.game_wins2 > 0) THEN

    v_description := format('%s reset match (was %s-%s)',
      COALESCE(v_actor_name, 'Staff'),
      OLD.game_wins1,
      OLD.game_wins2);

    INSERT INTO public.audit_log
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, community_id, metadata)
    VALUES (
      'judge.match_reset',
      v_actor_user_id,
      v_actor_alt_id,
      v_tournament_id,
      NEW.id,
      v_org_id,
      jsonb_build_object(
        'previous_score', format('%s-%s', OLD.game_wins1, OLD.game_wins2),
        'description', v_description,
        'actor_name', v_actor_name
      )
    );
  END IF;

  RETURN NEW;
END;
$fn2$;

-- 3. audit_registration_status_change
CREATE OR REPLACE FUNCTION public.audit_registration_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn3$
DECLARE
  v_org_id bigint;
  v_actor_user_id uuid;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get community context from the tournament
  SELECT t.community_id
    INTO v_org_id
    FROM public.tournaments t
   WHERE t.id = NEW.tournament_id;

  -- -----------------------------------------------------------------------
  -- registration.dropped — player dropped from tournament
  -- -----------------------------------------------------------------------
  IF NEW.status = 'dropped' THEN
    -- Actor is the staff member who dropped the player, falling back to
    -- the current session user (self-drop)
    v_actor_user_id := COALESCE(NEW.dropped_by, (SELECT auth.uid()));

    INSERT INTO public.audit_log
      (action, actor_user_id, tournament_id, community_id, metadata)
    VALUES (
      'registration.dropped',
      v_actor_user_id,
      NEW.tournament_id,
      v_org_id,
      jsonb_build_object(
        'registration_id', NEW.id,
        'alt_id', NEW.alt_id,
        'previous_status', OLD.status::text,
        'drop_category', NEW.drop_category,
        'drop_notes', NEW.drop_notes,
        'dropped_by', NEW.dropped_by
      )
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- registration.checked_in — player checked in to tournament
  -- -----------------------------------------------------------------------
  IF NEW.status = 'checked_in' THEN
    v_actor_user_id := (SELECT auth.uid());

    INSERT INTO public.audit_log
      (action, actor_user_id, tournament_id, community_id, metadata)
    VALUES (
      'registration.checked_in',
      v_actor_user_id,
      NEW.tournament_id,
      v_org_id,
      jsonb_build_object(
        'registration_id', NEW.id,
        'alt_id', NEW.alt_id,
        'previous_status', OLD.status::text
      )
    );
  END IF;

  RETURN NEW;
END;
$fn3$;

-- 4. check_no_show_escalation
CREATE OR REPLACE FUNCTION public.check_no_show_escalation()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn4$
DECLARE
  v_match record;
  v_check_in_minutes integer;
  v_best_of integer;
  v_wins_needed integer;
  v_first_checkin timestamptz;
  v_elapsed_intervals integer;
  v_existing_no_show_count integer;
  v_confirmed_alt_id bigint;
  v_confirmed_player_name text;
  v_confirmed_user_id uuid;
  v_absent_user_id uuid;
  v_game_number integer;
  v_new_game_id bigint;
  v_match_status text;
  v_tournament_id bigint;
  v_tournament_name text;
  v_tournament_slug text;
  v_org_id bigint;
  v_org_slug text;
  v_round_number integer;
  v_elapsed_minutes integer;
  v_staff_user_id uuid;
BEGIN
  -- Find all matches where exactly one player has confirmed,
  -- the match is still pending, and the round is active.
  FOR v_match IN
    SELECT
      m.id AS match_id,
      m.alt1_id,
      m.alt2_id,
      m.player1_match_confirmed,
      m.player2_match_confirmed,
      m.round_id,
      m.table_number,
      r.round_number,
      r.phase_id,
      tp.check_in_time_minutes,
      tp.best_of,
      t.id AS tournament_id,
      t.name AS tournament_name,
      t.slug AS tournament_slug,
      t.community_id,
      o.slug AS org_slug
    FROM public.tournament_matches m
    JOIN public.tournament_rounds r ON r.id = m.round_id
    JOIN public.tournament_phases tp ON tp.id = r.phase_id
    JOIN public.tournaments t ON t.id = tp.tournament_id
    JOIN public.communities o ON o.id = t.community_id
    WHERE m.status = 'pending'
      AND r.status = 'active'
      AND m.is_bye = false
      -- Exactly one player confirmed (XOR)
      AND (
        (m.player1_match_confirmed = true AND m.player2_match_confirmed = false)
        OR
        (m.player1_match_confirmed = false AND m.player2_match_confirmed = true)
      )
  LOOP
    -- Determine which player confirmed and which is absent
    IF v_match.player1_match_confirmed THEN
      v_confirmed_alt_id := v_match.alt1_id;
    ELSE
      v_confirmed_alt_id := v_match.alt2_id;
    END IF;

    -- Get the confirmed player's name and user_id
    SELECT
      a.username,
      a.user_id
    INTO v_confirmed_player_name, v_confirmed_user_id
    FROM public.alts a
    WHERE a.id = v_confirmed_alt_id;

    -- Get the absent player's user_id
    IF v_match.player1_match_confirmed THEN
      SELECT a.user_id INTO v_absent_user_id
      FROM public.alts a WHERE a.id = v_match.alt2_id;
    ELSE
      SELECT a.user_id INTO v_absent_user_id
      FROM public.alts a WHERE a.id = v_match.alt1_id;
    END IF;

    -- Get phase config
    v_check_in_minutes := COALESCE(v_match.check_in_time_minutes, 5);
    v_best_of := COALESCE(v_match.best_of, 3);
    v_wins_needed := (v_best_of / 2) + 1;
    v_round_number := v_match.round_number;
    v_tournament_id := v_match.tournament_id;
    v_tournament_name := v_match.tournament_name;
    v_tournament_slug := v_match.tournament_slug;
    v_org_id := v_match.community_id;
    v_org_slug := v_match.org_slug;

    -- Find when the first player checked in by looking at the earliest
    -- "checked in" system message for this match
    SELECT MIN(mm.created_at)
    INTO v_first_checkin
    FROM public.match_messages mm
    WHERE mm.match_id = v_match.match_id
      AND mm.message_type = 'system'
      AND mm.content LIKE '%checked in%';

    -- If no check-in message found, skip this match (shouldn't happen
    -- since one player is confirmed, but guard defensively)
    IF v_first_checkin IS NULL THEN
      CONTINUE;
    END IF;

    -- Calculate how many intervals have elapsed since first check-in
    v_elapsed_intervals := FLOOR(
      EXTRACT(EPOCH FROM (now() - v_first_checkin)) / (v_check_in_minutes * 60)
    )::integer;

    -- Cap at wins_needed to avoid awarding more games than necessary
    IF v_elapsed_intervals > v_wins_needed THEN
      v_elapsed_intervals := v_wins_needed;
    END IF;

    -- Must have at least 1 interval elapsed to award a game
    IF v_elapsed_intervals < 1 THEN
      CONTINUE;
    END IF;

    -- Count existing no-show games for this match
    SELECT COUNT(*)::integer
    INTO v_existing_no_show_count
    FROM public.match_games g
    WHERE g.match_id = v_match.match_id
      AND g.is_no_show = true;

    -- If we've already awarded enough, skip
    IF v_existing_no_show_count >= v_elapsed_intervals THEN
      CONTINUE;
    END IF;

    -- Get the highest existing game_number for this match
    -- (to avoid collisions with games created by start_round)
    SELECT COALESCE(MAX(g.game_number), 0)
    INTO v_game_number
    FROM public.match_games g
    WHERE g.match_id = v_match.match_id;

    -- Award games for each interval not yet covered
    FOR i IN (v_existing_no_show_count + 1)..v_elapsed_intervals LOOP
      v_game_number := v_game_number + 1;
      v_elapsed_minutes := (i * v_check_in_minutes);

      -- Step 1: INSERT with status = 'pending' (trigger does not fire on INSERT)
      INSERT INTO public.match_games (
        match_id, game_number, winner_alt_id, is_no_show, status
      )
      VALUES (
        v_match.match_id, v_game_number, v_confirmed_alt_id, true, 'pending'
      )
      ON CONFLICT (match_id, game_number) DO NOTHING
      RETURNING id INTO v_new_game_id;

      -- If ON CONFLICT hit (game_number already exists), try to find and
      -- use an existing pending game row instead
      IF v_new_game_id IS NULL THEN
        -- Find an existing pending game that we can repurpose
        SELECT g.id, g.game_number
        INTO v_new_game_id, v_game_number
        FROM public.match_games g
        WHERE g.match_id = v_match.match_id
          AND g.status = 'pending'
          AND g.is_no_show = false
        ORDER BY g.game_number ASC
        LIMIT 1;

        IF v_new_game_id IS NULL THEN
          -- No available game slot; skip
          CONTINUE;
        END IF;

        -- Mark this existing game as a no-show
        UPDATE public.match_games
        SET winner_alt_id = v_confirmed_alt_id,
            is_no_show = true
        WHERE id = v_new_game_id;
      END IF;

      -- Step 2: UPDATE to 'resolved' — this fires the
      -- update_match_scores_from_games AFTER UPDATE trigger
      UPDATE public.match_games
      SET status = 'resolved',
          resolved_at = now(),
          resolution_notes = 'Auto-awarded: opponent no-show'
      WHERE id = v_new_game_id;

      -- Insert system message into match chat
      INSERT INTO public.match_messages (match_id, alt_id, message_type, content)
      VALUES (
        v_match.match_id,
        NULL,
        'system',
        'Game ' || v_game_number || ' awarded to ' || v_confirmed_player_name
          || ' — opponent no-show (' || v_elapsed_minutes || 'm elapsed)'
      );
    END LOOP;

    -- After awarding games, check if the match was completed by the trigger
    SELECT tm.status
    INTO v_match_status
    FROM public.tournament_matches tm
    WHERE tm.id = v_match.match_id;

    IF v_match_status = 'completed' THEN
      -- Notify the present player about the match result
      INSERT INTO public.notifications (
        user_id, type, title, body, tournament_id, match_id, action_url
      )
      VALUES (
        v_confirmed_user_id,
        'match_result',
        'Match won — opponent no-show',
        v_tournament_name || ' — Round ' || v_round_number,
        v_tournament_id,
        v_match.match_id,
        '/tournaments/' || v_tournament_slug || '/r/' || v_round_number || '/t/' || COALESCE(v_match.table_number, 0)
      );

      -- Notify the absent player about the match result
      IF v_absent_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          user_id, type, title, body, tournament_id, match_id, action_url
        )
        VALUES (
          v_absent_user_id,
          'match_result',
          'Match lost — no-show',
          v_tournament_name || ' — Round ' || v_round_number,
          v_tournament_id,
          v_match.match_id,
          '/tournaments/' || v_tournament_slug || '/r/' || v_round_number || '/t/' || COALESCE(v_match.table_number, 0)
        );
      END IF;

      -- Notify all staff with tournament.manage permission
      FOR v_staff_user_id IN
        SELECT DISTINCT cs.user_id
        FROM public.community_staff cs
        JOIN public.user_group_roles ugr ON ugr.user_id = cs.user_id
        JOIN public.group_roles gr ON ugr.group_role_id = gr.id
        JOIN public.groups g ON gr.group_id = g.id
        JOIN public.roles r ON gr.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions perm ON rp.permission_id = perm.id
        WHERE cs.community_id = v_org_id
          AND g.community_id = v_org_id
          AND perm.key = 'tournament.manage'
        UNION
        SELECT c.owner_user_id
        FROM public.communities c
        WHERE c.id = v_org_id
      LOOP
        INSERT INTO public.notifications (
          user_id, type, title, body, tournament_id, match_id, action_url
        )
        VALUES (
          v_staff_user_id,
          'match_no_show',
          'No-show: match auto-completed',
          v_tournament_name || ' — Round ' || v_round_number
            || ', Table ' || COALESCE(v_match.table_number, 0),
          v_tournament_id,
          v_match.match_id,
          '/tournaments/' || v_tournament_slug || '/r/' || v_round_number || '/t/' || COALESCE(v_match.table_number, 0)
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$fn4$;

-- 5. clear_judge_request
CREATE OR REPLACE FUNCTION public.clear_judge_request(p_match_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn5$
DECLARE
  v_user_id uuid;
  v_org_id bigint;
  v_is_staff boolean;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the community for this match
  SELECT t.community_id INTO v_org_id
  FROM public.tournament_matches m
  JOIN public.tournament_rounds r ON m.round_id = r.id
  JOIN public.tournament_phases p ON r.phase_id = p.id
  JOIN public.tournaments t ON p.tournament_id = t.id
  WHERE m.id = p_match_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Only community staff with tournament.manage can clear judge requests
  SELECT public.has_community_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Only org staff can clear judge requests';
  END IF;

  -- Clear staff_requested
  UPDATE public.tournament_matches
  SET staff_requested = false,
      staff_resolved_by = (
        SELECT a.id FROM public.alts a
        WHERE a.user_id = v_user_id
        ORDER BY a.id
        LIMIT 1
      )
  WHERE id = p_match_id
    AND staff_requested = true;
END;
$fn5$;

-- 6. confirm_match_checkin
CREATE OR REPLACE FUNCTION public.confirm_match_checkin(p_match_id bigint, p_alt_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn6$
DECLARE
  v_user_id uuid;
  v_match record;
  v_caller_alt_id bigint;
  v_is_alt1 boolean;
  v_org_id bigint;
  v_is_staff boolean := false;
  v_target_alt_id bigint;
  v_target_is_alt1 boolean;
  v_player_name text;
  v_both_confirmed boolean;
BEGIN
  -- Authenticate
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get match details
  SELECT m.id, m.status, m.alt1_id, m.alt2_id, m.round_id,
         m.player1_match_confirmed, m.player2_match_confirmed
  INTO v_match
  FROM public.tournament_matches m
  WHERE m.id = p_match_id;

  IF v_match IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  -- Match must be pending
  IF v_match.status != 'pending' THEN
    IF v_match.status = 'active' THEN
      RETURN jsonb_build_object('success', true, 'already_active', true);
    END IF;
    RETURN jsonb_build_object('success', false, 'error',
      format('Cannot check in for match with status "%s"', v_match.status));
  END IF;

  -- Check if caller is a participant
  SELECT a.id, (a.id = v_match.alt1_id)
  INTO v_caller_alt_id, v_is_alt1
  FROM public.alts a
  WHERE a.user_id = v_user_id
    AND (a.id = v_match.alt1_id OR a.id = v_match.alt2_id)
  LIMIT 1;

  -- If not a participant, check staff permission
  IF v_caller_alt_id IS NULL THEN
    SELECT t.community_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NOT NULL THEN
      SELECT public.has_community_permission(v_org_id, 'tournament.manage')
      INTO v_is_staff;
    END IF;

    IF NOT v_is_staff THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Only match participants or tournament staff can check in');
    END IF;

    -- Staff must provide p_alt_id to specify which player to check in
    IF p_alt_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Staff must specify which player to check in (p_alt_id)');
    END IF;

    -- Validate p_alt_id is one of the match participants
    IF p_alt_id != v_match.alt1_id AND p_alt_id != v_match.alt2_id THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Specified alt is not a participant in this match');
    END IF;

    v_target_alt_id := p_alt_id;
    v_target_is_alt1 := (p_alt_id = v_match.alt1_id);
  ELSE
    -- Player checking in for themselves
    v_target_alt_id := v_caller_alt_id;
    v_target_is_alt1 := v_is_alt1;
  END IF;

  -- Check if already confirmed
  IF v_target_is_alt1 AND v_match.player1_match_confirmed THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true);
  END IF;
  IF NOT v_target_is_alt1 AND v_match.player2_match_confirmed THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true);
  END IF;

  -- Get player name for system message
  SELECT a.username
  INTO v_player_name
  FROM public.alts a
  WHERE a.id = v_target_alt_id;

  -- Set the confirmation flag
  IF v_target_is_alt1 THEN
    UPDATE public.tournament_matches
    SET player1_match_confirmed = true
    WHERE id = p_match_id;
  ELSE
    UPDATE public.tournament_matches
    SET player2_match_confirmed = true
    WHERE id = p_match_id;
  END IF;

  -- Insert system message: "{player} checked in"
  INSERT INTO public.match_messages (match_id, alt_id, message_type, content)
  VALUES (p_match_id, v_target_alt_id, 'system',
    v_player_name || ' checked in');

  -- Check if both are now confirmed
  SELECT player1_match_confirmed AND player2_match_confirmed
  INTO v_both_confirmed
  FROM public.tournament_matches
  WHERE id = p_match_id;

  IF v_both_confirmed THEN
    -- Activate the match
    UPDATE public.tournament_matches
    SET status = 'active',
        match_confirmed_at = now()
    WHERE id = p_match_id;

    -- Insert system message: match started
    INSERT INTO public.match_messages (match_id, alt_id, message_type, content)
    VALUES (p_match_id, NULL, 'system',
      'Both players ready — match started!');

    RETURN jsonb_build_object(
      'success', true,
      'match_activated', true,
      'player_name', v_player_name
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'match_activated', false,
    'player_name', v_player_name
  );
END;
$fn6$;

-- 7. notify_judge_call
CREATE OR REPLACE FUNCTION public.notify_judge_call()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn7$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
  v_tournament_name text;
  v_tournament_slug text;
  v_org_slug text;
  v_match_round_number int;
  v_table_number int;
  v_staff_user_id uuid;
BEGIN
  -- Only trigger when staff_requested changes from false to true
  IF NEW.staff_requested = true AND (OLD.staff_requested IS NULL OR OLD.staff_requested = false) THEN
    -- Get tournament info via the join chain
    SELECT t.id, t.community_id, t.name, t.slug, o.slug,
           r.round_number, NEW.table_number
    INTO v_tournament_id, v_org_id, v_tournament_name, v_tournament_slug, v_org_slug,
         v_match_round_number, v_table_number
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
    JOIN public.communities o ON t.community_id = o.id
    WHERE r.id = NEW.round_id;

    -- Create notification for each staff member with tournament.manage permission.
    FOR v_staff_user_id IN
      SELECT DISTINCT cs.user_id
      FROM public.community_staff cs
      JOIN public.user_group_roles ugr ON ugr.user_id = cs.user_id
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      JOIN public.groups g ON gr.group_id = g.id
      JOIN public.roles r ON gr.role_id = r.id
      JOIN public.role_permissions rp ON r.id = rp.role_id
      JOIN public.permissions perm ON rp.permission_id = perm.id
      WHERE cs.community_id = v_org_id
        AND g.community_id = v_org_id
        AND perm.key = 'tournament.manage'
      UNION
      -- Also notify community owner
      SELECT o.owner_user_id
      FROM public.communities o
      WHERE o.id = v_org_id
    LOOP
      -- Check if user has opted out of judge_call notifications
      IF public.should_send_notification(v_staff_user_id, 'judge_call') THEN
        INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
        VALUES (
          v_staff_user_id,
          'judge_call',
          'Judge requested',
          'Round ' || v_match_round_number ||
            CASE WHEN v_table_number IS NOT NULL THEN ', Table ' || v_table_number ELSE '' END ||
            ' — ' || v_tournament_name,
          v_tournament_id,
          NEW.id,
          '/to-dashboard/' || v_org_slug || '/tournaments/' || v_tournament_slug || '/manage'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$fn7$;

-- 8. report_match_result
CREATE OR REPLACE FUNCTION public.report_match_result(p_match_id bigint, p_winner_id bigint, p_score1 integer, p_score2 integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn8$
DECLARE
  v_user_id uuid;
  v_match record;
  v_is_participant boolean;
  v_org_id bigint;
  v_is_staff boolean;
  v_best_of integer;
  v_winner_score integer;
  v_loser_score integer;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get match details
  SELECT m.id, m.status, m.alt1_id, m.alt2_id, m.round_id
  INTO v_match
  FROM public.tournament_matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Check if caller is a match participant
  SELECT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.user_id = v_user_id
    AND (v_match.alt1_id = a.id OR v_match.alt2_id = a.id)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    -- Check if caller is community staff with tournament.manage permission
    SELECT t.community_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Match not found';
    END IF;

    SELECT public.has_community_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

    IF NOT v_is_staff THEN
      RAISE EXCEPTION 'Only match participants or org staff can report match results';
    END IF;
  END IF;

  -- Validate match is active
  IF v_match.status != 'active' THEN
    IF v_match.status = 'pending' THEN
      RAISE EXCEPTION 'Match is not active yet. The round must be started first.';
    ELSE
      RAISE EXCEPTION 'Cannot report result for match with status "%"', v_match.status;
    END IF;
  END IF;

  -- Validate winner is one of the players
  IF p_winner_id != v_match.alt1_id AND p_winner_id != v_match.alt2_id THEN
    RAISE EXCEPTION 'Winner must be one of the match participants';
  END IF;

  -- Validate scores are non-negative
  IF p_score1 < 0 OR p_score2 < 0 THEN
    RAISE EXCEPTION 'Scores cannot be negative';
  END IF;

  -- Determine winner and loser scores
  IF p_winner_id = v_match.alt1_id THEN
    v_winner_score := p_score1;
    v_loser_score := p_score2;
  ELSE
    v_winner_score := p_score2;
    v_loser_score := p_score1;
  END IF;

  -- Validate winner's score is strictly greater than loser's score
  IF v_winner_score <= v_loser_score THEN
    RAISE EXCEPTION 'Winner''s score must be strictly greater than loser''s score';
  END IF;

  -- Validate total games do not exceed best_of for the phase
  SELECT COALESCE(tp.best_of, 3)
  INTO v_best_of
  FROM public.tournament_rounds r
  JOIN public.tournament_phases tp ON tp.id = r.phase_id
  WHERE r.id = v_match.round_id;

  IF v_best_of IS NULL THEN
    v_best_of := 3;
  END IF;

  IF (p_score1 + p_score2) > v_best_of THEN
    RAISE EXCEPTION 'Total games (%) cannot exceed best-of-%', (p_score1 + p_score2), v_best_of;
  END IF;

  -- Update match
  UPDATE public.tournament_matches
  SET winner_alt_id = p_winner_id,
      game_wins1 = p_score1,
      game_wins2 = p_score2,
      status = 'completed',
      end_time = now()
  WHERE id = p_match_id;
END;
$fn8$;

-- 9. request_judge
CREATE OR REPLACE FUNCTION public.request_judge(p_match_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn9$
DECLARE
  v_user_id uuid;
  v_org_id bigint;
  v_is_participant boolean;
  v_is_staff boolean;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if caller is a match participant
  SELECT EXISTS (
    SELECT 1 FROM public.alts a
    JOIN public.tournament_matches m ON (m.alt1_id = a.id OR m.alt2_id = a.id)
    WHERE m.id = p_match_id AND a.user_id = v_user_id
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    -- Check if caller is community staff with tournament.manage permission
    SELECT t.community_id INTO v_org_id
    FROM public.tournament_matches m
    JOIN public.tournament_rounds r ON m.round_id = r.id
    JOIN public.tournament_phases p ON r.phase_id = p.id
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE m.id = p_match_id;

    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Match not found';
    END IF;

    SELECT public.has_community_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

    IF NOT v_is_staff THEN
      RAISE EXCEPTION 'Only match participants or org staff can request a judge';
    END IF;
  END IF;

  -- Set staff_requested (only if not already set)
  UPDATE public.tournament_matches
  SET staff_requested = true,
      staff_requested_at = COALESCE(staff_requested_at, now())
  WHERE id = p_match_id
    AND staff_requested = false;
END;
$fn9$;

-- 10. reset_match
CREATE OR REPLACE FUNCTION public.reset_match(p_match_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn10$
DECLARE
  v_user_id uuid;
  v_org_id bigint;
  v_is_staff boolean;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get community for permission check
  SELECT t.community_id INTO v_org_id
  FROM public.tournament_matches m
  JOIN public.tournament_rounds r ON m.round_id = r.id
  JOIN public.tournament_phases p ON r.phase_id = p.id
  JOIN public.tournaments t ON p.tournament_id = t.id
  WHERE m.id = p_match_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  SELECT public.has_community_permission(v_org_id, 'tournament.manage') INTO v_is_staff;
  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Only org staff can reset matches';
  END IF;

  -- Reset all match_games rows to pending (atomic — same transaction)
  UPDATE public.match_games
  SET alt1_selection = NULL,
      alt2_selection = NULL,
      alt1_submitted_at = NULL,
      alt2_submitted_at = NULL,
      winner_alt_id = NULL,
      status = 'pending',
      resolved_by = NULL,
      resolved_at = NULL,
      resolution_notes = NULL
  WHERE match_id = p_match_id;

  -- Reset match score AND status back to active
  UPDATE public.tournament_matches
  SET game_wins1 = 0,
      game_wins2 = 0,
      winner_alt_id = NULL,
      status = 'active',
      end_time = NULL
  WHERE id = p_match_id;
END;
$fn10$;

-- 11. send_tournament_invitations_atomic
CREATE OR REPLACE FUNCTION public.send_tournament_invitations_atomic(p_tournament_id bigint, p_invited_alt_ids bigint[], p_invited_by_alt_id bigint, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn11$
DECLARE
  v_user_id uuid;
  v_tournament record;
  v_occupied integer;
  v_available integer;
  v_new_ids bigint[];
  v_new_count integer;
  v_already_count integer;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate that invited_by_alt_id belongs to the authenticated user
  IF NOT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.id = p_invited_by_alt_id AND a.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invited_by_alt_id');
  END IF;

  -- Lock tournament row and fetch details (includes status)
  SELECT t.id, t.max_participants, t.community_id, t.status
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Tournament must be in a state that allows invitations
  IF v_tournament.status NOT IN ('draft', 'upcoming', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not accepting invitations');
  END IF;

  -- Check permission using existing has_community_permission function
  IF NOT public.has_community_permission(v_tournament.community_id, 'tournament.manage') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You don''t have permission to send invitations');
  END IF;

  -- Count occupied spots: registered + pending non-expired
  SELECT (
    (SELECT COUNT(*) FROM public.tournament_registrations
     WHERE tournament_id = p_tournament_id AND status = 'registered') +
    (SELECT COUNT(*) FROM public.tournament_invitations
     WHERE tournament_id = p_tournament_id
       AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > now()))
  )::integer INTO v_occupied;

  -- Filter to only alts not already invited (any status)
  SELECT ARRAY(
    SELECT unnest(p_invited_alt_ids)
    EXCEPT
    SELECT invited_alt_id FROM public.tournament_invitations
    WHERE tournament_id = p_tournament_id
  ) INTO v_new_ids;

  v_new_count := COALESCE(array_length(v_new_ids, 1), 0);
  v_already_count := COALESCE(array_length(p_invited_alt_ids, 1), 0) - v_new_count;

  -- Check capacity only for new invitations
  IF v_tournament.max_participants IS NOT NULL AND
     v_occupied + v_new_count > v_tournament.max_participants THEN
    v_available := GREATEST(v_tournament.max_participants - v_occupied, 0);
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Not enough spots available. %s spot(s) available, %s requested.',
        v_available, v_new_count
      ),
      'availableSpots', v_available
    );
  END IF;

  -- Insert invitations for new alts only; ON CONFLICT DO NOTHING handles rare concurrent duplicates
  IF v_new_count > 0 THEN
    INSERT INTO public.tournament_invitations (
      tournament_id, invited_alt_id, invited_by_alt_id,
      status, message, invited_at, expires_at
    )
    SELECT
      p_tournament_id,
      unnest(v_new_ids),
      p_invited_by_alt_id,
      'pending',
      p_message,
      now(),
      now() + interval '14 days'
    ON CONFLICT (tournament_id, invited_alt_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitationsSent', v_new_count,
    'alreadyInvited', v_already_count,
    'availableSpots', CASE
      WHEN v_tournament.max_participants IS NULL THEN NULL
      ELSE v_tournament.max_participants - v_occupied - v_new_count
    END
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'One or more invitations already exist. Please refresh and try again.'
    );
  WHEN OTHERS THEN
    RAISE;
END;
$fn11$;

-- 12. start_match
CREATE OR REPLACE FUNCTION public.start_match(p_match_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn12$
DECLARE
  v_user_id uuid;
  v_match record;
  v_is_participant boolean;
  v_org_id bigint;
  v_is_staff boolean;
BEGIN
  -- Get authenticated user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get match details
  SELECT m.id, m.status, m.alt1_id, m.alt2_id, m.round_id
  INTO v_match
  FROM public.tournament_matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Check if caller is a match participant
  SELECT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.user_id = v_user_id
    AND (v_match.alt1_id = a.id OR v_match.alt2_id = a.id)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    -- Check if caller is community staff with tournament.manage permission
    SELECT t.community_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Match not found';
    END IF;

    SELECT public.has_community_permission(v_org_id, 'tournament.manage') INTO v_is_staff;

    IF NOT v_is_staff THEN
      RAISE EXCEPTION 'Only match participants or org staff can start a match';
    END IF;
  END IF;

  -- Validate status
  IF v_match.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot start match with status "%"', v_match.status;
  END IF;

  -- Update match
  UPDATE public.tournament_matches
  SET status = 'active',
      start_time = now()
  WHERE id = p_match_id;
END;
$fn12$;

-- 13. start_round
CREATE OR REPLACE FUNCTION public.start_round(p_round_id bigint, p_best_of_override integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn13$
DECLARE
  v_user_id uuid;
  v_round record;
  v_phase record;
  v_org_id bigint;
  v_best_of integer;
  v_non_bye_ids bigint[];
  v_match_count integer;
  v_game_count integer;
  v_bye_count integer;
  v_now timestamptz := now();
BEGIN
  -- Authenticate
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get round with phase info
  SELECT r.id, r.status, r.round_number, r.phase_id
  INTO v_round
  FROM public.tournament_rounds r
  WHERE r.id = p_round_id;

  IF v_round IS NULL THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  -- Get phase with tournament/community info
  SELECT tp.id, tp.tournament_id, tp.best_of,
         t.community_id, t.status AS tournament_status
  INTO v_phase
  FROM public.tournament_phases tp
  JOIN public.tournaments t ON t.id = tp.tournament_id
  WHERE tp.id = v_round.phase_id;

  IF v_phase IS NULL THEN
    RAISE EXCEPTION 'Phase not found';
  END IF;

  -- Permission check: community owner or staff with tournament.manage
  IF NOT public.has_community_permission(v_phase.community_id, 'tournament.manage') THEN
    RAISE EXCEPTION 'You do not have permission to start this round';
  END IF;

  -- Validate round is pending
  IF v_round.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot start round with status "%"', v_round.status;
  END IF;

  -- If not round 1, ensure previous round is completed
  IF v_round.round_number > 1 THEN
    PERFORM 1
    FROM public.tournament_rounds pr
    WHERE pr.phase_id = v_round.phase_id
      AND pr.round_number = v_round.round_number - 1
      AND pr.status != 'completed';

    IF FOUND THEN
      RAISE EXCEPTION 'Previous round must be completed before starting round %', v_round.round_number;
    END IF;
  END IF;

  -- Verify matches exist
  SELECT COUNT(*) INTO v_match_count
  FROM public.tournament_matches m
  WHERE m.round_id = p_round_id;

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'Cannot start round without pairings. Generate pairings first.';
  END IF;

  -- 1. Update round status to active
  UPDATE public.tournament_rounds
  SET status = 'active',
      start_time = v_now
  WHERE id = p_round_id;

  -- 2. Auto-complete bye matches (player auto-advances)
  UPDATE public.tournament_matches
  SET status = 'completed',
      winner_alt_id = alt1_id,
      end_time = v_now
  WHERE round_id = p_round_id
    AND is_bye = true
    AND status = 'pending';

  GET DIAGNOSTICS v_bye_count = ROW_COUNT;

  -- 3. Set non-bye matches to pending with start_time (clock starts now)
  --    Reset confirmation flags so players must check in fresh
  SELECT ARRAY_AGG(m.id)
  INTO v_non_bye_ids
  FROM public.tournament_matches m
  WHERE m.round_id = p_round_id
    AND m.is_bye = false;

  IF v_non_bye_ids IS NOT NULL AND array_length(v_non_bye_ids, 1) > 0 THEN
    UPDATE public.tournament_matches
    SET start_time = v_now,
        player1_match_confirmed = false,
        player2_match_confirmed = false,
        match_confirmed_at = NULL
    WHERE id = ANY(v_non_bye_ids);

    -- 4. Create games for each non-bye match
    v_best_of := COALESCE(p_best_of_override, v_phase.best_of, 3);

    INSERT INTO public.match_games (match_id, game_number)
    SELECT m.id, gs.n
    FROM public.tournament_matches m
    CROSS JOIN generate_series(1, v_best_of) AS gs(n)
    WHERE m.id = ANY(v_non_bye_ids);

    GET DIAGNOSTICS v_game_count = ROW_COUNT;
  ELSE
    v_game_count := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'matches_activated', COALESCE(array_length(v_non_bye_ids, 1), 0),
    'byes_completed', v_bye_count,
    'games_created', v_game_count,
    'best_of', COALESCE(p_best_of_override, v_phase.best_of, 3)
  );
END;
$fn13$;

-- =============================================================================
-- Add missing audit_action enum value
-- =============================================================================
-- admin.org_request_cancelled was referenced in application code but never
-- added to the database enum.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_request_cancelled';
