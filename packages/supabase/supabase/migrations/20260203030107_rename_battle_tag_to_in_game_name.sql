-- Rename battle_tag column to in_game_name on alts table
ALTER TABLE public.alts RENAME COLUMN battle_tag TO in_game_name;

COMMENT ON COLUMN public.alts.in_game_name IS 'In-game name (IGN) used to find opponents in-game';
