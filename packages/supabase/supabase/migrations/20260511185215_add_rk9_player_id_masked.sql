-- Rework rk9.players dedup key to include masked player ID and division.
-- This prevents collisions where two distinct players share the same
-- first_name + last_name + country (e.g., "Ricardo Rodriguez" from MX).
-- The masked player ID from RK9 (e.g., "4....3") disambiguates them.

-- 1. Add new columns
ALTER TABLE rk9.players
  ADD COLUMN IF NOT EXISTS player_id_masked text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS division rk9.division NOT NULL DEFAULT 'masters';

-- 2. Drop old unique constraint and create new one
ALTER TABLE rk9.players
  DROP CONSTRAINT IF EXISTS players_first_name_last_name_country_key;

ALTER TABLE rk9.players
  ADD CONSTRAINT players_dedup_key
    UNIQUE (player_id_masked, first_name, last_name, country, division);

-- 3. Index for lookups by masked player ID
CREATE INDEX IF NOT EXISTS idx_rk9_players_player_id_masked
  ON rk9.players (player_id_masked)
  WHERE player_id_masked != '';
