# Team Submission & Format Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow tournament-registered players to submit Pokemon teams via Showdown paste or Pokepaste URL, validate against format rules with `@pkmn/sim`, and gate match check-in on team submission.

**Architecture:** Parse-first approach — client parses paste text with `@pkmn/sets`, validates with `@pkmn/sim` TeamValidator, server re-validates and stores structured data in existing `pokemon`/`teams`/`team_pokemon` tables. Team privacy enforced via RLS policies. Configurable open/closed teamsheets per tournament.

**Tech Stack:** `@pkmn/sets` (parsing), `@pkmn/sim` (validation), `@pkmn/dex` (data), Supabase (storage + RLS), Next.js (web), Expo (mobile), Tamagui (mobile UI), Zod (schema validation)

**Design Doc:** `docs/plans/2026-01-31-team-submission-design.md`

**Linear Issues:** BEA-147, BEA-150, BEA-149

---

## Task 1: Database Migration — Team Submission Columns + RLS

**Files:**

- Create: `packages/supabase/supabase/migrations/20260131000000_add_team_submission.sql`

**Context:** The `tournament_registrations` table already has `team_id` (FK to teams) and there's a `tournament_registration_pokemon` junction table. We need to add `open_team_sheets` to tournaments, `team_submitted_at` and `team_locked` to registrations, and RLS policies for team privacy.

**Important:** The `tournament_registrations` column is `alt_id` (not `profile_id`). Verify column names against `packages/supabase/src/types.ts` before writing queries.

**Step 1: Write the migration file**

```sql
-- Add open_team_sheets to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS open_team_sheets boolean DEFAULT true;

-- Add team submission tracking to tournament_registrations
ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS team_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS team_locked boolean DEFAULT false;

-- RLS: Players can view their own team's pokemon
CREATE POLICY "players_view_own_tournament_team_pokemon"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    WHERE tr.alt_id IN (
      SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
    )
    AND tr.team_id IS NOT NULL
  )
);

-- RLS: Players can view their own team record
CREATE POLICY "players_view_own_tournament_team"
ON teams FOR SELECT USING (
  id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    WHERE tr.alt_id IN (
      SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
    )
    AND tr.team_id IS NOT NULL
  )
);

-- RLS: Players can view pokemon records from their own teams
CREATE POLICY "players_view_own_tournament_pokemon"
ON pokemon FOR SELECT USING (
  id IN (
    SELECT tp.pokemon_id
    FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT tr.team_id
      FROM tournament_registrations tr
      WHERE tr.alt_id IN (
        SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
      )
      AND tr.team_id IS NOT NULL
    )
  )
);

-- RLS: Open teamsheet PUBLIC visibility — anyone can see teams when tournament is active/completed
-- No auth.uid() check — these are publicly visible for open teamsheet tournaments
CREATE POLICY "open_teamsheet_team_pokemon_public"
ON team_pokemon FOR SELECT USING (
  team_id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE t.open_team_sheets = true
    AND t.status IN ('active', 'completed')
    AND tr.team_id IS NOT NULL
  )
);

CREATE POLICY "open_teamsheet_team_public"
ON teams FOR SELECT USING (
  id IN (
    SELECT tr.team_id
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE t.open_team_sheets = true
    AND t.status IN ('active', 'completed')
    AND tr.team_id IS NOT NULL
  )
);

CREATE POLICY "open_teamsheet_pokemon_public"
ON pokemon FOR SELECT USING (
  id IN (
    SELECT tp.pokemon_id
    FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT tr.team_id
      FROM tournament_registrations tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE t.open_team_sheets = true
      AND t.status IN ('active', 'completed')
      AND tr.team_id IS NOT NULL
    )
  )
);

-- RLS: Players can INSERT their own teams
CREATE POLICY "players_insert_own_teams"
ON teams FOR INSERT WITH CHECK (
  created_by IN (
    SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
  )
);

-- RLS: Players can INSERT pokemon
CREATE POLICY "players_insert_pokemon"
ON pokemon FOR INSERT WITH CHECK (true);

-- RLS: Players can INSERT team_pokemon for their own teams
CREATE POLICY "players_insert_team_pokemon"
ON team_pokemon FOR INSERT WITH CHECK (
  team_id IN (
    SELECT t.id FROM teams t
    WHERE t.created_by IN (
      SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
    )
  )
);

-- RLS: Players can DELETE their own team_pokemon (for team replacement)
CREATE POLICY "players_delete_own_team_pokemon"
ON team_pokemon FOR DELETE USING (
  team_id IN (
    SELECT t.id FROM teams t
    WHERE t.created_by IN (
      SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
    )
  )
);

-- RLS: Players can DELETE their own pokemon
CREATE POLICY "players_delete_own_pokemon"
ON pokemon FOR DELETE USING (
  id IN (
    SELECT tp.pokemon_id FROM team_pokemon tp
    WHERE tp.team_id IN (
      SELECT t.id FROM teams t
      WHERE t.created_by IN (
        SELECT a.id FROM alts a WHERE a.user_id = auth.uid()
      )
    )
  )
);

-- Function to lock teams when tournament starts
CREATE OR REPLACE FUNCTION lock_teams_on_tournament_start()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE tournament_registrations
    SET team_locked = true
    WHERE tournament_id = NEW.id
    AND team_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-lock teams when tournament goes active
DROP TRIGGER IF EXISTS trigger_lock_teams_on_start ON tournaments;
CREATE TRIGGER trigger_lock_teams_on_start
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION lock_teams_on_tournament_start();
```

**Step 2: Apply migration locally**

Run: `pnpm db:migrate` from repo root
Expected: Migration applies successfully

**Step 3: Regenerate types**

Run: `pnpm generate-types` from repo root
Expected: `packages/supabase/src/types.ts` updated with new columns (`open_team_sheets`, `team_submitted_at`, `team_locked`)

**Step 4: Verify types include new columns**

Check `packages/supabase/src/types.ts` — search for `team_submitted_at` and `open_team_sheets` to confirm they appear in the generated types.

**Step 5: Commit**

```bash
git add packages/supabase/supabase/migrations/20260131000000_add_team_submission.sql packages/supabase/src/types.ts
git commit -m "feat(db): add team submission columns, RLS policies, and auto-lock trigger"
```

