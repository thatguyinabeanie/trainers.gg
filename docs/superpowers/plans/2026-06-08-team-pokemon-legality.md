# Implementation Plan: Legality Validation for `rk9.team_pokemon`

**Date:** 2026-06-08
**Branch:** create a new feature branch off `main` (e.g. `feat/rk9-team-pokemon-legality`) — do not work on `main`.

## Goal

RK9 tournament team sheets sometimes contain illegal Pokemon (wrong ability, banned
item, etc.) entered by players. We want to:

1. **Always import 100% of what RK9 shows** — never drop a row.
2. **Flag each Pokemon entry** as legal or illegal at import time, with a reason.
3. **Filter illegal entries out of usage stats** at the ETL layer.

## Two Deviations From the Original Spec (read before starting)

These were discovered while verifying the codebase. The plan below reflects the
corrected approach, not the original wording.

### Deviation 1 — function name: `validatePokemonLegality`, not `validatePokemon`

The original spec asked for a new `validatePokemon(...)` export. That name is
**already taken**: `packages/pokemon/src/validation.ts` exports a `validatePokemon`
(a single-Pokemon `@pkmn/dex` structural validator). Adding a second export under
the same name is impossible and aliasing two same-named functions is a trap.

**Resolution:** the new function is named `validatePokemonLegality`, lives in
`packages/pokemon/src/format-legality.ts` (next to the `isLegal*` helpers it
composes), and is exported through the barrel's "Format legality" block.

### Deviation 2 — import fails OPEN, contradicting the file header

`format-legality.ts`'s header comment says gate-path callers (team submission,
**import**) MUST fail _closed_ on `LEGALITY_UNAVAILABLE`. This plan intentionally
makes **import fail _open_** instead:

- Requirement #1 is "never drop data."
- The spec says `format_id` null/fetch-failure → `is_legal = true` for all rows.

The boolean `isLegal*` helpers (`isLegalSpecies`, `isLegalItem`, `isLegalAbility`,
`isLegalMove`) already collapse both `undefined` (unknown format) and
`LEGALITY_UNAVAILABLE` (validator threw) into `true`. So `validatePokemonLegality`
calls those four boolean helpers directly — **no `LEGALITY_UNAVAILABLE` Symbol
handling needed**. The "fail open at import" choice is deliberate; do not "fix" it
back to fail-closed. Add a code comment on `validatePokemonLegality` saying so.

## Corrected Helper Signatures (the spec listed these wrong)

The four existing boolean helpers are **positional** and species is **required and
in the middle** — not the `(x, formatId, species?)` shape the spec implied:

```ts
isLegalSpecies(species: string, formatId: string): boolean
isLegalItem(item: string, formatId: string): boolean
isLegalAbility(ability: string, species: string, formatId: string): boolean
isLegalMove(move: string, species: string, formatId: string): boolean
```

All four already return `true` for empty string and for unknown/unavailable formats.

## Task Dependency Graph

- **Task 1** (migration) and **Task 2** (`validatePokemonLegality`) are independent —
  can be done in either order or in parallel.
- **Task 3** (wire into import) depends on **both** Task 1 (regenerated types expose
  `is_legal` / `legality_reason` on the insert shape) **and** Task 2 (the function).
- **Task 4** (ETL filter) depends on **Task 1** (the `is_legal` column must exist).

A subagent driver must **not** start Task 3 before Tasks 1 and 2 are both done.

---

## Task 1 — DB migration: add `is_legal` + `legality_reason`

### Files to touch

- **New file:** `packages/supabase/supabase/migrations/<timestamp>_team_pokemon_legality.sql`
  - Timestamp must sort **after** the latest existing migration
    `20260608212150_backfill_floette_eternal_slug.sql`. Use a current UTC timestamp
    in `YYYYMMDDHHMMSS` form (e.g. `20260608220000`).
- `packages/supabase/src/types.ts` — regenerated, not hand-edited.

### Exact migration contents

```sql
-- Add legality flags to rk9.team_pokemon.
--
-- We import 100% of what RK9 shows (illegal entries included), then flag each
-- row at import time so usage-stats ETL can filter illegal entries out without
-- losing the underlying data. Validation is performed by
-- @trainers/pokemon validatePokemonLegality() inside the import pipeline.

ALTER TABLE rk9.team_pokemon
  ADD COLUMN IF NOT EXISTS is_legal boolean NOT NULL DEFAULT true;

ALTER TABLE rk9.team_pokemon
  ADD COLUMN IF NOT EXISTS legality_reason text;

COMMENT ON COLUMN rk9.team_pokemon.legality_reason IS
  'Human-readable reason a row is illegal (e.g. "Illegal ability: Sweet Veil"). NULL when is_legal = true.';
```

