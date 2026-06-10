# Import Console — Unified View + Shared Vocabulary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the RK9 and Limitless import tabs into one table with a Source filter, a single shared vocabulary (Sync / Import / one status set), and visible cross-source Usage feedback.

**Architecture:** A source-aware `deriveDisplayStatus(row)` maps both pipelines to one status set (`pending · in-progress · imported · failed · skipped`). The two `<TabsContent>` panels collapse into one table fed by a unified `ImportFilterState` (with a `source` field); status tabs + a Source segmented control drive it. Per-row "Import" dispatches to the existing source-specific op. Usage becomes one global control with inline loading + result.

**Tech Stack:** React 19 + React Compiler (no manual memoization), Tailwind, shadcn/Base UI, Jest + Testing Library. Incremental tasks; each leaves a green, shippable state.

---

## Execution notes (read first)

- **Base branch:** This refactor DEPENDS on code that exists only on `trainers-data` (PR #342, unmerged) — `external-data-status-tabs.tsx`, `limitless-display-status.ts`, the `displayStatus` wiring, the skipped tab/chip. **Do NOT branch off `main`** (it lacks the foundation and Task 1 won't compile). Base = `trainers-data` (stacked on #342) unless #342 is merged first. **Confirm with the user before dispatching.**
- **Task order (revised):** `T1 → T2 → T7 (usage feedback, pulled forward) → T3+T4 (merged) → T5 → T6 → T8`. T7 is independent of the table merge, addresses a distinct user pain, and banks a visible win early; do it before the risky merge.
- **T3 + T4 are ONE task/commit.** The filter-state unification (T3) and the render merge (T4) are atomic — the shared `ExternalDataFilters` is called from both source branches, so you cannot half-merge and stay green. Execute and commit them together; do not commit T3 alone.
- **T4 is the big one.** Before editing, read the entire RK9 + Limitless `<TabsContent>` render region and the shared table render. Expect a review iteration — a fresh subagent will not one-shot the merge the way the isolated tasks land.
- **Before T2/T8:** `grep -rn 'source: "rk9"\|source: "limitless"\|: UnifiedRow' apps/web/src/components/admin` to confirm every `UnifiedRow` fixture sets the now-required `displayStatus` (the shared-test factories already do as of commit `6ea8cd8`; the `external-data.test.tsx` integration fixtures may not — fix them in the task that makes the field required, T2).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/components/admin/display-status.ts` | **Create** | Source-aware `deriveDisplayStatus(row)` (re-exports the Limitless helper) |
| `apps/web/src/components/admin/__tests__/display-status.test.ts` | **Create** | Unit tests for both sources |
| `external-data-shared.ts` | Modify | `displayStatus` required on `UnifiedRow`; new unified `ImportFilterState` + `INITIAL_IMPORT_FILTERS`; `importableIds` |
| `external-data.tsx` | Modify | Set `displayStatus` both sources; one filtered table + Source filter; unified status tabs; per-row `handleImport` dispatcher; global usage handlers; drop Queue column |
| `external-data-filters.tsx` | Modify | Source segmented control; one filter state; type filter = tier-or-format; platform/country source-conditional |
| `external-data-toolbar.tsx` | Modify | Unified Sync + Import buttons (contextual to Source); global Usage control with visible loading + last-calculated |
| `external-data-selection-bar.tsx` | Modify | Unified "Import selected (N)" dispatching per source (RK9 Reset kept) |
| `actions/usage.ts` | Modify | `calculateAllSourceUsage()` — cross-source calculate wrapper |
| test files alongside the above | Modify | Reconcile + cover new behavior |

**Sequencing principle:** data model → RK9 gets unified status tabs (still two source tabs) → merge into one table → vocabulary rename → drop Queue column → usage feedback → tests. Each task compiles + passes tests.

---

## Task 1: Source-aware `deriveDisplayStatus`

**Files:**
- Create: `apps/web/src/components/admin/display-status.ts`
- Create: `apps/web/src/components/admin/__tests__/display-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/admin/__tests__/display-status.test.ts`:

```typescript
import { deriveDisplayStatus } from "../display-status";
import type { UnifiedRow } from "../external-data-shared";

const MAPPED = "gen9championsvgc2026regma";

function limRow(
  o: Partial<{ import_status: string | null; format_id: string; data_imported_at: string | null }> = {}
): UnifiedRow {
  return {
    id: "l", source: "limitless", name: "n", category: "M-A", date: "2026-01-01",
    playerCount: 1, status: "pending", statusDetail: "", displayStatus: "pending",
    error: null, platform: null, isOnline: null, hasData: false, country: null,
    limitless: {
      tournament_id: "t", name: "n", format_id: o.format_id ?? MAPPED, date: "2026-01-01",
      player_count: 1, platform: null, is_online: null, decklists: false,
      data_imported_at: o.data_imported_at ?? null, import_status: o.import_status ?? null,
      import_requested_at: null, import_error: null, import_attempts: 0,
    },
  };
}

function rk9Row(normalizedStatus: string): UnifiedRow {
  return {
    id: "r", source: "rk9", name: "n", category: "masters", date: "2026-01-01",
    playerCount: 1, status: normalizedStatus, statusDetail: "", displayStatus: "pending",
    error: null, platform: null, isOnline: null, hasData: false, country: null,
    rk9: {
      event_id: "e", name: "n", tier: "masters", format_id: null, date_start: "2026-01-01",
      date_end: null, location_city: null, location_country: null, player_count: 1,
      has_team_lists: false, import_status: "pending", import_error: null, teams_imported_count: 0,
    },
  };
}

describe("deriveDisplayStatus", () => {
  it.each([
    ["limitless CUSTOM → skipped", limRow({ format_id: "CUSTOM", import_status: "skipped" }), "skipped"],
    ["limitless queued → in-progress", limRow({ import_status: "queued" }), "in-progress"],
    ["limitless importing → in-progress", limRow({ import_status: "importing" }), "in-progress"],
    ["limitless imported → imported", limRow({ data_imported_at: "2026-01-02" }), "imported"],
    ["limitless failed → failed", limRow({ import_status: "failed" }), "failed"],
    ["limitless pending → pending", limRow({ import_status: null }), "pending"],
  ])("%s", (_l, row, expected) => {
    expect(deriveDisplayStatus(row)).toBe(expected);
  });

  it.each([
    ["rk9 upcoming → pending", rk9Row("upcoming"), "pending"],
    ["rk9 pending → pending", rk9Row("pending"), "pending"],
    ["rk9 in-progress → in-progress", rk9Row("in-progress"), "in-progress"],
    ["rk9 complete → imported", rk9Row("complete"), "imported"],
    ["rk9 failed → failed", rk9Row("failed"), "failed"],
  ])("%s", (_l, row, expected) => {
    expect(deriveDisplayStatus(row)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/display-status" 2>&1 | tail -15
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `apps/web/src/components/admin/display-status.ts`:

```typescript
import { type UnifiedRow } from "./external-data-shared";
import {
  deriveLimitlessDisplayStatus,
  type DisplayStatus,
} from "./limitless-display-status";

export { type DisplayStatus } from "./limitless-display-status";

/**
 * Map any import row (RK9 or Limitless) to one shared display status:
 * `pending · in-progress · imported · failed · skipped`.
 *
 * - Limitless delegates to `deriveLimitlessDisplayStatus` (queued+importing →
 *   in-progress; unmappable format → skipped).
 * - RK9 maps from its normalized `row.status`: complete → imported,
 *   in-progress (roster/teams) → in-progress, failed → failed, and both
 *   `pending` and future `upcoming` events → pending. RK9 has no `skipped`.
 */
export function deriveDisplayStatus(row: UnifiedRow): DisplayStatus {
  if (row.source === "limitless" && row.limitless) {
    return deriveLimitlessDisplayStatus({
      import_status: row.limitless.import_status,
      format_id: row.limitless.format_id,
      data_imported_at: row.limitless.data_imported_at,
    });
  }
  // RK9 — map the normalized status to the shared vocabulary.
  switch (row.status) {
    case "complete":
      return "imported";
    case "in-progress":
      return "in-progress";
    case "failed":
      return "failed";
    default:
      return "pending"; // includes "pending" and "upcoming"
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/display-status" 2>&1 | tail -15
```
Expected: PASS (11 cases).

- [ ] **Step 5: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/display-status.ts apps/web/src/components/admin/__tests__/display-status.test.ts && git commit -m "feat(admin): add source-aware deriveDisplayStatus (unified RK9+Limitless status)"
```

---

## Task 2: Set `displayStatus` on both sources + RK9 status tabs

**Files:**
- Modify: `apps/web/src/components/admin/external-data-shared.ts`
- Modify: `apps/web/src/components/admin/external-data.tsx`

Goal: every row carries `displayStatus`; RK9 gets the same `StatusTabs` (replacing its dropdown). Still two source tabs after this task — it's an intermediate green state.

- [ ] **Step 1: Make `displayStatus` required on `UnifiedRow`**

In `external-data-shared.ts`, change the field from optional to required (it was added optional in the prior redesign):
```typescript
  /** Shared display status (both sources) — drives status tabs + counts. */
  displayStatus: DisplayStatus;
```

- [ ] **Step 2: Set `displayStatus` via the helper in BOTH row maps**

In `external-data.tsx`, import the helper:
```typescript
import { deriveDisplayStatus } from "./display-status";
```
In the `rk9Rows` map, replace the current `displayStatus` assignment (if present) / add it, computing AFTER the row's other fields by building the object then deriving — simplest is to compute from the in-construction values. Since `deriveDisplayStatus` needs `source`, `status`, and `rk9/limitless`, set `displayStatus` in a follow-up `.map`:
```typescript
  const rk9Rows: UnifiedRow[] = (rk9Events ?? [])
    .map((e) => { /* ...existing object WITHOUT displayStatus... */ })
    .map((row) => ({ ...row, displayStatus: deriveDisplayStatus(row) }));
```
Do the same for `limitlessRows` (replace its inline `deriveLimitlessDisplayStatus(...)` with the post-map `deriveDisplayStatus(row)` for consistency):
```typescript
  const limitlessRows: UnifiedRow[] = (limitlessTournaments ?? [])
    .map((t) => ({ /* ...existing object; you may drop the inline displayStatus here... */ }))
    .map((row) => ({ ...row, displayStatus: deriveDisplayStatus(row) }));
```
> Use the placeholder approach (decided): the FIRST map sets `displayStatus: "pending"` on the row literal (so it satisfies the now-required field), and the SECOND map overwrites it with `deriveDisplayStatus(row)`. Do this for both `rk9Rows` and `limitlessRows`. (Don't use `Omit<>` typing — the placeholder is simpler and the value is always recomputed.)

- [ ] **Step 3: Build RK9 status-tab counts + tabs**

Where `limitlessStatusCounts`/`limitlessTabs` are built, add the RK9 equivalents using the SAME unified labels:
```typescript
  const rk9StatusCounts = rk9Rows.reduce(
    (acc, r) => { acc[r.displayStatus] = (acc[r.displayStatus] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const rk9Tabs: StatusTab[] = [
    { value: "all", label: "All", count: rk9Rows.length },
    { value: "pending", label: "Pending", count: rk9StatusCounts["pending"] ?? 0 },
    { value: "in-progress", label: "In progress", count: rk9StatusCounts["in-progress"] ?? 0 },
    { value: "imported", label: "Imported", count: rk9StatusCounts["imported"] ?? 0 },
    { value: "failed", label: "Failed", count: rk9StatusCounts["failed"] ?? 0 },
  ];
```

- [ ] **Step 4: Filter RK9 on `displayStatus`; render RK9 StatusTabs**

In `filteredRk9Rows`, change the status line to `if (f.status !== "all" && row.displayStatus !== f.status) return false;`. Above the RK9 `<ExternalDataFilters>` render (the one with `rk9Filters`), add `<StatusTabs tabs={rk9Tabs} active={rk9Filters.status} onChange={(v) => setRk9Filters((p) => ({ ...p, status: v }))} />`. In `external-data-filters.tsx`, hide the status `<Select>` for RK9 too (it already renders only for `isRk9` from the prior task — now hide for both; the dropdown is fully replaced by tabs). Remove the `{... isRk9 && renderStatusSelect()}` gate so neither source shows it; delete `renderStatusSelect` and its imports if now unused.

- [ ] **Step 5: Typecheck + admin tests**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "external-data|display-status" | head
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/external-data" 2>&1 | tail -20
```
Fix type errors from your changes; reconcile tests asserting the RK9 status dropdown to target tabs.

- [ ] **Step 6: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/external-data-shared.ts apps/web/src/components/admin/external-data.tsx apps/web/src/components/admin/external-data-filters.tsx && git commit -m "feat(admin): unified displayStatus + RK9 status tabs (both sources)"
```

---

## Task 3: Unified `ImportFilterState` + Source segmented control

**Files:**
- Modify: `apps/web/src/components/admin/external-data-shared.ts`
- Modify: `apps/web/src/components/admin/external-data-filters.tsx`

- [ ] **Step 1: Add the unified filter state**

In `external-data-shared.ts`, add (keep the old `RK9FilterState`/`LimitlessFilterState` for now so the file compiles; they're removed in Task 4):
```typescript
export interface ImportFilterState {
  source: "all" | "rk9" | "limitless";
  search: string;
  status: string;       // unified display status or "all"
  type: string;         // tier (RK9) or format code (Limitless) or "all"
  platform: PlatformFilter; // Limitless only; "all" otherwise
  country: string;          // RK9 only; "all" otherwise
  hasData: HasDataFilter;
  dateFrom: string;
  dateTo: string;
  minPlayers: string;
}

export const INITIAL_IMPORT_FILTERS: ImportFilterState = {
  source: "all", search: "", status: "all", type: "all",
  platform: "all", country: "all", hasData: "all",
  dateFrom: "", dateTo: "", minPlayers: "",
};
```

- [ ] **Step 2: Add the Source segmented control + accept the unified state in filters**

In `external-data-filters.tsx`, add a `Source` segmented control (3 buttons All/RK9/Limitless) at the start of the filter row, bound to `filters.source`. Reuse the existing inline-select styling. Render the **Type** select (tier options when source is rk9-or-all collapsed to a generic "Type", format options for limitless) and make **platform** (limitless) / **country** (rk9) conditional on the active source (hidden when the other source is exclusively selected). The component now takes a single `filters: ImportFilterState` + `onChange: (patch: Partial<ImportFilterState>) => void` instead of the two per-tab props. Keep the active-filter chips + Clear all, driven off `INITIAL_IMPORT_FILTERS`.

(Full control markup: mirror the existing `renderFormatOrTierSelect` pattern; the Source control is a 3-button segmented group styled like `external-data-status-tabs` but smaller. Provide `formatOptions` and `tierOptions` as before; show the Type select's options based on `filters.source`.)

- [ ] **Step 3: Typecheck (filters component compiles against the new props in Task 4)**

This task wires the component's new prop shape; `external-data.tsx` is updated to pass `ImportFilterState` in Task 4. To keep this task green, TEMPORARILY keep the old props optional alongside the new ones, OR land Tasks 3+4 in one commit. **Recommended: land Tasks 3 + 4 together** (the filter component and its only caller change in lockstep). If splitting, gate with optional props. Commit happens at end of Task 4.

---

## Task 4: Merge the two tabs into one table

**Files:**
- Modify: `apps/web/src/components/admin/external-data.tsx`

This is the structural core. Replace the top-level `<Tabs value={activeTab}>` (RK9/Limitless `<TabsContent>`) with a single table region driven by one `ImportFilterState`.

- [ ] **Step 1: Replace per-source filter state with one state**

Replace `const [rk9Filters, ...]` and `const [limFilters, ...]` with:
```typescript
const [filters, setFilters] = useState<ImportFilterState>(INITIAL_IMPORT_FILTERS);
```
Remove `activeTab`/`setActiveTab` and the top `<Tabs>`/`<TabsList>`/`<TabsTrigger>` for RK9/Limitless.

- [ ] **Step 2: One unified row list + filter pass**

Build `const allRows: UnifiedRow[] = [...rk9Rows, ...limitlessRows];` then a single `filteredRows` that applies, in order: `filters.source` (skip rows whose `row.source` ≠ source unless "all"), `filters.status` (vs `row.displayStatus`), `filters.type` (vs `row.category`), `filters.platform` (limitless rows only), `filters.country` (rk9 rows only), `hasData`, date range, minPlayers, and search (name/id/category). Sort with the existing `limSort`-style comparator (keep one `sort` state).

- [ ] **Step 3: Unified status-tab counts over the source-filtered rows**

Counts are computed over rows matching the current `source` filter (so tab counts reflect the visible source). Build one `tabs: StatusTab[]`:
```typescript
  const sourceRows = filters.source === "all" ? allRows : allRows.filter((r) => r.source === filters.source);
  const counts = sourceRows.reduce((acc, r) => { acc[r.displayStatus] = (acc[r.displayStatus] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const tabs: StatusTab[] = [
    { value: "all", label: "All", count: sourceRows.length },
    { value: "pending", label: "Pending", count: counts["pending"] ?? 0 },
    { value: "in-progress", label: "In progress", count: counts["in-progress"] ?? 0 },
    { value: "imported", label: "Imported", count: counts["imported"] ?? 0 },
    { value: "failed", label: "Failed", count: counts["failed"] ?? 0 },
    { value: "skipped", label: "Skipped", count: counts["skipped"] ?? 0, tone: "skipped" },
  ];
```
(The Skipped tab shows 0 when source = rk9 — acceptable; optionally hide it when `counts["skipped"] === 0 && filters.source === "rk9"`.)

- [ ] **Step 4: One table render**

Replace the two `<TabsContent>` bodies with ONE render: stat chips (unified), the toolbar, the filter row (`<ExternalDataFilters filters={filters} onChange={(p) => setFilters((s) => ({ ...s, ...p }))} ... />`), the `<StatusTabs tabs={tabs} active={filters.status} onChange={(v) => setFilters((s) => ({ ...s, status: v }))} />`, the skipped banner (when `filters.status === "skipped"`), then the table/cards over `filteredRows`.

**Columns:** checkbox · **Source** · Event · **Format** · Date · Players · Status · Actions (the Limitless-only Queue column is removed in Task 6).
- **Source** is a dedicated column showing an `RK9` / `LIMITLESS` badge (slate/amber for RK9, blue for Limitless) — not just an inline badge.
- **Format** replaces the old "Type" column and shows the event's **regulation/format**, NOT the age division. Today `row.category` = tier (`masters`) for RK9 / format code for Limitless. **Change the row build** so `category` (or a new `format` field) holds a regulation label for BOTH sources: Limitless → existing `FORMAT_ID_TO_CODE[format_id] ?? format_id`; RK9 → a regulation label derived from `row.rk9.format_id` (map via `@trainers/pokemon` `getFormatById(...)?.label`/code, or the existing `FORMAT_ID_TO_CODE`), falling back to `"—"` when `format_id` is null. Do NOT show tier (`Masters`/`Seniors`/`Juniors`) as the Format value.
- The RK9 **tier** is de-emphasized: it is no longer a column. (Keep the tier as a secondary filter for now only if it already exists and is cheap; otherwise drop it — it is not event-level-important.)
- The RK9 Players sub-view becomes an `Events │ Players` toggle rendered only when `filters.source === "rk9"`.

Update the grid-template column tracks to add the Source column and keep Format/Date/Players/Status/Actions consistent across all rows (one template for the unified table).

- [ ] **Step 5: Unified stat chips**

Build one `chips: StatusChip[]` over `sourceRows` using the unified counts (synced=total, pending, in-progress, imported, failed, skipped). Pass to the toolbar.

- [ ] **Step 6: Typecheck + tests + commit (Tasks 3 + 4)**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "external-data" | head -30
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/external-data" 2>&1 | tail -25
```
Reconcile tests that referenced `activeTab`/the two source tabs. Then:
```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/external-data.tsx apps/web/src/components/admin/external-data-filters.tsx apps/web/src/components/admin/external-data-shared.ts && git commit -m "feat(admin): merge RK9+Limitless into one table with a Source filter"
```

---

## Task 5: Shared vocabulary — Sync / Import

**Files:**
- Modify: `apps/web/src/components/admin/external-data.tsx`
- Modify: `apps/web/src/components/admin/external-data-toolbar.tsx`
- Modify: `apps/web/src/components/admin/external-data-selection-bar.tsx`

- [ ] **Step 1: Per-row Import dispatcher**

In `external-data.tsx` add:
```typescript
async function handleImport(row: UnifiedRow) {
  if (row.source === "limitless") {
    await handleQueueOne(row.limitless!.tournament_id);
    return;
  }
  // RK9: scrape the next needed step
  const s = row.rk9!.import_status;
  if (s === "pending" || s === "failed") await handleScrapeRoster(row.rk9!.event_id);
  else await handleScrapeTeams(row.rk9!.event_id);
}
```
In `RowActions`, replace the per-source buttons with a single **Import** button (label "Import") that calls `onImport(row)`, shown when `row.displayStatus === "pending" || row.displayStatus === "failed" || (row.source === "rk9" && row.displayStatus === "in-progress")` (RK9 multi-step still needs a nudge to go roster→teams). Keep the RK9 Reset button (source-conditional). Upcoming rows show no Import (already the case via displayStatus pending + the existing upcoming guard — keep that guard).

- [ ] **Step 2: Toolbar — Sync + Import matching/all**

In `external-data-toolbar.tsx`, replace the RK9 "Discover/Scrape Rosters/Scrape Teams" group and the Limitless "Sync/Queue" group with ONE group: **Sync** + **Import matching (N) ▾** (dropdown: **Import all**). Wire `onSync`/`onImportMatching`/`onImportAll` + `importMatchingCount`/`importAllCount`. In `external-data.tsx`, `onSync` runs the source-appropriate sync (RK9 discover + Limitless sync; when source = all, run both); `onImportMatching` dispatches `handleImport` across `filteredRows` that are importable; `onImportAll` across all importable rows. `importableIds`/eligibility uses `displayStatus ∈ {pending, failed}` plus RK9 in-progress.

- [ ] **Step 3: Selection bar — Import selected**

In `external-data-selection-bar.tsx`, replace the per-source action buttons with **Import selected (N)** (calls a handler that runs `handleImport` over selected importable rows) + keep **Reset (N)** for RK9-only selected rows. Drop the `tab` branching where it only changed labels.

- [ ] **Step 4: Typecheck + tests + commit**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "external-data" | head
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/external-data" 2>&1 | tail -20
git add apps/web/src/components/admin/external-data.tsx apps/web/src/components/admin/external-data-toolbar.tsx apps/web/src/components/admin/external-data-selection-bar.tsx && git commit -m "feat(admin): unify import vocabulary — Sync + Import for both sources"
```

---

## Task 6: Drop the Queue column

**Files:**
- Modify: `apps/web/src/components/admin/external-data.tsx`

- [ ] **Step 1: Remove the Limitless-only Queue column**

Remove the "Queue" header + its cell from the table grid (the column that showed `formatTimeAgo(import_requested_at)` / "started …"). Move that timing into the **Status** column's live-detail (it likely already shows it for queued/importing; ensure the queued/importing sub-label remains). Update the grid-template column counts accordingly (drop the Queue track from both header and rows).

- [ ] **Step 2: Typecheck + visual + commit**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "external-data" | head
git add apps/web/src/components/admin/external-data.tsx && git commit -m "feat(admin): drop Queue column — timing folded into Status detail"
```

---

## Task 7: Global Usage feedback

**Files:**
- Modify: `apps/web/src/actions/usage.ts`
- Modify: `apps/web/src/components/admin/external-data.tsx`
- Modify: `apps/web/src/components/admin/external-data-toolbar.tsx`

- [ ] **Step 1: Cross-source calculate action**

In `actions/usage.ts`, add a wrapper that calculates across all sources and aggregates:
```typescript
export async function calculateAllSourceUsage(): Promise<
  ActionResult<{ eventsComputed: number; formatsProcessed: number; bucketsWritten: number }>
> {
  try {
    const sources = ["rk9", "limitless"] as const; // first_party computed by the rollup itself
    let eventsComputed = 0, formatsProcessed = 0, bucketsWritten = 0;
    for (const s of sources) {
      const r = await calculateSourceUsage(s);
      if (!r.success) throw new Error(r.error);
      eventsComputed += r.data.eventsComputed;
      formatsProcessed += r.data.formatsProcessed;
      bucketsWritten += r.data.bucketsWritten;
    }
    return { success: true, data: { eventsComputed, formatsProcessed, bucketsWritten } };
  } catch (e) {
    return { success: false, error: getErrorMessage(e, "Failed to calculate usage") };
  }
}
```
(Add a test in `apps/web/src/actions/__tests__/usage.test.ts` mocking `calculateSourceUsage` twice and asserting the summed result + the failure path.)

- [ ] **Step 2: One global usage state + handler**

In `external-data.tsx`, collapse `calculatingRk9`/`calculatingLimitless` into one `calculatingUsage` boolean and one message; replace `handleCalculateUsage(source)` with a global `handleCalculateUsage()` that calls `calculateAllSourceUsage()`, shows a result **toast** (`toast.success("Computed N events · M formats · K buckets")` / `toast.error(...)`), and sets a `lastCalculatedAt` (from the rollup status or `Date.now()`). Keep `handleRecomputeUsage` (already global via `triggerUsageRollup`), adding the same toast on result.

- [ ] **Step 3: Visible Usage control in the toolbar**

In `external-data-toolbar.tsx`, the Usage control sits in the SHARED group (not contextual to source). When `recomputingUsage || calculatingUsage`, the Usage trigger shows a spinner + "Recalculating usage…" and is disabled (so feedback is visible even though the actions are in a dropdown). Add a subtle "last calculated {formatTimeAgo(lastCalculatedAt)}" line next to it. Wire `onCalculateUsage` to the new global handler (no source arg).

- [ ] **Step 4: Typecheck + tests + commit**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="actions/__tests__/usage|admin/__tests__/external-data" 2>&1 | tail -20
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | tail -5
git add apps/web/src/actions/usage.ts apps/web/src/actions/__tests__/usage.test.ts apps/web/src/components/admin/external-data.tsx apps/web/src/components/admin/external-data-toolbar.tsx && git commit -m "feat(admin): global cross-source usage calc + visible recompute feedback"
```

---

## Task 8: Integration tests + Playwright verification

**Files:**
- Modify: `apps/web/src/components/admin/__tests__/external-data.test.tsx`

- [ ] **Step 1: Reconcile + extend integration tests**

Run the admin suite; fix assertions tied to the old two-tab layout / per-source verbs. Add a `describe("unified import console")` with a fixture mixing RK9 + Limitless rows asserting:
- Source filter = RK9 shows only RK9 rows (and Limitless only Limitless); All shows both with source badges.
- Unified status tabs show combined counts over the source-filtered rows.
- Clicking **Import** on a Limitless row calls the queue action; on an RK9 row calls the scrape action (mock both, assert which fired).
- Recompute/Calculate enters a loading state (Usage trigger disabled + "Recalculating…") and shows a result toast.

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/external-data|display-status" 2>&1 | tail -25
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | tail -5
cd /Users/gmendoza/source/trainers.gg && pnpm lint --filter @trainers/web 2>&1 | grep -iE "admin/external|display-status|error|warning" | head
```

- [ ] **Step 2: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/__tests__/external-data.test.tsx && git commit -m "test(admin): cover unified import console (source filter, import dispatch, usage feedback)"
```

- [ ] **Step 3: Manual verification (Playwright MCP, dev server in tmux `trainers_gg` window 1)**

`/admin/data` → confirm: one table; Source segmented filter (All/RK9/Limitless) narrows rows; per-row source badges; unified status tabs with combined counts; one **Import** verb on rows + **Import matching/all** + **Sync** in the toolbar; Status column live-detail (Teams X/Y for RK9, queued/importing timing for Limitless, ⊘ Skipped); Recompute/Calculate shows spinner + "Recalculating…" then a result toast + "last calculated" line; mobile width: table→cards, tabs scroll, no overflow.

---

## Verification Checklist

- [ ] `deriveDisplayStatus` unit tests pass for both sources (upcoming→pending, queued/importing→in-progress, complete→imported, CUSTOM→skipped).
- [ ] One table with a Source filter; no top RK9/Limitless tabs remain.
- [ ] Unified status tabs + chips; counts reflect the source filter; sum to the source total.
- [ ] Single **Sync** + **Import** vocabulary everywhere (toolbar, rows, selection bar); per-row Import dispatches the correct underlying op.
- [ ] Queue column gone; timing in Status detail.
- [ ] Usage is one global control with visible loading + result toast + last-calculated; cross-source.
- [ ] Typecheck, lint, admin + usage test suites green.
- [ ] Mobile: cards swap, tabs scroll, no horizontal overflow.