---

## Task 2: Shared Team Parsing & Validation Library

**Files:**

- Create: `packages/validators/src/team.ts`
- Modify: `packages/validators/src/index.ts`
- Modify: `packages/validators/package.json`

**Context:** The `@pkmn/sets` package exports `Sets.importAll(text)` to parse Pokemon Showdown format text into `PokemonSet[]`. The `@pkmn/sim` package exports `TeamValidator` for format validation. Currently `@pkmn/*` packages are only in `apps/web/package.json` — we need them in `packages/validators/` too so mobile can use the same logic.

**Step 1: Add @pkmn dependencies to validators package**

Add to `packages/validators/package.json` dependencies:

```json
{
  "dependencies": {
    "zod": "catalog:",
    "@pkmn/sets": "^5.2.0",
    "@pkmn/sim": "^0.10.5",
    "@pkmn/dex": "^0.10.5",
    "@pkmn/data": "^0.10.5"
  }
}
```

Run: `pnpm install` from repo root

**Step 2: Create team validation module**

Create `packages/validators/src/team.ts`:

```typescript
import { z } from "zod";
import { Sets } from "@pkmn/sets";
import { Dex } from "@pkmn/sim";

// ── Format Mapping ──────────────────────────────────────────────

/**
 * Maps trainers.gg game_format strings to @pkmn/sim format IDs.
 * If a format is not mapped, only structural validation runs.
 */
export const FORMAT_MAP: Record<string, string> = {
  "reg-i": "gen9vgc2025regi",
  "reg-h": "gen9vgc2024regh",
  "reg-g": "gen9vgc2024regg",
  "reg-f": "gen9vgc2024regf",
  "reg-e": "gen9vgc2024rege",
  "reg-d": "gen9vgc2023regd",
  ou: "gen9ou",
  uu: "gen9uu",
  ubers: "gen9ubers",
  lc: "gen9lc",
  "doubles-ou": "gen9doublesou",
  monotype: "gen9monotype",
};

/**
 * Get the @pkmn/sim format string for a game_format, or null if unmapped.
 */
export function getPkmnFormat(gameFormat: string | null): string | null {
  if (!gameFormat) return null;
  return FORMAT_MAP[gameFormat] ?? null;
}

// ── Parsed Pokemon Type ─────────────────────────────────────────

/**
 * A parsed Pokemon ready for database storage.
 * Derived from @pkmn/sets PokemonSet but with our column names.
 */
export interface ParsedPokemon {
  species: string;
  nickname: string | null;
  level: number;
  ability: string;
  nature: string;
  held_item: string | null;
  move1: string;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  ev_hp: number;
  ev_attack: number;
  ev_defense: number;
  ev_special_attack: number;
  ev_special_defense: number;
  ev_speed: number;
  iv_hp: number;
  iv_attack: number;
  iv_defense: number;
  iv_special_attack: number;
  iv_special_defense: number;
  iv_speed: number;
  tera_type: string | null;
  gender: "Male" | "Female" | null;
  is_shiny: boolean;
}

export interface ParsedTeam {
  pokemon: ParsedPokemon[];
}

export interface ValidationError {
  message: string;
  pokemon?: string; // Which Pokemon the error is about (if applicable)
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  team: ParsedTeam | null;
}

// ── Pokepaste URL Detection ─────────────────────────────────────

const POKEPASTE_REGEX = /^https?:\/\/pokepast\.es\/([a-zA-Z0-9]+)\/?$/;

/**
 * Detect if input is a Pokepaste URL and extract the paste ID.
 */
export function parsePokepaseUrl(input: string): string | null {
  const match = input.trim().match(POKEPASTE_REGEX);
  return match ? match[1]! : null;
}

/**
 * Build the raw text URL for a Pokepaste ID.
 */
export function getPokepaseRawUrl(pasteId: string): string {
  return `https://pokepast.es/${pasteId}/raw`;
}

// ── Parsing ─────────────────────────────────────────────────────

/**
 * Parse Pokemon Showdown format text into structured Pokemon data.
 * Returns null if the text cannot be parsed.
 */
export function parseShowdownText(text: string): ParsedTeam | null {
  try {
    const sets = Sets.importAll(text);
    if (!sets || sets.length === 0) return null;

    const pokemon: ParsedPokemon[] = sets.map((set) => ({
      species: set.species,
      nickname: set.name && set.name !== set.species ? set.name : null,
      level: set.level ?? 50,
      ability: set.ability ?? "",
      nature: set.nature ?? "Hardy",
      held_item: set.item ?? null,
      move1: set.moves?.[0] ?? "",
      move2: set.moves?.[1] ?? null,
      move3: set.moves?.[2] ?? null,
      move4: set.moves?.[3] ?? null,
      ev_hp: set.evs?.hp ?? 0,
      ev_attack: set.evs?.atk ?? 0,
      ev_defense: set.evs?.def ?? 0,
      ev_special_attack: set.evs?.spa ?? 0,
      ev_special_defense: set.evs?.spd ?? 0,
      ev_speed: set.evs?.spe ?? 0,
      iv_hp: set.ivs?.hp ?? 31,
      iv_attack: set.ivs?.atk ?? 31,
      iv_defense: set.ivs?.def ?? 31,
      iv_special_attack: set.ivs?.spa ?? 31,
      iv_special_defense: set.ivs?.spd ?? 31,
      iv_speed: set.ivs?.spe ?? 31,
      tera_type:
        ((set as Record<string, unknown>).teraType as string | null) ?? null,
      gender:
        set.gender === "M" ? "Male" : set.gender === "F" ? "Female" : null,
      is_shiny: set.shiny ?? false,
    }));

    return { pokemon };
  } catch {
    return null;
  }
}

// ── Structural Validation ───────────────────────────────────────

/**
 * Basic structural checks that don't require format-specific knowledge.
 */
