-- Match System Tables: match_games and match_messages
-- Supports game-by-game blind scoring, persistent match chat, and judge interactions.
--
-- SECURITY NOTE: Players submit blind scores via the submit_game_selection() RPC function,
-- not via direct UPDATE. This prevents a player from modifying the opponent's selection.
-- match_games is NOT published to Realtime to prevent leaking blind selections.
-- (Note: match_games was later added to Realtime in 20260203030400 after scoring changed to single-report.)

-- =============================================================================
-- ENUM: match_game_status
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_game_status') THEN
    CREATE TYPE public.match_game_status AS ENUM (
      'pending',       -- game not yet started
      'awaiting_both', -- waiting for both players to submit
      'awaiting_one',  -- one player submitted, waiting for the other
      'agreed',        -- both players agree on winner
      'disputed',      -- players disagree, needs judge
      'resolved',      -- judge resolved a dispute
      'cancelled'      -- game cancelled (e.g. match reset)
    );
  END IF;
END $$;

COMMENT ON TYPE public.match_game_status IS 'Status of an individual game within a match';

-- =============================================================================
-- ENUM: match_message_type
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_message_type') THEN
    CREATE TYPE public.match_message_type AS ENUM (
      'player',  -- regular player message
      'system',  -- system-generated event message
      'judge'    -- judge message
    );
  END IF;
END $$;

COMMENT ON TYPE public.match_message_type IS 'Type of message in match chat';

-- =============================================================================
-- TABLE: match_games
-- =============================================================================
-- Tracks individual games within a best-of-N match.
-- Both players independently select a winner (blind entry).
-- System compares: if they agree -> lock result. If they disagree -> auto-dispute.

CREATE TABLE IF NOT EXISTS public.match_games (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  match_id bigint NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  game_number smallint NOT NULL,

  -- Blind scoring: each player independently selects who they think won
  alt1_selection bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  alt2_selection bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  alt1_submitted_at timestamptz,
  alt2_submitted_at timestamptz,

  -- Resolved winner (set when both agree, or judge overrides)
  winner_alt_id bigint REFERENCES public.alts(id) ON DELETE SET NULL,

  -- Status tracking
  status public.match_game_status NOT NULL DEFAULT 'pending',

  -- Judge resolution
  resolved_by bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Each game number is unique per match
  CONSTRAINT match_games_unique_game UNIQUE (match_id, game_number),
  -- Game number must be positive (up to best-of-9)
  CONSTRAINT match_games_game_number_positive CHECK (game_number >= 1 AND game_number <= 9)
);

ALTER TABLE public.match_games OWNER TO postgres;

COMMENT ON TABLE public.match_games IS 'Individual games within a tournament match, supporting blind scoring';
COMMENT ON COLUMN public.match_games.id IS 'Primary key';
COMMENT ON COLUMN public.match_games.match_id IS 'Parent match this game belongs to';
COMMENT ON COLUMN public.match_games.game_number IS 'Game number within the match (1, 2, 3, etc.)';
COMMENT ON COLUMN public.match_games.alt1_selection IS 'Alt ID that player 1 selected as game winner (blind)';
COMMENT ON COLUMN public.match_games.alt2_selection IS 'Alt ID that player 2 selected as game winner (blind)';
COMMENT ON COLUMN public.match_games.alt1_submitted_at IS 'When player 1 submitted their selection';
COMMENT ON COLUMN public.match_games.alt2_submitted_at IS 'When player 2 submitted their selection';
COMMENT ON COLUMN public.match_games.winner_alt_id IS 'Resolved winner of this game';
COMMENT ON COLUMN public.match_games.status IS 'Current status of this game';
COMMENT ON COLUMN public.match_games.resolved_by IS 'Judge who resolved a dispute (if applicable)';
COMMENT ON COLUMN public.match_games.resolved_at IS 'When the dispute was resolved';
COMMENT ON COLUMN public.match_games.resolution_notes IS 'Judge notes explaining the resolution';

-- Indexes on match_id and FK columns
CREATE INDEX IF NOT EXISTS match_games_match_id_idx ON public.match_games (match_id);
CREATE INDEX IF NOT EXISTS match_games_status_idx ON public.match_games (status) WHERE status NOT IN ('agreed', 'resolved', 'cancelled');
CREATE INDEX IF NOT EXISTS match_games_winner_alt_id_idx ON public.match_games (winner_alt_id) WHERE winner_alt_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_match_games_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_match_games_updated_at ON public.match_games;
CREATE TRIGGER update_match_games_updated_at
  BEFORE UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_games_updated_at();

