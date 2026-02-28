-- =============================================================================
-- Fix functions referencing removed display_name column on alts
-- =============================================================================
-- The display_name column was removed from the alts table in migration
-- 20260212014029. Several functions still referenced it, causing
-- "column display_name does not exist" errors at runtime.
--
-- This fixes four functions:
-- 1. notify_round_start() — fires when a round status changes to 'active'
-- 2. send_game_status_message() — fires when match_games are updated
-- 3. confirm_match_checkin() — RPC for player match check-in
-- 4. audit_match_events() — fires on tournament_matches updates
--
-- All COALESCE(display_name, username) replaced with just username.

-- =============================================================================
-- 1. notify_round_start()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_round_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_tournament_name text;
  v_tournament_slug text;
  v_round_number int;
  v_match record;
  v_alt1 record;
  v_alt2 record;
  v_title text;
  v_body text;
  v_action_url text;
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    -- Get tournament info via join chain
    SELECT t.id, t.name, t.slug, NEW.round_number
    INTO v_tournament_id, v_tournament_name, v_tournament_slug, v_round_number
    FROM public.tournament_phases p
    JOIN public.tournaments t ON p.tournament_id = t.id
    WHERE p.id = NEW.phase_id;

    v_title := v_tournament_name || ' — Round ' || v_round_number;

    -- Loop through all matches
    FOR v_match IN
      SELECT m.id, m.alt1_id, m.alt2_id, m.table_number, m.is_bye
      FROM public.tournament_matches m
      WHERE m.round_id = NEW.id
    LOOP
      v_action_url := '/tournaments/' || v_tournament_slug || '/r/' || v_round_number || '/t/' || COALESCE(v_match.table_number, 0);

      IF v_match.is_bye THEN
        -- Bye match: notify single player
        SELECT a.user_id INTO v_alt1
        FROM public.alts a
        WHERE a.id = v_match.alt1_id;

        v_body := 'You have a bye this round.';

        INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
        VALUES (v_alt1.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);
      ELSE
        -- Regular match: notify both players
        SELECT a.user_id, a.username INTO v_alt1
        FROM public.alts a WHERE a.id = v_match.alt1_id;

        SELECT a.user_id, a.username INTO v_alt2
        FROM public.alts a WHERE a.id = v_match.alt2_id;

        -- Notify player 1
        v_body := 'Round ' || v_round_number;
        IF v_match.table_number IS NOT NULL THEN
          v_body := v_body || ', Table ' || v_match.table_number;
        END IF;
        v_body := v_body || ' — vs ' || COALESCE(v_alt2.username, 'Opponent');

        INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
        VALUES (v_alt1.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);

        -- Notify player 2
        v_body := 'Round ' || v_round_number;
        IF v_match.table_number IS NOT NULL THEN
          v_body := v_body || ', Table ' || v_match.table_number;
        END IF;
        v_body := v_body || ' — vs ' || COALESCE(v_alt1.username, 'Opponent');

        INSERT INTO public.notifications (user_id, type, title, body, tournament_id, match_id, action_url)
        VALUES (v_alt2.user_id, 'tournament_round', v_title, v_body, v_tournament_id, v_match.id, v_action_url);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. send_game_status_message()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_game_status_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_winner_name text;
  v_reporter_name text;
  v_resolver_name text;
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_message text;
BEGIN
  -- Look up winner username when available
  IF NEW.winner_alt_id IS NOT NULL THEN
    SELECT username
      INTO v_winner_name
      FROM public.alts
     WHERE id = NEW.winner_alt_id;
  END IF;

  -- Determine who submitted by checking which submitted_at changed
  SELECT m.alt1_id, m.alt2_id
    INTO v_alt1_id, v_alt2_id
    FROM public.tournament_matches m
   WHERE m.id = NEW.match_id;

  IF OLD.alt1_submitted_at IS DISTINCT FROM NEW.alt1_submitted_at THEN
    SELECT username
      INTO v_reporter_name
      FROM public.alts
     WHERE id = v_alt1_id;
  ELSIF OLD.alt2_submitted_at IS DISTINCT FROM NEW.alt2_submitted_at THEN
    SELECT username
      INTO v_reporter_name
      FROM public.alts
     WHERE id = v_alt2_id;
  END IF;

  -- Self-correction: status stays agreed but winner changed
  IF OLD.status = 'agreed' AND NEW.status = 'agreed'
     AND OLD.winner_alt_id IS DISTINCT FROM NEW.winner_alt_id THEN
    v_message := format('Game %s result corrected by %s — %s won',
                        NEW.game_number,
                        COALESCE(v_reporter_name, 'Unknown'),
                        COALESCE(v_winner_name, 'Unknown'));

  -- Status changed
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'agreed' THEN
        v_message := format('Game %s reported by %s — %s won',
                            NEW.game_number,
                            COALESCE(v_reporter_name, 'Unknown'),
                            COALESCE(v_winner_name, 'Unknown'));
      WHEN 'disputed' THEN
        v_message := format('Game %s disputed — results don''t match',
                            NEW.game_number);
      WHEN 'resolved' THEN
        -- Look up judge name from resolved_by
        IF NEW.resolved_by IS NOT NULL THEN
          SELECT username
            INTO v_resolver_name
            FROM public.alts
           WHERE id = NEW.resolved_by;
        END IF;
        v_message := format('Game %s resolved by %s — %s won',
                            NEW.game_number,
                            COALESCE(v_resolver_name, 'judge'),
                            COALESCE(v_winner_name, 'Unknown'));
      WHEN 'pending' THEN
        v_message := format('Game %s has been reset', NEW.game_number);
      ELSE
        -- No message for other transitions
    END CASE;
  END IF;

  -- Insert system message if we have one
  IF v_message IS NOT NULL THEN
    INSERT INTO public.match_messages (match_id, alt_id, content, message_type)
    VALUES (NEW.match_id, NULL, v_message, 'system');
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. confirm_match_checkin()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.confirm_match_checkin(
  p_match_id bigint,
  p_alt_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    SELECT t.organization_id INTO v_org_id
    FROM public.tournament_rounds r
    JOIN public.tournament_phases p ON p.id = r.phase_id
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE r.id = v_match.round_id;

    IF v_org_id IS NOT NULL THEN
      SELECT public.has_org_permission(v_org_id, 'tournament.manage')
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
$$;

-- =============================================================================
-- 4. audit_match_events()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_match_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tournament_id bigint;
  v_org_id bigint;
  v_actor_user_id uuid;
  v_actor_alt_id bigint;
  v_actor_name text;
  v_description text;
BEGIN
  -- Get tournament context
  SELECT t.id, t.organization_id
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
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, organization_id, metadata)
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
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, organization_id, metadata)
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
      (action, actor_user_id, actor_alt_id, tournament_id, match_id, organization_id, metadata)
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
$$;
