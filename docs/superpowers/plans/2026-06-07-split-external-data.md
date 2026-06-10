# Split `external-data.tsx` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (or inline execution — the orchestrator runs this inline because the 2300-line file has repeatedly crashed background subagents). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Shrink `apps/web/src/components/admin/external-data.tsx` (2383 lines) by extracting leaf components, table helpers, the RK9 Players sub-view, and the data/handlers logic into focused files — with **zero behavior change**.

**Architecture:** Pure mechanical moves. Each task relocates a symbol (or block) to a new co-located file and re-imports it in the parent. No logic changes. Verify `typecheck` + the admin test suite green after every task; one commit per task. Leaf components first (safest), the data/handlers hook last (highest risk — stop after Task 4 if it proves too entangled).

**Tech Stack:** React 19 + React Compiler (no manual memoization), TypeScript strict, Jest. Shared types already live in `external-data-shared.ts`.

---

## Guardrails (apply to every task)

- **No behavior change.** Only move code + wire imports. Do not rename props, change logic, or "improve" anything.
- After each task: `pnpm typecheck --filter @trainers/web` (clean) and `pnpm --filter @trainers/web exec jest --testPathPattern="admin/__tests__/external-data"` (44 pass). Then `pnpm lint --filter @trainers/web` for touched files. Commit.
- The test file (`__tests__/external-data.test.tsx`) currently mocks `external-data-toolbar`, `-selection-bar`, `-cards`, `-filters`, `expanded-row-data`, `player-expanded-data` — but NOT `StatusBadge`/`RowActions`/`SortableHeader` (they render inline). Moving those to new files imported by the same parent does not change rendering, so **tests need no changes for Tasks 1–3**. If a move surfaces a test failure, reconcile it in the same task.
- `git add` only the files each task names. Parallel work touches `apps/web/src/components/data/*` (Sankey) — never stage those.

---

## File Map

| File | Action | Holds |
|------|--------|-------|
| `external-data-status-badge.tsx` | **Create** | `StatusBadge` component |
| `external-data-row-actions.tsx` | **Create** | `RowActions` + `RowActionsProps` |
| `external-data-table-helpers.tsx` | **Create** | `SortableHeader`, `toggleSort`, `compareValues`, `SortState`/`SortColumn`/`SortDirection` types |
| `external-data-players-view.tsx` | **Create** | RK9 Players sub-view (toggle is parent-owned; this renders the players table + owns player sort) |
| `use-external-data.ts` | **Create** (Task 5, conditional) | data fetch + row building + counts/tabs/chips + handlers |
| `external-data.tsx` | Modify (every task) | re-import extracted symbols; shrink |

---

## Task 1: Extract `StatusBadge`

**Files:** Create `apps/web/src/components/admin/external-data-status-badge.tsx`; modify `external-data.tsx`.

- [ ] **Step 1: Create the new file**

Move the `StatusBadge` function (currently `external-data.tsx` ~lines 2148–2277, the `function StatusBadge({ row, activeJobs }: {...}) {...}`) verbatim into a new client component file. Add the imports it needs:

```tsx
"use client";

import {
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { type UnifiedRow } from "./external-data-shared";

interface StatusBadgeProps {
  row: UnifiedRow;
  activeJobs: Map<
    string,
    { type: string; scraped?: number; total?: number }
  >;
}

export function StatusBadge({ row, activeJobs }: StatusBadgeProps) {
  // …exact body moved from external-data.tsx…
}
```
(Use the EXACT current body. The component already destructures `{ row, activeJobs }` with that inline type — promote it to `StatusBadgeProps`.)

- [ ] **Step 2: Re-import in the parent**

In `external-data.tsx`, delete the moved `StatusBadge` function and add `import { StatusBadge } from "./external-data-status-badge";` with the other `./` imports. Remove any lucide imports that are now unused in `external-data.tsx` ONLY if no other code there uses them (verify with `grep` — e.g. `Users`, `XCircle` may now be unused; `Clock`/`Loader2`/`CheckCircle2` likely still used by `RowActions`, which is still in the file until Task 2).

- [ ] **Step 3: Verify + commit**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "error TS" | head
cd /Users/gmendoza/source/trainers.gg && pnpm --filter @trainers/web exec jest --testPathPattern="admin/__tests__/external-data" 2>&1 | grep -E "Tests:|FAIL"
cd /Users/gmendoza/source/trainers.gg && pnpm lint --filter @trainers/web 2>&1 | grep -iE "external-data|error|warning" | head
```
Expected: typecheck clean, 44 pass, lint clean. Then:
```bash
git add apps/web/src/components/admin/external-data-status-badge.tsx apps/web/src/components/admin/external-data.tsx && git commit -m "refactor(admin): extract StatusBadge to its own file"
```

---

## Task 2: Extract `RowActions`

**Files:** Create `apps/web/src/components/admin/external-data-row-actions.tsx`; modify `external-data.tsx`.

- [ ] **Step 1: Create the new file**

Move `RowActionsProps` (interface) + `RowActions` (function) (currently ~lines 2278–2383) verbatim. Imports it needs:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";

import { type UnifiedRow } from "./external-data-shared";
```
Keep `RowActionsProps` exactly as defined (row, activeJobs, queuingIds, batchQueuing, isUpcomingRow, onImport, onResetEvent). Export `RowActions`.