### Index decision — intentionally NO index on `is_legal`

Do **not** add an index on `is_legal`. Rationale (state this so a database review
does not flag "new WHERE column, no index"):

- `is_legal` is a ~99%-true boolean — extremely low selectivity, poor index candidate.
- The only query filtering on it (Task 4) is already selective via the
  `standings.event_id` join: one event is at most a few thousand rows. A sequential
  scan over that join result is cheap; a boolean index would not be chosen by the
  planner.

### RLS

No new RLS work. `rk9.team_pokemon` already exists with its policies; new columns
inherit the table's existing row-level security.

### Steps (in order)

1. Write the migration file above.
2. `pnpm db:reset` (replays all migrations + seed; run from repo root).
3. `pnpm generate-types` (regenerates `packages/supabase/src/types.ts` so `is_legal`
   and `legality_reason` appear on `rk9.team_pokemon` Row/Insert/Update types).

### Done when

- [ ] Migration file exists with a timestamp after `20260608212150`.
- [ ] `pnpm db:reset` completes with no migration errors.
- [ ] `pnpm generate-types` runs clean and `git diff packages/supabase/src/types.ts`
      shows `is_legal: boolean` and `legality_reason: string | null` on the
      `rk9.team_pokemon` Row type (and the corresponding Insert/Update entries).
- [ ] No index and no RLS changes were added.

---

## Task 2 — `validatePokemonLegality()` in `@trainers/pokemon`

### Files to touch

- `packages/pokemon/src/format-legality.ts` — add the new function.
- `packages/pokemon/src/index.ts` — add `validatePokemonLegality` to the
  "Format legality" export block (alphabetical position, near `isLegal*`).
- `packages/pokemon/src/__tests__/format-legality.test.ts` — add tests (if the
  file does not exist, create it; confirm the existing test file name first).

### Exact function to add (place near the other `isLegal*` public helpers)

```ts
/**
 * Result of a single-Pokemon format-legality check used by data-import
 * pipelines (RK9, Limitless). Flags whether the entry is legal in the given
 * format and, when not, the first reason it failed.
 */
export interface PokemonLegalityResult {
  isLegal: boolean;
  reason: string | null;
}

/**
 * Validate one Pokemon's species/item/ability/moves against a format, in
 * first-failure-wins order. Used at data-import time to flag illegal entries
 * WITHOUT dropping them.
 *
 * Fail-open by design: this composes the boolean `isLegal*` helpers, which
 * already collapse "unknown format" and "validator threw" into `true`. That
 * means an unrecognized or unavailable format yields `{ isLegal: true }`.
 * This intentionally diverges from this file's header note that gate-path
 * callers fail closed — the import requirement is "never drop data," so an
 * un-validatable entry is imported as legal rather than blocking the import.
 *
 * Empty / null item, ability, and moves are skipped (the helpers already
 * treat empty string as legal).
 *
 * Validation order: species, then held item, then ability, then each move.
 */
export function validatePokemonLegality(
  species: string,
  ability: string | null,
  heldItem: string | null,
  moves: string[] | null,
  formatId: string
): PokemonLegalityResult {
  // 1. Species
  if (!isLegalSpecies(species, formatId)) {
    return { isLegal: false, reason: `Illegal species: ${species}` };
  }

  // 2. Held item (skip when empty/null — isLegalItem also treats "" as legal)
  if (heldItem && !isLegalItem(heldItem, formatId)) {
    return { isLegal: false, reason: `Illegal item: ${heldItem}` };
  }

  // 3. Ability (skip when empty/null)
  if (ability && !isLegalAbility(ability, species, formatId)) {
    return { isLegal: false, reason: `Illegal ability: ${ability}` };
  }

  // 4. Moves (skip empty strings)
  for (const move of moves ?? []) {
    if (move && !isLegalMove(move, species, formatId)) {
      return { isLegal: false, reason: `Illegal move: ${move}` };
    }
  }

  return { isLegal: true, reason: null };
}
```

> Note the argument order into `isLegalAbility(ability, species, formatId)` and
> `isLegalMove(move, species, formatId)` — species is the **middle** argument and is
> required. Do not follow the original spec's `(x, formatId, species?)` shape.

### Barrel export

In `packages/pokemon/src/index.ts`, inside the existing `// Format legality` export
block, add:

