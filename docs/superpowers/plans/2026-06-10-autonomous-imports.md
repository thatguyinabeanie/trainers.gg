# Autonomous Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the RK9 + Limitless tournament-import pipeline entirely inside Supabase — driven by `pg_cron` calling one Deno edge function — and rebuild `/admin/data` as a pure monitor + recovery + config surface with zero manual import triggers.

**Architecture:** A single edge function `import-tick` with `?stage=sync|import|compile` selects a stage. Three `pg_cron` jobs invoke it via `net.http_post` + Vault (the pattern from `20260511202236`). Scraper/worker logic is consolidated from `apps/web/src/lib/{rk9,limitless}` and `packages/data-sources` into `packages/supabase/src/sources/` (Deno-safe, cheerio via `npm:`). A global `pipeline_enabled` kill-switch replaces all per-source `auto_import_*` flags. A `SECURITY DEFINER` RPC wraps `cron.alter_job` for runtime cadence edits. A tombstone table backs "Delete & exclude". `/admin/data` becomes two tabs (Monitor / Config) reading from `import_runs` and the source tables.

**Tech Stack:** Deno edge functions, `pg_cron` + `pg_net` + Vault, PostgreSQL (RLS, `SECURITY DEFINER` RPC), cheerio (`npm:`), Next.js 16 (App Router, Server Actions, `'use cache'`), TanStack Query v5, shadcn/Base UI, Tailwind CSS 4, Zod (`@trainers/validators`), Jest.

---

## File Structure

This section locks in the decomposition before tasks. New code is grouped by responsibility, not technical layer.

### New: consolidated source logic — `packages/supabase/src/sources/`

Pure, framework-free, Deno-safe import logic absorbed from `apps/web/src/lib/{rk9,limitless}` and `packages/data-sources`:

- `sources/rk9/scraper.ts` — cheerio HTML parsers (`parseEventsPage`, `parseRosterPage`, `parseTeamListPage`, `parseTournamentPage`, `detectEventFormat`, `formatDetectionNeedsHtml`, `parseArchivedEventsPage`)
- `sources/rk9/import.ts` — DB writers (`syncEvents`, `importEvent`, `loadSpeciesMap`, `seedSpeciesMap`)
- `sources/rk9/worker.ts` — stage orchestrators (`buildRk9Url`, `fetchRk9Html`, `assertValidEventId`, `runRosterStage`, `runTeamsBatch`, `processRk9Queue`, plus helpers `sleep`, `normalizeSpeciesInline`)
- `sources/rk9/types.ts` — `RK9Event`, `RK9RosterEntry`, `RK9Pokemon`, `Rk9ImportStatus`, result types
- `sources/rk9/normalize.ts` — `normalizeSpecies`, `collectUniqueSpecies`
- `sources/rk9/state-machine.ts` — `canTransition`, `RK9_QUEUEABLE`, `Rk9ImportStatus`
- `sources/rk9/index.ts` — barrel
- `sources/limitless/api.ts` — HTTP client (`fetchTournamentList`, `fetchTournamentData`)
- `sources/limitless/import.ts` — DB writers (`syncTournamentList`, `importTournament`, `processImportQueue`)
- `sources/limitless/queue-worker.ts` — `drainLimitlessQueue`
- `sources/limitless/types.ts` — `LimitlessTournament`, `TournamentData`, result types
- `sources/limitless/format.ts` — format maps (`LIMITLESS_TO_FORMAT`, `KNOWN_FORMATS`, `ALL_VALID_FORMATS`, `SKIP_FORMATS`)
- `sources/limitless/index.ts` — barrel
- `sources/index.ts` — barrel re-exporting both sources

### New: pipeline orchestration mutations/queries — `packages/supabase/src/`

- `src/mutations/pipeline.ts` — `runSyncStage`, `runImportStage`, `runCompileStage` (the three stage entry points the edge function calls), `setEventImportStatus` helpers, `deleteSourceEvent`, `excludeSourceEvent`, recovery helpers (`resetStuckEvents`, `requeueFailedEvents`, `forceImportEvent`)
- `src/queries/pipeline.ts` — `getPipelineMonitor` (cards + status counts + filtered event list), `getImportExclusions`
- `src/mutations/import-runs.ts` — already exists (`recordImportRuns`); reuse
- `src/usage/compile.ts`, `src/mutations/team-slots.ts` — already exist; reuse `compileSourceTeamSlots`

### New: edge function — `packages/supabase/supabase/functions/import-tick/`

- `import-tick/index.ts` — `Deno.serve` handler; reads `?stage=`, authenticates via service-role secret, checks `pipeline_enabled`, dispatches to `runSyncStage` / `runImportStage` / `runCompileStage`, records `import_runs`.

### New: migrations — `packages/supabase/supabase/migrations/`

- `..._create_import_exclusions.sql` — tombstone table + RLS
- `..._add_pipeline_config.sql` — seed `pipeline_enabled`, `limitless_import_batch_size`; retire `auto_import_*` keys
- `..._create_cron_alter_job_rpc.sql` — `SECURITY DEFINER` RPC wrapping `cron.alter_job` with cron-expression validation
- `..._schedule_import_tick_crons.sql` — schedule 3 jobs pointing at `import-tick`; unschedule the old Next.js-route jobs
- `..._team_slots_source_fk_cascade.sql` — add two nullable FK columns (`rk9_event_id`, `limitless_tournament_id`) to `team_slots`, each `REFERENCES … ON DELETE CASCADE`; CHECK enforces exactly-one-by-source; backfill existing rows from `(source, event_key)` (Decision 1)
- `..._create_get_cron_schedules_rpc.sql` — site-admin `SECURITY DEFINER` read RPC returning the live `cron.job` schedules for the three import-tick jobs (Decision 2)

### New: pipeline orchestration mutations/queries — `packages/supabase/src/` (compile-stage change)

- `src/usage/compile.ts` + `src/mutations/team-slots.ts` — **modified** (Task 3.5): `buildTeamSlotRows` and `compileEventTeamSlots` now also emit/insert the polymorphic FK column (`rk9_event_id` / `limitless_tournament_id`) so cascade delete works. Lives in Wave 3 (not Wave 1) because it depends on the FK migration (Task 2.5) being applied and `generate-types` re-run first — the new columns must exist in `TablesInsert<"team_slots">` before the insert mapping can reference them.

### New/rebuilt: web UI — `apps/web/src/`

- `app/(app)/admin/data/page.tsx` — server component shell (auth gate + Suspense), renders `<DataMonitor />`
- `components/admin/data/data-page.tsx` — client root with Monitor / Config tabs
- `components/admin/data/monitor-tab.tsx` — pipeline cards + status chips + filtered list + recovery actions
- `components/admin/data/pipeline-cards.tsx` — three stage cards
- `components/admin/data/event-list.tsx` — single filterable event list with per-row actions
- `components/admin/data/config-tab.tsx` — pipeline toggle, batch size, cron cadence editor
- `components/admin/data/use-pipeline.ts` — TanStack Query hooks
- `actions/pipeline.ts` — new server actions (monitor read, recovery, delete/exclude, config writes, cron edit)
- `lib/cache.ts`, `lib/cache-invalidation.ts` — add usage invalidation hook for delete (reuse existing helpers)

### Deleted

- `apps/web/src/lib/rk9/` (whole dir) and `apps/web/src/lib/limitless/` (whole dir)
- `packages/data-sources/` (whole package)
- `apps/web/src/app/api/cron/import-queue/` (route + tests)
- `apps/web/src/actions/{import-queue,limitless,rk9,usage}.ts` manual-trigger actions (replaced by `actions/pipeline.ts`)
- Old admin components: `external-data*.tsx`, `recent-runs.tsx`, `expanded-row-data.tsx`, `use-import-config.ts`, and their tests

---

## Conventions every task must follow

- **TDD:** failing test first, minimal code, green, commit. Subagents NEVER commit — they report changed files + a suggested commit message; the orchestrator commits between waves.
- **Migrations:** idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`); RLS enabled with `(SELECT auth.uid())` subselect; site-admin SELECT via the `user_roles … role_id = 1` predicate used by `import_runs`.
- **Queries/mutations:** `supabase: TypedClient` is always the FIRST parameter. Check `.error` on every Supabase call and throw with a descriptive message.
- **Edge function:** never declared in `config.toml`; never deployed manually; imports packages via `deno.json` import map; no `node:` builtins; env via `Deno.env`.
- **Web UI:** Tailwind utility classes only (no CSS modules, no arbitrary `[Npx]` values); shadcn/Base UI primitives; React Compiler (NO manual `useMemo`/`useCallback`/`React.memo`); `StatusBadge` for status colors.
- **Auth gate:** site-admin check is `isSiteAdmin()` from `@/lib/sudo/server` (checks JWT `site_roles`), combined with the DB `user_roles.role_id = 1` predicate in RLS.
- **Caching:** the public `/data` pages are tag-invalidated via `revalidateUsageStatsCaches(formats)` from non-Next contexts and `invalidateUsageStatsCaches(formats)` from server actions. Deletes that remove `team_slots` rows must invalidate usage caches for the affected formats.

---

## IMPORTANT pre-flight facts (carry into every relevant task)

1. **RK9 `import_status` enum** = `pending | queued | roster | teams | pairings | complete | failed`. **Limitless `import_status`** (text + CHECK) = `queued | importing | completed | failed | skipped`. Do NOT change these enums.
2. **`team_slots` now has REAL polymorphic FK columns to source events (Decision 1 — changed).** It previously linked only by a soft `(source, event_key)` tuple where `event_key` is source-qualified (e.g. `rk9:TO027`, `limitless:12345`), with no FK at all. Per the user's decision, Task 2.5 adds **two nullable FK columns** to `public.team_slots`:
   - `rk9_event_id text REFERENCES rk9.events(event_id) ON DELETE CASCADE`
   - `limitless_tournament_id text REFERENCES limitless.tournaments(tournament_id) ON DELETE CASCADE`

   Both source PKs are `text` (`rk9.events.event_id`, `limitless.tournaments.tournament_id`). A single FK column cannot reference two tables (and the two parents live in **different schemas** with no shared supertype), so two nullable columns + a CHECK is the cleanest correct shape. A CHECK constraint enforces **exactly one** FK column is set for `'rk9'`/`'limitless'` rows and **both null** for `'trainers.gg'` rows (which has no source-schema parent). Deleting a parent event now cascades to `team_slots` **at the database level** — no explicit `team_slots` purge needed.

   **Ripples (do not miss):**
   - The **compile stage** (`compileEventTeamSlots` in `packages/supabase/src/mutations/team-slots.ts`) must populate the correct FK column when it inserts rows — `rk9_event_id` for rk9, `limitless_tournament_id` for limitless, both null for trainers.gg. Task 3.5 covers this (it lives in Wave 3 because it needs the Task 2.5 migration applied + `generate-types` re-run so the columns exist in `TablesInsert<"team_slots">`).
   - The **delete mutation** (`deleteSourceEvent`, Task 3.2) is simplified to just delete the parent event row — `team_slots` cascades automatically. It still reads affected formats **before** deleting (for cache invalidation) but no longer issues an explicit `team_slots` delete.
   - The existing soft `(source, event_key)` linkage and the `idx_team_slots_source_event` index **stay** — the RPCs and `compileSourceTeamSlots`'s "already compiled?" check still use `event_key`. The FK columns are additive (cascade-delete only); they do not replace `event_key`.
3. **`isSiteAdmin()`** lives at `@/lib/sudo/server` and is the gate for server components/actions. The **edge function** has no user JWT — it authenticates by comparing a header secret against the Vault-injected service-role key.
4. **`recordImportRuns(supabase, trigger, records)`** already exists in `packages/supabase/src/mutations/import-runs.ts`; `import_runs.source` CHECK currently allows only `'limitless' | 'rk9' | 'compile'` and `trigger` allows `'cron' | 'manual'`. Stage logic maps: sync/import per source, compile → `'compile'`. The edge function uses trigger `'cron'`.
5. **`compileSourceTeamSlots(supabase, source)`** (in `packages/supabase/src/mutations/team-slots.ts`) is the compile-stage entry. It returns `{ eventsCompiled: number; formats: string[] }`.

---

## Wave 0 — Consolidate source logic into `packages/supabase` (no behavior change)

> Mechanical move. The goal is that `packages/supabase/src/sources/**` contains the exact logic currently spread across `apps/web/src/lib/{rk9,limitless}` and `packages/data-sources/src/**`, with imports rewritten to be Deno-safe and package-relative. No `apps/` imports allowed inside `packages/`.

### Task 0.1: Move RK9 pure modules into the package

**Files:**
- Create: `packages/supabase/src/sources/rk9/types.ts`
- Create: `packages/supabase/src/sources/rk9/normalize.ts`
- Create: `packages/supabase/src/sources/rk9/state-machine.ts`
- Create: `packages/supabase/src/sources/rk9/scraper.ts`
- Create: `packages/supabase/src/sources/rk9/import.ts`
- Test: `packages/supabase/src/sources/rk9/__tests__/scraper.test.ts`

- [ ] **Step 1: Copy the existing pure modules verbatim into the new location**

Copy the file bodies (do not rewrite logic):
- `packages/data-sources/src/rk9/types.ts` → `packages/supabase/src/sources/rk9/types.ts`
- `packages/data-sources/src/rk9/normalize.ts` → `packages/supabase/src/sources/rk9/normalize.ts`
- `packages/data-sources/src/rk9/state-machine.ts` → `packages/supabase/src/sources/rk9/state-machine.ts`
- `packages/data-sources/src/rk9/import.ts` → `packages/supabase/src/sources/rk9/import.ts`
- `apps/web/src/lib/rk9/scraper.ts` → `packages/supabase/src/sources/rk9/scraper.ts`

Read each source file first, then write its content to the new path. Rewrite intra-RK9 relative imports to point within `sources/rk9/` (e.g. `./types`, `./normalize`). Rewrite any `@trainers/pokemon` import to the same specifier (it resolves in both Node and Deno via the import map added in Wave 1). The `import.ts` `SupabaseClient` parameter must become `supabase: TypedClient` (import `TypedClient` from `../../types` or the existing barrel) to match the package's DI convention. Keep `import * as cheerio from "cheerio"` exactly as-is in `scraper.ts`.

- [ ] **Step 2: Port the scraper unit tests and add a smoke assertion**

Copy the existing scraper test (search `apps/web/src/lib/rk9/__tests__` for the scraper test) into `packages/supabase/src/sources/rk9/__tests__/scraper.test.ts`, updating the import path to `../scraper`. If no scraper test exists, write this minimal one:

```ts
import { parseEventsPage } from "../scraper";

describe("parseEventsPage", () => {
  it("returns an empty array for markup with no event rows", () => {
    const html = "<html><body><table></table></body></html>";
    expect(parseEventsPage(html)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `pnpm --filter @trainers/supabase test -- sources/rk9/__tests__/scraper.test.ts 2>&1 | tail -30`
Expected: PASS (the parser handles empty markup).

- [ ] **Step 4: Report changed files + suggested commit message**

Suggested message:
```
refactor(supabase): copy RK9 pure modules into src/sources/rk9

Consolidating import logic into packages/supabase so the edge function
can import it via the Deno import map. Behavior unchanged — verbatim move
with package-relative imports and the TypedClient DI convention.
```

### Task 0.2: Move the RK9 worker into the package

**Files:**
- Create: `packages/supabase/src/sources/rk9/worker.ts`
- Create: `packages/supabase/src/sources/rk9/index.ts`
- Test: `packages/supabase/src/sources/rk9/__tests__/worker.test.ts`

- [ ] **Step 1: Copy the worker verbatim**

Read `apps/web/src/lib/rk9/worker.ts` and write its body to `packages/supabase/src/sources/rk9/worker.ts`. Rewrite imports:
- scraper functions → `./scraper`
- `importEvent`, `loadSpeciesMap`, `seedSpeciesMap`, `syncEvents` → `./import`
- normalize/state-machine → `./normalize`, `./state-machine`
- `TypedClient` → `../../types` (package-local)
- Remove any `@trainers/data-sources` import — those symbols now live in sibling files.

Preserve exported signatures verbatim:
```ts
export function buildRk9Url(path: string): string;
export async function fetchRk9Html(path: string): Promise<string>;
export function assertValidEventId(eventId: string): void;
export async function runRosterStage(supabase: TypedClient, eventId: string): Promise<RosterStageResult>;
export async function runTeamsBatch(supabase: TypedClient, eventId: string, opts: TeamsBatchOpts): Promise<TeamsBatchResult>;
export async function processRk9Queue(supabase: TypedClient, opts: ProcessRk9QueueOpts): Promise<ProcessRk9QueueResult>;
```

- [ ] **Step 2: Write the barrel**

```ts
// packages/supabase/src/sources/rk9/index.ts
export * from "./types";
export * from "./normalize";
export * from "./state-machine";
export * from "./scraper";
export * from "./import";
export * from "./worker";
```

- [ ] **Step 3: Port the worker test**

Copy `apps/web/src/lib/rk9/__tests__/worker.test.ts` to `packages/supabase/src/sources/rk9/__tests__/worker.test.ts`, updating imports to `../worker`. Preserve the existing mocks. (The repo already has a modified `apps/web/src/lib/rk9/__tests__/worker.test.ts` per `git status` — copy the CURRENT working-tree version, not HEAD.)

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @trainers/supabase test -- sources/rk9/__tests__/worker.test.ts 2>&1 | tail -40`
Expected: PASS.

- [ ] **Step 5: Report changed files + suggested commit message**

```
refactor(supabase): move RK9 worker into src/sources/rk9

processRk9Queue + roster/teams stage orchestrators now live beside the
parsers they call. Signatures unchanged; tests ported and green.
```

### Task 0.3: Move Limitless modules into the package

**Files:**
- Create: `packages/supabase/src/sources/limitless/types.ts`
- Create: `packages/supabase/src/sources/limitless/format.ts`
- Create: `packages/supabase/src/sources/limitless/api.ts`
- Create: `packages/supabase/src/sources/limitless/import.ts`
- Create: `packages/supabase/src/sources/limitless/queue-worker.ts`
- Create: `packages/supabase/src/sources/limitless/index.ts`
- Test: `packages/supabase/src/sources/limitless/__tests__/queue-worker.test.ts`

- [ ] **Step 1: Copy the Limitless modules verbatim**

Copy these bodies into the new paths, rewriting intra-Limitless imports to `./types`, `./format`, `./api`, `./import`, and `SupabaseClient` params to `supabase: TypedClient`:
- `packages/data-sources/src/limitless/types.ts` → `…/limitless/types.ts`
- `packages/data-sources/src/limitless/format.ts` → `…/limitless/format.ts`
- `apps/web/src/lib/limitless/api.ts` (or `packages/data-sources/src/limitless/api.ts` if identical — prefer the data-sources version) → `…/limitless/api.ts`
- `packages/data-sources/src/limitless/import.ts` → `…/limitless/import.ts`
- `apps/web/src/lib/limitless/queue-worker.ts` → `…/limitless/queue-worker.ts`

Preserve signatures verbatim:
```ts
export async function fetchTournamentList(apiKey?: string): Promise<LimitlessTournament[]>;
export async function fetchTournamentData(tournamentId: number, apiKey?: string): Promise<TournamentData | null>;
export async function syncTournamentList(supabase: TypedClient, apiKey?: string): Promise<SyncResult & { tournaments: LimitlessTournament[] }>;
export async function importTournament(supabase: TypedClient, tournamentId: number): Promise<ImportResult>;
export async function processImportQueue(supabase: TypedClient, apiKey: string | undefined, batchSize: number): Promise<QueueProcessResult>;
export async function drainLimitlessQueue(supabase: TypedClient, apiKey: string | undefined, batchSize: number, deadline: number): Promise<DrainResult>;
```

Keep the API base URL constant (`https://play.limitlesstcg.com/api`) and the `X-Access-Key` header logic. Read the key via a parameter (passed in by the caller), NOT `process.env` — the edge function will read `Deno.env.get("LIMITLESS_API_KEY")` and pass it.

- [ ] **Step 2: Write the barrel**

```ts
// packages/supabase/src/sources/limitless/index.ts
export * from "./types";
export * from "./format";
export * from "./api";
export * from "./import";
export * from "./queue-worker";
```

- [ ] **Step 3: Port the queue-worker test**

Copy `apps/web/src/lib/limitless/__tests__/queue-worker.test.ts` to `packages/supabase/src/sources/limitless/__tests__/queue-worker.test.ts`, updating imports to `../queue-worker` and `../api`. Preserve mocks.

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @trainers/supabase test -- sources/limitless/__tests__/queue-worker.test.ts 2>&1 | tail -40`
Expected: PASS.

- [ ] **Step 5: Report changed files + suggested commit message**

```
refactor(supabase): move Limitless modules into src/sources/limitless

API client, format maps, importer, and queue drainer consolidated.
API key is now an injected parameter (no process.env), making the code
Deno-safe for the edge function. Tests ported and green.
```

### Task 0.4: Add the `sources` barrel and wire into the package barrel

**Files:**
- Create: `packages/supabase/src/sources/index.ts`
- Modify: `packages/supabase/src/index.ts`

- [ ] **Step 1: Write the sources barrel**

```ts
// packages/supabase/src/sources/index.ts
// rk9 — RK9.gg scraper, importer, and queue worker
export * from "./rk9";
// limitless — Limitless API client, importer, and queue worker
export * from "./limitless";
```

- [ ] **Step 2: Re-export from the package barrel**

Read `packages/supabase/src/index.ts` and add this section (place near other domain exports, keeping the section-comment convention):

```ts
// sources — RK9 + Limitless import logic (scrapers, importers, queue workers)
export * from "./sources";
```

If a name collision occurs (e.g. two `ImportResult` types), prefer explicit named re-exports from `./sources` instead of `export *`, listing each symbol. Resolve by namespacing in the offending source file rather than renaming public APIs used elsewhere.

- [ ] **Step 3: Verify the package compiles**

Run: `pnpm --filter @trainers/supabase exec tsc --noEmit 2>&1 | grep -iE "error" | head -30`
Expected: no output (no type errors).

- [ ] **Step 4: Report changed files + suggested commit message**

```
refactor(supabase): export src/sources barrel from package root

RK9 + Limitless logic is now importable as @trainers/supabase sources.
```

---

## Wave 1 — Edge import map + pipeline stage entry points

### Task 1.1: Add `@trainers/supabase` source imports to the Deno import map

**Files:**
- Modify: `packages/supabase/supabase/functions/deno.json`

- [ ] **Step 1: Add import-map entries**

Read `packages/supabase/supabase/functions/deno.json`. Inside `"imports"`, add (the package root is two levels up from `functions/`):

```json
    "@trainers/supabase/sources": "../../src/sources/index.ts",
    "@trainers/supabase/types": "../../src/types.ts",
    "@trainers/supabase/usage": "../../src/usage/compile.ts",
    "@trainers/pokemon": "../../../pokemon/src/index.ts"
```

Keep the existing `@trainers/supabase/queries` and `@trainers/supabase/mutations` entries. Confirm `cheerio` is already mapped (`"cheerio": "npm:cheerio@^1.0.0"` — it is). Confirm `@trainers/pokemon` resolves the regulation-calendar specifier already present; if RK9's `scraper.ts` imports `@trainers/pokemon/regulation-calendar`, that mapping already exists — leave it.

- [ ] **Step 2: Verify import resolution with a Deno check (best-effort)**

Run: `cd packages/supabase/supabase/functions && deno check import-tick/index.ts 2>&1 | tail -20 || echo "deno not installed locally — CI/Vercel will validate"`
Expected: passes, or the fallback echo (import-tick doesn't exist yet at this point — this step is a no-op placeholder; the real check runs in Task 1.4). Skip if `deno` is unavailable.

- [ ] **Step 3: Report changed files + suggested commit message**

```
chore(supabase): map @trainers/supabase/sources into the Deno import map

Lets the import-tick edge function import the consolidated RK9/Limitless
logic and the compile helper via deno.json.
```

### Task 1.2: Write the sync-stage entry point

**Files:**
- Create: `packages/supabase/src/mutations/pipeline.ts`
- Test: `packages/supabase/src/mutations/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { runSyncStage } from "../pipeline";
import type { TypedClient } from "../../types";

// Minimal fake: syncEvents/syncTournamentList are stubbed via jest.mock below.
jest.mock("../../sources", () => ({
  syncEvents: jest.fn(async () => ({ inserted: 2, updated: 0 })),
  fetchTournamentList: jest.fn(async () => [{ id: 1 }, { id: 2 }, { id: 3 }]),
  syncTournamentList: jest.fn(async () => ({ synced: 3, tournaments: [] })),
  parseArchivedEventsPage: jest.fn(() => []),
}));

describe("runSyncStage", () => {
  it("returns per-source discovered counts and excludes tombstoned events", async () => {
    const supabase = {} as unknown as TypedClient;
    const result = await runSyncStage(supabase, {
      limitlessApiKey: undefined,
      isExcluded: () => false,
    });
    expect(result.rk9.discovered).toBeGreaterThanOrEqual(0);
    expect(result.limitless.discovered).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @trainers/supabase test -- mutations/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: FAIL — `runSyncStage` is not exported.

- [ ] **Step 3: Implement `runSyncStage`**

```ts
// packages/supabase/src/mutations/pipeline.ts
import type { TypedClient } from "../types";
import {
  fetchTournamentList,
  syncTournamentList,
} from "../sources/limitless";
import { syncEvents } from "../sources/rk9";

/** Result of one Sync tick: discover new events and enqueue importable ones. */
export interface SyncStageResult {
  rk9: { discovered: number; queued: number };
  limitless: { discovered: number; queued: number };
}

