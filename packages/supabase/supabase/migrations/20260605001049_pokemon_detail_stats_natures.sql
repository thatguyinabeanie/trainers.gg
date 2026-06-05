-- Add `natures` column to pokemon_detail_stats for the "stat alignment" usage dimension.
--
-- WHY: Nature (stat alignment) is a meaningful competitive signal — it tells you what
-- competitive role players are optimizing for (e.g. Adamant for max Attack, Timid for
-- max Speed). RK9 captures nature data for the Champions M-A format; Limitless does
-- not yet record nature; first-party tournament_team_sheets will capture it once the
-- column is added. This migration adds the column so the rollup pipeline can write
-- natures histograms as soon as data is available.
--
-- No RLS changes needed — RLS is already enabled on pokemon_detail_stats and the
-- existing service-role-only write policies cover this new column automatically.
-- No backfill needed — recomputing the affected events will populate the column.

ALTER TABLE public.pokemon_detail_stats ADD COLUMN IF NOT EXISTS natures jsonb NOT NULL DEFAULT '[]'::jsonb;
