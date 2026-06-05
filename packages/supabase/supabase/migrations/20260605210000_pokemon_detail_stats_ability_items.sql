-- Add `ability_items` column to pokemon_detail_stats for the (ability + item) combo usage dimension.
--
-- WHY: The ability+item combination is a meaningful competitive signal — it reveals
-- which item a Pokemon is paired with for a given ability (e.g. "Protosynthesis + Booster Energy"
-- vs "Protosynthesis + Choice Specs"). This allows analysts to distinguish role variants
-- that use the same ability but different item strategies. The combo is derived from the
-- existing ability and item histogram data during rollup: only emitted when BOTH ability
-- and item are present; encoded as "${ability} + ${item}".
--
-- No RLS changes needed — RLS is already enabled on pokemon_detail_stats and the
-- existing service-role-only write policies cover this new column automatically.
-- No backfill needed — recomputing the affected events will populate the column.

ALTER TABLE public.pokemon_detail_stats ADD COLUMN IF NOT EXISTS ability_items jsonb NOT NULL DEFAULT '[]'::jsonb;
