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

| Limitless | Showdown (canonical)        | Display            |
| --------- | --------------------------- | ------------------ |
| `M-A`     | `gen9championsvgc2026regma` | Champions: Reg M-A |
| `SVI`     | `gen9vgc2025regi`           | VGC 2025 Reg I     |
| `SVH`     | `gen9vgc2024regh`           | VGC 2024 Reg H     |
| `SVG`     | `gen9vgc2024regg`           | VGC 2024 Reg G     |
| `SVF`     | `gen9vgc2024regf`           | VGC 2024 Reg F     |
| `SVE`     | `gen9vgc2023rege`           | VGC 2023 Reg E     |
| `VGC23`   | `gen9vgc2023regd`           | VGC 2023 Reg D     |
| `23S3`    | `gen9vgc2023regc`           | VGC 2023 Reg C     |
| `23S2`    | `gen9vgc2023regb`           | VGC 2023 Reg B     |
| `23S1`    | `gen9vgc2023rega`           | VGC 2023 Reg A     |
| `VGC22`   | `gen8vgc2022series12`       | VGC 2022 Series 12 |

> Note: some of these Showdown format IDs need verification — the pattern may vary for older formats.

## Limitless API

**Base URL:** `https://play.limitlesstcg.com/api`

### Endpoints

| Endpoint                          | Auth Required | Description                                        |
| --------------------------------- | ------------- | -------------------------------------------------- |
| `GET /tournaments`                | No            | Paginated list (filter by game, format, organizer) |
| `GET /tournaments/{id}/details`   | No            | Full event metadata (organizer, phases, platform)  |
| `GET /tournaments/{id}/standings` | No            | All players — placing, record, team sheet, country |
| `GET /tournaments/{id}/pairings`  | No            | Every match — round, phase, table, players, winner |
| `GET /games`                      | No            | Supported games, formats, platforms                |
| `GET /games/{id}/decks`           | Yes           | Deck categorization rules                          |

### Webhook

- Event: `tournament:ended`
- Payload: `{ "secret": "...", "event": { "name": "tournament:ended", "tournamentId": "...", "game": "VGC" } }`
- Needs: Edge function URL registered via Limitless dashboard

### VGC Format IDs

| ID      | Name                                   |
| ------- | -------------------------------------- |
| `M-A`   | Regulation Set M-A (Pokemon Champions) |
| `SVI`   | Scarlet & Violet - Regulation I        |
| `SVH`   | Scarlet & Violet - Regulation H        |
| `SVG`   | Scarlet & Violet - Regulation G        |
| `SVF`   | Scarlet & Violet - Regulation F        |
| `SVE`   | Scarlet & Violet - Regulation E        |
| `VGC23` | Scarlet & Violet - Regulation D        |
| `23S3`  | Scarlet & Violet - Regulation C        |
| `23S2`  | Scarlet & Violet - Regulation B        |
| `23S1`  | Scarlet & Violet - Regulation A        |
| `VGC22` | VGC 2022 (Series 12)                   |

### Platforms

| ID       | Name            |
| -------- | --------------- |
| `SWITCH` | Nintendo Switch |
| `SIM`    | Simulator       |

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

| Field     | Available | Notes                     |
| --------- | --------- | ------------------------- |
| Species   | Yes       | `id` (slug) and `name`    |
| Item      | Yes       |                           |
| Ability   | Yes       |                           |
| Moves     | Yes       | Array of 4                |
| Tera type | Yes       | `null` for non-SV formats |
| EVs / IVs | No        | Not provided by Limitless |
| Nature    | No        | Not provided by Limitless |
| Gender    | No        |                           |
| Level     | No        |                           |

## Existing Schema (to be dropped)

Tables in `public` from the earlier attempt — will be dropped when we create the `limitless` schema:

**Drop:**

- `public.external_players`
- `public.data_imports`
- `public.imported_team_sheets`

**Keep (web app reads these):**

