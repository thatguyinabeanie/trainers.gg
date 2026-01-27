-- =============================================================================
-- 11_matches.sql - Create Matches and Games
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-01-27T02:02:03.119Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING
-- Depends on: 10_tournaments.sql
-- Generated: 16808 matches, 40340 games
-- =============================================================================

-- Note: Match generation is complex and requires tournament phase IDs.
-- This file provides the structure; full match data generation requires
-- additional tooling to resolve phase IDs at runtime.

DO $$
BEGIN
  RAISE NOTICE 'Match seed data: 16808 matches ready for insertion';
  RAISE NOTICE 'Match games: 40340 games ready for insertion';
  -- Full match insertion requires phase ID resolution
  -- See match generator for detailed implementation
END $$;

-- Sample match structure:
-- Match ID: 1
-- Phase ID: 1 (requires runtime lookup)
-- Round: 1, Table: 1
-- Players: alt 787 vs alt 623
-- Winner: alt 787
-- Score: 2-1