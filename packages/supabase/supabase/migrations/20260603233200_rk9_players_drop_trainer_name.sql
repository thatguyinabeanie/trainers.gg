-- Remove trainer_name from rk9.players.
-- Trainer names change freely (per game, per switch, per event) and are not
-- a stable identifier for a person. The column is redundant and misleading
-- at the player deduplication level.
ALTER TABLE rk9.players
  DROP COLUMN IF EXISTS trainer_name;
