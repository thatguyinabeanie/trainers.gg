-- =============================================================================
-- Team Builder Schema
-- Adds team builder fields and meta pipeline tables
-- =============================================================================

-- Add notes to pokemon table
ALTER TABLE pokemon ADD COLUMN IF NOT EXISTS notes text;

-- Add parent_team_id and format to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS parent_team_id bigint REFERENCES teams(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS format text;

-- =============================================================================
-- External Players (Limitless, RK9, Showdown)
-- =============================================================================

CREATE TABLE IF NOT EXISTS external_players (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  source text NOT NULL CHECK (source IN ('limitless', 'rk9', 'showdown')),
  source_player_id text NOT NULL,
  display_name text NOT NULL,
  linked_alt_id bigint REFERENCES alts(id),
  linked_at timestamptz,
  linked_by text CHECK (linked_by IN ('self', 'admin')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(source, source_player_id)
);

ALTER TABLE external_players ENABLE ROW LEVEL SECURITY;

-- Readable by all authenticated and anonymous users
DROP POLICY IF EXISTS "external_players_read" ON external_players;
CREATE POLICY "external_players_read"
  ON external_players FOR SELECT
  USING (true);

-- =============================================================================
-- Data Imports (raw tournament data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_imports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  source text NOT NULL CHECK (source IN ('native', 'limitless', 'rk9', 'showdown')),
  external_ref text,
  format text NOT NULL,
  event_tier text CHECK (event_tier IN ('worlds', 'international', 'regional', 'special_event', 'midseason_showdown', 'community', 'online')),
  imported_at timestamptz DEFAULT now()
);

ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

-- Readable by all
DROP POLICY IF EXISTS "data_imports_read" ON data_imports;
CREATE POLICY "data_imports_read"
  ON data_imports FOR SELECT
  USING (true);

-- =============================================================================
-- Imported Team Sheets (normalized from all sources)
-- =============================================================================

CREATE TABLE IF NOT EXISTS imported_team_sheets (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  import_id bigint NOT NULL REFERENCES data_imports(id),
  external_player_id bigint REFERENCES external_players(id),
  tournament_name text NOT NULL,
  format text NOT NULL,
  tournament_date date,
  player_count int,
  placement_tier text CHECK (placement_tier IN ('champion', 'finalist', 'top4', 'top8', 'top16', 'top_cut', 'day2', 'completed')),
  position int NOT NULL CHECK (position BETWEEN 1 AND 6),
  species text NOT NULL,
  ability text NOT NULL,
  held_item text,
  tera_type text,
  move1 text, move2 text, move3 text, move4 text,
  nature text,
  ev_spread text,
  iv_spread text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imported_team_sheets_format_species
  ON imported_team_sheets(format, species);
CREATE INDEX IF NOT EXISTS idx_imported_team_sheets_import_id
  ON imported_team_sheets(import_id);

ALTER TABLE imported_team_sheets ENABLE ROW LEVEL SECURITY;

-- Readable by all
DROP POLICY IF EXISTS "imported_team_sheets_read" ON imported_team_sheets;
CREATE POLICY "imported_team_sheets_read"
  ON imported_team_sheets FOR SELECT
  USING (true);

-- =============================================================================
-- Format Meta Stats (aggregated snapshots)
-- =============================================================================

CREATE TABLE IF NOT EXISTS format_meta_stats (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  format text NOT NULL,
  computed_at timestamptz DEFAULT now(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_teams int NOT NULL,
  total_tournaments int NOT NULL
);

ALTER TABLE format_meta_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "format_meta_stats_read" ON format_meta_stats;
CREATE POLICY "format_meta_stats_read"
  ON format_meta_stats FOR SELECT
  USING (true);

-- =============================================================================
-- Pokemon Usage Stats (per-species usage per snapshot)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pokemon_usage_stats (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  meta_id bigint NOT NULL REFERENCES format_meta_stats(id),
  species text NOT NULL,
  usage_pct numeric(5,2) NOT NULL,
  rank int NOT NULL,
  usage_change_7d numeric(5,2),
  usage_change_30d numeric(5,2),
  usage_pct_top_cut numeric(5,2),
  usage_pct_top8 numeric(5,2),
  conversion_rate numeric(4,2),
  sample_size int NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pokemon_usage_stats_meta
  ON pokemon_usage_stats(meta_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_usage_stats_species
  ON pokemon_usage_stats(species);

ALTER TABLE pokemon_usage_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pokemon_usage_stats_read" ON pokemon_usage_stats;
CREATE POLICY "pokemon_usage_stats_read"
  ON pokemon_usage_stats FOR SELECT
  USING (true);

-- =============================================================================
-- Pokemon Detail Stats (per-species detail breakdowns)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pokemon_detail_stats (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  meta_id bigint NOT NULL REFERENCES format_meta_stats(id),
  species text NOT NULL,
  items jsonb DEFAULT '[]',
  abilities jsonb DEFAULT '[]',
  moves jsonb DEFAULT '[]',
  spreads jsonb DEFAULT '[]',
  tera_types jsonb DEFAULT '[]',
  teammates jsonb DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_pokemon_detail_stats_meta_species
  ON pokemon_detail_stats(meta_id, species);

ALTER TABLE pokemon_detail_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pokemon_detail_stats_read" ON pokemon_detail_stats;
CREATE POLICY "pokemon_detail_stats_read"
  ON pokemon_detail_stats FOR SELECT
  USING (true);
