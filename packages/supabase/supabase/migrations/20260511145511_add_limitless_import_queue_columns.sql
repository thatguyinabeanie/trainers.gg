-- ============================================================================
-- Migration: Add import queue columns to limitless.tournaments
--
-- Enables queue-based import processing. The admin UI (or webhook) sets
-- import_requested_at; the cron picks up the oldest queued tournament
-- and tracks progress via import_status / import_phase / import_page.
-- ============================================================================

-- Import queue columns
ALTER TABLE limitless.tournaments
  ADD COLUMN IF NOT EXISTS import_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_status text CHECK (import_status IN ('queued', 'importing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS import_phase text CHECK (import_phase IN ('standings', 'matches', 'teams')),
  ADD COLUMN IF NOT EXISTS import_page int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS import_error text,
  ADD COLUMN IF NOT EXISTS import_attempts int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS import_started_at timestamptz;

-- Backfill: tournaments that already have data_imported_at are "completed"
UPDATE limitless.tournaments
  SET import_status = 'completed'
  WHERE data_imported_at IS NOT NULL
    AND import_status IS NULL;

-- Index for cron queue processing: find oldest queued tournament quickly
CREATE INDEX IF NOT EXISTS idx_tournaments_import_queue
  ON limitless.tournaments (import_requested_at ASC)
  WHERE import_status = 'queued';

-- Index for finding stuck imports (importing but stale)
CREATE INDEX IF NOT EXISTS idx_tournaments_importing
  ON limitless.tournaments (import_started_at ASC)
  WHERE import_status = 'importing';
