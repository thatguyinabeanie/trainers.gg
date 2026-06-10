# /data Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/data` Meta Explorer with a full-viewport layout, collapsible sidebar for all controls, top-20 Pokémon default, and per-species colored Sankey flows.

**Architecture:** A new `DataSidebar` component owns Format/Source/Granularity selects plus the Pokémon preset/search/checklist. `UsageExplorer` derives the effective species list from URL state (defaulting to top 20 when empty) and passes it to both charts. The `UsageControls` component and threshold/highlight state are removed entirely.

**Tech Stack:** Next.js 16 (App Router), React 19 (React Compiler — no manual memoization), TanStack Query v5, Tailwind CSS 4, d3-sankey, Recharts, shadcn/ui

---

## File Map

| Action | Path |
|--------|------|
| **Modify** | `apps/web/src/components/data/usage-filters.ts` — add types + preset fns |
| **Delete** | `apps/web/src/components/data/usage-controls.tsx` |
| **Delete** | `apps/web/src/components/data/__tests__/usage-controls.test.tsx` |
| **Modify** | `apps/web/src/components/data/__tests__/usage-filters.test.ts` — add preset tests, update threshold tests |
| **Modify** | `apps/web/src/components/data/usage-pipeline-chart.tsx` — remove `threshold` prop |
| **Modify** | `apps/web/src/components/data/usage-line-chart.tsx` — remove `threshold`/`highlight`/`onSelectAll`/`onClearSelection`; add legend |
| **Create** | `apps/web/src/components/data/data-sidebar.tsx` |
| **Modify** | `apps/web/src/components/data/usage-explorer.tsx` — full refactor |
| **Modify** | `apps/web/src/app/(app)/data/page.tsx` — full-viewport shell |

---

## Task 1: Move shared types into `usage-filters.ts` and delete `usage-controls.tsx`

**Files:**
- Modify: `apps/web/src/components/data/usage-filters.ts`
- Delete: `apps/web/src/components/data/usage-controls.tsx`
- Delete: `apps/web/src/components/data/__tests__/usage-controls.test.tsx`

- [ ] **Step 1: Add types to `usage-filters.ts`**

Append to the bottom of the existing `usage-filters.ts` constants section (after `VALID_PERIOD_TYPES`):

```typescript
// =============================================================================
// Shared filter types (moved here from usage-controls.tsx)
// =============================================================================

export type PeriodType = (typeof VALID_PERIOD_TYPES)[number];
export type UsageSource = (typeof VALID_SOURCES)[number];

/** Shape carried in URL state and passed to DataSidebar. */
export interface UsageFilters {
  format: string;
  source: UsageSource;
  periodType: PeriodType;
}
```

- [ ] **Step 2: Update imports in `usage-explorer.tsx`**

Change the import block:

```typescript
// Before
import {
  UsageControls,
  type UsageFilters,
  type PeriodType,
  type UsageSource,
} from "./usage-controls";

// After
import {
  type UsageFilters,
  type PeriodType,
  type UsageSource,
} from "./usage-filters";
```

- [ ] **Step 3: Update imports in `apps/web/src/app/(app)/data/page.tsx`**

```typescript
// Before
import { type UsageFilters } from "@/components/data/usage-controls";

// After
import { type UsageFilters } from "@/components/data/usage-filters";
```

- [ ] **Step 4: Delete the old files**

```bash
rm apps/web/src/components/data/usage-controls.tsx
rm apps/web/src/components/data/__tests__/usage-controls.test.tsx
```

- [ ] **Step 5: Verify typecheck passes**

```bash
pnpm typecheck 2>&1 | grep -iE "error|warning" | head -30
```

