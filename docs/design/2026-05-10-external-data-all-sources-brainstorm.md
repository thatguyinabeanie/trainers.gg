# External Data: Limitless + RK9 Integration

> Status: Brainstorming — nothing is set in stone yet
> Started: 2026-05-10

## Goal

Import VGC tournament data from external sources (Limitless and RK9) into trainers.gg for analytics, player history, and meta insights. External data lives in its own schema(s) — never mixed into native tournament tables.

## Strategy

Build and validate the pipeline using existing **Scarlet & Violet (Regulation I)** data from both sources. By the time Indianapolis Regionals (May 29-31) launches the first official **Champions (M-A)** event, the system will be ready to ingest new format data as it arrives.

- Limitless already has community M-A tournaments flowing
- RK9 will have official M-A data starting with Indianapolis
- All historical RK9 data is SVI and earlier

## Key Decisions

- External tournament data is **completely separate** from native trainers.gg tournaments
- Connection point: `external_players` links Limitless player IDs to trainers.gg alts
- Limitless supports a **webhook** (`tournament:ended`) — we'll receive a POST when a tournament finishes and auto-import
- We have a `LIMITLESS_API_KEY` (in `.env.local`) for higher rate limits and deck endpoint access
- We only care about `game: "VGC"` — TCG is out of scope
- **Canonical format IDs use Showdown's format strings** (e.g., `gen9championsvgc2026regma`). Limitless uses its own short codes (`M-A`, `SVI`, etc.) — we maintain a mapping from Limitless → Showdown format IDs.
- Current codebase uses `championsvgc2026regma` (without `gen9` prefix) — needs migration to align with `gen9championsvgc2026regma`

### Format ID Mapping (Limitless → Internal)

| Limitless | Showdown (canonical) | Display |
|-----------|---------------------|---------|
| `M-A` | `gen9championsvgc2026regma` | Champions: Reg M-A |
| `SVI` | `gen9vgc2025regi` | VGC 2025 Reg I |
| `SVH` | `gen9vgc2024regh` | VGC 2024 Reg H |
| `SVG` | `gen9vgc2024regg` | VGC 2024 Reg G |
| `SVF` | `gen9vgc2024regf` | VGC 2024 Reg F |
| `SVE` | `gen9vgc2023rege` | VGC 2023 Reg E |
| `VGC23` | `gen9vgc2023regd` | VGC 2023 Reg D |
| `23S3` | `gen9vgc2023regc` | VGC 2023 Reg C |
| `23S2` | `gen9vgc2023regb` | VGC 2023 Reg B |
| `23S1` | `gen9vgc2023rega` | VGC 2023 Reg A |
| `VGC22` | `gen8vgc2022series12` | VGC 2022 Series 12 |

> Note: some of these Showdown format IDs need verification — the pattern may vary for older formats.

## Limitless API

**Base URL:** `https://play.limitlesstcg.com/api`

