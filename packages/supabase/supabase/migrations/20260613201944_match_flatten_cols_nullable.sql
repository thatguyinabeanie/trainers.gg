-- ============================================================================
-- Make match_games / match_messages tournament_id + community_id NULLABLE.
--
-- The flatten migration (..._flatten_match_tournament_community.sql) added these
-- columns NOT NULL. A BEFORE INSERT trigger is the single source of truth that
-- populates them from match_id on every write path, so callers never pass them.
-- But Supabase's generated TablesInsert type marks a NOT-NULL-without-default
-- column as REQUIRED, which forced every match_games/match_messages insert site
-- to supply values the trigger already derives — duplicating the 4-hop lookup
-- the trigger exists to centralize.
--
-- Dropping NOT NULL makes the columns optional in the Insert type (callers stay
-- unchanged, trigger remains the source of truth) while the trigger still
-- guarantees population at runtime. RLS is unaffected: the flat
-- has_community_permission(community_id, ...) staff branch evaluates against the
-- trigger-populated value; the participant branch never reads these columns.
-- ============================================================================

ALTER TABLE public.match_games    ALTER COLUMN tournament_id DROP NOT NULL;
ALTER TABLE public.match_games    ALTER COLUMN community_id  DROP NOT NULL;
ALTER TABLE public.match_messages ALTER COLUMN tournament_id DROP NOT NULL;
ALTER TABLE public.match_messages ALTER COLUMN community_id  DROP NOT NULL;
