# Decision + Implementation Plan: `pokemon_nature` enum

**Date:** 2026-07-01 · **Branch:** `feat/limitless-nature-and-mb` (PR #379) · **Status:** Locked — ready to implement

---

## TL;DR

Convert the free-form `nature` text columns across the DB into a shared,
Title-Case Postgres enum `public.pokemon_nature` (the 25 canonical natures).
Importers coerce unknown values to `NULL` before insert so a surprise third-party
value can never fail an import. This is a self-contained spec: each wave below can
be executed from this file alone.

---

## Locked decisions (do not re-litigate)

1. **Mechanism:** one shared Postgres enum `public.pokemon_nature`.
2. **Scope:** every scalar nature column (6 of them, table below), **including**
   RK9's `stat_alignment` (nature under another name) and `team_slots.nature`.
3. **Casing:** **Title Case bare names** — `'Jolly'` (not `'jolly'`, not
   `'Jolly Nature'`). Matches `@pkmn`/Showdown, our `ALL_NATURES`/`isNature()`,
   Showdown export, and existing rows → **zero re-casing at any boundary**.
4. **Ingestion safety (NON-NEGOTIABLE):** importers coerce invalid/unknown → `NULL`
   via `isNature()` **before** insert. A cosmetic field must never fail an import
   (that is the failure class this PR already fixed for the M-B format code).
5. **Migration hygiene:** a NEW migration does all the work. Do **not** edit the
   committed `20260627030045_limitless_team_pokemon_nature.sql` — its column is just
   re-typed by the new migration along with the others.
6. **Excluded:** `public.pokemon_detail_stats.natures` is a `jsonb` **array** of
   aggregated usage, not a scalar — leave it untouched.

---

## The 25 enum values (Title Case — copy verbatim, order = `ALL_NATURES`)

```
Hardy, Lonely, Brave, Adamant, Naughty, Bold, Docile, Relaxed, Impish, Lax,
Timid, Hasty, Serious, Jolly, Naive, Modest, Mild, Quiet, Bashful, Rash,
Calm, Gentle, Sassy, Careful, Quirky
```

Canonical source of truth in code: `packages/pokemon/src/stats-calculator.ts`
(`ALL_NATURES`, `ALL_NATURES_SET`, `type Nature`, `isNature()`).

---

## Columns to convert (confirm schema qualifiers by reading the cited migration)

| # | Table.column | Nullable? | Defined in | Coerce-on-cast rule |
|---|---|---|---|---|
| 1 | `public.pokemon.nature` | **NOT NULL**, no default | `00000000000000_baseline.sql:792` | invalid → `'Hardy'` (can't null a NOT NULL col) |
| 2 | `public.team_pokemon.nature` (builder) | nullable, no default | `20260409214302_team_builder_schema.sql:77` | invalid → `NULL` |
| 3 | `public.tournament_team_sheets.nature` | nullable | `20260605020000_tournament_team_sheets_nature.sql` | invalid → `NULL` |
| 4 | `limitless.team_pokemon.nature` | nullable | `20260627030045_limitless_team_pokemon_nature.sql` | invalid → `NULL` |
| 5 | `team_slots.nature` | nullable | `20260610005051_create_team_slots.sql:51` | invalid → `NULL` (+ RPC edits, see 1a step 3) |
| 6 | `rk9.team_pokemon.stat_alignment` | nullable | `20260603213904_rk9_team_pokemon_stat_alignment.sql` | invalid → `NULL` (column keeps its name) |

---

## Execution: waves + parallelism (governing directive)

**Maximize parallelism — dispatch everything independent in one message; sequence
ONLY true dependencies. Disjoint file allowlists per agent (no two touch the same
file). Orchestrator commits between waves; subagents never commit. Implementers
implement only (no self-validation) and return `{ whatIChanged, howToVerify }`;
the orchestrator applies the migration, regenerates types, then fans the
`howToVerify` steps to parallel Haiku verifiers (which run the prescribed checks,
never invent them). E2E stays CI-verified.**

```
  ┌─ 1a  Migration          ─┐
  │  (migration file only)    │            ┌─ 2  Fix enum-type ripples ─┐
  ├─ 1b  Coercion + natures  ─┤ ─▶ APPLY ─▶ │  (files tsc flags)          │ ─▶ commit ─▶ push ─▶ CI
  │  (pokemon + supabase src) │   db:reset  ├─ verifiers (haiku, //)      │
  └───────────────────────────┘   +regen   └─ reviewers (migration+db,//)┘
     ▲ fully parallel               types.ts   ▲ parallel again after regen
```

- **Fully parallel now:** 1a ∥ 1b — different packages/files, no ordering between them.
- **The one hard chain:** `1a → apply migration (pnpm db:reset) → regen types
  (pnpm generate-types) → Wave 2`. Wave 2 (ripple fixes) needs the regenerated
  `types.ts` because the ripples *are* the new enum type. Only one agent may touch
  the local DB at a time, so apply+regen is a single serialized step (a Haiku
  running the two commands one at a time).
- **Parallel again after regen:** Wave 2 ∥ Haiku verifiers ∥ read-only reviewers.

| Wave | Task | Model | Files owned (disjoint) |
|---|---|---|---|
| 1a | Author the migration | sonnet | the new migration file only |
| 1b | Coercion + zero-dep `natures` extraction | sonnet | `packages/pokemon/src/natures.ts` (new), `stats-calculator.ts`, `packages/pokemon/src/index.ts`, `packages/pokemon/package.json`, `sources/limitless/import.ts`, `sources/limitless/__tests__/import.test.ts`, `sources/rk9/worker.ts`, `sources/rk9/import.ts` (+ nearest rk9 test) |
| apply | `pnpm db:reset` then `pnpm generate-types`, one command at a time | haiku | `packages/supabase/src/types.ts` (generated) |
| 2 | Fix enum-type typecheck ripples | sonnet | whatever `tsc` flags (allowlist set after regen) |
| review | `migration-reviewer` + `reviewing-database` | sonnet | read-only |

---

## Wave 1a — the migration

**File:** `packages/supabase/supabase/migrations/<UTC>_pokemon_nature_enum.sql`
(prefix from `date -u +%Y%m%d%H%M%S`; must sort after `20260627030045`).
Follow `create-migration` + `supabase-migrations` conventions. Idempotent (preview
branches replay all migrations on a fresh DB).

**Step 1 — create the enum (idempotent):**
```sql
DO $$ BEGIN
  CREATE TYPE public.pokemon_nature AS ENUM (
    'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
    'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
    'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

**Step 2 — convert each column (coerce invalid first, then ALTER TYPE):**
- Nullable columns (#2–#6):
  ```sql
  UPDATE <table> SET <col> = NULL
    WHERE <col> IS NOT NULL AND <col>::text NOT IN (<25 quoted values>);
  ALTER TABLE <table> ALTER COLUMN <col> TYPE public.pokemon_nature
    USING <col>::public.pokemon_nature;
  ```
- NOT NULL column (#1 `public.pokemon.nature`):
  ```sql
  UPDATE public.pokemon SET nature = 'Hardy' WHERE nature NOT IN (<25>);
  ALTER TABLE public.pokemon ALTER COLUMN nature TYPE public.pokemon_nature
    USING nature::public.pokemon_nature;
  ```
- Before each `ALTER`, check for a column `DEFAULT`; if any nature column has one,
  `ALTER COLUMN … DROP DEFAULT` before the type change and re-add a recast default
  after (none expected — verify while reading each source migration).

**Step 3 — fix the two `team_slots` usage RPCs (this is the subtle part):**
Both live in `20260610005051_create_team_slots.sql`. They do NOT return `nature`
as a scalar — they aggregate it into a `natures jsonb` histogram. `CREATE OR
REPLACE` each with its full current body, changing ONLY the nature-read expression
to cast `::text`:

- `public.get_usage_pipeline(...)` — CTE `species_hist_nature` (~L374-381):
  `nature AS value` → `nature::text AS value`, and make its `GROUP BY` match
  (`GROUP BY species, nature::text, sc.player_count`).
- `public.get_species_usage_detail(...)` — CTE `detail_hist_nature` (~L765-772):
  `ds.nature AS value` → `ds.nature::text AS value`, `GROUP BY` to match.
- Also cast any other raw `nature` read inside those two functions that flows into
  a jsonb `value` or an `ORDER BY value` (e.g. the `ts.nature` / `s.nature` selects
  at ~L318, ~L660, ~L732) to `::text`. Read the full bodies to be exhaustive.

**WHY the `::text` cast is mandatory (not cosmetic):** the histograms sort with
`ORDER BY h.value ASC`. A `text` value sorts **alphabetically** (today's behavior);
an **enum** value sorts by **declaration order** (Hardy, Lonely, Brave, …). Leaving
`value` as the enum would silently reorder every nature histogram on `/data`.
Casting `nature::text` keeps `value` text so ordering + `jsonb_build_object` output
stay byte-identical. The functions' `RETURNS TABLE (… natures jsonb …)` signatures
are unchanged, so downstream consumers/types are unaffected.

**1a returns:** `{ whatIChanged, filesChanged:[migration path], howToVerify }`.
`howToVerify` = `pnpm db:reset` (replays clean), `pnpm generate-types` (nature cols
show enum type), `pnpm db:advisor`/`get_advisors` clean. **1a does NOT run these.**

---

## Wave 1b — importer coercion + zero-dep `natures` module

**Part A — extract a bundle-safe nature module** (so importing the guard never drags
`@pkmn/dex`). `isNature` currently lives in `stats-calculator.ts`, which imports
`@pkmn/dex` at module top — importing it from the barrel would pull `@pkmn/dex`
into any esbuild-vendored edge bundle (see `vendor-esbuild-externals` /
`supabase-scraper-barrel-boundary` learnings → 121 `node:` resolve errors).

- Create `packages/pokemon/src/natures.ts` with **zero imports**: move
  `ALL_NATURES`, `ALL_NATURES_SET`, `type Nature`, and `isNature()` here.
- `stats-calculator.ts` re-imports them from `./natures` (keep its `NATURE_EFFECTS`,
  multipliers, etc. — those stay).
- `packages/pokemon/src/index.ts`: re-export `isNature`, `ALL_NATURES`, `Nature`
  from `./natures` (barrel API unchanged for existing consumers).
- If `@trainers/pokemon` uses a package `exports` map, add a `./natures` subpath so
  the pure module is importable directly.

**Part B — coerce in every importer write site** (`@trainers/pokemon` is already a
`workspace:*` dep of `@trainers/supabase` — no dep to add). Import the guard from
the pure path (`@trainers/pokemon/natures` if the subpath exists, else the barrel;
whichever is confirmed bundle-safe for these files' runtime):

- `packages/supabase/src/sources/limitless/import.ts:369` —
  `nature: mon.nature ?? null` → `nature: isNature(mon.nature) ? mon.nature : null`.
- `packages/supabase/src/sources/rk9/worker.ts:561` —
  `stat_alignment: mon.statAlignment ?? null` → `stat_alignment: isNature(mon.statAlignment) ? mon.statAlignment : null`.
- `packages/supabase/src/sources/rk9/import.ts:459` — same coercion as worker.ts.
  (RK9 has two insert sites; coerce both. If one is dead code, note it in the report.)

**Part C — tests (write, don't run):**
- `sources/limitless/__tests__/import.test.ts`: add a case asserting an unknown
  nature (e.g. `"NotANature"`) inserts `null`, alongside existing `"Jolly"` and
  `undefined → null` cases.
- Add/extend the nearest RK9 test to assert invalid `stat_alignment` → `null`.

**Runtime check:** confirm where these importers actually run (per the
`autonomous-import-architecture` learning they run in a Next.js/Vercel **Node**
route, where `@pkmn/dex` resolves fine; but the scraper paths may be esbuild-
vendored). Use `managing-edge-imports` to pick the import that is safe for the
actual runtime, and flag in the report if resolution needs an import-map change.

**1b returns:** `{ whatIChanged, filesChanged, howToVerify }`. `howToVerify` =
`pnpm --filter @trainers/pokemon test`, `pnpm --filter @trainers/supabase test -- limitless`,
`pnpm --filter @trainers/supabase test -- rk9`, plus a typecheck of the touched packages.

---

## Apply + regenerate types (serialized, between waves — Haiku, one cmd at a time)

1. `pnpm db:reset` — must replay all migrations cleanly on a fresh DB.
2. `pnpm generate-types` — regenerates `packages/supabase/src/types.ts`; every
   nature column should now show `Database[...]["Enums"]["pokemon_nature"]`.
Commit the regenerated `types.ts`. If local Supabase is unavailable, report it —
CI's Supabase Preview replays migrations and is authoritative for the SQL, but
`types.ts` must still be regenerated and committed for CI typecheck to pass.

---

## Wave 2 — enum-type ripples

After regen, `nature` columns are the enum string-union (a narrowing of `string`).
Reads are fine; **writes** that assign an arbitrary `string` to a nature column
(builder write paths, some tests) may now `tsc`-error. Fix whatever the scoped
typecheck flags — constrain/validate those values to `Nature`. Allowlist is
whatever `tsc` reports (unknown until regen — that is why this wave is last).

---

## Verification (grounded in implementer `howToVerify`; run by Haiku verifiers)

- Migration: `pnpm db:reset` clean · `pnpm generate-types` shows enum · advisors clean.
- Coercion: `@trainers/supabase` limitless + rk9 suites green (incl. new invalid→null cases).
- Ripples: `@trainers/web` + `@trainers/supabase` + `@trainers/pokemon` typecheck green.
- Reviewers: `migration-reviewer` + `reviewing-database` (parallel, read-only).
- **CI is authoritative** (incl. Supabase Preview replay). E2E via CI only.

---

## Out of scope / still open on this PR

PR #379's **E2E timeout** is unresolved: the E2E job is cancelled at the 15-min cap
(`.github/workflows/ci.yml:688`); a forensic read of the killed run found ~7 tests
genuinely **timing out/failing** (not merely slow), and the specific titles (incl.
whether the builder-landing seeded-draft tests are among them) weren't recoverable
from the cancelled run. Revisit after the nature-enum work — likely needs either a
higher `timeout-minutes`, or fixing/quarantining the timing-out tests, or both.