### Endpoints

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /tournaments` | No | Paginated list (filter by game, format, organizer) |
| `GET /tournaments/{id}/details` | No | Full event metadata (organizer, phases, platform) |
| `GET /tournaments/{id}/standings` | No | All players — placing, record, team sheet, country |
| `GET /tournaments/{id}/pairings` | No | Every match — round, phase, table, players, winner |
| `GET /games` | No | Supported games, formats, platforms |
| `GET /games/{id}/decks` | Yes | Deck categorization rules |

### Webhook

- Event: `tournament:ended`
- Payload: `{ "secret": "...", "event": { "name": "tournament:ended", "tournamentId": "...", "game": "VGC" } }`
- Needs: Edge function URL registered via Limitless dashboard

### VGC Format IDs

| ID | Name |
|----|------|
| `M-A` | Regulation Set M-A (Pokemon Champions) |
| `SVI` | Scarlet & Violet - Regulation I |
| `SVH` | Scarlet & Violet - Regulation H |
| `SVG` | Scarlet & Violet - Regulation G |
| `SVF` | Scarlet & Violet - Regulation F |
| `SVE` | Scarlet & Violet - Regulation E |
| `VGC23` | Scarlet & Violet - Regulation D |
| `23S3` | Scarlet & Violet - Regulation C |
| `23S2` | Scarlet & Violet - Regulation B |
| `23S1` | Scarlet & Violet - Regulation A |
| `VGC22` | VGC 2022 (Series 12) |

### Platforms

| ID | Name |
|----|------|
| `SWITCH` | Nintendo Switch |
| `SIM` | Simulator |

## Data Shapes

### Tournament Details

```json
{
  "id": "69e3bf2048d465883f71730e",
  "game": "VGC",
  "format": "M-A",
  "name": "Champions Collective #7",
  "date": "2026-05-10T15:00:00.000Z",
  "players": 23,
  "organizer": { "id": 2636, "name": "Champions Collective FR" },
  "platform": "SWITCH",
  "decklists": true,
  "isPublic": true,
  "isOnline": true,
  "phases": [
    { "phase": 1, "type": "SWISS", "rounds": 5, "mode": "BO3" },
    { "phase": 2, "type": "SINGLE_BRACKET", "rounds": 1, "mode": "BO3" }
  ]
}
```

### Standing (per player)

```json
{
  "player": "lecehlou",
  "name": "LeCehlou",
  "country": "FR",
  "placing": 1,
  "record": { "wins": 7, "losses": 2, "ties": 0 },
  "drop": null,
  "decklist": [
    {
      "id": "charizard",
      "name": "Charizard",
      "item": "Charizardite X",
      "ability": "Blaze",
      "attacks": ["Dragon Dance", "Dragon Claw", "Protect", "Flare Blitz"],
      "tera": null
    }
  ],
  "deck": {}
}
```

### Pairing (per match)

```json
{
  "round": 1,
  "phase": 1,
  "table": 1,
  "player1": "hedilily",
  "player2": "shoji300",
  "winner": "shoji300"
}
```

Bracket matches use `"match": "T2-1"` instead of `"table"`.

## Data Available vs. Not Available

| Field | Available | Notes |
|-------|-----------|-------|
| Species | Yes | `id` (slug) and `name` |
| Item | Yes | |
| Ability | Yes | |
| Moves | Yes | Array of 4 |
| Tera type | Yes | `null` for non-SV formats |
| EVs / IVs | No | Not provided by Limitless |
| Nature | No | Not provided by Limitless |
| Gender | No | |
| Level | No | |

## Existing Schema (to be dropped)

The current tables in `public` were an early attempt. They'll be dropped and replaced by the `external` schema.

**Tables to drop:**
- `public.external_players`
- `public.data_imports`
- `public.imported_team_sheets`

**Tables to keep (web app reads these):**
- `public.format_meta_stats`
- `public.pokemon_usage_stats`
- `public.pokemon_detail_stats`

**Problems with the old design:**
1. Lives in `public` — should be in a separate schema
2. Normalized for writes, slow for reads (needs JOINs for basic analytics)
3. Assumes EV/IV/nature data that external sources don't provide
4. No match/pairing storage at all
5. Tournament metadata denormalized per-row but inconsistently (no standalone tournament entity)

## Database Schema Design (Brainstorming)

> **Status:** Exploring options. Nothing committed. Two approaches considered so far — landed on denormalized for query performance.

### Approach: Denormalized, query-optimized

Optimized for reads over writes. Tournament metadata repeated on every row — trivial at our volume (~36K rows/season max). Zero JOINs for common analytics queries.

**Schema:** `external` (separate from `public`)

#### `external.team_appearances` — the workhorse table

One row per Pokemon per player per tournament. Every row has full context.

```
┌──────────────────────────────────────────────────────────────┐
│              external.team_appearances                         │
├──────────────────────────────────────────────────────────────┤
│ id                  bigint PK                                 │
│                                                               │
│ -- Source identity (for dedup/idempotency)                    │
│ source              text (limitless/rk9)                       │
│ source_tournament_id text                                     │
│ source_player_id    text                                      │
│                                                               │
│ -- Tournament context (fully denormalized)                    │
│ tournament_name     text                                      │
│ format_id           text (e.g. gen9championsvgc2026regma)      │
│ tournament_date     date                                      │
│ tournament_tier     text (regional/international/community/..)│
│ player_count        int                                       │
│ platform            text (switch/sim)                          │
│                                                               │
│ -- Player context (fully denormalized)                        │
│ player_name         text                                      │
│ player_country      text                                      │
│                                                               │
│ -- Placement context (fully denormalized)                     │
│ placing             int                                       │
│ record_wins         int                                       │
│ record_losses       int                                       │
│ record_ties         int                                       │
│                                                               │
│ -- The Pokemon (one per row)                                  │
│ position            int (1-6)                                 │
│ species             text                                      │
│ ability             text                                      │
│ held_item           text                                      │
│ tera_type           text (nullable — null for Champions M-A)  │
│ moves               text[]                                    │
│                                                               │
│ -- Housekeeping                                               │
│ imported_at         timestamptz                                │
├──────────────────────────────────────────────────────────────┤
│ UNIQUE(source, source_tournament_id, source_player_id,        │
│        position)                                              │
└──────────────────────────────────────────────────────────────┘
```

#### `external.match_results` — pairings/match data

One row per match. Tournament context denormalized.

```
┌──────────────────────────────────────────────────────────────┐
│              external.match_results                            │
├──────────────────────────────────────────────────────────────┤
│ id                  bigint PK                                 │
│                                                               │
│ -- Source identity                                            │
│ source              text                                      │
│ source_tournament_id text                                     │
│                                                               │
│ -- Tournament context (denormalized)                          │
│ tournament_name     text                                      │
│ format_id           text                                      │
│ tournament_date     date                                      │
│ tournament_tier     text                                      │
│                                                               │
│ -- Match info                                                 │
│ phase               int                                       │
│ round               int                                       │
│ table_number        int (nullable)                            │
│ match_label         text (nullable, e.g. 'Finals')            │
│                                                               │
│ -- Players (denormalized)                                     │
│ player1_source_id   text                                      │
│ player1_name        text                                      │
│ player2_source_id   text (nullable — bye)                     │
│ player2_name        text (nullable)                           │
│ winner_source_id    text (nullable)                           │
│ winner_name         text (nullable)                           │
│                                                               │
│ -- Housekeeping                                               │
│ imported_at         timestamptz                                │
└──────────────────────────────────────────────────────────────┘
```

#### `external.players` — thin identity lookup (for future account linking)

Exists solely so players can link their trainers.gg account to external data in the future. No FK to `public.alts` for now.

```
┌──────────────────────────────────────────────────────────────┐
│              external.players                                  │
├──────────────────────────────────────────────────────────────┤
│ id                  bigint PK                                 │
│ source              text                                      │
│ source_player_id    text                                      │
│ display_name        text                                      │
│ country             text                                      │
│ extra_data          jsonb                                     │
│ created_at          timestamptz                                │
├──────────────────────────────────────────────────────────────┤
│ UNIQUE(source, source_player_id)                              │
└──────────────────────────────────────────────────────────────┘
```

#### Example queries (zero JOINs)

```sql
-- Charizard usage rate in Champions M-A
SELECT COUNT(DISTINCT (source_tournament_id, source_player_id)) * 100.0
       / (SELECT COUNT(DISTINCT (source_tournament_id, source_player_id))
          FROM external.team_appearances WHERE format_id = 'gen9championsvgc2026regma')
