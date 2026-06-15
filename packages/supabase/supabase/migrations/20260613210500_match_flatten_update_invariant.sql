-- =============================================================================
-- Harden match_games / match_messages flatten triggers: fire on UPDATE too
-- =============================================================================
-- CONTEXT
-- -------
-- Migration 20260613175651_flatten_match_tournament_community.sql added
-- denormalized tournament_id/community_id columns to match_games and
-- match_messages, populated by BEFORE INSERT trigger functions that derive
-- the values from match_id via the 4-hop join chain.
--
-- Migration 20260613201944_match_flatten_cols_nullable.sql later dropped the
-- NOT NULL constraint on those 4 columns to keep TablesInsert type ergonomic
-- for callers that don't supply the denormalized values.
--
-- PROBLEM (CodeRabbit — valid)
-- ----------------------------
-- With the columns nullable and the triggers firing only on INSERT, an UPDATE
-- statement can:
--   a) explicitly set community_id/tournament_id to NULL — silently breaking
--      the flattened RLS staff branch (has_community_permission(community_id,
--      'tournament.manage') returns NULL/false for a NULL community_id), or
--   b) set them to an arbitrary mismatched value — spoofing which community
--      the row belongs to and bypassing the intended RLS gate.
--
-- FIX
-- ---
-- Re-derive community_id and tournament_id from match_id on every BEFORE
-- INSERT OR UPDATE by recreating both triggers with the added OR UPDATE event.
-- The existing function bodies are already correct for this (they read from
-- NEW.match_id, which is valid on UPDATE), so the functions are NOT redefined
-- here — only the triggers are dropped and recreated.
--
-- This approach is preferred over a CHECK constraint because it prevents both
-- NULL *and* drift/spoofing, and it keeps the TablesInsert type ergonomic
-- (callers still don't need to supply these columns — the trigger fills them).
--
-- Idempotent: DROP TRIGGER IF EXISTS before CREATE TRIGGER.
-- =============================================================================

-- =============================================================================
-- match_games: extend trigger to fire on INSERT OR UPDATE
-- =============================================================================

DROP TRIGGER IF EXISTS set_match_games_tournament_community_trigger ON public.match_games;

CREATE TRIGGER set_match_games_tournament_community_trigger
  BEFORE INSERT OR UPDATE ON public.match_games
  FOR EACH ROW
  EXECUTE FUNCTION public.set_match_games_tournament_community();

COMMENT ON TRIGGER set_match_games_tournament_community_trigger ON public.match_games IS
  'BEFORE INSERT OR UPDATE: re-derives tournament_id/community_id from match_id on every write, '
  'preventing NULL drift and spoofing of the flattened RLS staff auth path. '
  'Extended from INSERT-only via 20260613210500_match_flatten_update_invariant.sql.';

-- =============================================================================
-- match_messages: extend trigger to fire on INSERT OR UPDATE
-- =============================================================================

DROP TRIGGER IF EXISTS set_match_messages_tournament_community_trigger ON public.match_messages;

CREATE TRIGGER set_match_messages_tournament_community_trigger
  BEFORE INSERT OR UPDATE ON public.match_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_match_messages_tournament_community();

COMMENT ON TRIGGER set_match_messages_tournament_community_trigger ON public.match_messages IS
  'BEFORE INSERT OR UPDATE: re-derives tournament_id/community_id from match_id on every write, '
  'preventing NULL drift and spoofing of the flattened RLS staff auth path. '
  'Extended from INSERT-only via 20260613210500_match_flatten_update_invariant.sql.';