export function validateTeamStructure(team: ParsedTeam): ValidationError[] {
  const errors: ValidationError[] = [];

  // Team size
  if (team.pokemon.length === 0) {
    errors.push({
      message: "Team is empty — paste your team in Pokemon Showdown format.",
    });
  } else if (team.pokemon.length > 6) {
    errors.push({
      message: `Team has ${team.pokemon.length} Pokemon — maximum is 6.`,
    });
  }

  // Duplicate species check
  const speciesSeen = new Set<string>();
  for (const mon of team.pokemon) {
    const normalized = mon.species.toLowerCase();
    if (speciesSeen.has(normalized)) {
      errors.push({
        message: `Duplicate species: ${mon.species}. Each Pokemon must be a different species.`,
        pokemon: mon.species,
      });
    }
    speciesSeen.add(normalized);
  }

  // Duplicate item check
  const itemsSeen = new Set<string>();
  for (const mon of team.pokemon) {
    if (mon.held_item) {
      const normalized = mon.held_item.toLowerCase();
      if (itemsSeen.has(normalized)) {
        errors.push({
          message: `Duplicate item: ${mon.held_item} on ${mon.species}. Each Pokemon must hold a different item.`,
          pokemon: mon.species,
        });
      }
      itemsSeen.add(normalized);
    }
  }

  // Each Pokemon needs at least one move
  for (const mon of team.pokemon) {
    if (!mon.move1) {
      errors.push({
        message: `${mon.species} has no moves.`,
        pokemon: mon.species,
      });
    }
  }

  // Each Pokemon needs an ability
  for (const mon of team.pokemon) {
    if (!mon.ability) {
      errors.push({
        message: `${mon.species} has no ability set.`,
        pokemon: mon.species,
      });
    }
  }

  return errors;
}

// ── Format Validation ───────────────────────────────────────────

/**
 * Validate team against a specific @pkmn/sim format.
 * Returns format-specific errors (banned species, illegal moves, etc.)
 */
export function validateTeamFormat(
  team: ParsedTeam,
  gameFormat: string | null
): ValidationError[] {
  const formatId = getPkmnFormat(gameFormat);
  if (!formatId) return []; // No format mapping — skip format validation

  try {
    const dex = Dex.forFormat(formatId);
    const validator = dex.teamValidator();

    // Convert our parsed team back to Showdown set format for validation
    const showdownSets = team.pokemon.map((mon) => ({
      name: mon.nickname ?? "",
      species: mon.species,
      item: mon.held_item ?? "",
      ability: mon.ability,
      nature: mon.nature,
      moves: [mon.move1, mon.move2, mon.move3, mon.move4].filter(
        Boolean
      ) as string[],
      evs: {
        hp: mon.ev_hp,
        atk: mon.ev_attack,
        def: mon.ev_defense,
        spa: mon.ev_special_attack,
        spd: mon.ev_special_defense,
        spe: mon.ev_speed,
      },
      ivs: {
        hp: mon.iv_hp,
        atk: mon.iv_attack,
        def: mon.iv_defense,
        spa: mon.iv_special_attack,
        spd: mon.iv_special_defense,
        spe: mon.iv_speed,
      },
      level: mon.level,
      shiny: mon.is_shiny,
      gender: mon.gender === "Male" ? "M" : mon.gender === "Female" ? "F" : "",
      teraType: mon.tera_type ?? undefined,
    }));

    const problems = validator.validateTeam(showdownSets);
    if (!problems) return []; // null = valid

    return problems.map((problem) => ({
      message: problem,
    }));
  } catch {
    // If format isn't recognized by @pkmn/sim, skip format validation
    return [];
  }
}

// ── Combined Validation ─────────────────────────────────────────

/**
 * Parse and validate a team from raw text input.
 * This is the main entry point for both client and server.
 */
export function parseAndValidateTeam(
  rawText: string,
  gameFormat: string | null
): ValidationResult {
  const team = parseShowdownText(rawText);

  if (!team) {
    return {
      valid: false,
      errors: [
        {
          message:
            "Could not parse team. Make sure it's in Pokemon Showdown export format.",
        },
      ],
      team: null,
    };
  }

  const structuralErrors = validateTeamStructure(team);
  const formatErrors = validateTeamFormat(team, gameFormat);
  const allErrors = [...structuralErrors, ...formatErrors];

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    team,
  };
}

// ── Zod Schema (for server-side input validation) ───────────────

export const teamSubmissionSchema = z.object({
  tournamentId: z.number().int().positive(),
  rawText: z
    .string()
    .min(1, "Team text is required")
    .max(10000, "Team text too long"),
});

export type TeamSubmissionInput = z.infer<typeof teamSubmissionSchema>;
```

**Step 3: Export from validators index**

Add to `packages/validators/src/index.ts`:

```typescript
// Team validators
export {
  parseShowdownText,
  parseAndValidateTeam,
  validateTeamStructure,
  validateTeamFormat,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  getPkmnFormat,
  FORMAT_MAP,
  teamSubmissionSchema,
  type ParsedPokemon,
  type ParsedTeam,
  type ValidationError,
  type ValidationResult,
  type TeamSubmissionInput,
} from "./team";
```

Also add a new export path in `packages/validators/package.json` exports:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./user": "./src/user.ts",
    "./post": "./src/post.ts",
    "./team": "./src/team.ts"
  }
}
```

**Step 4: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/validators`
Expected: No type errors

**Step 5: Commit**

```bash
git add packages/validators/
git commit -m "feat(validators): add team parsing and format validation with @pkmn/sim"
```

---

## Task 3: Backend — submitTeam Mutation

**Files:**

- Modify: `packages/supabase/src/mutations/tournaments.ts` (add `submitTeam` function)
- Modify: `packages/supabase/src/mutations/index.ts` (export it)

**Context:** The mutation needs to: parse raw text → validate → create pokemon records → create team → link via team_pokemon → set registration.team_id and team_submitted_at. Uses the `getCurrentAlt()` helper already in the file (line 24). The `TypedClient` type is `SupabaseClient<Database>` (line 5).

**Step 1: Add submitTeam mutation**

Add to the end of `packages/supabase/src/mutations/tournaments.ts`:

```typescript
/**
 * Submit a team for a tournament registration.
 * Parses Showdown format text, validates, and stores structured data.
 *
 * If the player already has a team submitted, it replaces it
 * (deletes old pokemon/team_pokemon, creates new ones).
 */
