# External Data: Pokemon Showdown Replays & Usage Stats

> Status: Brainstorming — nothing is set in stone yet
> Started: 2026-05-11
> Related: [Limitless design doc](./2026-05-10-external-data-limitless.md)

## 1. Overview

Import Pokemon Showdown ladder replay data and Smogon usage statistics into trainers.gg for meta analysis, usage tracking, and community insights. This pipeline complements the Limitless/RK9 tournament pipeline — Limitless gives us organized tournament results with complete team sheets; Showdown gives us high-volume ladder data with turn-by-turn battle details.

**What we're building:**

1. A download script that discovers and fetches replays from Showdown's public API
2. A parser that extracts structured data (teams, moves, items, abilities) from battle logs using `@pkmn/protocol`
3. An aggregation pipeline that computes usage stats from imported replays
4. Database tables in a `showdown` schema to store replays and computed stats
5. Admin UI for browsing imported data and viewing stats
6. A lightweight edge function for serving pre-computed stats via API

**Why Showdown data matters (different from Limitless):**

| Limitless                                  | Showdown                                       |
| ------------------------------------------ | ---------------------------------------------- |
| Complete team sheets (all 4 moves, item)   | Partial per replay — only what's revealed      |
| Organized events with placements           | Ladder games, no tournament context             |
| Dozens of events, hundreds of players      | Thousands of replays per format per day         |
| Only final result (W/L)                    | Turn-by-turn battle actions                     |
| Data appears after tournament ends         | Data available in near-real-time                |

Showdown data enables: usage statistics, bring rate analysis, move selection patterns, meta evolution tracking day-by-day, and matchup win rates between team compositions.

---

## 2. Data Sources

### 2.1 Showdown Replay API

**Base URL:** `https://replay.pokemonshowdown.com`

No authentication required. Full CORS support (`Access-Control-Allow-Origin: *`).

#### Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /search.json?format={formatId}&before={timestamp}` | Paginated replay search (51 per page) |
| `GET /search.json?user={username}` | Search replays by player |
| `GET /search.json?user={u1}&user2={u2}` | Search by specific matchup |
| `GET /{replayId}.json` | Full replay data with battle log |
| `GET /{replayId}.log` | Plain-text battle log only |

#### Pagination