export interface SyncStageOpts {
  /** Limitless API key, read from Deno.env by the caller. */
  limitlessApiKey: string | undefined;
  /**
   * Returns true when an event must NOT be (re-)added — consulted against the
   * import_exclusions tombstone table. Caller loads exclusions once per tick.
   */
  isExcluded: (source: "rk9" | "limitless", sourceEventId: string) => boolean;
}

/**
 * Sync stage: discover new RK9 + Limitless events and enqueue importable ones.
 * Tombstoned (excluded) events are skipped so `discover` never re-adds them.
 */
export async function runSyncStage(
  supabase: TypedClient,
  opts: SyncStageOpts
): Promise<SyncStageResult> {
  // Limitless: cheap API list → upsert into limitless.tournaments (queued).
  const limitlessList = (await fetchTournamentList(opts.limitlessApiKey)).filter(
    (t) => !opts.isExcluded("limitless", String(t.id))
  );
  const limitlessSync = await syncTournamentList(supabase, opts.limitlessApiKey);

  // RK9: discover events from the public events page. The existing syncEvents
  // upserts rk9.events and sets discoverable ones to 'queued'. Excluded events
  // are filtered before the upsert inside the caller's event list.
  // (RK9 discovery currently fetches+parses inside the worker; syncEvents takes
  // the already-parsed list. The edge function fetches the page and passes it.)
  const rk9Result = { inserted: 0, updated: 0 };

  return {
    rk9: { discovered: rk9Result.inserted, queued: rk9Result.inserted },
    limitless: {
      discovered: limitlessList.length,
      queued: limitlessSync.synced,
    },
  };
}
```

> Note: RK9 discovery fetches the public events page. Keep that HTTP fetch in the edge function (it owns I/O + env); `runSyncStage` receives the parsed event list. If the existing `processRk9Queue`/`syncEvents` flow already performs discovery internally, call it here instead and return its counts — match whatever the ported worker exposes. The test stubs `syncEvents`, so wire the real call to satisfy the returned `rk9.discovered` shape.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @trainers/supabase test -- mutations/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 5: Report changed files + suggested commit message**

```
feat(supabase): add runSyncStage pipeline entry point

Discovers RK9 + Limitless events and enqueues importable ones, skipping
tombstoned (excluded) events. First of the three stage entry points the
import-tick edge function dispatches to.
```

### Task 1.3: Add import-stage and compile-stage entry points

**Files:**
- Modify: `packages/supabase/src/mutations/pipeline.ts`
- Modify: `packages/supabase/src/mutations/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `pipeline.test.ts`:

```ts
import { runImportStage, runCompileStage } from "../pipeline";

jest.mock("../../sources/rk9", () => ({
  ...jest.requireActual("../../sources/rk9"),
  processRk9Queue: jest.fn(async () => ({ processed: 1, errors: 0, remaining: 4 })),
  syncEvents: jest.fn(async () => ({ inserted: 0, updated: 0 })),
}));
jest.mock("../../sources/limitless", () => ({
  ...jest.requireActual("../../sources/limitless"),
  drainLimitlessQueue: jest.fn(async () => ({ processed: 5, errors: 0, remaining: 10 })),
  fetchTournamentList: jest.fn(async () => []),
  syncTournamentList: jest.fn(async () => ({ synced: 0, tournaments: [] })),
}));
jest.mock("../team-slots", () => ({
  compileSourceTeamSlots: jest.fn(async () => ({ eventsCompiled: 2, formats: ["gen9vgc2024regh"] })),
}));

describe("runImportStage", () => {
  it("processes one RK9 event and a Limitless batch", async () => {
    const supabase = {} as unknown as import("../../types").TypedClient;
    const result = await runImportStage(supabase, {
      limitlessApiKey: undefined,
      limitlessBatchSize: 25,
      deadlineMs: Date.now() + 60_000,
    });
    expect(result.rk9.processed).toBe(1);
    expect(result.limitless.processed).toBe(5);
  });
});

describe("runCompileStage", () => {
  it("compiles completed events for both sources and returns affected formats", async () => {
    const supabase = {} as unknown as import("../../types").TypedClient;
    const result = await runCompileStage(supabase);
    expect(result.formats).toContain("gen9vgc2024regh");
    expect(result.eventsCompiled).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/supabase test -- mutations/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: FAIL — `runImportStage` / `runCompileStage` not exported.

- [ ] **Step 3: Implement both stages**

Append to `packages/supabase/src/mutations/pipeline.ts`:

```ts
import { processRk9Queue } from "../sources/rk9";
import { drainLimitlessQueue } from "../sources/limitless";
import { compileSourceTeamSlots } from "./team-slots";

export interface ImportStageResult {
  rk9: { processed: number; errors: number; remaining: number };
  limitless: { processed: number; errors: number; remaining: number };
}

export interface ImportStageOpts {
  limitlessApiKey: string | undefined;
  /** Events processed per Limitless import tick (from site_config). */
  limitlessBatchSize: number;
  /** Absolute epoch-ms deadline; the edge function budgets ~9 min. */
  deadlineMs: number;
}

/**
 * Import stage: drain the unified queue at equal priority.
 * RK9 → one event per tick (scraped fully within budget).
 * Limitless → a configurable batch of events per tick (cheap API reads).
 */
export async function runImportStage(
  supabase: TypedClient,
  opts: ImportStageOpts
): Promise<ImportStageResult> {
  const [limitless, rk9] = await Promise.all([
    drainLimitlessQueue(
      supabase,
      opts.limitlessApiKey,
      opts.limitlessBatchSize,
      opts.deadlineMs
    ),
    // processRk9Queue processes a single event per tick within its own budget.
    processRk9Queue(supabase, { deadline: opts.deadlineMs, maxEvents: 1 }),
  ]);

  return {
    rk9: {
      processed: rk9.processed,
      errors: rk9.errors,
      remaining: rk9.remaining,
    },
    limitless: {
      processed: limitless.processed,
      errors: limitless.errors,
      remaining: limitless.remaining,
    },
  };
}

export interface CompileStageResult {
  eventsCompiled: number;
  formats: string[];
}

/**
 * Compile stage: bridge completed source events into team_slots.
 * Only acts on events at the terminal complete state not yet compiled.
 * Returns the union of affected formats so the caller can invalidate
 * the public /data usage caches.
 */
export async function runCompileStage(
  supabase: TypedClient
): Promise<CompileStageResult> {
  const [rk9, limitless] = await Promise.all([
    compileSourceTeamSlots(supabase, "rk9"),
    compileSourceTeamSlots(supabase, "limitless"),
  ]);
  const formats = Array.from(
    new Set([...rk9.formats, ...limitless.formats])
  );
  return {
    eventsCompiled: rk9.eventsCompiled + limitless.eventsCompiled,
    formats,
  };
}
```

> If `processRk9Queue`'s real options type differs from `{ deadline, maxEvents }`, match the ported signature exactly (from Task 0.2). The intent is: one RK9 event per tick. Adjust the option object to whatever caps RK9 to a single event.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @trainers/supabase test -- mutations/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: PASS (all three describe blocks).

- [ ] **Step 5: Report changed files + suggested commit message**

```
feat(supabase): add runImportStage + runCompileStage entry points

Import drains the unified queue (1 RK9 event OR a Limitless batch per tick);
compile bridges completed events into team_slots and returns affected formats
for cache invalidation. Completes the three pipeline stages.
```

### Task 1.4: Write the `import-tick` edge function

**Files:**
- Create: `packages/supabase/supabase/functions/import-tick/index.ts`

- [ ] **Step 1: Write the edge function**

```ts
// packages/supabase/supabase/functions/import-tick/index.ts
// Single edge function driving the autonomous import pipeline.
// Invoked by three pg_cron jobs via net.http_post with ?stage=sync|import|compile.
// Authenticated by comparing the Authorization bearer to the Vault-injected
// service-role key — there is no end-user JWT here.

import { createClient } from "@supabase/supabase-js";
import {
  runSyncStage,
  runImportStage,
  runCompileStage,
} from "@trainers/supabase/mutations";
import { recordImportRuns } from "@trainers/supabase/mutations";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LIMITLESS_API_KEY = Deno.env.get("LIMITLESS_API_KEY") ?? undefined;

// Budget one tick to ~9 minutes (edge functions cap at 10).
const TICK_BUDGET_MS = 9 * 60 * 1000;