export async function submitTeam(
  supabase: TypedClient,
  tournamentId: number,
  rawText: string
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  // 1. Find registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, team_locked, tournament_id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", alt.id)
    .single();

  if (!registration) {
    throw new Error(
      "You must be registered for this tournament to submit a team."
    );
  }

  if (registration.team_locked) {
    throw new Error("Teams are locked — the tournament has already started.");
  }

  // 2. Get tournament format for validation
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("game_format")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found.");

  // 3. Parse and validate (server-side enforcement)
  // Import dynamically to avoid bundling @pkmn in all mutation consumers
  const { parseAndValidateTeam } = await import("@trainers/validators/team");
  const result = parseAndValidateTeam(rawText, tournament.game_format);

  if (!result.valid || !result.team) {
    throw new Error(
      `Team validation failed:\n${result.errors.map((e) => `• ${e.message}`).join("\n")}`
    );
  }

  // 4. If replacing an existing team, delete old data
  if (registration.team_id) {
    // Get old pokemon IDs before deleting links
    const { data: oldTeamPokemon } = await supabase
      .from("team_pokemon")
      .select("pokemon_id")
      .eq("team_id", registration.team_id);

    // Delete team_pokemon links
    await supabase
      .from("team_pokemon")
      .delete()
      .eq("team_id", registration.team_id);

    // Delete old pokemon records
    if (oldTeamPokemon?.length) {
      const pokemonIds = oldTeamPokemon.map((tp) => tp.pokemon_id);
      await supabase.from("pokemon").delete().in("id", pokemonIds);
    }

    // Delete old team
    await supabase.from("teams").delete().eq("id", registration.team_id);
  }

  // 5. Create new team
  const { data: newTeam, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: `Tournament Team`,
      created_by: alt.id,
      is_public: false,
    })
    .select("id")
    .single();

  if (teamError || !newTeam) throw new Error("Failed to create team.");

  // 6. Insert pokemon records
  const pokemonInserts = result.team.pokemon.map((mon) => ({
    species: mon.species,
    nickname: mon.nickname,
    level: mon.level,
    ability: mon.ability,
    nature: mon.nature,
    held_item: mon.held_item,
    move1: mon.move1,
    move2: mon.move2,
    move3: mon.move3,
    move4: mon.move4,
    ev_hp: mon.ev_hp,
    ev_attack: mon.ev_attack,
    ev_defense: mon.ev_defense,
    ev_special_attack: mon.ev_special_attack,
    ev_special_defense: mon.ev_special_defense,
    ev_speed: mon.ev_speed,
    iv_hp: mon.iv_hp,
    iv_attack: mon.iv_attack,
    iv_defense: mon.iv_defense,
    iv_special_attack: mon.iv_special_attack,
    iv_special_defense: mon.iv_special_defense,
    iv_speed: mon.iv_speed,
    tera_type: mon.tera_type,
    gender: mon.gender,
    is_shiny: mon.is_shiny,
  }));

  const { data: newPokemon, error: pokemonError } = await supabase
    .from("pokemon")
    .insert(pokemonInserts)
    .select("id");

  if (pokemonError || !newPokemon)
    throw new Error("Failed to create pokemon records.");

  // 7. Link pokemon to team with positions
  const teamPokemonInserts = newPokemon.map((p, index) => ({
    team_id: newTeam.id,
    pokemon_id: p.id,
    team_position: index + 1,
  }));

  const { error: linkError } = await supabase
    .from("team_pokemon")
    .insert(teamPokemonInserts);

  if (linkError) throw new Error("Failed to link pokemon to team.");

  // 8. Update registration with team reference
  const { error: regError } = await supabase
    .from("tournament_registrations")
    .update({
      team_id: newTeam.id,
      team_submitted_at: new Date().toISOString(),
    })
    .eq("id", registration.id);

  if (regError) throw new Error("Failed to update registration with team.");

  return {
    success: true,
    teamId: newTeam.id,
    pokemonCount: result.team.pokemon.length,
  };
}
```

**Step 2: Export from mutations index**

Add `submitTeam` to the exports in `packages/supabase/src/mutations/index.ts`:

```typescript
export {
  // ... existing exports ...
  submitTeam,
} from "./tournaments";
```

**Step 3: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/supabase`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/supabase/src/mutations/tournaments.ts packages/supabase/src/mutations/index.ts
git commit -m "feat(supabase): add submitTeam mutation with parsing and validation"
```

---

## Task 4: Backend — Check-in Gate (BEA-149)

**Files:**

- Modify: `packages/supabase/src/mutations/tournaments.ts:606-653` (modify `checkIn` function)

**Context:** The `checkIn()` function at line 606 currently selects `id, status` from registration. We need to also select `team_id` and block check-in if no team is submitted.

**Step 1: Add team_id check to checkIn mutation**

In `checkIn()` function, change the select on line 617 from `"id, status"` to `"id, status, team_id"`, then add validation after the status check (after line 632):

```typescript
// After the status validation block (line 632), add:
if (!registration.team_id) {
  throw new Error(
    "You must submit a team before checking in. Go to the tournament page to submit your team."
  );
}
```

**Step 2: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/supabase`
Expected: No type errors

**Step 3: Commit**

```bash
git add packages/supabase/src/mutations/tournaments.ts
git commit -m "fix(supabase): gate check-in on team submission (BEA-149)"
```

---

## Task 5: Backend — getTeamForRegistration Query

**Files:**

- Modify: `packages/supabase/src/queries/tournaments.ts` (add `getTeamForRegistration` function)
- Modify: `packages/supabase/src/queries/index.ts` (export it)

**Context:** The web and mobile apps need to fetch the submitted team for display. This query returns the team with all pokemon for the current user's registration in a given tournament. RLS policies enforce that only the player (or open teamsheet participants) can see the data.

**Step 1: Add getTeamForRegistration query**

Add to `packages/supabase/src/queries/tournaments.ts`:

```typescript
/**
 * Get the submitted team for a player's tournament registration.
 * Returns null if no team is submitted.
 * RLS policies enforce visibility (own team, or open teamsheets).
 */
export async function getTeamForRegistration(
  supabase: TypedClient,
  tournamentId: number,
  altId?: number
) {
  let targetAltId: number | undefined = altId;

  if (!targetAltId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: alt } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!alt) return null;
    targetAltId = alt.id as number;
  }

  // Get registration with team info
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, team_submitted_at, team_locked")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", targetAltId!)
    .single();

  if (!registration?.team_id) return null;

  // Get team with pokemon
  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", registration.team_id)
    .single();

  if (!team) return null;

  const { data: teamPokemon } = await supabase
    .from("team_pokemon")
    .select(
      `
      team_position,
      pokemon:pokemon (
        id, species, nickname, level, ability, nature, held_item,
        move1, move2, move3, move4,
        ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
        iv_hp, iv_attack, iv_defense, iv_special_attack, iv_special_defense, iv_speed,
        tera_type, gender, is_shiny
      )
    `
    )
    .eq("team_id", registration.team_id)
    .order("team_position");

  return {
    teamId: team.id,
    teamName: team.name,
    submittedAt: registration.team_submitted_at,
    locked: registration.team_locked,
    pokemon:
      teamPokemon?.map((tp) => ({
        position: tp.team_position,
        ...tp.pokemon,
      })) ?? [],
  };
}
```

**Step 2: Export from queries index**

Add `getTeamForRegistration` to the exports in `packages/supabase/src/queries/index.ts`.

**Step 3: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/supabase`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/supabase/src/queries/tournaments.ts packages/supabase/src/queries/index.ts
git commit -m "feat(supabase): add getTeamForRegistration query"
```

---

## Task 6: Server Action + Cache Tags for Team Submission (ISR)

**Files:**

- Modify: `apps/web/src/lib/cache.ts` (add team-related cache tags)
- Modify: `apps/web/src/actions/tournaments.ts` (add `submitTeamAction` server action)

**Context:** The project uses on-demand ISR via `unstable_cache()` with `updateTag()` for cache invalidation. Tournament pages use `CacheTags.tournament(slug)` tags. When a team is submitted, we need to revalidate the tournament detail page so the team list updates. For open teamsheet tournaments, the team list is publicly visible (static), so ISR revalidation is essential.

**Step 1: Add cache tags for tournament teams**

In `apps/web/src/lib/cache.ts`, add to the `CacheTags` object:

```typescript
export const CacheTags = {
  // ... existing tags ...

  /** Tag for tournament team submissions (open teamsheet public view) */
  tournamentTeams: (idOrSlug: string | number) =>
    `tournament-teams:${idOrSlug}`,
} as const;
```

**Step 2: Add submitTeam server action**

In `apps/web/src/actions/tournaments.ts`, add:

```typescript
import { submitTeam as submitTeamMutation } from "@trainers/supabase";

/**
 * Submit a team for a tournament registration.
 * Revalidates: tournament detail page, tournament team list
 */
export async function submitTeamAction(
  tournamentId: number,
  rawText: string
): Promise<ActionResult<{ teamId: number; pokemonCount: number }>> {
  try {
    const supabase = await createClient();
    const result = await submitTeamMutation(supabase, tournamentId, rawText);

    // Revalidate tournament detail page (shows team submission status)
    updateTag(CacheTags.tournament(tournamentId));
    // Revalidate tournament team list (for open teamsheet public view)
    updateTag(CacheTags.tournamentTeams(tournamentId));

    return {
      success: true,
      data: { teamId: result.teamId, pokemonCount: result.pokemonCount },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit team"),
    };
  }
}
```

**Step 3: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/web`
Expected: No type errors

**Step 4: Commit**

```bash
git add apps/web/src/lib/cache.ts apps/web/src/actions/tournaments.ts
git commit -m "feat(web): add submitTeamAction server action with ISR cache revalidation"
```

---

## Task 7: Web UI — TeamPreview Component

**Files:**

- Create: `apps/web/src/components/tournament/team-preview.tsx`

**Context:** Displays 6 Pokemon in a grid. Shows species name, item, ability, and tera type. Used in the submitted state of TeamSubmissionCard and in open teamsheet match views. Follow existing component patterns — use shadcn/ui Card, use `cn()` for class merging, use lucide icons.

**Step 1: Create TeamPreview component**

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamPokemon {
  species: string;
  nickname?: string | null;
  held_item?: string | null;
  ability?: string;
  tera_type?: string | null;
  move1?: string;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
}

interface TeamPreviewProps {
  pokemon: TeamPokemon[];
  compact?: boolean;
  className?: string;
}

export function TeamPreview({
  pokemon,
  compact = false,
  className,
}: TeamPreviewProps) {
  if (pokemon.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {pokemon.map((mon, i) => (
        <Card key={i} className="bg-muted/50">
          <CardContent className={cn("p-3", compact && "p-2")}>
            <div className="text-sm font-semibold">{mon.species}</div>
            {mon.nickname && mon.nickname !== mon.species && (
              <div className="text-muted-foreground text-xs italic">
                &quot;{mon.nickname}&quot;
              </div>
            )}
            {!compact && (
              <div className="mt-1.5 space-y-1">
                {mon.held_item && (
                  <div className="text-muted-foreground text-xs">
                    {mon.held_item}
                  </div>
                )}
                {mon.ability && (
                  <div className="text-muted-foreground text-xs">
                    {mon.ability}
                  </div>
                )}
                {mon.tera_type && (
                  <Badge variant="outline" className="px-1.5 py-0 text-xs">
                    Tera: {mon.tera_type}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/tournament/team-preview.tsx
git commit -m "feat(web): add TeamPreview component for displaying Pokemon team"
```

---

## Task 7: Web UI — TeamSubmissionCard Component

**Files:**

- Create: `apps/web/src/components/tournament/team-submission-card.tsx`

**Context:** Three-state component: empty → editing → submitted. Uses `parseAndValidateTeam` from `@trainers/validators/team` for client-side validation, calls `submitTeamAction` **server action** (NOT the mutation directly) on submit — this triggers ISR cache revalidation so the public team list updates. Fetches Pokepaste URLs client-side. Must be a `"use client"` component.

Look at `registration-card.tsx` and `check-in-card.tsx` for patterns — they use `useSupabaseQuery` from `@/lib/supabase` and `useAuth` from `@/components/auth/auth-provider`.

**Step 1: Create TeamSubmissionCard**

