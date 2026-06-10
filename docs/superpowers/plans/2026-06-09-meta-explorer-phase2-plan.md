# Meta Explorer Phase 2 — Implementation Plan

Date: 2026-06-09
Spec: `docs/superpowers/specs/2026-06-09-meta-explorer-phase2-design.md`
Branch: `feat/meta-explorer-phase2` (off `main`)

## How to use this plan

Execute with **subagent-driven development** (`superpowers:subagent-driven-development`).
Dispatch each task to a **sonnet** subagent with the exact file allowlist given.
After each task, run a two-stage review (spec compliance + code quality) per the
orchestrator's standard loop. Commit between logical chunks (per the project's
"commit often" rule); the orchestrator commits — not the subagents.

All design decisions are locked in the spec's **"Decisions (locked 2026-06-09)"**
section. The relevant decisions are restated inline in each task so the
implementer does not need to re-derive them. Where this plan and the spec prose
disagree, **this plan wins** (the spec says so in its "Wording propagation note").

### Hard naming rule (applies to every task)

The phrase **"top cut" must never appear** in any UI string, comment intended for
users, label, caption, tooltip, or heading. The user-facing label is **"Top 10%"**
(dynamic — follows the threshold control: "Top 5%" / "Top 25%"). In code, use the
neutral stem: RPC param `p_top_percentile`; RPC/TS columns `top_players`,
`top_field`, `top_share_pct` / `topSharePct`, `conversion_pct` / `conversionPct`,
`ranked_players` / `rankedPlayers`; URL param `topPct`.

### Dependency / parallelism map

```
Task 1 (migration + RPCs + types)   ─┐
                                      ├─► Task 2 (TS query wrappers + tests)
                                      │      └─► Task 3 (cached fetchers + actions + tests)
                                      │
Task 4 (tab restructure)  ───────────┤   (needs Task 3's fetchers wired, but the
                                      │    tab shell + URL coercers can start in
                                      │    parallel with Tasks 5–8 against stubs)
                                      │
Task 5 (treemap)          ─ parallel ─┤
Task 6 (scatter)          ─ parallel ─┤   (all five chart tasks only need the
Task 7 (dumbbell shared + #3) parallel┤    shared primitives in usage-series.ts +
Task 8 (top-share #4 + bump + stream) ┤    data-chart-card + data-sprite-tooltip,
                                      │    which Task 4 lands first)
Task 9 (mobile pass + ui-verifier)  ──► after 4–8
Task 10 (docs)            ─ parallel with 9
```

- **Tasks 5, 6, 7, 8 are mutually parallel** once Task 4 has landed the shared
  scaffolding (`usage-series.ts` helpers, `data-chart-card.tsx`,
  `data-sprite-tooltip.tsx`, `data-shared.ts`). Give each a disjoint file
  allowlist so they never touch the same file.
- **Task 4 must land before 5–8** because it creates the shared primitives and
  the tab container those charts mount into. To overlap, Task 4 can be split: 4a
  (shared scaffolding + filters coercers) lands first, then 5–8 run in parallel
  while 4b (wiring charts into tabs + new useQuery hooks) finishes — but the
  simplest correct order is 4 fully, then 5–8 in parallel.
- **Task 9** (mobile) and **Task 10** (docs) come last.

---

## Task 1 — Migration: `get_usage_conversion` + `get_usage_by_source` RPCs

**Objective.** Add two new SQL RPCs in one migration following Phase 1
conventions exactly, then regenerate types.

**Parallelizable:** No — everything else depends on the generated types.

**Files (allowlist):**

- CREATE `packages/supabase/supabase/migrations/<UTC-timestamp>_usage_phase2_rpcs.sql`
- After running `pnpm db:reset` + `pnpm generate-types`, the generated
  `packages/supabase/src/types.ts` will change — that file is auto-generated, do
  not hand-edit it, just let the command rewrite it.

**Conventions every RPC must follow** (copied from
`20260610005051_create_team_slots.sql`):

- `LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''`
- `DROP FUNCTION IF EXISTS public.<name>(<exact arg types>);` before
  `CREATE OR REPLACE FUNCTION` (idempotency).
- `GRANT EXECUTE ON FUNCTION public.<name>(<arg types>) TO anon, authenticated;`
- `COMMENT ON FUNCTION ...` describing purpose.
- Denominator = `SUM(total_players)` over `DISTINCT (source, event_key, division)`
  with `HAVING SUM(...) >= p_min_players`.
- Numerator = `COUNT(DISTINCT player_key)`.
- `p_source = 'all'` passthrough where the RPC takes a source param.
- `round(100.0 * num / denom, 2)` for percentages; guard `denom > 0`.

### RPC A — `get_usage_by_source` (powers chart #3, source dumbbells)

Per-species usage % broken out by source in one grouped query. **No `p_source`
param** — it partitions by source by definition. Denominator computed **per
source**: `SUM(total_players)` over `DISTINCT (event_key, division)` *within each
source*.

