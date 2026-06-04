-- Drop the legacy dedup constraint that was not removed in 20260603232202.
-- The canonical constraint is now players_player_id_masked_first_name_last_name_country_key.
ALTER TABLE rk9.players
  DROP CONSTRAINT IF EXISTS players_dedup_key;