```tsx
"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardPaste,
  Link as LinkIcon,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { TeamPreview } from "./team-preview";
import {
  parseAndValidateTeam,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  type ValidationResult,
} from "@trainers/validators/team";
import { submitTeamAction } from "@/actions/tournaments";

interface TeamSubmissionCardProps {
  tournamentId: number;
  gameFormat: string | null;
  submittedTeam: {
    teamId: number;
    submittedAt: string | null;
    locked: boolean;
    pokemon: Array<{
      species: string;
      nickname?: string | null;
      held_item?: string | null;
      ability?: string;
      tera_type?: string | null;
    }>;
  } | null;
  onTeamSubmitted?: () => void;
}

type CardState = "empty" | "editing" | "submitted";

export function TeamSubmissionCard({
  tournamentId,
  gameFormat,
  submittedTeam,
  onTeamSubmitted,
}: TeamSubmissionCardProps) {
  const [state, setState] = useState<CardState>(
    submittedTeam ? "submitted" : "empty"
  );
  const [inputMode, setInputMode] = useState<"paste" | "url">("paste");
  const [rawText, setRawText] = useState("");
  const [pokepaseUrl, setPokepaseUrl] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPaste, setIsFetchingPaste] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse and validate whenever raw text changes
  const handleTextChange = useCallback(
    (text: string) => {
      setRawText(text);
      setError(null);
      if (text.trim().length > 0) {
        const result = parseAndValidateTeam(text, gameFormat);
        setValidation(result);
      } else {
        setValidation(null);
      }
    },
    [gameFormat]
  );

  // Fetch Pokepaste URL and parse
  const handleFetchPokepaste = useCallback(async () => {
    const pasteId = parsePokepaseUrl(pokepaseUrl);
    if (!pasteId) {
      setError(
        "Invalid Pokepaste URL. Expected format: https://pokepast.es/abc123"
      );
      return;
    }

    setIsFetchingPaste(true);
    setError(null);
    try {
      const rawUrl = getPokepaseRawUrl(pasteId);
      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch paste — check the URL and try again.");
      }
      const text = await response.text();
      handleTextChange(text);
      setInputMode("paste"); // Switch to paste view to show the parsed text
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch Pokepaste."
      );
    } finally {
      setIsFetchingPaste(false);
    }
  }, [pokepaseUrl, handleTextChange]);

  // Submit team to server
  const handleSubmit = useCallback(async () => {
    if (!validation?.valid || !rawText.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitTeamAction(tournamentId, rawText);
      if (!result.success) {
        setError(result.error ?? "Failed to submit team.");
        return;
      }
      setState("submitted");
      onTeamSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit team.");
    } finally {
      setIsSubmitting(false);
    }
  }, [supabase, tournamentId, rawText, validation, onTeamSubmitted]);

  // ── State: Submitted ──────────────────────────────────────────
  if (state === "submitted" && submittedTeam) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">Team Submitted</CardTitle>
            </div>
            {submittedTeam.locked ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setState("editing")}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Replace
              </Button>
            )}
          </div>
          {submittedTeam.submittedAt && (
            <CardDescription>
              Submitted{" "}
              {new Date(submittedTeam.submittedAt).toLocaleDateString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <TeamPreview pokemon={submittedTeam.pokemon} />
        </CardContent>
      </Card>
    );
  }

  // ── State: Empty ──────────────────────────────────────────────
  if (state === "empty") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Submission</CardTitle>
          <CardDescription>
            Submit your team before you can check in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setInputMode("paste");
                setState("editing");
              }}
            >
              <ClipboardPaste className="mr-1.5 h-4 w-4" />
              Paste Team
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInputMode("url");
                setState("editing");
              }}
            >
              <LinkIcon className="mr-1.5 h-4 w-4" />
              Import Pokepaste
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── State: Editing ────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit Your Team</CardTitle>
        <CardDescription>
          {inputMode === "paste"
            ? "Paste your team in Pokemon Showdown export format"
            : "Enter a Pokepaste URL to import your team"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={inputMode === "paste" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("paste")}
          >
            <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
            Paste
          </Button>
          <Button
            variant={inputMode === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("url")}
          >
            <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
            Pokepaste URL
          </Button>
        </div>

        {/* Paste input */}
        {inputMode === "paste" ? (
          <Textarea
            placeholder={`Rillaboom @ Miracle Seed\nAbility: Grassy Surge\nTera Type: Fire\nEVs: 252 Atk / 4 SpD / 252 Spe\nAdamant Nature\n- Wood Hammer\n- Grassy Glide\n- U-turn\n- Fake Out`}
            value={rawText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
          />
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="https://pokepast.es/abc123"
              value={pokepaseUrl}
              onChange={(e) => setPokepaseUrl(e.target.value)}
            />
            <Button
              onClick={handleFetchPokepaste}
              disabled={!pokepaseUrl.trim() || isFetchingPaste}
              size="sm"
            >
              {isFetchingPaste ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Fetch"
              )}
            </Button>
          </div>
        )}

        {/* Validation preview */}
        {validation && validation.team && (
          <div className="space-y-3">
            <TeamPreview pokemon={validation.team.pokemon} compact />

            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {validation.errors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error from server */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setState(submittedTeam ? "submitted" : "empty");
              setRawText("");
              setPokepaseUrl("");
              setValidation(null);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!validation?.valid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Team"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/web`
Expected: No errors (may need to adjust imports based on actual project paths)

**Step 3: Commit**

```bash
git add apps/web/src/components/tournament/team-submission-card.tsx
git commit -m "feat(web): add TeamSubmissionCard component with paste and Pokepaste import"
```

---

## Task 9: Web UI — Integrate into Tournament Detail Page (ISR)

**Files:**

- Modify: `apps/web/src/app/tournaments/[tournamentSlug]/page.tsx`

**Context:** This is a Server Component using `unstable_cache()` with `CacheTags.tournament(slug)`. It needs to:

1. Fetch the current user's submitted team (auth-dependent, NOT cached)
2. For open teamsheet tournaments, fetch ALL submitted teams using a cached query with `CacheTags.tournamentTeams(slug)` — this is the ISR-powered public team list
3. Render `TeamSubmissionCard` for registered players
4. Render public team list for open teamsheet tournaments (statically generated, revalidated on submission)

**ISR Strategy:**

