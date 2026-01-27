-- Add in_game_name column to tournament_registrations
-- This stores the player's Nintendo Switch profile name for verification during check-in

ALTER TABLE public.tournament_registrations
ADD COLUMN in_game_name text;

COMMENT ON COLUMN public.tournament_registrations.in_game_name IS 'Player''s Nintendo Switch profile name for verification';
