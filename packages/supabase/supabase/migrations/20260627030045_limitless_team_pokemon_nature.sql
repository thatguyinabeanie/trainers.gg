-- Add nature column to limitless.team_pokemon
-- Limitless publishes a per-Pokemon nature on every decklist entry. Unlike RK9,
-- which labels the same datum "Stat Alignment" and stores it as stat_alignment,
-- the Limitless API field is literally "nature", so we keep the column name nature.
-- Nullable: older or partial decklists may omit it.
ALTER TABLE limitless.team_pokemon
  ADD COLUMN IF NOT EXISTS nature text;
