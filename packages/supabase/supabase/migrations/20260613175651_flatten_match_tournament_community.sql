-- =============================================================================
-- Flatten match_games / match_messages RLS: denormalize tournament_id + community_id
-- =============================================================================
-- Phase 3 task P3-2.
--
-- PROBLEM
-- -------
-- The SELECT policies on match_games and match_messages each contain a
-- 4-hop join in their "staff" branch:
--
--     match_games (match_id)
--       → tournament_matches m
--       → tournament_rounds r        (m.round_id = r.id)
--       → tournament_phases p        (r.phase_id = p.id)
--       → tournaments t              (p.tournament_id = t.id)
--       → has_community_permission(t.community_id, 'tournament.manage')
--
-- Because RLS predicates are re-evaluated PER ROW (and, for these realtime
-- tables, per realtime event), this join is executed over and over. For a busy
-- match chat or a long best-of-N game list this is pure overhead — the
-- community is fixed for the whole match and never changes mid-match.
--
-- FIX
-- ---
-- Denormalize the two values that the staff branch needs (tournament_id and
-- community_id) directly onto match_games and match_messages. The staff branch
-- then collapses to a single flat call:
--
--     has_community_permission(community_id, 'tournament.manage')
--
-- — no join, evaluated against a column already on the row.
--
-- The participant branch is UNCHANGED (it already only hops match_id → alts →
-- auth.uid(), which is cheap and correct). The set of rows admitted by each
-- policy is IDENTICAL before and after: community_id on each row is exactly
-- t.community_id derived through the same 4-hop chain, just precomputed.
--
-- WRITE PATHS
-- -----------
-- There are several write paths into these tables (submit_game_selection,
-- createMatchGamesAction, sendMatchMessageAction, the judge RPCs, and the
-- compare/auto-dispute triggers that INSERT system messages). Rather than
-- patch every callsite, a single BEFORE INSERT trigger on each table derives
-- tournament_id + community_id from match_id. This is the single source of
-- truth and cannot be bypassed by a new write path.
--
-- AUTHORITATIVE PRIOR STATE
-- -------------------------
-- This migration rewrites the SELECT policies as they exist after
-- 20260404051423_fix_multiple_permissive_rls_policies.sql (which fixed the
-- stale organization_id → community_id reference). The write-only policies
-- (INSERT/UPDATE/DELETE) from that migration are intentionally left untouched —
-- they are not in the per-row realtime read hot path.
--
-- Idempotent throughout: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, DROP TRIGGER/POLICY IF EXISTS before create.
-- After-apply: run `pnpm generate-types` to add the 4 new columns to types.ts.
-- =============================================================================

-- =============================================================================
-- 1. Add denormalized columns
-- =============================================================================
-- ON DELETE CASCADE mirrors the existing match_id FK behavior (match_games.
-- match_id and match_messages.match_id both REFERENCE tournament_matches(id)
-- ON DELETE CASCADE). If the tournament/community is deleted, these rows go too.

ALTER TABLE public.match_games
  ADD COLUMN IF NOT EXISTS tournament_id bigint
    REFERENCES public.tournaments(id) ON DELETE CASCADE;
ALTER TABLE public.match_games
  ADD COLUMN IF NOT EXISTS community_id bigint
    REFERENCES public.communities(id) ON DELETE CASCADE;

ALTER TABLE public.match_messages
  ADD COLUMN IF NOT EXISTS tournament_id bigint
    REFERENCES public.tournaments(id) ON DELETE CASCADE;
