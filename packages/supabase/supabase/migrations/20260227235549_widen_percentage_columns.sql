-- =============================================================================
-- Widen percentage columns from numeric(5,4) to numeric(7,4)
-- =============================================================================
-- The standings calculation stores percentages in the 0-100 range (e.g., 66.67)
-- but the columns were defined as numeric(5,4) which caps at 9.9999.
-- This caused "numeric field overflow" errors when upserting stats.
--
-- Widening to numeric(7,4) supports values up to 999.9999, which is more than
-- enough for any percentage value (max 100.0000).

-- tournament_player_stats
ALTER TABLE public.tournament_player_stats
  ALTER COLUMN match_win_percentage TYPE numeric(7,4),
  ALTER COLUMN game_win_percentage TYPE numeric(7,4),
  ALTER COLUMN opponent_match_win_percentage TYPE numeric(7,4),
  ALTER COLUMN opponent_game_win_percentage TYPE numeric(7,4),
  ALTER COLUMN opponent_opponent_match_win_percentage TYPE numeric(7,4);

-- tournament_standings
ALTER TABLE public.tournament_standings
  ALTER COLUMN match_win_percentage TYPE numeric(7,4),
  ALTER COLUMN game_win_percentage TYPE numeric(7,4),
  ALTER COLUMN opponent_match_win_percentage TYPE numeric(7,4),
  ALTER COLUMN opponent_game_win_percentage TYPE numeric(7,4);