FROM external.team_appearances
WHERE format_id = 'gen9championsvgc2026regma' AND species = 'charizard';

-- Top items on Charizard
SELECT held_item, COUNT(*) as count
FROM external.team_appearances
WHERE format_id = 'gen9championsvgc2026regma' AND species = 'charizard'
GROUP BY held_item ORDER BY count DESC;

-- Moves that contain Protect
SELECT species, COUNT(*)
FROM external.team_appearances
WHERE format_id = 'gen9championsvgc2026regma' AND 'Protect' = ANY(moves)
GROUP BY species ORDER BY count DESC;

-- Top 8 teams at a tournament
SELECT source_player_id, player_name, placing, species, held_item
FROM external.team_appearances
WHERE source_tournament_id = '69e3bf...' AND placing <= 8
ORDER BY placing, position;
```

#### Volume estimate

~20 events × ~300 avg players × 6 Pokemon = **~36,000 rows** for a full season of `team_appearances`. Trivial. Denormalization cost is negligible.

#### Why not normalized?

We considered a fully normalized design (imports → tournaments → standings → team_sheet_pokemon + pairings + players with FKs everywhere). Rejected because:
- Every analytics query would need 3-4 JOINs
- The data is write-once, read-many — optimizing for writes makes no sense
- Volume is small enough that repeating tournament names costs nothing
- Simpler mental model: one table answers most questions

### Decisions made

- ✅ Denormalized over normalized — query speed matters, write efficiency doesn't
- ✅ One `external` schema for all sources
- ✅ `moves text[]` (PostgreSQL array) for move storage
- ✅ No FK to `public.alts` or any trainers.gg identity (for now)
- ✅ `external.players` kept as thin lookup for future account linking
- ✅ Raw data stored as local files only (no JSONB raw dumps in DB)
- ✅ Drop existing `public.external_players` / `data_imports` / `imported_team_sheets` immediately
- ✅ Keep existing `public.format_meta_stats` / `pokemon_usage_stats` / `pokemon_detail_stats` (web app reads these)
- ✅ Canonical format IDs = Showdown format strings (e.g., `gen9championsvgc2026regma`)

### Still open / TBD

- Showdown replays — different data model, deferred to Phase 2
- Whether Limitless and RK9 should share tables or be separate (leaning unified since denormalized shape is identical)
- Indexes — which columns need them for our query patterns
- RLS policy details
- How the `players` table relates to the denormalized tables (populated in parallel? or derived from team_appearances?)
- Migration strategy (new migration that creates `external` schema + drops old tables)

## Runtime & Data Flow

### Where things run

| Task | Runtime | Trigger |
|------|---------|---------|
| Limitless webhook receiver | Supabase Edge Function | Automatic (webhook POST) |
| Limitless backfill | Local script (first pass) | Manual |
| RK9 scraper | Local script (first pass) | Manual |
| Analytics aggregation | TBD | After imports |

**First pass: everything runs locally.** We can graduate to GitHub Actions, Fly.io, or scheduled jobs later once the pipeline is proven.

### Data storage & flow

```
1. PULL        Scripts fetch data from Limitless API / scrape RK9 pages
                    ↓
