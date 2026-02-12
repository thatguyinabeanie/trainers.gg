-- Remove in_game_name column from alts table
--
-- Context: in_game_name (IGN) is tournament-specific and can change between tournaments,
-- so it should only be stored on tournament_registrations.in_game_name, not as a permanent
-- property of an alt.
--
-- This migration removes the redundant column from alts while preserving the correct
-- tournament-specific IGN data in tournament_registrations.

ALTER TABLE public.alts DROP COLUMN IF EXISTS in_game_name;
