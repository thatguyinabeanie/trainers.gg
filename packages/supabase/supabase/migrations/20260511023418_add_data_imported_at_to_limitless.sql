-- ============================================================================
-- Migration: Add data_imported_at to limitless.tournaments
--
-- Distinguishes Stage 1 (metadata synced from /tournaments list) from
-- Stage 2 (full data imported: standings, teams, matches).
--
-- imported_at     = when tournament metadata was synced from the API list
-- data_imported_at = when full tournament data was imported (NULL = not yet)
-- ============================================================================

ALTER TABLE limitless.tournaments
  ADD COLUMN IF NOT EXISTS data_imported_at timestamptz;
