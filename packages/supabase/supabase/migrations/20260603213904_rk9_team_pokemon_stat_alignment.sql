-- Add stat_alignment column to rk9.team_pokemon
-- Stat Alignment (nature) is new to the Pokemon Champions M-A format.
-- Prior formats did not publish natures, so this is null for all older events.
ALTER TABLE rk9.team_pokemon
  ADD COLUMN IF NOT EXISTS stat_alignment text;
