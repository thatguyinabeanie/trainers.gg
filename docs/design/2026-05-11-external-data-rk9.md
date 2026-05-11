# External Data: RK9 (Official Play! Pokemon Events)

> Status: Brainstorming — nothing is set in stone yet
> Started: 2026-05-11
> Related: [Limitless design doc](./2026-05-10-external-data-limitless.md)

## 1. Overview

Import official Play! Pokemon tournament data from RK9.gg into trainers.gg for player history, analytics, and meta insights. RK9 covers the high-stakes competitive circuit — Regionals, Internationals, Special Championships, and Worlds. This is the authoritative source for official tournament results.

**What makes RK9 data unique vs. Limitless:**

| Aspect | RK9 | Limitless |
| --- | --- | --- |
| Events | Official Play! Pokemon circuit | Community tournaments |
| Scale | ~600 players per Regional | ~20-100 players per event |
| Prestige | Championship Points, Worlds invites | Community rankings |
| Divisions | Masters / Senior / Junior | Not separated |
| Player identity | Real names + no stable ID | Usernames |
| W-L-T record | Not available (placement only) | Available |

**Why we need this:**

- Official tournament results are what competitive players care most about
- CP (Championship Points) standings are derived from these events
- Meta analysis at the highest level of play (Regionals+) differs from community events
- Player profiles need official results to be credible

---

## 2. Data Source

**Website:** `https://rk9.gg`

### Access Method

RK9 has **no public API**. It's a Firebase-hosted app. Data access is via HTML scraping.

**Good news:** Roster and team list pages are **server-rendered** — simple HTTP fetch + HTML parsing works. No headless browser needed for these.

**Bad news:** Pairings round data is **client-side rendered** (shows "Loading..." in raw HTML). Individual round pairings require either a headless browser (Playwright) or intercepting the underlying Firebase/JS calls.

**No authentication required** for any of the pages we need (roster, team lists, pairings are all public).

### URL Patterns

All pages use the **same tournament ID** (from the VG link on the events page):

| Page | URL | Rendering | Auth |
| --- | --- | --- | --- |
| Events list | `/events/pokemon` | Server-rendered | None |
| Roster | `/roster/{tournamentId}` | Server-rendered | None |
| Team List | `/teamlist/public/{tournamentId}/{rosterEntryId}` | Server-rendered | None |
| Pairings | `/pairings/{tournamentId}` | Client-rendered (JS) | None |

**Tournament IDs:** alphanumeric, ~20 chars (e.g., `TO027Rvi7XmbN1f355Nc`)

**Roster entry IDs:** alphanumeric, ~20 chars (e.g., `O6e5AJ3AyTySxnIKi6y3`) — unique per player-per-event, found in team list URLs on the roster page

### Discovery Flow

```
/events/pokemon
  → find all VG tournament links (e.g., /tournament/TO027Rvi7XmbN1f355Nc)
  → extract tournament ID from URL

For each tournament ID:
  /roster/{id}           → all players, standings, team list URLs
  /teamlist/public/{id}/{rosterEntryId}  → team sheet per player
  /pairings/{id}         → match results per round per division
```

### Data Available

#### From Roster Page (`/roster/{id}`)

Server-rendered HTML table. All players listed with:

| Field | Example | Notes |
| --- | --- | --- |
| First name | `Aaron` | Real name |
| Last name | `Jaffe` | Real name |
| Country | `CA` | ISO alpha-2 (displayed as `[CA]`) |
| Division | `Masters` | Separate divisions visible via tabs |
| Trainer name | `Aaron` | In-game name |
| Team List link | `/teamlist/public/{id}/{rosterEntryId}` | The `rosterEntryId` is our per-event player key |
| Placement | `166` | Final standing |

**Also shown but not useful:** Masked Player ID (`3....9`) — first and last digit only, not unique across players.

#### From Team List Page (`/teamlist/public/{id}/{rosterEntryId}`)

