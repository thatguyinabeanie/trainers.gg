-- Backfill: rename the incorrectly-slugified species 'floette-eternal-flower'
-- to the canonical slug 'floette-eternal' in rk9.team_pokemon.
--
-- Root cause: the RK9 normalizer had no formMap entry for "Eternal Flower",
-- so it fell through to the generic fallback slugifier which produced
-- "eternal-flower" instead of "eternal".  The normalizer has been fixed in
-- the same commit; this migration corrects the data that was already stored.
UPDATE rk9.team_pokemon
SET species = 'floette-eternal'
WHERE species = 'floette-eternal-flower';
