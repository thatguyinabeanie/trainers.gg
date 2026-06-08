-- Add legality flags to rk9.team_pokemon.
--
-- We import 100% of what RK9 shows (illegal entries included), then flag each
-- row at import time so usage-stats ETL can filter illegal entries out without
-- losing the underlying data. Validation is performed by
-- @trainers/pokemon validatePokemonLegality() inside the import pipeline.

ALTER TABLE rk9.team_pokemon
  ADD COLUMN IF NOT EXISTS is_legal boolean NOT NULL DEFAULT true;

ALTER TABLE rk9.team_pokemon
  ADD COLUMN IF NOT EXISTS legality_reason text;

COMMENT ON COLUMN rk9.team_pokemon.legality_reason IS
  'Human-readable reason a row is illegal (e.g. "Illegal ability: Sweet Veil"). NULL when is_legal = true.';