```sql
DROP FUNCTION IF EXISTS public.get_usage_by_source(text, date, date, int);

CREATE OR REPLACE FUNCTION public.get_usage_by_source(
  p_format      text,
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0
)
RETURNS TABLE (
  species    text,
  source     text,      -- 'rk9' | 'limitless' | 'trainers.gg'
  players    bigint,    -- distinct player_key running species in that source
  usage_pct  numeric    -- players / that-source's denominator
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.total_players, ts.event_date
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Per-source denominator: each (event_key, division) counted once within source.
  source_denoms AS (
    SELECT s.source, SUM(s.total_players) AS source_total
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) s
    GROUP BY s.source
    HAVING SUM(s.total_players) >= p_min_players
  ),
  species_counts AS (
    SELECT s.source, s.species, COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s
    INNER JOIN source_denoms d ON d.source = s.source
    GROUP BY s.source, s.species
  )
  SELECT
    sc.species,
    sc.source,
    sc.player_count AS players,
    CASE WHEN d.source_total > 0
      THEN round(100.0 * sc.player_count / d.source_total, 2) ELSE 0 END AS usage_pct
  FROM species_counts sc
  INNER JOIN source_denoms d ON d.source = sc.source
  ORDER BY sc.species ASC, sc.source ASC
$$;
```

### RPC B — `get_usage_conversion` (powers charts #1 scatter and #4 dumbbell)

Per-species overall usage vs. Top-N% conversion for one slice. Threshold is a
**percentile** parameter `p_top_percentile` (default `0.10`). NULL-placement rows
count toward **usage only** — excluded from `top_*`, `conversion_pct`, and
`ranked_players`.

```sql
DROP FUNCTION IF EXISTS public.get_usage_conversion(text, text, date, date, int, numeric);

CREATE OR REPLACE FUNCTION public.get_usage_conversion(
  p_format         text,
  p_source         text    DEFAULT 'all',
  p_start          date    DEFAULT NULL,
  p_end            date    DEFAULT NULL,
  p_min_players    int     DEFAULT 0,
  p_top_percentile numeric DEFAULT 0.10   -- top 10% by placement (UI label: "Top 10%")
)
RETURNS TABLE (
  species         text,
  players         bigint,   -- distinct players running species (all events, placement or not)
  usage_pct       numeric,  -- overall usage % (full denominator)
  top_players     bigint,   -- distinct players running species who are in the top N%
  top_field       bigint,   -- size of the top-N% field (placement-bearing events only)
  top_share_pct   numeric,  -- top_players / top_field   (chart #4 right dot)
  conversion_pct  numeric,  -- top_players / ranked_players (chart #1 y) — NULL if no placement events
  ranked_players  bigint    -- distinct players running species in placement-bearing events
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.placement, ts.total_players, ts.event_date
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Overall (usage) denominator: every event-division counted once.
  denom AS (
    SELECT SUM(d.total_players) AS total
    FROM (SELECT DISTINCT source, event_key, division, total_players FROM slots) d
    HAVING SUM(d.total_players) >= p_min_players
  ),
  -- Overall usage numerator: distinct players per species (all events).
  usage_counts AS (
    SELECT s.species, COUNT(DISTINCT s.player_key) AS player_count
    FROM slots s CROSS JOIN denom
    GROUP BY s.species
  ),
  -- One row per (event, player) that HAS a placement, with that event's
  -- percentile rank. percent_rank() over placement ASC: 1 = best placement.
  -- A player is "top" when percent_rank <= p_top_percentile.
  -- Distinct on (source,event_key,division,player_key): a player's 6 slots
  -- share one placement, so collapse to one player row before ranking.
  placement_players AS (
    SELECT DISTINCT source, event_key, division, player_key, placement
    FROM slots
    WHERE placement IS NOT NULL
  ),
  ranked AS (
    SELECT
      source, event_key, division, player_key,
      percent_rank() OVER (
        PARTITION BY source, event_key, division
        ORDER BY placement ASC
      ) AS pr
    FROM placement_players
  ),
  -- ranked_players: distinct players per species in placement-bearing events.
  -- Join species back via slots (a slot row carries species + player identity).
  species_ranked AS (
    SELECT s.species,
           COUNT(DISTINCT s.player_key) AS ranked_players,
           COUNT(DISTINCT s.player_key) FILTER (WHERE r.pr <= p_top_percentile)
             AS top_players
    FROM slots s
    INNER JOIN ranked r
      ON r.source = s.source AND r.event_key = s.event_key
     AND r.division IS NOT DISTINCT FROM s.division
     AND r.player_key = s.player_key
    GROUP BY s.species
  ),
  -- top_field: total distinct players in the top N% across placement events.
  top_field_total AS (
    SELECT COUNT(*) FILTER (WHERE pr <= p_top_percentile) AS top_field
    FROM ranked
  )
  SELECT
    uc.species,
    uc.player_count AS players,
    CASE WHEN d.total > 0
      THEN round(100.0 * uc.player_count / d.total, 2) ELSE 0 END AS usage_pct,
    COALESCE(sr.top_players, 0)::bigint AS top_players,
    tf.top_field::bigint AS top_field,
    CASE WHEN tf.top_field > 0
      THEN round(100.0 * COALESCE(sr.top_players, 0) / tf.top_field, 2)
      ELSE 0 END AS top_share_pct,
    -- conversion_pct NULL when species never appears in a placement-bearing event.
    CASE WHEN sr.ranked_players IS NULL OR sr.ranked_players = 0
      THEN NULL
      ELSE round(100.0 * sr.top_players / sr.ranked_players, 2) END AS conversion_pct,
    COALESCE(sr.ranked_players, 0)::bigint AS ranked_players
  FROM usage_counts uc
  CROSS JOIN denom d
  CROSS JOIN top_field_total tf
  LEFT JOIN species_ranked sr ON sr.species = uc.species
  ORDER BY usage_pct DESC, uc.species ASC
$$;
```

