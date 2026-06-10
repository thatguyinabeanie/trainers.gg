# Direct Pipeline Query + Min-Players Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pre-aggregated rollup table query for the Sankey pipeline with a direct `event_usage` query, rename `event_usage.sample_size` → `total_teams`, and add a min-players sidebar filter to exclude small tournaments from the visualization.

**Architecture:** A new `getDirectPipelineData()` query reads `event_usage` rows directly, maps them to `FactRow[]`, and calls the existing pure `rollupBucket()` function — reusing all existing rollup math. The pre-aggregated `getPipelineData()` stays for other consumers; only the Sankey chart switches to the direct path. A new `fetchDirectPipelineData()` server action wraps it with ISR caching (keyed by `minPlayers`). The frontend adds a min-players number input to `DataSidebar` and reads the value from a URL param.

**Tech Stack:** Supabase (PostgreSQL migration), TypeScript, Next.js Server Actions, TanStack Query, Tailwind CSS

---

## File Map

| File | Action |
|------|--------|
| `packages/supabase/supabase/migrations/20260608220000_rename_event_usage_sample_size_to_total_teams.sql` | **Create** — DDL rename |
| `packages/supabase/src/mutations/usage.ts` | **Modify** — update select string + mapping |
| `packages/supabase/src/usage/rollup.ts` | **Modify** — update JSDoc only |
| `packages/supabase/src/queries/usage.ts` | **Modify** — add `GetDirectPipelineDataParams` + `getDirectPipelineData()` |
| `packages/supabase/src/queries/index.ts` | **Modify** — export new function |
| `packages/supabase/src/queries/__tests__/usage.test.ts` (or `.../usage.test.ts`) | **Create/Modify** — tests for new query |
| `apps/web/src/actions/usage.ts` | **Modify** — add `fetchDirectPipelineData()` |
| `apps/web/src/components/data/usage-filters.ts` | **Modify** — add `coerceMinPlayers()` |
| `apps/web/src/components/data/data-sidebar.tsx` | **Modify** — add `minPlayers`/`onMinPlayersChange` props + UI |
| `apps/web/src/components/data/usage-explorer.tsx` | **Modify** — read `minPlayers` URL param, switch to `fetchDirectPipelineData` |

---

## Task 1: Rename `event_usage.sample_size` → `total_teams`

**Files:**
- Create: `packages/supabase/supabase/migrations/20260608220000_rename_event_usage_sample_size_to_total_teams.sql`
- Modify: `packages/supabase/src/mutations/usage.ts`
- Modify: `packages/supabase/src/usage/rollup.ts` (JSDoc only)

- [ ] **Step 1: Write the migration file**

Create `packages/supabase/supabase/migrations/20260608220000_rename_event_usage_sample_size_to_total_teams.sql` with:

```sql
alter table event_usage rename column sample_size to total_teams;
```

- [ ] **Step 2: Update the select string in `mutations/usage.ts`**

Find the line (approximately line 734) that selects from `event_usage`:
```
"source, event_key, division, species, team_count, sample_size, details, event_date"
```
Change to:
```
"source, event_key, division, species, team_count, total_teams, details, event_date"
```

- [ ] **Step 3: Update the FactRow mapping in `mutations/usage.ts`**

Find the line (approximately line 775) that maps `r.sample_size`:
```ts
sampleSize: r.sample_size,
```
Change to:
```ts
sampleSize: r.total_teams,
```

- [ ] **Step 4: Update JSDoc in `rollup.ts`**

Find the JSDoc comment on `FactRow.sampleSize` (approximately line 126-128):
```ts
  /**
   * Total teams in this (source, eventKey, division) group — the per-event denominator.
   * Populated from event_usage.sample_size.
   */
  sampleSize: number;
```
Change the `sample_size` reference to `total_teams`:
```ts
  /**
   * Total teams in this (source, eventKey, division) group — the per-event denominator.
   * Populated from event_usage.total_teams.
   */
  sampleSize: number;
```

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/supabase/migrations/20260608220000_rename_event_usage_sample_size_to_total_teams.sql \
        packages/supabase/src/mutations/usage.ts \
        packages/supabase/src/usage/rollup.ts
git commit -m "refactor(db): rename event_usage.sample_size to total_teams

