# /admin/data Import Console Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/admin/data` import console — filter-aware bulk actions, a grouped/labeled toolbar, a Settings popover, status chips, a selection bulk-bar, active-filter emphasis, and a mobile card layout — while decomposing the 2,867-line `external-data.tsx` into focused sub-components.

**Architecture:** `external-data.tsx` stays the stateful container (data fetching, filter/selection state, handlers). New presentational children receive props: `external-data-status-chips.tsx`, `external-data-settings.tsx`, `external-data-toolbar.tsx`, `external-data-selection-bar.tsx`, `external-data-cards.tsx`. Pure, testable helpers live in `external-data-shared.ts`. Mobile uses the project's `useIsMobile()` + `useIsClient()` conditional-mount pattern (table ↔ cards), never `hidden md:block`.

**Tech Stack:** Next.js 16 / React 19.2 (React Compiler — no `useMemo`/`useCallback`/`memo`), Base UI via shadcn (`Popover`, `DropdownMenu`, `Button`, `Badge`, `Switch`), Tailwind CSS 4 (no arbitrary `[Npx]`), Jest + Testing Library, `@tanstack/react-virtual`.

**Spec:** `docs/superpowers/specs/2026-06-05-admin-data-console-redesign-design.md`

**Branch:** Continue on `feat/pokemon-usage-stats` (per the user's standing preference to work on the current branch). This is UI-only and additive.

---

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `apps/web/src/components/admin/external-data-shared.ts` | Types + NEW pure helpers (`queueableIds`, `rosterEligibleIds`, `teamsEligibleIds`, `statusChipCounts`) | Modify |
| `apps/web/src/components/admin/external-data-status-chips.tsx` | Colored status pills (synced/queued/importing/imported/failed) | Create |
| `apps/web/src/components/admin/external-data-settings.tsx` | ⚙ Settings popover (Backend toggle + throughput inputs) | Create |
| `apps/web/src/components/admin/external-data-toolbar.tsx` | Grouped action toolbar (chips + Import group + Usage menu + ⚙ + ⟳) | Create |
| `apps/web/src/components/admin/external-data-selection-bar.tsx` | Bulk-action bar shown when rows are selected | Create |
| `apps/web/src/components/admin/external-data-cards.tsx` | Mobile card list (mirrors the table rows) | Create |
| `apps/web/src/components/admin/external-data.tsx` | Container — wires the above, conditional table↔cards mount | Modify |
| `apps/web/src/components/admin/__tests__/external-data-shared.test.ts` | Unit tests for the pure helpers | Create |
| `apps/web/src/components/admin/__tests__/external-data-mount.test.tsx` | Conditional-mount test (skeleton/table/cards) | Create |

Each task is committable on its own. Tasks 1–2 are pure/low-risk; 3–5 are extractions + the grouped toolbar; 6 is a small style change; 7 is the mobile reflow.

---

## Task 1: Filter-aware bulk actions (pure helpers + wiring)

**Files:**
- Modify: `apps/web/src/components/admin/external-data-shared.ts`
- Modify: `apps/web/src/components/admin/external-data.tsx` (handlers ~991–1069, derived data ~734–749)
- Test: `apps/web/src/components/admin/__tests__/external-data-shared.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/components/admin/__tests__/external-data-shared.test.ts
import {
  queueableIds,
  rosterEligibleIds,
  teamsEligibleIds,
  type UnifiedRow,
} from "../external-data-shared";

function limRow(id: string, import_status: string | null): UnifiedRow {
  return {
    id: `limitless-${id}`,
    source: "limitless",
    name: id,
    category: "M-A",
    date: "2026-06-04",
    playerCount: 10,
    status: "pending",
    statusDetail: import_status ?? "pending",
    error: null,
    platform: null,
    isOnline: null,
    hasData: false,
    country: null,
    limitless: {
      tournament_id: id,
      name: id,
      format_id: "gen9vgc2025regg",
      date: "2026-06-04",
      player_count: 10,
      platform: null,
      is_online: null,
      decklists: false,
      data_imported_at: null,
      import_status,
      import_requested_at: null,
      import_error: null,
      import_attempts: 0,
    },
  };
}

function rk9Row(id: string, import_status: string): UnifiedRow {
  return {
    id: `rk9-${id}`,
    source: "rk9",
    name: id,
    category: "VG",
    date: "2026-06-04",
    playerCount: 10,
    status: "pending",
    statusDetail: import_status,
    error: null,
    platform: null,
    isOnline: null,
    hasData: false,
    country: "US",
    rk9: {
      event_id: id,
      name: id,
      tier: "VG",
      format_id: "gen9vgc2025regg",
      date_start: "2026-06-04",
      date_end: "2026-06-04",
      location_city: null,
      location_country: "US",
      player_count: 10,
      has_team_lists: false,
      import_status,
      import_error: null,
      teams_imported_count: 0,
    },
  };
}

describe("queueableIds (Limitless)", () => {
  it("returns tournament ids for rows with null or failed status only", () => {
    const rows = [limRow("a", null), limRow("b", "queued"), limRow("c", "failed"), limRow("d", "completed")];
    expect(queueableIds(rows)).toEqual(["a", "c"]);
  });
  it("ignores rk9 rows", () => {
    expect(queueableIds([rk9Row("x", "pending")])).toEqual([]);
  });
});

describe("rosterEligibleIds (RK9)", () => {
  it("returns event ids for pending/failed events", () => {
    const rows = [rk9Row("a", "pending"), rk9Row("b", "failed"), rk9Row("c", "roster"), rk9Row("d", "complete")];
    expect(rosterEligibleIds(rows)).toEqual(["a", "b"]);
  });
});

describe("teamsEligibleIds (RK9)", () => {
  it("returns event ids for roster/teams/complete events", () => {
    const rows = [rk9Row("a", "pending"), rk9Row("b", "roster"), rk9Row("c", "teams"), rk9Row("d", "complete")];
    expect(teamsEligibleIds(rows)).toEqual(["b", "c", "d"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @trainers/web test -- external-data-shared`
Expected: FAIL — `queueableIds`/`rosterEligibleIds`/`teamsEligibleIds` are not exported.

- [ ] **Step 3: Add the pure helpers to `external-data-shared.ts`**

Append below the existing type exports:

```ts
// ---------------------------------------------------------------------------
// Bulk-action selectors — operate on a row list (already filtered by the
// caller) and return the native source ids eligible for each bulk action.
// Keeping these pure makes the filter-aware bulk logic unit-testable.
// ---------------------------------------------------------------------------

/** Limitless tournament_ids eligible to queue: never-queued (null) or failed. */
export function queueableIds(rows: UnifiedRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.source === "limitless" &&
        r.limitless != null &&
        (!r.limitless.import_status || r.limitless.import_status === "failed")
    )
    .map((r) => r.limitless!.tournament_id);
}

/** RK9 event_ids eligible for a roster scrape: pending or failed. */
export function rosterEligibleIds(rows: UnifiedRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.source === "rk9" &&
        r.rk9 != null &&
        (r.rk9.import_status === "pending" || r.rk9.import_status === "failed")
    )
    .map((r) => r.rk9!.event_id);
}

/** RK9 event_ids eligible for a teams scrape: roster, teams, or complete. */
export function teamsEligibleIds(rows: UnifiedRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.source === "rk9" &&
        r.rk9 != null &&
        ["roster", "teams", "complete"].includes(r.rk9.import_status)
    )
    .map((r) => r.rk9!.event_id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @trainers/web test -- external-data-shared`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the helpers into the container handlers**

In `external-data.tsx`:

1. Add to the imports from `./external-data-shared` (line ~64): `queueableIds, rosterEligibleIds, teamsEligibleIds`.
2. Add derived counts in render (near line ~749, after `limitlessQueueEligibleSelected`):

```tsx
// Filter-aware bulk targets (used when no explicit row selection exists).
const limitlessQueueMatchingIds = queueableIds(filteredLimitlessRows);
const rk9RosterMatchingIds = rosterEligibleIds(filteredRk9Rows);
const rk9TeamsMatchingIds = teamsEligibleIds(filteredRk9Rows);
```

3. Add a new handler beside `handleQueueAll` (~991):

```tsx
/** Queue the tournaments matching the active filters (pending/failed only). */
async function handleQueueMatching() {
  if (limitlessQueueMatchingIds.length === 0) return;
  setBatchQueuing(true);
  try {
    const result = await batchQueueTournaments(limitlessQueueMatchingIds);
    if (!result.success) throw new Error(result.error);
    setRefreshKey((k) => k + 1);
  } catch {
    toast.error("Failed to queue tournaments");
  } finally {
    setBatchQueuing(false);
  }
}
```

4. Keep `handleQueueAll` as the secondary "queue all pending" action (unchanged).

Note: the RK9 toolbar buttons that consume `rk9RosterMatchingIds` / `rk9TeamsMatchingIds` are added in Task 4 (toolbar). For this task, only the helpers, derived ids, and `handleQueueMatching` are added.

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter @trainers/web test -- external-data-shared`
Run: `pnpm --filter @trainers/web typecheck`
Expected: tests PASS; typecheck clean (no unused-var errors — the matching-id derivations are consumed in Task 4; if typecheck flags them unused in isolation, prefix with `void` usage by passing them to the toolbar in Task 4 within the same branch before pushing).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/external-data-shared.ts apps/web/src/components/admin/__tests__/external-data-shared.test.ts apps/web/src/components/admin/external-data.tsx
git commit -m "feat(admin): filter-aware bulk queue/scrape helpers + handleQueueMatching"
```

---

## Task 2: Status chips component

**Files:**
- Create: `apps/web/src/components/admin/external-data-status-chips.tsx`
- Modify: `apps/web/src/components/admin/external-data.tsx` (replace the inline count pills in both toolbars: RK9 ~1313–1332, Limitless ~1700–1724)

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/admin/external-data-status-chips.tsx
import { cn } from "@/lib/utils";

export interface StatusChip {
  label: string;
  count: number;
  tone: "synced" | "queued" | "importing" | "imported" | "failed";
}

const TONE_CLASS: Record<StatusChip["tone"], string> = {
  synced: "bg-muted text-muted-foreground",
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  importing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  imported: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

/** Scannable colored count pills for the import console toolbar. */
export function StatusChips({ chips }: { chips: StatusChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
            TONE_CLASS[c.tone]
          )}
        >
          <span className="size-1.5 rounded-full bg-current opacity-80" />
          {c.count.toLocaleString()} {c.label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Use it in the container**

In `external-data.tsx`:
1. Import: `import { StatusChips, type StatusChip } from "./external-data-status-chips";`
2. Compute the chip arrays in render (after the count derivations ~785):

```tsx
const limitlessFailedCount = (limitlessTournaments ?? []).filter(
  (t) => t.import_status === "failed"
).length;
const limitlessChips: StatusChip[] = [
  { label: "synced", count: totalSynced, tone: "synced" },
  { label: "queued", count: limitlessQueuedCount, tone: "queued" },
  { label: "importing", count: limitlessImportingCount, tone: "importing" },
  { label: "imported", count: totalImported, tone: "imported" },
  { label: "failed", count: limitlessFailedCount, tone: "failed" },
];
const rk9FailedCount =
  rk9Events?.filter((e) => e.import_status === "failed").length ?? 0;
const rk9Chips: StatusChip[] = [
  { label: "events", count: rk9Total, tone: "synced" },
  { label: "imported", count: rk9Imported, tone: "imported" },
  { label: "failed", count: rk9FailedCount, tone: "failed" },
];
```

3. Replace the inline stat pills in BOTH toolbars (the `<Globe>`/`<CheckCircle2>` count clusters) with `<StatusChips chips={limitlessChips} />` (Limitless) and `<StatusChips chips={rk9Chips} />` (RK9). Keep the active-jobs/importing animated badges as-is for now (they move into the toolbar in Task 4).

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @trainers/web typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/external-data-status-chips.tsx apps/web/src/components/admin/external-data.tsx
git commit -m "feat(admin): status chips for import console counts"
```

---

## Task 3: Settings popover

**Files:**
- Create: `apps/web/src/components/admin/external-data-settings.tsx`
- Modify: `apps/web/src/components/admin/external-data.tsx` (remove inline config inputs from both toolbars: RK9 ~1272–1312, Limitless ~1628–1699)

- [ ] **Step 1: Create the popover component**

```tsx
// apps/web/src/components/admin/external-data-settings.tsx
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ExternalDataSettingsProps {
  tab: "rk9" | "limitless";
  loading: boolean;
  backendOn: boolean;
  onToggleBackend: (checked: boolean) => void;
  // RK9 throughput
  teamsPerTick?: number;
  onTeamsPerTickChange?: (v: string) => void;
  onTeamsPerTickBlur?: () => void;
  concurrency?: number;
  onConcurrencyChange?: (v: string) => void;
  onConcurrencyBlur?: () => void;
  // Limitless throughput
  batchSize?: number;
  onBatchSizeChange?: (v: string) => void;
  onBatchSizeBlur?: () => void;
  // shared
  intervalSeconds: number;
  onIntervalChange: (v: string) => void;
  onIntervalBlur: () => void;
}

const NUM_INPUT =
  "h-7 w-16 px-1 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** ⚙ popover holding the Backend auto-import toggle + throughput config. */
export function ExternalDataSettings(props: ExternalDataSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Import settings">
            <Settings className="size-4" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 space-y-3">
        <label className="flex items-center justify-between text-sm font-medium">
          <span>Backend auto-import</span>
          {props.loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Switch checked={props.backendOn} onCheckedChange={props.onToggleBackend} />
          )}
        </label>
        <p className="text-muted-foreground text-xs">
          Note: the backend cron is not currently active — import runs when you
          click Run Import.
        </p>

        {props.tab === "rk9" ? (
          <>
            <SettingRow label="Teams / tick">
              <Input type="number" min={1} className={NUM_INPUT} value={props.teamsPerTick}
                onChange={(e) => props.onTeamsPerTickChange?.(e.target.value)} onBlur={props.onTeamsPerTickBlur} />
            </SettingRow>
            <SettingRow label="Concurrency">
              <Input type="number" min={1} max={10} className={NUM_INPUT} value={props.concurrency}
                onChange={(e) => props.onConcurrencyChange?.(e.target.value)} onBlur={props.onConcurrencyBlur} />
            </SettingRow>
          </>
        ) : (
          <SettingRow label="Tourneys / tick">
            <Input type="number" min={1} className={NUM_INPUT} value={props.batchSize}
              onChange={(e) => props.onBatchSizeChange?.(e.target.value)} onBlur={props.onBatchSizeBlur} />
          </SettingRow>
        )}

        <SettingRow label="Interval (s)">
          <Input type="number" min={10} step={10} className={NUM_INPUT} value={props.intervalSeconds}
            onChange={(e) => props.onIntervalChange(e.target.value)} onBlur={props.onIntervalBlur} />
        </SettingRow>
      </PopoverContent>
    </Popover>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}
```

> Note: verify the `PopoverTrigger` API in `@/components/ui/popover.tsx` — this project uses Base UI (no `asChild`). If the local `PopoverTrigger` does not accept a `render` prop, follow whatever pattern the existing `Popover` usages in the codebase use (e.g. `<PopoverTrigger><Button .../></PopoverTrigger>`). Match the existing convention exactly.

- [ ] **Step 2: Wire it into the container (don't render yet — Task 4 places it)**

In `external-data.tsx`, import `ExternalDataSettings`. Leave the existing inline config inputs in place for now; Task 4 removes them when it assembles the toolbar (to keep this task compiling). No render change required here beyond the import — OR, to commit a visible change, you may render `<ExternalDataSettings .../>` at the end of each toolbar's action row and delete the inline inputs in the same edit. Either is acceptable; if you render it now, delete the inline config inputs (RK9 ~1272–1312, Limitless ~1628–1699) and pass the matching state/handlers.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @trainers/web typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/external-data-settings.tsx apps/web/src/components/admin/external-data.tsx
git commit -m "feat(admin): extract import settings into a popover"
```

---

## Task 4: Grouped toolbar (Option A)

**Files:**
- Create: `apps/web/src/components/admin/external-data-toolbar.tsx`
- Modify: `apps/web/src/components/admin/external-data.tsx` (replace both toolbars' action areas — RK9 ~1334–1418, Limitless ~1725–1843 — with `<ExternalDataToolbar .../>`)

- [ ] **Step 1: Create the toolbar component**

Define a props interface that covers both tabs, then render: chips on the left; on the right, grouped Import buttons, a Usage `DropdownMenu`, the `ExternalDataSettings` popover, and a Refresh button. Use `DropdownMenu` for (a) the Usage menu (Recompute Usage / Calculate Usage) and (b) the Queue "▾" secondary menu (Queue all pending).

```tsx
// apps/web/src/components/admin/external-data-toolbar.tsx
import { RefreshCw, Loader2, BarChart2, Download, Play, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StatusChips, type StatusChip } from "./external-data-status-chips";
import { ExternalDataSettings, type ExternalDataSettingsProps } from "./external-data-settings";

export interface ExternalDataToolbarProps {
  tab: "rk9" | "limitless";
  chips: StatusChip[];
  settings: ExternalDataSettingsProps;
  isFetching: boolean;
  onRefresh: () => void;
  // Usage actions (both tabs)
  onRecomputeUsage: () => void;
  recomputingUsage: boolean;
  onCalculateUsage: () => void;
  calculatingUsage: boolean;
  // RK9 import group
  onDiscover?: () => void;
  isDiscovering?: boolean;
  onScrapeRostersMatching?: () => void;
  rosterMatchingCount?: number;
  onScrapeTeamsMatching?: () => void;
  teamsMatchingCount?: number;
  // Limitless import group
  onSync?: () => void;
  syncing?: boolean;
  onQueueMatching?: () => void;
  queueMatchingCount?: number;
  onQueueAll?: () => void;
  queueAllCount?: number;
  onRunImport?: () => void;
  importing?: boolean;
  bulkProcessing?: boolean;
}

const LABEL = "text-muted-foreground text-[10px] font-semibold uppercase tracking-wide";

export function ExternalDataToolbar(props: ExternalDataToolbarProps) {
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
      <StatusChips chips={props.chips} />
      <div className="flex flex-wrap items-center gap-2">
        <span className={LABEL}>Import</span>
        {props.tab === "rk9" ? (
          <>
            <Button variant="outline" size="sm" onClick={props.onDiscover} disabled={props.isDiscovering}>
              {props.isDiscovering ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
              Discover
            </Button>
            <Button variant="default" size="sm" onClick={props.onScrapeRostersMatching}
              disabled={props.bulkProcessing || (props.rosterMatchingCount ?? 0) === 0}>
              Scrape Rosters ({props.rosterMatchingCount ?? 0})
            </Button>
            <Button variant="outline" size="sm" onClick={props.onScrapeTeamsMatching}
              disabled={props.bulkProcessing || (props.teamsMatchingCount ?? 0) === 0}>
              <Play className="mr-1.5 size-3.5" /> Scrape Teams ({props.teamsMatchingCount ?? 0})
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={props.onSync} disabled={props.syncing}>
              {props.syncing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
              Sync
            </Button>
            <div className="flex">
              <Button variant="default" size="sm" className="rounded-r-none" onClick={props.onQueueMatching}
                disabled={props.bulkProcessing || (props.queueMatchingCount ?? 0) === 0}>
                <Plus className="mr-1.5 size-3.5" /> Queue Matching ({props.queueMatchingCount ?? 0})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="default" size="sm" className="rounded-l-none border-l border-l-white/20 px-2">▾</Button>} />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={props.onQueueAll}>
                    Queue all pending ({props.queueAllCount ?? 0})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button variant="outline" size="sm" onClick={props.onRunImport} disabled={props.importing}>
              {props.importing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Play className="mr-1.5 size-3.5" />}
              Run Import
            </Button>
          </>
        )}

        <span className="bg-border h-5 w-px" />
        <span className={LABEL}>Usage</span>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="sm">
              <BarChart2 className="mr-1.5 size-3.5" /> Usage ▾
            </Button>
          } />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={props.onRecomputeUsage} disabled={props.recomputingUsage}>
              Recompute Usage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onCalculateUsage} disabled={props.calculatingUsage}>
              Calculate Usage
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="bg-border h-5 w-px" />
        <ExternalDataSettings {...props.settings} />
        <Button variant="ghost" size="sm" onClick={props.onRefresh} disabled={props.isFetching} aria-label="Refresh">
          <RefreshCw className={props.isFetching ? "size-4 animate-spin" : "size-4"} />
        </Button>
      </div>
    </div>
  );
}
```

> Verify the `DropdownMenuTrigger` / `PopoverTrigger` `render`-prop convention against the actual `@/components/ui/dropdown-menu.tsx` and `popover.tsx` (Base UI). If they wrap children instead of taking `render`, use the wrapping form consistently. Do not introduce arbitrary `[Npx]` — `size-*`/`w-px`/`h-5` are scale tokens; the `text-[10px]` label matches the existing toolbar label size (keep if already used elsewhere, otherwise use `text-xs`).

- [ ] **Step 2: Replace both inline toolbars in the container**

In `external-data.tsx`, replace the RK9 action area (~1334–1418) and Limitless action area (~1725–1843) with a single `<ExternalDataToolbar ... />` per tab, passing the matching chips, settings props (Backend toggle + throughput state/handlers from Task 3), and the per-tab handlers. For RK9 wire `onScrapeRostersMatching` → a new thin handler that runs `handleScrapeRoster` over `rk9RosterMatchingIds`, and `onScrapeTeamsMatching` → over `rk9TeamsMatchingIds` (mirror `handleBulkScrapeRosters`/`handleBulkScrapeTeams` but source ids from the matching arrays). For Limitless wire `onQueueMatching`/`onQueueAll`/`onRunImport`/`onSync` and the usage handlers. Delete the now-unused inline config inputs (if not already removed in Task 3) and the old standalone Recompute/Calculate buttons.

Keep the existing per-action message strings (`syncMessage`, `importMessage`, etc.) rendered as small text under the toolbar (or convert to `toast` — match what each handler already does).

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm --filter @trainers/web typecheck`
Run: `pnpm --filter @trainers/web lint`
Expected: clean (resolves any "unused" flags on the Task 1 matching-id derivations, now consumed here).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/external-data-toolbar.tsx apps/web/src/components/admin/external-data.tsx
git commit -m "feat(admin): grouped Import/Usage toolbar with filter-aware bulk actions"
```

---

## Task 5: Selection bulk-bar

**Files:**
- Create: `apps/web/src/components/admin/external-data-selection-bar.tsx`
- Modify: `apps/web/src/components/admin/external-data.tsx` (replace the existing conditional bulk toolbar ~2054–2133)

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/admin/external-data-selection-bar.tsx
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SelectionBarProps {
  tab: "rk9" | "limitless";
  selectedCount: number;
  bulkProcessing: boolean;
  onClear: () => void;
  // RK9
  rosterEligibleCount?: number;
  teamsEligibleCount?: number;
  resetEligibleCount?: number;
  onScrapeRosters?: () => void;
  onScrapeTeams?: () => void;
  onResetEvents?: () => void;
  // Limitless
  queueEligibleCount?: number;
  onQueueSelected?: () => void;
}

/** Sticky-ish bulk-action bar shown when one or more rows are selected. */
export function SelectionBar(props: SelectionBarProps) {
  if (props.selectedCount === 0) return null;
  return (
    <div className="bg-primary text-primary-foreground flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm">
      <span className="font-semibold">{props.selectedCount} selected</span>
      {props.tab === "rk9" ? (
        <>
          <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.rosterEligibleCount} onClick={props.onScrapeRosters}>
            Scrape rosters ({props.rosterEligibleCount ?? 0})
          </Button>
          <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.teamsEligibleCount} onClick={props.onScrapeTeams}>
            Scrape teams ({props.teamsEligibleCount ?? 0})
          </Button>
          <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.resetEligibleCount} onClick={props.onResetEvents}>
            Reset ({props.resetEligibleCount ?? 0})
          </Button>
        </>
      ) : (
        <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.queueEligibleCount} onClick={props.onQueueSelected}>
          Queue selected ({props.queueEligibleCount ?? 0})
        </Button>
      )}
      <span className="flex-1" />
      <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/10" onClick={props.onClear}>
        <X className="mr-1 size-3.5" /> Clear
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Replace the inline bulk toolbar in the container**

Render `<SelectionBar .../>` where the old bulk toolbar was (~2054), wiring: `selectedCount={selectedIds.size}`, `onClear={() => setSelectedIds(new Set())}`, RK9 counts from `rosterEligibleSelected.length`/`teamsEligibleSelected.length`/`resetEligibleSelected.length` and handlers `handleBulkScrapeRosters`/`handleBulkScrapeTeams`/`handleBulkResetEvents`, Limitless count from `limitlessQueueEligibleSelected.length` and handler `handleBulkQueueSelected`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @trainers/web typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/external-data-selection-bar.tsx apps/web/src/components/admin/external-data.tsx
git commit -m "feat(admin): dedicated selection bulk-action bar"
```

---

## Task 6: Active-filter emphasis

**Files:**
- Modify: `apps/web/src/components/admin/external-data.tsx` (the Format `SelectTrigger` in both filter panels — Limitless ~1980-ish, and the RK9 Tier `SelectTrigger`)

- [ ] **Step 1: Add an active style to the Format/Tier trigger**

For the Limitless Format `Select` and the RK9 Tier `Select`, add a conditional class to the `SelectTrigger` so it reads as "scoped" when its value is not `"all"`:

```tsx
<SelectTrigger
  className={cn("w-32", limFilters.format !== "all" && "ring-primary/50 ring-2")}
  size="sm"
>
```

(RK9: same with `rk9Filters.tier !== "all"`.)

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @trainers/web typecheck`

```bash
git add apps/web/src/components/admin/external-data.tsx
git commit -m "feat(admin): emphasize the Format/Tier filter when a bulk action is scoped"
```

---

## Task 7: Mobile card reflow

**Files:**
- Create: `apps/web/src/components/admin/external-data-cards.tsx`
- Modify: `apps/web/src/components/admin/external-data.tsx` (wrap the events-table render in a conditional mount)
- Test: `apps/web/src/components/admin/__tests__/external-data-mount.test.tsx`

- [ ] **Step 1: Write the failing conditional-mount test**

```tsx
// apps/web/src/components/admin/__tests__/external-data-mount.test.tsx
import { render, screen } from "@testing-library/react";
import { EventList } from "../external-data-cards";
import type { UnifiedRow } from "../external-data-shared";

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mockUseIsMobile() }));
const mockUseIsClient = jest.fn();
jest.mock("@/hooks/use-is-client", () => ({ useIsClient: () => mockUseIsClient() }));

const rows: UnifiedRow[] = [];

beforeEach(() => {
  mockUseIsClient.mockReturnValue(true);
  mockUseIsMobile.mockReturnValue(true);
});

describe("EventList (mobile cards)", () => {
  it("renders an empty state when there are no rows", () => {
    render(<EventList rows={rows} renderActions={() => null} onToggleExpand={() => {}} expandedRowId={null} />);
    expect(screen.getByText(/no events/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @trainers/web test -- external-data-mount`
Expected: FAIL — `external-data-cards` / `EventList` not found.

- [ ] **Step 3: Create the cards component**

```tsx
// apps/web/src/components/admin/external-data-cards.tsx
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@trainers/utils";
import type { UnifiedRow } from "./external-data-shared";

export interface EventListProps {
  rows: UnifiedRow[];
  renderActions: (row: UnifiedRow) => React.ReactNode;
  onToggleExpand: (id: string) => void;
  expandedRowId: string | null;
}

const STATUS_TONE: Record<string, string> = {
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "in-progress": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  complete: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  upcoming: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
};

/** Mobile card list mirroring the desktop events table. */
export function EventList({ rows, renderActions }: EventListProps) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No events for this selection.</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 font-semibold">
              <span className="truncate">{row.name}</span> <ExternalLink className="inline size-3 opacity-60" />
            </div>
            {renderActions(row)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{row.category}</Badge>
            <span className="text-muted-foreground">{row.date}</span>
            {row.playerCount != null && <span className="text-muted-foreground">· {row.playerCount} players</span>}
            <span className={cn("ml-auto rounded-full px-2 py-0.5 font-semibold", STATUS_TONE[row.status] ?? STATUS_TONE.pending)}>
              {row.statusDetail}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @trainers/web test -- external-data-mount`
Expected: PASS.

- [ ] **Step 5: Conditional-mount in the container**

In `external-data.tsx`:
1. Import `useIsMobile` from `@/hooks/use-mobile`, `useIsClient` from `@/hooks/use-is-client`, and `EventList` from `./external-data-cards`.
2. Near the top of the component: `const isMobile = useIsMobile(); const isClient = useIsClient();`
3. Wrap the events-table block (the `<div ref={scrollRef} ...>` virtualized table, ~2380) so that:
   - `!isClient` → render the existing CLS-safe skeleton (height ≈ `Math.max(currentRows.length, 3) * 56 + 32`px, `aria-hidden`). Use an inline `style={{ height }}` — this is a justified dynamic pixel height (add a comment), not a Tailwind arbitrary class.
   - `isClient && isMobile` → `<EventList rows={currentRows} expandedRowId={expandedRowId} onToggleExpand={(id) => setExpandedRowId(prev => prev === id ? null : id)} renderActions={(row) => <RowActions ... />} />`
   - else → the existing virtualized table.
4. Reuse the existing `RowActions` for `renderActions` (extract/lift it so both table and cards can call it — it already takes `row` + handlers).

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter @trainers/web test -- external-data`
Run: `pnpm --filter @trainers/web typecheck`
Expected: PASS / clean.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/external-data-cards.tsx apps/web/src/components/admin/__tests__/external-data-mount.test.tsx apps/web/src/components/admin/external-data.tsx
git commit -m "feat(admin): mobile card layout for the import console table"
```

---

## Task 8: Visual verification (Playwright, delegated)

**Files:** none (verification only)

- [ ] **Step 1: Delegate a Playwright pass to a haiku subagent**

Have a subagent (model: haiku) drive Playwright MCP against the running dev server: navigate to `http://localhost:3000/admin/data` and `?tab=limitless`, screenshot at desktop (1440×900) and 390×844, and run the probes:
- `document.documentElement.scrollWidth > window.innerWidth` → must be **false** at 390px (cards, no horizontal scroll).
- sub-40px tap-target count → no NEW offenders vs. baseline.

It saves screenshots to `.playwright-mcp/screenshots/` and returns ONLY a concise report (probe results + pass/fail + paths). The main agent does not run `browser_*` inline.

- [ ] **Step 2: Confirm filter-aware queue manually (or via the subagent)**

On the Limitless tab: set Format to a single regulation → the primary button reads **"Queue Matching (N)"** with N = the filtered count → clicking it queues only those. "Queue all pending" remains under the ▾.

- [ ] **Step 3: Push + enumerate CI**

```bash
git push origin feat/pokemon-usage-stats
```
Then enumerate each CI check (Lint & Typecheck, Test @trainers/web, Test packages, Analyze, CodeQL, Vercel, Supabase Preview) and fix any red before declaring done.

---

## Self-Review

- **Spec coverage:** filter-aware bulk actions → Task 1 (helpers) + Task 4 (Limitless) + Task 4/5 (RK9 matching + selected); grouped toolbar → Task 4; settings popover → Task 3; status chips → Task 2; selection bulk-bar → Task 5; active-filter emphasis → Task 6; mobile cards → Task 7; component extraction → Tasks 2–5,7; testing → Tasks 1,7,8. All spec sections covered.
- **Type consistency:** `UnifiedRow`, `RK9EventRow`, `LimitlessTournamentRow` come from `external-data-shared.ts` (verified shapes from recon). Helper names (`queueableIds`, `rosterEligibleIds`, `teamsEligibleIds`) are used identically across Tasks 1 and 4. `StatusChip`/`ExternalDataSettingsProps`/`ExternalDataToolbarProps`/`SelectionBarProps`/`EventListProps` are each defined once and imported where used.
- **Base UI caveat flagged:** the `render`-prop trigger pattern for `Popover`/`DropdownMenu` must be verified against the local components (noted in Tasks 3 + 4) — this project uses Base UI, not Radix `asChild`.
- **React Compiler:** no `useMemo`/`useCallback`/`memo` introduced; derived values computed in render.
- **No arbitrary px:** only the CLS-safe skeleton height uses an inline `style` pixel value (justified + commented); everything else uses scale tokens.