**Implementation notes for the subagent:**

- `division IS NOT DISTINCT FROM` is required in the `ranked`↔`slots` join because
  `division` is NULL for non-RK9 sources — `=` would drop those rows.
- `percent_rank()` returns a value in `[0, 1]`; `0` is the single best placement.
  A small event where everyone ties on placement-rank semantics still behaves —
  `percent_rank` handles ties by giving them the same (lower) rank, which is the
  desired "everyone tied at the top counts as top" behaviour.
- `conversion_pct` must be **`NULL`** (not 0) when `ranked_players = 0` so the
  client can drop those species from the scatter while keeping them in usage
  charts.

**Index note (from spec).** Ship with the existing indexes
(`idx_team_slots_format_date`, `idx_team_slots_format_source`,
`idx_team_slots_format_species`). Do **not** add a new index speculatively. The
`percent_rank()` window runs over the already-format-filtered working set; a sort
is acceptable. Add `(format, event_key, division, placement)` only if the RPC is
*measured* slow — out of scope for this task.

**Verification:**

```bash
pnpm db:reset            # replays all migrations on a fresh DB; must succeed
pnpm generate-types      # regenerates packages/supabase/src/types.ts
```

Then a quick smoke query (psql against local) to confirm both functions exist and
return rows for the seed/backfilled format. If `team_slots` is empty locally, run
the admin "Calculate usage" first (see "Local data" note at the bottom). Confirm:

- `get_usage_by_source('gen9championsvgc2026regma')` returns `(species, source,
  players, usage_pct)` rows.
- `get_usage_conversion('gen9championsvgc2026regma')` returns rows where species
  with no placement events have `conversion_pct = NULL` and species in the top
  10% have `top_players > 0`.

---

## Task 2 — TS query wrappers + barrel exports + tests

**Objective.** Add typed wrappers for both new RPCs in the supabase package,
following the existing wrapper pattern (DI `supabase` param, `.error` check +
throw, snake→camel mapping, JSDoc).