```ts
  validatePokemonLegality,
  type PokemonLegalityResult,
```

### Tests to add

Use a real Champions format id `"gen9championsvgc2026regma"` (it has static legal
sets, so cases are deterministic). One assertion per branch:

1. **All legal** — a legal Champions species + legal ability + legal item + legal
   moves → `{ isLegal: true, reason: null }`.
2. **Illegal species** → `reason === "Illegal species: <name>"` (use a name not in
   the Champions species set, e.g. a Pokemon absent from Reg M-A).
3. **Illegal item** — legal species, an item not in the Champions item set (e.g.
   `"Life Orb"`, which the file comments confirm is absent) → `"Illegal item: Life Orb"`.
4. **Illegal ability** — legal species, an ability not on that species → first
   failure is the ability branch → `"Illegal ability: <name>"`.
5. **Illegal move** — legal species/item/ability, one bogus move → `"Illegal move: <name>"`.
6. **First-failure-wins** — illegal species AND illegal item supplied; result reason
   is the **species** message (species checked first).
7. **Null/empty fields skipped** — `ability=null, heldItem=null, moves=null` on a
   legal species → `{ isLegal: true, reason: null }`.
8. **Unknown format is permissive** — `formatId="totally-unknown-format"` with any
   inputs → `{ isLegal: true, reason: null }` (documents fail-open behavior).

### Done when

- [ ] `validatePokemonLegality` and `PokemonLegalityResult` are defined in
      `format-legality.ts` and exported from the barrel.
- [ ] All 8 test cases pass: `pnpm --filter @trainers/pokemon test` (optional locally;
      CI runs it).
- [ ] `pnpm typecheck` passes for the package (optional locally).

---

## Task 3 — Wire validation into `importEvent()`

Depends on **Task 1** (regenerated types) and **Task 2** (the function).

### Files to touch

- `packages/data-sources/src/rk9/import.ts`
- `packages/data-sources/src/rk9/__tests__/import.test.ts` (confirm the exact test
  file name under `packages/data-sources/src/rk9/__tests__/` first).

### Change 3a — import the validator

Add to the import block at the top of `import.ts` (monorepo-package import group):

```ts
import { validatePokemonLegality } from "@trainers/pokemon";
```

### Change 3b — fetch `format_id` near the start of `importEvent`

Inside `importEvent`, after the existing Step 1 `Promise.all` block (after the
`if (delErr) throw ...` line, around line 133), fetch the event's format:

```ts
  // Fetch the event's format so we can flag each Pokemon's legality at import
  // time. If this fails or is null, we fall back to treating every row as legal
  // (fail open) — we never block the import on a missing format.
  let formatId: string | null = null;
  {
    const { data: eventRow, error: eventErr } = await supabase
      .schema("rk9")
      .from("events")
      .select("format_id")
      .eq("id", eventId)
      .maybeSingle();
    if (eventErr) {
      // Non-fatal: log and proceed with formatId = null (everything legal).
      console.warn(
        `importEvent: could not load format_id for event ${eventId}: ${eventErr.message}`
      );
    } else {
      formatId = eventRow?.format_id ?? null;
    }
  }
```

> Confirm the exact column name on `rk9.events` is `format_id` (check the regenerated
> types from Task 1 or the events table). If the column is named differently, use the
> real name. Use `.maybeSingle()` so a missing event row yields `null`, not an error.

### Change 3c — extend the `allPokemonRows` element type

At the `allPokemonRows` declaration (around lines 369-379), add the two fields to the
inline array element type:

```ts
  const allPokemonRows: Array<{
    standing_id: number;
    position: number;
    species: string;
    species_raw: string;
    ability: string | null;
    held_item: string | null;
    tera_type: string | null;
    stat_alignment: string | null;
    moves: string[] | null;
    is_legal: boolean;
    legality_reason: string | null;
  }> = [];
```

### Change 3d — validate per row and populate the new fields

In the row-building loop (around lines 392-402), compute the resolved species once,
validate against it, and add the two fields. **Validate against the resolved
`species` slug, not `species_raw`** — the legality sets match canonical names (e.g.
`"Charizard-Mega-Y"`).