Server-rendered. Shows team in **multiple languages** (EN, FR, IT, DE, ES, JP, KO, SC, TC) — we only parse EN.

Per Pokemon (6 total):

| Field | Example | Notes |
| --- | --- | --- |
| Species | `Ogerpon [Hearthflame Mask]` | Display name with bracket form notation |
| Tera Type | `Fire` | null for Champions M-A (no Tera) |
| Ability | `Mold Breaker` | |
| Held Item | `Hearthflame Mask` | |
| Move 1-4 | `Ivy Cudgel`, `Wood Hammer`, `Follow Me`, `Spiky Shield` | Listed in order |

**Sprite URL contains dex number:** `https://storage.googleapis.com/files.rk9labs.com/sprites/broadcast/1017_003.png` (could be useful for species ID mapping)

**NOT available:** EVs, IVs, Nature, Gender, Level

#### From Pairings Page (`/pairings/{id}`)

**Division tabs:** "Masters in Round 16", "Senior in Round 11", "Junior in Round 10"

**Round tabs:** R1, R2, ... R16 (varies by division)

**Per match (client-rendered per round):**
- Player 1: Name [Country]
- Table #
- Player 2: Name [Country]
- Winner (implied by styling/order)

**Standings tab (server-rendered):** Final ordered standings per division — numbered list of all players with country codes. This is available without JavaScript.

**Technical note:** Individual round data loads via client-side JavaScript (shows "Loading..." in raw HTML). Options:
1. Use Playwright to wait for JS rendering
2. Intercept the underlying Firebase/API calls the JS makes
3. Skip pairings for MVP, use only standings (available server-side)

### Event Tiers

| Tier | Scale | Duration | Examples |
| --- | --- | --- | --- |
| Regional Championships | ~600 VGC players | 2-3 days | Prague, Orlando, Dortmund |
| International Championships | ~800+ VGC players | 3 days | EUIC, NAIC, LAIC |
| Special Championships | ~400 VGC players | 2 days | Turin, Seville |
| Worlds | ~400 VGC players (invite only) | 3 days | TBD 2026 |

### Known Events (2025-2026 Season)

All VGC tournament IDs from `/events/pokemon`:

