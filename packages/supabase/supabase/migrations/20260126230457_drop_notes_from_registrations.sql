-- Drop unused notes column from tournament_registrations
-- Registration-specific notes are not needed; in_game_name serves the display purpose

ALTER TABLE public.tournament_registrations
DROP COLUMN IF EXISTS notes;
