-- =============================================================================
-- Defense-in-depth: explicit REVOKE EXECUTE ... FROM PUBLIC on the match
-- trigger helpers and has_community_permission
-- =============================================================================
-- Follow-up to 20260615195820_revoke_inappropriate_rpc_grants (CodeRabbit
-- review on PR #361). That migration revoked EXECUTE from `anon` on these
-- functions. A new migration is used here because committed migration files
-- are never edited in this project.
--
-- These FROM PUBLIC revokes are idempotent no-ops TODAY: migration
-- 20260611020600_default_deny_function_execute already ran a blanket
-- `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC` plus an
-- `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`, so
-- PUBLIC currently holds no EXECUTE grant on these functions (and the match
-- trigger helpers were created afterward, under the altered default).
--
-- We add the explicit revokes anyway to:
--   1. document intent at the point of the security hardening, and
--   2. guard against a future migration accidentally GRANT-ing to PUBLIC and
--      silently re-opening these functions to every role.
-- REVOKE of an absent privilege is a no-op, so this is safe to replay.
-- =============================================================================

-- Trigger helpers — never callable as RPCs by any role.
REVOKE EXECUTE ON FUNCTION public.set_match_games_tournament_community() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_match_messages_tournament_community() FROM PUBLIC;

-- Permission check — only meaningful for authenticated/service contexts.
REVOKE EXECUTE ON FUNCTION public.has_community_permission(bigint, text) FROM PUBLIC;