Uses `before` parameter (unix timestamp of last result's `uploadtime`), NOT page numbers. When a page returns 51 results, more pages exist — use the 51st result's `uploadtime` as the next `before` value.

```
Page 1: /search.json?format=gen9championsvgc2026regma
Page 2: /search.json?format=gen9championsvgc2026regma&before=1778452795
Page 3: /search.json?format=gen9championsvgc2026regma&before=1778401234
...until page returns < 51 results
```

#### Rate Limits

No formal rate limits documented. Community norm: 1+ second delay between requests. A 30.5M replay dataset on HuggingFace (`HolidayOugi/pokemon-showdown-replays`) proves the API handles bulk scraping at scale.

#### Search Response Shape

```json
[
  {
    "uploadtime": 1778452795,
    "id": "gen9championsvgc2026regma-2606669675",
    "format": "[Gen 9 Champions] VGC 2026 Reg M-A",
    "players": ["PlayerOne", "PlayerTwo"],
    "rating": 1423,
    "private": 0,
    "password": null
  }
]
```

#### Replay Response Shape

```json
{
  "id": "gen9championsvgc2026regma-2606669675",
  "format": "[Gen 9 Champions] VGC 2026 Reg M-A",
  "formatid": "gen9championsvgc2026regma",
  "players": ["PlayerOne", "PlayerTwo"],
  "log": "|j|☆PlayerOne\n|j|☆PlayerTwo\n|player|p1|PlayerOne|...",
  "uploadtime": 1778452795,
  "views": 11,
  "rating": 1423
}
```

#### Replay ID Patterns

- Standard: `{format}-{number}` — e.g., `gen9championsvgc2026regma-2606669675`
- Side server: `{server}-{format}-{number}` — e.g., `smogtours-gen9vgc2025regi-898306`

### 2.2 Smogon Monthly Usage Stats

**Base URL:** `https://www.smogon.com/stats/`

Pre-computed monthly statistics published as plain text files. Directory listing at the base URL shows available months.

| URL Pattern | Description |
| --- | --- |
| `/stats/{year}-{month}/` | Month directory listing |
| `/stats/{year}-{month}/{format}-{rating}.txt` | Usage stats for format at rating threshold |
| `/stats/{year}-{month}/moveset/{format}-{rating}.txt` | Full moveset distributions |
| `/stats/{year}-{month}/leads/{format}-{rating}.txt` | Lead usage stats |
| `/stats/{year}-{month}/chaos/{format}-{rating}.json` | Machine-readable JSON (moveset data) |
| `/stats/{year}-{month}/metagame/{format}-{rating}.txt` | Metagame composition |

**Rating thresholds:** `0` (all battles), `1500`, `1630`, `1695`, `1760`, `1825` — higher thresholds filter to better players.

**Example URL:** `https://www.smogon.com/stats/2026-04/chaos/gen9championsvgc2026regma-1630.json`

**Chaos JSON shape (moveset data):**

```json
{
  "info": { "metagame": "gen9championsvgc2026regma", "cutoff": 1630, ... },
  "data": {
    "Rayquaza": {
      "Raw count": 12345,
      "usage": 0.4523,
      "Abilities": { "Air Lock": 0.95, "...": "..." },
      "Items": { "Life Orb": 0.45, "...": "..." },
      "Moves": { "Dragon Ascent": 0.98, "Protect": 0.85, "...": "..." },
      "Teammates": { "Groudon": 0.35, "...": "..." },
      "Spreads": { "Adamant:4/252/0/0/0/252": 0.25, "...": "..." },
      "Happiness": {},
      "Checks and Counters": { "...": "..." }
    }
  }
}
```

This is extremely valuable — full moveset distributions, EV spreads, teammate correlations, and counter data. All pre-computed by Smogon.

---

## 3. Schema Design (`showdown` schema)

All tables live in the `showdown` schema, following the same isolation pattern as `limitless`.

### 3.1 Tables

#### `showdown.replays`

Selective replay storage — only replays for formats/time windows we care about.

```
id                  text PK             ← Showdown replay ID ('gen9championsvgc2026regma-2606669675')
format_id           text NOT NULL       ← Showdown format string ('gen9championsvgc2026regma')
player1             text NOT NULL       ← Showdown username (p1)
player2             text NOT NULL       ← Showdown username (p2)
winner              text                ← username of winner (null if tie/disconnect)
winner_num          smallint            ← 1 or 2 (null if tie/disconnect)
upload_time         timestamptz NOT NULL ← from uploadtime (unix → timestamptz)
p1_rating           int                 ← player 1 pre-match ELO (parsed from log, null if unrated)
p2_rating           int                 ← player 2 pre-match ELO (parsed from log, null if unrated)
p1_rating_change    int                 ← player 1 ELO delta (e.g. +20, -15)
p2_rating_change    int                 ← player 2 ELO delta
views               int DEFAULT 0
log_hash            text                ← SHA-256 of raw log (for dedup/integrity)
imported_at         timestamptz DEFAULT now()
```

#### `showdown.replay_pokemon`

Parsed team data per replay side. One row per Pokemon per side.

```
id                  int GENERATED PK
replay_id           text FK → replays
player_num          smallint NOT NULL   ← 1 or 2
slot                smallint NOT NULL   ← 1-6 (team preview order)
species             text NOT NULL       ← normalized species name
level               smallint DEFAULT 50
gender              text                ← 'M', 'F', or null
was_brought         boolean DEFAULT false ← was this mon selected for battle?
mega_evolved        boolean DEFAULT false ← did this mon Mega Evolve?
tera_type           text                ← tera type if terastallized (null for non-Tera formats)
terastallized       boolean DEFAULT false ← did this mon actually Tera?

UNIQUE(replay_id, player_num, slot)
```

#### `showdown.replay_moves`

Moves observed during battle. One row per unique species+move combination per side.

```
id                  int GENERATED PK
replay_id           text FK → replays
player_num          smallint NOT NULL
species             text NOT NULL
move_name           text NOT NULL
use_count           smallint DEFAULT 1  ← how many times used in this replay

UNIQUE(replay_id, player_num, species, move_name)
```

#### `showdown.replay_items`

Items revealed during battle (consumed, knocked off, or otherwise triggered).

```
id                  int GENERATED PK
replay_id           text FK → replays
player_num          smallint NOT NULL
species             text NOT NULL
item_name           text NOT NULL

UNIQUE(replay_id, player_num, species, item_name)
```

#### `showdown.replay_abilities`

Abilities revealed during battle (triggered, traced, etc.).

```
id                  int GENERATED PK
replay_id           text FK → replays
player_num          smallint NOT NULL
species             text NOT NULL
ability_name        text NOT NULL

UNIQUE(replay_id, player_num, species, ability_name)
```

#### `showdown.format_snapshots`

A computed stats snapshot for a format over a time period. One row per snapshot computation.

```
id                  int GENERATED PK
format_id           text NOT NULL       ← Showdown format string
period              text NOT NULL       ← '2026-05', '2026-W19', '2026-05-11', or 'all-time'
period_type         text NOT NULL       ← 'monthly', 'weekly', 'daily', 'all-time'
source              text NOT NULL       ← 'replays' or 'smogon'
min_rating          int                 ← null = all ratings, 1630 = filtered
total_replays       int NOT NULL
computed_at         timestamptz DEFAULT now()

UNIQUE(format_id, period, source, min_rating)
```

#### `showdown.pokemon_usage`

Per-Pokemon usage stats within a snapshot.

```
id                  int GENERATED PK
snapshot_id         int FK → format_snapshots
species             text NOT NULL
usage_count         int NOT NULL        ← times this mon appeared on a team
usage_rate          numeric(6,4) NOT NULL ← usage_count / total_replays (per side)
bring_count         int                 ← times brought to battle (of 4)
bring_rate          numeric(6,4)        ← bring_count / usage_count
win_count           int                 ← times the side with this mon won
win_rate            numeric(6,4)        ← win_count / usage_count

UNIQUE(snapshot_id, species)
```

#### `showdown.pokemon_movesets`

Move/item/ability/spread distributions per Pokemon per snapshot, stored as JSONB for flexibility.

```
id                  int GENERATED PK
snapshot_id         int FK → format_snapshots
species             text NOT NULL
moves               jsonb NOT NULL DEFAULT '{}'  ← {"Protect": 0.85, "Dragon Ascent": 0.98}
items               jsonb NOT NULL DEFAULT '{}'  ← {"Life Orb": 0.45, "Choice Band": 0.20}
abilities           jsonb NOT NULL DEFAULT '{}'  ← {"Air Lock": 0.95, "Delta Stream": 0.05}
spreads             jsonb                        ← {"Adamant:4/252/0/0/0/252": 0.25} (Smogon only)
teammates           jsonb                        ← {"Groudon": 0.35} (Smogon only)
counters            jsonb                        ← from Smogon checks/counters (Smogon only)

UNIQUE(snapshot_id, species)
```

#### `showdown.team_cores`

Common Pokemon pairings per snapshot.

```
id                  int GENERATED PK
snapshot_id         int FK → format_snapshots
species_pair        text[] NOT NULL     ← sorted 2-element array ['Groudon', 'Rayquaza']
pair_count          int NOT NULL        ← times these two appeared on the same team
pair_rate           numeric(6,4) NOT NULL ← pair_count / total_replays
win_count           int
win_rate            numeric(6,4)

UNIQUE(snapshot_id, species_pair)
```

#### `showdown.tera_usage`

Tera type distributions per Pokemon per snapshot. Only populated for formats with Tera.

```
id                  int GENERATED PK
snapshot_id         int FK → format_snapshots
species             text NOT NULL
tera_type           text NOT NULL
tera_count          int NOT NULL
tera_rate           numeric(6,4) NOT NULL ← tera_count / usage_count for this species

UNIQUE(snapshot_id, species, tera_type)
```

#### `showdown.sync_cursors`

Tracks cron job progress per format. Each hourly sync run reads/updates this row.

```
format_id           text PK             ← format being synced
last_before         bigint              ← Showdown search API pagination cursor (unix timestamp)
total_discovered    int DEFAULT 0       ← total replay IDs found across all runs
total_imported      int DEFAULT 0       ← total replays successfully imported
status              text DEFAULT 'idle' ← 'idle', 'running', 'error'
last_run_at         timestamptz         ← when the last sync started
last_error          text                ← error message from last failed run
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

### 3.2 Relationships

```
replays ──1:*──► replay_pokemon
replays ──1:*──► replay_moves
replays ──1:*──► replay_items
replays ──1:*──► replay_abilities

format_snapshots ──1:*──► pokemon_usage
format_snapshots ──1:*──► pokemon_movesets
format_snapshots ──1:*──► team_cores
format_snapshots ──1:*──► tera_usage
```

Raw replay tables and aggregate tables are independent — aggregates are computed from raw data but don't have direct FKs back to individual replays.

### 3.3 Migration SQL

```sql
-- Migration: create_showdown_schema
-- Idempotent: safe to re-run

CREATE SCHEMA IF NOT EXISTS showdown;

-- ============================================================
-- Raw replay data (selective storage)
-- ============================================================

CREATE TABLE IF NOT EXISTS showdown.replays (
  id text PRIMARY KEY,
  format_id text NOT NULL,
  player1 text NOT NULL,
  player2 text NOT NULL,
  winner text,
  winner_num smallint CHECK (winner_num IN (1, 2)),
  upload_time timestamptz NOT NULL,
  p1_rating int,
  p2_rating int,
  p1_rating_change int,
  p2_rating_change int,
  views int DEFAULT 0,
  log_hash text,
  imported_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replays_format_id ON showdown.replays (format_id);
CREATE INDEX IF NOT EXISTS idx_replays_upload_time ON showdown.replays (upload_time DESC);
CREATE INDEX IF NOT EXISTS idx_replays_format_upload ON showdown.replays (format_id, upload_time DESC);
CREATE INDEX IF NOT EXISTS idx_replays_player1 ON showdown.replays (player1);
CREATE INDEX IF NOT EXISTS idx_replays_player2 ON showdown.replays (player2);

CREATE TABLE IF NOT EXISTS showdown.replay_pokemon (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  replay_id text NOT NULL REFERENCES showdown.replays (id) ON DELETE CASCADE,
  player_num smallint NOT NULL CHECK (player_num IN (1, 2)),
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 6),
  species text NOT NULL,
  level smallint DEFAULT 50,
  gender text CHECK (gender IN ('M', 'F')),
  was_brought boolean DEFAULT false,
  mega_evolved boolean DEFAULT false,
  tera_type text,
  terastallized boolean DEFAULT false,
  UNIQUE (replay_id, player_num, slot)
);

CREATE INDEX IF NOT EXISTS idx_replay_pokemon_species ON showdown.replay_pokemon (species);
CREATE INDEX IF NOT EXISTS idx_replay_pokemon_replay ON showdown.replay_pokemon (replay_id);

CREATE TABLE IF NOT EXISTS showdown.replay_moves (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  replay_id text NOT NULL REFERENCES showdown.replays (id) ON DELETE CASCADE,
  player_num smallint NOT NULL CHECK (player_num IN (1, 2)),
  species text NOT NULL,
  move_name text NOT NULL,
  use_count smallint DEFAULT 1,
  UNIQUE (replay_id, player_num, species, move_name)
);

CREATE TABLE IF NOT EXISTS showdown.replay_items (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  replay_id text NOT NULL REFERENCES showdown.replays (id) ON DELETE CASCADE,
  player_num smallint NOT NULL CHECK (player_num IN (1, 2)),
  species text NOT NULL,
  item_name text NOT NULL,
  UNIQUE (replay_id, player_num, species, item_name)
);

CREATE TABLE IF NOT EXISTS showdown.replay_abilities (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  replay_id text NOT NULL REFERENCES showdown.replays (id) ON DELETE CASCADE,
  player_num smallint NOT NULL CHECK (player_num IN (1, 2)),
  species text NOT NULL,
  ability_name text NOT NULL,
  UNIQUE (replay_id, player_num, species, ability_name)
);

-- ============================================================
-- Aggregated stats
-- ============================================================

CREATE TABLE IF NOT EXISTS showdown.format_snapshots (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  format_id text NOT NULL,
  period text NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('monthly', 'weekly', 'daily', 'all-time')),
  source text NOT NULL CHECK (source IN ('replays', 'smogon')),
  min_rating int,
  total_replays int NOT NULL,
  computed_at timestamptz DEFAULT now(),
  UNIQUE (format_id, period, source, min_rating)
);