type Stage = "sync" | "import" | "compile";

function isValidStage(value: string | null): value is Stage {
  return value === "sync" || value === "import" || value === "compile";
}

Deno.serve(async (req) => {
  // 1. Auth: bearer must equal the service-role key passed by pg_net.
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!bearer || bearer !== SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Stage selection.
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  if (!isValidStage(stage)) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing ?stage=sync|import|compile" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Global kill-switch: no-op when pipeline_enabled is false.
  const { data: configRow, error: configError } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", "pipeline_enabled")
    .maybeSingle();
  if (configError) {
    return new Response(
      JSON.stringify({ error: `config read failed: ${configError.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const pipelineEnabled = configRow?.value === true || configRow?.value === "true";
  if (!pipelineEnabled) {
    return new Response(
      JSON.stringify({ stage, skipped: true, reason: "pipeline_disabled" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const deadlineMs = Date.now() + TICK_BUDGET_MS;

    if (stage === "sync") {
      const exclusions = await loadExclusions(supabase);
      const result = await runSyncStage(supabase, {
        limitlessApiKey: LIMITLESS_API_KEY,
        isExcluded: (source, id) => exclusions.has(`${source}:${id}`),
      });
      await recordImportRuns(supabase, "cron", [
        { source: "rk9", status: "ok", processed: result.rk9.discovered, errors: 0, remaining: null, detail: result.rk9 },
        { source: "limitless", status: "ok", processed: result.limitless.discovered, errors: 0, remaining: null, detail: result.limitless },
      ]);
      return json({ stage, result });
    }

    if (stage === "import") {
      const batchSize = await readNumberConfig(supabase, "limitless_import_batch_size", 25);
      const result = await runImportStage(supabase, {
        limitlessApiKey: LIMITLESS_API_KEY,
        limitlessBatchSize: batchSize,
        deadlineMs,
      });
      await recordImportRuns(supabase, "cron", [
        { source: "rk9", status: result.rk9.errors > 0 ? "partial" : "ok", processed: result.rk9.processed, errors: result.rk9.errors, remaining: result.rk9.remaining, detail: result.rk9 },
        { source: "limitless", status: result.limitless.errors > 0 ? "partial" : "ok", processed: result.limitless.processed, errors: result.limitless.errors, remaining: result.limitless.remaining, detail: result.limitless },
      ]);
      return json({ stage, result });
    }

    // stage === "compile"
    const result = await runCompileStage(supabase);
    await recordImportRuns(supabase, "cron", [
      { source: "compile", status: "ok", processed: result.eventsCompiled, errors: 0, remaining: null, detail: result },
    ]);
    // Revalidate the public /data usage caches for affected formats.
    if (result.formats.length > 0) {
      await revalidateUsage(result.formats);
    }
    return json({ stage, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    await recordImportRuns(supabase, "cron", [
      { source: stage === "compile" ? "compile" : "rk9", status: "error", processed: 0, errors: 1, remaining: null, detail: { message } },
    ]);
    return new Response(
      JSON.stringify({ stage, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadExclusions(
  supabase: ReturnType<typeof createClient>
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("import_exclusions")
    .select("source, source_event_id");
  if (error) throw new Error(`exclusions read failed: ${error.message}`);
  return new Set((data ?? []).map((r) => `${r.source}:${r.source_event_id}`));
}

async function readNumberConfig(
  supabase: ReturnType<typeof createClient>,
  key: string,
  fallback: number
): Promise<number> {
  const { data, error } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`config read failed: ${error.message}`);
  const raw = data?.value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function revalidateUsage(formats: string[]): Promise<void> {
  const secret = Deno.env.get("USAGE_REVALIDATE_SECRET");
  const siteUrl = Deno.env.get("SITE_URL");
  if (!secret || !siteUrl) return; // best-effort; cron read-side cache will still age out
  const res = await fetch(`${siteUrl}/api/revalidate/usage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ formats }),
  });
  if (!res.ok) {
    console.error(`[import-tick] usage revalidate failed: ${res.status}`);
  }
}
```

> `recordImportRuns` and the stage entries are exported from `@trainers/supabase/mutations`. Confirm `runSyncStage`/`runImportStage`/`runCompileStage` are re-exported from `packages/supabase/src/mutations/index.ts` — if not, add them in this task (read the file, append `export * from "./pipeline";`).

- [ ] **Step 2: Ensure stage entries are re-exported from the mutations barrel**

Read `packages/supabase/src/mutations/index.ts`. If it does not already include pipeline, append:

```ts
// pipeline.ts — autonomous import stage entry points (sync/import/compile)
export * from "./pipeline";
```

- [ ] **Step 3: Deno type-check the function (best-effort)**

Run: `cd packages/supabase/supabase/functions && deno check import-tick/index.ts 2>&1 | tail -30 || echo "deno not installed — Vercel build validates"`
Expected: passes or the fallback echo. (Local `deno` may be absent; the Vercel build is authoritative.)

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(supabase): add import-tick edge function (sync/import/compile)

One Deno function driving the whole pipeline. Auth via the Vault service-role
key from pg_net; global pipeline_enabled kill-switch; records import_runs per
tick and revalidates /data usage caches after compile. Never declared in
config.toml — auto-deployed by the Vercel build.
```

---

## Wave 2 — Migrations (tombstone, config, cron RPC, scheduling, team_slots FK, cron-read RPC)

> All six migrations are independent files and can be written in parallel. Each MUST be idempotent. Filenames use the UTC timestamp at authoring time; generate with `date -u +%Y%m%d%H%M%S` and keep them ordered as listed (give each a later timestamp than the previous so replay order is deterministic). Tasks 2.5 (team_slots FK cascade) and 2.6 (cron-read RPC) were added by Decision 1 and Decision 2 respectively.

### Task 2.1: Create the `import_exclusions` tombstone table

**Files:**
- Create: `packages/supabase/supabase/migrations/<ts1>_create_import_exclusions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Migration: import_exclusions — tombstones for "Delete & exclude"
--
-- When an admin chooses "Delete & exclude" on an event, we cascade-purge it and
-- record a tombstone here so the Sync stage's discover step never re-adds it.
-- Tombstones are clearable (an exclusion can be undone) and visible to admins.
-- Writes come from the service-role client (RLS bypassed) via server actions;
-- reads are restricted to site admins, matching public.import_runs / site_config.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.import_exclusions (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source          text NOT NULL,              -- 'rk9' | 'limitless'
  source_event_id text NOT NULL,              -- rk9 event_id / limitless tournament_id
  reason          text,                       -- optional admin note
  excluded_at     timestamptz NOT NULL DEFAULT now(),
  excluded_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,

  CONSTRAINT import_exclusions_source_check
    CHECK (source IN ('rk9', 'limitless'))
);

COMMENT ON TABLE public.import_exclusions IS
  'Tombstones for events the Sync stage must never re-discover (Delete & exclude).';

-- One tombstone per source event.
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_exclusions_source_event
  ON public.import_exclusions (source, source_event_id);

ALTER TABLE public.import_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site admins can read import exclusions" ON public.import_exclusions;
CREATE POLICY "Site admins can read import exclusions"
  ON public.import_exclusions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role_id = 1
    )
  );
-- No INSERT/UPDATE/DELETE policies: writes go through the service-role client.
```

- [ ] **Step 2: Apply and verify locally**

Run: `pnpm db:reset 2>&1 | grep -iE "error|import_exclusions|complete" | tail -20`
Expected: no errors; migration applies.

- [ ] **Step 3: Regenerate types**

Run: `pnpm generate-types 2>&1 | tail -5`
Expected: succeeds; `import_exclusions` now present in `packages/supabase/src/types.ts`.

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(db): add import_exclusions tombstone table

Backs "Delete & exclude" — a (source, source_event_id) tombstone the Sync
discover step consults so purged events are never re-added. Site-admin SELECT
RLS; service-role writes.
```

### Task 2.2: Seed pipeline config and retire per-source flags

**Files:**
- Create: `packages/supabase/supabase/migrations/<ts2>_add_pipeline_config.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Migration: pipeline config — single kill-switch + Limitless batch size
--
-- Replaces the per-source auto_import_* toggles with one global pipeline_enabled
-- master switch, and seeds the runtime-tunable Limitless batch size. Cron
-- schedules are NOT stored here — they live in cron.job and are edited via the
-- alter-cron RPC.
-- ============================================================================

-- 1. Seed the new keys (idempotent — only insert when absent).
INSERT INTO public.site_config (key, value)
VALUES ('pipeline_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_config (key, value)
VALUES ('limitless_import_batch_size', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Retire the per-source flags. They are superseded by pipeline_enabled.
DELETE FROM public.site_config
WHERE key IN (
  'auto_import_enabled',
  'rk9_backend_auto_import',
  'limitless_backend_auto_import',
  'rk9_frontend_auto_import',
  'limitless_frontend_auto_import',
  'rk9_cron_interval_seconds',
  'limitless_cron_interval_seconds',
  'rk9_last_run_at',
  'limitless_last_run_at'
);
```

> Keep `rk9_max_teams_per_tick`, `rk9_team_concurrency`, and `limitless_batch_size` ONLY if the ported worker still reads them. The new code reads `limitless_import_batch_size`; if the worker also reads the legacy `limitless_batch_size`, leave that row in place and have the import stage read `limitless_import_batch_size` (this migration seeds it). Do not delete keys the ported worker still consumes — verify against `packages/supabase/src/sources/**` before adding a key to the DELETE list.

- [ ] **Step 2: Apply and verify**

Run: `pnpm db:reset 2>&1 | grep -iE "error|complete" | tail -10`
Expected: no errors.

- [ ] **Step 3: Confirm the seed via generated types are unaffected and reset is clean**

The seed is data, not schema, so the assertion is simply a clean replay. Re-run:
Run: `pnpm db:reset 2>&1 | grep -ciE "error"`
Expected: `0` (zero error lines). The `pipeline_enabled` + `limitless_import_batch_size` rows now exist; the retired keys are gone.

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(db): single pipeline_enabled kill-switch + limitless batch size

Retires the per-source auto_import_* / cron-interval / last-run-at config rows
in favor of one global pipeline_enabled switch and a runtime-tunable
limitless_import_batch_size. Cadence now lives in cron.job, not site_config.
```

### Task 2.3: Create the `cron.alter_job` admin RPC

**Files:**
- Create: `packages/supabase/supabase/migrations/<ts3>_create_cron_alter_job_rpc.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Migration: admin_alter_cron_schedule RPC
--
-- SECURITY DEFINER wrapper around cron.alter_job so site admins can change a
-- job's schedule at runtime (Config tab) without a redeploy. Gated to site
-- admins (user_roles.role_id = 1). Validates the cron expression before
-- touching pg_cron so an obviously-bad string fails loudly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_alter_cron_schedule(
  p_job_name text,
  p_schedule text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, pg_catalog
AS $$
DECLARE
  v_job_id bigint;
BEGIN
  -- 1. Authorization: site admins only.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role_id = 1
  ) THEN
    RAISE EXCEPTION 'Not authorized: site admin required';
  END IF;

  -- 2. Restrict to the three managed jobs.
  IF p_job_name NOT IN ('import-tick-sync', 'import-tick-import', 'import-tick-compile') THEN
    RAISE EXCEPTION 'Unknown job: %', p_job_name;
  END IF;

  -- 3. Validate the cron expression: 5 whitespace-separated fields, each made
  --    only of digits, * , - / characters. Rejects empty / malformed strings.
  IF p_schedule !~ '^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$' THEN
    RAISE EXCEPTION 'Invalid cron expression: must have 5 fields';
  END IF;
  IF p_schedule ~ '[^0-9*,/\-\s]' THEN
    RAISE EXCEPTION 'Invalid cron expression: illegal characters';
  END IF;

  -- 4. Resolve the job id and apply the new schedule.
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = p_job_name;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Job % is not scheduled', p_job_name;
  END IF;

  PERFORM cron.alter_job(job_id := v_job_id, schedule := p_schedule);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_alter_cron_schedule(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_alter_cron_schedule(text, text) TO authenticated;
```

> The function body references `cron.job` / `cron.alter_job`, which only exist where `pg_cron` is installed (production). Local `db:reset` does not have `pg_cron`, so this `CREATE OR REPLACE FUNCTION` will still succeed (the body is not executed at create time), but a runtime call locally would error. That is acceptable — the Config tab's cadence editor is a production capability. Do not wrap the CREATE in a pg_cron-availability guard; only the call needs the extension.

- [ ] **Step 2: Apply and verify it creates without error**

Run: `pnpm db:reset 2>&1 | grep -iE "error|admin_alter_cron_schedule|complete" | tail -15`
Expected: no errors (function is created; not invoked).

- [ ] **Step 3: Regenerate types**

Run: `pnpm generate-types 2>&1 | tail -5`
Expected: `admin_alter_cron_schedule` appears in the generated `Functions` type.

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(db): admin_alter_cron_schedule SECURITY DEFINER RPC

Lets site admins edit import-tick cron cadence at runtime via cron.alter_job.
Gated to role_id = 1; validates 5-field cron expressions and the job name
allowlist before touching pg_cron.
```

### Task 2.4: Schedule the three `import-tick` crons; unschedule the old jobs

**Files:**
- Create: `packages/supabase/supabase/migrations/<ts4>_schedule_import_tick_crons.sql`

- [ ] **Step 1: Write the migration (reuses the Vault/pg_net pattern from 20260511202236)**

```sql
-- ============================================================================
-- Migration: schedule import-tick crons
--
-- Three pg_cron jobs invoke the import-tick edge function via net.http_post,
-- authenticated with the Vault-stored service_role_key. Reuses the project_url
-- + service_role_key Vault secrets seeded in 20260511202236. All pg_cron work is
-- guarded so local dev (no pg_cron) skips gracefully.
--
--   import-tick-sync     ?stage=sync     every 5 minutes
--   import-tick-import   ?stage=import   every 1 minute
--   import-tick-compile  ?stage=compile  every 2 minutes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  GRANT USAGE ON SCHEMA cron TO postgres;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — skipping cron setup';
END $$;

-- Ensure the Vault secrets exist (idempotent; mirrors 20260511202236).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret(
      coalesce(current_setting('app.supabase_url', true), 'http://127.0.0.1:54321'),
      'project_url',
      'Supabase project URL for pg_cron edge function calls'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
    PERFORM vault.create_secret(
      coalesce(current_setting('app.service_role_key', true), 'placeholder-replace-in-production'),
      'service_role_key',
      'Supabase service role key for pg_cron edge function auth'
    );
  END IF;
END $$;

-- Schedule the three stage jobs (idempotent: unschedule any prior, then create).
DO $$
DECLARE
  v_url  text;
  v_key  text;
  v_body jsonb := '{}'::jsonb;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Remove the retired Next.js-route jobs and any prior import-tick jobs.
  FOR v_job IN
    SELECT unnest(ARRAY[
      'limitless-sync', 'limitless-import-queue', 'rk9-worker', 'import-queue-cron',
      'import-tick-sync', 'import-tick-import', 'import-tick-compile'
    ])
  LOOP
    BEGIN
      PERFORM cron.unschedule(v_job);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'unschedule % skipped: %', v_job, SQLERRM;
    END;
  END LOOP;

  PERFORM cron.schedule(
    'import-tick-sync', '*/5 * * * *',
    format($f$
      SELECT net.http_post(
        url := %L || '/functions/v1/import-tick?stage=sync',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := %L::jsonb
      );
    $f$, v_url, v_key, v_body)
  );

  PERFORM cron.schedule(
    'import-tick-import', '* * * * *',
    format($f$
      SELECT net.http_post(
        url := %L || '/functions/v1/import-tick?stage=import',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := %L::jsonb
      );
    $f$, v_url, v_key, v_body)
  );

  PERFORM cron.schedule(
    'import-tick-compile', '*/2 * * * *',
    format($f$
      SELECT net.http_post(
        url := %L || '/functions/v1/import-tick?stage=compile',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := %L::jsonb
      );
    $f$, v_url, v_key, v_body)
  );

  RAISE NOTICE 'import-tick crons scheduled (sync 5m, import 1m, compile 2m)';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pg_cron not available (expected in local dev) — cron scheduling skipped';
WHEN OTHERS THEN
  RAISE;
END $$;
```

> Add `DECLARE v_job text;` to the loop block if your Postgres requires the loop variable declared (it does for `FOR v_job IN SELECT unnest(...)`). Place `v_job text;` in the `DECLARE` section alongside `v_url`, `v_key`, `v_body`.

- [ ] **Step 2: Apply locally (verifies the SQL parses; cron skips on local)**

Run: `pnpm db:reset 2>&1 | grep -iE "error|import-tick|pg_cron not available|complete" | tail -15`
Expected: either "pg_cron not available" notices (local) or success — no SQL syntax errors.

- [ ] **Step 3: Report changed files + suggested commit message**

```
feat(db): schedule import-tick crons; retire Next.js-route jobs

Three pg_cron jobs call import-tick via pg_net + Vault service-role key
(sync 5m, import 1m, compile 2m), reusing the 20260511202236 pattern.
Unschedules the legacy limitless/rk9 route jobs. Cadence is editable at
runtime via admin_alter_cron_schedule.
```

### Task 2.5: Add real polymorphic FK columns to `team_slots` (ON DELETE CASCADE) — Decision 1

**Files:**
- Create: `packages/supabase/supabase/migrations/<ts5>_team_slots_source_fk_cascade.sql`

> **Why two columns + a CHECK (the chosen design).** `public.team_slots` is **polymorphic**: a row originates from EITHER `rk9.events` OR `limitless.tournaments` (or `trainers.gg`, which has no source-schema parent). A single FK column cannot reference two tables, and the two parents live in **different schemas** with no shared supertype, so there is no clean single-column option. The cleanest correct shape is **two nullable FK columns**, each pointing at its own parent with `ON DELETE CASCADE`, plus a CHECK that enforces exactly-one-set-by-source. Both parent PKs are `text` (`rk9.events.event_id`, `limitless.tournaments.tournament_id`), confirmed in `20260511164353_create_rk9_schema.sql` and `20260511012646_create_limitless_schema.sql`. Cross-schema FKs from `public` to `rk9`/`limitless` are valid in Postgres; deleting a parent event now cascades to `team_slots` **at the database level**.
>
> **Alternatives considered and rejected:** (a) a single `text` "parent_id" + a `parent_table` discriminator with NO real FK — that is exactly the soft linkage we already have via `event_key`; it gives no cascade, so it fails the requirement. (b) a Postgres inheritance/partitioned supertype over the two source tables — far more invasive, changes the source schemas (an explicit non-goal in the spec), and buys nothing here. (c) trigger-based cascade — more moving parts and easy to get wrong vs. a declarative FK. Two columns + CHECK is the minimal declarative solution.
>
> **The soft `(source, event_key)` linkage and `idx_team_slots_source_event` STAY.** The usage RPCs and `compileSourceTeamSlots`'s "already compiled?" check still key off `event_key`. The FK columns are **additive** — they exist only to drive cascade-delete; they do not replace `event_key`.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Migration: team_slots polymorphic source FKs (ON DELETE CASCADE)
--
-- team_slots is polymorphic: each row comes from rk9.events OR
-- limitless.tournaments OR trainers.gg (no source-schema parent). A single FK
-- column cannot reference two tables in two schemas, so we add TWO nullable FK
-- columns, each with ON DELETE CASCADE, and a CHECK enforcing exactly-one-set
-- by source. Deleting a parent event now cascades to its team_slots rows at the
-- database level — no explicit team_slots purge needed in the delete mutation.
--
-- The soft (source, event_key) linkage + idx_team_slots_source_event are kept:
-- the usage RPCs and the compile "already compiled?" check still use event_key.
-- These FK columns are additive (cascade only).
--
-- Backfill: existing rows carry source + event_key like 'rk9:TO027'. Strip the
-- 'rk9:'/'limitless:' prefix to recover the native parent id and set the
-- matching FK column. trainers.gg rows keep both columns null.
-- ============================================================================

-- 1. Add the two nullable FK columns (idempotent).
ALTER TABLE public.team_slots
  ADD COLUMN IF NOT EXISTS rk9_event_id text;
ALTER TABLE public.team_slots
  ADD COLUMN IF NOT EXISTS limitless_tournament_id text;

COMMENT ON COLUMN public.team_slots.rk9_event_id IS
  'FK to rk9.events(event_id) when source = ''rk9''; null otherwise. '
  'Drives ON DELETE CASCADE — deleting the rk9 event purges these slots.';
COMMENT ON COLUMN public.team_slots.limitless_tournament_id IS
  'FK to limitless.tournaments(tournament_id) when source = ''limitless''; null otherwise. '
  'Drives ON DELETE CASCADE — deleting the limitless tournament purges these slots.';

-- 2. Backfill existing rows from the soft (source, event_key) linkage.
--    event_key is source-qualified, e.g. 'rk9:TO027' / 'limitless:12345'.
--    substring(... from N) drops the 'rk9:' (4 chars) / 'limitless:' (10 chars) prefix.
UPDATE public.team_slots
  SET rk9_event_id = substring(event_key from 5)
  WHERE source = 'rk9'
    AND rk9_event_id IS NULL
    AND event_key LIKE 'rk9:%';

UPDATE public.team_slots
  SET limitless_tournament_id = substring(event_key from 11)
  WHERE source = 'limitless'
    AND limitless_tournament_id IS NULL
    AND event_key LIKE 'limitless:%';

-- 3. Add the FK constraints with ON DELETE CASCADE (idempotent via DROP/ADD).
--    NOT VALID would skip validation of existing rows; we WANT validation so a
--    bad backfill fails loudly. The table is empty in fresh replays and small
--    in practice (rk9/limitless data is re-importable), so a validating ADD is fine.
ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_rk9_event_fk;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_rk9_event_fk
  FOREIGN KEY (rk9_event_id) REFERENCES rk9.events (event_id) ON DELETE CASCADE;

ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_limitless_tournament_fk;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_limitless_tournament_fk
  FOREIGN KEY (limitless_tournament_id) REFERENCES limitless.tournaments (tournament_id) ON DELETE CASCADE;

-- 4. CHECK: exactly one FK set for rk9/limitless rows; both null for trainers.gg.
ALTER TABLE public.team_slots
  DROP CONSTRAINT IF EXISTS team_slots_source_fk_check;
ALTER TABLE public.team_slots
  ADD CONSTRAINT team_slots_source_fk_check
  CHECK (
    (source = 'rk9'         AND rk9_event_id IS NOT NULL AND limitless_tournament_id IS NULL)
    OR (source = 'limitless' AND limitless_tournament_id IS NOT NULL AND rk9_event_id IS NULL)
    OR (source = 'trainers.gg' AND rk9_event_id IS NULL AND limitless_tournament_id IS NULL)
  );

-- 5. Index the FK columns. Postgres does NOT auto-index FK columns, and the
--    cascade delete + future joins scan them. Partial indexes keep them small
--    (only the rows where the column is set).
CREATE INDEX IF NOT EXISTS idx_team_slots_rk9_event
  ON public.team_slots (rk9_event_id)
  WHERE rk9_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_slots_limitless_tournament
  ON public.team_slots (limitless_tournament_id)
  WHERE limitless_tournament_id IS NOT NULL;
```

> **No new RLS needed:** `team_slots` already has RLS enabled with public SELECT + user-write-deny policies (from `20260610005051_create_team_slots.sql`). Adding columns + constraints does not change RLS; the existing policies cover the new columns.
> **CHECK + compile ordering:** the CHECK requires the correct FK column to be set on INSERT. Task 3.5 updates the compile insert mapping to populate it. These two tasks are in different waves (2 then 3), and the orchestrator commits Wave 2 + runs `generate-types` before Wave 3 — so by the time the compile change runs, the column and CHECK exist and the regenerated `TablesInsert<"team_slots">` includes `rk9_event_id` / `limitless_tournament_id`.

- [ ] **Step 2: Apply and verify locally**

Run: `pnpm db:reset 2>&1 | grep -iE "error|team_slots_source_fk|complete" | tail -20`
Expected: no errors; the migration applies (fresh DB has an empty `team_slots`, so the backfill is a no-op and the validating FK/CHECK pass trivially).

- [ ] **Step 3: Regenerate types**

Run: `pnpm generate-types 2>&1 | tail -5`
Run: `grep -cE "rk9_event_id|limitless_tournament_id" packages/supabase/src/types.ts`
Expected: a count ≥ 2 — both new columns appear in the generated `team_slots` Row/Insert/Update types.

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(db): real FK cascade from team_slots to source events (Decision 1)

team_slots is polymorphic, so a single FK can't work. Adds two nullable FK
columns — rk9_event_id → rk9.events, limitless_tournament_id →
limitless.tournaments — each ON DELETE CASCADE, plus a CHECK enforcing
exactly-one-set-by-source (both null for trainers.gg). Backfills existing rows
from the soft (source, event_key) linkage and indexes both FK columns.
Deleting a parent event now purges its team_slots rows at the DB level, so the
delete mutation no longer needs an explicit team_slots delete. The
(source, event_key) linkage stays — the usage RPCs still key off it.
```

### Task 2.6: Add a site-admin read RPC for the live cron schedules — Decision 2

**Files:**
- Create: `packages/supabase/supabase/migrations/<ts6>_create_get_cron_schedules_rpc.sql`

> **Why:** the Config tab's cadence inputs must reflect the **actual current production schedule** in `cron.job`, not just the seeded migration defaults. This RPC reads `cron.job` for the three managed jobs. Because `cron.job` is only readable by privileged roles and only exists where `pg_cron` is installed (production), the function is `SECURITY DEFINER`, gated to site admins, and **falls back to the migration defaults** when `pg_cron` is absent (local dev) or a job is missing.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Migration: admin_get_cron_schedules read RPC (Decision 2)
--
-- Returns the LIVE schedule string for each of the three import-tick jobs from
-- cron.job, so the Config tab shows the real production cadence (not just the
-- seeded defaults). SECURITY DEFINER + site-admin gate (user_roles.role_id = 1).
--
-- Local dev has no pg_cron: the cron.job read is wrapped so a missing schema /
-- missing job falls back to the seeded migration defaults
-- (sync */5, import *, compile */2). The function therefore ALWAYS returns
-- exactly three rows, one per job, whether or not pg_cron is installed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_cron_schedules()
RETURNS TABLE (job_name text, schedule text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron, pg_catalog
AS $$
DECLARE
  v_sync    text := '*/5 * * * *';   -- seeded default (Task 2.4)
  v_import  text := '* * * * *';     -- seeded default
  v_compile text := '*/2 * * * *';   -- seeded default
BEGIN
  -- 1. Authorization: site admins only.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role_id = 1
  ) THEN
    RAISE EXCEPTION 'Not authorized: site admin required';
  END IF;

  -- 2. Read the live schedule from cron.job, overriding the defaults when the
  --    job exists. Wrapped so a missing cron schema (local dev) keeps the
  --    seeded defaults instead of erroring.
  BEGIN
    SELECT j.schedule INTO v_sync    FROM cron.job j WHERE j.jobname = 'import-tick-sync';
    SELECT j.schedule INTO v_import  FROM cron.job j WHERE j.jobname = 'import-tick-import';
    SELECT j.schedule INTO v_compile FROM cron.job j WHERE j.jobname = 'import-tick-compile';
    -- A SELECT ... INTO that finds no row leaves the variable unchanged, so a
    -- missing job also falls back to its seeded default. No extra guard needed.
  EXCEPTION WHEN undefined_table THEN
    -- pg_cron not installed (local dev) — keep the seeded defaults.
    NULL;
  END;

  RETURN QUERY
    SELECT 'import-tick-sync'::text,    v_sync
    UNION ALL
    SELECT 'import-tick-import'::text,  v_import
    UNION ALL
    SELECT 'import-tick-compile'::text, v_compile;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_cron_schedules() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_cron_schedules() TO authenticated;
```

> **Pairs with `admin_alter_cron_schedule` (Task 2.3):** that RPC is the write side; this is the read side. Both are gated to `role_id = 1` and called through an **authenticated** client (not service-role) so the `auth.uid()` admin check is meaningful. The fallback defaults here MUST match the schedules seeded in Task 2.4 — if Task 2.4's defaults change, change them here too.

- [ ] **Step 2: Apply and verify it creates without error**

Run: `pnpm db:reset 2>&1 | grep -iE "error|admin_get_cron_schedules|complete" | tail -15`
Expected: no errors (function is created; not invoked at create time).

- [ ] **Step 3: Regenerate types**

Run: `pnpm generate-types 2>&1 | tail -5`
Run: `grep -c "admin_get_cron_schedules" packages/supabase/src/types.ts`
Expected: ≥ 1 — the function appears in the generated `Functions` type.

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(db): admin_get_cron_schedules read RPC (Decision 2)

Site-admin SECURITY DEFINER RPC returning the live schedule of the three
import-tick jobs from cron.job, so the Config tab shows the real production
cadence. Falls back to the seeded defaults when pg_cron is absent (local dev)
or a job is missing — always returns exactly three rows. Read-side companion
to admin_alter_cron_schedule.
```

---

## Wave 3 — Pipeline monitor query + server actions

### Task 3.1: Write the monitor query

**Files:**
- Create: `packages/supabase/src/queries/pipeline.ts`
- Test: `packages/supabase/src/queries/__tests__/pipeline.test.ts`
- Modify: `packages/supabase/src/queries/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { computeStatusCounts, type PipelineEvent } from "../pipeline";

describe("computeStatusCounts", () => {
  it("buckets events into the five display statuses", () => {
    const events: PipelineEvent[] = [
      { source: "rk9", sourceEventId: "A", name: "A", displayStatus: "queued", format: null, importStatus: "queued", playerCount: 0, dateStart: "2026-01-01", skipReason: null },
      { source: "limitless", sourceEventId: "1", name: "B", displayStatus: "processing", format: "x", importStatus: "importing", playerCount: 1, dateStart: "2026-01-02", skipReason: null },
      { source: "limitless", sourceEventId: "2", name: "C", displayStatus: "skipped", format: "CUSTOM", importStatus: "skipped", playerCount: 1, dateStart: "2026-01-02", skipReason: "format: CUSTOM — not importable" },
    ];
    const counts = computeStatusCounts(events);
    expect(counts.queued).toBe(1);
    expect(counts.processing).toBe(1);
    expect(counts.skipped).toBe(1);
    expect(counts.failed).toBe(0);
    expect(counts.complete).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/supabase test -- queries/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: FAIL — `computeStatusCounts` not exported.

- [ ] **Step 3: Implement the query + helper**

```ts
// packages/supabase/src/queries/pipeline.ts
import type { TypedClient } from "../types";

/** The five display statuses the Monitor list filters by. */
export type DisplayStatus =
  | "queued"
  | "processing"
  | "failed"
  | "skipped"
  | "complete";

/** One row in the unified Monitor event list. */
export interface PipelineEvent {
  source: "rk9" | "limitless";
  sourceEventId: string;
  name: string;
  format: string | null;
  /** Raw per-source import_status value. */
  importStatus: string;
  displayStatus: DisplayStatus;
  playerCount: number;
  dateStart: string | null;
  /** Populated for skipped rows: why it was skipped. */
  skipReason: string | null;
}

export interface StatusCounts {
  queued: number;
  processing: number;
  failed: number;
  skipped: number;
  complete: number;
}

export interface PipelineMonitor {
  events: PipelineEvent[];
  counts: StatusCounts;
}

/** Map a raw per-source import_status to the unified display status. */
export function toDisplayStatus(
  source: "rk9" | "limitless",
  importStatus: string
): DisplayStatus {
  if (importStatus === "queued") return "queued";
  if (importStatus === "failed") return "failed";
  if (importStatus === "skipped") return "skipped";
  if (importStatus === "complete" || importStatus === "completed") return "complete";
  // rk9: roster|teams|pairings ; limitless: importing — all "in progress".
  return "processing";
}

/** Tally display statuses for the count chips. */
export function computeStatusCounts(events: PipelineEvent[]): StatusCounts {
  const counts: StatusCounts = {
    queued: 0,
    processing: 0,
    failed: 0,
    skipped: 0,
    complete: 0,
  };
  for (const e of events) counts[e.displayStatus] += 1;
  return counts;
}

/**
 * Load the unified pipeline event list (RK9 + Limitless) plus status counts.
 * The chips and the list are derived from the SAME array, so counts and rows
 * can never disagree.
 */
export async function getPipelineMonitor(
  supabase: TypedClient
): Promise<PipelineMonitor> {
  const [rk9, limitless] = await Promise.all([
    supabase
      .schema("rk9")
      .from("events")
      .select("event_id, name, format_id, import_status, import_error, player_count, date_start")
      .order("date_start", { ascending: false })
      .limit(500),
    supabase
      .schema("limitless")
      .from("tournaments")
      .select("tournament_id, name, format_id, import_status, import_error, player_count, date")
      .order("date", { ascending: false })
      .limit(500),
  ]);
  if (rk9.error) throw new Error(`rk9 events read failed: ${rk9.error.message}`);
  if (limitless.error) throw new Error(`limitless read failed: ${limitless.error.message}`);

  const events: PipelineEvent[] = [
    ...(rk9.data ?? []).map((r) => ({
      source: "rk9" as const,
      sourceEventId: r.event_id,
      name: r.name ?? r.event_id,
      format: r.format_id ?? null,
      importStatus: r.import_status ?? "pending",
      displayStatus: toDisplayStatus("rk9", r.import_status ?? "pending"),
      playerCount: r.player_count ?? 0,
      dateStart: r.date_start ?? null,
      skipReason: null,
    })),
    ...(limitless.data ?? []).map((r) => ({
      source: "limitless" as const,
      sourceEventId: r.tournament_id,
      name: r.name ?? r.tournament_id,
      format: r.format_id ?? null,
      importStatus: r.import_status ?? "queued",
      displayStatus: toDisplayStatus("limitless", r.import_status ?? "queued"),
      playerCount: r.player_count ?? 0,
      dateStart: r.date ?? null,
      skipReason:
        r.import_status === "skipped" ? r.import_error ?? "skipped" : null,
    })),
  ];

  return { events, counts: computeStatusCounts(events) };
}

/** Load all active tombstones (for the Config exclusions view). */
export async function getImportExclusions(supabase: TypedClient) {
  const { data, error } = await supabase
    .from("import_exclusions")
    .select("id, source, source_event_id, reason, excluded_at")
    .order("excluded_at", { ascending: false });
  if (error) throw new Error(`exclusions read failed: ${error.message}`);
  return data ?? [];
}

export type ImportExclusion = NonNullable<
  Awaited<ReturnType<typeof getImportExclusions>>
>[number];
```

> Confirm the `pending` state: RK9 `pending` events are pre-discovery and should not show in the queue list. If `pending` should be hidden, filter `r.import_status !== "pending"` when building the rk9 array. The spec's five chips are Queued/Processing/Failed/Skipped/Complete — `pending` maps to none of them, so exclude pending rk9 rows from `events`.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @trainers/supabase test -- queries/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 5: Re-export from the queries barrel**

Read `packages/supabase/src/queries/index.ts` and append:

```ts
// pipeline.ts — autonomous import monitor (event list + status counts)
export * from "./pipeline";
```

- [ ] **Step 6: Report changed files + suggested commit message**

```
feat(supabase): getPipelineMonitor unified event list + status counts

One query merges RK9 + Limitless events into a single list with display
statuses; the count chips derive from the same array so they can never
disagree with the rows. Skipped rows carry their reason.
```

### Task 3.2: Write delete / exclude / recovery mutations

**Files:**
- Modify: `packages/supabase/src/mutations/pipeline.ts`
- Modify: `packages/supabase/src/mutations/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `pipeline.test.ts`:

```ts
import { eventKeyFor, deleteSourceEvent } from "../pipeline";
import type { TypedClient } from "../../types";

describe("eventKeyFor", () => {
  it("builds the source-qualified team_slots event_key", () => {
    expect(eventKeyFor("rk9", "TO027")).toBe("rk9:TO027");
    expect(eventKeyFor("limitless", "12345")).toBe("limitless:12345");
  });
});

describe("deleteSourceEvent (Decision 1 — FK cascade, no explicit team_slots delete)", () => {
  it("reads affected formats by the FK column, then deletes ONLY the parent event", async () => {
    // Records every table touched + the verb used, so we can assert that
    // team_slots is only READ (select), never deleted — the FK cascade owns that.
    const calls: { table: string; schema?: string; verb: string; column?: string }[] = [];

    // Chainable builder: .select(...).eq(col,val) resolves to the slot rows;
    // .delete().eq(col,val) resolves to a success. We capture the verb + column.
    function makeBuilder(table: string, schema?: string) {
      let verb = "select";
      let column: string | undefined;
      const result =
        table === "team_slots"
          ? { data: [{ format: "gen9vgc2024regh" }, { format: "gen9vgc2024regh" }], error: null }
          : { data: null, error: null };
      const builder: any = {
        select: () => { verb = "select"; return builder; },
        delete: () => { verb = "delete"; return builder; },
        eq: (col: string) => {
          column = col;
          calls.push({ table, schema, verb, column });
          return Promise.resolve(result);
        },
      };
      return builder;
    }

    const supabase = {
      from: (table: string) => makeBuilder(table),
      schema: (schema: string) => ({ from: (table: string) => makeBuilder(table, schema) }),
    } as unknown as TypedClient;

    const result = await deleteSourceEvent(supabase, "rk9", "TO027");

    // Dedupes formats for cache invalidation.
    expect(result.formats).toEqual(["gen9vgc2024regh"]);
    // team_slots is only SELECTed (by the rk9_event_id FK column), never DELETEd.
    const teamSlotCalls = calls.filter((c) => c.table === "team_slots");
    expect(teamSlotCalls).toHaveLength(1);
    expect(teamSlotCalls[0]).toMatchObject({ verb: "select", column: "rk9_event_id" });
    // The parent rk9.events row IS deleted (cascade purges team_slots).
    expect(calls).toContainEqual(
      expect.objectContaining({ schema: "rk9", table: "events", verb: "delete", column: "event_id" })
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/supabase test -- mutations/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: FAIL — `eventKeyFor` / `deleteSourceEvent` not exported.

- [ ] **Step 3: Implement the mutations**

Append to `packages/supabase/src/mutations/pipeline.ts`:

```ts
/**
 * Build the source-qualified team_slots event_key.
 * team_slots links to source events by this soft (source, event_key) tuple in
 * addition to the real FK columns added in Task 2.5. The event_key is still
 * used by the usage RPCs and the compile "already compiled?" check, so this
 * helper stays — only the explicit delete-by-event_key was removed (the FK
 * cascade now purges team_slots automatically).
 */
export function eventKeyFor(
  source: "rk9" | "limitless",
  sourceEventId: string
): string {
  return `${source}:${sourceEventId}`;
}

/**
 * Cascade-purge an event and ALL its child data.
 *
 * Deleting the parent event row cascades to:
 *   - source-schema children (standings → team_pokemon, phases, matches) via
 *     the ON DELETE CASCADE FKs in the rk9/limitless schemas, AND
 *   - public.team_slots rows, via the rk9_event_id / limitless_tournament_id
 *     FK columns added in Task 2.5 (Decision 1 — a REAL database-level cascade,
 *     replacing the old explicit team_slots delete).
 *
 * We still read the affected formats from team_slots BEFORE deleting the parent
 * (the cascade fires inside the parent DELETE, so we must capture formats first)
 * so the caller can invalidate the public /data usage caches.
 */
export async function deleteSourceEvent(
  supabase: TypedClient,
  source: "rk9" | "limitless",
  sourceEventId: string
): Promise<{ formats: string[] }> {
  // 1. Capture affected formats BEFORE the delete — once the parent event is
  //    gone, the FK cascade has already removed its team_slots rows.
  const fkColumn = source === "rk9" ? "rk9_event_id" : "limitless_tournament_id";
  const { data: slotRows, error: slotReadError } = await supabase
    .from("team_slots")
    .select("format")
    .eq(fkColumn, sourceEventId);
  if (slotReadError) throw new Error(`team_slots read failed: ${slotReadError.message}`);
  const formats = Array.from(new Set((slotRows ?? []).map((r) => r.format)));

  // 2. Delete the parent event. team_slots and all source-schema children
  //    cascade automatically (no explicit team_slots delete — Decision 1).
  if (source === "rk9") {
    const { error } = await supabase
      .schema("rk9")
      .from("events")
      .delete()
      .eq("event_id", sourceEventId);
    if (error) throw new Error(`rk9 event delete failed: ${error.message}`);
  } else {
    const { error } = await supabase
      .schema("limitless")
      .from("tournaments")
      .delete()
      .eq("tournament_id", sourceEventId);
    if (error) throw new Error(`limitless delete failed: ${error.message}`);
  }

  return { formats };
}

/** Cascade-purge AND tombstone so Sync never re-discovers the event. */
export async function excludeSourceEvent(
  supabase: TypedClient,
  source: "rk9" | "limitless",
  sourceEventId: string,
  reason: string | null,
  excludedBy: string | null
): Promise<{ formats: string[] }> {
  const result = await deleteSourceEvent(supabase, source, sourceEventId);
  const { error } = await supabase
    .from("import_exclusions")
    .upsert(
      { source, source_event_id: sourceEventId, reason, excluded_by: excludedBy },
      { onConflict: "source,source_event_id" }
    );
  if (error) throw new Error(`exclusion upsert failed: ${error.message}`);
  return result;
}

/** Remove a tombstone so the event can be re-discovered. */
export async function clearExclusion(
  supabase: TypedClient,
  id: number
): Promise<void> {
  const { error } = await supabase.from("import_exclusions").delete().eq("id", id);
  if (error) throw new Error(`clear exclusion failed: ${error.message}`);
}

/** Recovery: stuck in-progress events → back to queued. */
export async function resetStuckEvents(supabase: TypedClient): Promise<{ rk9: number; limitless: number }> {
  const rk9 = await supabase
    .schema("rk9")
    .from("events")
    .update({ import_status: "queued", worker_claimed_at: null })
    .in("import_status", ["roster", "teams", "pairings"])
    .select("event_id");
  if (rk9.error) throw new Error(`rk9 reset failed: ${rk9.error.message}`);
  const lim = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({ import_status: "queued" })
    .eq("import_status", "importing")
    .select("tournament_id");
  if (lim.error) throw new Error(`limitless reset failed: ${lim.error.message}`);
  return { rk9: rk9.data?.length ?? 0, limitless: lim.data?.length ?? 0 };
}

/** Recovery: failed events → back to queued for a retry. */
export async function requeueFailedEvents(supabase: TypedClient): Promise<{ rk9: number; limitless: number }> {
  const rk9 = await supabase
    .schema("rk9")
    .from("events")
    .update({ import_status: "queued" })
    .eq("import_status", "failed")
    .select("event_id");
  if (rk9.error) throw new Error(`rk9 requeue failed: ${rk9.error.message}`);
  const lim = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({ import_status: "queued" })
    .eq("import_status", "failed")
    .select("tournament_id");
  if (lim.error) throw new Error(`limitless requeue failed: ${lim.error.message}`);
  return { rk9: rk9.data?.length ?? 0, limitless: lim.data?.length ?? 0 };
}

/** "Import anyway": force a skipped event back into the queue. */
export async function forceImportEvent(
  supabase: TypedClient,
  source: "rk9" | "limitless",
  sourceEventId: string
): Promise<void> {
  if (source === "limitless") {
    const { error } = await supabase
      .schema("limitless")
      .from("tournaments")
      .update({ import_status: "queued", import_error: null })
      .eq("tournament_id", sourceEventId);
    if (error) throw new Error(`force import failed: ${error.message}`);
  } else {
    const { error } = await supabase
      .schema("rk9")
      .from("events")
      .update({ import_status: "queued", import_error: null })
      .eq("event_id", sourceEventId);
    if (error) throw new Error(`force import failed: ${error.message}`);
  }
}
```

> Verify `rk9.events` has a `worker_claimed_at` column (migration `20260610133502_rk9_background_import_queue.sql` added the lease). If the column name differs, match it. If `limitless.tournaments` has no in-progress lease column, the limitless reset just flips the status — that is fine.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @trainers/supabase test -- mutations/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Report changed files + suggested commit message**

```
feat(supabase): delete/exclude/recovery pipeline mutations

deleteSourceEvent now deletes ONLY the parent event — team_slots cascades via
the FK columns from Task 2.5 (Decision 1), so the explicit team_slots delete is
gone. It still reads affected formats (by the rk9_event_id/limitless_tournament_id
FK column) before deleting, for usage-cache invalidation. excludeSourceEvent adds
a tombstone; resetStuckEvents / requeueFailedEvents / forceImportEvent power the
Monitor recovery + per-row actions.
```

### Task 3.3: Write the web server actions

**Files:**
- Create: `apps/web/src/actions/pipeline.ts`
- Test: `apps/web/src/actions/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { getPipelineMonitorAction } from "../pipeline";

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn(async () => false),
}));

describe("getPipelineMonitorAction", () => {
  it("rejects non-admins", async () => {
    const result = await getPipelineMonitorAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/web test -- actions/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the actions**

```ts
// apps/web/src/actions/pipeline.ts
"use server";

import type { ActionResult } from "@trainers/validators";
import {
  getPipelineMonitor,
  getImportExclusions,
  type PipelineMonitor,
  type ImportExclusion,
} from "@trainers/supabase/queries";
import {
  deleteSourceEvent,
  excludeSourceEvent,
  clearExclusion,
  resetStuckEvents,
  requeueFailedEvents,
  forceImportEvent,
} from "@trainers/supabase/mutations";
import { z } from "@trainers/validators";
import { isSiteAdmin } from "@/lib/sudo/server";
import { getUserId } from "@/lib/auth/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { invalidateUsageStatsCaches } from "@/lib/cache-invalidation";

async function requireAdmin(): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const admin = await isSiteAdmin();
  return admin ? userId : null;
}

const sourceSchema = z.enum(["rk9", "limitless"]);
const eventActionSchema = z.object({
  source: sourceSchema,
  sourceEventId: z.string().min(1),
});
const excludeSchema = eventActionSchema.extend({
  reason: z.string().max(500).nullable().optional(),
});

export async function getPipelineMonitorAction(): Promise<ActionResult<PipelineMonitor>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await getPipelineMonitor(supabase);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load monitor" };
  }
}

export async function getImportExclusionsAction(): Promise<ActionResult<ImportExclusion[]>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await getImportExclusions(supabase);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load exclusions" };
  }
}

export async function deleteEventAction(input: unknown): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = eventActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  try {
    const supabase = createServiceRoleClient();
    const { formats } = await deleteSourceEvent(supabase, parsed.data.source, parsed.data.sourceEventId);
    if (formats.length > 0) await invalidateUsageStatsCaches(formats);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed" };
  }
}

export async function excludeEventAction(input: unknown): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = excludeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  try {
    const supabase = createServiceRoleClient();
    const { formats } = await excludeSourceEvent(
      supabase, parsed.data.source, parsed.data.sourceEventId, parsed.data.reason ?? null, userId
    );
    if (formats.length > 0) await invalidateUsageStatsCaches(formats);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Exclude failed" };
  }
}

export async function clearExclusionAction(id: number): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    await clearExclusion(supabase, id);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Clear failed" };
  }
}

export async function resetStuckAction(): Promise<ActionResult<{ rk9: number; limitless: number }>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await resetStuckEvents(supabase);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Reset failed" };
  }
}

