-- Overhaul rk9.standings and rk9.players for robust roster import.
--
-- Goals:
-- 1. Roster entries NEVER fail to import (unique by roster_entry_id)
-- 2. player_id is best-effort / nullable (resolved via new matching logic)
-- 3. import_flag surfaces ambiguous matches for manual review
-- 4. trainer_names array on players improves cross-event deduplication

-- ── standings ──────────────────────────────────────────────────────────────

-- Drop the old unique constraint that caused import failures
-- (same player appearing twice in one event → conflict)
ALTER TABLE rk9.standings
  DROP CONSTRAINT IF EXISTS standings_event_id_player_id_division_key;

-- Each roster registration is uniquely identified by its roster entry ID
ALTER TABLE rk9.standings
  ADD CONSTRAINT standings_event_id_roster_entry_id_key
  UNIQUE (event_id, roster_entry_id);

-- player_id is now nullable — a standing can exist without a resolved player
-- (flagged for manual relinking via the admin UI)
ALTER TABLE rk9.standings
  ALTER COLUMN player_id DROP NOT NULL;

-- Flag ambiguous or unresolved player matches for admin review
-- null    = clean import, no issues
-- 'name_collision' = same (masked_id, name, country) appeared multiple times
--                    in this event; forced separate player records
-- 'new_trainer'    = matched to existing player but trainer name is new/unknown
-- 'new_player'     = first-ever sighting of this identity; new player created
-- 'unlinked'       = player matching failed entirely; player_id is NULL
ALTER TABLE rk9.standings
  ADD COLUMN IF NOT EXISTS import_flag text;

-- ── players ────────────────────────────────────────────────────────────────

-- Track all trainer names ever seen for this player across events.
-- Used to disambiguate players when (masked_id, name, country) collides.
ALTER TABLE rk9.players
  ADD COLUMN IF NOT EXISTS trainer_names text[] NOT NULL DEFAULT '{}';
