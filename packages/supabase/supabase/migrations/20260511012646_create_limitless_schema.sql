-- ============================================================================
-- Migration: Create limitless schema for external tournament data
--
-- Creates 6 tables in a dedicated `limitless` schema for imported VGC
-- tournament data from the Limitless API. Also drops the old external data
-- tables from public that this replaces.
--
-- Tables: tournaments, phases, players, standings, team_pokemon, match_results
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop old external data tables (order matters: FKs first)
-- ---------------------------------------------------------------------------

-- imported_team_sheets → external_players, data_imports
DROP TABLE IF EXISTS public.imported_team_sheets;
DROP TABLE IF EXISTS public.external_players;
DROP TABLE IF EXISTS public.data_imports;

-- ---------------------------------------------------------------------------
-- 2. Create limitless schema
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS limitless;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

-- Tournaments — one row per Limitless VGC tournament
CREATE TABLE IF NOT EXISTS limitless.tournaments (
  tournament_id   text        PRIMARY KEY,  -- Limitless's native ID string
  name            text        NOT NULL,
  format_id       text        NOT NULL,     -- Showdown canonical format string
  date            date        NOT NULL,
  player_count    int         NOT NULL DEFAULT 0,
  platform        text,                     -- 'SWITCH' / 'SIM'
  is_online       boolean     NOT NULL DEFAULT true,
  decklists       boolean     NOT NULL DEFAULT false,
  organizer_name  text,
  imported_at     timestamptz NOT NULL DEFAULT now()
);

-- Phases — Swiss, Top Cut, etc. within a tournament
CREATE TABLE IF NOT EXISTS limitless.phases (
  tournament_id   text        NOT NULL REFERENCES limitless.tournaments(tournament_id) ON DELETE CASCADE,
  phase_number    int         NOT NULL,
  type            text        NOT NULL,     -- SWISS / SINGLE_BRACKET / DOUBLE_BRACKET
  rounds          int         NOT NULL,     -- how many rounds in this phase
  mode            text        NOT NULL,     -- BO1 / BO3
  PRIMARY KEY (tournament_id, phase_number)
);

-- Players — thin identity table for Limitless usernames
CREATE TABLE IF NOT EXISTS limitless.players (
  id              int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username        text        NOT NULL UNIQUE,   -- stable Limitless player slug
  display_name    text,                          -- can change between tournaments
  country         text,                          -- ISO alpha-2
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Standings — one row per player per tournament
CREATE TABLE IF NOT EXISTS limitless.standings (
  id              int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id   text        NOT NULL REFERENCES limitless.tournaments(tournament_id) ON DELETE CASCADE,
  player_id       int         NOT NULL REFERENCES limitless.players(id) ON DELETE CASCADE,
  placement       int         NOT NULL,
  record_wins     int         NOT NULL DEFAULT 0,
  record_losses   int         NOT NULL DEFAULT 0,
  record_ties     int         NOT NULL DEFAULT 0,
  drop_round      int,                          -- round the player dropped (null = didn't drop)
  UNIQUE (tournament_id, player_id)
);

-- Team Pokemon — 1-6 Pokemon per standing (player's team sheet)
CREATE TABLE IF NOT EXISTS limitless.team_pokemon (
  id              int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  standing_id     int         NOT NULL REFERENCES limitless.standings(id) ON DELETE CASCADE,
  position        int         NOT NULL CHECK (position >= 1 AND position <= 6),
  species         text        NOT NULL,          -- Limitless species slug ('charizard')
  ability         text,
  held_item       text,
  tera_type       text,                          -- null for Champions M-A (has Megas, no Tera)
  moves           text[],                        -- array of up to 4 move names
  UNIQUE (standing_id, position)
);

-- Match Results — one row per set (BO1 or BO3) within a round
CREATE TABLE IF NOT EXISTS limitless.match_results (
  id              int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id   text        NOT NULL,
  phase           int         NOT NULL,
  round           int         NOT NULL,
  table_number    int,                           -- Swiss matches
  match_label     text,                          -- Bracket matches ('T2-1')
  player1_id      int         NOT NULL REFERENCES limitless.players(id) ON DELETE CASCADE,
  player2_id      int         REFERENCES limitless.players(id) ON DELETE CASCADE,  -- null = bye
  winner_id       int         REFERENCES limitless.players(id) ON DELETE SET NULL, -- null = tie/bye/unfinished
  imported_at     timestamptz NOT NULL DEFAULT now(),

  -- Composite FK to phases so match_results are tied to a valid phase
  CONSTRAINT fk_match_phase FOREIGN KEY (tournament_id, phase)
    REFERENCES limitless.phases(tournament_id, phase_number) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 4. RLS — all tables read-only via API (service_role writes during import)
--
-- These tables are populated by server-side import scripts using the
-- service_role key. Public API access is read-only for all authenticated
-- and anonymous users. No INSERT/UPDATE/DELETE policies needed.
-- ---------------------------------------------------------------------------

ALTER TABLE limitless.tournaments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE limitless.phases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE limitless.players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE limitless.standings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE limitless.team_pokemon   ENABLE ROW LEVEL SECURITY;
ALTER TABLE limitless.match_results  ENABLE ROW LEVEL SECURITY;

-- Read-only policies for all users (including anon for public stats pages)
CREATE POLICY "Anyone can read tournaments"
  ON limitless.tournaments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can read phases"
  ON limitless.phases FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can read players"
  ON limitless.players FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can read standings"
  ON limitless.standings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can read team_pokemon"
  ON limitless.team_pokemon FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can read match_results"
  ON limitless.match_results FOR SELECT
  TO authenticated, anon
  USING (true);

-- ---------------------------------------------------------------------------
-- 5. Indexes for common query patterns
-- ---------------------------------------------------------------------------

-- Tournament lookups by format and date
CREATE INDEX IF NOT EXISTS idx_tournaments_format_id   ON limitless.tournaments (format_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_date        ON limitless.tournaments (date DESC);

-- Player lookups by username
-- (already has UNIQUE index, but explicit for clarity in query plans)

-- Standings lookups
CREATE INDEX IF NOT EXISTS idx_standings_tournament_id ON limitless.standings (tournament_id);
CREATE INDEX IF NOT EXISTS idx_standings_player_id     ON limitless.standings (player_id);
CREATE INDEX IF NOT EXISTS idx_standings_placement      ON limitless.standings (placement);

-- Team pokemon lookups by species and moves
CREATE INDEX IF NOT EXISTS idx_team_pokemon_standing_id ON limitless.team_pokemon (standing_id);
CREATE INDEX IF NOT EXISTS idx_team_pokemon_species     ON limitless.team_pokemon (species);
CREATE INDEX IF NOT EXISTS idx_team_pokemon_moves       ON limitless.team_pokemon USING gin (moves);

-- Match results lookups
CREATE INDEX IF NOT EXISTS idx_match_results_tournament ON limitless.match_results (tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player1    ON limitless.match_results (player1_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player2    ON limitless.match_results (player2_id);

-- ---------------------------------------------------------------------------
-- 6. Grant schema usage to API roles
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA limitless TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA limitless TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA limitless TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA limitless TO service_role;