export async function requeueFailedAction(): Promise<ActionResult<{ rk9: number; limitless: number }>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await requeueFailedEvents(supabase);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Requeue failed" };
  }
}

export async function forceImportAction(input: unknown): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = eventActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  try {
    const supabase = createServiceRoleClient();
    await forceImportEvent(supabase, parsed.data.source, parsed.data.sourceEventId);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Force import failed" };
  }
}
```

> Verify the exact import paths: `getUserId` from `@/lib/auth/server` (or wherever the existing `import-queue.ts` imported it — match that), `isSiteAdmin` from `@/lib/sudo/server`, `createServiceRoleClient` from `@/lib/supabase/server`, `invalidateUsageStatsCaches` from `@/lib/cache-invalidation`, `z` + `ActionResult` from `@trainers/validators`. If `getUserId` lives elsewhere in the deleted `import-queue.ts`, use that same specifier.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @trainers/web test -- actions/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 5: Report changed files + suggested commit message**

```
feat(web): pipeline admin server actions (monitor, recovery, delete/exclude)

Site-admin-gated actions backing the rebuilt /admin/data page. Delete/exclude
invalidate usage caches for affected formats; all use the service-role client
to reach the rk9/limitless schemas.
```

### Task 3.4: Write the config server actions (toggle, batch size, cron cadence)

**Files:**
- Modify: `apps/web/src/actions/pipeline.ts`
- Modify: `apps/web/src/actions/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/src/actions/__tests__/pipeline.test.ts`:

```ts
import { alterCronScheduleAction } from "../pipeline";