CREATE TABLE IF NOT EXISTS showdown.pokemon_usage (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_id int NOT NULL REFERENCES showdown.format_snapshots (id) ON DELETE CASCADE,
  species text NOT NULL,
  usage_count int NOT NULL,
  usage_rate numeric(6,4) NOT NULL,
  bring_count int,
  bring_rate numeric(6,4),
  win_count int,
  win_rate numeric(6,4),
  UNIQUE (snapshot_id, species)
);

CREATE INDEX IF NOT EXISTS idx_pokemon_usage_snapshot ON showdown.pokemon_usage (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_usage_species ON showdown.pokemon_usage (species);

CREATE TABLE IF NOT EXISTS showdown.pokemon_movesets (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_id int NOT NULL REFERENCES showdown.format_snapshots (id) ON DELETE CASCADE,
  species text NOT NULL,
  moves jsonb NOT NULL DEFAULT '{}',
  items jsonb NOT NULL DEFAULT '{}',
  abilities jsonb NOT NULL DEFAULT '{}',
  spreads jsonb,
  teammates jsonb,
  counters jsonb,
  UNIQUE (snapshot_id, species)
);

CREATE TABLE IF NOT EXISTS showdown.team_cores (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_id int NOT NULL REFERENCES showdown.format_snapshots (id) ON DELETE CASCADE,
  species_pair text[] NOT NULL,
  pair_count int NOT NULL,
  pair_rate numeric(6,4) NOT NULL,
  win_count int,
  win_rate numeric(6,4),
  UNIQUE (snapshot_id, species_pair)
);

CREATE TABLE IF NOT EXISTS showdown.tera_usage (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_id int NOT NULL REFERENCES showdown.format_snapshots (id) ON DELETE CASCADE,
  species text NOT NULL,
  tera_type text NOT NULL,
  tera_count int NOT NULL,
  tera_rate numeric(6,4) NOT NULL,
  UNIQUE (snapshot_id, species, tera_type)
);

-- ============================================================
-- Sync state (cron job progress tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS showdown.sync_cursors (
  format_id text PRIMARY KEY,
  last_before bigint,
  total_discovered int DEFAULT 0,
  total_imported int DEFAULT 0,
  status text DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'error')),
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS policies (admin read-only, same as limitless)
-- ============================================================

ALTER TABLE showdown.replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.replay_pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.replay_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.replay_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.replay_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.format_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.pokemon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.pokemon_movesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.team_cores ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.tera_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown.sync_cursors ENABLE ROW LEVEL SECURITY;

-- Admin read policies (site_role = 'admin')
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'replays', 'replay_pokemon', 'replay_moves', 'replay_items', 'replay_abilities',
    'format_snapshots', 'pokemon_usage', 'pokemon_movesets', 'team_cores', 'tera_usage',
    'sync_cursors'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_read ON showdown.%I', t);
    EXECUTE format(
      'CREATE POLICY admin_read ON showdown.%I FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND site_role = ''admin'')
      )', t
    );
  END LOOP;
