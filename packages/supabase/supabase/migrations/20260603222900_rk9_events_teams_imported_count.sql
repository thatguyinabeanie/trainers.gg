-- Track how many team lists have been imported per RK9 event.
-- Updated by the team scraping action after each batch completes.
ALTER TABLE rk9.events
  ADD COLUMN IF NOT EXISTS teams_imported_count integer NOT NULL DEFAULT 0;
