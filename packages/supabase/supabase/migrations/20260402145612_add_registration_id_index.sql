-- Standalone index on registration_id for getTeamSheetByRegistration queries.
-- The composite index (tournament_id, registration_id) doesn't help queries
-- that filter only on registration_id.

CREATE INDEX IF NOT EXISTS idx_tts_registration
  ON tournament_team_sheets (registration_id);