END $$;

-- Service role has full access (for import scripts)
GRANT USAGE ON SCHEMA showdown TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA showdown TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA showdown TO service_role;

-- Authenticated users can read via RLS policies above
GRANT USAGE ON SCHEMA showdown TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA showdown TO authenticated;

-- ============================================================
-- Helper function: showdown_stats()
-- Returns usage stats for a given format, similar to tournament_stats()
-- ============================================================

CREATE OR REPLACE FUNCTION showdown.format_usage_stats(
  p_format_id text,
  p_period text DEFAULT 'all-time',
  p_source text DEFAULT 'replays',
  p_min_rating int DEFAULT NULL
)
RETURNS TABLE (
  species text,
  usage_count int,
  usage_rate numeric,
  bring_rate numeric,
  win_rate numeric,
  top_moves jsonb,
  top_items jsonb,
  top_abilities jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    pu.species,
    pu.usage_count,
    pu.usage_rate,
    pu.bring_rate,
    pu.win_rate,
    pm.moves AS top_moves,
    pm.items AS top_items,
    pm.abilities AS top_abilities
  FROM showdown.format_snapshots fs
  JOIN showdown.pokemon_usage pu ON pu.snapshot_id = fs.id
  LEFT JOIN showdown.pokemon_movesets pm ON pm.snapshot_id = fs.id AND pm.species = pu.species
  WHERE fs.format_id = p_format_id
    AND fs.period = p_period
    AND fs.source = p_source
    AND fs.min_rating IS NOT DISTINCT FROM p_min_rating
  ORDER BY pu.usage_rate DESC;
$$;
```

### 3.4 Volume Estimates

For `gen9championsvgc2026regma` (current active format):

| Table | Estimated Rows (per month) | Notes |
| --- | --- | --- |
| `replays` | ~10,000-50,000 | Depends on ladder activity |
| `replay_pokemon` | ~120,000-600,000 | 12 per replay (6 per side) |
| `replay_moves` | ~80,000-400,000 | ~8 unique species×move combos per replay |
| `replay_items` | ~10,000-50,000 | Only revealed items |
| `replay_abilities` | ~10,000-50,000 | Only triggered abilities |
| `format_snapshots` | ~5-10 | Monthly + weekly snapshots |
| `pokemon_usage` | ~200-500 | Per snapshot |
| `pokemon_movesets` | ~200-500 | Per snapshot |
| `team_cores` | ~500-2,000 | Per snapshot (top pairs) |
| `tera_usage` | 0 (for Champions M-A) | No Tera in this format |

### 3.5 Example Queries

```sql
-- Top 20 Pokemon on Champions M-A ladder (latest snapshot)
SELECT species, usage_rate, win_rate, bring_rate
FROM showdown.format_usage_stats('gen9championsvgc2026regma');

-- Rayquaza's moveset distribution
SELECT pm.moves, pm.items, pm.abilities
FROM showdown.pokemon_movesets pm
JOIN showdown.format_snapshots fs ON fs.id = pm.snapshot_id
WHERE fs.format_id = 'gen9championsvgc2026regma'
  AND fs.period = 'all-time'
  AND pm.species = 'Rayquaza';

-- Most common team cores
SELECT species_pair, pair_rate, win_rate
FROM showdown.team_cores tc
JOIN showdown.format_snapshots fs ON fs.id = tc.snapshot_id
WHERE fs.format_id = 'gen9championsvgc2026regma'
  AND fs.period = 'all-time'
ORDER BY pair_rate DESC
LIMIT 20;

-- Specific player's replays
SELECT r.id, r.player1, r.player2, r.winner, r.upload_time, r.rating
FROM showdown.replays r
WHERE r.format_id = 'gen9championsvgc2026regma'
  AND (r.player1 = 'someuser' OR r.player2 = 'someuser')
ORDER BY r.upload_time DESC;

-- Bring rate for a specific Pokemon
SELECT rp.species,
  COUNT(*) FILTER (WHERE rp.was_brought) AS brought,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE rp.was_brought)::numeric / COUNT(*), 4) AS bring_rate