> Verify the exact lucide icons `RowActions` uses (grep the moved body for `<Download`, `<Trash2`, `<CheckCircle2`, `<Loader2`, `<Clock` etc.) and import exactly those — no more, no less.

- [ ] **Step 2: Re-import in the parent**

Delete the moved code from `external-data.tsx`; add `import { RowActions } from "./external-data-row-actions";`. Now remove lucide icons from `external-data.tsx`'s import that are no longer referenced there (re-grep each: `Download`, `Trash2`, etc.).

- [ ] **Step 3: Verify + commit** (same commands as Task 1 Step 3)
```bash
git add apps/web/src/components/admin/external-data-row-actions.tsx apps/web/src/components/admin/external-data.tsx && git commit -m "refactor(admin): extract RowActions to its own file"
```

---

## Task 3: Extract table helpers

**Files:** Create `apps/web/src/components/admin/external-data-table-helpers.tsx`; modify `external-data.tsx`.

- [ ] **Step 1: Create the new file**

Move the sort types + helpers (currently ~lines 68–181): `SortDirection`, `SortColumn`, `SortState` (types/interface), `SortableHeader` (component, ~115–154), `toggleSort` (~155–161), `compareValues` (~162–181). Imports the `SortableHeader` needs (check its body — likely `cn` from `@/lib/utils` and sort-arrow lucide icons like `ArrowUp`/`ArrowDown`/`ArrowUpDown` or `ChevronsUpDown`):
```tsx
"use client";

import { /* exact sort icons used by SortableHeader */ } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";
export type SortColumn = /* exact union from the file */;
export interface SortState { column: SortColumn; direction: SortDirection; }
// SortableHeader, toggleSort, compareValues …
```
Export all five symbols.

- [ ] **Step 2: Re-import + verify the SortColumn union still covers all callers**

In `external-data.tsx`: `import { SortableHeader, toggleSort, compareValues, type SortState, type SortColumn } from "./external-data-table-helpers";`. Remove the moved definitions + now-unused lucide sort-icon imports. Confirm `SortColumn` includes `"source"` (added in the merge) — keep the union identical to current.

- [ ] **Step 3: Verify + commit**
```bash
git add apps/web/src/components/admin/external-data-table-helpers.tsx apps/web/src/components/admin/external-data.tsx && git commit -m "refactor(admin): extract table sort helpers (SortableHeader, toggleSort, compareValues)"
```

---

## Task 4: Extract the RK9 Players sub-view

**Files:** Create `apps/web/src/components/admin/external-data-players-view.tsx`; modify `external-data.tsx`.

The Players view is interleaved with the events view: a players query (~1241–1263), player sort state + `togglePlayerSort` + `sortedPlayers` (~1283–1330), the players search input (~1445–1460), and the players table render (~1614–1663+). Extract it into a self-contained component that owns its own sort state and renders its own table; the parent keeps the `Events │ Players` toggle and passes the inputs the view needs.

- [ ] **Step 1: Define the component contract**

Create `external-data-players-view.tsx` exporting:
```tsx
"use client";
// imports: useState, useVirtualizer, useSupabaseQuery, PlayerExpandedData,
// SortableHeader/toggleSort from table-helpers, ChevronDown/ChevronRight, cn

interface PlayersViewProps {
  /** Active when source=rk9 + players sub-view is selected — gates the query. */
  active: boolean;
  /** Search string (shared search box value from the parent). */
  search: string;
  /** Bump to refetch (parent's refreshKey). */
  refreshKey: number;
}

export function PlayersView({ active, search, refreshKey }: PlayersViewProps) {
  // moved: player query (gated on `active`), playerSort state, togglePlayerSort,
  // filteredPlayers (filter by `search`), sortedPlayers, the virtualized players
  // table render (header + rows + PlayerExpandedData expansion + empty/loading states)
}
```
Move the player query, `PlayerSortCol`, `playerSort`/`setPlayerSort`, `togglePlayerSort`, `filteredPlayers`, `sortedPlayers`, the players virtualizer, and the players table JSX out of `external-data.tsx` into this component. The query's gate `rk9View !== "players"` becomes `!active`.

- [ ] **Step 2: Wire it in the parent**

In `external-data.tsx`, where the players table currently renders (`filters.source === "rk9" && rk9View === "players" && (…)`), replace the inline block with:
```tsx
{filters.source === "rk9" && rk9View === "players" && (
  <PlayersView
    active={filters.source === "rk9" && rk9View === "players"}
    search={filters.search}
    refreshKey={refreshKey}
  />
)}
```
Keep the `Events │ Players` toggle (`rk9View`/`setRk9View`) in the parent. Delete the moved player state/query/helpers from the parent. The parent's own players search input (~1445) moves into the view OR stays in the parent feeding `search` — keep it in the parent (it's part of the shared filter row) and pass `filters.search`.

