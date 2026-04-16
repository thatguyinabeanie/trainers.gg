# Session 1: Foundations

> **Rename session to:** `the-builder-s1-foundations`
> **Branch:** `the-builder` (already exists, build on top of existing commits)
> **Model:** Opus 1M (architectural decisions, schema design)
> **Estimated scope:** Database migrations, package functions, team CRUD, tests

## How To Start This Session

1. Open a new Claude Code conversation
2. Rename it to `the-builder-s1-foundations`
3. Send this as your first message:

```
Read docs/the-builder/session-1-foundations.md and docs/the-builder/context.md.
Execute the session using subagent-driven development.
Branch: the-builder (already exists, continue from latest commits).
Do not push. Commit frequently with descriptive messages.
```

## Prerequisites

- Read `docs/the-builder/context.md` for the full design context
- You are on branch `the-builder`. Do NOT create a new branch.
- Latest migration timestamp: `20260408011707`

## What This Session Builds

Everything that subsequent sessions depend on. No UI work — just the data layer and package utilities.

### 1. Database Migration

Create a single migration file with timestamp after `20260408011707`.

**Modify existing tables:**

```sql
-- Add notes to pokemon table
ALTER TABLE pokemon ADD COLUMN IF NOT EXISTS notes text;

-- Add parent_team_id and format to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS parent_team_id bigint REFERENCES teams(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS format text;
```

**Create new tables for meta pipeline (schema only — will be populated later):**

```sql
-- External players from Limitless, RK9, Showdown
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

-- Raw tournament data imports
CREATE TABLE IF NOT EXISTS data_imports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  source text NOT NULL CHECK (source IN ('native', 'limitless', 'rk9', 'showdown')),
  external_ref text,
  format text NOT NULL,
  event_tier text CHECK (event_tier IN ('worlds', 'international', 'regional', 'special_event', 'midseason_showdown', 'community', 'online')),
  imported_at timestamptz DEFAULT now()
);

-- Normalized team sheets from all sources
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

CREATE INDEX IF NOT EXISTS idx_imported_team_sheets_format_species ON imported_team_sheets(format, species);
CREATE INDEX IF NOT EXISTS idx_imported_team_sheets_import_id ON imported_team_sheets(import_id);

-- Aggregated meta snapshots
CREATE TABLE IF NOT EXISTS format_meta_stats (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  format text NOT NULL,
  computed_at timestamptz DEFAULT now(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_teams int NOT NULL,
  total_tournaments int NOT NULL
);

-- Per-species usage stats per snapshot
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

CREATE INDEX IF NOT EXISTS idx_pokemon_usage_stats_meta ON pokemon_usage_stats(meta_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_usage_stats_species ON pokemon_usage_stats(species);

-- Per-species detail breakdowns
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

CREATE INDEX IF NOT EXISTS idx_pokemon_detail_stats_meta_species ON pokemon_detail_stats(meta_id, species);
```

**RLS policies:**

```sql
-- external_players: readable by all, writable by service role
ALTER TABLE external_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external_players_read" ON external_players FOR SELECT USING (true);

-- data_imports: readable by all, writable by service role
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_imports_read" ON data_imports FOR SELECT USING (true);

-- imported_team_sheets: readable by all, writable by service role
ALTER TABLE imported_team_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imported_team_sheets_read" ON imported_team_sheets FOR SELECT USING (true);

-- format_meta_stats + pokemon_usage_stats + pokemon_detail_stats: readable by all
ALTER TABLE format_meta_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "format_meta_stats_read" ON format_meta_stats FOR SELECT USING (true);

ALTER TABLE pokemon_usage_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pokemon_usage_stats_read" ON pokemon_usage_stats FOR SELECT USING (true);

ALTER TABLE pokemon_detail_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pokemon_detail_stats_read" ON pokemon_detail_stats FOR SELECT USING (true);
```