FROM showdown.replay_pokemon rp
JOIN showdown.replays r ON r.id = rp.replay_id
WHERE r.format_id = 'gen9championsvgc2026regma'
  AND rp.species = 'Rayquaza'
GROUP BY rp.species;
```

---

## 4. Pipeline Design

### 4.1 Architecture: Vercel Cron Jobs

The pipeline runs as **Vercel cron jobs** hitting Next.js API routes. Each invocation must complete within Vercel's **300s (5 min)** Pro plan limit. Long operations are broken into incremental batches with cursor-based progress tracking in the DB.

| Route | Schedule | Purpose |
| --- | --- | --- |
| `/api/cron/showdown-sync` | `0 * * * *` (top of every hour) | Discover + download + parse + import replays |
| `/api/cron/showdown-aggregate` | `0 4 * * *` (daily at 4am UTC) | Recompute usage stats from all imported replays |

**vercel.json:**

```json
{
  "crons": [
    { "path": "/api/cron/showdown-sync", "schedule": "0 * * * *" },
    { "path": "/api/cron/showdown-aggregate", "schedule": "0 4 * * *" }
  ]
}
```

**Security:** Both routes verify `Authorization: Bearer ${CRON_SECRET}` header (Vercel injects this automatically for cron invocations). Manual triggers from the admin UI also pass this header.

### 4.2 Progress Tracking: `showdown.sync_cursors`

Each cron run picks up where the last one left off. Progress is stored in the DB, not on disk.

```
format_id           text PK             ← format being synced
last_before         bigint              ← Showdown search API pagination cursor (unix timestamp)
total_discovered    int DEFAULT 0       ← total replay IDs found across all runs
total_imported      int DEFAULT 0       ← total replays successfully imported
status              text DEFAULT 'idle' ← 'idle', 'running', 'error'
last_run_at         timestamptz         ← when the last sync started
last_error          text                ← error message from last failed run
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

### 4.3 Route 1: `/api/cron/showdown-sync`

Discovers new replays, downloads their full data, parses battle logs, and imports structured data — all in one pass per batch.

```typescript
// POST /api/cron/showdown-sync
// Headers: Authorization: Bearer ${CRON_SECRET}
// Body (optional): { format?: string, batchSize?: number }
//
// Default format: gen9championsvgc2026regma
// Default batchSize: 50 replays per invocation
```

**Algorithm (each invocation):**

1. Read `sync_cursors` row for the target format (create if missing)
2. Set status to `'running'`, update `last_run_at`
3. Paginate `search.json?format={format}&before={cursor}` with 1.5s delay between pages
4. For each replay in search results (up to `batchSize`):
   - Skip if already in `showdown.replays` (check by ID)
   - Fetch `/{replayId}.json` with 1s delay
   - Parse battle log using `@pkmn/protocol` (see Section 5)
   - Extract: team preview, moves, items, abilities, winner, ratings, bring selections
   - Insert into `showdown.replays`, `replay_pokemon`, `replay_moves`, `replay_items`, `replay_abilities`
5. Update `sync_cursors`: save new `last_before`, increment counters
6. Set status back to `'idle'`
7. Return `{ imported: N, cursor: last_before, elapsed: Xms }`

**Time budget (within 300s):**

- Search API pagination: ~1.5s per page × ~1 page per batch = ~1.5s
- Replay download: ~1s per replay × 50 replays = ~50s
- Parse + DB insert: ~0.1s per replay × 50 = ~5s
- **Total: ~57s per batch** — well within the 5-min limit

**Retry/backoff:**

- On HTTP 429 or 5xx from Showdown: exponential backoff starting at 5s, max 30s, 3 retries
- On persistent failure: set cursor status to `'error'`, log `last_error`, exit gracefully
- Next hourly run will retry from the same cursor position

**Idempotency:** Uses `ON CONFLICT (id) DO NOTHING` on `replays` table. Safe to re-run.

### 4.4 Route 2: `/api/cron/showdown-aggregate`

Computes usage statistics from all imported replays for each active format.