sample_size is ambiguous — it could mean sample size in a statistical
sense. total_teams is precise: it's the count of teams that registered
for the event-division, the denominator for usage % calculations."
```

---

## Task 2: Add `getDirectPipelineData()` query

**Files:**
- Modify: `packages/supabase/src/queries/usage.ts`
- Modify: `packages/supabase/src/queries/index.ts`
- Create/Modify: `packages/supabase/src/queries/__tests__/usage.direct-pipeline.test.ts`

> **Context:** The existing `getPipelineData()` reads pre-aggregated rollup tables (`format_meta_stats`, `pokemon_usage_stats`, `pokemon_detail_stats`). Those tables have already lost per-event granularity, so they can't filter by minimum tournament size after the fact. The new `getDirectPipelineData()` reads `event_usage` rows directly and applies the min-players filter during the query, then calls the existing pure `rollupBucket()` function to compute usage percentages and detail histograms.
>
> Key types (all from `packages/supabase/src/`):
> - `FactRow` — input shape for `rollupBucket()`, exported from `usage/rollup.ts`
> - `BucketRollup.species: SpeciesRollup[]` — output from `rollupBucket()`
> - `SpeciesRollup` has: `species`, `usagePct`, `rank`, `moves`, `item`, `ability`, `nature`, `abilityItems`
> - `PipelineSpeciesData` has: `species`, `usagePct`, `rank`, `moves`, `items`, `abilities`, `natures`
> - `PipelineDataResult = { data: PipelineSpeciesData[]; periodStart: string; periodEnd: string }`
> - `UsageDetailEntry = { value: string; count: number; pct: number }` (same shape as `DetailEntry`)
>
> Note: column name mismatch to handle in the mapping:
> - `SpeciesRollup.ability[]` → `PipelineSpeciesData.abilities[]`
> - `SpeciesRollup.item[]` → `PipelineSpeciesData.items[]`
> - `SpeciesRollup.nature[]` → `PipelineSpeciesData.natures[]`
> - `SpeciesRollup.moves[]` → `PipelineSpeciesData.moves[]` (same)
>
> The `event_usage.details` JSONB has fields: `moves`, `tera`, `item`, `ability`, `nature`, `abilityItem` (not pluralized).
> After the Task 1 migration, the column is `total_teams` (was `sample_size`).

- [ ] **Step 1: Write the failing test**

Create `packages/supabase/src/queries/__tests__/usage.direct-pipeline.test.ts`:

```ts
import {
  createMockSupabaseClient,
  mockSupabaseFrom,
} from "@trainers/test-utils";
import { getDirectPipelineData } from "../usage";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const eventUsageRows = [
  {
    source: "rk9",
    event_key: "rk9:EVT001",
    division: "masters",
    species: "flutter-mane",
    team_count: 80,
    total_teams: 256,
    details: {
      moves: [{ v: "Shadow Ball", n: 60 }],
      tera: [{ v: "Fairy", n: 70 }],
      item: [{ v: "Choice Specs", n: 50 }],
      ability: [{ v: "Protosynthesis", n: 80 }],
      nature: [{ v: "Timid", n: 65 }],
      abilityItem: [],
    },
    event_date: "2024-05-01",
  },
  {
    source: "rk9",
    event_key: "rk9:EVT001",
    division: "masters",
    species: "incineroar",
    team_count: 200,
    total_teams: 256,
    details: {
      moves: [{ v: "Fake Out", n: 200 }],
      tera: [{ v: "Dark", n: 120 }],
      item: [{ v: "Safety Goggles", n: 100 }],
      ability: [{ v: "Intimidate", n: 200 }],
      nature: [{ v: "Impish", n: 180 }],
      abilityItem: [],
    },
    event_date: "2024-05-01",
  },
];

