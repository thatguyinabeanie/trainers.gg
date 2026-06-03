-- Track when a standing's team list was last attempted (success, empty, or error).
-- Replaces the position=0 sentinel row hack in team_pokemon.
-- NULL = not yet attempted; non-NULL = attempted (may or may not have real team data).
ALTER TABLE rk9.standings
  ADD COLUMN IF NOT EXISTS team_scrape_attempted_at timestamptz;

-- Clean up any existing sentinel rows (position=0) inserted by the old approach.
DELETE FROM rk9.team_pokemon WHERE position = 0;