2. STORE       Raw data written to organized local files (JSON)
                    ↓
3. IMPORT      Load files into local Supabase dev instance for testing
                    ↓
4. PUSH        Upload/push validated data to production DB
```

**Key requirements:**
- Pulled data stored as an organized set of files and directories (not just ephemeral)
- Structure should be deterministic and inspectable (e.g., `data/limitless/{tournamentId}/standings.json`)
- Import tooling to load files into local dev Supabase for testing and iteration
- Separate tooling/process to push validated data to production
- Idempotent — re-running import for the same tournament doesn't create duplicates

**File structure (rough idea — TBD):**
```
data/
  limitless/
    tournaments.json                    # index of all fetched tournaments
    {tournamentId}/
      details.json                      # tournament metadata
      standings.json                    # all players + team sheets
      pairings.json                     # all matches
  rk9/
    events.json                         # index of all scraped events
    {tournamentId}/
      roster.json                       # all players + standings
      team-lists/
        {playerId}.json                 # individual team sheet
      pairings.json                     # all matches by round
```

**Open questions for later:**
- How does production push work? (Direct DB inserts via service_role? Migration-style SQL files? Edge function endpoint?)
- Do we version/checksum the data files to detect changes?
- Git-tracked data files vs. gitignored with external storage (S3, etc.)?
- How to handle incremental updates vs. full re-imports?

## Next Steps

- [ ] Finalize schema design (resolve open questions above)
- [ ] Plan the local file storage structure for raw data
- [ ] Build Limitless API client + local file export
- [ ] Build RK9 scraper + local file export
- [ ] Create migration (new `external` schema + drop old tables)
- [ ] Build import tooling (local files → Supabase)
- [ ] Plan production push process
- [ ] Plan Showdown replay pipeline (Phase 2)

---

## RK9

**Website:** `https://rk9.gg`

### Access Method

RK9 has **no public API**. It's a Firebase-hosted server-rendered app. All data is baked into HTML pages. Accessing data requires either:

1. **HTML scraping** — parse rendered pages (fragile, rate-limited)
2. **Partnership/data sharing agreement** — formal arrangement with RK9 Labs
3. **Community tools** — some third-party tools (Trainer Hill, etc.) get RK9 data somehow

Authentication: Google OAuth (required to view some data).

### URL Patterns

| Page | URL Pattern | Description |
|------|-------------|-------------|
| Events list | `/events/pokemon` | Upcoming + past official Play! Pokemon events |
| Tournament details | `/tournament/{id}` | Registration info, dates, venue |
| Live Roster | `/roster/{id}` | All registered players with standings |
| Pairings | `/pairings/{id}` | Round-by-round match pairings (by division) |
| Team List | `/teamlist/public/{tournamentId}/{playerId}` | Individual player's team sheet |

Tournament IDs look like: `PR02wayEt6qQBnpFi6cp` (alphanumeric, ~20 chars)

### Data Available from Roster

| Field | Example |
|-------|---------|
| Player ID | `4....3` (masked Play! Pokemon ID) |
| First name | `Aaron` |
| Last name | `O'Doherty` |
| Country | `IE` (ISO alpha-2) |
| Division | `Masters` / `Senior` / `Junior` |
| Trainer name | `Sark` (in-game name) |
| Team List | Link to `/teamlist/public/...` |
| Standing | `62` (final placement) |

### Data Available from Team Lists

Each Pokemon on the team shows:

| Field | Example |
|-------|---------|
| Species | `Rillaboom`, `Calyrex [Ice Rider]`, `Landorus [Incarnate Forme]` |
| Tera Type | `Water`, `Fairy`, `Steel` |
| Ability | `Grassy Surge`, `As One`, `Sheer Force` |
| Held Item | `Assault Vest`, `Leftovers`, `Life Orb` |
| Moves | 4 moves listed |

**NOT available:** EVs, IVs, Nature, Gender, Level (same as Limitless)

### Data Available from Pairings

- Divisions: Masters, Senior, Junior (separate tabs)
- Rounds: numbered (Prague Masters had 16 rounds)
- Per match: table number, player names, winner
- Supports both Swiss and bracket phases

### Key Differences from Limitless

| Aspect | Limitless | RK9 |
|--------|-----------|-----|
| Access method | REST API (JSON) | HTML scraping |
| Auth required | No (most endpoints) | Google OAuth for some pages |
| Player identity | Stable username (`lecehlou`) | Masked Player ID + real name |
| Names | Usernames / display names | Real first + last names |
| Divisions | Not separated | Masters / Senior / Junior |
| Events | Community tournaments (any size) | Official Play! Pokemon only |
| Event tiers | Community, online | Regionals, Internationals, Worlds, Special |
| Webhook | Yes (`tournament:ended`) | No |
| Team sheet format | JSON array in API response | HTML rendered per Pokemon |
| Species IDs | Slug (`calyrex-shadow-rider`) | Display name with form (`Calyrex [Ice Rider]`) |
| W-L-T record | In standings response | Not visible on roster (only placement) |

### RK9 Event Tiers (from events page)

- Regional Championships (2-3 day events, ~600 players VGC)
- International Championships (3 day events, EUIC/NAIC/LAIC)
- Special Championships (2 day events, e.g. Turin, Seville)
- Worlds (not yet visible for 2026)

### Example Events (2025-2026 season)

| Date | Event | Location | VGC Tournament ID |
|------|-------|----------|-------------------|
| Apr 25-26, 2026 | Prague Regionals | Praha, CZ | `PR02wayEt6qQBnpFi6cp` |
| Apr 3-5, 2026 | Orlando Regionals | Orlando, US | `OR02wF0GhaiorROTkFlu` |
| Mar 28-29, 2026 | Seville Special | Sevilla, ES | `SV02wtoHf5SDBUM0ntB2` |
| Feb 13-15, 2026 | EUIC | London, UK | `EU02mADIyxk2QHCU8dqx` |
| Nov 21-23, 2025 | LAIC | São Paulo, BR | `LA0226md2zDgZtmvexIY` |

---

## Shared Observations

### Team Sheet Data (Both Sources)