describe("getDirectPipelineData", () => {
  it("returns null when no rows match", async () => {
    const supabase = createMockSupabaseClient();
    mockSupabaseFrom(supabase, "event_usage", { data: [], error: null });

    const result = await getDirectPipelineData(supabase, {
      format: "SS_2025",
    });
    expect(result).toBeNull();
  });

  it("computes usage pct and detail histograms from raw event_usage rows", async () => {
    const supabase = createMockSupabaseClient();
    mockSupabaseFrom(supabase, "event_usage", {
      data: eventUsageRows,
      error: null,
    });

    const result = await getDirectPipelineData(supabase, {
      format: "SS_2025",
    });

    expect(result).not.toBeNull();
    const incineroar = result!.data.find((s) => s.species === "incineroar");
    expect(incineroar).toBeDefined();
    // 200 teams / 256 total = 78.13%
    expect(incineroar!.usagePct).toBeCloseTo(78.13, 1);
    // Ability histogram passes through
    expect(incineroar!.abilities[0]?.value).toBe("Intimidate");
  });

  it("sets periodStart and periodEnd from event_date range", async () => {
    const supabase = createMockSupabaseClient();
    mockSupabaseFrom(supabase, "event_usage", {
      data: eventUsageRows,
      error: null,
    });

    const result = await getDirectPipelineData(supabase, {
      format: "SS_2025",
    });

    expect(result!.periodStart).toBe("2024-05-01");
    expect(result!.periodEnd).toBe("2024-05-01");
  });

  it("honours explicit periodStart/periodEnd params", async () => {
    const supabase = createMockSupabaseClient();
    mockSupabaseFrom(supabase, "event_usage", {
      data: eventUsageRows,
      error: null,
    });

    const result = await getDirectPipelineData(supabase, {
      format: "SS_2025",
      periodStart: "2024-04-01",
      periodEnd: "2024-06-30",
    });

    // Returned bounds use the passed params, not the event_date range
    expect(result!.periodStart).toBe("2024-04-01");
    expect(result!.periodEnd).toBe("2024-06-30");
  });

  it("throws when supabase returns an error", async () => {
    const supabase = createMockSupabaseClient();
    mockSupabaseFrom(supabase, "event_usage", {
      data: null,
      error: { message: "db error" },
    });

    await expect(
      getDirectPipelineData(supabase, { format: "SS_2025" })
    ).rejects.toThrow("db error");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /path/to/repo
pnpm test --filter @trainers/supabase -- usage.direct-pipeline 2>&1 | tail -20
```
Expected: FAIL — `getDirectPipelineData is not a function` or similar.

- [ ] **Step 3: Add `GetDirectPipelineDataParams` interface to `queries/usage.ts`**

Below the existing `GetPipelineDataParams` interface, add:

```ts
/** Parameters for `getDirectPipelineData`. */
export interface GetDirectPipelineDataParams {
  /** Format ID, e.g. "SS_2025" or "VGC_2024". */
  format: string;
  /**
   * Data source filter. Pass "all" or omit to include all sources.
   * Concrete values: "rk9" | "limitless" | "first_party".
   */
  source?: string;
  /** If provided, restrict to events on or after this ISO date. */
  periodStart?: string;
  /** If provided, restrict to events on or before this ISO date. */
  periodEnd?: string;
  /**
   * Minimum `total_teams` per event-division row.
   * Events with fewer registered teams are excluded.
   * Defaults to 0 (no filter).
   */
  minPlayers?: number;
}
```

- [ ] **Step 4: Add `getDirectPipelineData()` to `queries/usage.ts`**

Add this function after `getPipelineData`:

```ts
/**
 * Fetch pipeline (Sankey) data by reading event_usage directly.
 *
 * Unlike getPipelineData (which reads pre-aggregated rollup tables),
 * this function reads raw event_usage rows and calls rollupBucket() to
 * compute usage percentages on the fly. This enables per-event filters
 * like minPlayers that are impossible once data has been pre-aggregated.
 *
 * Returns null when no rows match the given filters.
 */
export async function getDirectPipelineData(
  supabase: TypedClient,
  params: GetDirectPipelineDataParams
): Promise<PipelineDataResult | null> {
  const {
    format,
    source,
    periodStart,
    periodEnd,
    minPlayers = 0,
  } = params;

  let query = supabase
    .from("event_usage")
    .select(
      "source, event_key, division, species, team_count, total_teams, details, event_date"
    )
    .eq("format", format);

  if (source && source !== "all") {
    query = query.eq("source", source);
  }
  if (periodStart) {
    query = query.gte("event_date", periodStart);
  }
  if (periodEnd) {
    query = query.lte("event_date", periodEnd);
  }
  if (minPlayers > 0) {
    query = query.gte("total_teams", minPlayers);
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(
      `Failed to fetch direct pipeline data for ${format}: ${error.message}`
    );
  }

  if (!rows || rows.length === 0) return null;

  // Cast details JSONB to the known histogram shape.
  type DetailsShape = {
    moves?: { v: string; n: number }[];
    tera?: { v: string; n: number }[];
    item?: { v: string; n: number }[];
    ability?: { v: string; n: number }[];
    nature?: { v: string; n: number }[];
    abilityItem?: { v: string; n: number }[];
  } | null;

  const facts: FactRow[] = rows.map((r) => {
    const details = r.details as DetailsShape;
    return {
      source: r.source,
      eventKey: r.event_key,
      division: r.division,
      species: r.species,
      teamCount: r.team_count,
      sampleSize: r.total_teams,
      details: {
        moves: details?.moves ?? [],
        tera: details?.tera ?? [],
        item: details?.item ?? [],
        ability: details?.ability ?? [],
        nature: details?.nature ?? [],
        abilityItem: details?.abilityItem ?? [],
      },
    };
  });

  // Compute period bounds from the data's event_date range.
  const eventDates = rows.map((r) => r.event_date).sort();
  const computedStart = eventDates[0]!;
  const computedEnd = eventDates[eventDates.length - 1]!;

  const rollup = rollupBucket(facts);

  // Map SpeciesRollup → PipelineSpeciesData (note plural field names differ).
  const data: PipelineSpeciesData[] = rollup.species.map((s) => ({
    species: s.species,
    usagePct: s.usagePct,
    rank: s.rank,
    abilities: s.ability,
    items: s.item,
    natures: s.nature,
    moves: s.moves,
  }));

  return {
    data,
    periodStart: periodStart ?? computedStart,
    periodEnd: periodEnd ?? computedEnd,
  };
}
```

You will also need to add the `rollupBucket` import at the top of `queries/usage.ts`. Look for the existing imports from `../usage/rollup` and add `rollupBucket` and `type FactRow` to that import:

```ts
import { rollupBucket, type FactRow } from "../usage/rollup";
```

If no such import exists, add it in the import block.

- [ ] **Step 5: Export from `queries/index.ts`**

In `packages/supabase/src/queries/index.ts`, find the section that exports from `./usage` and add:

```ts
  getDirectPipelineData,
  type GetDirectPipelineDataParams,
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm test --filter @trainers/supabase -- usage.direct-pipeline 2>&1 | tail -20
```
Expected: PASS — all 5 tests green.

- [ ] **Step 7: Commit**

```bash
git add packages/supabase/src/queries/usage.ts \
        packages/supabase/src/queries/index.ts \
        packages/supabase/src/queries/__tests__/usage.direct-pipeline.test.ts
git commit -m "feat(supabase): add getDirectPipelineData() — direct event_usage query

Pre-aggregated rollup tables (format_meta_stats, pokemon_usage_stats,
pokemon_detail_stats) have already lost per-event granularity, so they
cannot retroactively filter by minimum tournament size. The new
getDirectPipelineData() reads event_usage rows directly, maps them to
FactRow[], and calls the existing rollupBucket() pure function. The
pre-aggregated getPipelineData() is unchanged for other consumers."
```

---

## Task 3: Add `fetchDirectPipelineData()` server action

**Files:**
- Modify: `apps/web/src/actions/usage.ts`

> **Context:** Server actions in this project live in `apps/web/src/actions/`. They use `"use server"`, return `Promise<ActionResult<T>>`, wrap with try/catch, and use `unstable_cache` for public read-only data. The existing `fetchPipelineData` (lines 478–534) is the reference. The new action calls `getDirectPipelineData` instead. Cache key includes `minPlayers` so different filter values don't collide.

- [ ] **Step 1: Add `FetchDirectPipelineDataParams` interface and `fetchDirectPipelineData` to `actions/usage.ts`**

After the `fetchPipelineData` function, add:

```ts
/** Parameters for fetchDirectPipelineData. */
export interface FetchDirectPipelineDataParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  /** Minimum total_teams per event-division row. Defaults to 0 (no filter). */
  minPlayers?: number;
}

/**
 * Public server action to fetch Sankey pipeline data by querying
 * event_usage directly (not pre-aggregated rollup tables).
 *
 * Uses getDirectPipelineData() so the minPlayers filter can be applied
 * at query time — impossible with the pre-aggregated path.
 *
 * Uses unstable_cache keyed by all params for 1h ISR caching.
 */
export async function fetchDirectPipelineData(
  params: FetchDirectPipelineDataParams
): Promise<ActionResult<PipelineDataResult | null>> {
  try {
    const {
      format,
      source = "all",
      periodStart,
      periodEnd,
      minPlayers = 0,
    } = params;

    const cacheKey = `direct-pipeline:${format}:${source}:${periodStart ?? ""}:${periodEnd ?? ""}:${minPlayers}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getDirectPipelineData(supabase, {
          format,
          source: toDBSource(source),
          periodStart,
          periodEnd,
          minPlayers,
        });
      },
      [cacheKey],
      {
        revalidate: 3600,
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch direct pipeline data"),
    };
  }
}
```

Also add `getDirectPipelineData` to the import from `@trainers/supabase` at the top of the file. Find the existing import:
```ts
import {
  ...
  getPipelineData,
  ...
} from "@trainers/supabase";
```
And add `getDirectPipelineData` to it.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/actions/usage.ts
git commit -m "feat(web): add fetchDirectPipelineData server action

Wraps getDirectPipelineData() with the standard unstable_cache + 1h ISR
pattern. Cache key includes minPlayers so each filter value gets its own
cache slot. Tagged with USAGE_STATS for on-demand invalidation."
```

---

## Task 4: Frontend — min-players URL param + sidebar input + query swap

**Files:**
- Modify: `apps/web/src/components/data/usage-filters.ts`
- Modify: `apps/web/src/components/data/data-sidebar.tsx`
- Modify: `apps/web/src/components/data/usage-explorer.tsx`

> **Context:**
>
> `usage-filters.ts` has coerce helpers like `coerceColumns()`. Add `coerceMinPlayers()` following the same pattern.
>
> `data-sidebar.tsx` already has `columns`/`onColumnsChange` props. Add `minPlayers`/`onMinPlayersChange`. Add a number input in the sidebar's filter area (above or below the Pipeline section). Use a standard HTML `<input type="number">` styled with Tailwind. The default is 64.
>
> `usage-explorer.tsx` manages all URL state. Add `minPlayers` to the URL params (key: `"minPlayers"`, default: 64). Switch the pipeline TanStack Query from `fetchPipelineData` to `fetchDirectPipelineData`. Include `minPlayers` in the query key array so cache invalidation works correctly. Also extend the `initPipelineKey` state to include `minPlayers` so `initialData` is only used on the matching initial load.
>
> `DataSidebarProps.minPlayers` is the current value (number), `onMinPlayersChange` is called with the new number when the user changes the input.

- [ ] **Step 1: Add `coerceMinPlayers()` to `usage-filters.ts`**

Add after `coerceColumns`:

```ts
/** Default minimum tournament size for the /data pipeline filter. */
export const DEFAULT_MIN_PLAYERS = 64;

/**
 * Parse and validate the "minPlayers" URL param.
 * Must be a positive integer. Defaults to DEFAULT_MIN_PLAYERS.
 */
export function coerceMinPlayers(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_MIN_PLAYERS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_PLAYERS;
}
```

- [ ] **Step 2: Add `minPlayers`/`onMinPlayersChange` props to `DataSidebar`**

Extend `DataSidebarProps`:
```ts
interface DataSidebarProps {
  filters: UsageFilters;
  allSpecies: PipelineSpeciesData[];
  selectedSpecies: string[];
  columns: PipelineColumn[];
  minPlayers: number;
  onFiltersChange: (filters: UsageFilters) => void;
  onSelectionChange: (species: string[]) => void;
  onColumnsChange: (columns: PipelineColumn[]) => void;
  onMinPlayersChange: (n: number) => void;
}
```

Add `minPlayers` and `onMinPlayersChange` to the destructured props in the function signature.

Add this UI block inside the sidebar scroll area, just above or below the Pipeline section. Pick a sensible location — the Filters section (format/source/period controls) is a good neighbor. Add a "Min. Players" label + number input:

```tsx
{/* Min. players filter */}
<div className="flex flex-col gap-1">
  <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
    Min. Players
  </span>
  <input
    type="number"
    min={0}
    step={8}
    value={minPlayers}
    onChange={(e) => {
      const n = parseInt(e.target.value, 10);
      if (Number.isFinite(n) && n >= 0) onMinPlayersChange(n);
    }}
    className="border-input bg-background text-foreground focus:ring-ring h-7 w-full rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
  />
</div>
```

- [ ] **Step 3: Update `UsageExplorer` to read `minPlayers` from URL**

In `usage-explorer.tsx`:

1. Import `coerceMinPlayers`, `DEFAULT_MIN_PLAYERS` from `./usage-filters`
2. Import `fetchDirectPipelineData` from `@/actions/usage` (alongside the existing imports)
3. Read `minPlayers` from searchParams:
   ```ts
   const minPlayers = coerceMinPlayers(searchParams.get("minPlayers"));
   ```
4. Add `minPlayers` to `initPipelineKey`:
   ```ts
   const [initPipelineKey] = useState({
     format,
     source,
     periodType,
     rangeStart,
     rangeEnd,
     minPlayers,
   });
   ```
5. Add `handleMinPlayersChange`:
   ```ts
   const handleMinPlayersChange = (n: number) =>
     updateUrl(currentFilters, undefined, undefined, undefined, undefined, n);
   ```
6. Update `updateUrl` signature to accept `nextMinPlayers`:
   ```ts
   const updateUrl = (
     nextFilters: UsageFilters,
     nextSpecies?: string[],
     nextRangeStart?: string | null,
     nextRangeEnd?: string | null,
     nextColumns?: PipelineColumn[],
     nextMinPlayers?: number
   ) => {
     // ... existing logic ...
     const mp = nextMinPlayers !== undefined ? nextMinPlayers : minPlayers;
     if (mp !== DEFAULT_MIN_PLAYERS) {
       params.set("minPlayers", String(mp));
     } else {
       params.delete("minPlayers"); // keep URLs clean at default value
     }
     // ...
   };
   ```
7. Switch the pipeline TanStack Query to `fetchDirectPipelineData`:
   ```ts
   const isInitPipeline =
     format === initPipelineKey.format &&
     source === initPipelineKey.source &&
     periodType === initPipelineKey.periodType &&
     rangeStart === initPipelineKey.rangeStart &&
     rangeEnd === initPipelineKey.rangeEnd &&
     minPlayers === initPipelineKey.minPlayers;
   
   const { data: pipelineResult = null } = useQuery<PipelineDataResult | null>({
     queryKey: [
       "pipeline-data",
       format,
       source,
       periodType,
       rangeStart,
       rangeEnd,
       minPlayers,
     ],
     queryFn: async () => {
       const result = await fetchDirectPipelineData({
         format,
         source,
         periodStart: rangeStart ?? undefined,
         periodEnd: rangeEnd ?? undefined,
         minPlayers,
       });
       if (!result.success) throw new Error(result.error);
       return result.data;
     },
     initialData: isInitPipeline ? initialPipelineResult : undefined,
     placeholderData: (prev) => prev,
     staleTime: 5 * 60 * 1000,
   });
   ```
   Note: `periodType` is no longer passed to `fetchDirectPipelineData` — the direct query doesn't bucket by period type, it uses the date range directly. Remove `periodType` from the `fetchDirectPipelineData` call.
8. Pass `minPlayers` and `onMinPlayersChange` to `DataSidebar`:
   ```tsx
   <DataSidebar
     ...
     minPlayers={minPlayers}
     onMinPlayersChange={handleMinPlayersChange}
   />
   ```

- [ ] **Step 4: Update `data/page.tsx` to pass `minPlayers` as initial filter to `UsageExplorer`**

In `apps/web/src/app/(app)/data/page.tsx`, the server component currently calls `fetchDirectPipelineData` (or `fetchPipelineData`) to pre-load the initial pipeline result for SSR. Switch that call to `fetchDirectPipelineData` and pass the `minPlayers` param from `searchParams`:

```ts
const minPlayersParam = searchParams.minPlayers ?? undefined;
const minPlayers = coerceMinPlayers(typeof minPlayersParam === "string" ? minPlayersParam : undefined);

// Replace the existing fetchPipelineData call:
const pipelineResult = await fetchDirectPipelineData({
  format,
  source,
  periodStart: rangeStart ?? undefined,
  periodEnd: rangeEnd ?? undefined,
  minPlayers,
});
```

Import `coerceMinPlayers` and `fetchDirectPipelineData` in `page.tsx`.

Also pass `minPlayers` in `initialFilters` to `UsageExplorer`. Check how `initialFilters` is typed — if `UsageFilters` doesn't include `minPlayers`, just pass it directly as a prop or as a separate `initialMinPlayers` prop. Simplest approach: derive `minPlayers` on the client from the URL (already done in Step 3), so `page.tsx` doesn't need to do anything extra for the initial value — just use the direct pipeline fetch for SSR pre-loading.

- [ ] **Step 5: Verify types compile**

```bash
pnpm typecheck 2>&1 | grep -iE "error|warning" | head -30
```

Expected: No errors in the modified files.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/data/usage-filters.ts \
        apps/web/src/components/data/data-sidebar.tsx \
        apps/web/src/components/data/usage-explorer.tsx \
        apps/web/src/app/\(app\)/data/page.tsx
git commit -m "feat(web): min-players filter for /data Sankey pipeline

Adds a Min. Players number input to the DataSidebar that persists in the
URL (?minPlayers=N, default 64 is omitted for clean URLs). UsageExplorer
now calls fetchDirectPipelineData instead of fetchPipelineData so the
filter is applied at query time against event_usage rows directly."
```