| Date | Event | Location | Tournament ID | Tier |
| --- | --- | --- | --- | --- |
| May 29-31, 2026 | Indianapolis Regionals | Indianapolis, US | `IN02wbUMQOt2eNv12cgC` | regional |
| May 23-24, 2026 | Melbourne Regionals | South Wharf, AU | `MB02w71HQZzTvTOYLtXb` | regional |
| May 16-17, 2026 | Utrecht Regionals | Utrecht, NL | `UT02wFHDCjnKgZ9Gscu7` | regional |
| May 16-17, 2026 | Campinas Regionals | Campinas, BR | `CA02wLAJ2mRyQI5kryVw` | regional |
| May 8-10, 2026 | Los Angeles Regionals | Los Angeles, US | `LS02w5lpCOiMwPPo7QWD` | regional |
| Apr 25-26, 2026 | Prague Regionals | Praha, CZ | `PR02wayEt6qQBnpFi6cp` | regional |
| Apr 4-5, 2026 | Querétaro Regionals | Santiago de Querétaro, MX | `QT02wgHCgGOEh4NP4jLE` | regional |
| Apr 3-5, 2026 | Orlando Regionals | Orlando, US | `OR02wF0GhaiorROTkFlu` | regional |
| Mar 28-29, 2026 | Seville Special | Sevilla, ES | `SV02wtoHf5SDBUM0ntB2` | special |
| Mar 20-22, 2026 | Houston Regionals | Houston, US | `HO02w2PgpC7mWHP8zYRI` | regional |
| Mar 14-15, 2026 | Curitiba Regionals | Pinhais, BR | `CU02wOcwtjVNH6QdhfNE` | regional |
| Feb 27-Mar 1, 2026 | Seattle Regionals | Seattle, US | `SE027LIri9yqbewCPonE` | regional |
| Feb 13-15, 2026 | EUIC | London, UK | `EU02mADIyxk2QHCU8dqx` | international |
| Feb 7-8, 2026 | Santiago Regionals | Huechuraba, CL | `ST02KJ5wqNl34q3KGE8N` | regional |
| Feb 7-8, 2026 | Sydney Regionals | Sydney, AU | `SY02sMDp6JmCcnCynSLn` | regional |
| Jan 24-25, 2026 | Mérida Regionals | Mérida, MX | `ME02w00ChbJUX07ROH4K` | regional |
| Jan 24-25, 2026 | Birmingham Regionals | Birmingham, UK | `BH02mBOy0UgfISzHnNdU` | regional |
| Jan 16-18, 2026 | Toronto Regionals | Toronto, CA | `TO027Rvi7XmbN1f355Nc` | regional |
| Nov 29-30, 2025 | Stuttgart Regionals | Stuttgart, DE | `SG02gVKM38QMVGTcAiZN` | regional |
| Nov 21-23, 2025 | LAIC | São Paulo, BR | `LA0226md2zDgZtmvexIY` | international |
| Nov 14-16, 2025 | Las Vegas Regionals | Las Vegas, US | `LV02kSgge3zYTKAwlomv` | regional |
| Nov 1-2, 2025 | Gdańsk Regionals | Gdańsk, PL | `GD02yFCaTDuKwnIR9IKd` | regional |
| Nov 1-2, 2025 | Brisbane Regionals | South Brisbane, AU | `BR02nX95OUm3tbvzmSPv` | regional |
| Oct 25-26, 2025 | Lille Regionals | Lille, FR | `LL02aDtPZHuHLDewaIqy` | regional |
| Oct 10-12, 2025 | Milwaukee Regionals | Milwaukee, US | `MK02mx9kmM49UZ5g4JxH` | regional |
| Oct 11-12, 2025 | Belo Horizonte Regionals | Belo Horizonte, BR | `BE02wX9mUPbgJsSba2pR` | regional |
| Sep 19-21, 2025 | Pittsburgh Regionals | Pittsburgh, US | `PT02mMVCgJGPQcHccDoy` | regional |
| Sep 13-14, 2025 | Monterrey Regionals | Monterrey, MX | `MT02mEWqwYNpTSVPcblx` | regional |
| Sep 13-14, 2025 | Frankfurt Regionals | Frankfurt am Main, DE | `FR02mk9EZ28MWiUNIsTN` | regional |

**Upcoming (future — not yet past, no data to scrape):**
- Jun 6-7, 2026: Turin Special (`TU02wKzv4cT2BBiI9dEg`)
- Jun 12-14, 2026: NAIC (`NA02wgUPFDXKmQmqILwS`)

---

## 3. Schema Design (`rk9` schema)

### Decisions

- Schema: **`rk9`** — isolated from `limitless` and `showdown`
- Format IDs: **Showdown strings** (`gen9championsvgc2026regma`) — same canonical format as other schemas
- Tournament IDs: RK9's native alphanumeric IDs (text PK)
- Player IDs: Generated UUIDs — players are deduplicated by `(player_id_masked, first_name, last_name, country)`. The `roster_entry_id` from the RK9 URL is stored on standings for linking back to team list pages.
- **Division is a first-class concept** — stored on standings, not players (a player could theoretically age up between events)
- No FK to `public` or other schemas (future account linking will bridge these)
- `moves text[]` for move storage (same as `limitless`)
- No W-L-T record — RK9 doesn't expose this, only final placement
- Species stored as scraped display names — normalized to slugs at import time via mapping table

### Tables (7 total)

#### `rk9.events`

The root entity. One row per official Play! Pokemon event.