Both Limitless and RK9 provide the same core fields for VGC team sheets:
- Species (with form/variant names)
- Held Item
- Ability
- 4 Moves
- Tera Type (SVI+ formats only; null for Champions M-A format)

Neither source provides: EVs, IVs, Nature, Gender, Level.

### Player Identity Challenge

The two sources use completely different player identity systems:
- **Limitless:** stable username (e.g., `lecehlou`) — consistent across tournaments
- **RK9:** masked Play! Pokemon Player ID + real name + in-game trainer name

Linking a player across both sources (same person plays Limitless weeklies AND attends Regionals on RK9) requires either:
- Manual player linking (user claims both identities)
- Heuristic matching (trainer name + country overlap)
- External mapping (community-maintained player databases)

---

## Import Strategies

### Limitless (API-driven)

1. **Webhook** — edge function receives `tournament:ended` POST, fetches full tournament data via API, normalizes, inserts
2. **Backfill** — script paginates through `/tournaments?game=VGC`, fetches details/standings/pairings for each, inserts historically

### RK9 (Scraper-driven)

Requires a Playwright/Puppeteer-based headless scraper that:

1. **Authenticates** — Google OAuth login, persist session cookies
2. **Discovers events** — navigates `/events/pokemon`, extracts VGC tournament IDs from past events
3. **Scrapes roster** — for each tournament, hits `/roster/{id}`, paginates through all 600+ players, extracts:
   - Player name, country, division, trainer name, placement
   - Team list URL (the `/teamlist/public/{tournamentId}/{playerId}` path)
4. **Scrapes team lists** — for each player, navigates to their team list page, extracts:
   - 6 Pokemon with species, tera, ability, item, moves
5. **Scrapes pairings** — navigates `/pairings/{id}`, iterates through rounds/divisions, extracts match results

#### RK9 Scraper Considerations

- **Rate limiting** — must throttle requests; ~600 players per regional = 600 team list pages per event
- **Session persistence** — Google OAuth cookies need to be stored and refreshed
- **Fragility** — no API contract; HTML structure changes = broken scraper
- **Scale** — ~20 past events this season × 600 players × individual team list pages = ~12,000 page loads for backfill
- **When to run** — manually triggered after events end (no webhook available)
- **Where to run** — likely a standalone Node.js script (not an edge function; too long-running)
- **Error recovery** — must be idempotent; can resume from where it left off if interrupted
- **Storage** — consider storing raw HTML alongside parsed data for debugging/re-parsing

### Showdown Replays (API-driven)

Fetched via simple JSON API — no auth, no scraping needed.

1. **Search** — paginate through replays by format, accumulate replay IDs
2. **Fetch** — download individual replay JSON (includes full battle log)
3. **Parse** — extract team info, moves used, items/abilities revealed, game outcome from battle log
4. **Aggregate** — build usage stats, matchup data, move frequency across many replays

---

## Pokemon Showdown

**Replay URL:** `https://replay.pokemonshowdown.com`

### API Endpoints (no auth required)

| Endpoint | Description |
|----------|-------------|
| `GET /search.json?format={formatId}&before={timestamp}` | Paginated replay search (51 per page) |
| `GET /search.json?user={username}` | Search by player |
| `GET /search.json?user={u1}&user2={u2}` | Search by matchup |
| `GET /{replayId}.json` | Full replay data with battle log |
| `GET /{replayId}.log` | Plain-text battle log only |

**Key API details:**
- No authentication, full CORS (`Access-Control-Allow-Origin: *`)
- Pagination uses `before` (unix timestamp of last result), NOT page numbers
- 51 results per page — presence of 51st result signals more pages exist
- No formal rate limits documented; 30.5M replays scraped for HuggingFace dataset proves scale works
- Respectful usage: 1+ second delay between requests (community norm)
- Replay IDs follow pattern: `{format}-{number}` (e.g., `gen9championsvgc2026regma-2606669675`)
- Side server replays: `{server}-{format}-{number}` (e.g., `smogtours-gen9vgc2025regi-898306`)
- No streaming/firehose — must poll `search.json` to discover new replays