-- =============================================================================
-- FUNCTION: compare_game_selections
-- =============================================================================
-- When both players have submitted, compare their selections.
-- If they agree -> set winner + status = 'agreed'.
-- If they disagree -> set status = 'disputed'.

CREATE OR REPLACE FUNCTION public.compare_game_selections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Track submission status transitions (first selection submitted)
  IF NEW.alt1_selection IS NOT NULL AND NEW.alt2_selection IS NULL AND OLD.status = 'pending' THEN
    NEW.status := 'awaiting_one';
  ELSIF NEW.alt1_selection IS NULL AND NEW.alt2_selection IS NOT NULL AND OLD.status = 'pending' THEN
    NEW.status := 'awaiting_one';
  END IF;

  -- Both selections present and game is still in a submittable state
  IF NEW.alt1_selection IS NOT NULL
    AND NEW.alt2_selection IS NOT NULL
    AND NEW.status IN ('pending', 'awaiting_both', 'awaiting_one')
  THEN
    IF NEW.alt1_selection = NEW.alt2_selection THEN
      -- Players agree
      NEW.winner_alt_id := NEW.alt1_selection;
      NEW.status := 'agreed';
    ELSE
      -- Players disagree -> auto-dispute
      NEW.status := 'disputed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compare_game_selections_trigger ON public.match_games;
CREATE TRIGGER compare_game_selections_trigger
  BEFORE UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.compare_game_selections();

-- =============================================================================
-- FUNCTION: auto_request_staff_on_dispute
-- =============================================================================
-- When a game enters 'disputed' status, automatically set staff_requested on the match.

CREATE OR REPLACE FUNCTION public.auto_request_staff_on_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'disputed' AND (OLD.status IS NULL OR OLD.status != 'disputed') THEN
    UPDATE public.tournament_matches
    SET staff_requested = true,
        staff_requested_at = COALESCE(staff_requested_at, now())
    WHERE id = NEW.match_id
      AND staff_requested = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_request_staff_on_dispute_trigger ON public.match_games;
CREATE TRIGGER auto_request_staff_on_dispute_trigger
  AFTER UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_request_staff_on_dispute();

-- =============================================================================
-- RLS: match_games
-- =============================================================================
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;

-- SELECT: Authenticated users can view match games, but blind selections are
-- hidden until the game is resolved. The application layer must use the
-- get_match_game_for_player() function to get the correct view.
-- The raw SELECT shows all data to keep RLS simple; application-layer
-- functions handle redaction.
DROP POLICY IF EXISTS "Authenticated users can view match games" ON public.match_games;
CREATE POLICY "Authenticated users can view match games"
  ON public.match_games
  FOR SELECT
  TO authenticated
  USING (true);

-- NO direct UPDATE policy for players. Players submit scores via
-- the submit_game_selection() SECURITY DEFINER function below.
-- This prevents a player from modifying the opponent's selection.

-- Org staff with tournament.manage can insert/update/delete (for judge actions)
DROP POLICY IF EXISTS "Tournament staff can manage match games" ON public.match_games;
CREATE POLICY "Tournament staff can manage match games"
  ON public.match_games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );

-- =============================================================================
-- FUNCTION: submit_game_selection (RPC for blind scoring)
-- =============================================================================
-- Players call this function to submit their game winner selection.
-- The function enforces:
-- 1. Caller must be a participant in the match
-- 2. Caller can only write to their own selection column
-- 3. Game must be in a submittable status (pending, awaiting_both, awaiting_one)
-- 4. Selection must be one of the two match participants