- [ ] **Step 3: Reconcile the player tests**

The test file has a "players sub-view" test (it clicks to the players view and asserts `player-expanded-row`). `player-expanded-data` is already mocked. Since `PlayersView` is a NEW internal component (not mocked), it renders normally — the test should still pass. Run the suite; if the player test relied on inline structure, adjust selectors minimally (do not weaken).

- [ ] **Step 4: Verify + commit**
```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "error TS" | head
cd /Users/gmendoza/source/trainers.gg && pnpm --filter @trainers/web exec jest --testPathPattern="admin/__tests__/external-data" 2>&1 | grep -E "Tests:|FAIL|✕"
git add apps/web/src/components/admin/external-data-players-view.tsx apps/web/src/components/admin/external-data.tsx apps/web/src/components/admin/__tests__/external-data.test.tsx && git commit -m "refactor(admin): extract RK9 Players sub-view to its own component"
```

---

## Task 5 (conditional): Extract `use-external-data.ts`

**Files:** Create `apps/web/src/components/admin/use-external-data.ts`; modify `external-data.tsx`.

This moves the data layer + handlers out of the component into a hook, leaving `ExternalData` as mostly render. It is the highest-risk step (≈700 lines of state, derived values, effects, and ~25 handlers with interdependencies). **Attempt only after Tasks 1–4 are green and committed. If midway the coupling proves too tangled to keep green, abandon this task (revert the working tree), leave a note, and stop — Tasks 1–4 already roughly halve the file.**

- [ ] **Step 1: Inventory what the render uses**

Before moving anything, list every value/handler the JSX (`return (...)`) references. The hook must return exactly that set. Candidates to move: all `useState`/`useEffect`/`useRef`, the `useSupabaseQuery` calls (rk9/limitless), `FORMAT_ID_TO_CODE`, `rk9Rows`/`limitlessRows`/`allRows`/`filteredRows`/`sourceRows`, counts/`tabs`/`chips`/`importMatchingCount`/`importAllCount`/`isImportableRow`, the skipped breakdown, and all `handle*`/`save*` functions. Keep `rk9View`/`setRk9View` either in the hook or the component (whichever the render + PlayersView wiring makes cleaner).

- [ ] **Step 2: Create the hook**

```tsx
"use client";
// all the imports the moved logic needs (react, supabase, actions, utils, shared types, display-status, etc.)

export function useExternalData() {
  // …all state, queries, derived data, effects, handlers…
  return {
    /* everything the render needs: filters, setFilters, filteredRows, tabs,
       chips, counts, handlers (onSync/handleImport/handleImportMatching/
       handleImportAll/handleRecomputeUsage/handleCalculateUsage/…),
       settings handlers, selection state, activeJobs, refreshKey, etc. */
  } as const;
}
```
Preserve the React Compiler rules (no manual memoization) and the `set-state-in-effect` patterns (the `UNINITIALIZED` Symbol reset, `useLayoutEffect` mobile guard if present) EXACTLY — move them as-is.

- [ ] **Step 3: Slim the component**

`ExternalData` becomes: `const { …everything } = useExternalData();` followed by the JSX return (and the small presentational sub-pieces). No logic beyond destructuring + render.

- [ ] **Step 4: Verify + commit**
```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "error TS" | head
cd /Users/gmendoza/source/trainers.gg && pnpm --filter @trainers/web exec jest --testPathPattern="admin/__tests__/external-data" 2>&1 | grep -E "Tests:|FAIL|✕"
cd /Users/gmendoza/source/trainers.gg && pnpm lint --filter @trainers/web 2>&1 | grep -iE "external-data|use-external|error|warning" | head
git add apps/web/src/components/admin/use-external-data.ts apps/web/src/components/admin/external-data.tsx && git commit -m "refactor(admin): extract data + handlers into useExternalData hook"
```

---

## Task 6: Push + verify

- [ ] Push the branch and confirm CI green (enumerate each check).
```bash
cd /Users/gmendoza/source/trainers.gg && git push origin trainers-data && gh pr checks 342
```
- [ ] Final line counts (sanity): `wc -l apps/web/src/components/admin/external-data*.tsx apps/web/src/components/admin/use-external-data.ts`

---

## Verification Checklist

- [ ] Each task left typecheck + 44 admin tests + lint green before its commit.
- [ ] No behavior change — the `/admin/data` console renders identically (Source filter, status tabs, Sync/Import, columns, Players toggle).
- [ ] `external-data.tsx` is substantially smaller (target: < ~900 lines after Task 4; < ~400 after Task 5).
- [ ] New files are focused and independently readable.
- [ ] CI green on PR #342.
