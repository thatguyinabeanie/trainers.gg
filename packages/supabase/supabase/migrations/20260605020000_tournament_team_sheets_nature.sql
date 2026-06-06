-- Add `nature` column to tournament_team_sheets for Champions format OTS.
--
-- WHY: Nature (stat alignment) is now required on Open Team Sheets for Pokemon
-- Champions formats per rule change. Nature was intentionally excluded from the
-- OTS snapshot at launch (privacy — players keep EVs, IVs, and nature secret for
-- standard VGC). For Champions, the format rules mandate disclosure; and since
-- nature is already stored on the player's private `pokemon` row at submission
-- time, we only need to include it in the snapshot logic gated on the format id.
--
-- Nullable — only populated for Champions formats. Non-Champions sheets keep
-- nature=NULL (no change to existing privacy model for standard VGC).
--
-- No RLS changes needed — RLS is already enabled on tournament_team_sheets and
-- the existing service-role-only INSERT policy covers this column automatically.
-- No index needed — nature is not used in WHERE / JOIN / ORDER BY clauses.
-- No backfill needed — recomputing snapshots for existing Champions tournaments
-- will populate the column; older non-Champions rows stay NULL correctly.

ALTER TABLE public.tournament_team_sheets
  ADD COLUMN IF NOT EXISTS nature text;