```
event_id            text PK             ← RK9's native ID ('PR02wayEt6qQBnpFi6cp')
name                text NOT NULL       ← 'Prague Regional Championships 2026'
tier                text NOT NULL       ← 'regional' / 'international' / 'special' / 'worlds'
format_id           text                ← Showdown format string (null if unknown/mixed)
date_start          date NOT NULL       ← first day of event
date_end            date                ← last day (null if single-day)
location_city       text                ← 'Praha'
location_country    text                ← ISO alpha-2 ('CZ')
player_count        int                 ← total VGC registrants
has_team_lists      boolean DEFAULT false ← were team lists publicly available?
imported_at         timestamptz DEFAULT now()
import_status       text DEFAULT 'pending'  ← 'pending' / 'roster' / 'teams' / 'pairings' / 'complete' / 'failed'
import_error        text
```

#### `rk9.players`

Unique players across all events. Deduped by name + country (no stable external ID available).

```
id                  int GENERATED PK
first_name          text NOT NULL
last_name           text NOT NULL
country             text                ← ISO alpha-2
trainer_name        text                ← in-game name (nullable, not always shown)
created_at          timestamptz DEFAULT now()

UNIQUE(first_name, last_name, country)
```

> **Edge case:** Two players with the same name and country would collide. Rare enough to handle manually if it ever occurs (e.g., add a disambiguator to the name). The masked Player ID shown on the roster (e.g., `4....3`) is NOT useful for dedup — it's just the first and last digit of a longer ID, so many different players share the same masked value.

#### `rk9.standings`

Per-player results in a specific event + division.

```
id                  int GENERATED PK
event_id            text FK → events NOT NULL
player_id           int FK → players NOT NULL
division            text NOT NULL       ← 'masters' / 'senior' / 'junior'
placement           int                 ← final standing (nullable if DNF/DQ)
drop_round          int                 ← round they dropped (nullable)
roster_entry_id     text                ← from team list URL path segment (e.g., '01LXYxHoz4H91RevhzDv')
imported_at         timestamptz DEFAULT now()

UNIQUE(event_id, player_id, division)
```

> **Note:** `roster_entry_id` comes from the team list URL: `/teamlist/public/{eventId}/{rosterEntryId}`. It uniquely identifies a player-event registration within RK9 and is used to fetch their team list.

#### `rk9.team_pokemon`

Team sheet data — 6 Pokemon per standing.

```
id                  int GENERATED PK
standing_id         int FK → standings NOT NULL
position            int NOT NULL        ← 1-6
species             text NOT NULL       ← normalized slug (mapped from display name at import)
species_raw         text NOT NULL       ← original scraped name ('Calyrex [Ice Rider]')
ability             text
held_item           text
tera_type           text                ← null for Champions M-A
moves               text[]

UNIQUE(standing_id, position)
```

> **Note:** `species_raw` preserves the original scraped string for debugging/re-parsing. `species` is the normalized form (e.g., `calyrex-ice-rider`) for consistent querying across `limitless` and `rk9` schemas.

#### `rk9.phases`

Event structure — Swiss rounds followed by top cut bracket.

```
event_id            text FK → events    ┐
division            text NOT NULL       │ ← 'masters' / 'senior' / 'junior'
phase_number        int NOT NULL        ┘ composite PK
type                text NOT NULL       ← 'swiss' / 'single_elimination'
rounds              int                 ← total rounds in this phase
```

> **Difference from Limitless:** RK9 has separate phase structures per division (Masters might have 9 Swiss rounds + top 8, Seniors might have 6 Swiss + top 4).

#### `rk9.match_results`

Round-by-round pairings and results.

```
id                  int GENERATED PK
event_id            text NOT NULL       ┐
division            text NOT NULL       │ composite FK → phases
phase_number        int NOT NULL        ┘
round               int NOT NULL
table_number        int                 ← Swiss matches (nullable for bracket)
match_label         text                ← bracket label ('Finals', 'Semifinals 1', etc.)
player1_id          int FK → players
player2_id          int FK → players    ← nullable (bye)
winner_id           int FK → players    ← nullable (tie/bye/unfinished)
imported_at         timestamptz DEFAULT now()
```

#### `rk9.species_map`

Mapping from RK9 display names to normalized slugs. Maintained manually + expanded as new species/forms are encountered.

