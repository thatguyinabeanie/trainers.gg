-- =============================================================================
-- No-Show Auto-Detection & Game Escalation
-- =============================================================================
-- Automatically awards games to the present player when their opponent fails
-- to check in for a match. A pg_cron job runs every minute, checking for
-- matches where exactly one player has confirmed and the check-in window
-- has elapsed. For each elapsed interval, a game is awarded to the present
-- player. When enough games are awarded, the existing
-- update_match_scores_from_games trigger auto-completes the match.
--
-- Key design decisions:
-- 1. is_no_show column on match_games distinguishes auto-awards from real wins
--    (useful for tiebreaker calculations).
-- 2. Games are INSERTed as 'pending' then UPDATEd to 'resolved' so the
--    existing AFTER UPDATE trigger fires and handles score counting + match
--    completion.
-- 3. The first check-in timestamp is derived from the earliest "checked in"
--    system message in match_messages for that match.
-- 4. pg_cron is wrapped in an exception handler for environments where the
--    extension is not available (e.g. local dev).

-- =============================================================================
-- 1. Add is_no_show column to match_games
-- =============================================================================

ALTER TABLE public.match_games
  ADD COLUMN IF NOT EXISTS is_no_show boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.match_games.is_no_show IS
  'True when this game was auto-awarded due to opponent no-show (for tiebreaker calculations)';

-- =============================================================================
-- 2. Add match_no_show to the notification_type enum
-- =============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'match_no_show';

-- =============================================================================
-- 3. Create check_no_show_escalation() function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_no_show_escalation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
      t.organization_id,
      o.slug AS org_slug
    FROM public.tournament_matches m
    JOIN public.tournament_rounds r ON r.id = m.round_id
    JOIN public.tournament_phases tp ON tp.id = r.phase_id
    JOIN public.tournaments t ON t.id = tp.tournament_id
    JOIN public.organizations o ON o.id = t.organization_id
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
    v_org_id := v_match.organization_id;
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
        SELECT DISTINCT os.user_id
        FROM public.organization_staff os
        JOIN public.user_group_roles ugr ON ugr.user_id = os.user_id
        JOIN public.group_roles gr ON ugr.group_role_id = gr.id
        JOIN public.groups g ON gr.group_id = g.id
        JOIN public.roles r ON gr.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions perm ON rp.permission_id = perm.id
        WHERE os.organization_id = v_org_id
          AND g.organization_id = v_org_id
          AND perm.key = 'tournament.manage'
        UNION
        SELECT org.owner_user_id
        FROM public.organizations org
        WHERE org.id = v_org_id
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
$$;

COMMENT ON FUNCTION public.check_no_show_escalation() IS
  'Cron-driven function that auto-awards games when a player fails to check in. '
  'Runs every minute via pg_cron.';

-- =============================================================================
-- 4. Schedule pg_cron job (gracefully handle missing extension)
-- =============================================================================

DO $$
BEGIN
  -- Enable pg_cron extension if available
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Remove existing job if present (idempotent)
  PERFORM cron.unschedule('no-show-escalation')
  FROM cron.job
  WHERE jobname = 'no-show-escalation';

  -- Schedule every minute
  PERFORM cron.schedule(
    'no-show-escalation',
    '* * * * *',
    $$SELECT public.check_no_show_escalation()$$
  );

EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available (e.g. local dev) — log and continue
  RAISE NOTICE 'pg_cron not available, skipping no-show escalation schedule: %', SQLERRM;
END $$;

-- =============================================================================
-- 5. Update get_match_games_for_player to include is_no_show
-- =============================================================================
-- The RPC function uses an explicit RETURNS TABLE, so it must be updated to
-- expose the new column. CREATE OR REPLACE cannot change the return type,
-- so we DROP and recreate.

DROP FUNCTION IF EXISTS public.get_match_games_for_player(bigint);

CREATE OR REPLACE FUNCTION public.get_match_games_for_player(p_match_id bigint)
RETURNS TABLE (
  id bigint,
  match_id bigint,
  game_number smallint,
  my_selection bigint,
  my_submitted_at timestamptz,
  opponent_submitted boolean,
  winner_alt_id bigint,
  status public.match_game_status,
  resolved_by bigint,
  resolved_at timestamptz,
  resolution_notes text,
  -- Only revealed after both submit
  alt1_selection bigint,
  alt2_selection bigint,
  -- No-show indicator
  is_no_show boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_alt_id bigint;
  v_is_alt1 boolean;
  v_alt1_id bigint;
  v_alt2_id bigint;
BEGIN
  -- Determine caller's position in the match
  SELECT m.alt1_id, m.alt2_id
  INTO v_alt1_id, v_alt2_id
  FROM public.tournament_matches m
  WHERE m.id = p_match_id;

  SELECT a.id, (a.id = v_alt1_id)
  INTO v_caller_alt_id, v_is_alt1
  FROM public.alts a
  WHERE a.user_id = (SELECT auth.uid())
    AND (a.id = v_alt1_id OR a.id = v_alt2_id)
  LIMIT 1;

  -- Return games with appropriate redaction
  RETURN QUERY
  SELECT
    g.id,
    g.match_id,
    g.game_number,
    -- My selection
    CASE WHEN v_is_alt1 THEN g.alt1_selection ELSE g.alt2_selection END AS my_selection,
    CASE WHEN v_is_alt1 THEN g.alt1_submitted_at ELSE g.alt2_submitted_at END AS my_submitted_at,
    -- Whether opponent has submitted (without revealing their pick)
    CASE WHEN v_is_alt1
      THEN g.alt2_submitted_at IS NOT NULL
      ELSE g.alt1_submitted_at IS NOT NULL
    END AS opponent_submitted,
    g.winner_alt_id,
    g.status,
    g.resolved_by,
    g.resolved_at,
    g.resolution_notes,
    -- Only reveal both selections after game is resolved
    CASE WHEN g.status IN ('agreed', 'disputed', 'resolved')
      THEN g.alt1_selection ELSE NULL END AS alt1_selection,
    CASE WHEN g.status IN ('agreed', 'disputed', 'resolved')
      THEN g.alt2_selection ELSE NULL END AS alt2_selection,
    -- No-show indicator (always visible)
    g.is_no_show
  FROM public.match_games g
  WHERE g.match_id = p_match_id
  ORDER BY g.game_number;
END;
$$;

COMMENT ON FUNCTION public.get_match_games_for_player(bigint) IS
  'Get match games with opponent blind selections redacted until game resolution. Includes is_no_show indicator.';

GRANT EXECUTE ON FUNCTION public.get_match_games_for_player(bigint) TO authenticated;
