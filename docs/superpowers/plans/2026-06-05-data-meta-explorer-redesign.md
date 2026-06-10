# /data Meta Explorer Redesign — Sankey + Line Chart

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `/data` streamgraph with a two-panel interactive dashboard: a Sankey "Meta Pipeline" (hero, top ~60%) and a "Usage Over Time" line chart (navigator, bottom ~40%).

**Architecture:** The Sankey shows Species → Ability → Nature → Move flows using proportional allocation of per-species marginal histograms (Phase 1 — no joint distribution data). The line chart drives the Sankey via species-click (filter) and drag-brush (time range). All persistent state lives in URL query params. A new `getPipelineData()` Supabase query fetches species + histograms for a given format/period in one call.

**Tech Stack:** d3-sankey (layout math, React SVG render), Recharts LineChart + Brush, TanStack Query v5, Next.js Server Actions with `unstable_cache`, Tailwind CSS 4, React Compiler (no manual memoization).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `packages/supabase/supabase/migrations/<ts>_format_events_rpc.sql` | **Create** | `get_format_events()` RPC — distinct events, no row-cap truncation |
| `packages/supabase/src/queries/usage.ts` | Modify | Add `getPipelineData()`, `getFormatEvents()` |
| `packages/supabase/src/queries/index.ts` | Modify | Export new types + functions |
| `apps/web/src/components/data/usage-filters.ts` | Modify | Add `coerceSelectedSpecies()`, `coerceRangeStart()`, `coerceRangeEnd()` |
| `apps/web/src/actions/usage.ts` | Modify | Add `fetchPipelineData()`, `fetchFormatEvents()` |
| `apps/web/src/components/data/usage-pipeline.ts` | **Create** | Types + `buildPipelineGraph()` transform |
| `apps/web/src/components/data/usage-pipeline-chart.tsx` | **Create** | Sankey SVG component |
| `apps/web/src/components/data/usage-line-chart.tsx` | **Create** | Line chart with Brush + event pins |
| `apps/web/src/components/data/usage-controls.tsx` | Modify | Remove mode tabs; restructure layout |
| `apps/web/src/components/data/usage-explorer.tsx` | Modify | New state model; wire both panels |
| `apps/web/src/components/data/usage-stream-chart.tsx` | **Delete** | Replaced by new components |
| `apps/web/src/app/(app)/data/page.tsx` | Modify | Prefetch pipeline data server-side |
| `apps/web/src/app/(app)/data/loading.tsx` | Modify | Two-panel skeleton |
| `apps/web/package.json` | Modify | Add `d3-sankey` + `@types/d3-sankey` |
| `apps/web/src/components/data/__tests__/usage-filters.test.ts` | Modify | New coercers + updated threshold clamp/default |
| `apps/web/src/components/data/__tests__/usage-controls.test.tsx` | Modify | Rewrite for new controls API (no mode tabs) |
| `apps/web/src/components/data/__tests__/usage-explorer.test.tsx` | Modify | Rewrite for new two-panel props + mocks |
| `packages/supabase/src/queries/__tests__/usage.test.ts` | Modify | Tests for new queries |
| `apps/web/src/actions/__tests__/usage.test.ts` | Modify | Tests for new actions |
| `apps/web/src/components/data/__tests__/usage-pipeline.test.ts` | **Create** | Tests for `buildPipelineGraph()` |

---

## Task 1: Add d3-sankey dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install d3-sankey**

```bash
cd apps/web && pnpm add d3-sankey && pnpm add -D @types/d3-sankey
```

Expected: `apps/web/package.json` gains `"d3-sankey"` in `dependencies` and `"@types/d3-sankey"` in `devDependencies`.

- [ ] **Step 2: Verify import resolves**

```bash
cd apps/web && node -e "require('d3-sankey')" 2>&1 | head -5
```

Expected: no output (require succeeds).

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(deps): add d3-sankey for Meta Explorer Sankey layout"
```

---

## Task 2: New filter coercers for species selection + time range

**Files:**
- Modify: `apps/web/src/components/data/usage-filters.ts`
- Modify: `apps/web/src/components/data/__tests__/usage-filters.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/components/data/__tests__/usage-filters.test.ts`:

```typescript
import {
  // ... existing imports ...
  coerceSelectedSpecies,
  coerceRangeStart,
  coerceRangeEnd,
} from "../usage-filters";

// =============================================================================
// coerceSelectedSpecies
// =============================================================================

describe("coerceSelectedSpecies", () => {
  it("returns [] when raw is null", () => {
    expect(coerceSelectedSpecies(null)).toEqual([]);
  });

  it("returns [] when raw is empty string", () => {
    expect(coerceSelectedSpecies("")).toEqual([]);
  });

  it("parses single species", () => {
    expect(coerceSelectedSpecies("Sneasler")).toEqual(["Sneasler"]);
  });

  it("parses comma-separated species list", () => {
    expect(coerceSelectedSpecies("Sneasler,Koraidon")).toEqual([
      "Sneasler",
      "Koraidon",
    ]);
  });

  it("trims whitespace around each species", () => {
    expect(coerceSelectedSpecies(" Sneasler , Koraidon ")).toEqual([
      "Sneasler",
      "Koraidon",
    ]);
  });

  it("filters out empty entries after splitting", () => {
    expect(coerceSelectedSpecies("Sneasler,,Koraidon")).toEqual([
      "Sneasler",
      "Koraidon",
    ]);
  });
});

// =============================================================================
// coerceRangeStart / coerceRangeEnd
// =============================================================================

describe("coerceRangeStart", () => {
  it("returns null when raw is null", () => {
    expect(coerceRangeStart(null)).toBeNull();
  });

  it("returns null when raw is empty string", () => {
    expect(coerceRangeStart("")).toBeNull();
  });

  it("returns the date string when raw is a valid ISO date", () => {
    expect(coerceRangeStart("2025-01-24")).toBe("2025-01-24");
  });

  it("returns null when raw is not a valid date", () => {
    expect(coerceRangeStart("not-a-date")).toBeNull();
  });
});

describe("coerceRangeEnd", () => {
  it("returns null when raw is null", () => {
    expect(coerceRangeEnd(null)).toBeNull();
  });

  it("returns the date string for a valid ISO date", () => {
    expect(coerceRangeEnd("2025-01-31")).toBe("2025-01-31");
  });

  it("returns null for an invalid date", () => {
    expect(coerceRangeEnd("invalid")).toBeNull();
  });
});
```

**Also update the EXISTING `coerceThreshold` / `DEFAULT_THRESHOLD` tests** in the same file. The redesign widens the slider to ≥1%–20% (default 2%) per the approved spec, so the coercer's clamp range and default change. Find and replace the existing assertions:

```typescript
// REPLACE: it("DEFAULT_THRESHOLD is 1", ...) →
it("DEFAULT_THRESHOLD is 2", () => {
  expect(DEFAULT_THRESHOLD).toBe(2);
});