```
raw_name            text PK             ← 'Calyrex [Ice Rider]', 'Landorus [Incarnate Forme]'
species_slug        text NOT NULL       ← 'calyrex-ice-rider', 'landorus-incarnate'
verified            boolean DEFAULT false ← has this mapping been manually verified?
created_at          timestamptz DEFAULT now()
```

> This table serves double duty: (1) import-time lookup for normalizing species names, (2) tracking unmapped species that need manual review.

### Relationships

```
events ──1:*──► standings ──1:6──► team_pokemon
events ──1:*──► phases
events ──1:*──► match_results
players ◄──FK── standings (player_id)
players ◄──FK── match_results (player1_id, player2_id, winner_id)
phases ◄──composite FK── match_results (event_id, division, phase_number)
```

### Data Mapping from Scraped HTML

| Scraped Field | Table | Column |
| --- | --- | --- |
| Event page URL `/tournament/{id}` | events | `event_id` |
| Event name | events | `name` |
| Event date range | events | `date_start`, `date_end` |
| Event location | events | `location_city`, `location_country` |
| Roster page player row | players | `first_name`, `last_name`, `country`, `trainer_name` |
| Roster placement | standings | `placement` |
| Roster division tab | standings | `division` |
| Team list URL path segment | standings | `roster_entry_id` (e.g., `01LXYxHoz4H91RevhzDv`) |
| Team list Pokemon species | team_pokemon | `species_raw` → lookup `species_map` → `species` |
| Team list Pokemon ability | team_pokemon | `ability` |
| Team list Pokemon item | team_pokemon | `held_item` |
| Team list Pokemon tera type | team_pokemon | `tera_type` |
| Team list Pokemon moves | team_pokemon | `moves` |
| Pairings round tab | match_results | `round` |
| Pairings division tab | match_results | `division` |
| Pairings table number | match_results | `table_number` |
| Pairings player names | match_results | `player1_id`, `player2_id` (lookup from players) |
| Pairings winner | match_results | `winner_id` (lookup from players) |

---

## 4. Key Design Differences from `limitless`

| Aspect | `limitless` | `rk9` |
| --- | --- | --- |
| Root entity name | `tournaments` | `events` (Play! Pokemon events are broader than tournaments) |
| Player identity | Name + country composite (int PK, generated) | Stable username (text PK-like) |
| Division | Not applicable | First-class on standings + phases + match_results |
| W-L-T record | Stored (from API response) | Not available (only placement) |
| Species names | Already slugs from API | Raw display names → mapped to slugs via `species_map` |
| Phase structure | Per tournament | Per tournament **per division** |
| Import source | REST API (JSON) | HTML scraping (fragile) |
| `species_raw` column | Not needed (API gives clean data) | Essential for debugging scraper output |
| `species_map` table | Not needed | Required for name normalization |

---

## 5. Import Pipeline

### Strategy

Mirrors the Limitless pipeline architecture:
- **`scripts/rk9-download.ts`** — fetches data from RK9, saves to local JSON files
- **`scripts/rk9-import.ts`** — reads local JSON, inserts into Supabase `rk9` schema
- **`apps/web/src/lib/rk9/`** — reusable scraper + import logic for cron routes (future)

Roster and team list pages are server-rendered, so `fetch` + HTML parsing (cheerio/htmlparser2) handles ~90% of the work. Pairings require Playwright for client-rendered round data.

### Page Rendering Summary

| Page | Method | Library |
| --- | --- | --- |
| `/events/pokemon` | HTTP fetch + parse HTML | cheerio |
| `/roster/{id}` | HTTP fetch + parse HTML | cheerio |
| `/teamlist/public/{id}/{entryId}` | HTTP fetch + parse HTML | cheerio |
| `/pairings/{id}` (standings) | HTTP fetch + parse HTML | cheerio |
| `/pairings/{id}` (round data) | Playwright (client-rendered) | playwright |

### Code Structure (matching Limitless)