```typescript
// POST /api/cron/showdown-aggregate
// Headers: Authorization: Bearer ${CRON_SECRET}
// Body (optional): { format?: string, period?: string }
//
// Default: aggregates all active formats for the current month
```

**For replay-based aggregation:**

1. Query `showdown.replays` + `replay_pokemon` for the given format and time period
2. Compute per-species: usage count/rate, bring count/rate, win count/rate
3. Compute moveset distributions from `replay_moves`, `replay_items`, `replay_abilities`
4. Compute team cores (all 2-Pokemon pairs that appear on the same side)
5. Compute Tera usage from `replay_pokemon.tera_type` (skip for non-Tera formats)
6. Upsert into `format_snapshots` + child tables (`ON CONFLICT ... DO UPDATE`)

**For Smogon stats import** (monthly, when new Smogon data is available):

1. Fetch chaos JSON from `https://www.smogon.com/stats/{year}-{month}/chaos/{format}-{rating}.json`
2. Parse and map directly into `format_snapshots` + `pokemon_usage` + `pokemon_movesets`
3. Smogon data includes spreads, teammates, counters — fields not available from replays

---

## 5. Battle Log Parsing

### 5.1 Library: `@pkmn/protocol`

The `@pkmn/protocol` package provides a proper parser for Showdown's pipe-delimited battle log format. Do NOT parse with regex — the protocol has edge cases (nicknames with pipes, special characters, forme changes) that regex cannot handle reliably.

```typescript
import { Protocol } from '@pkmn/protocol';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';

const gens = new Generations(Dex);
```

### 5.2 Key Protocol Messages

| Message | Example | What It Tells Us |
| --- | --- | --- |
| `\|poke\|p1\|Rayquaza, L50\|` | Team preview | All 6 Pokemon per side (species, level, gender) |
| `\|switch\|p1a: snek\|Rayquaza, L50\|100/100` | Pokemon sent out | Which 4 were brought to battle |
| `\|move\|p1a: snek\|Dragon Ascent\|p2a: target` | Move used | Moves selected during game |
| `\|-enditem\|p1a: snek\|Booster Energy\|` | Item consumed | Items triggered/consumed |
| `\|-item\|p1a: snek\|Leftovers\|[from] ability: Frisk` | Item revealed | Items revealed by Frisk/Thief |
| `\|-ability\|p1a: snek\|Air Lock\|` | Ability triggered | Abilities that activate |
| `\|-mega\|p1a: snek\|Rayquaza\|` | Mega Evolution | Mon Mega Evolved (Champions M-A) |
| `\|-terastallize\|p1a: snek\|Bug\|` | Terastallization | Mon terastallized + type (SVI formats) |
| `\|raw\|...Tera Types:...\|` | Tera Type Preview | Pre-game tera type reveal (if format supports it) |
| `\|win\|PlayerOne\|` | Game over | Winner |
| `\|-damage\|p1a: snek\|77/100\|` | Damage dealt | HP remaining (for EV reverse-engineering) |
| `\|drag\|p1a: snek\|Rayquaza, L50\|100/100` | Forced switch-in | Counts as "brought" |

### 5.3 Parsing Strategy

```typescript
interface ParsedReplay {
  winner: string | null;
  winnerNum: 1 | 2 | null;
  teams: {
    p1: ParsedPokemon[];
    p2: ParsedPokemon[];
  };
  brought: {
    p1: Set<string>; // species names that appeared in battle
    p2: Set<string>;
  };
  moves: {
    p1: Map<string, Set<string>>; // species → set of move names
    p2: Map<string, Set<string>>;
  };
  items: {
    p1: Map<string, string>; // species → item name
    p2: Map<string, string>;
  };
  abilities: {
    p1: Map<string, string>; // species → ability name
    p2: Map<string, string>;
  };
  megas: {
    p1: Set<string>; // species that Mega Evolved
    p2: Set<string>;
  };
  teras: {
    p1: Map<string, string>; // species → tera type
    p2: Map<string, string>;
  };
}

interface ParsedPokemon {
  species: string;
  level: number;
  gender: 'M' | 'F' | null;
  slot: number; // 1-6 from team preview order
}

function parseReplayLog(log: string): ParsedReplay {
  const result: ParsedReplay = { /* init */ };

  for (const { args, kwArgs } of Protocol.parse(log)) {
    switch (args[0]) {
      case 'poke': {
        // |poke|p1|Rayquaza, L50|
        const side = args[1]; // 'p1' or 'p2'
        const details = args[2]; // 'Rayquaza, L50, M'
        // Parse species, level, gender from details
        break;
      }
      case 'switch':
      case 'drag': {
        // Mark as "brought" — this mon appeared in battle
        const ident = args[1]; // 'p1a: snek'
        const side = ident.startsWith('p1') ? 'p1' : 'p2';
        const details = args[2]; // 'Rayquaza, L50'
        // Map nickname to species, add to brought set
        break;
      }
      case 'move': {
        // |move|p1a: snek|Dragon Ascent|p2a: target
        const ident = args[1];
        const moveName = args[2];
        // Add to moves map
        break;
      }
      case '-enditem':
      case '-item': {
        // Item revealed/consumed
        break;
      }
      case '-ability': {
        // Ability triggered
        break;
      }
      case '-mega': {
        // Mega Evolution (Champions M-A)
        break;
      }
      case '-terastallize': {
        // Terastallization (SVI formats)
        break;
      }
      case 'win': {
        result.winner = args[1];
        break;
      }
    }
  }

  return result;
}
```

### 5.4 Format-Specific Handling