**After creating the migration:** Run `pnpm generate-types` to regenerate TypeScript types from the updated schema.

Use the `create-migration` skill for naming conventions and idempotency rules.

### 2. Package Functions

**`packages/pokemon/src/nature-bumps.ts`**

```typescript
/**
 * For a given base stat, IV, level, and nature multiplier,
 * returns an array of EV values (0-252) where the +nature
 * boost causes the stat to round up to an extra point.
 *
 * Only meaningful when natureMultiplier is 1.1 (positive nature).
 */
export function calculateNatureBumps(
  baseStat: number,
  iv: number,
  level: number,
  natureMultiplier: number
): number[];
```

Use the existing `calculateStat()` function from `stats-calculator.ts` to iterate EV values 0-252 and compare the stat with nature 1.0 vs 1.1, collecting EV values where they diverge.

**`packages/pokemon/src/speed-tiers.ts`**

```typescript
export interface SpeedBenchmark {
  species: string;
  baseSpeed: number;
  minSpeed: number; // 0 EVs, 0 IVs, -nature (level 50)
  maxSpeed: number; // 252 EVs, 31 IVs, +nature (level 50)
  commonSpeeds: {
    // key benchmarks
    neutral252: number; // 252 EVs, 31 IVs, neutral nature
    positive252: number; // 252 EVs, 31 IVs, +speed nature
    scarf: number; // max speed * 1.5
    tailwind: number; // max speed * 2
  };
}

/**
 * Get speed benchmarks for all format-legal species.
 * Uses @pkmn/dex base stats + calculateStat().
 */
export function getFormatSpeedBenchmarks(formatId: string): SpeedBenchmark[];

/**
 * Compare a specific Pokemon's speed against format benchmarks.
 * Returns sorted lists of what it outspeeds and what outspeeds it.
 */
export function compareSpeedTier(
  species: string,
  calculatedSpeed: number,
  formatId: string
): { outspeeds: SpeedBenchmark[]; outspedBy: SpeedBenchmark[] };
```

**`packages/pokemon/src/species-search.ts`**

```typescript
export interface SpeciesSearchEntry {
  species: string;
  types: string[];
  abilities: string[];
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  bst: number;
}

/**
 * Build a searchable index of all format-legal species.
 * Searches across species name, ability names, learnable move names, and type names.
 */
export function buildSpeciesSearchIndex(formatId: string): SpeciesSearchEntry[];

/**
 * Search the index. Query matches against species name, abilities, types.
 * Move search requires a separate lookup via getLearnableMoves().
 */
export function searchSpecies(
  index: SpeciesSearchEntry[],
  query: string,
  options?: {
    types?: string[];
    abilities?: string[];
    moves?: string[]; // filter: species must learn these moves
    minBaseStat?: Partial<Record<string, number>>;
    maxBaseStat?: Partial<Record<string, number>>;
  }
): SpeciesSearchEntry[];
```

**Update `packages/pokemon/src/index.ts`** — add exports for all new functions.

### 3. Install @smogon/calc

```bash
pnpm add @smogon/calc --filter @trainers/web
```

Verify it imports correctly. No wrapper needed yet — Session 3 builds the calc tab UI.

### 4. Alt-Scoped Team CRUD

**`packages/supabase/src/queries/teams.ts`** (new file or expand existing):

```typescript
/** Get all teams for an alt, ordered by updated_at desc */
export async function getTeamsForAlt(
  supabase: TypedClient,
  altId: number
): Promise<TeamWithPokemon[]>;

/** Get a single team with all its Pokemon (via team_pokemon join) */
export async function getTeamWithPokemon(
  supabase: TypedClient,
  teamId: number
): Promise<TeamWithPokemon | null>;

/** Get teams for an alt filtered by format */
export async function getTeamsForAltByFormat(
  supabase: TypedClient,
  altId: number,
  format: string
): Promise<TeamWithPokemon[]>;
```