```
scripts/
  rk9-download.ts              # Stage 1: fetch pages → write JSON to data/rk9/
  rk9-import.ts                # Stage 2: read JSON → insert into Supabase

apps/web/src/lib/rk9/
  index.ts                     # Barrel export
  scraper.ts                   # HTML parsing logic (extract data from HTML strings)
  import.ts                    # DB import logic (syncEvents, importEvent)
  types.ts                     # TypeScript types for scraped data shapes

data/rk9/                      # Gitignored local data store
  events.json                  # Discovered events with metadata
  {tournamentId}/
    roster.json                # All players + standings + roster entry IDs
    teams.json                 # All team sheets (keyed by rosterEntryId)
    pairings.json              # All match results by division/round
    standings.json             # Final standings per division
```

### Download Script (`scripts/rk9-download.ts`)

```typescript
// pnpm rk9:download [--event=TO027Rvi7XmbN1f355Nc] [--all] [--skip-pairings]

// Phase 1: Discover events
// - Fetch /events/pokemon
// - Parse all VG tournament links from "Past Pokémon Events" section
// - Extract: event name, date, location, tier, tournament ID
// - Save to data/rk9/events.json

// Phase 2: For each event (or specific --event):
// - Fetch /roster/{id}
// - Parse HTML table rows: first_name, last_name, country, division,
//   trainer_name, placement, rosterEntryId (from team list link href)
// - Save to data/rk9/{id}/roster.json

// Phase 3: Team lists
// - For each player in roster with a team list link:
//   - Fetch /teamlist/public/{id}/{rosterEntryId}
//   - Parse EN section only (first 6 pokemon blocks before translations)
//   - Extract: species, tera_type, ability, held_item, moves[4]
//   - 1-2s delay between requests
// - Save all teams to data/rk9/{id}/teams.json

// Phase 4: Pairings (optional, requires Playwright)
// - Launch headless browser
// - Navigate to /pairings/{id}
// - For each division tab:
//   - Click standings tab → extract final standings
//   - For each round tab:
//     - Wait for table to render
//     - Extract: player1, player2, table_number, winner
// - Save to data/rk9/{id}/pairings.json
```

### Import Script (`scripts/rk9-import.ts`)

```typescript
// pnpm rk9:import [--event=TO027Rvi7XmbN1f355Nc] [--all]

// Mirrors limitless-import.ts:
// 1. Read data/rk9/{id}/roster.json
// 2. Read data/rk9/{id}/teams.json
// 3. Read data/rk9/{id}/pairings.json (if exists)
// 4. Upsert event row in rk9.events
// 5. For each player: upsert into rk9.players (dedup by name+country)
// 6. Insert standings (delete existing for idempotency)
// 7. Insert team_pokemon for each standing
// 8. Insert phases + match_results (if pairings data exists)
// 9. Mark event import_status = 'complete'
```

### Scraper Module (`apps/web/src/lib/rk9/scraper.ts`)

```typescript
// Pure functions: HTML string → structured data (no I/O)

export interface RK9Event {
  eventId: string;
  name: string;
  dateStart: string;
  dateEnd?: string;
  locationCity: string;
  locationCountry: string;
  tier: 'regional' | 'international' | 'special' | 'worlds';
}

export interface RK9RosterEntry {
  firstName: string;
  lastName: string;
  country: string;
  division: 'masters' | 'senior' | 'junior';
  trainerName: string;
  placement: number;
  rosterEntryId: string;  // from team list URL
}

export interface RK9Pokemon {
  speciesRaw: string;      // 'Ogerpon [Hearthflame Mask]'
  species: string;         // 'ogerpon-hearthflame' (normalized)
  teraType: string | null;
  ability: string;
  heldItem: string;
  moves: string[];         // 4 moves
}

export interface RK9TeamSheet {
  rosterEntryId: string;
  pokemon: RK9Pokemon[];   // 6 pokemon
}

export interface RK9Pairing {
  division: string;
  round: number;
  tableNumber: number | null;
  matchLabel: string | null;
  player1: string;         // 'Paul Chua [US]'
  player2: string | null;
  winner: string | null;
}

// Parsers
export function parseEventsPage(html: string): RK9Event[];
export function parseRosterPage(html: string): RK9RosterEntry[];
export function parseTeamListPage(html: string): RK9Pokemon[];
export function parsePairingsStandings(html: string): Map<string, string[]>;
// Pairings round data requires Playwright — returns parsed from DOM, not HTML string
```

