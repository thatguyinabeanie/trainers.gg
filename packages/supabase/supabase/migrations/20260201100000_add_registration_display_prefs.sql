-- Add display preference columns to tournament_registrations
-- These control how a player's name and country flag appear in brackets

ALTER TABLE public.tournament_registrations
ADD COLUMN IF NOT EXISTS display_name_option text DEFAULT 'username',
ADD COLUMN IF NOT EXISTS show_country_flag boolean DEFAULT true;

COMMENT ON COLUMN public.tournament_registrations.display_name_option IS
  'How to display the player name: username, shortened, or full';
COMMENT ON COLUMN public.tournament_registrations.show_country_flag IS
  'Whether to show the player country flag in brackets';
