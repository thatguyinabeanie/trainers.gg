-- Fix CHECK constraints idempotency for preview branch replays.
-- The original migration (20260511145511) used inline CHECK in ADD COLUMN IF NOT EXISTS,
-- which is skipped on replay if the column already exists.

ALTER TABLE limitless.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_import_status_check,
  DROP CONSTRAINT IF EXISTS tournaments_import_phase_check;

ALTER TABLE limitless.tournaments
  ADD CONSTRAINT tournaments_import_status_check
    CHECK (import_status IN ('queued', 'importing', 'completed', 'failed')),
  ADD CONSTRAINT tournaments_import_phase_check
    CHECK (import_phase IN ('standings', 'matches', 'teams'));