### Import Module (`apps/web/src/lib/rk9/import.ts`)

```typescript
// Mirrors limitless/import.ts pattern exactly

export async function syncEventList(
  supabase: SupabaseClient,
  events: RK9Event[]
): Promise<SyncResult>;

export async function importEvent(
  supabase: SupabaseClient,
  eventId: string,
  roster: RK9RosterEntry[],
  teams: Map<string, RK9TeamSheet>,
  pairings?: RK9Pairing[]
): Promise<ImportResult>;

export async function processImportQueue(
  supabase: SupabaseClient,
  batchSize?: number
): Promise<BatchQueueResult>;
```

### Rate Limiting & Resumability

| Page Type | Volume per Event | Delay | Total Time |
| --- | --- | --- | --- |
| Roster | 1 page | - | instant |
| Team lists | ~600 pages (Masters) | 1.5s each | ~15 min |
| Pairings | ~16 rounds × 3 divisions | 2s each | ~2 min |

**Full backfill (20 events):** ~6 hours total for team lists. Resumable — the script tracks which roster entries already have teams downloaded.

### Import Status Progression

```
pending → roster → teams → pairings → complete
                                    ↘ failed (with import_error)
```

Each step is independently resumable. If team list scraping fails halfway through, re-running picks up where it stopped (checks which roster entries already have data in `teams.json`).

---

## 6. Species Name Normalization

RK9 uses display names with brackets for forms:

| RK9 Display Name | Normalized Slug | Notes |
| --- | --- | --- |
| `Calyrex [Ice Rider]` | `calyrex-ice-rider` | Bracket notation for forms |
| `Landorus [Incarnate Forme]` | `landorus-incarnate` | |
| `Urshifu [Rapid Strike]` | `urshifu-rapid-strike` | |
| `Rillaboom` | `rillaboom` | Simple species — no mapping needed |
| `Charizard` | `charizard` | |
| `Terapagos [Stellar Forme]` | `terapagos-stellar` | |

The `rk9.species_map` table handles this. The scraper:

1. Checks `species_map` for a known mapping
2. If found → uses the slug
3. If not found → attempts auto-mapping (lowercase, strip brackets, hyphenate)
4. Inserts with `verified = false` for manual review