**`packages/supabase/src/mutations/teams.ts`** (new file — standalone, NOT in tournaments/):

```typescript
/** Create a new empty team for an alt */
export async function createTeam(
  supabase: TypedClient,
  altId: number,
  name: string,
  format: string
): Promise<{ id: number }>;

/** Update team metadata (name, notes, format, is_public) */
export async function updateTeam(
  supabase: TypedClient,
  teamId: number,
  data: Partial<TeamUpdate>
): Promise<void>;

/** Delete a team and its pokemon */
export async function deleteTeam(
  supabase: TypedClient,
  teamId: number
): Promise<void>;

/** Fork a team (full copy, set parent_team_id, optionally to different alt) */
export async function forkTeam(
  supabase: TypedClient,
  sourceTeamId: number,
  targetAltId: number,
  newName?: string
): Promise<{ id: number }>;

/** Add a Pokemon to a team at a specific position */
export async function addPokemonToTeam(
  supabase: TypedClient,
  teamId: number,
  pokemon: PokemonInsert,
  position: number
): Promise<{ pokemonId: number }>;

/** Update a Pokemon's data (moves, EVs, ability, item, etc.) */
export async function updatePokemon(
  supabase: TypedClient,
  pokemonId: number,
  data: Partial<PokemonUpdate>
): Promise<void>;

/** Remove a Pokemon from a team (delete pokemon + team_pokemon row) */
export async function removePokemonFromTeam(
  supabase: TypedClient,
  teamId: number,
  pokemonId: number
): Promise<void>;

/** Reorder Pokemon positions within a team */
export async function reorderTeamPokemon(
  supabase: TypedClient,
  teamId: number,
  positions: { pokemonId: number; position: number }[]
): Promise<void>;
```

**`apps/web/src/actions/teams.ts`** (Server Actions):

Wrap each mutation in a Server Action with:

- `rejectBots()` call
- `createClient()` for auth
- Cache tag invalidation via `updateTag()`
- Error handling via `getErrorMessage()`
- Return `ActionResult<T>` type

Follow the existing Server Action patterns in `apps/web/src/actions/`.

### 5. Tests

Write tests for:

- `calculateNatureBumps()` — verify known breakpoints for common Pokemon (e.g., Adamant Chien-Pao Atk)
- `getFormatSpeedBenchmarks()` — verify returns correct min/max speeds
- `compareSpeedTier()` — verify sorting and comparison logic
- `buildSpeciesSearchIndex()` / `searchSpecies()` — verify multi-field search
- Team CRUD mutations — use Fishery factories, verify alt ownership, verify fork sets parent_team_id
- Server Actions — verify auth, error handling

Use the `writing-tests` skill for patterns.

### 6. Verification

Before considering this session done:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm db:reset   # verify migration applies cleanly
pnpm generate-types  # verify types regenerate
```

Commit with a descriptive message. Do NOT push.

## What NOT To Build

- No UI components
- No route pages
- No client-side code (except package functions that run in both environments)
- No @smogon/calc wrapper (just install it)

## Files Created/Modified

```
NEW:
  packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_team_builder_schema.sql
  packages/pokemon/src/nature-bumps.ts
  packages/pokemon/src/speed-tiers.ts
  packages/pokemon/src/species-search.ts
  packages/supabase/src/queries/teams.ts
  packages/supabase/src/mutations/teams.ts
  apps/web/src/actions/teams.ts
  packages/pokemon/src/__tests__/nature-bumps.test.ts
  packages/pokemon/src/__tests__/speed-tiers.test.ts
  packages/pokemon/src/__tests__/species-search.test.ts

MODIFIED:
  packages/pokemon/src/index.ts (add exports)
  packages/supabase/src/index.ts (add exports if needed)
  packages/supabase/src/queries/index.ts (add exports)
  packages/supabase/src/mutations/index.ts (add exports)
  apps/web/package.json (add @smogon/calc)
```