| Feature | Champions M-A | SVI Formats |
| --- | --- | --- |
| Mega Evolution | Yes — parse `-mega` messages | No |
| Tera types | No — skip tera parsing entirely | Yes — parse `-terastallize` and `raw` tera preview |
| Z-Moves | No | No (SVI doesn't have them either) |
| Dynamax | No | No (SVI doesn't have it either) |
| Level | Usually 50 | Usually 50 |

The parser should detect the format from the replay's `formatid` field and toggle behavior accordingly. A simple check:

```typescript
const hasTera = !formatId.includes('champions');
const hasMega = formatId.includes('champions');
```

### 5.5 Nickname Resolution

Showdown replays use nicknames in battle actions (`p1a: snek`) but species names in team preview (`Rayquaza`). The parser must maintain a nickname → species mapping built from `switch` messages:

```
|switch|p1a: snek|Rayquaza, L50|100/100
```

This tells us the nickname "snek" maps to species "Rayquaza". All subsequent references to "p1a: snek" should resolve to "Rayquaza".

---

## 6. Admin UI

### 6.1 Route: `/admin/showdown`

Similar to the Limitless admin page. Three tabs:

#### Data Tab

Browse imported replays with filtering and sorting.

- **Filters:** format (dropdown), date range, player name search, min rating
- **Table columns:** Replay ID (link to Showdown), Player 1, Player 2, Winner, Rating, Upload Time, Imported At
- **Bulk actions:** Delete selected replays
- **Stats bar:** Total replays imported, date range, formats available

#### Stats Tab

View computed usage statistics.

- **Snapshot selector:** format, period, source (replays vs smogon), min rating
- **Pokemon rankings table:** Species, Usage %, Bring %, Win %, top 4 moves, top item, top ability
- **Click a Pokemon:** Expanded view with full moveset distribution (bar charts), teammate correlations, tera type breakdown
- **Team cores section:** Most common pairs with win rates
- **Meta comparison:** Side-by-side Smogon stats vs replay-computed stats for the same period

#### Import Tab

Status and instructions for running pipeline scripts.

- **Current state:** Last import time, total replays per format, latest snapshot dates
- **Script commands:** Copy-paste commands for running download/import/aggregate
- **Future:** Trigger buttons that invoke scripts via API (not MVP)

### 6.2 Components

Reuse existing admin patterns from the Limitless admin page:

- `DataTable` with pagination, sorting, filtering
- `StatCard` for summary metrics
- `Tabs` for Data/Stats/Import sections
- `Select` for format/period dropdowns
- Usage bar charts using whatever charting library is already in the project (or simple CSS bars)

---

## 7. Edge Function: `showdown-stats`

A lightweight, read-only edge function for serving pre-computed aggregates via API. Powers public-facing usage stats pages.

### 7.1 Endpoint Design

```
GET /functions/v1/showdown-stats?format={formatId}
GET /functions/v1/showdown-stats?format={formatId}&period=2026-05
GET /functions/v1/showdown-stats?format={formatId}&species=Rayquaza
GET /functions/v1/showdown-stats?format={formatId}&type=cores
```

### 7.2 Query Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `format` | Yes | Showdown format ID |
| `period` | No | Time period (default: `all-time`) |
| `source` | No | `replays` or `smogon` (default: `replays`) |
| `min_rating` | No | Rating threshold filter |
| `species` | No | Filter to a specific Pokemon (returns full moveset data) |
| `type` | No | `usage` (default), `cores`, `tera` |
| `limit` | No | Max results (default: 50) |

### 7.3 Response Shapes

**Usage (default):**

```json
{
  "format": "gen9championsvgc2026regma",
  "period": "all-time",
  "source": "replays",
  "total_replays": 12345,
  "computed_at": "2026-05-11T12:00:00Z",
  "pokemon": [
    {
      "species": "Rayquaza",
      "usage_rate": 0.4523,
      "bring_rate": 0.8912,
      "win_rate": 0.5234,
      "top_moves": ["Dragon Ascent", "Protect", "Extreme Speed", "Swords Dance"],
      "top_item": "Life Orb",
      "top_ability": "Air Lock"
    }
  ]
}
```

**Species detail (`?species=Rayquaza`):**

```json
{
  "species": "Rayquaza",
  "usage_rate": 0.4523,
  "bring_rate": 0.8912,
  "win_rate": 0.5234,
  "moves": { "Dragon Ascent": 0.98, "Protect": 0.85, "Extreme Speed": 0.72, "Swords Dance": 0.65 },
  "items": { "Life Orb": 0.45, "Choice Band": 0.20, "Focus Sash": 0.15 },
  "abilities": { "Air Lock": 0.95, "Delta Stream": 0.05 },
  "teammates": { "Groudon": 0.35, "Incineroar": 0.30 },
  "spreads": { "Adamant:4/252/0/0/0/252": 0.25 }
}
```

### 7.4 Implementation Notes

- No auth required for public stats — no RLS check needed (use service role client)
- Cache response with `Cache-Control: public, max-age=3600` (stats don't change frequently)
- CORS headers for public API consumption
- Input validation with Zod for query params

---

## 8. Implementation Phases

### Phase 1: Schema + Sync Cron

- [ ] Create `showdown` schema migration (all tables including `sync_cursors`, indexes, RLS, grants, helper function)
- [ ] Add `showdown` to PostgREST exposed schemas (`config.toml` + production dashboard)
- [ ] Install `@pkmn/protocol`, `@pkmn/data`, `@pkmn/dex`
- [ ] Build battle log parser module (team preview, moves, items, abilities, winner, ratings, bring selections)
- [ ] Handle Champions M-A specifics (Mega Evolution, no Tera)
- [ ] Build `/api/cron/showdown-sync` route — discover, download, parse, import in batches
- [ ] Add cron config to `vercel.json`
- [ ] Test with `gen9championsvgc2026regma` — verify hourly batches import correctly
- [ ] Validate parsed data against manual replay inspection

### Phase 2: Aggregation Cron

- [ ] Build `/api/cron/showdown-aggregate` route — compute usage/bring/win rates
- [ ] Compute moveset distributions (moves, items, abilities)
- [ ] Compute team cores (common pairs)
- [ ] Compute Tera usage distributions (for Tera-enabled formats)
- [ ] Add Smogon monthly stats import path (fetch chaos JSON, write to aggregate tables)
- [ ] Compare replay-computed stats vs Smogon stats for validation

### Phase 3: Admin UI

- [ ] Create `/admin/showdown` route with Data/Stats tabs
- [ ] Data tab: browse replays with filters (format, date, player, rating)
- [ ] Stats tab: Pokemon usage rankings, moveset distributions, team cores
- [ ] Sync status display (show `sync_cursors` state, last run, errors)
- [ ] Manual trigger button (calls sync/aggregate routes with admin auth)

### Phase 4: Public Usage Stats Pages

- [ ] Create `showdown-stats` edge function (read-only, serves pre-computed aggregates)
- [ ] Build public `/stats/{format}` page showing usage rankings
- [ ] Build public `/stats/{format}/{species}` page showing moveset detail
- [ ] Add format selector (Champions M-A, Reg I, etc.)
- [ ] Cache with `unstable_cache` + `CacheTags`

### Phase 5: Expansion

- [ ] Add additional formats (gen9vgc2025regi, gen9vgc2024regg, etc.)
- [ ] Import historical Smogon monthly stats for trend analysis
- [ ] Support `smogtours-` prefix replays (Smogon organized tournaments)
- [ ] Rating-filtered stats (1500+, 1630+, etc.)
- [ ] Meta evolution tracking — daily snapshots showing how usage shifts over time

---

## 9. Key Differences from Limitless Pipeline

| Aspect | Limitless Pipeline | Showdown Pipeline |
| --- | --- | --- |
| **Data source** | REST API with API key | Public API, no auth |
| **Data type** | Tournament results + full team sheets | Individual ladder replays + partial team data |
| **Trigger** | Webhook (`tournament:ended`) + backfill script | Poll-based discovery (search.json pagination) |
| **Team data** | Complete (all 4 moves, item, ability, tera) | Partial per replay (only revealed info) |
| **Volume** | ~20 events/season, ~6K standings | ~10K-50K replays/month per format |
| **Schema** | `limitless.*` | `showdown.*` |
| **Player identity** | Limitless username (stable) | Showdown username (can change) |
| **Tournament context** | Placements, phases, rounds | None — ladder games only |
| **Processing model** | Download → import (1:1) | Download → import → aggregate (needs aggregation step) |
| **Aggregation** | Queries across tournaments | Pre-computed snapshots in dedicated tables |
| **Parsing complexity** | JSON response mapping | Battle log protocol parsing (`@pkmn/protocol`) |
| **Edge function** | `limitless-webhook` (receive + import) | `showdown-stats` (read-only serving) |
| **File structure** | `data/limitless/{tournamentId}/` | `data/showdown/{format}/replays/` |
| **Smogon stats** | N/A | Additional data source (monthly chaos JSON) |
| **Mega Evolution** | In team sheet data | Parsed from `-mega` battle log messages |
| **Tera types** | In team sheet data (if format has it) | Parsed from `-terastallize` messages (if format has it) |

---

## 10. Open Questions / Future Work

### Near-Term Questions

- **Species name normalization:** Showdown uses display names (`Rayquaza-Mega`) while Limitless uses slugs (`rayquaza`). Pick a canonical format for the `species` column. Recommendation: use `@pkmn/dex` species IDs for consistency.
- **Rating filtering:** Should we store all replays regardless of rating, or only import rated games above a threshold? Recommendation: store all, filter at aggregation time.
- **Deduplication:** Can the same replay appear in search results for different formats? Need to verify.

### Future Work

- **EV reverse-engineering from damage calcs:** The `-damage` messages show HP changes. Combined with known base stats, level, and move power, EVs can be estimated. Would require a damage calc library (`@pkmn/dmg` or `@smogon/calc`). High complexity, high value.
- **Team reconstruction across multiple replays:** Same player + same format + overlapping team → reconstruct full sets (all 4 moves, item, ability) by combining partial data across replays. Statistical confidence scoring for inferred sets.
- **Smogon tournament integration:** Replays with `smogtours-` prefix come from organized Smogon tournaments. These could be treated as pseudo-tournaments with more structured context.
- **Real-time ladder tracking:** Poll search.json on a schedule (every 15 min?) to track meta shifts in near-real-time. Would need a scheduled runner (GitHub Actions cron or similar).
- **Player profile integration:** Link Showdown usernames to trainers.gg accounts. Users could claim their Showdown identity and see their ladder stats on their profile. Requires verification mechanism (e.g., set a specific Showdown avatar or bio).
- **Win rate by team composition:** Extend aggregation to track win rates for full 6-Pokemon teams (or 4-Pokemon brought compositions). Combinatorial explosion — need smart bucketing.
- **Lead analysis:** Track which 2 Pokemon are sent out first (turn 1 switches). Useful for lead optimization.
- **Speed tier analysis:** From battle logs, infer speed relationships (who moves first). Combined with known base speeds, can estimate speed investment.
- **Rental team matching:** Cross-reference popular rental team codes with replay data to track rental team performance on ladder.