This mapping could eventually be shared with Limitless too (Limitless uses slugs like `calyrex-shadow-rider` which are close but not identical to RK9's bracket notation).

---

## 7. Example Queries

```sql
-- Top 8 at Prague Regionals (Masters)
SELECT p.first_name, p.last_name, p.country, s.placement
FROM rk9.standings s
JOIN rk9.players p ON p.id = s.player_id
WHERE s.event_id = 'PR02wayEt6qQBnpFi6cp'
  AND s.division = 'masters'
  AND s.placement <= 8
ORDER BY s.placement;

-- Most used Pokemon at Regionals (Masters, top 32)
SELECT tp.species, COUNT(*) AS usage_count
FROM rk9.team_pokemon tp
JOIN rk9.standings s ON s.id = tp.standing_id
JOIN rk9.events e ON e.event_id = s.event_id
WHERE e.tier = 'regional'
  AND s.division = 'masters'
  AND s.placement <= 32
  AND e.format_id = 'gen9championsvgc2026regma'
GROUP BY tp.species
ORDER BY usage_count DESC;

-- Player tournament history across all events
SELECT e.name, e.date_start, e.tier, s.division, s.placement
FROM rk9.standings s
JOIN rk9.events e ON e.event_id = s.event_id
JOIN rk9.players p ON p.id = s.player_id
WHERE p.first_name = 'Aaron' AND p.last_name = 'Zheng' AND p.country = 'US'
ORDER BY e.date_start DESC;

-- Common items on Rayquaza at Internationals
SELECT tp.held_item, COUNT(*) AS usage_count
FROM rk9.team_pokemon tp
JOIN rk9.standings s ON s.id = tp.standing_id
JOIN rk9.events e ON e.event_id = s.event_id
WHERE e.tier = 'international'
  AND s.division = 'masters'
  AND tp.species = 'rayquaza'
GROUP BY tp.held_item
ORDER BY usage_count DESC;

-- Cross-format: compare species usage between Limitless and RK9
-- (requires querying both schemas — no FK, just same species slugs)
SELECT 'rk9' AS source, tp.species, COUNT(*) AS usage
FROM rk9.team_pokemon tp
JOIN rk9.standings s ON s.id = tp.standing_id
JOIN rk9.events e ON e.event_id = s.event_id
WHERE e.format_id = 'gen9championsvgc2026regma' AND s.division = 'masters'
GROUP BY tp.species
UNION ALL
SELECT 'limitless' AS source, tp.species, COUNT(*) AS usage
FROM limitless.team_pokemon tp
JOIN limitless.standings s ON s.id = tp.standing_id
JOIN limitless.tournaments t ON t.tournament_id = s.tournament_id
WHERE t.format_id = 'gen9championsvgc2026regma'
GROUP BY tp.species
ORDER BY source, usage DESC;

-- Unmapped species (need manual review)
SELECT raw_name, created_at
FROM rk9.species_map
WHERE verified = false
ORDER BY created_at DESC;
```

---

## 8. Volume Estimates

Per season (~20 official events):

| Table | Estimated Rows | Notes |
| --- | --- | --- |
| `events` | ~20-25 | Regionals + Internationals + Specials |
| `players` | ~2,000-4,000 | Many players attend multiple events |
| `standings` | ~12,000 | ~600 per event × 20 events (Masters only; more with Seniors/Juniors) |
| `team_pokemon` | ~72,000 | 6 per standing |
| `phases` | ~60-80 | ~2-3 per event per division |
| `match_results` | ~50,000-80,000 | ~9 Swiss rounds × 300 matches + top cut |
| `species_map` | ~200-400 | One-time build, grows slowly |

---

## 9. Open Questions

1. **Player dedup edge cases** — `(first_name, last_name, country)` works for 99% of cases. If a collision ever occurs (two players with identical name + country), we'd need a manual disambiguator. Trainer name could help but isn't always available.

2. **Division handling** — Store all divisions or only Masters? Seniors and Juniors are smaller (~50-100 players) but still valuable for complete data. Recommendation: store all, filter at query time.

3. **Format detection** — How to determine the format for an event? RK9 doesn't label events with format IDs. Options: (a) manual mapping per event, (b) infer from date (before May 2026 = SVI, after = Champions M-A), (c) derive from team sheets (presence of Mega stones → Champions M-A).

4. **Team list availability** — Not all events have public team lists. Some events only publish top cut teams. The `has_team_lists` boolean on events tracks this, but standings without teams are still valuable for placement data.

5. **Partnership vs. scraping** — Long-term, a data sharing agreement with RK9 Labs would be more reliable and ethical than scraping. Worth exploring once we have a working pipeline that demonstrates value.

---

## 10. Next Steps

- [ ] Investigate RK9 roster page HTML structure (what's scrapeable without auth?)
- [ ] Test if team list pages require Google OAuth or are publicly accessible
- [ ] Build species name mapping (RK9 display names → normalized slugs)
- [ ] Create migration (`rk9` schema + 7 tables + indexes + RLS)
- [ ] Build Playwright scraper for a single event (Prague Regionals as test case)
- [ ] Validate scraped data against manually collected data
- [ ] Build import tooling (local JSON → Supabase `rk9` schema)
- [ ] Backfill 2025-2026 season events