CREATE OR REPLACE FUNCTION public.submit_game_selection(
  p_game_id bigint,
  p_selected_winner_alt_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_match_id bigint;
  v_game_status public.match_game_status;
  v_alt1_id bigint;
  v_alt2_id bigint;
  v_caller_alt_id bigint;
  v_is_alt1 boolean;
BEGIN
  -- Get the game and match info
  SELECT g.match_id, g.status, m.alt1_id, m.alt2_id
  INTO v_match_id, v_game_status, v_alt1_id, v_alt2_id
  FROM public.match_games g
  JOIN public.tournament_matches m ON g.match_id = m.id
  WHERE g.id = p_game_id;

  IF v_match_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;

  -- Verify game is in a submittable state
  IF v_game_status NOT IN ('pending', 'awaiting_both', 'awaiting_one') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not accepting submissions');
  END IF;

  -- Verify selected winner is one of the match participants
  IF p_selected_winner_alt_id != v_alt1_id AND p_selected_winner_alt_id != v_alt2_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selected winner must be a match participant');
  END IF;

  -- Find caller's alt that matches a match participant
  SELECT a.id, (a.id = v_alt1_id)
  INTO v_caller_alt_id, v_is_alt1
  FROM public.alts a
  WHERE a.user_id = (SELECT auth.uid())
    AND (a.id = v_alt1_id OR a.id = v_alt2_id)
  LIMIT 1;

  IF v_caller_alt_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a participant in this match');
  END IF;

  -- Update only the caller's selection column
  IF v_is_alt1 THEN
    UPDATE public.match_games
    SET alt1_selection = p_selected_winner_alt_id,
        alt1_submitted_at = now()
    WHERE id = p_game_id
      AND status IN ('pending', 'awaiting_both', 'awaiting_one');
  ELSE
    UPDATE public.match_games
    SET alt2_selection = p_selected_winner_alt_id,
        alt2_submitted_at = now()
    WHERE id = p_game_id
      AND status IN ('pending', 'awaiting_both', 'awaiting_one');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.submit_game_selection(bigint, bigint) IS
  'Submit a blind game winner selection. Only modifies the callers own selection column.';

GRANT EXECUTE ON FUNCTION public.submit_game_selection(bigint, bigint) TO authenticated;

-- =============================================================================
-- FUNCTION: get_match_games_for_player (redacts opponent selections)
-- =============================================================================
-- Returns match game data with opponent's blind selection hidden
-- until the game reaches agreed/disputed/resolved status.

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
  alt2_selection bigint
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
      THEN g.alt2_selection ELSE NULL END AS alt2_selection
  FROM public.match_games g
  WHERE g.match_id = p_match_id
  ORDER BY g.game_number;
END;
$$;

COMMENT ON FUNCTION public.get_match_games_for_player(bigint) IS
  'Get match games with opponent blind selections redacted until game resolution';

GRANT EXECUTE ON FUNCTION public.get_match_games_for_player(bigint) TO authenticated;

-- =============================================================================
-- TABLE: match_messages
-- =============================================================================
-- Persistent chat for each match. Includes player messages, system events,
-- and judge messages. Loaded on match page open, new messages via Realtime.

CREATE TABLE IF NOT EXISTS public.match_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  match_id bigint NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  alt_id bigint REFERENCES public.alts(id) ON DELETE SET NULL,
  message_type public.match_message_type NOT NULL DEFAULT 'player',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Content length limit
  CONSTRAINT match_messages_content_length CHECK (char_length(content) <= 500)
);

ALTER TABLE public.match_messages OWNER TO postgres;

COMMENT ON TABLE public.match_messages IS 'Chat messages within a tournament match';
COMMENT ON COLUMN public.match_messages.id IS 'Primary key';
COMMENT ON COLUMN public.match_messages.match_id IS 'Match this message belongs to';
COMMENT ON COLUMN public.match_messages.alt_id IS 'Alt who sent the message (null for system messages)';
COMMENT ON COLUMN public.match_messages.message_type IS 'Type: player, system, or judge';
COMMENT ON COLUMN public.match_messages.content IS 'Message content (max 500 chars)';

-- Indexes
CREATE INDEX IF NOT EXISTS match_messages_match_id_idx ON public.match_messages (match_id);
CREATE INDEX IF NOT EXISTS match_messages_match_id_created_at_idx ON public.match_messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS match_messages_alt_id_idx ON public.match_messages (alt_id) WHERE alt_id IS NOT NULL;

-- =============================================================================
-- RLS: match_messages
-- =============================================================================
ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;

-- Match participants and org staff can view messages
DROP POLICY IF EXISTS "Match participants and staff can view messages" ON public.match_messages;
CREATE POLICY "Match participants and staff can view messages"
  ON public.match_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Match participant
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    -- Org staff with tournament.manage permission
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );

-- Match participants can send messages
DROP POLICY IF EXISTS "Match participants can send messages" ON public.match_messages;
CREATE POLICY "Match participants can send messages"
  ON public.match_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    message_type = 'player'
    AND alt_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND a.id = alt_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
  );

-- Org staff can send judge messages and system messages
DROP POLICY IF EXISTS "Tournament staff can send judge/system messages" ON public.match_messages;
CREATE POLICY "Tournament staff can send judge/system messages"
  ON public.match_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    message_type IN ('judge', 'system')
    AND EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_org_permission(t.organization_id, 'tournament.manage')
    )
  );

-- =============================================================================
-- REALTIME: Enable for match_messages only
-- =============================================================================
-- NOTE: match_games is intentionally NOT published to Realtime.
-- Publishing match_games would leak blind selections before both players submit.
-- Game status updates are communicated via system messages in match_messages.
-- (Superseded by 20260203030400_single_report_scoring.sql which adds match_games to Realtime.)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.match_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
