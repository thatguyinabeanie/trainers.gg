-- Add trainer_name to rk9.standings.
-- Trainer names are per-event (players use different names across events/games),
-- so they belong here rather than on rk9.players.
ALTER TABLE rk9.standings
  ADD COLUMN IF NOT EXISTS trainer_name text;