- **Public team list** (open teamsheets): `unstable_cache()` with `CacheTags.tournamentTeams(slug)` tag. Uses `createStaticClient()` (no auth). Revalidated when any player calls `submitTeamAction`.
- **User's own team**: Fetched with auth client (`createClientReadOnly()`), NOT cached (user-specific).

**Step 1: Add cached team list query for open teamsheets**

In the tournament detail page, add a new cached fetcher:

```typescript
import { CacheTags } from "@/lib/cache";

// Public team list for open teamsheet tournaments (ISR)
const getCachedTournamentTeams = (tournamentId: number, slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      // This query relies on RLS — open teamsheet policies make teams public
      const { data } = await supabase
        .from("tournament_registrations")
        .select(
          `
          alt_id,
          alts:alts(username, display_name),
          team:teams(
            id, name,
            team_pokemon(
              team_position,
              pokemon:pokemon(species, nickname, held_item, ability, tera_type)
            )
          )
        `
        )
        .eq("tournament_id", tournamentId)
        .not("team_id", "is", null)
        .order("registered_at");
      return data ?? [];
    },
    [`tournament-teams-${slug}`],
    { tags: [CacheTags.tournamentTeams(slug), CacheTags.tournament(slug)] }
  )();
```

**Step 2: Add user's team fetch (not cached)**

```typescript
// User's own team — auth-dependent, not cached
async function getMyTeam(tournamentId: number) {
  try {
    const supabase = await createClientReadOnly();
    return getTeamForRegistration(supabase, tournamentId);
  } catch {
    return null;
  }
}
```

**Step 3: Render TeamSubmissionCard and public team list**

After the registration card section, add:

- `TeamSubmissionCard` when user is registered (pass `submittedTeam` from `getMyTeam`)
- Public team list section when tournament is active + open teamsheets (use cached data)

**Step 4: Use next/image for Pokemon sprites (future)**

When Pokemon sprites are added later (BEA-89), use `next/image` with:

- `width` and `height` props (sprites are fixed size)
- `loading="lazy"` for below-fold Pokemon
- Consider a sprite CDN with `remotePatterns` in `next.config.ts`

For now, display species names only (no sprites yet).

**Step 5: Run dev and test**

Run: `pnpm dev:web` and visit a tournament page
Expected: After registering, the team submission card appears. For open teamsheet active tournaments, the public team list renders.

**Step 6: Commit**

```bash
git add apps/web/src/app/tournaments/\[tournamentSlug\]/page.tsx
git commit -m "feat(web): integrate TeamSubmissionCard with ISR-cached public team list"
```

---

## Task 10: Web UI — Update CheckInCard with Team Gate

**Files:**

- Modify: `apps/web/src/components/tournament/check-in-card.tsx`

**Context:** The check-in card needs to show a warning and disable the check-in button when no team is submitted. Add a `hasTeam` prop.

**Step 1: Add hasTeam prop and gate UI**

1. Add `hasTeam: boolean` to the component props
2. When `hasTeam` is false and check-in is open, show a warning Alert:
   - "Submit your team before checking in"
3. Disable the check-in button when `hasTeam` is false
4. Update the parent page to pass the `hasTeam` prop

**Step 2: Run dev and test**

Run: `pnpm dev:web` and visit a tournament
Expected: If registered without a team, the check-in button is disabled with a warning.

**Step 3: Commit**

```bash
git add apps/web/src/components/tournament/check-in-card.tsx apps/web/src/app/tournaments/\[tournamentSlug\]/page.tsx
git commit -m "feat(web): gate check-in on team submission in CheckInCard"
```

---

## Task 11: Web UI — Dashboard "My Tournaments" Team Status

**Files:**

- Modify: `apps/web/src/components/dashboard/upcoming-tournaments.tsx`

**Context:** The `UpcomingTournaments` component currently shows tournament name, date, and a "View" button. We need to add team submission status: a badge showing "Team not submitted" (warning) or "Team submitted" (success), and a link to the tournament page.

**Step 1: Add team status to dashboard type**

Update the `DashboardTournament` type (or wherever `transformedTournaments` is built in `overview-client.tsx`) to include `hasTeam: boolean`.

**Step 2: Add team status badges**

In `upcoming-tournaments.tsx`, after the tournament name/date section, add:

```tsx
{
  tournament.hasTeam ? (
    <Badge variant="secondary" className="text-xs text-emerald-600">
      ✓ Team submitted
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-xs text-amber-600">
      Team needed
    </Badge>
  );
}
```

**Step 3: Update the dashboard data query**

The `getMyDashboardData` function needs to include team submission status for each tournament. Update the query to join `tournament_registrations.team_id IS NOT NULL` as `hasTeam`.

**Step 4: Run dev and test**

Run: `pnpm dev:web`, go to `/dashboard/overview`
Expected: Each tournament in "Upcoming Tournaments" shows team submission status.

**Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/upcoming-tournaments.tsx apps/web/src/app/dashboard/overview/overview-client.tsx
git commit -m "feat(web): show team submission status on dashboard"
```

---

## Task 12: Mobile — Add @pkmn Dependencies

**Files:**

- Modify: `apps/mobile/package.json`

**Context:** Mobile app needs `@pkmn/*` packages for client-side parsing/validation. The shared `@trainers/validators/team` module imports from these packages.

**Step 1: Add dependencies**

Add to `apps/mobile/package.json` dependencies:

```json
"@pkmn/data": "^0.10.5",
"@pkmn/dex": "^0.10.5",
"@pkmn/sim": "^0.10.5",
"@pkmn/sets": "^5.2.0"
```

Run: `pnpm install`

**Step 2: Verify import works**

Create a quick test in the mobile app that imports from `@trainers/validators/team` and verify it resolves.

**Step 3: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): add @pkmn packages for team validation"
```

---

## Task 13: Mobile — TeamPreview Component (Tamagui)

**Files:**

- Create: `apps/mobile/src/components/tournament/team-preview.tsx`

**Context:** Same visual concept as web but using Tamagui components. Display 6 Pokemon in a 2-column grid. Use `YStack`, `XStack`, `Text`, and Tamagui theme tokens.

**Step 1: Create mobile TeamPreview**

```tsx
import { YStack, XStack, Text } from "tamagui";

interface TeamPokemon {
  species: string;
  nickname?: string | null;
  held_item?: string | null;
  ability?: string;
  tera_type?: string | null;
}

interface TeamPreviewProps {
  pokemon: TeamPokemon[];
  compact?: boolean;
}

export function TeamPreview({ pokemon, compact = false }: TeamPreviewProps) {
  if (pokemon.length === 0) return null;

  return (
    <XStack flexWrap="wrap" gap="$2">
      {pokemon.map((mon, i) => (
        <YStack
          key={i}
          backgroundColor="$backgroundStrong"
          padding={compact ? "$2" : "$3"}
          borderRadius="$3"
          width="48%"
          gap="$1"
        >
          <Text fontWeight="600" fontSize="$3">
            {mon.species}
          </Text>
          {mon.nickname && mon.nickname !== mon.species && (
            <Text fontSize="$2" color="$colorSubtle" fontStyle="italic">
              &quot;{mon.nickname}&quot;
            </Text>
          )}
          {!compact && (
            <>
              {mon.held_item && (
                <Text fontSize="$2" color="$colorSubtle">
                  {mon.held_item}
                </Text>
              )}
              {mon.ability && (
                <Text fontSize="$2" color="$colorSubtle">
                  {mon.ability}
                </Text>
              )}
              {mon.tera_type && (
                <Text fontSize="$2" color="$primary">
                  Tera: {mon.tera_type}
                </Text>
              )}
            </>
          )}
        </YStack>
      ))}
    </XStack>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/tournament/team-preview.tsx
git commit -m "feat(mobile): add TeamPreview Tamagui component"
```

---

## Task 14: Mobile — TeamSubmissionCard Component (Tamagui)

**Files:**

- Create: `apps/mobile/src/components/tournament/team-submission-card.tsx`

**Context:** Same three-state pattern as web (empty → editing → submitted) but with Tamagui components. Uses `TextArea` from Tamagui for paste input. Fetches Pokepaste URLs. Calls `submitTeam` mutation from `@trainers/supabase`. Uses clipboard API for mobile paste UX.

**Step 1: Create mobile TeamSubmissionCard**

The implementer should follow the web component logic (Task 7) but replace:

- `Card` → Tamagui `YStack` with `backgroundColor="$backgroundStrong"`
- `Button` → Tamagui `Button`
- `Textarea` → Tamagui `TextArea`
- `Input` → Tamagui `Input`
- `Alert` → Tamagui `YStack` with colored background
- lucide icons → `@tamagui/lucide-icons` (if available) or use Text-based indicators
- Tailwind classes → Tamagui theme tokens (`$primary`, `$background`, etc.)

Add clipboard paste support via React Native's `Clipboard` API for convenience on mobile.

**Step 2: Commit**

```bash
git add apps/mobile/src/components/tournament/team-submission-card.tsx
git commit -m "feat(mobile): add TeamSubmissionCard Tamagui component"
```

---

## Task 15: Mobile — Tournament Detail Screen

**Files:**

- Create: `apps/mobile/src/app/tournaments/[slug].tsx`

**Context:** Mobile doesn't have tournament screens yet. Create a minimal tournament detail screen that shows:

- Tournament name, format, date
- Team submission card (for registered players)
- Check-in status

This is a new Expo Router screen. Follow existing mobile patterns from `apps/mobile/src/app/organizations/[slug].tsx`.

**Step 1: Create tournament detail screen**

Use Expo Router `useLocalSearchParams` for the slug. Fetch tournament data with `getTournamentBySlug` from `@trainers/supabase`. Render `TeamSubmissionCard` when registered.

**Step 2: Commit**

```bash
git add apps/mobile/src/app/tournaments/
git commit -m "feat(mobile): add tournament detail screen with team submission"
```

---

## Task 16: Final Integration — Typecheck & Lint

**Files:** All modified files

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: No errors across all packages

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 3: Run format**

Run: `pnpm format`
Expected: All files formatted

**Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore: format and lint fixes"
```

---

## Summary

| Task | Description                                                   | Linear  |
| ---- | ------------------------------------------------------------- | ------- |
| 1    | Database migration + RLS + team lock trigger                  | BEA-147 |
| 2    | Shared parsing/validation library (`@trainers/validators`)    | BEA-147 |
| 3    | `submitTeam` mutation (Supabase)                              | BEA-150 |
| 4    | Check-in gate in `checkIn` mutation                           | BEA-149 |
| 5    | `getTeamForRegistration` query                                | BEA-150 |
| 6    | Server action + cache tags (ISR revalidation)                 | BEA-150 |
| 7    | Web `TeamPreview` component                                   | BEA-150 |
| 8    | Web `TeamSubmissionCard` component (calls server action)      | BEA-150 |
| 9    | Web tournament page integration (ISR-cached public team list) | BEA-150 |
| 10   | Web `CheckInCard` team gate UI                                | BEA-149 |
| 11   | Web dashboard team submission status                          | BEA-150 |
| 12   | Mobile `@pkmn` dependencies                                   | BEA-147 |
| 13   | Mobile `TeamPreview` (Tamagui)                                | BEA-150 |
| 14   | Mobile `TeamSubmissionCard` (Tamagui)                         | BEA-150 |
| 15   | Mobile tournament detail screen                               | BEA-150 |
| 16   | Final typecheck, lint, format                                 | All     |

## Next.js Optimization Notes

These guidelines apply across all web tasks:

- **ISR via cache tags:** All public team data uses `unstable_cache()` with `CacheTags.tournamentTeams(slug)`. Team submissions trigger `updateTag()` to revalidate.
- **Static client for public data:** Use `createStaticClient()` (no cookies) for cached queries. User-specific data uses `createClientReadOnly()` and is NOT cached.
- **`next/image` for sprites:** When Pokemon sprites are added (BEA-89), use `next/image` with explicit `width`/`height`, `loading="lazy"` for below-fold content, and configure `remotePatterns` for sprite CDN.
- **Server Components by default:** `TeamPreview` can be a Server Component when rendered in the public team list. Only use `"use client"` for interactive components (`TeamSubmissionCard`).
- **No client-side data fetching for public data:** The public team list is statically rendered and revalidated via ISR — no `useEffect`/`useQuery` needed for it.
