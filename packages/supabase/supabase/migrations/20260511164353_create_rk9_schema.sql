-- ============================================================================
-- Migration: Create rk9 schema for official Play! Pokemon event data
--
-- Creates 7 tables in a dedicated `rk9` schema for imported tournament data
-- scraped from RK9.gg. Covers Regionals, Internationals, Special Championships,
-- and Worlds on the official Play! Pokemon circuit.
--
-- Tables: events, players, standings, team_pokemon, phases, match_results, species_map
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create rk9 schema
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS rk9;

-- ---------------------------------------------------------------------------
-- 2. Enum types
-- ---------------------------------------------------------------------------

-- Event tier classification
DO $$ BEGIN
  CREATE TYPE rk9.event_tier AS ENUM ('regional', 'international', 'special', 'worlds');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Division classification (separate from limitless — RK9 has age divisions)
DO $$ BEGIN
  CREATE TYPE rk9.division AS ENUM ('masters', 'senior', 'junior');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Import progress tracking
DO $$ BEGIN
  CREATE TYPE rk9.import_status AS ENUM ('pending', 'roster', 'teams', 'pairings', 'complete', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Phase type
DO $$ BEGIN
  CREATE TYPE rk9.phase_type AS ENUM ('swiss', 'single_elimination');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

-- Events — one row per official Play! Pokemon event
CREATE TABLE IF NOT EXISTS rk9.events (
  event_id          text                PRIMARY KEY,  -- RK9's native ID ('TO027Rvi7XmbN1f355Nc')
  name              text                NOT NULL,     -- 'Toronto Regional Championships 2026'
  tier              rk9.event_tier      NOT NULL,
  format_id         text,                             -- Showdown canonical format string (null if unknown)
  date_start        date                NOT NULL,
  date_end          date,                             -- null if single-day event
  location_city     text,
  location_country  text,                             -- ISO alpha-2
  player_count      int,                              -- total VGC registrants
  has_team_lists    boolean             NOT NULL DEFAULT false,
  import_status     rk9.import_status   NOT NULL DEFAULT 'pending',
  import_error      text,                             -- error message if import_status = 'failed'
  imported_at       timestamptz         NOT NULL DEFAULT now()
);

-- Players — unique players across all events, deduped by name + country
-- (no stable external ID available from RK9)
CREATE TABLE IF NOT EXISTS rk9.players (
  id                bigint              GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name        text                NOT NULL,
  last_name         text                NOT NULL,
  country           text,                             -- ISO alpha-2 (nullable: some players have no country)
  trainer_name      text,                             -- in-game name (not always available)
  created_at        timestamptz         NOT NULL DEFAULT now(),

  -- Dedup constraint: same name + country = same player
  UNIQUE (first_name, last_name, country)
);

-- Standings — per-player results in a specific event + division
CREATE TABLE IF NOT EXISTS rk9.standings (
  id                bigint              GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id          text                NOT NULL REFERENCES rk9.events(event_id) ON DELETE CASCADE,
  player_id         bigint              NOT NULL REFERENCES rk9.players(id) ON DELETE CASCADE,
  division          rk9.division        NOT NULL,
  placement         int,                              -- final standing (null if DNF/DQ)
  drop_round        int,                              -- round they dropped (null = completed)
  roster_entry_id   text,                             -- from team list URL path segment

  UNIQUE (event_id, player_id, division)
);

-- Team Pokemon — 6 Pokemon per standing (player's team sheet)
CREATE TABLE IF NOT EXISTS rk9.team_pokemon (
  id                bigint              GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  standing_id       bigint              NOT NULL REFERENCES rk9.standings(id) ON DELETE CASCADE,
  position          int                 NOT NULL CHECK (position >= 1 AND position <= 6),
  species           text                NOT NULL,     -- normalized slug ('calyrex-ice-rider')
  species_raw       text                NOT NULL,     -- original scraped name ('Calyrex [Ice Rider]')
  ability           text,
  held_item         text,
  tera_type         text,                             -- null for Champions M-A (no Tera)
  moves             text[],                           -- array of up to 4 move names

  UNIQUE (standing_id, position)
);

-- Phases — event structure per division (Swiss rounds + top cut bracket)
CREATE TABLE IF NOT EXISTS rk9.phases (
  event_id          text                NOT NULL REFERENCES rk9.events(event_id) ON DELETE CASCADE,
  division          rk9.division        NOT NULL,
  phase_number      int                 NOT NULL,
  type              rk9.phase_type      NOT NULL,
  rounds            int,                              -- total rounds in this phase

  PRIMARY KEY (event_id, division, phase_number)
);

-- Match Results — round-by-round pairings and outcomes
CREATE TABLE IF NOT EXISTS rk9.match_results (
  id                bigint              GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id          text                NOT NULL,
  division          rk9.division        NOT NULL,
  phase_number      int                 NOT NULL,
  round             int                 NOT NULL,
  table_number      int,                              -- Swiss matches (null for bracket)
  match_label       text,                             -- bracket label ('Finals', 'Semifinals 1')
  player1_id        bigint              REFERENCES rk9.players(id) ON DELETE SET NULL,
  player2_id        bigint              REFERENCES rk9.players(id) ON DELETE SET NULL,  -- null = bye
  winner_id         bigint              REFERENCES rk9.players(id) ON DELETE SET NULL,  -- null = tie/bye/unfinished
  imported_at       timestamptz         NOT NULL DEFAULT now(),

  -- Composite FK to phases so match_results are tied to a valid phase
  CONSTRAINT fk_match_phase FOREIGN KEY (event_id, division, phase_number)
    REFERENCES rk9.phases(event_id, division, phase_number) ON DELETE CASCADE
);

-- Species Map — mapping from RK9 display names to normalized slugs
-- Maintained manually + expanded as new species/forms are encountered during import
CREATE TABLE IF NOT EXISTS rk9.species_map (
  raw_name          text                PRIMARY KEY,  -- 'Calyrex [Ice Rider]', 'Ogerpon [Hearthflame Mask]'
  species_slug      text                NOT NULL,     -- 'calyrex-ice-rider', 'ogerpon-hearthflame'
  verified          boolean             NOT NULL DEFAULT false,  -- has this mapping been manually reviewed?
  created_at        timestamptz         NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. RLS — all tables read-only via API (service_role writes during import)
--
-- These tables are populated by server-side import scripts using the
-- service_role key. Public API access is read-only for all authenticated
-- and anonymous users. No INSERT/UPDATE/DELETE policies needed because
-- writes happen only via service_role (which bypasses RLS).
-- ---------------------------------------------------------------------------

ALTER TABLE rk9.events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rk9.players         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rk9.standings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rk9.team_pokemon    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rk9.phases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rk9.match_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rk9.species_map     ENABLE ROW LEVEL SECURITY;

-- Read-only policies for all users (public stats pages need anon access)
DROP POLICY IF EXISTS "Anyone can read events" ON rk9.events;
CREATE POLICY "Anyone can read events"
  ON rk9.events FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can read players" ON rk9.players;
CREATE POLICY "Anyone can read players"
  ON rk9.players FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can read standings" ON rk9.standings;
CREATE POLICY "Anyone can read standings"
  ON rk9.standings FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can read team_pokemon" ON rk9.team_pokemon;
CREATE POLICY "Anyone can read team_pokemon"
  ON rk9.team_pokemon FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can read phases" ON rk9.phases;
CREATE POLICY "Anyone can read phases"
  ON rk9.phases FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can read match_results" ON rk9.match_results;
CREATE POLICY "Anyone can read match_results"
  ON rk9.match_results FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Anyone can read species_map" ON rk9.species_map;
CREATE POLICY "Anyone can read species_map"
  ON rk9.species_map FOR SELECT
  TO authenticated, anon
  USING (true);

-- ---------------------------------------------------------------------------
-- 5. Indexes for common query patterns
-- ---------------------------------------------------------------------------

-- Events: lookup by format, tier, date
CREATE INDEX IF NOT EXISTS idx_rk9_events_format_id    ON rk9.events (format_id);
CREATE INDEX IF NOT EXISTS idx_rk9_events_tier         ON rk9.events (tier);
CREATE INDEX IF NOT EXISTS idx_rk9_events_date_start   ON rk9.events (date_start DESC);

-- Players: name-based lookups and dedup checks
CREATE INDEX IF NOT EXISTS idx_rk9_players_name        ON rk9.players (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_rk9_players_country     ON rk9.players (country);

-- Standings: the most queried table — filter by event, division, placement
CREATE INDEX IF NOT EXISTS idx_rk9_standings_event_id  ON rk9.standings (event_id);
CREATE INDEX IF NOT EXISTS idx_rk9_standings_player_id ON rk9.standings (player_id);
CREATE INDEX IF NOT EXISTS idx_rk9_standings_division  ON rk9.standings (division);
CREATE INDEX IF NOT EXISTS idx_rk9_standings_placement ON rk9.standings (placement);
-- Composite for "top N at event in division" queries
CREATE INDEX IF NOT EXISTS idx_rk9_standings_event_div_place
  ON rk9.standings (event_id, division, placement);

-- Team Pokemon: species usage analysis
CREATE INDEX IF NOT EXISTS idx_rk9_team_pokemon_standing_id ON rk9.team_pokemon (standing_id);
CREATE INDEX IF NOT EXISTS idx_rk9_team_pokemon_species     ON rk9.team_pokemon (species);
CREATE INDEX IF NOT EXISTS idx_rk9_team_pokemon_moves       ON rk9.team_pokemon USING gin (moves);

-- Match Results: tournament/round lookups
CREATE INDEX IF NOT EXISTS idx_rk9_match_results_event   ON rk9.match_results (event_id);
CREATE INDEX IF NOT EXISTS idx_rk9_match_results_player1 ON rk9.match_results (player1_id);
CREATE INDEX IF NOT EXISTS idx_rk9_match_results_player2 ON rk9.match_results (player2_id);
-- Composite for "all matches in a round of a division"
CREATE INDEX IF NOT EXISTS idx_rk9_match_results_event_div_round
  ON rk9.match_results (event_id, division, round);

-- Species Map: slug lookups (reverse lookup)
CREATE INDEX IF NOT EXISTS idx_rk9_species_map_slug ON rk9.species_map (species_slug);

-- ---------------------------------------------------------------------------
-- 6. Grant schema usage to API roles
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA rk9 TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA rk9 TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA rk9 TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA rk9 TO service_role;