- `public.format_meta_stats`
- `public.pokemon_usage_stats`
- `public.pokemon_detail_stats`

## Database Schema Design

> **Status:** Finalized for Limitless. RK9 and Showdown deferred — they'll get their own schemas later.

### Decisions

- Schema: **`limitless`** (each source gets its own schema later)
- Format IDs: **Showdown strings** (`gen9championsvgc2026regma`) — map from Limitless codes at import time
- All PKs are `int` (except `tournaments` which uses Limitless's native ID string). Migrate to `bigint` later if ever needed.
- No FK to `public.alts` or any trainers.gg entity (for now — future account linking will add this)
- `moves text[]` for move storage
- Phases as a proper table with composite PK — match_results composite FK to it
- Each match_results row = one set (BO3 or BO1), not individual games. Limitless doesn't provide game-by-game scores.

### Tables (6 total)

#### `limitless.tournaments`

```
tournament_id       text PK            ← Limitless's own ID ('69e3bf...')
name                text
format_id           text               ← Showdown format string
date                date
player_count        int
platform            text               ← 'SWITCH' / 'SIM'
is_online           boolean
decklists           boolean
organizer_name      text
imported_at         timestamptz
```

#### `limitless.phases`

```
tournament_id       text FK → tournaments  ┐
phase_number        int                    ┘ composite PK
type                text               ← SWISS / SINGLE_BRACKET / DOUBLE_BRACKET
rounds              int                ← how many rounds in this phase
mode                text               ← BO1 / BO3
```

#### `limitless.players`

```
id                  int PK
username            text UNIQUE        ← stable Limitless ID
display_name        text               ← can change between tournaments
country             text               ← ISO alpha-2
created_at          timestamptz
```

#### `limitless.standings`

```
id                  int PK
tournament_id       text FK → tournaments
player_id           int FK → players
placement           int
record_wins         int
record_losses       int
record_ties         int
drop_round          int (nullable)

UNIQUE(tournament_id, player_id)
```

#### `limitless.team_pokemon`

```
id                  int PK
standing_id         int FK → standings
position            int (1-6)
species             text
ability             text
held_item           text
tera_type           text (nullable)    ← null for Champions M-A
moves               text[]

UNIQUE(standing_id, position)
```

#### `limitless.match_results`

```
id                  int PK
tournament_id       text  ┐
phase               int   ┘ composite FK → phases(tournament_id, phase_number)
round               int
table_number        int (nullable)     ← Swiss matches
match_label         text (nullable)    ← Bracket matches ('T2-1')
player1_id          int FK → players
player2_id          int FK → players (nullable — bye)
winner_id           int FK → players (nullable — tie/bye/unfinished)
imported_at         timestamptz
```

### Relationships

```
tournaments ──1:*──► phases
tournaments ──1:*──► standings ──1:6──► team_pokemon
tournaments ──1:*──► match_results
players ◄──FK── standings (player_id)
players ◄──FK── match_results (player1_id, player2_id, winner_id)
phases ◄──composite FK── match_results (tournament_id, phase)
```

### Data mapping from Limitless API

| API field                           | Table         | Column                                              |
| ----------------------------------- | ------------- | --------------------------------------------------- |
| Tournament `.id`                    | tournaments   | `tournament_id`                                     |
| Tournament `.format` (`"M-A"`)      | tournaments   | `format_id` (mapped to `gen9championsvgc2026regma`) |
| Tournament `.phases[].phase`        | phases        | `phase_number`                                      |
| Tournament `.phases[].type`         | phases        | `type`                                              |
| Tournament `.phases[].rounds`       | phases        | `rounds`                                            |
| Tournament `.phases[].mode`         | phases        | `mode`                                              |
| Standing `.player`                  | players       | `username`                                          |
| Standing `.name`                    | players       | `display_name`                                      |
| Standing `.country`                 | players       | `country`                                           |
| Standing `.placing`                 | standings     | `placing`                                           |
| Standing `.record.wins/losses/ties` | standings     | `record_wins/losses/ties`                           |
| Standing `.drop`                    | standings     | `drop_round`                                        |
| Standing `.decklist[].id`           | team_pokemon  | `species`                                           |
| Standing `.decklist[].ability`      | team_pokemon  | `ability`                                           |
| Standing `.decklist[].item`         | team_pokemon  | `held_item`                                         |
| Standing `.decklist[].tera`         | team_pokemon  | `tera_type`                                         |
| Standing `.decklist[].attacks`      | team_pokemon  | `moves`                                             |
| Pairing `.phase`                    | match_results | `phase`                                             |
| Pairing `.round`                    | match_results | `round`                                             |
| Pairing `.table`                    | match_results | `table_number`                                      |
| Pairing `.match`                    | match_results | `match_label`                                       |
| Pairing `.player1`                  | match_results | `player1_id` (lookup from players)                  |
| Pairing `.player2`                  | match_results | `player2_id` (lookup from players)                  |
| Pairing `.winner`                   | match_results | `winner_id` (lookup from players)                   |

### Example queries

```sql
-- Charizard usage in Champions M-A
SELECT tp.species, COUNT(*)
FROM limitless.team_pokemon tp
JOIN limitless.standings s ON s.id = tp.standing_id
JOIN limitless.tournaments t ON t.tournament_id = s.tournament_id
WHERE t.format_id = 'gen9championsvgc2026regma' AND tp.species = 'charizard';

-- Top items on Charizard
SELECT tp.held_item, COUNT(*)
FROM limitless.team_pokemon tp
JOIN limitless.standings s ON s.id = tp.standing_id
JOIN limitless.tournaments t ON t.tournament_id = s.tournament_id
WHERE t.format_id = 'gen9championsvgc2026regma' AND tp.species = 'charizard'
GROUP BY tp.held_item ORDER BY count DESC;

-- Usage over time
SELECT tp.species, t.date, COUNT(*)
FROM limitless.team_pokemon tp
JOIN limitless.standings s ON s.id = tp.standing_id
JOIN limitless.tournaments t ON t.tournament_id = s.tournament_id
WHERE t.format_id = 'gen9championsvgc2026regma'
GROUP BY tp.species, t.date ORDER BY t.date;

-- Player tournament history
SELECT t.name, t.date, s.placing, s.record_wins, s.record_losses
FROM limitless.standings s
JOIN limitless.tournaments t ON t.tournament_id = s.tournament_id
JOIN limitless.players p ON p.id = s.player_id
WHERE p.username = 'lecehlou'
ORDER BY t.date DESC;

-- Pokemon with Protect
SELECT tp.species, COUNT(*)
FROM limitless.team_pokemon tp
WHERE 'Protect' = ANY(tp.moves)
GROUP BY tp.species ORDER BY count DESC;

-- Win rate (with phase mode context)
SELECT mr.winner_id = p.id as won, ph.mode, COUNT(*)
FROM limitless.match_results mr
JOIN limitless.phases ph ON ph.tournament_id = mr.tournament_id
  AND ph.phase_number = mr.phase
JOIN limitless.players p ON p.id IN (mr.player1_id, mr.player2_id)
WHERE p.username = 'lecehlou'
GROUP BY won, ph.mode;
```

### Volume estimate

Per season (~20 Limitless events, ~300 avg players):

- `tournaments`: ~20 rows
- `phases`: ~40-60 rows
- `players`: ~1,000-2,000 rows (shared across tournaments)
- `standings`: ~6,000 rows
- `team_pokemon`: ~36,000 rows
- `match_results`: ~10,000-15,000 rows

### Old tables to drop

Drop in the migration that creates the `limitless` schema:

- `public.external_players`
- `public.data_imports`
- `public.imported_team_sheets`

Keep (web app reads these):

- `public.format_meta_stats`
- `public.pokemon_usage_stats`
- `public.pokemon_detail_stats`

## Runtime & Data Flow

### Where things run

| Task                       | Runtime                   | Trigger                  |
| -------------------------- | ------------------------- | ------------------------ |
| Limitless webhook receiver | Supabase Edge Function    | Automatic (webhook POST) |
| Limitless backfill         | Local script (first pass) | Manual                   |
| RK9 scraper                | Local script (first pass) | Manual                   |
| Analytics aggregation      | TBD                       | After imports            |

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

- [ ] Create migration (`limitless` schema + 6 tables + drop old `public` tables)
- [ ] Build format ID mapping (Limitless codes → Showdown strings)
- [ ] Build Limitless API client (TypeScript)
- [ ] Build local file export (pull tournaments → write to `data/limitless/`)
- [ ] Build import tooling (local JSON files → Supabase `limitless` schema)
- [ ] Validate with real SVI data
- [ ] Plan production push process

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

| Page               | URL Pattern                                  | Description                                   |
| ------------------ | -------------------------------------------- | --------------------------------------------- |
| Events list        | `/events/pokemon`                            | Upcoming + past official Play! Pokemon events |
| Tournament details | `/tournament/{id}`                           | Registration info, dates, venue               |
| Live Roster        | `/roster/{id}`                               | All registered players with standings         |
| Pairings           | `/pairings/{id}`                             | Round-by-round match pairings (by division)   |
| Team List          | `/teamlist/public/{tournamentId}/{playerId}` | Individual player's team sheet                |

Tournament IDs look like: `PR02wayEt6qQBnpFi6cp` (alphanumeric, ~20 chars)

### Data Available from Roster

| Field        | Example                            |
| ------------ | ---------------------------------- |
| Player ID    | `4....3` (masked Play! Pokemon ID) |
| First name   | `Aaron`                            |
| Last name    | `O'Doherty`                        |
| Country      | `IE` (ISO alpha-2)                 |
| Division     | `Masters` / `Senior` / `Junior`    |
| Trainer name | `Sark` (in-game name)              |
| Team List    | Link to `/teamlist/public/...`     |
| Standing     | `62` (final placement)             |

### Data Available from Team Lists

Each Pokemon on the team shows:

| Field     | Example                                                          |
| --------- | ---------------------------------------------------------------- |
| Species   | `Rillaboom`, `Calyrex [Ice Rider]`, `Landorus [Incarnate Forme]` |
| Tera Type | `Water`, `Fairy`, `Steel`                                        |
| Ability   | `Grassy Surge`, `As One`, `Sheer Force`                          |
| Held Item | `Assault Vest`, `Leftovers`, `Life Orb`                          |
| Moves     | 4 moves listed                                                   |

**NOT available:** EVs, IVs, Nature, Gender, Level (same as Limitless)

### Data Available from Pairings

- Divisions: Masters, Senior, Junior (separate tabs)
- Rounds: numbered (Prague Masters had 16 rounds)
- Per match: table number, player names, winner
- Supports both Swiss and bracket phases

### Key Differences from Limitless

| Aspect            | Limitless                        | RK9                                            |
| ----------------- | -------------------------------- | ---------------------------------------------- |
| Access method     | REST API (JSON)                  | HTML scraping                                  |
| Auth required     | No (most endpoints)              | Google OAuth for some pages                    |
| Player identity   | Stable username (`lecehlou`)     | Masked Player ID + real name                   |
| Names             | Usernames / display names        | Real first + last names                        |
| Divisions         | Not separated                    | Masters / Senior / Junior                      |
| Events            | Community tournaments (any size) | Official Play! Pokemon only                    |
| Event tiers       | Community, online                | Regionals, Internationals, Worlds, Special     |
| Webhook           | Yes (`tournament:ended`)         | No                                             |
| Team sheet format | JSON array in API response       | HTML rendered per Pokemon                      |
| Species IDs       | Slug (`calyrex-shadow-rider`)    | Display name with form (`Calyrex [Ice Rider]`) |
| W-L-T record      | In standings response            | Not visible on roster (only placement)         |

### RK9 Event Tiers (from events page)

- Regional Championships (2-3 day events, ~600 players VGC)
- International Championships (3 day events, EUIC/NAIC/LAIC)
- Special Championships (2 day events, e.g. Turin, Seville)
- Worlds (not yet visible for 2026)

### Example Events (2025-2026 season)

| Date            | Event             | Location      | VGC Tournament ID      |
| --------------- | ----------------- | ------------- | ---------------------- |
| Apr 25-26, 2026 | Prague Regionals  | Praha, CZ     | `PR02wayEt6qQBnpFi6cp` |
| Apr 3-5, 2026   | Orlando Regionals | Orlando, US   | `OR02wF0GhaiorROTkFlu` |
| Mar 28-29, 2026 | Seville Special   | Sevilla, ES   | `SV02wtoHf5SDBUM0ntB2` |
| Feb 13-15, 2026 | EUIC              | London, UK    | `EU02mADIyxk2QHCU8dqx` |
| Nov 21-23, 2025 | LAIC              | São Paulo, BR | `LA0226md2zDgZtmvexIY` |

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

| Endpoint                                                | Description                           |
| ------------------------------------------------------- | ------------------------------------- |
| `GET /search.json?format={formatId}&before={timestamp}` | Paginated replay search (51 per page) |
| `GET /search.json?user={username}`                      | Search by player                      |
| `GET /search.json?user={u1}&user2={u2}`                 | Search by matchup                     |
| `GET /{replayId}.json`                                  | Full replay data with battle log      |
| `GET /{replayId}.log`                                   | Plain-text battle log only            |

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

| Data                                   | How                                     | Complete?                                 |
| -------------------------------------- | --------------------------------------- | ----------------------------------------- |
| All 6 Pokemon (species, level, gender) | `\|poke\|p1\|Rayquaza, L50\|`           | Yes — full team from team preview         |
| Tera types                             | `\|raw\|...Tera Types:...`              | Yes (if format has Tera Type Preview)     |
| Moves used                             | `\|move\|p1a: snek\|Dragon Ascent\|...` | Partial — only moves selected during game |
| Items                                  | `\|-enditem\|...\|Booster Energy\|`     | Partial — only when triggered/consumed    |
| Abilities                              | `\|-ability\|p1a: snek\|Air Lock\|`     | Partial — only when triggered             |
| Damage amounts                         | `\|-damage\|...\|77/100\|`              | Yes — can reverse-engineer EVs            |
| Winner                                 | `\|win\|Myth1cal30\|`                   | Yes                                       |
| Terastallization                       | `\|-terastallize\|p1a: snek\|Bug\|`     | Yes — which mon actually terastallized    |

### VGC Format IDs on Showdown

| Format ID                   | Display Name                       | Status                      |
| --------------------------- | ---------------------------------- | --------------------------- |
| `gen9championsvgc2026regma` | [Gen 9 Champions] VGC 2026 Reg M-A | Active on ladder            |
| `gen9vgc2024regg`           | [Gen 9] VGC 2024 Reg G             | Active on ladder            |
| `gen9vgc2025regi`           | [Gen 9] VGC 2025 Reg I             | Recent replays (SVI format) |

Note: Champions M-A format has **Mega Evolutions** and **no Tera types**.

### Key Differences from Limitless/RK9

| Aspect          | Limitless/RK9                         | Showdown                                  |
| --------------- | ------------------------------------- | ----------------------------------------- |
| Data type       | Tournament results + full team sheets | Individual battle replays                 |
| Context         | Organized events with placements      | Ladder games / friendlies                 |
| Team info       | Complete (all 4 moves, item, ability) | Partial per replay (only what's revealed) |
| Volume          | Dozens of events, hundreds of players | Thousands of replays per format           |
| Game detail     | Only final result (W/L)               | Turn-by-turn actions                      |
| Player identity | Limitless username / RK9 real name    | Showdown username                         |
| EVs/Nature      | Not available                         | Can be reverse-engineered from damage     |

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
