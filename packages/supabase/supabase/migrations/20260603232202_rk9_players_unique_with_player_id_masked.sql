-- Update rk9.players unique constraint to include player_id_masked.
-- Trainer name is intentionally excluded — it changes freely across events
-- and is not a stable identifier for a person.
-- player_id_masked is the RK9-assigned masked ID visible on roster pages.

ALTER TABLE rk9.players
  DROP CONSTRAINT IF EXISTS players_first_name_last_name_country_key;

ALTER TABLE rk9.players
  ADD CONSTRAINT players_player_id_masked_first_name_last_name_country_key
  UNIQUE (player_id_masked, first_name, last_name, country);