// REPLACE the entire `describe("coerceThreshold", ...)` block with:
describe("coerceThreshold", () => {
  it("returns the parsed number for in-range values", () => {
    expect(coerceThreshold("5")).toBe(5);
    expect(coerceThreshold("2.5")).toBe(2.5);
    expect(coerceThreshold("20")).toBe(20);
    expect(coerceThreshold("1")).toBe(1);
  });

  it("returns DEFAULT_THRESHOLD for undefined / null", () => {
    expect(coerceThreshold(undefined)).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold(null)).toBe(DEFAULT_THRESHOLD);
  });

  it("returns DEFAULT_THRESHOLD for NaN strings", () => {
    expect(coerceThreshold("abc")).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold("")).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold("NaN")).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps values below the floor up to 1", () => {
    expect(coerceThreshold("0")).toBe(1);
    expect(coerceThreshold("-1")).toBe(1);
    expect(coerceThreshold("-100")).toBe(1);
  });

  it("clamps values above the ceiling down to 20", () => {
    expect(coerceThreshold("21")).toBe(20);
    expect(coerceThreshold("20.001")).toBe(20);
    expect(coerceThreshold("999")).toBe(20);
  });

  it("preserves fractional in-range values", () => {
    expect(coerceThreshold("3.14")).toBeCloseTo(3.14);
    expect(coerceThreshold("9.99")).toBeCloseTo(9.99);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="usage-filters" 2>&1 | tail -20
```

Expected: FAIL — `coerceSelectedSpecies is not a function` (or similar).

- [ ] **Step 3: Implement the coercer changes**

First, **edit the existing default + `coerceThreshold` clamp** in `apps/web/src/components/data/usage-filters.ts` to match the approved spec (≥1%–20%, default 2%). Without this, the widened slider (`max={20}` in Task 9) writes values >10 to the URL that the old `[0,10]` clamp snaps back to 10 — a silently broken control.

```typescript
// CHANGE: export const DEFAULT_THRESHOLD = 1;
export const DEFAULT_THRESHOLD = 2;
```

```typescript
// REPLACE the body of coerceThreshold — clamp to [1, 20] instead of [0, 10].
/**
 * Coerces a raw string to a threshold number, clamped to [1, 20].
 *
 * Returns `DEFAULT_THRESHOLD` when `raw` is undefined, non-numeric, or NaN.
 * The [1, 20] range matches the Min-usage slider (spec: "≥1%–20%, default 2%").
 */
export function coerceThreshold(raw: string | undefined | null): number {
  if (raw === undefined || raw === null) return DEFAULT_THRESHOLD;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return DEFAULT_THRESHOLD;
  return Math.min(20, Math.max(1, parsed));
}
```

Then append the three new coercers to `apps/web/src/components/data/usage-filters.ts`:

```typescript
// =============================================================================
// Species selection + time range coercers
// =============================================================================

/**
 * Coerces a comma-separated raw string to an array of species names.
 *
 * Returns `[]` when `raw` is null, empty, or contains only whitespace/commas.
 * Each name is trimmed; empty strings after trimming are discarded.
 */
export function coerceSelectedSpecies(
  raw: string | undefined | null
): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Coerces a raw string to a valid ISO date string (YYYY-MM-DD).
 *
 * Returns `null` when `raw` is absent, empty, or not a parseable date.
 */
export function coerceRangeStart(
  raw: string | undefined | null
): string | null {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return raw.trim();
}

/**
 * Coerces a raw string to a valid ISO date string (YYYY-MM-DD).
 *
 * Identical behaviour to `coerceRangeStart` — both coercers validate the same
 * way; separate functions keep call-sites self-documenting.
 */
export function coerceRangeEnd(
  raw: string | undefined | null
): string | null {
  return coerceRangeStart(raw);
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="usage-filters" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/data/usage-filters.ts \
        apps/web/src/components/data/__tests__/usage-filters.test.ts
git commit -m "feat(data): add selectedSpecies + rangeStart/End filter coercers"
```

---

## Task 3: Add `getPipelineData()` to Supabase queries

**Files:**
- Modify: `packages/supabase/src/queries/usage.ts`
- Modify: `packages/supabase/src/queries/index.ts`
- Modify: `packages/supabase/src/queries/__tests__/usage.test.ts`

- [ ] **Step 1: Write the failing tests**

First, **add `getPipelineData` to the existing top-of-file import** from `../usage` (do not append a second `import … from "../usage"` — re-importing `getFormatUsageTimeseries` / `_fetchUsageRowsInChunks` is a duplicate-identifier error):

```typescript
import {
  getFormatUsageTimeseries,
  _fetchUsageRowsInChunks,
  getPipelineData,
} from "../usage";
```

Then append the test blocks to `packages/supabase/src/queries/__tests__/usage.test.ts`:

```typescript
// =============================================================================
// Test data factories for getPipelineData
// =============================================================================

const makeDetailRow = (overrides?: Partial<{
  species: string;
  abilities: unknown;
  natures: unknown;
  moves: unknown;
}>) => ({
  species: "Sneasler",
  abilities: [{ value: "Unburden", count: 91, pct: 91 }],
  natures: [{ value: "Jolly", count: 78, pct: 78 }],
  moves: [{ value: "Fake Out", count: 94, pct: 94 }],
  ...overrides,
});

// =============================================================================
// getPipelineData — no data
// =============================================================================

describe("getPipelineData — no data", () => {
  it("returns empty data when no meta row exists", async () => {
    const client = makeSequentialClient([
      { data: null, error: null }, // meta query returns null
    ]);
    const result = await getPipelineData(client, {
      format: "gen9vgc2025regg",
      source: "all",
      periodType: "week",
    });
    expect(result).toBeNull();
  });

  it("throws when meta query errors", async () => {
    const client = makeSequentialClient([
      { data: null, error: { message: "DB error" } },
    ]);
    await expect(
      getPipelineData(client, {
        format: "gen9vgc2025regg",
        source: "all",
        periodType: "week",
      })
    ).rejects.toThrow("DB error");
  });
});

// =============================================================================
// getPipelineData — with data
// =============================================================================

describe("getPipelineData — with data", () => {
  it("returns PipelineDataResult with species from usage + detail rows", async () => {
    const metaRow = { id: 5, period_start: "2025-01-24", period_end: "2025-01-31" };
    const usageRow = { species: "Sneasler", usage_pct: 22.5, rank: 1 };
    const detailRow = makeDetailRow();

    // Sequential: meta query → usage query → detail query
    const client = makeSequentialClient([
      { data: metaRow, error: null },       // maybeSingle meta
      { data: [usageRow], error: null },    // usage_stats query
      { data: [detailRow], error: null },   // detail_stats query
    ]);

    const result = await getPipelineData(client, {
      format: "gen9vgc2025regg",
      source: "all",
      periodType: "week",
    });

    expect(result).not.toBeNull();
    expect(result!.periodStart).toBe("2025-01-24");
    expect(result!.periodEnd).toBe("2025-01-31");
    expect(result!.data).toHaveLength(1);
    expect(result!.data[0]!.species).toBe("Sneasler");
    expect(result!.data[0]!.usagePct).toBe(22.5);
    expect(result!.data[0]!.abilities).toEqual([
      { value: "Unburden", count: 91, pct: 91 },
    ]);
  });

  it("fills missing detail stats with empty arrays", async () => {
    const metaRow = { id: 5, period_start: "2025-01-24", period_end: "2025-01-31" };
    const usageRow = { species: "Koraidon", usage_pct: 18.0, rank: 2 };

    const client = makeSequentialClient([
      { data: metaRow, error: null },
      { data: [usageRow], error: null },
      { data: [], error: null }, // no detail row for Koraidon
    ]);

    const result = await getPipelineData(client, {
      format: "gen9vgc2025regg",
      source: "all",
      periodType: "week",
    });

    expect(result!.data[0]!.abilities).toEqual([]);
    expect(result!.data[0]!.natures).toEqual([]);
    expect(result!.data[0]!.moves).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test --filter @trainers/supabase -- --testPathPattern="usage" 2>&1 | tail -20
```

Expected: FAIL — `getPipelineData is not a function`.

- [ ] **Step 3: Add types and implement `getPipelineData()`**

Append to `packages/supabase/src/queries/usage.ts` (after the existing types, before the queries section):

```typescript
/** One species' pipeline data — usage % plus marginal histograms. */
export interface PipelineSpeciesData {
  species: string;
  usagePct: number;
  rank: number;
  abilities: UsageDetailEntry[];
  natures: UsageDetailEntry[];
  moves: UsageDetailEntry[];
}

/** Result shape returned by `getPipelineData`. */
export interface PipelineDataResult {
  data: PipelineSpeciesData[];
  /** ISO date string for the period start of the resolved bucket. */
  periodStart: string;
  /** ISO date string for the period end of the resolved bucket. */
  periodEnd: string;
}

/** Parameters for `getPipelineData`. */
export interface GetPipelineDataParams {
  format: string;
  source: string;
  periodType: "day" | "week" | "month";
  /** If provided, resolves the latest period whose start is >= this date. */
  periodStart?: string;
  /** If provided, restricts to periods whose end is <= this date. */
  periodEnd?: string;
}
```

Then append the function (after `getFormatUsageTimeseries`):

```typescript
/**
 * Fetch all species + histogram data for a single period in a given format.
 *
 * Resolves the latest `format_meta_stats` row matching the given
 * (format, source, period_type) — optionally restricted to a date range.
 * Returns the full Species → Ability / Nature / Move histograms needed to
 * render the Meta Pipeline Sankey. Returns `null` if no matching period exists.
 *
 * Three queries are used:
 *   1. Resolve the latest matching meta bucket (maybeSingle).
 *   2. Fetch all pokemon_usage_stats for that bucket.
 *   3. Fetch all pokemon_detail_stats for that bucket.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 */
export async function getPipelineData(
  supabase: TypedClient,
  params: GetPipelineDataParams
): Promise<PipelineDataResult | null> {
  const { format, source, periodType, periodStart, periodEnd } = params;

  // ── Query 1: resolve latest matching meta bucket ──────────────────────────
  let metaQuery = supabase
    .from("format_meta_stats")
    .select("id, period_start, period_end")
    .eq("format", format)
    .eq("source", source)
    .eq("period_type", periodType)
    .order("period_start", { ascending: false });

  if (periodStart) {
    metaQuery = metaQuery.gte("period_start", periodStart);
  }
  if (periodEnd) {
    metaQuery = metaQuery.lte("period_end", periodEnd);
  }

  const { data: metaRow, error: metaError } = await metaQuery.limit(1).maybeSingle();

  if (metaError) {
    throw new Error(
      `Failed to fetch meta bucket for pipeline data (${format}): ${metaError.message}`
    );
  }

  if (!metaRow) return null;

  // ── Query 2: all usage rows for this meta bucket ──────────────────────────
  const { data: usageRows, error: usageError } = await supabase
    .from("pokemon_usage_stats")
    .select("species, usage_pct, rank")
    .eq("meta_id", metaRow.id)
    .order("rank", { ascending: true });

  if (usageError) {
    throw new Error(
      `Failed to fetch usage stats for meta ${metaRow.id}: ${usageError.message}`
    );
  }

  // ── Query 3: all detail rows for this meta bucket ─────────────────────────
  const { data: detailRows, error: detailError } = await supabase
    .from("pokemon_detail_stats")
    .select("species, abilities, natures, moves")
    .eq("meta_id", metaRow.id);

  if (detailError) {
    throw new Error(
      `Failed to fetch detail stats for meta ${metaRow.id}: ${detailError.message}`
    );
  }

  // Index detail rows by species for O(1) lookup.
  const detailBySpecies = new Map(
    (detailRows ?? []).map((d) => [d.species, d])
  );

  const data: PipelineSpeciesData[] = (usageRows ?? []).map((row) => {
    const detail = detailBySpecies.get(row.species);
    return {
      species: row.species,
      usagePct: row.usage_pct,
      rank: row.rank,
      abilities: (detail?.abilities as UsageDetailEntry[] | null) ?? [],
      natures: (detail?.natures as UsageDetailEntry[] | null) ?? [],
      moves: (detail?.moves as UsageDetailEntry[] | null) ?? [],
    };
  });

  return {
    data,
    periodStart: metaRow.period_start,
    periodEnd: metaRow.period_end,
  };
}
```

- [ ] **Step 4: Update the mock helpers to support `getPipelineData` (and the Task 4 RPC)**

`getPipelineData` calls `.limit(1).maybeSingle()` plus `.gte()`/`.lte()`. The current mock makes `.limit` resolve to a Promise, so `.limit(1).maybeSingle()` would call `.maybeSingle` on a Promise → `TypeError`. The fix: make `.limit` a chaining method (`returnSelf`) — the builder is already thenable via `.then`, so `await …limit(n)` in `getFormatUsageTimeseries` still resolves to `result`. Then `.maybeSingle()` becomes the terminal.

This also adds `.rpc()` to the sequential client for Task 4's `getFormatEvents` RPC. **Replace the whole `makeQueryBuilder` + `makeSequentialClient` block** at the top of `packages/supabase/src/queries/__tests__/usage.test.ts`:

```typescript
type MockResult = { data: unknown; error: unknown };

function makeQueryBuilder(result: MockResult) {
  const builder: Record<string, unknown> = {};
  const returnSelf = jest.fn().mockReturnValue(builder);
  builder["select"] = returnSelf;
  builder["eq"] = returnSelf;
  builder["order"] = returnSelf;
  builder["in"] = returnSelf;
  builder["gte"] = returnSelf;
  builder["lte"] = returnSelf;
  // `.limit()` chains (returns the builder) — both `await …limit(n)` (via `.then`)
  // and `.limit(1).maybeSingle()` resolve correctly.
  builder["limit"] = returnSelf;
  // `.maybeSingle()` is the terminal for the single-row meta query in getPipelineData.
  builder["maybeSingle"] = jest.fn().mockResolvedValue(result);
  // Direct await is the terminal for list queries — `.then` makes it thenable.
  builder["then"] = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

/**
 * Build a TypedClient that returns a different result for each sequential call.
 * Both `.from()` and `.rpc()` consume from the same shared result queue, mirroring
 * the multi-query structure of getFormatUsageTimeseries / getPipelineData and the
 * single `.rpc()` call in getFormatEvents.
 */
function makeSequentialClient(results: MockResult[]) {
  let callIndex = 0;
  const nextBuilder = () => {
    const result = results[callIndex++] ?? { data: null, error: null };
    return makeQueryBuilder(result);
  };
  const client = {
    from: jest.fn(() => nextBuilder()),
    rpc: jest.fn(() => nextBuilder()),
  };
  return client as unknown as TypedClient;
}
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
pnpm test --filter @trainers/supabase -- --testPathPattern="usage" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 6: Export from barrel**

In `packages/supabase/src/queries/index.ts`, update the usage section:

```typescript
// Usage stats queries
export {
  getSpeciesUsageDetail,
  getSpeciesUsage,
  getFormatUsageTimeseries,
  getPipelineData,
  getFormatEvents,             // will be added in Task 4
} from "./usage";

export type {
  UsageDetailEntry,
  SpeciesUsagePeriod,
  SpeciesUsageDetailParams,
  FormatUsageRow,
  FormatUsageTimeseriesPoint,
  PipelineSpeciesData,
  PipelineDataResult,
  GetPipelineDataParams,
  FormatEvent,                  // will be added in Task 4
} from "./usage";
```

> Note: `getFormatEvents` and `FormatEvent` are added in Task 4 — if exporting them now causes a TS error, wait until Task 4 is done and add all exports in one shot.

- [ ] **Step 7: Commit**

```bash
git add packages/supabase/src/queries/usage.ts \
        packages/supabase/src/queries/index.ts \
        packages/supabase/src/queries/__tests__/usage.test.ts
git commit -m "feat(supabase): add getPipelineData query for Meta Explorer Sankey"
```

---

## Task 4: Add `getFormatEvents()` — distinct-events RPC

**Files:**
- Create: `packages/supabase/supabase/migrations/<ts>_format_events_rpc.sql`
- Modify: `packages/supabase/src/database.types.ts` (regenerated, do not hand-edit)
- Modify: `packages/supabase/src/queries/usage.ts`
- Modify: `packages/supabase/src/queries/index.ts`
- Modify: `packages/supabase/src/queries/__tests__/usage.test.ts`

> **Why an RPC and not a table query?** `event_usage` has one row per `(source, event_key, division, species)` — a single event expands to hundreds of rows. A plain `SELECT event_key, event_date, source` would return thousands of duplicates, hit PostgREST's default 1000-row cap, and **silently truncate** — and ordering `event_date ASC` would keep the *oldest* events while dropping the recent ones the meta view needs. A `DISTINCT` RPC collapses to one row per distinct event server-side, so the result (distinct events for one format) is small and never truncated. This is the "only reproduces at scale" class of bug the project CLAUDE.md calls out.

- [ ] **Step 1: Create the migration**

Create `packages/supabase/supabase/migrations/<ts>_format_events_rpc.sql` (use a UTC timestamp later than `20260604225054`; run `date -u +%Y%m%d%H%M%S` for the prefix):

```sql
-- =============================================================================
-- get_format_events RPC — distinct events for usage-timeline annotation pins
--
-- WHY: event_usage holds one row per (source, event_key, division, species), so
-- a single event expands to hundreds of rows. A plain PostgREST select would
-- return thousands of duplicates and risk the 1000-row cap silently truncating
-- recent events. DISTINCT collapses to one row per (event_key, event_date,
-- source) server-side; the distinct-event count for a format is small.
--
-- SECURITY INVOKER: runs with the caller's privileges, so RLS on event_usage
-- (public read, USING (true)) still applies — anon (createStaticClient) can read.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_format_events(p_format text)
RETURNS TABLE (event_key text, event_date date, source text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT DISTINCT eu.event_key, eu.event_date, eu.source
  FROM public.event_usage eu
  WHERE eu.format = p_format
  ORDER BY eu.event_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_format_events(text) TO anon, authenticated;
```

- [ ] **Step 2: Apply the migration and regenerate types**

```bash
pnpm db:reset && pnpm generate-types
```

Expected: `database.types.ts` gains `get_format_events` under `Functions` with `Args: { p_format: string }` and `Returns: { event_key: string; event_date: string; source: string }[]`.

- [ ] **Step 3: Write the failing tests**

Append to `packages/supabase/src/queries/__tests__/usage.test.ts`:

```typescript
import { getFormatEvents } from "../usage";

// =============================================================================
// getFormatEvents — backed by the get_format_events RPC (returns distinct rows)
// =============================================================================

describe("getFormatEvents", () => {
  it("returns [] when no events exist for format", async () => {
    const client = makeSequentialClient([{ data: [], error: null }]);
    const result = await getFormatEvents(client, "gen9vgc2025regg");
    expect(result).toEqual([]);
  });

  it("throws when the RPC errors", async () => {
    const client = makeSequentialClient([
      { data: null, error: { message: "DB error" } },
    ]);
    await expect(getFormatEvents(client, "gen9vgc2025regg")).rejects.toThrow(
      "DB error"
    );
  });

  it("maps RPC rows to FormatEvent shape", async () => {
    // The RPC already returns distinct, ordered rows — no client-side dedup.
    const rows = [
      { event_key: "rk9:00123", event_date: "2025-01-12", source: "rk9" },
      { event_key: "limitless:abc", event_date: "2025-02-01", source: "limitless" },
    ];
    const client = makeSequentialClient([{ data: rows, error: null }]);
    const result = await getFormatEvents(client, "gen9vgc2025regg");
    expect(result).toEqual([
      { eventKey: "rk9:00123", eventDate: "2025-01-12", source: "rk9" },
      { eventKey: "limitless:abc", eventDate: "2025-02-01", source: "limitless" },
    ]);
  });
});
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
pnpm test --filter @trainers/supabase -- --testPathPattern="usage" 2>&1 | tail -20
```

Expected: FAIL — `getFormatEvents is not a function`.

- [ ] **Step 5: Add `FormatEvent` type and implement `getFormatEvents()`**

Append to the types section of `packages/supabase/src/queries/usage.ts`:

```typescript
/** One distinct event for annotation pins on the usage timeline. */
export interface FormatEvent {
  /** Unique event key, e.g. "rk9:00123" or "limitless:abc". */
  eventKey: string;
  /** ISO date string (YYYY-MM-DD). */
  eventDate: string;
  /** Data source: "rk9" | "limitless" | "first_party". */
  source: string;
}
```

Append the function after `getPipelineData`:

```typescript
/**
 * Fetch distinct events for a format, used to render annotation pins on the
 * usage timeline. Delegates to the `get_format_events` RPC, which returns one
 * row per distinct (event_key, event_date, source) ordered by event_date — see
 * the migration for why a DISTINCT RPC is used instead of a raw table select.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param format - Format ID (e.g. "gen9vgc2025regg").
 */
export async function getFormatEvents(
  supabase: TypedClient,
  format: string
): Promise<FormatEvent[]> {
  const { data, error } = await supabase.rpc("get_format_events", {
    p_format: format,
  });

  if (error) {
    throw new Error(
      `Failed to fetch events for format ${format}: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    eventKey: row.event_key,
    eventDate: row.event_date,
    source: row.source,
  }));
}
```

- [ ] **Step 6: Run tests and verify they pass**

```bash
pnpm test --filter @trainers/supabase -- --testPathPattern="usage" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 7: Finalize barrel exports** (complete the partial update from Task 3)

In `packages/supabase/src/queries/index.ts`:

```typescript
// Usage stats queries
export {
  getSpeciesUsageDetail,
  getSpeciesUsage,
  getFormatUsageTimeseries,
  getPipelineData,
  getFormatEvents,
} from "./usage";

export type {
  UsageDetailEntry,
  SpeciesUsagePeriod,
  SpeciesUsageDetailParams,
  FormatUsageRow,
  FormatUsageTimeseriesPoint,
  PipelineSpeciesData,
  PipelineDataResult,
  GetPipelineDataParams,
  FormatEvent,
} from "./usage";
```

- [ ] **Step 8: Commit**

```bash
git add packages/supabase/supabase/migrations/*_format_events_rpc.sql \
        packages/supabase/src/database.types.ts \
        packages/supabase/src/queries/usage.ts \
        packages/supabase/src/queries/index.ts \
        packages/supabase/src/queries/__tests__/usage.test.ts
git commit -m "feat(supabase): add get_format_events RPC + getFormatEvents for timeline pins

Uses a DISTINCT RPC rather than a raw event_usage select: the table has one
row per (source, event_key, division, species), so a plain select returns
thousands of duplicate rows and risks PostgREST's 1000-row cap silently
truncating recent events (ASC order would drop the newest). DISTINCT collapses
server-side; distinct-event count per format is small and never truncated."
```

---

## Task 5: New server actions `fetchPipelineData()` + `fetchFormatEvents()`

**Files:**
- Modify: `apps/web/src/actions/usage.ts`
- Modify: `apps/web/src/actions/__tests__/usage.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/actions/__tests__/usage.test.ts`:

```typescript
// Add to existing jest.mock("@trainers/supabase") factory:
// getPipelineData: jest.fn(),
// getFormatEvents: jest.fn(),

import {
  fetchPipelineData,
  fetchFormatEvents,
} from "../usage";

// ... (add the mock handles after existing ones)
const mockGetPipelineData = getPipelineData as jest.Mock;
const mockGetFormatEvents = getFormatEvents as jest.Mock;

// =============================================================================
// fetchPipelineData
// =============================================================================

describe("fetchPipelineData", () => {
  it("returns success with pipeline data", async () => {
    const mockData = {
      data: [{ species: "Sneasler", usagePct: 22, rank: 1, abilities: [], natures: [], moves: [] }],
      periodStart: "2025-01-24",
      periodEnd: "2025-01-31",
    };
    mockCreateStaticClient.mockReturnValue({});
    mockGetPipelineData.mockResolvedValue(mockData);

    const result = await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "all",
      periodType: "week",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.data[0]?.species).toBe("Sneasler");
    }
  });

  it("returns success with null when no data exists", async () => {
    mockCreateStaticClient.mockReturnValue({});
    mockGetPipelineData.mockResolvedValue(null);

    const result = await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "all",
      periodType: "week",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("returns failure when query throws", async () => {
    mockCreateStaticClient.mockReturnValue({});
    mockGetPipelineData.mockRejectedValue(new Error("DB failure"));

    const result = await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "all",
      periodType: "week",
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// fetchFormatEvents
// =============================================================================

describe("fetchFormatEvents", () => {
  it("returns success with event list", async () => {
    const mockEvents = [{ eventKey: "rk9:001", eventDate: "2025-01-12", source: "rk9" }];
    mockCreateStaticClient.mockReturnValue({});
    mockGetFormatEvents.mockResolvedValue(mockEvents);

    const result = await fetchFormatEvents("gen9vgc2025regg");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  it("returns failure when query throws", async () => {
    mockCreateStaticClient.mockReturnValue({});
    mockGetFormatEvents.mockRejectedValue(new Error("DB failure"));

    const result = await fetchFormatEvents("gen9vgc2025regg");

    expect(result.success).toBe(false);
  });
});
```

> Note: The mock for `@trainers/supabase` at the top of the test file needs `getPipelineData: jest.fn()` and `getFormatEvents: jest.fn()` added to its factory return value.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="actions/__tests__/usage" 2>&1 | tail -20
```

Expected: FAIL — `fetchPipelineData is not a function`.

- [ ] **Step 3: Implement the new actions**

Append to `apps/web/src/actions/usage.ts` (after the imports, add the new functions at the bottom):

First, update the `@trainers/supabase` import to include new types/functions:

```typescript
import {
  // ... existing imports ...
  getPipelineData,
  getFormatEvents,
  type PipelineDataResult,
  type FormatEvent,
} from "@trainers/supabase";
```

Then append the two new actions:

```typescript
// ---------------------------------------------------------------------------
// Public read: pipeline data for Sankey (all species × histograms)
// ---------------------------------------------------------------------------

/** Parameters for fetchPipelineData. */
export interface FetchPipelineDataParams {
  format: string;
  source?: string;
  periodType?: "day" | "week" | "month";
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Public server action to fetch species + histogram data for the Meta Pipeline
 * Sankey. Returns the latest matching period's data for all species above the
 * caller's threshold (threshold is applied client-side, not here).
 *
 * Uses `createStaticClient()` + `unstable_cache` for 1h ISR caching.
 */
export async function fetchPipelineData(
  params: FetchPipelineDataParams
): Promise<ActionResult<PipelineDataResult | null>> {
  try {
    const {
      format,
      source = "all",
      periodType = "week",
      periodStart,
      periodEnd,
    } = params;

    const cacheKey = `pipeline-data:${format}:${source}:${periodType}:${periodStart ?? ""}:${periodEnd ?? ""}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getPipelineData(supabase, {
          format,
          source: toDBSource(source),
          periodType,
          periodStart,
          periodEnd,
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
      error: getErrorMessage(e, "Failed to fetch pipeline data"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: format events for timeline annotation pins
// ---------------------------------------------------------------------------

/**
 * Public server action to fetch distinct event dates for a format.
 *
 * Returns `FormatEvent[]` for rendering annotation pins (🏆/🌐) on the usage
 * timeline's X-axis. Uses `createStaticClient()` + `unstable_cache` for 1h ISR.
 */
export async function fetchFormatEvents(
  format: string
): Promise<ActionResult<FormatEvent[]>> {
  try {
    const cacheKey = `format-events:${format}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getFormatEvents(supabase, format);
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
      error: getErrorMessage(e, "Failed to fetch format events"),
    };
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="actions/__tests__/usage" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/actions/usage.ts \
        apps/web/src/actions/__tests__/usage.test.ts
git commit -m "feat(actions): add fetchPipelineData + fetchFormatEvents server actions"
```

---

## Task 6: Create `usage-pipeline.ts` — transform histograms to Sankey graph

**Files:**
- Create: `apps/web/src/components/data/usage-pipeline.ts`
- Create: `apps/web/src/components/data/__tests__/usage-pipeline.test.ts`

- [ ] **Step 1: Create the test file**

Create `apps/web/src/components/data/__tests__/usage-pipeline.test.ts`:

```typescript
import {
  buildPipelineGraph,
  type PipelineNode,
  type PipelineLink,
} from "../usage-pipeline";
import type { PipelineSpeciesData } from "@trainers/supabase";

// =============================================================================
// Test data factories
// =============================================================================

function makeSpecies(overrides?: Partial<PipelineSpeciesData>): PipelineSpeciesData {
  return {
    species: "Sneasler",
    usagePct: 20,
    rank: 1,
    abilities: [{ value: "Unburden", count: 80, pct: 80 }],
    natures: [{ value: "Jolly", count: 75, pct: 75 }],
    moves: [{ value: "Fake Out", count: 90, pct: 90 }],
    ...overrides,
  };
}

// =============================================================================
// buildPipelineGraph — empty input
// =============================================================================

describe("buildPipelineGraph — empty", () => {
  it("returns empty nodes and links for empty input", () => {
    const result = buildPipelineGraph([]);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });
});

// =============================================================================
// buildPipelineGraph — single species
// =============================================================================

describe("buildPipelineGraph — single species", () => {
  it("creates one species node per species", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const speciesNodes = result.nodes.filter((n: PipelineNode) => n.column === "species");
    expect(speciesNodes).toHaveLength(1);
    expect(speciesNodes[0]!.id).toBe("species:Sneasler");
    expect(speciesNodes[0]!.label).toBe("Sneasler");
  });

  it("creates one ability node per distinct ability", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const abilityNodes = result.nodes.filter((n: PipelineNode) => n.column === "ability");
    expect(abilityNodes).toHaveLength(1);
    expect(abilityNodes[0]!.id).toBe("ability:Unburden");
  });

  it("creates species→ability link with correct value", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const link = result.links.find(
      (l: PipelineLink) => l.source === "species:Sneasler" && l.target === "ability:Unburden"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct / 100 = 20 * 80 / 100 = 16
    expect(link!.value).toBeCloseTo(16);
  });

  it("creates ability→nature link with proportionally allocated value", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const link = result.links.find(
      (l: PipelineLink) => l.source === "ability:Unburden" && l.target === "nature:Jolly"
    );
    expect(link).toBeDefined();
    // value = usagePct * ability.pct/100 * nature.pct/100 = 20 * 0.8 * 0.75 = 12
    expect(link!.value).toBeCloseTo(12);
  });

  it("creates nature→move link with proportionally allocated value", () => {
    const result = buildPipelineGraph([makeSpecies()]);
    const link = result.links.find(
      (l: PipelineLink) => l.source === "nature:Jolly" && l.target === "move:Fake Out"
    );
    expect(link).toBeDefined();
    // value = usagePct * nature.pct/100 * move.pct/100 = 20 * 0.75 * 0.90 = 13.5
    expect(link!.value).toBeCloseTo(13.5);
  });
});

// =============================================================================
// buildPipelineGraph — multiple species sharing an ability node
// =============================================================================

describe("buildPipelineGraph — shared ability node", () => {
  it("aggregates species→ability links into shared ability node", () => {
    const sneasler = makeSpecies({ species: "Sneasler", usagePct: 20 });
    const koraidon = makeSpecies({
      species: "Koraidon",
      usagePct: 18,
      abilities: [{ value: "Unburden", count: 100, pct: 100 }], // same ability
      natures: [{ value: "Jolly", count: 100, pct: 100 }],
      moves: [{ value: "Fake Out", count: 100, pct: 100 }],
    });

    const result = buildPipelineGraph([sneasler, koraidon]);

    // Only one "Unburden" ability node
    const abilityNodes = result.nodes.filter((n: PipelineNode) => n.id === "ability:Unburden");
    expect(abilityNodes).toHaveLength(1);

    // Two species→Unburden links (one per species)
    const linksToUnburden = result.links.filter(
      (l: PipelineLink) => l.target === "ability:Unburden"
    );
    expect(linksToUnburden).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="usage-pipeline" 2>&1 | tail -20
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `usage-pipeline.ts`**

Create `apps/web/src/components/data/usage-pipeline.ts`:

```typescript
import { type PipelineSpeciesData } from "@trainers/supabase";
import { assignColor } from "./usage-series";

// =============================================================================
// Types
// =============================================================================

/** One node in the Sankey graph — a species, ability, nature, or move. */
export interface PipelineNode {
  /** Unique identifier, e.g. "species:Sneasler" or "ability:Unburden". */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Which column this node belongs to. */
  column: "species" | "ability" | "nature" | "move";
  /** Color — species nodes use assignColor(); others use the teal palette. */
  color: string;
}

/** One directed flow between two nodes. */
export interface PipelineLink {
  /** Source node id. */
  source: string;
  /** Target node id. */
  target: string;
  /**
   * Flow value — proportionally allocated usage % contribution.
   *
   * Computed using independence assumption (Phase 1):
   *   species→ability:  usagePct × ability.pct / 100
   *   ability→nature:   usagePct × ability.pct/100 × nature.pct/100
   *   nature→move:      usagePct × nature.pct/100 × move.pct/100
   */
  value: number;
}

/** Complete Sankey graph ready for d3-sankey layout. */
export interface PipelineGraph {
  nodes: PipelineNode[];
  links: PipelineLink[];
}

// =============================================================================
// Column colors
// =============================================================================

const COLUMN_COLORS: Record<"ability" | "nature" | "move", string> = {
  ability: "oklch(0.66 0.12 180)",
  nature: "oklch(0.66 0.12 200)",
  move: "oklch(0.66 0.12 220)",
};

// =============================================================================
// buildPipelineGraph
// =============================================================================

/**
 * Transform an array of `PipelineSpeciesData` into a `PipelineGraph` ready for
 * d3-sankey layout.
 *
 * Link widths use proportional allocation (independence assumption): flows are
 * distributed by multiplying marginal percentages. For Phase 2 (true joint
 * distributions), this function can be replaced without changing consumers.
 *
 * Returns `{ nodes: [], links: [] }` when `species` is empty.
 */
export function buildPipelineGraph(species: PipelineSpeciesData[]): PipelineGraph {
  if (species.length === 0) return { nodes: [], links: [] };

  // ── Accumulate nodes (deduplicated by id) ──────────────────────────────────
  const nodeMap = new Map<string, PipelineNode>();

  const ensureNode = (
    id: string,
    label: string,
    column: PipelineNode["column"],
    color: string
  ): void => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label, column, color });
    }
  };

  // ── Accumulate links (aggregated by source+target key) ─────────────────────
  const linkMap = new Map<string, PipelineLink>();

  const addLink = (source: string, target: string, value: number): void => {
    const key = `${source}→${target}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.value += value;
    } else {
      linkMap.set(key, { source, target, value });
    }
  };

  // ── Process each species ───────────────────────────────────────────────────
  // Note: a species with an empty `abilities` array produces a species node with
  // no outgoing links. d3-sankey can place such a floating node oddly, but real
  // Phase-1 data always has histograms, so this is acceptable; revisit if empty
  // histograms appear in practice.
  for (const s of species) {
    const speciesId = `species:${s.species}`;
    ensureNode(speciesId, s.species, "species", assignColor(s.species));

    for (const ability of s.abilities) {
      const abilityId = `ability:${ability.value}`;
      ensureNode(abilityId, ability.value, "ability", COLUMN_COLORS.ability);

      // species → ability
      const saValue = (s.usagePct * ability.pct) / 100;
      addLink(speciesId, abilityId, saValue);

      for (const nature of s.natures) {
        const natureId = `nature:${nature.value}`;
        ensureNode(natureId, nature.value, "nature", COLUMN_COLORS.nature);

        // ability → nature (proportional allocation)
        const anValue = (s.usagePct * ability.pct * nature.pct) / 10000;
        addLink(abilityId, natureId, anValue);

        for (const move of s.moves) {
          const moveId = `move:${move.value}`;
          ensureNode(moveId, move.value, "move", COLUMN_COLORS.move);

          // nature → move (proportional allocation)
          const nmValue = (s.usagePct * nature.pct * move.pct) / 10000;
          addLink(natureId, moveId, nmValue);
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values()),
  };
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="usage-pipeline" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/data/usage-pipeline.ts \
        apps/web/src/components/data/__tests__/usage-pipeline.test.ts
git commit -m "feat(data): add buildPipelineGraph — transforms histograms to Sankey graph"
```

---

## Task 7: Create `usage-pipeline-chart.tsx` — Sankey SVG component

**Files:**
- Create: `apps/web/src/components/data/usage-pipeline-chart.tsx`

This component renders the Sankey pipeline using d3-sankey for layout and React SVG for rendering. No unit tests — visual output. Verify manually in Task 13.

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/data/usage-pipeline-chart.tsx`:

```typescript
"use client";

import { useState } from "react";
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";

import { type PipelineDataResult } from "@trainers/supabase";

import { buildPipelineGraph, type PipelineNode } from "./usage-pipeline";

// =============================================================================
// Types
// =============================================================================

interface UsagePipelineChartProps {
  /** Pipeline data from server. Null when no period data exists. */
  pipelineResult: PipelineDataResult | null;
  /** Species names to filter to. Empty = show all above threshold. */
  selectedSpecies: string[];
  /** Min usage % to include (applied to species nodes). */
  threshold: number;
  /** Called when user clicks a species node to select/deselect it. */
  onSpeciesClick: (species: string) => void;
}

// d3-sankey extended node shape (after layout, nodes gain positional props)
interface LayoutNode extends PipelineNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  index?: number;
}

interface LayoutLink {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  width: number;
  y0: number;
  y1: number;
  // Carry original IDs for highlight logic
  sourceId: string;
  targetId: string;
}

// =============================================================================
// Constants
// =============================================================================

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 420;
const NODE_WIDTH = 18;
const NODE_PADDING = 12;

const COLUMN_LABELS: Record<string, string> = {
  species: "Species",
  ability: "Ability",
  nature: "Nature",
  move: "Move",
};

// =============================================================================
// UsagePipelineChart
// =============================================================================

export function UsagePipelineChart({
  pipelineResult,
  selectedSpecies,
  threshold,
  onSpeciesClick,
}: UsagePipelineChartProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  if (!pipelineResult || pipelineResult.data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No pipeline data for this period.
      </div>
    );
  }

  // Filter species by selection and threshold
  const visibleSpecies =
    selectedSpecies.length > 0
      ? pipelineResult.data.filter((s) =>
          selectedSpecies.includes(s.species)
        )
      : pipelineResult.data.filter((s) => s.usagePct >= threshold);

  if (visibleSpecies.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No species above {threshold}% threshold.
      </div>
    );
  }

  const graph = buildPipelineGraph(visibleSpecies);

  if (graph.nodes.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No pipeline data available.
      </div>
    );
  }

  // ── d3-sankey layout ─────────────────────────────────────────────────────
  // Cast to the shape d3-sankey expects (it will mutate nodes/links with layout info)
  type D3Node = PipelineNode & { index?: number };
  type D3Link = { source: string | D3Node; target: string | D3Node; value: number };

  const layoutInput: SankeyGraph<D3Node, D3Link> = {
    nodes: graph.nodes.map((n) => ({ ...n })),
    links: graph.links.map((l) => ({ ...l })),
  };

  const sankeyLayout = sankey<D3Node, D3Link>()
    .nodeId((d) => d.id)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(NODE_PADDING)
    .nodeAlign((node) => {
      // Align by column: species=0, ability=1, nature=2, move=3
      const order: Record<string, number> = { species: 0, ability: 1, nature: 2, move: 3 };
      return order[(node as D3Node).column] ?? 0;
    })
    .extent([[0, 30], [VIEWBOX_WIDTH, VIEWBOX_HEIGHT - 10]]);

  const { nodes: layoutNodes, links: layoutLinks } = sankeyLayout(layoutInput);

  // Typed path generator — d3-sankey's factory takes no arguments; the returned
  // function accepts each laid-out link and returns its SVG path string.
  const linkPath = sankeyLinkHorizontal<D3Node, D3Link>();

  // ── Highlight logic ───────────────────────────────────────────────────────
  // When a node is hovered, highlight all links connected to it (directly or transitively).
  // Phase 1: highlight direct links only. Dimmed = opacity 0.15.
  const connectedNodeIds = hoveredNodeId
    ? new Set<string>([hoveredNodeId, ...
        (layoutLinks as unknown as LayoutLink[]).flatMap((l) => {
          if (l.sourceId === hoveredNodeId || l.targetId === hoveredNodeId) {
            return [l.sourceId, l.targetId];
          }
          return [];
        })
      ])
    : null;

  const nodeOpacity = (nodeId: string) => {
    if (!connectedNodeIds) return 1;
    return connectedNodeIds.has(nodeId) ? 1 : 0.15;
  };

  const linkOpacity = (link: LayoutLink) => {
    if (!connectedNodeIds) return 0.4;
    return connectedNodeIds.has(link.sourceId) && connectedNodeIds.has(link.targetId) ? 0.7 : 0.08;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const typedNodes = layoutNodes as unknown as LayoutNode[];

  // Extract column header x-positions from first node in each column
  const columnHeaderX: Record<string, number> = {};
  for (const node of typedNodes) {
    if (!(node.column in columnHeaderX)) {
      columnHeaderX[node.column] = (node.x0 + node.x1) / 2;
    }
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full"
        style={{ height: "clamp(260px, 40vh, 460px)" }}
        aria-label="Meta Pipeline Sankey diagram"
      >
        {/* Column headers */}
        {Object.entries(columnHeaderX).map(([col, cx]) => (
          <text
            key={col}
            x={cx}
            y={18}
            textAnchor="middle"
            className="fill-muted-foreground text-xs font-semibold uppercase tracking-widest"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}
          >
            {COLUMN_LABELS[col] ?? col}
          </text>
        ))}

        {/* Links — map the laid-out links (correctly typed for linkPath) */}
        {layoutLinks.map((link, i) => {
          // After layout, source/target are node objects; reconstruct ids for
          // the highlight logic.
          const sourceNode = link.source as unknown as LayoutNode;
          const targetNode = link.target as unknown as LayoutNode;
          const enrichedLink: LayoutLink = {
            ...(link as unknown as LayoutLink),
            sourceId: sourceNode.id,
            targetId: targetNode.id,
          };
          return (
            <path
              key={i}
              d={linkPath(link) ?? ""}
              fill="none"
              stroke={sourceNode.color}
              strokeWidth={Math.max(1, link.width ?? 0)}
              strokeOpacity={linkOpacity(enrichedLink)}
              style={{ transition: "stroke-opacity 0.15s" }}
            />
          );
        })}

        {/* Nodes */}
        {typedNodes.map((node) => {
          const isSpecies = node.column === "species";
          const isSelected =
            isSpecies && selectedSpecies.includes(node.label);
          return (
            <g
              key={node.id}
              opacity={nodeOpacity(node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={() => isSpecies && onSpeciesClick(node.label)}
              style={{
                cursor: isSpecies ? "pointer" : "default",
                transition: "opacity 0.15s",
              }}
            >
              <rect
                x={node.x0}
                y={node.y0}
                width={node.x1 - node.x0}
                height={Math.max(1, node.y1 - node.y0)}
                fill={node.color}
                rx={3}
                stroke={isSelected ? "white" : "transparent"}
                strokeWidth={isSelected ? 2 : 0}
              />
              {/* Label — show if tall enough */}
              {node.y1 - node.y0 > 14 && (
                <text
                  x={node.x1 + 6}
                  y={(node.y0 + node.y1) / 2}
                  dominantBaseline="middle"
                  style={{ fontSize: 10, fill: "var(--foreground)" }}
                >
                  {node.label.length > 12
                    ? node.label.slice(0, 11) + "…"
                    : node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Period label */}
      <p className="text-muted-foreground mt-1 text-right text-xs">
        {formatPeriodRange(pipelineResult.periodStart, pipelineResult.periodEnd)}
      </p>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatPeriodRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck 2>&1 | grep "usage-pipeline-chart" | head -10
```

Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/data/usage-pipeline-chart.tsx
git commit -m "feat(data): add UsagePipelineChart Sankey SVG component"
```

---

## Task 8: Create `usage-line-chart.tsx` — line chart with brush + event pins

**Files:**
- Create: `apps/web/src/components/data/usage-line-chart.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/data/usage-line-chart.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";

import { type FormatUsageTimeseriesPoint, type FormatEvent } from "@trainers/supabase";

import { buildUsageSeries, filterByThreshold } from "./usage-series";

// =============================================================================
// Types
// =============================================================================

interface UsageLineChartProps {
  /** All-species timeseries data, oldest → newest. */
  points: FormatUsageTimeseriesPoint[];
  /** Currently selected species. Empty = none selected (show all dimmed). */
  selectedSpecies: string[];
  /** Case-insensitive search substring; non-matching lines are dimmed. Empty = no filter. */
  highlight: string;
  /** Min usage % to show a line. */
  threshold: number;
  /** Events for annotation pins on X axis. */
  events: FormatEvent[];
  /** Called when user clicks a line. */
  onSpeciesClick: (species: string) => void;
  /** Called when brush selection changes. Arguments are ISO date strings. */
  onRangeChange: (start: string | null, end: string | null) => void;
  /** Called when "Select All" is clicked. */
  onSelectAll: () => void;
  /** Called when "Clear" is clicked. */
  onClearSelection: () => void;
}

// =============================================================================
// Custom X-axis tick with event pins
// =============================================================================

function XAxisTickWithPin({
  x,
  y,
  payload,
  events,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  events: FormatEvent[];
}) {
  const date = payload?.value;
  if (!date) return null;

  const pin = events.find((e) => e.eventDate === date);
  const cx = x ?? 0;
  const cy = y ?? 0;

  return (
    <g transform={`translate(${cx},${cy})`}>
      {pin && (
        <title>{`${pin.eventKey} · ${pin.eventDate}`}</title>
      )}
      {pin && (
        <text y={-8} textAnchor="middle" style={{ fontSize: 11 }}>
          {pin.source === "rk9" ? "🏆" : "🌐"}
        </text>
      )}
      <text y={14} textAnchor="middle" style={{ fontSize: 10, fill: "var(--muted-foreground)" }}>
        {formatAxisLabel(date)}
      </text>
    </g>
  );
}

// =============================================================================
// UsageLineChart
// =============================================================================

export function UsageLineChart({
  points,
  selectedSpecies,
  highlight,
  threshold,
  events,
  onSpeciesClick,
  onRangeChange,
  onSelectAll,
  onClearSelection,
}: UsageLineChartProps) {
  // Map period points to Recharts data shape: { periodStart, [species]: pct, ... }
  const chartData = points.map((p) => ({ periodStart: p.periodStart, ...p.usage }));

  const allSeries = buildUsageSeries(points);
  const visibleSeries = filterByThreshold(allSeries, threshold);

  const handleBrushChange = (range: { startIndex?: number; endIndex?: number }) => {
    const start = range.startIndex !== undefined ? points[range.startIndex]?.periodStart ?? null : null;
    const end = range.endIndex !== undefined ? points[range.endIndex]?.periodEnd ?? null : null;
    onRangeChange(start, end);
  };

  const handleLineClick = (data: unknown) => {
    // Recharts line onClick gives us the dataKey (species name)
    if (data && typeof data === "object" && "dataKey" in data) {
      onSpeciesClick(data.dataKey as string);
    }
  };

  // Find events that fall within visible time range
  const visibleEvents = events.filter((e) =>
    points.some((p) => p.periodStart <= e.eventDate && e.eventDate <= p.periodEnd)
  );

  // Map events to the closest period start for X-axis positioning
  const eventsByPeriodStart = new Set(
    visibleEvents.map((e) => {
      const closest = points.reduce((best, p) => {
        const d = Math.abs(new Date(p.periodStart).getTime() - new Date(e.eventDate).getTime());
        const bd = Math.abs(new Date(best.periodStart).getTime() - new Date(e.eventDate).getTime());
        return d < bd ? p : best;
      });
      return closest.periodStart;
    })
  );

  const eventsForTick = (periodStart: string) =>
    visibleEvents.filter((e) => {
      const closest = points.reduce((best, p) => {
        const d = Math.abs(new Date(p.periodStart).getTime() - new Date(e.eventDate).getTime());
        const bd = Math.abs(new Date(best.periodStart).getTime() - new Date(e.eventDate).getTime());
        return d < bd ? p : best;
      });
      return closest.periodStart === periodStart;
    });

  if (points.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        No usage data for this format.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Usage Over Time</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {visibleSeries.length} Pokémon
          </span>
          <button
            onClick={onSelectAll}
            className="text-primary hover:underline text-xs"
          >
            Select All
          </button>
          <button
            onClick={onClearSelection}
            className="text-muted-foreground hover:underline text-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl border p-2">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 20, left: 0 }}>
            <XAxis
              dataKey="periodStart"
              tick={(props) => (
                <XAxisTickWithPin
                  {...props}
                  events={eventsForTick(props.payload?.value)}
                />
              )}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm">
                    <p className="text-muted-foreground mb-1">{formatAxisLabel(label)}</p>
                    {payload.slice(0, 8).map((entry) => (
                      <p key={entry.dataKey as string} style={{ color: entry.color as string }}>
                        {entry.dataKey}: {Number(entry.value).toFixed(1)}%
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {visibleSeries.map((s) => {
              // A line is "active" (highlighted) when it passes BOTH the
              // selection filter and the search filter. Inactive lines dim.
              const matchesHighlight =
                !highlight ||
                s.species.toLowerCase().includes(highlight.toLowerCase());
              const isActive =
                (selectedSpecies.length === 0 ||
                  selectedSpecies.includes(s.species)) &&
                matchesHighlight;
              return (
                <Line
                  key={s.species}
                  type="monotone"
                  dataKey={s.species}
                  stroke={isActive ? s.color : "var(--muted)"}
                  strokeWidth={isActive ? 2.5 : 1}
                  strokeOpacity={isActive ? 1 : 0.3}
                  dot={false}
                  activeDot={isActive ? { r: 3 } : false}
                  onClick={handleLineClick}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
            <Brush
              dataKey="periodStart"
              height={20}
              stroke="var(--primary)"
              fill="var(--muted)"
              travellerWidth={6}
              onChange={handleBrushChange}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend strip */}
      {selectedSpecies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedSpecies.map((sp) => {
            const s = allSeries.find((x) => x.species === sp);
            return (
              <span
                key={sp}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                style={{ background: s?.color ?? "var(--muted)", color: "white" }}
              >
                {sp}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatAxisLabel(periodStart: string): string {
  const d = new Date(periodStart);
  if (Number.isNaN(d.getTime())) return periodStart;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck 2>&1 | grep "usage-line-chart" | head -10
```

Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/data/usage-line-chart.tsx
git commit -m "feat(data): add UsageLineChart with brush selection and event pins"
```

---

## Task 9: Update `usage-controls.tsx` — remove mode tabs, simplify controls

**Files:**
- Modify: `apps/web/src/components/data/usage-controls.tsx`

The mode (stream/stacked/lines) tabs are removed. Source changes from a single Select to a text label showing the active source (source selection remains via Select). `UsageFilters` type no longer needs `mode`.

- [ ] **Step 1: Update the controls component**

Replace `apps/web/src/components/data/usage-controls.tsx` with:

```typescript
"use client";

import { getActiveFormats } from "@trainers/pokemon";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =============================================================================
// Types
// =============================================================================

export type PeriodType = "day" | "week" | "month";
export type UsageSource = "all" | "rk9" | "limitless" | "trainers.gg";

export interface UsageFilters {
  format: string;
  source: UsageSource;
  periodType: PeriodType;
  threshold: number;
}

interface UsageControlsProps {
  filters: UsageFilters;
  highlight: string;
  totalCount: number;
  visibleCount: number;
  onFiltersChange: (filters: UsageFilters) => void;
  onHighlightChange: (highlight: string) => void;
}

// =============================================================================
// Label maps
// =============================================================================

const PERIOD_LABELS: Record<PeriodType, string> = {
  day: "Event",
  week: "Week",
  month: "Month",
};

const SOURCE_LABELS: Record<UsageSource, string> = {
  all: "All Sources",
  rk9: "RK9",
  limitless: "Limitless",
  "trainers.gg": "trainers.gg",
};

// =============================================================================
// UsageControls
// =============================================================================

export function UsageControls({
  filters,
  highlight,
  totalCount,
  visibleCount,
  onFiltersChange,
  onHighlightChange,
}: UsageControlsProps) {
  const formats = getActiveFormats();

  return (
    <div className="bg-muted/40 flex flex-col flex-wrap gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Format */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Format
        </span>
        <Select
          value={filters.format}
          onValueChange={(v) =>
            v && onFiltersChange({ ...filters, format: v })
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formats.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Source */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Source
        </span>
        <Select
          value={filters.source}
          onValueChange={(v) =>
            v && onFiltersChange({ ...filters, source: v as UsageSource })
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["all", "rk9", "limitless", "trainers.gg"] as UsageSource[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Granularity */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Granularity
        </span>
        <Select
          value={filters.periodType}
          onValueChange={(v) =>
            v && onFiltersChange({ ...filters, periodType: v as PeriodType })
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["day", "week", "month"] as PeriodType[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min usage slider */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Min usage
        </span>
        <div className="flex items-center gap-2">
          <Slider
            min={1}
            max={20}
            step={0.5}
            value={filters.threshold}
            onValueChange={(vals) => {
              const next = Array.isArray(vals) ? vals[0] : vals;
              if (next !== undefined) {
                onFiltersChange({ ...filters, threshold: next });
              }
            }}
            aria-label="Minimum usage threshold"
            className="w-32 sm:w-36"
          />
          <span className="text-primary min-w-8 text-sm font-bold">
            {filters.threshold}%
          </span>
        </div>
      </div>

      {/* Species search */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Search
        </span>
        <Input
          placeholder="Search Pokémon..."
          value={highlight}
          onChange={(e) => onHighlightChange(e.target.value)}
          className="h-8 w-full sm:w-44"
          aria-label="Search for a Pokemon by name"
        />
      </div>

      {/* Readout */}
      <div className="text-muted-foreground ml-auto text-xs font-semibold sm:text-right">
        <span className="text-foreground font-bold">{visibleCount}</span> of{" "}
        {totalCount} Pokémon &ge;{filters.threshold}%
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the existing controls test**

The existing `usage-controls.test.tsx` tests the OLD API (`ChartMode`, `mode`, `onModeChange`, mode tabs, "Chart type"/"Highlight" labels). It will fail to compile against the new component. **Replace the entire file** `apps/web/src/components/data/__tests__/usage-controls.test.tsx`:

```typescript
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsageControls, type UsageFilters } from "../usage-controls";

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
}));

function makeFilters(overrides: Partial<UsageFilters> = {}): UsageFilters {
  return {
    format: "gen9vgc2025regg",
    source: "all",
    periodType: "week",
    threshold: 2,
    ...overrides,
  };
}

function renderControls(
  overrides: {
    filters?: Partial<UsageFilters>;
    highlight?: string;
    totalCount?: number;
    visibleCount?: number;
    onFiltersChange?: jest.Mock;
    onHighlightChange?: jest.Mock;
  } = {}
) {
  const props = {
    filters: makeFilters(overrides.filters),
    highlight: overrides.highlight ?? "",
    totalCount: overrides.totalCount ?? 100,
    visibleCount: overrides.visibleCount ?? 20,
    onFiltersChange: overrides.onFiltersChange ?? jest.fn(),
    onHighlightChange: overrides.onHighlightChange ?? jest.fn(),
  };
  return render(<UsageControls {...props} />);
}

describe("UsageControls", () => {
  it("renders section labels for all control groups", () => {
    renderControls();
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Granularity")).toBeInTheDocument();
    expect(screen.getByText("Min usage")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  it("renders the search input with the correct placeholder", () => {
    renderControls();
    expect(screen.getByPlaceholderText("Search Pokémon...")).toBeInTheDocument();
  });

  it("displays the current threshold percentage", () => {
    renderControls({ filters: { threshold: 3 } });
    expect(screen.getByText("3%")).toBeInTheDocument();
  });

  it("displays the visible/total count readout", () => {
    renderControls({ totalCount: 150, visibleCount: 42 });
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/150 Pokémon/i)).toBeInTheDocument();
  });

  it("calls onHighlightChange when the search input changes", async () => {
    const onHighlightChange = jest.fn();
    renderControls({ onHighlightChange });
    const input = screen.getByPlaceholderText("Search Pokémon...");
    await userEvent.type(input, "Pikachu");
    expect(onHighlightChange).toHaveBeenCalled();
  });

  it("renders the search input aria-labelled correctly", () => {
    renderControls();
    expect(
      screen.getByRole("textbox", { name: /Search for a Pokemon by name/i })
    ).toBeInTheDocument();
  });

  it("renders the threshold slider with the correct aria-label", () => {
    renderControls();
    expect(
      screen.getByRole("slider", { name: /Minimum usage threshold/i })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the controls test and verify it passes**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="usage-controls" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/data/usage-controls.tsx \
        apps/web/src/components/data/__tests__/usage-controls.test.tsx
git commit -m "feat(data): update UsageControls — remove mode tabs for Meta Explorer redesign"
```

---

## Task 10: Update `usage-explorer.tsx` — new state model + wire both panels

**Files:**
- Modify: `apps/web/src/components/data/usage-explorer.tsx`

This is the main client shell. New state: `selectedSpecies: string[]`, `rangeStart: string | null`, `rangeEnd: string | null`. Drops `mode`. Renders Sankey on top, line chart below.

- [ ] **Step 1: Replace `usage-explorer.tsx`**

Write `apps/web/src/components/data/usage-explorer.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { type FormatUsageTimeseriesPoint, type PipelineDataResult, type FormatEvent } from "@trainers/supabase";

import { fetchFormatUsageTimeseries, fetchPipelineData, fetchFormatEvents } from "@/actions/usage";

import { buildUsageSeries } from "./usage-series";
import {
  UsageControls,
  type UsageFilters,
  type PeriodType,
  type UsageSource,
} from "./usage-controls";
import { UsagePipelineChart } from "./usage-pipeline-chart";
import { UsageLineChart } from "./usage-line-chart";
import {
  coerceFormat,
  coercePeriodType,
  coerceSource,
  coerceThreshold,
  coerceSelectedSpecies,
  coerceRangeStart,
  coerceRangeEnd,
} from "./usage-filters";

// =============================================================================
// Types
// =============================================================================

interface UsageExplorerProps {
  initialPoints: FormatUsageTimeseriesPoint[];
  initialPipelineResult: PipelineDataResult | null;
  initialEvents: FormatEvent[];
  initialFilters: UsageFilters;
}

// =============================================================================
// UsageExplorer
// =============================================================================

/**
 * Client shell for the /data Meta Explorer.
 *
 * URL state: format, source, periodType, threshold, species (comma-sep),
 * rangeStart (ISO date), rangeEnd (ISO date).
 *
 * Local state (ephemeral): highlight (search input substring).
 *
 * TanStack Query is keyed per (format, source, periodType) for the timeseries
 * and per (format, source, periodType, rangeStart, rangeEnd) for pipeline data.
 */
export function UsageExplorer({
  initialPoints,
  initialPipelineResult,
  initialEvents,
  initialFilters,
}: UsageExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Ephemeral search box state — dims non-matching lines in the line chart.
  // Not URL-persisted (transient UI affordance, not a shareable filter).
  const [highlight, setHighlight] = useState("");

  // ── URL-derived state ─────────────────────────────────────────────────────
  const format = coerceFormat(
    searchParams.get("format") ?? initialFilters.format
  );
  const source: UsageSource = coerceSource(
    searchParams.get("source") ?? initialFilters.source
  );
  const periodType: PeriodType = coercePeriodType(
    searchParams.get("periodType") ?? initialFilters.periodType
  );
  const threshold = coerceThreshold(
    searchParams.get("threshold") ?? String(initialFilters.threshold)
  );
  const selectedSpecies = coerceSelectedSpecies(searchParams.get("species"));
  const rangeStart = coerceRangeStart(searchParams.get("rangeStart"));
  const rangeEnd = coerceRangeEnd(searchParams.get("rangeEnd"));

  const currentFilters: UsageFilters = { format, source, periodType, threshold };

  // ── URL updater ───────────────────────────────────────────────────────────
  const updateUrl = (
    nextFilters: UsageFilters,
    nextSpecies?: string[],
    nextRangeStart?: string | null,
    nextRangeEnd?: string | null
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", nextFilters.format);
    params.set("source", nextFilters.source);
    params.set("periodType", nextFilters.periodType);
    params.set("threshold", String(nextFilters.threshold));

    const species = nextSpecies ?? selectedSpecies;
    if (species.length > 0) {
      params.set("species", species.join(","));
    } else {
      params.delete("species");
    }

    const rs = nextRangeStart !== undefined ? nextRangeStart : rangeStart;
    const re = nextRangeEnd !== undefined ? nextRangeEnd : rangeEnd;
    if (rs) params.set("rangeStart", rs);
    else params.delete("rangeStart");
    if (re) params.set("rangeEnd", re);
    else params.delete("rangeEnd");

    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleFiltersChange = (next: UsageFilters) => updateUrl(next);
  const handleSpeciesClick = (species: string) => {
    const next = selectedSpecies.includes(species)
      ? selectedSpecies.filter((s) => s !== species)
      : [...selectedSpecies, species];
    updateUrl(currentFilters, next);
  };
  const handleSelectAll = () => {
    const all = buildUsageSeries(points)
      .filter((s) => s.peak >= threshold)
      .map((s) => s.species);
    updateUrl(currentFilters, all);
  };
  const handleClearSelection = () => updateUrl(currentFilters, [], null, null);
  const handleRangeChange = (start: string | null, end: string | null) =>
    updateUrl(currentFilters, undefined, start, end);

  // ── TanStack Query — timeseries ───────────────────────────────────────────
  const { data: points = [] } = useQuery<FormatUsageTimeseriesPoint[]>({
    queryKey: ["usage-timeseries", format, source, periodType],
    queryFn: async () => {
      const result = await fetchFormatUsageTimeseries({ format, source, periodType });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: initialPoints,
    staleTime: 5 * 60 * 1000,
  });

  // ── TanStack Query — pipeline data ────────────────────────────────────────
  const { data: pipelineResult = initialPipelineResult } =
    useQuery<PipelineDataResult | null>({
      queryKey: ["pipeline-data", format, source, periodType, rangeStart, rangeEnd],
      queryFn: async () => {
        const result = await fetchPipelineData({
          format,
          source,
          periodType,
          periodStart: rangeStart ?? undefined,
          periodEnd: rangeEnd ?? undefined,
        });
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      initialData: initialPipelineResult,
      staleTime: 5 * 60 * 1000,
    });

  // ── TanStack Query — events ───────────────────────────────────────────────
  const { data: events = [] } = useQuery<FormatEvent[]>({
    queryKey: ["format-events", format],
    queryFn: async () => {
      const result = await fetchFormatEvents(format);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: initialEvents,
    staleTime: 60 * 60 * 1000, // events change rarely
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Shared controls bar */}
      <UsageControls
        filters={currentFilters}
        highlight={highlight}
        totalCount={buildUsageSeries(points).length}
        visibleCount={
          buildUsageSeries(points).filter((s) => s.peak >= threshold).length
        }
        onFiltersChange={handleFiltersChange}
        onHighlightChange={setHighlight}
      />

      {/* Panel 1: Meta Pipeline (Sankey) — hero */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Meta Pipeline</h2>
          {selectedSpecies.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {selectedSpecies.map((sp) => (
                <button
                  key={sp}
                  onClick={() => handleSpeciesClick(sp)}
                  className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs"
                >
                  {sp} ×
                </button>
              ))}
            </div>
          )}
        </div>
        <UsagePipelineChart
          pipelineResult={pipelineResult}
          selectedSpecies={selectedSpecies}
          threshold={threshold}
          onSpeciesClick={handleSpeciesClick}
        />
      </div>

      {/* Panel 2: Usage Over Time (line chart) — navigator */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <UsageLineChart
          points={points}
          selectedSpecies={selectedSpecies}
          highlight={highlight}
          threshold={threshold}
          events={events}
          onSpeciesClick={handleSpeciesClick}
          onRangeChange={handleRangeChange}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the existing explorer test**

The existing `usage-explorer.test.tsx` mocks `../usage-stream-chart` (deleted in Task 11), only stubs `fetchFormatUsageTimeseries` (the new shell also calls `fetchPipelineData` + `fetchFormatEvents`), passes the old props (missing `initialPipelineResult` / `initialEvents`), and asserts removed UI (mode tabs, "Type a Pokemon..."). **Replace the entire file** `apps/web/src/components/data/__tests__/usage-explorer.test.tsx`:

```typescript
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { UsageExplorer } from "../usage-explorer";
import { type UsageFilters } from "../usage-controls";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/actions/usage", () => ({
  fetchFormatUsageTimeseries: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  fetchPipelineData: jest.fn().mockResolvedValue({ success: true, data: null }),
  fetchFormatEvents: jest.fn().mockResolvedValue({ success: true, data: [] }),
}));

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
}));

// Stub the charts to avoid Recharts / SVG layout complexity in JSDOM.
jest.mock("../usage-pipeline-chart", () => ({
  UsagePipelineChart: () => <div data-testid="usage-pipeline-chart" />,
}));
jest.mock("../usage-line-chart", () => ({
  UsageLineChart: () => <div data-testid="usage-line-chart" />,
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

const DEFAULT_FILTERS: UsageFilters = {
  format: "gen9vgc2025regg",
  source: "all",
  periodType: "week",
  threshold: 2,
};

function renderExplorer() {
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <UsageExplorer
        initialPoints={[]}
        initialPipelineResult={null}
        initialEvents={[]}
        initialFilters={DEFAULT_FILTERS}
      />
    </Wrapper>
  );
}

describe("UsageExplorer", () => {
  it("renders without crashing", () => {
    renderExplorer();
    expect(screen.getByText("Meta Pipeline")).toBeInTheDocument();
  });

  it("renders both chart panels", () => {
    renderExplorer();
    expect(screen.getByTestId("usage-pipeline-chart")).toBeInTheDocument();
    expect(screen.getByTestId("usage-line-chart")).toBeInTheDocument();
  });

  it("renders the controls with the search input", () => {
    renderExplorer();
    expect(screen.getByPlaceholderText("Search Pokémon...")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the explorer test and verify it passes**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="usage-explorer" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/data/usage-explorer.tsx \
        apps/web/src/components/data/__tests__/usage-explorer.test.tsx
git commit -m "feat(data): rebuild UsageExplorer with Sankey + line chart two-panel layout"
```

---

## Task 11: Delete `usage-stream-chart.tsx`

**Files:**
- Delete: `apps/web/src/components/data/usage-stream-chart.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm apps/web/src/components/data/usage-stream-chart.tsx
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "usage-stream-chart" apps/web/src/ 2>/dev/null
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add -u apps/web/src/components/data/usage-stream-chart.tsx
git commit -m "chore(data): delete usage-stream-chart — replaced by pipeline + line chart"
```

---

## Task 12: Update `data/page.tsx` — prefetch pipeline data and events

**Files:**
- Modify: `apps/web/src/app/(app)/data/page.tsx`

- [ ] **Step 1: Update the page**

Write `apps/web/src/app/(app)/data/page.tsx`:

```typescript
import { BarChart2 } from "lucide-react";

import { getFormatById } from "@trainers/pokemon";

import {
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
} from "@/actions/usage";
import { PageContainer } from "@/components/layout/page-container";
import { UsageExplorer } from "@/components/data/usage-explorer";
import { type UsageFilters } from "@/components/data/usage-controls";
import {
  coerceFormat,
  coercePeriodType,
  coerceSource,
  coerceThreshold,
} from "@/components/data/usage-filters";

// =============================================================================
// Cache
// =============================================================================

export const revalidate = false;

// =============================================================================
// Page
// =============================================================================

interface DataPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DataPage({ searchParams }: DataPageProps) {
  const params = await searchParams;

  const raw = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const format = coerceFormat(raw("format"));
  const source = coerceSource(raw("source"));
  const periodType = coercePeriodType(raw("periodType"));
  const threshold = coerceThreshold(raw("threshold"));

  const initialFilters: UsageFilters = { format, source, periodType, threshold };

  // Fetch all three data sources in parallel — all ISR-cached for 1 hour.
  const [timeseriesResult, pipelineResult, eventsResult] = await Promise.all([
    fetchFormatUsageTimeseries({ format, source, periodType }),
    fetchPipelineData({ format, source, periodType }),
    fetchFormatEvents(format),
  ]);

  const initialPoints = timeseriesResult.success ? timeseriesResult.data : [];
  const initialPipelineResult = pipelineResult.success ? pipelineResult.data : null;
  const initialEvents = eventsResult.success ? eventsResult.data : [];

  const activeFormat = getFormatById(format);

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <BarChart2 className="h-8 w-8" />
          Data
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Explore the{" "}
          <strong className="text-foreground">
            {activeFormat?.showdownName ?? "format"}
          </strong>{" "}
          metagame — species usage trends over time and how each Pokémon is
          built (abilities, natures, moves). Click a line to focus the pipeline
          view; drag a time range to update the anatomy snapshot.
        </p>
      </div>

      <UsageExplorer
        initialPoints={initialPoints}
        initialPipelineResult={initialPipelineResult}
        initialEvents={initialEvents}
        initialFilters={initialFilters}
      />
    </PageContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(app\)/data/page.tsx
git commit -m "feat(data): update DataPage to prefetch pipeline + events alongside timeseries"
```

---

## Task 13: Update `data/loading.tsx` — two-panel skeleton

**Files:**
- Modify: `apps/web/src/app/(app)/data/loading.tsx`

- [ ] **Step 1: Update the loading skeleton**

Write `apps/web/src/app/(app)/data/loading.tsx`:

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the two-panel /data Meta Explorer.
 *
 * Heights match the live layout to prevent CLS:
 *   - Controls bar: ~52px
 *   - Pipeline (Sankey): ~clamp(260px, 40vh, 460px) — use h-64 as fallback
 *   - Line chart panel: ~220px
 */
export default function DataLoading() {
  return (
    <PageContainer>
      {/* Header skeleton */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Controls bar */}
      <Skeleton className="mb-4 h-14 w-full rounded-xl" />

      {/* Meta Pipeline panel */}
      <Skeleton className="mb-4 h-72 w-full rounded-2xl" />

      {/* Usage Over Time panel */}
      <Skeleton className="h-56 w-full rounded-2xl" />
    </PageContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(app\)/data/loading.tsx
git commit -m "feat(data): update loading skeleton for two-panel Meta Explorer layout"
```

---

## Task 14: Push and monitor CI

- [ ] **Step 1: Push the branch**

```bash
git push
```

- [ ] **Step 2: Open CI checks**

```bash
gh pr checks feat/pokemon-usage-stats
```

- [ ] **Step 3: Monitor each check**

Wait for CI to complete, then enumerate each check:

| Check | Status |
|-------|--------|
| Lint | ... |
| Typecheck | ... |
| Tests | ... |
| E2E | ... |
| Codecov/patch | ... |

Fix any failures before declaring done.

---

## Verification Checklist

After CI is green, verify manually with `pnpm dev:web+backend`:

- [ ] Navigate to `/data` — both panels render with no JS errors
- [ ] Sankey shows all species above threshold by default; column headers visible
- [ ] Adjust threshold slider — Sankey and line chart both update
- [ ] Click a species line — chip appears above Sankey; Sankey focuses to that species
- [ ] Click chip × — deselects species; Sankey returns to full meta
- [ ] Drag time range in line chart — Sankey updates pipeline anatomy for that window
- [ ] Hover a Sankey node — connected links highlight, others dim
- [ ] Hover an event pin (🏆 / 🌐) — tooltip shows event key + date
- [ ] Click "Select All" — all visible species selected; "Clear" resets
- [ ] Change format — both panels reload for the new format
- [ ] Hard refresh — URL state restores correctly (species, range, format)