**Existing ecosystem:**
- `@pkmn/client`, `@pkmn/protocol`, `@pkmn/data` — TypeScript libraries for parsing battle logs
- `@pkmn/logs` — framework for processing terabytes of battle logs
- HuggingFace dataset `HolidayOugi/pokemon-showdown-replays` — 30.5M replays already scraped

### Search Response Shape

```json
{
  "uploadtime": 1778452795,
  "id": "gen9vgc2024regg-2606631114",
  "format": "[Gen 9] VGC 2024 Reg G",
  "players": ["RobloxToes", "Myth1cal30"],
  "rating": null,
  "private": 0,
  "password": null
}
```

### Replay Response Shape

```json
{
  "id": "gen9vgc2024regg-2606631114",
  "format": "[Gen 9] VGC 2024 Reg G",
  "formatid": "gen9vgc2024regg",
  "players": ["RobloxToes", "Myth1cal30"],
  "log": "...(full battle log text)...",
  "uploadtime": 1778452795,
  "views": 11,
  "rating": null
}
```

### Battle Log Data (parsed from `log` field)

The log is a pipe-delimited text format. From a single replay we can extract:

| Data | How | Complete? |
|------|-----|-----------|
| All 6 Pokemon (species, level, gender) | `\|poke\|p1\|Rayquaza, L50\|` | Yes — full team from team preview |
| Tera types | `\|raw\|...Tera Types:...` | Yes (if format has Tera Type Preview) |
| Moves used | `\|move\|p1a: snek\|Dragon Ascent\|...` | Partial — only moves selected during game |
| Items | `\|-enditem\|...\|Booster Energy\|` | Partial — only when triggered/consumed |
| Abilities | `\|-ability\|p1a: snek\|Air Lock\|` | Partial — only when triggered |
| Damage amounts | `\|-damage\|...\|77/100\|` | Yes — can reverse-engineer EVs |
| Winner | `\|win\|Myth1cal30\|` | Yes |
| Terastallization | `\|-terastallize\|p1a: snek\|Bug\|` | Yes — which mon actually terastallized |

### VGC Format IDs on Showdown

| Format ID | Display Name | Status |
|-----------|--------------|--------|
| `gen9championsvgc2026regma` | [Gen 9 Champions] VGC 2026 Reg M-A | Active on ladder |
| `gen9vgc2024regg` | [Gen 9] VGC 2024 Reg G | Active on ladder |
| `gen9vgc2025regi` | [Gen 9] VGC 2025 Reg I | Recent replays (SVI format) |

Note: Champions M-A format has **Mega Evolutions** and **no Tera types**.

### Key Differences from Limitless/RK9

| Aspect | Limitless/RK9 | Showdown |
|--------|--------------|----------|
| Data type | Tournament results + full team sheets | Individual battle replays |
| Context | Organized events with placements | Ladder games / friendlies |
| Team info | Complete (all 4 moves, item, ability) | Partial per replay (only what's revealed) |
| Volume | Dozens of events, hundreds of players | Thousands of replays per format |
| Game detail | Only final result (W/L) | Turn-by-turn actions |
| Player identity | Limitless username / RK9 real name | Showdown username |
| EVs/Nature | Not available | Can be reverse-engineered from damage |

### Use Cases (different from tournament data)

Showdown replay data serves different purposes than tournament imports:

1. **Usage statistics** — what Pokemon/moves/items/abilities are popular on ladder
2. **Matchup analysis** — win rates between specific team compositions
3. **Move usage patterns** — which moves are actually selected (vs. just being on the team)
4. **Meta evolution tracking** — how the ladder meta shifts day-by-day
5. **Team reconstruction** — piecing together full sets across multiple replays of the same player
6. **Bring rate analysis** — which 4 of 6 Pokemon are brought to games

### Considerations

- **Volume** — potentially millions of replays; need to be selective about what we store
- **Incompleteness** — a single replay doesn't reveal full team info; need aggregation
- **No tournament context** — ladder games have no placement/standing
- **EV reverse-engineering** — possible but complex (requires damage calc library)
- **Priority** — lower priority than Limitless/RK9 for MVP; higher value for analytics features later
- **Smogon tournaments** — replays from `smogtours-` prefix are from organized Smogon tournaments (more structured than random ladder)