ALTER TABLE public.match_messages
  ADD COLUMN IF NOT EXISTS community_id bigint
    REFERENCES public.communities(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.match_games.tournament_id IS
  'Denormalized tournament id (derived from match_id via rounds→phases). Flattens the staff RLS branch — see 20260613175651 migration.';
COMMENT ON COLUMN public.match_games.community_id IS
  'Denormalized community id (derived from match_id via rounds→phases→tournaments). Used directly by has_community_permission() in the SELECT policy staff branch.';
COMMENT ON COLUMN public.match_messages.tournament_id IS
  'Denormalized tournament id (derived from match_id via rounds→phases). Flattens the staff RLS branch — see 20260613175651 migration.';
COMMENT ON COLUMN public.match_messages.community_id IS
  'Denormalized community id (derived from match_id via rounds→phases→tournaments). Used directly by has_community_permission() in the SELECT policy staff branch.';

-- =============================================================================
-- 2. Indexes on the new FK columns
-- =============================================================================
-- The staff RLS branch filters on community_id; index it. tournament_id is also
-- indexed (FK columns are not auto-indexed by Postgres and both are useful for
-- cascade deletes and ad-hoc per-tournament queries).

CREATE INDEX IF NOT EXISTS match_games_tournament_id_idx
  ON public.match_games (tournament_id);
CREATE INDEX IF NOT EXISTS match_games_community_id_idx
  ON public.match_games (community_id);

CREATE INDEX IF NOT EXISTS match_messages_tournament_id_idx
  ON public.match_messages (tournament_id);
CREATE INDEX IF NOT EXISTS match_messages_community_id_idx
  ON public.match_messages (community_id);

-- =============================================================================
-- 3. Backfill existing rows from the 4-hop chain
-- =============================================================================
-- Idempotent: only fills rows that are still NULL, so a replay (or a partial
-- prior run) is safe. The chain is the same one the old RLS staff branch used.

UPDATE public.match_games g
SET tournament_id = t.id,
    community_id  = t.community_id
FROM public.tournament_matches m
JOIN public.tournament_rounds r ON m.round_id = r.id
JOIN public.tournament_phases p ON r.phase_id = p.id
JOIN public.tournaments t       ON p.tournament_id = t.id
WHERE g.match_id = m.id
  AND (g.tournament_id IS NULL OR g.community_id IS NULL);

UPDATE public.match_messages mm
SET tournament_id = t.id,
    community_id  = t.community_id
FROM public.tournament_matches m
JOIN public.tournament_rounds r ON m.round_id = r.id
JOIN public.tournament_phases p ON r.phase_id = p.id
JOIN public.tournaments t       ON p.tournament_id = t.id
WHERE mm.match_id = m.id
  AND (mm.tournament_id IS NULL OR mm.community_id IS NULL);

-- =============================================================================
-- 4. Enforce NOT NULL after backfill
-- =============================================================================
-- Idempotent: SET NOT NULL on an already-NOT-NULL column is a no-op. The
-- BEFORE INSERT trigger (section 5) guarantees future rows are populated, so
-- there is no window where a NULL can be inserted.

ALTER TABLE public.match_games  ALTER COLUMN tournament_id SET NOT NULL;
ALTER TABLE public.match_games  ALTER COLUMN community_id  SET NOT NULL;
ALTER TABLE public.match_messages ALTER COLUMN tournament_id SET NOT NULL;
ALTER TABLE public.match_messages ALTER COLUMN community_id  SET NOT NULL;

-- =============================================================================
-- 5. BEFORE INSERT triggers — single source of truth for the denormalized cols
-- =============================================================================
-- Every INSERT into match_games / match_messages derives tournament_id +
-- community_id from match_id, regardless of write path. If a caller supplies
-- the values explicitly they are overwritten with the authoritative derived
-- values (preventing drift / spoofing). SECURITY DEFINER + empty search_path
-- follows the project convention for trigger functions.

CREATE OR REPLACE FUNCTION public.set_match_games_tournament_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT t.id, t.community_id
  INTO NEW.tournament_id, NEW.community_id
  FROM public.tournament_matches m
  JOIN public.tournament_rounds r ON m.round_id = r.id
  JOIN public.tournament_phases p ON r.phase_id = p.id
  JOIN public.tournaments t       ON p.tournament_id = t.id
  WHERE m.id = NEW.match_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_match_games_tournament_community() IS
  'BEFORE INSERT trigger: derive match_games.tournament_id/community_id from match_id. Single source of truth for the denormalized RLS columns.';

DROP TRIGGER IF EXISTS set_match_games_tournament_community_trigger ON public.match_games;
CREATE TRIGGER set_match_games_tournament_community_trigger
  BEFORE INSERT ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.set_match_games_tournament_community();

CREATE OR REPLACE FUNCTION public.set_match_messages_tournament_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT t.id, t.community_id
  INTO NEW.tournament_id, NEW.community_id
  FROM public.tournament_matches m
  JOIN public.tournament_rounds r ON m.round_id = r.id
  JOIN public.tournament_phases p ON r.phase_id = p.id
  JOIN public.tournaments t       ON p.tournament_id = t.id
  WHERE m.id = NEW.match_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_match_messages_tournament_community() IS
  'BEFORE INSERT trigger: derive match_messages.tournament_id/community_id from match_id. Single source of truth for the denormalized RLS columns.';

DROP TRIGGER IF EXISTS set_match_messages_tournament_community_trigger ON public.match_messages;
CREATE TRIGGER set_match_messages_tournament_community_trigger
  BEFORE INSERT ON public.match_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_match_messages_tournament_community();

-- =============================================================================
-- 6. Rewrite SELECT policies with the flattened staff branch
-- =============================================================================
-- Participant branch: UNCHANGED (match_id → alts → auth.uid()).
-- Staff branch: 4-hop join replaced with a flat has_community_permission()
-- call against the denormalized community_id column. Same rows admitted.

-- match_games SELECT
DROP POLICY IF EXISTS "Match participants and staff can view match games" ON public.match_games;
CREATE POLICY "Match participants and staff can view match games"
  ON public.match_games FOR SELECT TO authenticated
  USING (
    -- Match participant (unchanged)
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    -- Community staff with tournament.manage permission (flattened — no join)
    public.has_community_permission(community_id, 'tournament.manage')
  );

-- match_messages SELECT
DROP POLICY IF EXISTS "Match participants and staff can view messages" ON public.match_messages;
CREATE POLICY "Match participants and staff can view messages"
  ON public.match_messages FOR SELECT TO authenticated
  USING (
    -- Match participant (unchanged)
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    -- Community staff with tournament.manage permission (flattened — no join)
    public.has_community_permission(community_id, 'tournament.manage')
  );