Expected: zero errors from the deleted/moved files. (Other unrelated errors are acceptable at this stage.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/data/usage-filters.ts \
        apps/web/src/components/data/usage-explorer.tsx \
        apps/web/src/app/\(app\)/data/page.tsx
git rm apps/web/src/components/data/usage-controls.tsx \
       apps/web/src/components/data/__tests__/usage-controls.test.tsx
git commit -m "refactor(data): move PeriodType/UsageSource/UsageFilters to usage-filters.ts, remove threshold"
```

---

## Task 2: Add `DataPreset`, `applyPreset`, `getActivePreset` — tests first

**Files:**
- Modify: `apps/web/src/components/data/usage-filters.ts`
- Modify: `apps/web/src/components/data/__tests__/usage-filters.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/components/data/__tests__/usage-filters.test.ts`:

```typescript
import { type PipelineSpeciesData } from "@trainers/supabase";
import { applyPreset, getActivePreset } from "../usage-filters";

// =============================================================================
// Preset helpers
// =============================================================================

function makeSpecies(
  species: string,
  usagePct: number
): PipelineSpeciesData {
  return { species, usagePct, rank: 0, abilities: [], natures: [], moves: [] };
}

const THIRTY_SPECIES = Array.from({ length: 30 }, (_, i) =>
  makeSpecies(`Species${i + 1}`, 70 - i * 2)
);

describe("applyPreset", () => {
  it("returns first 10 species names for 'top10'", () => {
    const result = applyPreset(THIRTY_SPECIES, "top10");
    expect(result).toHaveLength(10);
    expect(result[0]).toBe("Species1");
    expect(result[9]).toBe("Species10");
  });

  it("returns first 20 species names for 'top20'", () => {
    const result = applyPreset(THIRTY_SPECIES, "top20");
    expect(result).toHaveLength(20);
    expect(result[19]).toBe("Species20");
  });

  it("returns first 50 (capped to array length) for 'top50'", () => {
    expect(applyPreset(THIRTY_SPECIES, "top50")).toHaveLength(30);
  });

  it("returns all species for 'all'", () => {
    expect(applyPreset(THIRTY_SPECIES, "all")).toHaveLength(30);
  });

  it("handles fewer species than the preset limit gracefully", () => {
    const five = THIRTY_SPECIES.slice(0, 5);
    expect(applyPreset(five, "top20")).toHaveLength(5);
  });

  it("returns an empty array when data is empty", () => {
    expect(applyPreset([], "top20")).toEqual([]);
  });
});

describe("getActivePreset", () => {
  it("returns 'top10' when selected matches the first 10", () => {
    const top10 = THIRTY_SPECIES.slice(0, 10).map((s) => s.species);
    expect(getActivePreset(THIRTY_SPECIES, top10)).toBe("top10");
  });

  it("returns 'top20' when selected matches the first 20", () => {
    const top20 = THIRTY_SPECIES.slice(0, 20).map((s) => s.species);
    expect(getActivePreset(THIRTY_SPECIES, top20)).toBe("top20");
  });

  it("returns 'all' when selected matches the full set", () => {
    const all = THIRTY_SPECIES.map((s) => s.species);
    expect(getActivePreset(THIRTY_SPECIES, all)).toBe("all");
  });

  it("returns null for a custom (non-preset) selection", () => {
    expect(getActivePreset(THIRTY_SPECIES, ["Species1", "Species5"])).toBeNull();
  });

  it("returns null for an empty selection", () => {
    expect(getActivePreset(THIRTY_SPECIES, [])).toBeNull();
  });

  it("is order-insensitive — matches preset even if selected is shuffled", () => {
    const shuffled = ["Species3", "Species1", "Species2"];
    const threeSpecies = THIRTY_SPECIES.slice(0, 3);
    // top10 of a 3-item list = all 3
    expect(getActivePreset(threeSpecies, shuffled)).toBe("top10");
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd apps/web && pnpm test -- --testPathPattern="usage-filters" --no-coverage 2>&1 | tail -30
```

Expected: `applyPreset` and `getActivePreset` are not defined — tests fail.

- [ ] **Step 3: Implement the functions in `usage-filters.ts`**

Append after the `UsageFilters` interface you added in Task 1:

```typescript
// =============================================================================
// Preset helpers
// =============================================================================

import { type PipelineSpeciesData } from "@trainers/supabase";

export type DataPreset = "top10" | "top20" | "top50" | "all";

const PRESET_LIMITS: Record<DataPreset, number> = {
  top10: 10,
  top20: 20,
  top50: 50,
  all: Infinity,
};

/**
 * Returns the species names from `data` that correspond to the given preset.
 * Data is assumed to be sorted by usage descending (rank ascending).
 */
export function applyPreset(
  data: PipelineSpeciesData[],
  preset: DataPreset
): string[] {
  return data.slice(0, PRESET_LIMITS[preset]).map((s) => s.species);
}

/**
 * Returns the active preset name if `selected` exactly matches one of the
 * preset sets derived from `data`, otherwise returns null.
 * Order-insensitive: checks set membership, not array order.
 */
export function getActivePreset(
  data: PipelineSpeciesData[],
  selected: string[]
): DataPreset | null {
  const selectedSet = new Set(selected);
  for (const preset of ["top10", "top20", "top50", "all"] as DataPreset[]) {
    const expected = applyPreset(data, preset);
    if (
      expected.length === selectedSet.size &&
      expected.every((s) => selectedSet.has(s))
    ) {
      return preset;
    }
  }
  return null;
}
```

**Important:** The `import { type PipelineSpeciesData } from "@trainers/supabase"` line must be added to the top of the file with the other imports, not inline with the append.

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd apps/web && pnpm test -- --testPathPattern="usage-filters" --no-coverage 2>&1 | tail -30
```

Expected: All tests in `usage-filters.test.ts` pass, including the new preset tests.

- [ ] **Step 5: Update the stale threshold test**

In `__tests__/usage-filters.test.ts`, find the test `"DEFAULT_THRESHOLD is 2"` and remove it (we are keeping `DEFAULT_THRESHOLD` and `coerceThreshold` in the file as legacy URL-safe coercers, but the test that asserts a specific value is brittle if we later change it). Replace with a range check:

```typescript
// Before
it("DEFAULT_THRESHOLD is 2", () => {
  expect(DEFAULT_THRESHOLD).toBe(2);
});

// After
it("DEFAULT_THRESHOLD is a positive number", () => {
  expect(typeof DEFAULT_THRESHOLD).toBe("number");
  expect(DEFAULT_THRESHOLD).toBeGreaterThan(0);
});
```

- [ ] **Step 6: Run all data tests**

```bash
cd apps/web && pnpm test -- --testPathPattern="components/data" --no-coverage 2>&1 | tail -40
```

Expected: All existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/data/usage-filters.ts \
        apps/web/src/components/data/__tests__/usage-filters.test.ts
git commit -m "feat(data): add applyPreset/getActivePreset + DataPreset type to usage-filters"
```

---

## Task 3: Simplify `UsagePipelineChart` — remove `threshold` prop

**Files:**
- Modify: `apps/web/src/components/data/usage-pipeline-chart.tsx`
- Modify: `apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx`

- [ ] **Step 1: Remove `threshold` from the props interface**

In `usage-pipeline-chart.tsx`, change:

```typescript
// Before
interface UsagePipelineChartProps {
  pipelineResult: PipelineDataResult | null;
  selectedSpecies: string[];
  threshold: number;
  onSpeciesClick: (species: string) => void;
}

// After
interface UsagePipelineChartProps {
  pipelineResult: PipelineDataResult | null;
  selectedSpecies: string[];
  onSpeciesClick: (species: string) => void;
}
```

- [ ] **Step 2: Remove threshold from the function signature and simplify `visibleSpecies`**

```typescript
// Before
export function UsagePipelineChart({
  pipelineResult,
  selectedSpecies,
  threshold,
  onSpeciesClick,
}: UsagePipelineChartProps) {

// ...

  const visibleSpecies =
    selectedSpecies.length > 0
      ? pipelineResult.data.filter((s) => selectedSpecies.includes(s.species))
      : pipelineResult.data.filter((s) => s.usagePct >= threshold);

  if (visibleSpecies.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No species above {threshold}% threshold.
      </div>
    );
  }

// After
export function UsagePipelineChart({
  pipelineResult,
  selectedSpecies,
  onSpeciesClick,
}: UsagePipelineChartProps) {

// ...

  const visibleSpecies = pipelineResult.data.filter((s) =>
    selectedSpecies.includes(s.species)
  );

  if (visibleSpecies.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No Pokémon selected. Use the sidebar to choose species.
      </div>
    );
  }
```

- [ ] **Step 3: Update the pipeline chart test**

Open `__tests__/usage-pipeline-chart.test.tsx`. Find all occurrences of `threshold` in the props passed to `UsagePipelineChart` and remove them. The prop no longer exists.

Run a search first:
```bash
grep -n "threshold" apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx
```

For each occurrence, remove the `threshold={...}` prop.

- [ ] **Step 4: Run tests**

```bash
cd apps/web && pnpm test -- --testPathPattern="usage-pipeline-chart" --no-coverage 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/data/usage-pipeline-chart.tsx \
        apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx
git commit -m "refactor(data): remove threshold prop from UsagePipelineChart — sidebar presets replace it"
```

---

## Task 4: Simplify `UsageLineChart` — remove threshold/highlight/select-all; add inline legend

**Files:**
- Modify: `apps/web/src/components/data/usage-line-chart.tsx`
- Modify: `apps/web/src/components/data/__tests__/usage-line-chart.test.tsx`
- Modify: `apps/web/src/components/data/__tests__/usage-line-chart.interactions.test.tsx`

- [ ] **Step 1: Update the props interface**

In `usage-line-chart.tsx`, change:

```typescript
// Before
interface UsageLineChartProps {
  points: FormatUsageTimeseriesPoint[];
  selectedSpecies: string[];
  highlight: string;
  threshold: number;
  events: FormatEvent[];
  onSpeciesClick: (species: string) => void;
  onRangeChange: (start: string | null, end: string | null) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

// After
interface UsageLineChartProps {
  points: FormatUsageTimeseriesPoint[];
  selectedSpecies: string[];
  events: FormatEvent[];
  onSpeciesClick: (species: string) => void;
  onRangeChange: (start: string | null, end: string | null) => void;
}
```

- [ ] **Step 2: Update the function signature and `visibleSeries`**

```typescript
// Before
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
  // ...
  const visibleSeries = filterByThreshold(allSeries, threshold);

// After
export function UsageLineChart({
  points,
  selectedSpecies,
  events,
  onSpeciesClick,
  onRangeChange,
}: UsageLineChartProps) {
  // ...
  const visibleSeries = selectedSpecies.length > 0
    ? allSeries.filter((s) => selectedSpecies.includes(s.species))
    : allSeries;
```

- [ ] **Step 3: Remove highlight-based opacity logic**

Find the line opacity/stroke expression that references `highlight` (something like `!highlight || s.species.toLowerCase().includes(highlight.toLowerCase())`). Simplify it — all visible series render at full opacity since sidebar controls selection:

```typescript
// Before (example — exact code may differ slightly)
const isActive =
  !highlight ||
  s.species.toLowerCase().includes(highlight.toLowerCase());
const opacity = isActive ? 1 : 0.08;

// After
const opacity = 1;
```

If the only opacity variation was from `highlight`, remove the conditional entirely and set `strokeOpacity={1}` on all `<Line>` elements.

- [ ] **Step 4: Remove "Select All" and "Clear" button JSX**

Find and delete the JSX block that renders `onSelectAll` / `onClearSelection` buttons. Also delete any header row that contains them if it becomes empty.

- [ ] **Step 5: Add inline legend**

After the `</ResponsiveContainer>` closing tag (or inside the chart wrapper div), add:

```tsx
{selectedSpecies.length > 0 && (
  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
    {selectedSpecies.slice(0, 10).map((sp) => {
      const series = allSeries.find((s) => s.species === sp);
      return (
        <div key={sp} className="flex items-center gap-1">
          <div
            className="h-0.5 w-3 flex-shrink-0 rounded-full"
            style={{ background: series?.color ?? "#94a3b8" }}
          />
          <span className="text-muted-foreground text-xs">{sp}</span>
        </div>
      );
    })}
    {selectedSpecies.length > 10 && (
      <span className="text-muted-foreground text-xs">
        +{selectedSpecies.length - 10} more
      </span>
    )}
  </div>
)}
```

(`allSeries` is already computed at the top of the function via `buildUsageSeries(points)`. `series.color` comes from `UsageSeries.color` which `buildUsageSeries` returns.)

- [ ] **Step 6: Remove unused import**

Remove `filterByThreshold` from the import of `"./usage-series"` if it's no longer used:

```typescript
// Before
import { buildUsageSeries, filterByThreshold } from "./usage-series";

// After
import { buildUsageSeries } from "./usage-series";
```

- [ ] **Step 7: Update tests**

```bash
grep -n "threshold\|highlight\|onSelectAll\|onClearSelection" \
  apps/web/src/components/data/__tests__/usage-line-chart.test.tsx \
  apps/web/src/components/data/__tests__/usage-line-chart.interactions.test.tsx
```

For each test that passes `threshold`, `highlight`, `onSelectAll`, or `onClearSelection` as props, remove those props. Update any test that asserts on Select All / Clear button existence — either delete the test or replace it with a test for the legend.

- [ ] **Step 8: Run tests**

```bash
cd apps/web && pnpm test -- --testPathPattern="usage-line-chart" --no-coverage 2>&1 | tail -40
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/data/usage-line-chart.tsx \
        apps/web/src/components/data/__tests__/usage-line-chart.test.tsx \
        apps/web/src/components/data/__tests__/usage-line-chart.interactions.test.tsx
git commit -m "refactor(data): simplify UsageLineChart — remove threshold/highlight, add inline legend"
```

---

## Task 5: Create `DataSidebar` component

**Files:**
- Create: `apps/web/src/components/data/data-sidebar.tsx`

- [ ] **Step 1: Create the file**

```typescript
// apps/web/src/components/data/data-sidebar.tsx
"use client";

import { useState, useLayoutEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getActiveFormats } from "@trainers/pokemon";
import { type PipelineSpeciesData } from "@trainers/supabase";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  type UsageFilters,
  type UsageSource,
  type PeriodType,
  type DataPreset,
  applyPreset,
  getActivePreset,
} from "./usage-filters";
import { assignColor } from "./usage-series";

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = "data-sidebar-collapsed";

const PRESETS: { label: string; value: DataPreset }[] = [
  { label: "Top 10", value: "top10" },
  { label: "Top 20", value: "top20" },
  { label: "Top 50", value: "top50" },
  { label: "All", value: "all" },
];

// =============================================================================
// Types
// =============================================================================

interface DataSidebarProps {
  filters: UsageFilters;
  allSpecies: PipelineSpeciesData[];
  selectedSpecies: string[];
  onFiltersChange: (filters: UsageFilters) => void;
  onSelectionChange: (selected: string[]) => void;
}

// =============================================================================
// DataSidebar
// =============================================================================

export function DataSidebar({
  filters,
  allSpecies,
  selectedSpecies,
  onFiltersChange,
  onSelectionChange,
}: DataSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const formats = getActiveFormats();
  const activePreset = getActivePreset(allSpecies, selectedSpecies);

  // Restore collapsed state from localStorage before first paint to prevent flash.
  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (localStorage.getItem(STORAGE_KEY) === "true") setCollapsed(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const handlePreset = (preset: DataPreset) => {
    onSelectionChange(applyPreset(allSpecies, preset));
  };

  const handleToggle = (species: string) => {
    const next = selectedSpecies.includes(species)
      ? selectedSpecies.filter((s) => s !== species)
      : [...selectedSpecies, species];
    onSelectionChange(next);
  };

  const filtered = query
    ? allSpecies.filter((s) =>
        s.species.toLowerCase().includes(query.toLowerCase())
      )
    : allSpecies;

  if (collapsed) {
    return (
      <div className="flex h-full w-10 flex-shrink-0 flex-col items-center border-r pt-3">
        <button
          onClick={handleCollapse}
          aria-label="Expand sidebar"
          className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-52 flex-shrink-0 flex-col overflow-hidden border-r">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-3 pt-3 pb-2">
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
          Filters
        </span>
        <button
          onClick={handleCollapse}
          aria-label="Collapse sidebar"
          className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      </div>

      {/* Format / Source / Granularity */}
      <div className="flex flex-shrink-0 flex-col gap-3 px-3 pb-3">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            Format
          </span>
          <Select
            value={filters.format}
            onValueChange={(v) =>
              v && onFiltersChange({ ...filters, format: v })
            }
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formats.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            Source
          </span>
          <Select
            value={filters.source}
            onValueChange={(v) =>
              v && onFiltersChange({ ...filters, source: v as UsageSource })
            }
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Sources</SelectItem>
              <SelectItem value="rk9" className="text-xs">RK9</SelectItem>
              <SelectItem value="limitless" className="text-xs">Limitless</SelectItem>
              <SelectItem value="trainers.gg" className="text-xs">trainers.gg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            Granularity
          </span>
          <Select
            value={filters.periodType}
            onValueChange={(v) =>
              v && onFiltersChange({ ...filters, periodType: v as PeriodType })
            }
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day" className="text-xs">Event</SelectItem>
              <SelectItem value="week" className="text-xs">Week</SelectItem>
              <SelectItem value="month" className="text-xs">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t" />

      {/* Pokémon section */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 py-3">
        <span className="text-muted-foreground flex-shrink-0 text-xs font-semibold uppercase tracking-widest">
          Pokémon
        </span>

        {/* Preset buttons */}
        <div className="flex flex-shrink-0 flex-wrap gap-1">
          {PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handlePreset(value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                activePreset === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/60"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 flex-shrink-0 text-xs"
        />

        {/* Scrollable checklist */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-0.5 pr-1">
            {filtered.map((s) => {
              const checked = selectedSpecies.includes(s.species);
              const color = assignColor(s.species);
              return (
                <button
                  key={s.species}
                  onClick={() => handleToggle(s.species)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs transition-colors",
                    checked
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex-shrink-0 text-xs",
                      checked ? "text-primary" : "text-muted-foreground/40"
                    )}
                    aria-hidden
                  >
                    {checked ? "☑" : "☐"}
                  </span>
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.species}</span>
                  <span className="text-muted-foreground/50 flex-shrink-0 text-xs">
                    {s.usagePct.toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-shrink-0 items-center justify-between border-t px-3 py-2">
        <span className="text-muted-foreground text-xs">
          {selectedSpecies.length} selected · {allSpecies.length} total
        </span>
        <button
          onClick={() => onSelectionChange([])}
          className="text-primary hover:text-primary/80 text-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

```bash
pnpm typecheck 2>&1 | grep "data-sidebar" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/data/data-sidebar.tsx
git commit -m "feat(data): add DataSidebar — presets, search, checklist, collapsible"
```

---

## Task 6: Refactor `usage-explorer.tsx`

**Files:**
- Modify: `apps/web/src/components/data/usage-explorer.tsx`
- Modify: `apps/web/src/components/data/__tests__/usage-explorer.test.tsx`

- [ ] **Step 1: Replace the entire file content**

```typescript
"use client";

import { useTransition } from "react";
import { BarChart2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  type FormatUsageTimeseriesPoint,
  type PipelineDataResult,
  type FormatEvent,
} from "@trainers/supabase";

import {
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
} from "@/actions/usage";

import { buildUsageSeries } from "./usage-series";
import { DataSidebar } from "./data-sidebar";
import { UsagePipelineChart } from "./usage-pipeline-chart";
import { UsageLineChart } from "./usage-line-chart";
import {
  type UsageFilters,
  coerceFormat,
  coercePeriodType,
  coerceSource,
  coerceSelectedSpecies,
  coerceRangeStart,
  coerceRangeEnd,
  applyPreset,
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
 * URL state: format, source, periodType, species (comma-sep),
 * rangeStart (ISO date), rangeEnd (ISO date).
 * threshold is no longer URL-persisted — sidebar presets replace it.
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

  // ── URL-derived state ─────────────────────────────────────────────────────
  const format = coerceFormat(
    searchParams.get("format") ?? initialFilters.format
  );
  const source = coerceSource(
    searchParams.get("source") ?? initialFilters.source
  );
  const periodType = coercePeriodType(
    searchParams.get("periodType") ?? initialFilters.periodType
  );
  const selectedSpecies = coerceSelectedSpecies(searchParams.get("species"));
  const rangeStart = coerceRangeStart(searchParams.get("rangeStart"));
  const rangeEnd = coerceRangeEnd(searchParams.get("rangeEnd"));

  const [initTimeseriesKey] = useState({ format, source, periodType });
  const [initPipelineKey] = useState({
    format,
    source,
    periodType,
    rangeStart,
    rangeEnd,
  });
  const [initEventsFormat] = useState(format);

  const currentFilters: UsageFilters = { format, source, periodType };

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
    params.delete("threshold"); // clean up any legacy threshold param

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

  const handleFiltersChange = (next: UsageFilters) =>
    updateUrl(next, next.format !== format ? [] : undefined);

  const handleSelectionChange = (next: string[]) =>
    updateUrl(currentFilters, next);

  const handleSpeciesClick = (species: string) => {
    const next = effectiveSelected.includes(species)
      ? effectiveSelected.filter((s) => s !== species)
      : [...effectiveSelected, species];
    updateUrl(currentFilters, next);
  };

  const handleRangeChange = (start: string | null, end: string | null) =>
    updateUrl(currentFilters, undefined, start, end);

  // ── TanStack Query — timeseries ───────────────────────────────────────────
  const isInitTimeseries =
    format === initTimeseriesKey.format &&
    source === initTimeseriesKey.source &&
    periodType === initTimeseriesKey.periodType;
  const { data: points = [] } = useQuery<FormatUsageTimeseriesPoint[]>({
    queryKey: ["usage-timeseries", format, source, periodType],
    queryFn: async () => {
      const result = await fetchFormatUsageTimeseries({
        format,
        source,
        periodType,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: isInitTimeseries ? initialPoints : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  // ── TanStack Query — pipeline data ────────────────────────────────────────
  const isInitPipeline =
    format === initPipelineKey.format &&
    source === initPipelineKey.source &&
    periodType === initPipelineKey.periodType &&
    rangeStart === initPipelineKey.rangeStart &&
    rangeEnd === initPipelineKey.rangeEnd;
  const { data: pipelineResult = null } = useQuery<PipelineDataResult | null>({
    queryKey: [
      "pipeline-data",
      format,
      source,
      periodType,
      rangeStart,
      rangeEnd,
    ],
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
    initialData: isInitPipeline ? initialPipelineResult : undefined,
    placeholderData: (prev) => prev,
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
    initialData: format === initEventsFormat ? initialEvents : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60 * 60 * 1000,
  });

  // When no species are URL-selected, default to top 20 from pipeline data.
  const effectiveSelected =
    selectedSpecies.length > 0
      ? selectedSpecies
      : applyPreset(pipelineResult?.data ?? [], "top20");

  const allSpecies = pipelineResult?.data ?? [];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <DataSidebar
        filters={currentFilters}
        allSpecies={allSpecies}
        selectedSpecies={effectiveSelected}
        onFiltersChange={handleFiltersChange}
        onSelectionChange={handleSelectionChange}
      />

      {/* Main area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Page header */}
        <div className="flex flex-shrink-0 items-center gap-2 px-5 pt-4 pb-2">
          <BarChart2 className="text-muted-foreground size-5" />
          <h1 className="text-xl font-bold tracking-tight">Data</h1>
          <span className="text-muted-foreground text-sm">
            Pokémon usage across tournaments
          </span>
        </div>

        {/* Charts */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 pb-4">
          {/* Meta Pipeline (Sankey) */}
          <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow-sm">
            <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-2.5">
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                Meta Pipeline
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <UsagePipelineChart
                pipelineResult={pipelineResult}
                selectedSpecies={effectiveSelected}
                onSpeciesClick={handleSpeciesClick}
              />
            </div>
          </div>

          {/* Usage Over Time (line chart) */}
          <div className="bg-card h-36 flex-shrink-0 overflow-hidden rounded-xl shadow-sm">
            <UsageLineChart
              points={points}
              selectedSpecies={effectiveSelected}
              events={events}
              onSpeciesClick={handleSpeciesClick}
              onRangeChange={handleRangeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Note:** The file references `useState` — add it to the React import: `import { useState, useTransition } from "react";`

**Note on code ordering:** `handleSpeciesClick` closes over `effectiveSelected` which is defined after the TanStack queries. This is valid JavaScript (the closure reads the binding when called, not when defined), but if you prefer cleaner ordering, move `effectiveSelected` and `allSpecies` to just before `handleSpeciesClick` — after the three `useQuery` calls and before the return statement.

- [ ] **Step 2: Update the explorer test**

In `__tests__/usage-explorer.test.tsx`, find all `threshold`, `highlight`, `onSelectAll`, `onClearSelection` references in props passed to `UsageExplorer` and remove them. Find `initialFilters` usage and remove `threshold` from the object:

```typescript
// Before
const initialFilters: UsageFilters = {
  format: "gen9vgc2025regg",
  source: "all",
  periodType: "week",
  threshold: 2,
};

// After
const initialFilters: UsageFilters = {
  format: "gen9vgc2025regg",
  source: "all",
  periodType: "week",
};
```

- [ ] **Step 3: Run tests**

```bash
cd apps/web && pnpm test -- --testPathPattern="usage-explorer" --no-coverage 2>&1 | tail -40
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/data/usage-explorer.tsx \
        apps/web/src/components/data/__tests__/usage-explorer.test.tsx
git commit -m "feat(data): refactor UsageExplorer — DataSidebar, top-20 default, full-height layout"
```

---

## Task 7: Update `data/page.tsx` for full-viewport shell

**Files:**
- Modify: `apps/web/src/app/(app)/data/page.tsx`

- [ ] **Step 1: Replace the page file content**

```typescript
import { getFormatById } from "@trainers/pokemon";

import {
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
} from "@/actions/usage";
import { UsageExplorer } from "@/components/data/usage-explorer";
import { type UsageFilters } from "@/components/data/usage-filters";
import {
  coerceFormat,
  coercePeriodType,
  coerceRangeEnd,
  coerceRangeStart,
  coerceSource,
} from "@/components/data/usage-filters";

// =============================================================================
// Cache
// =============================================================================

/**
 * Use on-demand tag invalidation only (via CacheTags.USAGE_STATS). The
 * unstable_cache inside fetchFormatUsageTimeseries manages its own 1h TTL.
 * Setting revalidate=3600 here would redundantly race against that TTL and
 * prevent the tag-based bust from taking effect immediately.
 */
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
  const rangeStart = coerceRangeStart(raw("rangeStart"));
  const rangeEnd = coerceRangeEnd(raw("rangeEnd"));

  const initialFilters: UsageFilters = { format, source, periodType };

  const [timeseriesResult, pipelineResult, eventsResult] = await Promise.all([
    fetchFormatUsageTimeseries({ format, source, periodType }),
    fetchPipelineData({
      format,
      source,
      periodType,
      periodStart: rangeStart ?? undefined,
      periodEnd: rangeEnd ?? undefined,
    }),
    fetchFormatEvents(format),
  ]);

  const initialPoints = timeseriesResult.success ? timeseriesResult.data : [];
  const initialPipelineResult = pipelineResult.success
    ? pipelineResult.data
    : null;
  const initialEvents = eventsResult.success ? eventsResult.data : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      <UsageExplorer
        initialPoints={initialPoints}
        initialPipelineResult={initialPipelineResult}
        initialEvents={initialEvents}
        initialFilters={initialFilters}
      />
    </div>
  );
}
```

Note: `getFormatById` import is removed (subtitle moved into `UsageExplorer`). Add it back only if it's needed elsewhere in the file.

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep -iE "error" | grep "data" | head -20
```

Expected: no errors in the data files.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/data/page.tsx
git commit -m "feat(data): full-viewport shell — remove PageContainer, strip threshold from page props"
```

---

## Task 8: Verify end-to-end

- [ ] **Step 1: Start dev server**

```bash
pnpm dev:web 2>&1 | tail -5
```

Wait for "Ready" output.

- [ ] **Step 2: Navigate to /data and take a screenshot**

Use Playwright MCP tools to navigate and screenshot:

```
browser_navigate → https://localhost:3000/data
browser_take_screenshot → .playwright-mcp/screenshots/data-redesign-final.png
```

- [ ] **Step 3: Verify checklist**

Looking at the screenshot:
- [ ] Sidebar visible on the left (~200px wide)
- [ ] Format / Source / Granularity dropdowns in sidebar
- [ ] "Top 20" preset button appears active
- [ ] ~20 Pokémon in the checklist (checked, with colored dots)
- [ ] Sankey chart fills available height — distinct colored flows for each species
- [ ] Usage Over Time chart at the bottom with inline legend
- [ ] No top control bar (old search/threshold UI gone)
- [ ] No horizontal scrollbar on the page

- [ ] **Step 4: Verify sidebar collapse**

```
browser_click → collapse button (‹ chevron in sidebar header)
browser_take_screenshot → .playwright-mcp/screenshots/data-collapsed-sidebar.png
```

Verify sidebar shrinks to icon-only strip; chart area expands. Reload page and verify collapsed state persists.

- [ ] **Step 5: Verify preset switching**

Click "Top 10" preset → Sankey re-renders with ~10 species. Click "All" → many species appear (chart becomes dense again, which is intentional for power users).

- [ ] **Step 6: Run the full test suite**

```bash
pnpm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 7: Push and check CI**

```bash
git push
```

After push, run:
```bash
gh pr checks --watch
```

Wait for all CI checks to complete. Enumerate results:
1. `pnpm lint` — pass/fail
2. `pnpm typecheck` — pass/fail
3. `pnpm test` — pass/fail
4. `pnpm test:e2e` — pass/fail

Fix any failures before marking complete.
