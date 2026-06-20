-- =============================================================================
-- Revoke EXECUTE grants on SECURITY DEFINER functions that should not be
-- callable by anon or authenticated users
-- =============================================================================
-- The Supabase security linter flagged several SECURITY DEFINER functions
-- as callable by anon or authenticated when they should not be.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- check_table_privilege — DB privilege introspection
-- -----------------------------------------------------------------------------
-- This function was created in migration 20260613210600 with
-- REVOKE EXECUTE FROM PUBLIC + GRANT TO service_role, but may still be
-- reachable if anon/authenticated have leftover explicit grants.
-- Explicitly revoke from both roles as defense-in-depth.
REVOKE EXECUTE ON FUNCTION public.check_table_privilege(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_table_privilege(text, text, text) FROM authenticated;

-- -----------------------------------------------------------------------------
-- set_match_games_tournament_community — trigger function, not a public RPC
-- set_match_messages_tournament_community — same
-- -----------------------------------------------------------------------------
-- These functions are invoked by PostgreSQL triggers on INSERT to match_games
-- and match_messages. They were not given explicit anon grants, but the
-- PostgreSQL default grants EXECUTE to PUBLIC on CREATE. Revoke anon access
-- so the functions cannot be called as RPCs via /rest/v1/rpc/.
REVOKE EXECUTE ON FUNCTION public.set_match_games_tournament_community() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_match_messages_tournament_community() FROM anon;

-- -----------------------------------------------------------------------------
-- has_community_permission — permission check, not meaningful for anon
-- -----------------------------------------------------------------------------
-- Explicitly granted to anon in 20260612203747_grant_has_community_permission_execute_to_anon.sql.
-- Anon users have no community permissions; allowing anon to call this only
-- exposes the permission model to unauthenticated probing.
REVOKE EXECUTE ON FUNCTION public.has_community_permission(bigint, text) FROM anon;

-- -----------------------------------------------------------------------------
-- get_email_by_username — needed by anon for login; not by authenticated users
-- -----------------------------------------------------------------------------
-- Granted to both anon and authenticated in multiple migrations. Anon needs
-- this to initiate username-based login (get_email_by_username is called before
-- auth.signInWithPassword). Authenticated users have no legitimate reason to
-- look up other users' email addresses by username (privacy risk).
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM authenticated;
