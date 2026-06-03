-- Remove division from rk9.players
--
-- Division is per-event (lives on rk9.standings), not per-player.
-- Players age up through divisions (Junior → Senior → Masters) across seasons,
-- so including division in the player dedup key would create duplicate rows
-- for the same physical person.
--
-- Dedup key becomes: (player_id_masked, first_name, last_name, country)

-- Drop the old constraint that includes division
ALTER TABLE rk9.players
  DROP CONSTRAINT IF EXISTS players_dedup_key;

-- Drop the division column from players
ALTER TABLE rk9.players
  DROP COLUMN IF EXISTS division;

-- Add the corrected unique constraint without division
ALTER TABLE rk9.players
  ADD CONSTRAINT players_dedup_key UNIQUE (player_id_masked, first_name, last_name, country);