```ts
          const species = resolveSpeciesSlug(mon.speciesRaw, speciesMap);
          const ability = mon.ability || null;
          const heldItem = mon.heldItem || null;
          const moves = mon.moves.length > 0 ? mon.moves : null;

          // Fail open when we have no format (formatId === null): everything legal.
          const legality = formatId
            ? validatePokemonLegality(species, ability, heldItem, moves, formatId)
            : { isLegal: true, reason: null };

          allPokemonRows.push({
            standing_id: standingId,
            position: pos + 1,
            species,
            species_raw: mon.speciesRaw,
            ability,
            held_item: heldItem,
            tera_type: mon.teraType || null,
            stat_alignment: mon.statAlignment ?? null,
            moves,
            is_legal: legality.isLegal,
            legality_reason: legality.reason,
          });
```

> This refactors the existing inline expressions (`resolveSpeciesSlug(...)`,
> `mon.ability || null`, etc.) into locals so the same `species` value feeds both
> validation and the row. Keep the surrounding loop structure unchanged.

### Tests to add / update

In the rk9 import test file:

1. **Legal team is flagged legal** — mock `rk9.events` to return a known
   `format_id` (e.g. `"gen9championsvgc2026regma"`); import a roster + one team whose
   Pokemon are all legal; assert the inserted `team_pokemon` rows have
   `is_legal: true` and `legality_reason: null`.
2. **Illegal entry is flagged but still inserted** — same setup, but one Pokemon has
   an illegal item/ability; assert that row is **still inserted** (count unchanged)
   AND has `is_legal: false` with the matching `legality_reason`.
3. **Null format_id → all legal** — mock `rk9.events` to return `format_id: null`;
   assert all rows are `is_legal: true` regardless of contents (fail open).
4. **format_id fetch error → all legal, import not blocked** — mock the events query
   to return an error; assert the import still completes and rows are `is_legal: true`.

> Match the existing Supabase mock shape in this test file. Confirm whether the
> events query is mocked via a chained `.maybeSingle()` and add that to the mock.

### Done when

- [ ] `importEvent` fetches `format_id` once at the start, fail-open on error/null.
- [ ] Every inserted `team_pokemon` row carries `is_legal` and `legality_reason`.
- [ ] Validation uses the resolved `species` slug, not `species_raw`.
- [ ] The 4 test cases above pass: `pnpm --filter @trainers/data-sources test`
      (optional locally; CI runs it).
- [ ] `pnpm typecheck` passes (the new fields must match the regenerated Insert type).

---

## Task 4 — ETL filter: exclude illegal entries from usage stats

Depends on **Task 1** (the `is_legal` column must exist).

### Files to touch

- `packages/supabase/src/mutations/usage.ts`
- The corresponding usage test file (confirm its path under
  `packages/supabase/src/**/__tests__/` — likely `mutations/__tests__/usage.test.ts`).

### Exact change

In `readRawTeamRows`, the `case "rk9":` branch (around lines 470-476), add an
`.eq("is_legal", true)` after the existing `.eq("standings.event_id", eventId)`:

```ts
      const { data, error } = await supabase
        .schema("rk9")
        .from("team_pokemon")
        .select(
          "standing_id, species, ability, held_item, tera_type, moves, stat_alignment, standings!inner(id, division, event_id)"
        )
        .eq("standings.event_id", eventId)
        .eq("is_legal", true);
```

> Only the rk9 branch changes. Do **not** touch the `limitless` branch — it reads a
> different table that does not have this column (unless a parallel change has added
> it; if so, leave it out of scope for this task).

### Tests to add / update

1. **Illegal rows excluded** — in the usage test for the rk9 source, seed/mock
   `rk9.team_pokemon` rows where some have `is_legal: false`; assert the computed
   usage only counts the `is_legal: true` rows.
2. If the existing mock asserts the exact query filter chain, update it to expect the
   added `.eq("is_legal", true)`.

### Done when

- [ ] The rk9 usage query includes `.eq("is_legal", true)`.
- [ ] The limitless branch is unchanged.
- [ ] Usage test confirms illegal rows are excluded from the computed stats:
      `pnpm --filter @trainers/supabase test` (optional locally; CI runs it).

---

## Execution Notes

- Use **subagent-driven development** to execute these tasks (per project workflow
  rules) — fresh subagent per task, two-stage review.
- Respect the dependency graph: Tasks 1 and 2 first (parallelizable), then Task 3
  (needs 1 + 2), Task 4 needs only Task 1.
- **Commit between tasks** — one coherent commit per task makes `git log` useful.
- After pushing, **check CI** and enumerate each check (lint, typecheck, test, e2e)
  by name with pass/fail before declaring done. Do not run the full suite locally as
  a gate — offload to CI.
- Do not add a "deferred / follow-up" bucket — every item above is in scope now.
