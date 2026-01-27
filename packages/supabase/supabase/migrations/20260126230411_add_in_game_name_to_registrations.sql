-- Add in_game_name column to tournament_registrations
-- This stores the player's Switch profile name for display during tournaments

ALTER TABLE public.tournament_registrations
ADD COLUMN in_game_name text;

COMMENT ON COLUMN public.tournament_registrations.in_game_name IS 'Player''s in-game name (e.g., Switch profile name) for tournament display';