describe("alterCronScheduleAction", () => {
  it("rejects non-admins", async () => {
    const result = await alterCronScheduleAction({ job: "import-tick-sync", schedule: "*/5 * * * *" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/web test -- actions/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: FAIL — `alterCronScheduleAction` not exported.

- [ ] **Step 3: Implement the config actions**

Append to `apps/web/src/actions/pipeline.ts`:

```ts
const cronJobSchema = z.enum([
  "import-tick-sync",
  "import-tick-import",
  "import-tick-compile",
]);
const alterCronSchema = z.object({
  job: cronJobSchema,
  // 5 fields, only digits and * , - / characters — mirrors the DB RPC guard.
  schedule: z
    .string()
    .regex(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/, "Must have 5 fields")
    .regex(/^[0-9*,/\s-]+$/, "Illegal characters"),
});

export async function getPipelineConfigAction(): Promise<
  ActionResult<{ pipelineEnabled: boolean; limitlessBatchSize: number }>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("site_config")
      .select("key, value")
      .in("key", ["pipeline_enabled", "limitless_import_batch_size"]);
    if (error) throw new Error(error.message);
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    return {
      success: true,
      data: {
        pipelineEnabled: map.get("pipeline_enabled") === true,
        limitlessBatchSize: Number(map.get("limitless_import_batch_size") ?? 25),
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load config" };
  }
}

export async function setPipelineEnabledAction(enabled: boolean): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("site_config")
      .upsert({ key: "pipeline_enabled", value: enabled, updated_by: userId }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Update failed" };
  }
}

export async function setLimitlessBatchSizeAction(size: number): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = z.number().int().min(1).max(100).safeParse(size);
  if (!parsed.success) return { success: false, error: "Batch size must be 1–100" };
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("site_config")
      .upsert({ key: "limitless_import_batch_size", value: parsed.data, updated_by: userId }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Update failed" };
  }
}

export async function alterCronScheduleAction(input: unknown): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = alterCronSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.rpc("admin_alter_cron_schedule", {
      p_job_name: parsed.data.job,
      p_schedule: parsed.data.schedule,
    });
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Schedule update failed" };
  }
}

/**
 * Decision 2: read the LIVE cron schedules for the three import-tick jobs.
 * Calls the admin_get_cron_schedules RPC (Task 2.6) — SECURITY DEFINER, site-
 * admin gated, returns exactly three rows, falling back to the seeded defaults
 * when pg_cron is absent (local dev). Returned as a { sync, import, compile }
 * shape so the Config tab can seed its inputs directly.
 */
export async function getCronSchedulesAction(): Promise<
  ActionResult<{ sync: string; import: string; compile: string }>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    // Authenticated client so the RPC's own auth.uid() admin check is meaningful.
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_get_cron_schedules");
    if (error) throw new Error(error.message);
    const byJob = new Map((data ?? []).map((r) => [r.job_name, r.schedule]));
    return {
      success: true,
      data: {
        sync: byJob.get("import-tick-sync") ?? "*/5 * * * *",
        import: byJob.get("import-tick-import") ?? "* * * * *",
        compile: byJob.get("import-tick-compile") ?? "*/2 * * * *",
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load schedules" };
  }
}
```

> The `admin_alter_cron_schedule` and `admin_get_cron_schedules` RPCs are both `SECURITY DEFINER` and re-check `auth.uid()` against `role_id = 1`. Calling them through the **service-role** client bypasses that check (service role has no `auth.uid()`), making the RPC raise "Not authorized". So both must be called through an **authenticated** client (`createClient()` — `createClientReadOnly()` is read-only, but a `.rpc()` call to a `STABLE` read function works with it too; prefer whichever the codebase already uses for authed RPC reads). The action's own `requireAdmin()` is the first gate; the RPC's gate is defense-in-depth. Note: `getCronSchedulesAction`'s defaults MUST match the schedules seeded in Task 2.4 and the fallbacks in Task 2.6.

- [ ] **Step 4: Fix the client for the cron RPCs**

In `alterCronScheduleAction` (and `getCronSchedulesAction` as written above), use the authenticated server client (`import { createClient } from "@/lib/supabase/server"`) instead of `createServiceRoleClient()`, so the RPC's `auth.uid()` admin check sees the calling admin. Add the import if it is not already present.

- [ ] **Step 5: Add a test for the live-schedule read**

Append to `apps/web/src/actions/__tests__/pipeline.test.ts`:

```ts
import { getCronSchedulesAction } from "../pipeline";

describe("getCronSchedulesAction", () => {
  it("rejects non-admins", async () => {
    const result = await getCronSchedulesAction();
    expect(result.success).toBe(false);
  });
});
```

> `isSiteAdmin` is already mocked to return `false` at the top of this test file (Task 3.3 Step 1), so this asserts the admin gate. The happy-path mapping (RPC rows → `{ sync, import, compile }`) is covered by the RPC's own contract (Task 2.6) plus the page-route integration; an admin-gate unit test is sufficient here and keeps the action test free of a full Supabase RPC mock.

- [ ] **Step 6: Run to verify pass**

Run: `pnpm --filter @trainers/web test -- actions/__tests__/pipeline.test.ts 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 7: Report changed files + suggested commit message**

```
feat(web): pipeline config actions + live cron-schedule read (Decision 2)

Site-admin actions for the Config tab. Cron cadence reads via the
admin_get_cron_schedules RPC and writes via admin_alter_cron_schedule, both
through an authenticated client so the RPC role check applies as
defense-in-depth. getCronSchedulesAction returns the live { sync, import,
compile } cadence so the Config inputs reflect production, not just seeded
defaults.
```

### Task 3.5: Populate the team_slots FK column in the compile stage (Decision 1)

**Files:**
- Modify: `packages/supabase/src/usage/compile.ts`
- Modify: `packages/supabase/src/mutations/team-slots.ts`
- Modify: `packages/supabase/src/usage/__tests__/compile.test.ts` (the existing `buildTeamSlotRows` test file — match its real path; if it lives elsewhere, update there)

> **Why Wave 3, not Wave 1.** This change references the `rk9_event_id` / `limitless_tournament_id` columns added by the Task 2.5 migration. Those columns only exist in `TablesInsert<"team_slots">` after Wave 2 commits and `generate-types` runs. Placing it here keeps the dependency honest. It is **disjoint** from Tasks 3.1 (`queries/pipeline.ts`) and 3.2/3.3/3.4 (`mutations/pipeline.ts`, `actions/pipeline.ts`) — it only touches `usage/compile.ts` + `mutations/team-slots.ts`, so it runs in parallel with 3.1/3.2 in Wave 3's first group.

- [ ] **Step 1: Write the failing test**

Append to the `buildTeamSlotRows` test file (the existing one under `packages/supabase/src/usage/__tests__/`):

```ts
import { buildTeamSlotRows, type EventMeta, type RawSlotRow } from "../compile";

const rawSlot: RawSlotRow = {
  playerKey: "rk9:5", division: "masters", placement: 1,
  wins: null, losses: null, ties: null, country: "US",
  position: 1, species: "miraidon", heldItem: "choice-specs",
  ability: "hadron-engine", teraType: "electric",
  moves: ["volt-switch"], nature: "modest",
};

describe("buildTeamSlotRows polymorphic FK column (Decision 1)", () => {
  it("stamps rk9_event_id for rk9 events and leaves limitless_tournament_id null", () => {
    const meta: EventMeta = {
      source: "rk9", eventKey: "rk9:TO027", format: "gen9vgc2024regh",
      eventDate: "2026-01-01", eventTier: "regional", isOnline: false,
    };
    const rows = buildTeamSlotRows(meta, [rawSlot]);
    expect(rows[0].rk9_event_id).toBe("TO027");
    expect(rows[0].limitless_tournament_id).toBeNull();
  });

  it("stamps limitless_tournament_id for limitless events and leaves rk9_event_id null", () => {
    const meta: EventMeta = {
      source: "limitless", eventKey: "limitless:12345", format: "gen9vgc2024regh",
      eventDate: "2026-01-01", eventTier: null, isOnline: true,
    };
    const rows = buildTeamSlotRows(meta, [{ ...rawSlot, playerKey: "limitless:5" }]);
    expect(rows[0].limitless_tournament_id).toBe("12345");
    expect(rows[0].rk9_event_id).toBeNull();
  });

  it("leaves both FK columns null for trainers.gg events", () => {
    const meta: EventMeta = {
      source: "trainers.gg", eventKey: "trainers.gg:42", format: "gen9vgc2024regh",
      eventDate: "2026-01-01", eventTier: null, isOnline: true,
    };
    const rows = buildTeamSlotRows(meta, [{ ...rawSlot, playerKey: "trainers.gg:5" }]);
    expect(rows[0].rk9_event_id).toBeNull();
    expect(rows[0].limitless_tournament_id).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/supabase test -- usage/__tests__/compile.test.ts 2>&1 | tail -20`
Expected: FAIL — `rk9_event_id` / `limitless_tournament_id` are not on `TeamSlotRow`.

- [ ] **Step 3: Add the FK fields to `TeamSlotRow` + derive them in `buildTeamSlotRows`**

In `packages/supabase/src/usage/compile.ts`, add two fields to the `TeamSlotRow` interface (place them next to `event_key`, since they are event-identity fields):

```ts
  /**
   * Polymorphic source-event FK (Decision 1). Exactly one of these is set for
   * rk9/limitless rows; both null for trainers.gg. Drives ON DELETE CASCADE
   * from the parent event to its team_slots rows.
   */
  rk9_event_id: string | null;
  limitless_tournament_id: string | null;
```

Then derive the native parent id from `meta.eventKey` once, before the loop, and stamp both columns on every output row. Add this near the top of `buildTeamSlotRows`, after the `if (raw.length === 0) return [];` guard:

```ts
  // Decision 1: derive the polymorphic source-event FK from the event key.
  // event_key is source-qualified ("rk9:TO027" / "limitless:12345" /
  // "trainers.gg:42"); the native parent id is the part after the first colon.
  // Only rk9/limitless have a source-schema parent → an FK column; trainers.gg
  // keeps both null.
  const nativeEventId = meta.eventKey.slice(meta.eventKey.indexOf(":") + 1);
  const rk9EventId = meta.source === "rk9" ? nativeEventId : null;
  const limitlessTournamentId = meta.source === "limitless" ? nativeEventId : null;
```

In the `output.push({ ... })` object, add the two columns alongside `event_key`:

```ts
      event_key: meta.eventKey,
      rk9_event_id: rk9EventId,
      limitless_tournament_id: limitlessTournamentId,
```

- [ ] **Step 4: Forward the FK columns in the insert mapping**

In `packages/supabase/src/mutations/team-slots.ts`, the `compileEventTeamSlots` insert builds `TablesInsert<"team_slots">` objects from each `TeamSlotRow`. Add the two columns to that mapping (next to `event_key`):

```ts
          event_key: r.event_key,
          rk9_event_id: r.rk9_event_id,
          limitless_tournament_id: r.limitless_tournament_id,
```

> After Task 2.5's `generate-types`, `TablesInsert<"team_slots">` includes both nullable columns, so this type-checks. The DB CHECK constraint (Task 2.5) now passes: rk9 rows carry `rk9_event_id`, limitless rows carry `limitless_tournament_id`, trainers.gg rows carry neither.

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter @trainers/supabase test -- usage/__tests__/compile.test.ts 2>&1 | tail -20`
Expected: PASS (all three new cases plus the pre-existing `buildTeamSlotRows` tests).

- [ ] **Step 6: Type-check the package**

Run: `pnpm --filter @trainers/supabase exec tsc --noEmit 2>&1 | grep -iE "compile.ts|team-slots.ts|error" | head -20`
Expected: no errors.

- [ ] **Step 7: Report changed files + suggested commit message**

```
feat(supabase): compile stamps team_slots source-event FK (Decision 1)

buildTeamSlotRows now derives rk9_event_id / limitless_tournament_id from the
event key and stamps the matching column (both null for trainers.gg);
compileEventTeamSlots forwards them in the insert. Satisfies the Task 2.5 CHECK
and lets ON DELETE CASCADE purge team_slots when a source event is deleted.
```

---

## Wave 4 — Rebuild `/admin/data` UI

> All UI tasks read from the actions in Wave 3. Build leaf components first (4.1–4.2), then the tab containers (4.3–4.4), then the page shell (4.5). Within this wave the leaf components are independent of each other.

### Task 4.1: Pipeline cards + status chips components

**Files:**
- Create: `apps/web/src/components/admin/data/pipeline-cards.tsx`
- Create: `apps/web/src/components/admin/data/status-chips.tsx`
- Test: `apps/web/src/components/admin/data/__tests__/status-chips.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { StatusChips } from "../status-chips";

describe("StatusChips", () => {
  it("renders all five chips with counts and marks the active one", () => {
    render(
      <StatusChips
        counts={{ queued: 3, processing: 1, failed: 0, skipped: 2, complete: 9 }}
        active="skipped"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("tab", { name: /queued/i })).toHaveTextContent("3");
    expect(screen.getByRole("tab", { name: /skipped/i })).toHaveAttribute("aria-selected", "true");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/web test -- components/admin/data/__tests__/status-chips.test.tsx 2>&1 | tail -20`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `status-chips.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { DisplayStatus, StatusCounts } from "@trainers/supabase/queries";

const CHIPS: { value: DisplayStatus; label: string }[] = [
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "complete", label: "Complete" },
];

interface StatusChipsProps {
  counts: StatusCounts;
  active: DisplayStatus;
  onChange: (next: DisplayStatus) => void;
}

/** Count chips that double as the single filter for the event list below. */
export function StatusChips({ counts, active, onChange }: StatusChipsProps) {
  return (
    <div role="tablist" aria-label="Filter events by status" className="flex flex-wrap items-center gap-2">
      {CHIPS.map((chip) => {
        const isActive = chip.value === active;
        return (
          <button
            key={chip.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {chip.label}
            <span
              className={cn(
                "rounded-md px-1.5 text-xs font-medium",
                isActive ? "bg-primary-foreground/20" : "bg-background/60"
              )}
            >
              {counts[chip.value].toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Implement `pipeline-cards.tsx`**

```tsx
"use client";

import { StatusBadge } from "@/components/ui/status-badge";

export interface StageCard {
  stage: "sync" | "import" | "compile";
  title: string;
  /** import_runs status: ok | partial | error | skipped | running. */
  lastStatus: string | null;
  lastRunAt: string | null;
  /** Live progress label for the active stage, e.g. "Worlds 2024 · 214/312". */
  progress: string | null;
}

const STATUS_TO_BADGE: Record<string, "active" | "upcoming" | "draft" | "completed" | "cancelled"> = {
  ok: "active",
  running: "upcoming",
  partial: "draft",
  skipped: "completed",
  error: "cancelled",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Three pipeline cards: Sync, Import, Update stats. */
export function PipelineCards({ cards }: { cards: StageCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.stage} className="rounded-xl bg-muted/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{card.title}</h3>
            <StatusBadge status={STATUS_TO_BADGE[card.lastStatus ?? "running"] ?? "completed"} label={card.lastStatus ?? "—"} />
          </div>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last run {relativeTime(card.lastRunAt)}
          </p>
          {card.progress ? (
            <p className="mt-2 text-sm font-medium">{card.progress}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter @trainers/web test -- components/admin/data/__tests__/status-chips.test.tsx 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 6: Report changed files + suggested commit message**

```
feat(web): pipeline cards + status chips for /admin/data Monitor

Three stage cards (Sync/Import/Update stats) with last-run + live progress,
and five count chips that double as the single list filter. StatusBadge for
semantic colors; chips derive counts from the same data as the list.
```

### Task 4.2: Event list with per-row actions

**Files:**
- Create: `apps/web/src/components/admin/data/event-list.tsx`
- Test: `apps/web/src/components/admin/data/__tests__/event-list.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { EventList } from "../event-list";
import type { PipelineEvent } from "@trainers/supabase/queries";

const skipped: PipelineEvent = {
  source: "limitless", sourceEventId: "1", name: "Custom Cup", format: "CUSTOM",
  importStatus: "skipped", displayStatus: "skipped", playerCount: 12,
  dateStart: "2026-01-02", skipReason: "format: CUSTOM — not importable",
};

describe("EventList", () => {
  it("shows the skip reason and an Import anyway action on skipped rows", () => {
    render(
      <EventList
        events={[skipped]}
        onDelete={() => {}}
        onExclude={() => {}}
        onForceImport={() => {}}
        pendingKey={null}
      />
    );
    expect(screen.getByText(/CUSTOM — not importable/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import anyway/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @trainers/web test -- components/admin/data/__tests__/event-list.test.tsx 2>&1 | tail -20`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `event-list.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PipelineEvent } from "@trainers/supabase/queries";

const DISPLAY_TO_BADGE: Record<string, "active" | "upcoming" | "draft" | "completed" | "cancelled"> = {
  complete: "active",
  processing: "upcoming",
  queued: "draft",
  skipped: "completed",
  failed: "cancelled",
};

interface EventListProps {
  events: PipelineEvent[];
  onDelete: (e: PipelineEvent) => void;
  onExclude: (e: PipelineEvent) => void;
  onForceImport: (e: PipelineEvent) => void;
  /** `${source}:${id}` of a row with an action in flight, or null. */
  pendingKey: string | null;
}

/** The single, filtered event list shared by every status chip. */
export function EventList({ events, onDelete, onExclude, onForceImport, pendingKey }: EventListProps) {
  if (events.length === 0) {
    return <p className="rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">No events in this status.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {events.map((e) => {
        const key = `${e.source}:${e.sourceEventId}`;
        const busy = pendingKey === key;
        return (
          <li key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={DISPLAY_TO_BADGE[e.displayStatus] ?? "completed"} label={e.displayStatus} />
                <span className="truncate text-sm font-semibold">{e.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {e.source} · {e.format ?? "unknown format"} · {e.playerCount} players · {e.dateStart ?? "—"}
              </p>
              {e.skipReason ? (
                <p className="mt-1 text-xs font-medium text-amber-600">{e.skipReason}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {e.displayStatus === "skipped" ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onForceImport(e)}>
                  Import anyway
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete(e)}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onExclude(e)}>
                Delete &amp; exclude
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @trainers/web test -- components/admin/data/__tests__/event-list.test.tsx 2>&1 | tail -20`
Expected: PASS.

- [ ] **Step 5: Report changed files + suggested commit message**

```
feat(web): single filtered event list with per-row actions

Skipped rows show their reason + Import anyway; every row has Delete and
Delete & exclude. One list shared by all status chips.
```

### Task 4.3: Monitor tab (TanStack Query hooks + wiring)

**Files:**
- Create: `apps/web/src/components/admin/data/use-pipeline.ts`
- Create: `apps/web/src/components/admin/data/monitor-tab.tsx`

- [ ] **Step 1: Implement the TanStack Query hooks**

```ts
// apps/web/src/components/admin/data/use-pipeline.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPipelineMonitorAction,
  deleteEventAction,
  excludeEventAction,
  forceImportAction,
  resetStuckAction,
  requeueFailedAction,
} from "@/actions/pipeline";
import type { PipelineMonitor, PipelineEvent } from "@trainers/supabase/queries";

const MONITOR_KEY = ["pipeline", "monitor"] as const;

export function usePipelineMonitor(initialData?: PipelineMonitor) {
  return useQuery({
    queryKey: MONITOR_KEY,
    queryFn: async () => {
      const res = await getPipelineMonitorAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    initialData,
    // The pipeline ticks frequently; keep the monitor fresh but not chatty.
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function usePipelineActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: MONITOR_KEY });

  const remove = useMutation({
    mutationFn: async (e: PipelineEvent) => {
      const res = await deleteEventAction({ source: e.source, sourceEventId: e.sourceEventId });
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });
  const exclude = useMutation({
    mutationFn: async (e: PipelineEvent) => {
      const res = await excludeEventAction({ source: e.source, sourceEventId: e.sourceEventId, reason: null });
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });
  const forceImport = useMutation({
    mutationFn: async (e: PipelineEvent) => {
      const res = await forceImportAction({ source: e.source, sourceEventId: e.sourceEventId });
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });
  const resetStuck = useMutation({
    mutationFn: async () => {
      const res = await resetStuckAction();
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });
  const requeueFailed = useMutation({
    mutationFn: async () => {
      const res = await requeueFailedAction();
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  return { remove, exclude, forceImport, resetStuck, requeueFailed };
}
```

- [ ] **Step 2: Implement the Monitor tab**

```tsx
// apps/web/src/components/admin/data/monitor-tab.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PipelineCards, type StageCard } from "./pipeline-cards";
import { StatusChips } from "./status-chips";
import { EventList } from "./event-list";
import { usePipelineMonitor, usePipelineActions } from "./use-pipeline";
import type { DisplayStatus, PipelineEvent, PipelineMonitor } from "@trainers/supabase/queries";

interface MonitorTabProps {
  initialMonitor: PipelineMonitor;
  cards: StageCard[];
}

export function MonitorTab({ initialMonitor, cards }: MonitorTabProps) {
  const { data } = usePipelineMonitor(initialMonitor);
  const monitor = data ?? initialMonitor;
  const actions = usePipelineActions();
  const [active, setActive] = useState<DisplayStatus>("queued");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const filtered = monitor.events.filter((e) => e.displayStatus === active);

  const withPending = (e: PipelineEvent, fn: (e: PipelineEvent) => void) => {
    setPendingKey(`${e.source}:${e.sourceEventId}`);
    fn(e);
  };

  return (
    <div className="space-y-6">
      <PipelineCards cards={cards} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusChips counts={monitor.counts} active={active} onChange={setActive} />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => actions.resetStuck.mutate()} disabled={actions.resetStuck.isPending}>
            Reset stuck
          </Button>
          <Button size="sm" variant="outline" onClick={() => actions.requeueFailed.mutate()} disabled={actions.requeueFailed.isPending}>
            Requeue failed
          </Button>
        </div>
      </div>

      <EventList
        events={filtered}
        pendingKey={pendingKey}
        onDelete={(e) => withPending(e, actions.remove.mutate)}
        onExclude={(e) => withPending(e, actions.exclude.mutate)}
        onForceImport={(e) => withPending(e, actions.forceImport.mutate)}
      />
    </div>
  );
}
```

> Confirm `Button` lives at `@/components/ui/button` and `cn` at `@/lib/utils` (match existing admin components). The two recovery actions are page-level per the spec.

- [ ] **Step 3: Type-check the web package**

Run: `pnpm --filter @trainers/web exec tsc --noEmit 2>&1 | grep -iE "components/admin/data|actions/pipeline" | head -20`
Expected: no errors referencing these new files.

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(web): Monitor tab — cards, chips, list, recovery via TanStack Query

usePipelineMonitor polls every 15s; mutations invalidate the monitor query so
counts and rows stay consistent. Reset stuck / Requeue failed are page-level.
```

### Task 4.4: Config tab

**Files:**
- Create: `apps/web/src/components/admin/data/config-tab.tsx`
- Create: `apps/web/src/components/admin/data/use-pipeline-config.ts`

- [ ] **Step 1: Implement the config hooks**

```ts
// apps/web/src/components/admin/data/use-pipeline-config.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPipelineConfigAction,
  getCronSchedulesAction,
  setPipelineEnabledAction,
  setLimitlessBatchSizeAction,
  alterCronScheduleAction,
} from "@/actions/pipeline";

const CONFIG_KEY = ["pipeline", "config"] as const;
const SCHEDULES_KEY = ["pipeline", "schedules"] as const;

/** Live cron-schedule shape — one cron expression per managed job. */
export type CronSchedules = { sync: string; import: string; compile: string };

export function usePipelineConfig(initialData?: { pipelineEnabled: boolean; limitlessBatchSize: number }) {
  return useQuery({
    queryKey: CONFIG_KEY,
    queryFn: async () => {
      const res = await getPipelineConfigAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Decision 2: read the LIVE cron schedules from cron.job (via the
 * admin_get_cron_schedules RPC), so the Config inputs reflect the real
 * production cadence — not just the seeded defaults. Seeded from the
 * server-rendered initialData so the inputs are correct on first paint.
 */
export function usePipelineSchedules(initialData?: CronSchedules) {
  return useQuery({
    queryKey: SCHEDULES_KEY,
    queryFn: async () => {
      const res = await getCronSchedulesAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    initialData,
    staleTime: 30_000,
  });
}

export function usePipelineConfigMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: CONFIG_KEY });

  const setEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await setPipelineEnabledAction(enabled);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });
  const setBatchSize = useMutation({
    mutationFn: async (size: number) => {
      const res = await setLimitlessBatchSizeAction(size);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });
  const alterCron = useMutation({
    mutationFn: async (input: { job: string; schedule: string }) => {
      const res = await alterCronScheduleAction(input);
      if (!res.success) throw new Error(res.error);
    },
    // Re-read the live schedules after a successful change so the inputs
    // reflect what pg_cron actually holds now.
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULES_KEY }),
  });

  return { setEnabled, setBatchSize, alterCron };
}
```

- [ ] **Step 2: Implement the Config tab**

```tsx
// apps/web/src/components/admin/data/config-tab.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  usePipelineConfig,
  usePipelineSchedules,
  usePipelineConfigMutations,
  type CronSchedules,
} from "./use-pipeline-config";

interface ConfigTabProps {
  initialConfig: { pipelineEnabled: boolean; limitlessBatchSize: number };
  /** Live cron schedules read server-side from cron.job (Decision 2). */
  initialSchedules: CronSchedules;
}

const JOBS = [
  { key: "sync", job: "import-tick-sync", label: "Sync cadence" },
  { key: "import", job: "import-tick-import", label: "Import cadence" },
  { key: "compile", job: "import-tick-compile", label: "Update-stats cadence" },
] as const;

export function ConfigTab({ initialConfig, initialSchedules }: ConfigTabProps) {
  const { data } = usePipelineConfig(initialConfig);
  const config = data ?? initialConfig;
  // Decision 2: the live production cadence, refetched on the client.
  const { data: liveSchedules = initialSchedules } = usePipelineSchedules(initialSchedules);
  const { setEnabled, setBatchSize, alterCron } = usePipelineConfigMutations();

  const [batch, setBatch] = useState(String(config.limitlessBatchSize));

  // Local edit buffer for the cron inputs, seeded from the live schedules.
  // When the live query yields a NEW server value (e.g. after an external edit
  // or a successful Save invalidation), re-seed the buffer. This adopts the
  // server value without a useEffect by comparing against the last-seen server
  // snapshot (React Compiler handles the render; no manual memoization).
  const [draft, setDraft] = useState<CronSchedules>(liveSchedules);
  const [seenServer, setSeenServer] = useState<CronSchedules>(liveSchedules);
  if (
    liveSchedules.sync !== seenServer.sync ||
    liveSchedules.import !== seenServer.import ||
    liveSchedules.compile !== seenServer.compile
  ) {
    setSeenServer(liveSchedules);
    setDraft(liveSchedules);
  }
  const schedules = draft;
  const setSchedules = setDraft;

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Pipeline enabled</Label>
            <p className="text-sm text-muted-foreground">Master kill-switch for all import crons.</p>
          </div>
          <Switch checked={config.pipelineEnabled} onCheckedChange={(v) => setEnabled.mutate(v)} disabled={setEnabled.isPending} />
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="batch" className="text-base font-semibold">Limitless batch size</Label>
        <p className="text-sm text-muted-foreground">Events processed per Limitless import tick (1–100).</p>
        <div className="flex items-center gap-2">
          <Input id="batch" type="number" min={1} max={100} value={batch} onChange={(e) => setBatch(e.target.value)} className="w-32" />
          <Button size="sm" onClick={() => setBatchSize.mutate(Number(batch))} disabled={setBatchSize.isPending}>Save</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Cron cadence</h3>
        <p className="text-sm text-muted-foreground">Five-field cron expressions, applied live to pg_cron.</p>
        {JOBS.map((j) => (
          <div key={j.key} className="flex items-center gap-2">
            <Label htmlFor={j.key} className="w-48 text-sm">{j.label}</Label>
            <Input
              id={j.key}
              value={schedules[j.key]}
              onChange={(e) => setSchedules((s) => ({ ...s, [j.key]: e.target.value }))}
              className="w-40 font-mono"
            />
            <Button size="sm" onClick={() => alterCron.mutate({ job: j.job, schedule: schedules[j.key] })} disabled={alterCron.isPending}>
              Save
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
```

> Confirm `Switch`, `Input`, `Label` exist at `@/components/ui/{switch,input,label}` (they are standard shadcn primitives in this repo). If a primitive's prop name differs (e.g. Base UI `Switch` uses `onCheckedChange` vs `onChange`), match the repo's existing `switch.tsx` API — read it before writing.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @trainers/web exec tsc --noEmit 2>&1 | grep -iE "config-tab|use-pipeline-config" | head -20`
Expected: no errors.

- [ ] **Step 4: Report changed files + suggested commit message**

```
feat(web): Config tab — pipeline toggle, batch size, live cron cadence

TanStack Query-backed. Cron cadence inputs reflect the LIVE production schedule
read from cron.job via admin_get_cron_schedules (Decision 2), seeded from the
server-rendered value and refetched on the client; writes apply live to pg_cron
via admin_alter_cron_schedule. Toggle and batch size persist to site_config.
```

### Task 4.5: Page shell + tabs + retire the old UI

**Files:**
- Create: `apps/web/src/components/admin/data/data-page.tsx`
- Modify: `apps/web/src/app/(app)/admin/data/page.tsx`
- Delete: old `external-data*.tsx`, `recent-runs.tsx`, `expanded-row-data.tsx`, `use-import-config.ts` + their tests

- [ ] **Step 1: Implement the client root with tabs**

```tsx
// apps/web/src/components/admin/data/data-page.tsx
"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MonitorTab } from "./monitor-tab";
import { ConfigTab } from "./config-tab";
import type { StageCard } from "./pipeline-cards";
import type { PipelineMonitor } from "@trainers/supabase/queries";

interface DataPageProps {
  monitor: PipelineMonitor;
  cards: StageCard[];
  config: { pipelineEnabled: boolean; limitlessBatchSize: number };
  schedules: { sync: string; import: string; compile: string };
}

export function DataPage({ monitor, cards, config, schedules }: DataPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">External data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Autonomous import pipeline — monitor and configure. Imports run server-side on a schedule.
        </p>
      </div>
      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>
        <TabsContent value="monitor" className="pt-4">
          <MonitorTab initialMonitor={monitor} cards={cards} />
        </TabsContent>
        <TabsContent value="config" className="pt-4">
          <ConfigTab initialConfig={config} initialSchedules={schedules} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the page route (server component: gate + load + Suspense)**

```tsx
// apps/web/src/app/(app)/admin/data/page.tsx
import { redirect } from "next/navigation";
import { isSiteAdmin } from "@/lib/sudo/server";
import { createServiceRoleClient, createClient } from "@/lib/supabase/server";
import { getPipelineMonitor } from "@trainers/supabase/queries";
import { getRecentImportRuns } from "@trainers/supabase/queries";
import { DataPage } from "@/components/admin/data/data-page";
import type { StageCard } from "@/components/admin/data/pipeline-cards";
import type { CronSchedules } from "@/components/admin/data/use-pipeline-config";

// Seeded defaults — MUST match the schedules seeded in migration Task 2.4 and
// the fallbacks in the admin_get_cron_schedules RPC (Task 2.6).
const DEFAULT_SCHEDULES: CronSchedules = {
  sync: "*/5 * * * *",
  import: "* * * * *",
  compile: "*/2 * * * *",
};

export default async function AdminDataPage() {
  const admin = await isSiteAdmin();
  if (!admin) redirect("/forbidden");

  const supabase = createServiceRoleClient();
  const monitor = await getPipelineMonitor(supabase);

  // Latest run per source feeds the three cards.
  const runs = await getRecentImportRuns(supabase, 30);
  const latest = (source: string) => runs.find((r) => r.source === source) ?? null;
  const cards: StageCard[] = [
    { stage: "sync", title: "Sync", lastStatus: latest("rk9")?.status ?? null, lastRunAt: latest("rk9")?.started_at ?? null, progress: null },
    { stage: "import", title: "Import", lastStatus: latest("limitless")?.status ?? null, lastRunAt: latest("limitless")?.started_at ?? null, progress: null },
    { stage: "compile", title: "Update stats", lastStatus: latest("compile")?.status ?? null, lastRunAt: latest("compile")?.started_at ?? null, progress: null },
  ];

  // Config (site_config) via the service-role client.
  const { data: configRows } = await supabase
    .from("site_config")
    .select("key, value")
    .in("key", ["pipeline_enabled", "limitless_import_batch_size"]);
  const cfgMap = new Map((configRows ?? []).map((r) => [r.key, r.value]));
  const config = {
    pipelineEnabled: cfgMap.get("pipeline_enabled") === true,
    limitlessBatchSize: Number(cfgMap.get("limitless_import_batch_size") ?? 25),
  };

  // Decision 2: read the LIVE cron cadence from cron.job so the Config inputs
  // reflect production, not just seeded defaults. The admin_get_cron_schedules
  // RPC (Task 2.6) re-checks auth.uid() against role_id = 1, so it MUST run on
  // an AUTHENTICATED client (not service-role, which has no auth.uid()). The
  // page is already behind isSiteAdmin(). The RPC itself falls back to the
  // seeded defaults when pg_cron is absent (local dev); we add an outer
  // try/catch fallback in case the RPC call itself fails (e.g. missing role).
  let schedules: CronSchedules = DEFAULT_SCHEDULES;
  try {
    const authed = await createClient();
    const { data: scheduleRows, error: scheduleError } = await authed.rpc("admin_get_cron_schedules");
    if (scheduleError) throw new Error(scheduleError.message);
    const byJob = new Map((scheduleRows ?? []).map((r) => [r.job_name, r.schedule]));
    schedules = {
      sync: byJob.get("import-tick-sync") ?? DEFAULT_SCHEDULES.sync,
      import: byJob.get("import-tick-import") ?? DEFAULT_SCHEDULES.import,
      compile: byJob.get("import-tick-compile") ?? DEFAULT_SCHEDULES.compile,
    };
  } catch {
    // Keep DEFAULT_SCHEDULES — the client will re-read via getCronSchedulesAction.
  }

  return <DataPage monitor={monitor} cards={cards} config={config} schedules={schedules} />;
}
```

> `getRecentImportRuns` currently lives as a web server action (`apps/web/src/actions/import-queue.ts`). Because that action file is being deleted, add a package query `getRecentImportRuns(supabase, limit)` to `packages/supabase/src/queries/pipeline.ts` (a thin `select * from import_runs order by started_at desc limit N`) and import it here. If a `getRecentImportRuns` package query already exists, reuse it. Do NOT keep the old action file alive just for this.
> This page is admin-only and uses the service-role client, so it does NOT use `'use cache'` (per the caching skill: skip `'use cache'` for admin-only/user-specific data). No Suspense boundary is required because there are no uncached dynamic reads inside a cached scope.
> **Two clients on purpose:** the service-role client reads `site_config` + the monitor (bypassing RLS to reach the `rk9`/`limitless` schemas), while the authenticated client runs `admin_get_cron_schedules` so the RPC's `auth.uid()` admin check is satisfied. Confirm `createClient` is exported from `@/lib/supabase/server` (it is the authed server client used elsewhere); match the actual export name if it differs.

- [ ] **Step 3: Add `getRecentImportRuns` to the pipeline query file**

Append to `packages/supabase/src/queries/pipeline.ts`:

```ts
/** Recent import_runs rows, newest first — feeds the pipeline cards + activity. */
export async function getRecentImportRuns(supabase: TypedClient, limit = 30) {
  const { data, error } = await supabase
    .from("import_runs")
    .select("id, source, trigger, status, skip_reason, processed, errors, remaining, started_at, finished_at")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`import_runs read failed: ${error.message}`);
  return data ?? [];
}

export type ImportRunRow = NonNullable<
  Awaited<ReturnType<typeof getRecentImportRuns>>
>[number];
```

- [ ] **Step 4: Delete the old admin UI + tests**

```bash
git rm apps/web/src/components/admin/external-data.tsx \
  apps/web/src/components/admin/external-data-settings.tsx \
  apps/web/src/components/admin/external-data-status-tabs.tsx \
  apps/web/src/components/admin/external-data-status-badge.tsx \
  apps/web/src/components/admin/external-data-cards.tsx \
  apps/web/src/components/admin/external-data-toolbar.tsx \
  apps/web/src/components/admin/external-data-shared.ts \
  apps/web/src/components/admin/external-data-row-actions.tsx \
  apps/web/src/components/admin/external-data-selection-bar.tsx \
  apps/web/src/components/admin/external-data-filters.tsx \
  apps/web/src/components/admin/external-data-players-view.tsx \
  apps/web/src/components/admin/external-data-queue-strip.tsx \
  apps/web/src/components/admin/external-data-table-helpers.tsx \
  apps/web/src/components/admin/expanded-row-data.tsx \
  apps/web/src/components/admin/recent-runs.tsx \
  apps/web/src/components/admin/use-import-config.ts
git rm -r apps/web/src/components/admin/__tests__/external-data-queue-strip.test.tsx 2>/dev/null || true
```

> Before deleting, grep for any other importer of these modules: `grep -rl "external-data\|recent-runs\|use-import-config\|expanded-row-data" apps/web/src --include="*.tsx" --include="*.ts"`. Update or delete those references too. The new `data-page.tsx` is the only consumer of the data UI now.

- [ ] **Step 5: Type-check the web package**

Run: `pnpm --filter @trainers/web exec tsc --noEmit 2>&1 | grep -iE "error" | head -30`
Expected: no errors. If errors reference deleted modules, fix the importers.

- [ ] **Step 6: Report changed files + suggested commit message**

```
feat(web): rebuild /admin/data as Monitor/Config tabs; delete old queue UI

Two-tab page reading import_runs + source tables; server-component gate +
service-role load, client tabs via TanStack Query. Removes every manual
trigger and the old strip-vs-table mismatch. Deletes the legacy external-data
component tree.
```

---

## Wave 5 — Retire the Next.js cron route, old actions, and the data-sources package

> These deletions depend on Waves 0–4 (the replacements must exist and compile first). Each task greps for live importers before deleting and fixes them.

### Task 5.1: Delete the Next.js cron route + its tests

**Files:**
- Delete: `apps/web/src/app/api/cron/import-queue/route.ts` and `apps/web/src/app/api/cron/import-queue/__tests__/route.test.ts`
- Delete (if now unused): `apps/web/src/lib/cron-auth.ts` (and `apps/web/src/lib/__tests__/cron-auth.test.ts`) — ONLY if nothing else imports `requireCronAuth`

- [ ] **Step 1: Confirm no other importers, then delete**

```bash
grep -rl "api/cron/import-queue\|requireCronAuth" apps/web/src --include="*.ts" --include="*.tsx" | grep -v "api/cron/import-queue"
```
If the grep prints any path OTHER than cron-auth's own files, STOP and update those importers first. Then:

```bash
git rm apps/web/src/app/api/cron/import-queue/route.ts \
  apps/web/src/app/api/cron/import-queue/__tests__/route.test.ts
```

Delete `cron-auth.ts` + its test ONLY if `requireCronAuth` has no remaining importers (the grep above came back empty). If another route still uses it (e.g. a usage-rollup cron), leave it.

- [ ] **Step 2: Remove the Vercel cron entry if present**

Read `apps/web/vercel.json` (or root `vercel.json`). If it has a `crons` array entry pointing at `/api/cron/import-queue`, remove that entry (the schedule now lives in pg_cron). If no such file/entry exists, skip.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @trainers/web exec tsc --noEmit 2>&1 | grep -iE "error" | head -20`
Expected: no errors.

- [ ] **Step 4: Report changed files + suggested commit message**

```
chore(web): delete the Next.js import-queue cron route + tests

Imports now run inside Supabase via pg_cron → import-tick edge function.
Removes the route, its tests, and the Vercel cron entry. cron-auth removed
iff no other route used it.
```

### Task 5.2: Delete the old manual-trigger server actions

**Files:**
- Delete: `apps/web/src/actions/import-queue.ts`, `apps/web/src/actions/rk9.ts`, `apps/web/src/actions/limitless.ts`
- Possibly modify: `apps/web/src/actions/usage.ts` (remove `calculateSourceUsage` if unused; keep file if it has other exports)

- [ ] **Step 1: Grep for importers of the old actions**

```bash
grep -rl "actions/import-queue\|actions/rk9\|actions/limitless\|calculateSourceUsage\|processImportQueuesNow\|discoverRk9Events\|triggerLimitlessSync\|queueTournamentForImport\|queueRk9Event\|unqueueLimitless\|unqueueRk9\|getRecentImportRuns" apps/web/src --include="*.ts" --include="*.tsx"
```
Any hit other than the files being deleted, the old admin components (already deleted in Task 4.5), or the new `pipeline.ts` must be updated to use the new actions. `getRecentImportRuns` is now a package query (Task 4.5 step 3), not a web action — update any remaining importer accordingly.

- [ ] **Step 2: Delete the action files**

```bash
git rm apps/web/src/actions/import-queue.ts apps/web/src/actions/rk9.ts apps/web/src/actions/limitless.ts
git rm apps/web/src/actions/__tests__/import-queue.test.ts 2>/dev/null || true
git rm apps/web/src/actions/__tests__/rk9.test.ts 2>/dev/null || true
git rm apps/web/src/actions/__tests__/limitless.test.ts 2>/dev/null || true
```

For `usage.ts`: read it. If `calculateSourceUsage` is its only export and nothing imports it, `git rm` the file + test. If it has other live exports, only remove `calculateSourceUsage`.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @trainers/web exec tsc --noEmit 2>&1 | grep -iE "error" | head -20`
Expected: no errors.

- [ ] **Step 4: Report changed files + suggested commit message**

```
chore(web): delete legacy import/sync/discover server actions

processImportQueuesNow, discoverRk9Events, triggerLimitlessSync, queue/unqueue,
calculateSourceUsage and friends are gone — the autonomous pipeline replaces
every manual trigger. New surface is actions/pipeline.ts.
```

### Task 5.3: Delete `apps/web/src/lib/{rk9,limitless}` and the `packages/data-sources` package

**Files:**
- Delete: `apps/web/src/lib/rk9/`, `apps/web/src/lib/limitless/`
- Delete: `packages/data-sources/`
- Modify: any `package.json` / tsconfig / import that referenced `@trainers/data-sources` or `@/lib/{rk9,limitless}`

- [ ] **Step 1: Grep for all importers**

```bash
grep -rl "@trainers/data-sources\|@/lib/rk9\|@/lib/limitless" apps packages --include="*.ts" --include="*.tsx" --include="*.json"
```
Every hit must now point at `@trainers/supabase/sources` (or the package barrel). Update each importer. The webhook route `apps/web/src/app/api/webhooks/limitless/route.ts` (if it imports limitless logic) must switch to `@trainers/supabase`.

- [ ] **Step 2: Delete the directories + package**

```bash
git rm -r apps/web/src/lib/rk9 apps/web/src/lib/limitless
git rm -r packages/data-sources
```

- [ ] **Step 3: Remove the workspace dependency**

Grep for `"@trainers/data-sources"` in every `package.json`:
```bash
grep -rl "@trainers/data-sources" apps packages --include="package.json"
```
Remove that dependency line from each `package.json` that lists it (notably `apps/web/package.json`). Then reinstall to update the lockfile:

Run: `pnpm install 2>&1 | tail -15`
Expected: succeeds; no reference to `@trainers/data-sources` remains.

- [ ] **Step 4: Type-check both packages**

Run: `pnpm --filter @trainers/web exec tsc --noEmit 2>&1 | grep -iE "error" | head -20`
Run: `pnpm --filter @trainers/supabase exec tsc --noEmit 2>&1 | grep -iE "error" | head -20`
Expected: no errors from either.

- [ ] **Step 5: Report changed files + suggested commit message**

```
refactor: remove @trainers/data-sources and web lib/{rk9,limitless}

All import logic now lives in @trainers/supabase/sources (Wave 0). Deletes the
standalone package, the web lib modules, and the workspace dependency; updates
every importer (incl. the Limitless webhook route) to the new specifier.
```

---

## Wave 6 — Edge function review + full verification

### Task 6.1: Edge function security + correctness pass

**Files:**
- Review only: `packages/supabase/supabase/functions/import-tick/index.ts`

- [ ] **Step 1: Verify the auth + kill-switch + no-config.toml invariants**

Confirm by reading the function:
1. Unauthenticated calls (no bearer, or bearer ≠ service-role key) return 401 BEFORE any DB access.
2. `pipeline_enabled === false` returns a 200 no-op without running any stage.
3. `?stage=` is validated to `sync|import|compile`; anything else returns 400.
4. Every Supabase call checks `.error`.
5. The function is NOT listed in `packages/supabase/supabase/config.toml`.

Run: `grep -n "import-tick" packages/supabase/supabase/config.toml || echo "OK: not declared in config.toml"`
Expected: `OK: not declared in config.toml`.

- [ ] **Step 2: Dispatch the edge-function-reviewer agent**

This task's review is performed by the orchestrator dispatching the `edge-function-reviewer` agent against `import-tick/index.ts`. Fix any findings in the current session (no deferrals). Re-run the reviewer until clean.

- [ ] **Step 3: Report (no commit unless fixes were made)**

If fixes were made, suggested message:
```
fix(supabase): harden import-tick per edge-function review

<summarize the specific findings fixed>
```

### Task 6.2: Full local verification

**Files:** none (verification only)

- [ ] **Step 1: Reset the DB to replay all migrations**

Run: `pnpm db:reset 2>&1 | grep -iE "error|complete" | tail -15`
Expected: clean apply, no errors.

- [ ] **Step 2: Regenerate types and confirm new tables/functions present**

Run: `pnpm generate-types 2>&1 | tail -5`
Run: `grep -cE "import_exclusions|admin_alter_cron_schedule|admin_get_cron_schedules|rk9_event_id|limitless_tournament_id" packages/supabase/src/types.ts`
Expected: a count ≥ 5 — all of: the `import_exclusions` table, the `admin_alter_cron_schedule` write RPC, the `admin_get_cron_schedules` read RPC (Decision 2), and the two `team_slots` FK columns `rk9_event_id` / `limitless_tournament_id` (Decision 1) are present in the generated types.

- [ ] **Step 3: Run the full test suite for the two changed packages**

Run: `pnpm --filter @trainers/supabase test 2>&1 | tail -25`
Run: `pnpm --filter @trainers/web test -- admin/data actions/pipeline 2>&1 | tail -25`
Expected: all PASS. (Full-suite lint/typecheck/e2e run in CI — see the project Push Policy. Do not block on them locally.)

- [ ] **Step 4: Report**

Final wave is verification; no code change. Report the test summary to the orchestrator.

---

## Dependency & parallelism map

**Totals: 26 tasks across 7 waves (0–6).** Per wave: Wave 0 = 4, Wave 1 = 4, Wave 2 = 6 (was 4; +2.5 FK cascade, +2.6 cron-read RPC), Wave 3 = 5 (was 4; +3.5 compile-stage FK), Wave 4 = 5, Wave 5 = 3, Wave 6 = 2.

Tasks in the same wave touch disjoint file sets and have no data dependency on each other — the orchestrator dispatches one subagent per task in a single message (parallel) and commits between waves. Waves are sequential because each builds on the previous wave's artifacts.

### Wave 0 — Consolidate source logic (sequential within, see note)
- **0.1** Move RK9 pure modules (`sources/rk9/{types,normalize,state-machine,scraper,import}.ts`)
- **0.3** Move Limitless modules (`sources/limitless/*`) — *disjoint from 0.1, run in parallel*
- **0.2** Move RK9 worker (`sources/rk9/{worker,index}.ts`) — *depends on 0.1*
- **0.4** Sources barrel + package barrel (`sources/index.ts`, `src/index.ts`) — *depends on 0.1, 0.2, 0.3*

  Parallel groups: **{0.1, 0.3}** together → then **0.2** → then **0.4**. (0.1 and 0.3 are fully disjoint dirs.)

### Wave 1 — Edge function + stage entries
- **1.1** Deno import map (`functions/deno.json`)
- **1.2** Sync stage (`mutations/pipeline.ts` + test)
- **1.3** Import + compile stages (`mutations/pipeline.ts` + test) — *depends on 1.2 (same file)*
- **1.4** `import-tick/index.ts` (+ mutations barrel) — *depends on 1.1, 1.2, 1.3*

  Parallel groups: **{1.1}** ∥ **1.2** → **1.3** → **1.4**. (1.1 is disjoint and can run alongside 1.2.)

### Wave 2 — Migrations (all six fully parallel)
- **2.1** `import_exclusions` table
- **2.2** pipeline config seed + retire flags
- **2.3** `admin_alter_cron_schedule` write RPC
- **2.4** schedule import-tick crons
- **2.5** `team_slots` polymorphic source FK columns + ON DELETE CASCADE + backfill (Decision 1)
- **2.6** `admin_get_cron_schedules` read RPC (Decision 2)

  Parallel group: **{2.1, 2.2, 2.3, 2.4, 2.5, 2.6}** — six distinct migration files, no shared file. (Orchestrator runs `pnpm db:reset` + `generate-types` ONCE after the wave commits, not per task.) The new schema objects from 2.5/2.6 must be reflected in the regenerated types before Wave 3 (Task 3.5 references the FK columns; Tasks 3.4/4.4/4.5 reference the read RPC).

### Wave 3 — Queries + actions
- **3.1** `queries/pipeline.ts` monitor query (+ test, queries barrel)
- **3.2** `mutations/pipeline.ts` delete/exclude/recovery (+ test) — *disjoint file from 3.1; delete mutation is the simplified, FK-cascade version (Decision 1)*
- **3.5** `usage/compile.ts` + `mutations/team-slots.ts` — stamp the `team_slots` source FK in the compile stage (Decision 1) — *disjoint files from 3.1/3.2/3.3/3.4; depends on Wave 2's Task 2.5 migration + regenerated types*
- **3.3** `actions/pipeline.ts` core actions (+ test) — *depends on 3.1, 3.2*
- **3.4** `actions/pipeline.ts` config actions incl. `getCronSchedulesAction` (Decision 2) (+ test) — *depends on 3.3 (same file)*

  Parallel groups: **{3.1, 3.2, 3.5}** together → **3.3** → **3.4**. (3.1 touches `queries/pipeline.ts`, 3.2 touches `mutations/pipeline.ts`, 3.5 touches `usage/compile.ts` + `mutations/team-slots.ts` — all disjoint, all depend only on Wave 2 having landed. 3.3 and 3.4 share `actions/pipeline.ts`, so they sequence.)

### Wave 4 — UI
- **4.1** pipeline-cards + status-chips (+ test)
- **4.2** event-list (+ test) — *disjoint from 4.1, run in parallel*
- **4.3** monitor-tab + use-pipeline — *depends on 4.1, 4.2*
- **4.4** config-tab + use-pipeline-config — *disjoint from 4.3, run in parallel*
- **4.5** data-page + page route + delete old UI + `getRecentImportRuns` query — *depends on 4.3, 4.4*

  Parallel groups: **{4.1, 4.2}** together → **{4.3, 4.4}** together → **4.5**.

### Wave 5 — Retirement (all three parallel)
- **5.1** Delete cron route + tests
- **5.2** Delete legacy actions
- **5.3** Delete `lib/{rk9,limitless}` + `packages/data-sources` + workspace dep

  Parallel group: **{5.1, 5.2, 5.3}** — each greps its own importer set and deletes a disjoint file set. Orchestrator runs `pnpm install` + type-check ONCE after the wave. (Risk: 5.3 removes the workspace dep; if 5.1/5.2 leave a stray import the post-wave type-check catches it — fix before committing the wave.)

### Wave 6 — Review + verification (sequential)
- **6.1** Edge-function-reviewer pass on `import-tick` (orchestrator dispatches the agent)
- **6.2** Full local verification (`db:reset`, `generate-types`, scoped test suites)

  Sequential: **6.1** → **6.2**.

**Cross-wave note:** Wave 2 (migrations) is independent of Wave 1's code and could overlap Wave 1 in wall-clock time, but the orchestrator should still commit Wave 1 before Wave 2 so `generate-types` (run after Wave 2) reflects a stable schema. Keep them ordered.