**Parallelizable:** No (depends on Task 1's generated types). Tasks 3+ depend on
this.

**Files (allowlist):**

- MODIFY `packages/supabase/src/queries/usage.ts`
- MODIFY `packages/supabase/src/queries/index.ts` (barrel re-exports)
- CREATE `packages/supabase/src/queries/__tests__/usage.test.ts` (if absent) or
  ADD cases to the existing usage test file — check first with
  `ls packages/supabase/src/queries/__tests__/`.

**Add to `usage.ts`:**

1. Types:

```ts
/** One per-source usage row from get_usage_by_source. */
export interface SourceUsageRow {
  species: string;
  source: string; // 'rk9' | 'limitless' | 'trainers.gg'
  players: number;
  usagePct: number;
}

/** Parameters for getUsageBySource. */
export interface GetUsageBySourceParams {
  format: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
}

/** One per-species conversion row from get_usage_conversion. */
export interface ConversionRow {
  species: string;
  players: number;
  usagePct: number;
  topPlayers: number;
  topField: number;
  topSharePct: number;
  /** NULL when the species has no placement-bearing events. */
  conversionPct: number | null;
  rankedPlayers: number;
}

/** Parameters for getUsageConversion. */
export interface GetUsageConversionParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  /** Top percentile in [0,1], e.g. 0.10 for "Top 10%". Maps to p_top_percentile. */
  topPct?: number;
}
```

2. `getUsageBySource(supabase, params)` → `SourceUsageRow[]`. Calls
   `supabase.rpc("get_usage_by_source", { p_format, p_start, p_end, p_min_players })`,
   `.error` check + throw with descriptive message, maps
   `{ species, source, players: row.players, usagePct: row.usage_pct }`.

3. `getUsageConversion(supabase, params)` → `ConversionRow[]`. Calls
   `supabase.rpc("get_usage_conversion", { p_format, p_source, p_start, p_end,
   p_min_players, p_top_percentile: topPct ?? 0.10 })`. Map snake→camel; pass
   `conversion_pct` through as `number | null` (do **not** coalesce to 0).
   Defaults: `source = "all"`, `minPlayers = 0`, `topPct = 0.10`.

**Barrel (`index.ts`):** add `getUsageBySource, getUsageConversion` to the usage
function export block and `SourceUsageRow, GetUsageBySourceParams, ConversionRow,
GetUsageConversionParams` to the usage type export block.

**Tests (per testing-philosophy — mock `rpc()`):**

- `getUsageBySource` maps rows correctly and forwards params (assert the
  `p_format`/`p_start`/`p_end`/`p_min_players` payload).
- `getUsageConversion` forwards `p_top_percentile` from `topPct`, defaults it to
  `0.10` when omitted, and preserves `conversionPct: null` (does not turn it into
  0).
- Both throw on `{ error }` responses.

**Verification:** `pnpm --filter @trainers/supabase test` passes (CI also runs it).

---

## Task 3 — Cached fetchers + server actions + tests

**Objective.** Add two `'use cache'` fetchers and two public server actions
mirroring the existing usage-cache / actions pattern.

**Parallelizable:** No (depends on Task 2). Task 4 consumes these.

**Files (allowlist):**

- MODIFY `apps/web/src/lib/data/usage-cache.ts`
- MODIFY `apps/web/src/actions/usage.ts`
- ADD cases to `apps/web/src/components/data/__tests__/` is **not** correct for
  actions — check whether action tests exist (`ls apps/web/src/actions/__tests__/`
  or co-located). If the repo has no action-layer tests for usage, skip action
  tests and rely on the wrapper tests from Task 2 (the action is a thin
  pass-through). Do not invent a new test location.

**Add to `usage-cache.ts`** (follow the existing block style exactly — `'use
cache'`, `cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format))`,
`cacheLife("hours")`, `createStaticClient()`):

```ts
/** Fully-resolved parameters for getCachedUsageBySource. */
export interface UsageBySourceParams {
  format: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
}

export async function getCachedUsageBySource(
  params: UsageBySourceParams
): Promise<SourceUsageRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");
  const supabase = createStaticClient();
  return getUsageBySource(supabase, params);
}

/** Fully-resolved parameters for getCachedUsageConversion. */
export interface UsageConversionParams {
  format: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  topPct: number; // keys the cache; maps to p_top_percentile
}

export async function getCachedUsageConversion(
  params: UsageConversionParams
): Promise<ConversionRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");
  const supabase = createStaticClient();
  return getUsageConversion(supabase, params);
}
```

Import `getUsageBySource, getUsageConversion, type SourceUsageRow, type
ConversionRow` from `@trainers/supabase`.

**Add to `actions/usage.ts`** two public server actions (`ActionResult<T>`,
try/catch + `getErrorMessage`), resolving defaults before calling the cached fn:

```ts
export interface FetchUsageBySourceParams {
  format: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
}
export async function fetchUsageBySource(
  params: FetchUsageBySourceParams
): Promise<ActionResult<SourceUsageRow[]>> { /* resolve minPlayers=0; call getCachedUsageBySource */ }

export interface FetchUsageConversionParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  topPct?: number;
}
export async function fetchUsageConversion(
  params: FetchUsageConversionParams
): Promise<ActionResult<ConversionRow[]>> { /* resolve source="all", minPlayers=0, topPct=0.10; call getCachedUsageConversion */ }
```

**Caching note (from `reviewing-caching`).** No new `CacheTags` entry and no new
invalidation helper are needed — both fetchers carry the existing
`USAGE_STATS` + `usageStats(format)` tags, so `invalidateUsageStatsCaches(formats)`
(admin action) and `revalidateUsageStatsCaches(formats)` (import webhook) already
bust them. Do **not** add a segment-level `export const revalidate/dynamic`.

**Verification:** `pnpm --filter @trainers/web typecheck` clean; existing usage
action tests (if any) still pass.

---

## Task 4 — Tab restructure of `/data` (Overview / Trends / Sources, URL-persisted)

**Objective.** Restructure `UsageExplorer` into three URL-persisted tabs and land
the shared scaffolding the chart tasks consume. Wire the two new datasets into
TanStack Query and add the `topPct` threshold control. **No new charts yet** —
this task produces the tab shell + shared primitives + data plumbing; Tasks 5–8
drop the charts into the tabs.

**Parallelizable:** No — gates Tasks 5–8. (Optionally split as 4a/4b per the
parallelism map; the simple path is one task.)

**Files (allowlist):**

- MODIFY `apps/web/src/components/data/usage-explorer.tsx`
- MODIFY `apps/web/src/components/data/usage-filters.ts`
- MODIFY `apps/web/src/app/(app)/data/page.tsx`
- CREATE `apps/web/src/components/data/data-tabs.tsx`
- CREATE `apps/web/src/components/data/data-chart-card.tsx`
- CREATE `apps/web/src/components/data/data-sprite-tooltip.tsx`
- CREATE `apps/web/src/components/data/data-shared.ts`
- MODIFY `apps/web/src/components/data/usage-series.ts` (add the shared pure
  helpers the charts need — listed below)
- MODIFY `apps/web/src/components/data/__tests__/usage-filters.test.ts`
  (coerceTab + coerceTopPct cases)
- CREATE `apps/web/src/components/data/__tests__/usage-series.test.ts` additions
  for the new helpers (file already exists — ADD cases).

**4.1 — `usage-filters.ts` additions (Decisions 1 & 2):**

```ts
export const VALID_TABS = ["overview", "trends", "sources"] as const;
export type DataTab = (typeof VALID_TABS)[number];
export const DEFAULT_TAB: DataTab = "overview";
export function coerceTab(raw: string | null | undefined): DataTab { /* fallback DEFAULT_TAB */ }

export const VALID_TOP_PCTS = [0.05, 0.1, 0.25] as const;
export type TopPct = (typeof VALID_TOP_PCTS)[number];
export const DEFAULT_TOP_PCT: TopPct = 0.1;
export function coerceTopPct(raw: string | null | undefined): TopPct { /* parse float, fallback DEFAULT_TOP_PCT */ }
```

**4.2 — `usage-series.ts` shared helpers** (pure, framework-free; the charts
import these — siblings never import each other):

- `buildRankSeries(points: FormatUsageTimeseriesPoint[], topN: number)` → for the
  **bump chart**. For each period bucket, sort species by usage desc and assign
  rank 1..N; return per-species aligned rank arrays (`number | null`, null = absent
  that bucket). Only retain species that reach the top `topN` in the **latest**
  bucket. Reuse `assignColor` for color.
- `SOURCE_COLORS: Record<"rk9" | "limitless" | "trainers.gg", string>` — one
  teal-family OKLCH hue per source (mirror `COLUMN_COLORS` in `usage-pipeline.ts`).
  Put this in `data-shared.ts` if it's a non-JSX constant the dumbbell + tooltip
  both need; otherwise `usage-series.ts` is fine. Pick one and keep both charts
  importing from it.
- `groupBySource(rows: SourceUsageRow[])` → `SourceComparisonRow[]` where
  `SourceComparisonRow = { species: string; bySource: Partial<Record<source,
  { usagePct: number; players: number }>>; overallPeak: number }`. Sort by
  `overallPeak` (max usagePct across sources) desc; this drives the dumbbell row
  order and top-N cap.
- `median(values: number[])` → number (used for the scatter's reference lines).
- `classifyQuadrant(usagePct, conversionPct, usageMedian, conversionMedian)` →
  `"proven" | "overrated" | "sleeper" | "fringe"` (scatter quadrant helper).

**4.3 — `data-chart-card.tsx`**: shared card chrome —
`<div className="bg-card flex flex-col rounded-xl shadow-sm">` with a header row
(uppercase tracking-widest muted title like the existing Meta Pipeline card), an
optional `caption` slot (muted note — used by the Source dumbbells "ignores Source
filter" caption), an optional `actions` slot (right-aligned, for the toggles), and
a body. Function component, `interface DataChartCardProps`.

**4.4 — `data-sprite-tooltip.tsx`**: shared presentational tooltip — sprite +
name + a list of stat lines, styled `bg-popover border-border rounded-md border
px-2 py-1 text-xs shadow-sm` (match the line chart tooltip). Uses
`getPokemonSprite(species)` → `{ url, w, h, pixelated }`; apply
`[image-rendering:pixelated]` when `.pixelated`.

**4.5 — `data-tabs.tsx`**: thin wrapper over the shadcn `Tabs` primitive
(`components/ui/tabs`) with three triggers (Overview / Trends / Sources). The
trigger row uses the horizontal-scroll pattern from the mobile-responsiveness
rule: `-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0` around the
`TabsList`. Active tab is **controlled** by the parent (URL-driven), not internal
state.

**4.6 — `usage-explorer.tsx` changes:**

- Read `tab = coerceTab(searchParams.get("tab"))` and
  `topPct = coerceTopPct(searchParams.get("topPct"))`.
- Extend `updateUrl` to accept `nextTab?: DataTab` and `nextTopPct?: TopPct`,
  writing `tab` (omit when `overview`) and `topPct` (omit when `0.1`) to keep URLs
  clean. The active tab and topPct are **URL-persisted** (shareable links).
- Add two new `useQuery` hooks mirroring the existing timeseries/pipeline ones:
  - `["usage-by-source", format, rangeStart, rangeEnd, minPlayers]` →
    `fetchUsageBySource(...)`; `initialData` from new prop `initialSourceRows`
    when filter keys match; `placeholderData: (prev) => prev`; `staleTime: 5*60*1000`.
  - `["usage-conversion", format, source, rangeStart, rangeEnd, minPlayers, topPct]`
    → `fetchUsageConversion(...)`; `initialData` from new prop
    `initialConversionRows` when keys match; same placeholder/staleTime.
- **Lazy-load per tab (Decision 1):** only run the conversion/source queries when
  their tab is active. Use TanStack `enabled` — e.g. conversion query
  `enabled: tab === "overview" || tab === "sources"` (scatter is Overview, #4
  dumbbell is Sources, both honor `source`), source query `enabled: tab ===
  "sources"`. Timeseries + pipeline stay always-enabled (Overview's treemap +
  Sankey and Trends' line/bump/stream reuse them; pipeline also powers the
  sidebar species list). Document this enablement matrix in a comment.
- **Sidebar selection scope (Decision 5):** `effectiveSelected` continues to drive
  **only** the Trends charts (line / stream / bump). The treemap, scatter, and both
  dumbbells receive the **whole field** (top-N capped inside each chart) and do
  **not** receive `effectiveSelected` as a filter.
- Render `<DataTabs value={tab} onValueChange={...}>` with three `TabsContent`
  panels. Move the existing Meta Pipeline + line chart into the correct panels:
  - **Overview**: Treemap (Task 5) + Conversion scatter (Task 6) + Meta Pipeline
    (existing Sankey). For this task, leave placeholder `<div>` slots where Tasks
    5/6 will mount, OR mount the existing Sankey only and let Tasks 5/6 add their
    components — coordinate via the allowlist (Tasks 5/6 will edit
    `usage-explorer.tsx`'s Overview panel; to avoid a write conflict, **Task 4
    creates clearly-commented mount points** `{/* TASK5: treemap */}` etc., and
    Tasks 5–8 each replace exactly their marker). 
  - **Trends**: Usage Over Time card (line chart, gains Lines|Stream toggle in
    Task 8) + Bump chart (Task 8).
  - **Sources**: Source dumbbells (Task 7) + Overall-vs-Top-10% dumbbell (Task 8).

> **Write-conflict avoidance for Tasks 5–8:** Because Tasks 5–8 all need to mount
> their component into `usage-explorer.tsx`, the cleanest division is: **Task 4
> owns all edits to `usage-explorer.tsx`** and leaves labelled comment markers +
> imports stubbed. Tasks 5–8 then only CREATE their own component files and ADD
> their tests; the orchestrator does the final one-line mount swap per chart when
> integrating each (or Task 4b does it). If running 5–8 truly in parallel,
> serialize the `usage-explorer.tsx` mount edits through the orchestrator. Each
> chart component is otherwise fully self-contained.

**Tests:** `coerceTab` / `coerceTopPct` (valid, invalid, default); new
`usage-series` helpers (`buildRankSeries` rank assignment incl. null gaps and
latest-bucket top-N retention; `groupBySource` grouping + ordering; `median`;
`classifyQuadrant` four-way). Update `usage-explorer.test.tsx` only as needed to
keep it green (new props with sensible defaults).

**Verification:** `pnpm --filter @trainers/web test` for the data components
passes; tabs switch and persist to URL; lazy-load enablement verified by query
keys firing only on the active tab.

---

## Task 5 — Treemap (Overview tab)

**Objective.** Proportional meta-share snapshot with sprite tiles, reusing the
already-fetched pipeline data. Whole field, top-N capped, `<threshold` tail
collapses into one "Others (N species)" tile.

**Parallelizable:** Yes — with Tasks 6, 7, 8 (disjoint files).

**Files (allowlist):**

- CREATE `apps/web/src/components/data/usage-treemap.tsx`
- CREATE `apps/web/src/components/data/__tests__/usage-treemap.test.tsx`
- (mount into Overview panel handled per the write-conflict note in Task 4)

**Details:**

- `"use client"`. Props: `{ data: PipelineSpeciesData[] }` (reads
  `pipelineResult.data`). No selection prop (Decision 5 — whole field).
- recharts `Treemap` with a custom `content` renderer: fill =
  `assignColor(species)`; render the `<image>` sprite via `getPokemonSprite` only
  for tiles above a size threshold; name label for large tiles; small tiles show
  color only with a hover tooltip (`data-sprite-tooltip`).
- Apply the existing `<1%`-style floor (reuse the threshold convention) so the
  treemap isn't a haze; collapse the sub-threshold tail into a single muted
  **"Others (N species)"** tile. No "top cut" anywhere.
- Tooltip: sprite + name + usage % + rank.
- Click handler gated behind an absent `speciesHref?` prop (Phase 3 drill-down) —
  define the prop, leave it unused/no-op now.
- Mobile (Decision 6): same `Treemap`, `ResponsiveContainer width="100%"`, cap
  species count (~top 30) at narrow widths so tiles stay tappable. No `*-mobile`
  file.

**Tests:** smoke render with mock data (sprite mocked per the
`getPokemonSprite` note); assert the "Others" tile appears when >N species and the
tail is below threshold; assert no string "top cut" / "Top cut".

**Verification:** component test green; visual check deferred to Task 9 ui-verifier.

---

## Task 6 — Usage-vs-Conversion scatter (Overview tab)

**Objective.** Scatter of usage % (x) vs. conversion % (y) with median reference
lines, sample-size-scaled sprite dots, four quadrants. Whole field; drops
NULL-conversion species.

**Parallelizable:** Yes — with Tasks 5, 7, 8.

**Files (allowlist):**

- CREATE `apps/web/src/components/data/usage-conversion-scatter.tsx`
- CREATE `apps/web/src/components/data/__tests__/usage-conversion-scatter.test.tsx`

**Details:**

- `"use client"`. Props: `{ rows: ConversionRow[]; topPct: number }`. (`topPct`
  only used for the tooltip/legend label "Top 10%/5%/25%".)
- Drop rows where `conversionPct === null` (can't plot a y). Keep them out of this
  chart only.
- recharts `ScatterChart` + `Scatter` + `ReferenceLine` (x at median usagePct, y
  at median conversionPct, computed client-side via the `median()` helper over
  non-null rows) + `ZAxis` mapping `players` → dot radius (bigger = more
  trustworthy) + custom sprite shape (fallback to a colored circle via
  `assignColor` when sprite missing).
- Quadrant labels (corners, muted text): "Proven meta" (top-right), "Overrated"
  (bottom-right), "Sleepers" (top-left), "Fringe" (bottom-left). Use
  `classifyQuadrant` from `usage-series.ts` for any per-dot styling.
- Tooltip (`data-sprite-tooltip`): sprite + name + usage % + conversion % + n
  players. Conversion label reads "Top 10%" (driven by `topPct`), never "top cut".
- Click gated behind absent `speciesHref?` (Phase 3).
- Mobile (Decision 6): same chart, reduced height, fewer ticks, sprites only on
  the largest-sample dots (rest colored circles). No `*-mobile` file.

**Tests:** transform/behavior — NULL-conversion rows are excluded; median
reference values computed correctly; `classifyQuadrant` boundaries; no "top cut"
string. Smoke render.

**Verification:** test green; visual in Task 9.

---

## Task 7 — Shared dumbbell primitive + Source dumbbells (#3, Sources tab)

**Objective.** Build the reusable dumbbell primitive and the source-comparison
chart (3 dots/row across rk9 / limitless / trainers.gg). Hand-rolled CSS-grid
SVG-free layout (lighter than recharts for a 1-D plot).

**Parallelizable:** Yes — with Tasks 5, 6, 8. (Owns the shared
`usage-dumbbell.tsx`; Task 8's #4 dumbbell imports it — so **Task 7 must land
before Task 8's top-share dumbbell can compile**. If running both in parallel,
Task 8 can stub the import or the orchestrator sequences 7 → 8's dumbbell piece.)

**Files (allowlist):**

- CREATE `apps/web/src/components/data/usage-dumbbell.tsx` (shared
  `DumbbellTrack` / `DumbbellRow` primitive)
- CREATE `apps/web/src/components/data/usage-source-dumbbell.tsx` (chart #3)
- CREATE `apps/web/src/components/data/__tests__/usage-dumbbell.test.tsx`
- CREATE `apps/web/src/components/data/__tests__/usage-source-dumbbell.test.tsx`

**Details:**

- `usage-dumbbell.tsx`: a row = sprite + name at left, a relatively-positioned
  track with absolutely-positioned dots at percentage `left`, and a connecting
  line between min and max dot. Generic over N dots (`{ value, color, label }[]`).
  No arbitrary px — use Tailwind scale / percentage `left` via inline `style`
  (percentage is fine; it's not a px literal).
- `usage-source-dumbbell.tsx`: props `{ rows: SourceComparisonRow[] }` (from
  `groupBySource`). 3 dots/row using `SOURCE_COLORS`. Sort by `overallPeak` desc,
  top-N cap (top 15 on mobile per Decision 6, more on desktop). Hover dot →
  `data-sprite-tooltip` (source label + usage % + n players); hover row → show
  spread delta (max − min).
- **Ignores the Source filter (by design).** Render the caption via
  `data-chart-card`'s caption slot: *"Always compares all sources — ignores the
  Source filter."* When the sidebar source filter is narrowed, add a subtle muted
  note so it doesn't read as a bug. This chart's fetcher (`get_usage_by_source`)
  has no source param, so it's naturally all-sources.
- Sprite click gated behind absent `speciesHref?` (Phase 3).
- Mobile: rows are fluid (full-width tracks stack); just cap to top 15 and shrink
  sprite. No `*-mobile` file.

**Tests:** dumbbell pairing/positioning math (dot `left` %, min/max line span);
`usage-source-dumbbell` row ordering + top-N cap + caption text present. No "top
cut" (n/a here but assert anyway for the shared primitive used by #4).

**Verification:** tests green; visual in Task 9.

---

## Task 8 — Overall-vs-Top-10% dumbbell (#4) + Bump chart + Streamgraph toggle

**Objective.** The three remaining charts: (a) #4 dumbbell reusing Task 7's
primitive, (b) the bump chart, (c) the Lines|Stream mode toggle on the existing
Usage Over Time card.

**Parallelizable:** Mostly — depends on Task 7's `usage-dumbbell.tsx` for part
(a). Parts (b) and (c) are independent of Tasks 5–7. Owns `usage-line-chart.tsx`
edits, so no other task may touch that file.

**Files (allowlist):**

- CREATE `apps/web/src/components/data/usage-top-share-dumbbell.tsx` (chart #4)
- CREATE `apps/web/src/components/data/usage-bump-chart.tsx`
- MODIFY `apps/web/src/components/data/usage-line-chart.tsx` (add Lines|Stream mode)
- CREATE `apps/web/src/components/data/__tests__/usage-top-share-dumbbell.test.tsx`
- CREATE `apps/web/src/components/data/__tests__/usage-bump-chart.test.tsx`
- MODIFY `apps/web/src/components/data/__tests__/usage-line-chart.test.tsx`
  (stream-mode cases)

**8a — `usage-top-share-dumbbell.tsx` (chart #4, "Overall vs. Top 10% usage"):**

- Props: `{ rows: ConversionRow[]; topPct: number }`. Two dots/row via Task 7's
  `usage-dumbbell` primitive: left = **overall usage %** (muted), right = **Top
  10% share** (`top_share_pct`, teal/primary). Drop rows where the species has no
  placement events (`conversionPct === null`).
- **Title is dynamic (Decision 2):** "Overall vs. Top 10% usage" where "10%"
  follows `topPct` → "Top 5%" / "Top 25%". The right-dot label is the same dynamic
  "Top 10%". **Never "top cut".**
- Honors the sidebar `source` filter (its fetcher passes `source`). Sprite click
  gated behind absent `speciesHref?`.
- A label helper `topPctLabel(topPct)` → `"Top 10%"` etc. — put it in
  `usage-filters.ts` or `data-shared.ts` so the scatter (Task 6) and #4 share one
  source of truth. (If Task 6 already added it, import it; otherwise add it here.)

**8b — `usage-bump-chart.tsx`:**

- Props: `{ points: FormatUsageTimeseriesPoint[]; topN: number; onTopNChange:
  (n: number) => void }`. Uses `buildRankSeries(points, topN)`.
- recharts `LineChart` with `YAxis reversed domain={[1, topN]}` (rank 1 at top),
  `type="monotone"` lines, `connectNulls={false}` so absent buckets gap. Sprite +
  rank label at the right end of each line (custom label renderer, same `<image>`
  technique the Sankey uses). Color via `assignColor`.
- Inline segmented control **Top 8 / 12 / 20**, default **20** (Decision 3). This
  is **local `useState`** in `UsageExplorer`-adjacent state OR lifted — keep
  `topN` local (NOT URL-persisted). The control sits in the card's `actions` slot.
- Tooltip per bucket: ranked list of the N species with rank + usage %.
- Click a line → `onSpeciesClick` (toggle in shared selection) — bump is a Trends
  chart, so it **does** interact with selection like the line chart. Wait — re-read
  Decision 5: sidebar selection drives line/stream/bump. The bump *honors* the
  shared selection set for which lines to draw? Decision 5 says selection drives
  the Trends charts. **Resolution:** the bump chart draws the **top-N by latest
  rank** regardless (that's its definition), and clicking a line toggles that
  species in the shared selection (affects line + stream). Keep the bump's own
  line set = top-N; clicking is a passthrough to `onSpeciesClick`. Document this in
  a comment so it isn't "fixed" later.
- Mobile (Decision 6): same chart, reduced height, fewer x ticks, smaller
  right-end sprite labels; the Top 8/12/20 control lets a phone user drop to Top 8.

**8c — `usage-line-chart.tsx` Lines|Stream toggle (Decision 4):**

- Add a `mode: "lines" | "stream"` prop (default "lines") and an `onModeChange`
  prop, OR keep `mode` as local state inside the card — spec says local `useState`
  default Lines. Simplest: local state in the line-chart card; render a segmented
  `Lines | Stream` control in the header.
- **Lines mode**: unchanged current behavior.
- **Stream mode**: recharts `AreaChart` with `stackOffset="silhouette"`, one
  stacked `<Area stackId="1">` per species, ordered via the existing
  `insideOutOrder()` helper over the threshold-filtered series, capped at **top 20**
  (Decision 3). Fill via `assignColor`. Same selected-species set + brush as lines
  mode (Decision 4). Tooltip per bucket: top species by share with % (streams read
  exact values poorly, so the tooltip carries precise numbers).
- Mobile: `ResponsiveContainer width="100%"`; stream compresses but stays readable
  for top-N. No separate file.

**Tests:** #4 dumbbell pairing (overall vs top-share dots, dynamic title via
`topPctLabel`, NULL-placement rows dropped, no "top cut"); bump rank assignment
already covered in Task 4 (`buildRankSeries`) — here just smoke render + Top-N
control switches; line chart stream mode renders `AreaChart` with silhouette
offset and uses `insideOutOrder`.

**Verification:** tests green; visual in Task 9.

---

## Task 9 — Mobile responsiveness pass + ui-verifier

**Objective.** Verify every chart is legible at 393px per Decision 6 — same
charts, scaled down, no list fallbacks, no hidden charts. Fix any overflow / tap
target / tick-density issues found.

**Parallelizable:** No — runs after 4–8.

**Files (allowlist):** any of the `apps/web/src/components/data/*.tsx` chart files
(responsive tweaks only — no structural changes); `data-tabs.tsx` (tab pill
horizontal-scroll). Do **not** create `*-mobile.tsx` files (Decision 6 forbids
them).

**Steps:**

1. Run the two mobile-responsiveness probes (page overflow false; no sub-40px
   tap targets) on `/data` at 393×852 for all three tabs.
2. Apply responsive fixes within charts: `ResponsiveContainer width="100%"`,
   fewer axis ticks (`interval`), smaller sprites, top-N caps where density
   demands (treemap ~30, dumbbells ~15). Tab pill row uses the horizontal-scroll
   wrapper.
3. Dispatch `ui-verifier` (Playwright visual + design-system check) on `/data`
   across the three tabs at mobile + desktop widths. Store screenshots in
   `.playwright-mcp/screenshots/`.

**Verification:** ui-verifier passes; both probes clean on every tab; no
horizontal scroll; charts legible.

---

## Task 10 — Docs updates

**Objective.** Keep the skills + roadmap in sync with the two new RPCs and any
new chart patterns.

**Parallelizable:** Yes — with Task 9.

**Files (allowlist):**

- MODIFY `.claude/skills/working-with-usage-data/SKILL.md` — add
  `get_usage_by_source` and `get_usage_conversion` to the RPC Catalog table with
  their return shapes and the NULL-placement / per-source-denominator notes.
- MODIFY `.claude/skills/building-charts/SKILL.md` — if Tasks 5–8 introduced new
  reusable patterns (treemap sprite tiles, hand-rolled dumbbell, streamgraph via
  `stackOffset="silhouette"`, bump via `YAxis reversed`), document them briefly so
  future charts reuse them. Read the skill first; only add genuinely new patterns.
- MODIFY the roadmap checkmark for the Meta Explorer / Analytics pillar if one
  exists in `.claude/skills/product-vision/SKILL.md` or the design doc — mark
  Phase 2 charts done. (Confirm the exact location before editing; if there's no
  explicit Phase-2 checklist, skip rather than invent one.)
- MODIFY `apps/web/src/components/data/CLAUDE.md` if one exists (it likely does
  not — check; do not create).

**Verification:** docs read cleanly; RPC catalog matches the shipped signatures.

---

## Local data note (for the verifier and anyone running `/data` locally)

`team_slots` is **derived** and is **empty after a fresh `pnpm db:reset`** unless
seeded. Both new RPCs return zero rows against an empty fact table, so charts will
render their empty states. To verify with real data locally, run the admin
**"Calculate usage"** action first (admin → External Data → "Calculate usage"),
which calls `compileSourceTeamSlots` for rk9 + limitless and backfills
`team_slots`. Alternatively seed `team_slots` directly. The verifier (Task 9)
must do this before visual checks, or the charts will all show "No usage data."

## Out of scope (do not build)

- Species drill-down pages (`/data/pokemon/[species]`) — Phase 3. All `speciesHref`
  click handlers are gated behind an absent prop and are no-ops now.
- New indexes / materialized views — only if a query is *measured* slow (it isn't
  yet).
- Any new cache tag or invalidation helper — the existing USAGE_STATS tags cover
  both new fetchers.
