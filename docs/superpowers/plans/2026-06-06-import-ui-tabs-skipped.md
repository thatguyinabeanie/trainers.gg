# Import Admin UI — Status Tabs + Skipped Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the import admin's status dropdown with tabs (including a first-class **Skipped** tab), surface a **skipped** count in the stat strip, and explain *which* formats were skipped — all derived client-side.

**Architecture:** A pure `deriveLimitlessDisplayStatus()` helper assigns each Limitless row exactly one display status (imported → real pipeline state → skipped → pending; failed never absorbed into skipped). A generic `StatusTabs` component renders tab + count chips and replaces the status `<Select>` in `external-data-filters.tsx`. `external-data.tsx` computes per-status counts + a skipped per-format breakdown and wires it all up. No DB migration.

**Tech Stack:** React 19 + React Compiler (no manual memoization), Tailwind, shadcn/Base UI, Jest + Testing Library. Skipped = `!ALL_VALID_FORMATS.has(format_id)` (from `@/lib/limitless`).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/components/admin/limitless-display-status.ts` | **Create** | `DisplayStatus` type + `deriveLimitlessDisplayStatus()` |
| `apps/web/src/components/admin/__tests__/limitless-display-status.test.ts` | **Create** | Unit tests for the helper |
| `apps/web/src/components/admin/external-data-status-tabs.tsx` | **Create** | Generic tab+count row component |
| `apps/web/src/components/admin/__tests__/external-data-status-tabs.test.tsx` | **Create** | Component tests |
| `apps/web/src/components/admin/external-data-status-chips.tsx` | Modify | Add `skipped` tone |
| `apps/web/src/components/admin/external-data-shared.ts` | Modify | Add optional `displayStatus` to `UnifiedRow`; route `queueableIds` through it |
| `apps/web/src/components/admin/external-data-filters.tsx` | Modify | Show the status `<Select>` for **RK9 only** (Limitless uses tabs) |
| `apps/web/src/components/admin/external-data-toolbar.tsx` | Modify | "Queue Matching" tooltip |
| `apps/web/src/components/admin/external-data.tsx` | Modify | Limitless per-row `displayStatus`, counts, skipped chip, skipped breakdown banner, render `StatusTabs`, filter on `displayStatus` |
| `apps/web/src/components/admin/__tests__/external-data.test.tsx` | Modify | Cover tabs + skipped count/banner + queue-excludes-skipped |

**Scope note:** Tabs + Skipped target the **Limitless** view (all the reported issues are Limitless). **RK9 is left unchanged** — it keeps its status dropdown. `displayStatus` is optional on `UnifiedRow` and set only on Limitless rows, so RK9 construction + filtering are untouched and every task compiles standalone.

---

## Task 1: `deriveLimitlessDisplayStatus` helper

**Files:**
- Create: `apps/web/src/components/admin/limitless-display-status.ts`
- Create: `apps/web/src/components/admin/__tests__/limitless-display-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/admin/__tests__/limitless-display-status.test.ts`:

```typescript
import {
  deriveLimitlessDisplayStatus,
  type DisplayStatus,
} from "../limitless-display-status";

// A known-mappable format id (Showdown id for Limitless "M-A").
const MAPPED = "gen9championsvgc2026regma";

function row(overrides: Partial<{
  import_status: string | null;
  format_id: string;
  data_imported_at: string | null;
}> = {}) {
  return {
    import_status: null,
    format_id: MAPPED,
    data_imported_at: null,
    ...overrides,
  };
}

describe("deriveLimitlessDisplayStatus", () => {
  it.each<[string, ReturnType<typeof row>, DisplayStatus]>([
    ["data_imported_at wins over everything", row({ data_imported_at: "2026-01-01", import_status: "failed", format_id: "CUSTOM" }), "imported"],
    ["failed takes precedence over skipped", row({ import_status: "failed", format_id: "CUSTOM" }), "failed"],
    ["queued", row({ import_status: "queued" }), "queued"],
    ["importing", row({ import_status: "importing" }), "importing"],
    ["explicit skipped status", row({ import_status: "skipped", format_id: "CUSTOM" }), "skipped"],
    ["pending + unmappable format → skipped", row({ import_status: null, format_id: "CUSTOM" }), "skipped"],
    ["pending + unknown code → skipped", row({ import_status: "pending", format_id: "SOME_NEW_CODE" }), "skipped"],
    ["pending + mapped format → pending", row({ import_status: null, format_id: MAPPED }), "pending"],
  ])("%s", (_label, input, expected) => {
    expect(deriveLimitlessDisplayStatus(input)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="limitless-display-status" 2>&1 | tail -15
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `apps/web/src/components/admin/limitless-display-status.ts`:

```typescript
import { ALL_VALID_FORMATS } from "@/lib/limitless";

/** Mutually-exclusive display buckets for a Limitless tournament row. */
export type DisplayStatus =
  | "pending"
  | "queued"
  | "importing"
  | "imported"
  | "failed"
  | "skipped";

/**
 * Map a Limitless row to exactly one display status.
 *
 * Precedence (real pipeline state wins so a failed import is never hidden as
 * "skipped"):
 *   1. data_imported_at set        → imported   (same source of truth as the chip)
 *   2. import_status failed         → failed
 *   3. import_status queued         → queued
 *   4. import_status importing      → importing
 *   5. import_status skipped        → skipped
 *   6. otherwise (null/""/pending/unknown): unmappable format → skipped, else pending
 *
 * "Unmappable" = the format does not map to a known format
 * (`!ALL_VALID_FORMATS.has(format_id)`) — covers CUSTOM and any future
 * unrecognized Limitless code.
 */
export function deriveLimitlessDisplayStatus(row: {
  import_status: string | null;
  format_id: string;
  data_imported_at: string | null;
}): DisplayStatus {
  if (row.data_imported_at) return "imported";
  switch (row.import_status) {
    case "failed":
      return "failed";
    case "queued":
      return "queued";
    case "importing":
      return "importing";
    case "skipped":
      return "skipped";
  }
  if (!ALL_VALID_FORMATS.has(row.format_id)) return "skipped";
  return "pending";
}
```

> Note: confirm `ALL_VALID_FORMATS` is exported from `@/lib/limitless`. `external-data.tsx` already imports `LIMITLESS_TO_FORMAT` from `@/lib/limitless`, and `ALL_VALID_FORMATS` is defined alongside it in `packages/data-sources/src/limitless/format.ts`. If it is not re-exported through `@/lib/limitless`, add it to that barrel (one line) as part of this step.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="limitless-display-status" 2>&1 | tail -15
```
Expected: PASS (8 cases).

- [ ] **Step 5: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/limitless-display-status.ts apps/web/src/components/admin/__tests__/limitless-display-status.test.ts && git commit -m "feat(admin): add deriveLimitlessDisplayStatus helper (skipped = unmappable format)"
```

---

## Task 2: `StatusTabs` component

**Files:**
- Create: `apps/web/src/components/admin/external-data-status-tabs.tsx`
- Create: `apps/web/src/components/admin/__tests__/external-data-status-tabs.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/admin/__tests__/external-data-status-tabs.test.tsx`:

```typescript
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusTabs, type StatusTab } from "../external-data-status-tabs";

const TABS: StatusTab[] = [
  { value: "all", label: "All", count: 100 },
  { value: "pending", label: "Pending", count: 60 },
  { value: "skipped", label: "Skipped", count: 40, tone: "skipped" },
];

describe("StatusTabs", () => {
  it("renders each tab with its label and count", () => {
    render(<StatusTabs tabs={TABS} active="all" onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: /All/ })).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("marks the active tab as selected", () => {
    render(<StatusTabs tabs={TABS} active="pending" onChange={jest.fn()} />);
    expect(screen.getByRole("tab", { name: /Pending/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("calls onChange with the tab value when clicked", async () => {
    const onChange = jest.fn();
    render(<StatusTabs tabs={TABS} active="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: /Skipped/ }));
    expect(onChange).toHaveBeenCalledWith("skipped");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="external-data-status-tabs" 2>&1 | tail -15
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `apps/web/src/components/admin/external-data-status-tabs.tsx`:

```typescript
"use client";

import { cn } from "@/lib/utils";

export interface StatusTab {
  /** Filter value written to the active-status state ("all" = no filter). */
  value: string;
  label: string;
  count: number;
  /** "skipped" renders slate (inert), not teal/red. */
  tone?: "default" | "skipped";
}

interface StatusTabsProps {
  tabs: StatusTab[];
  active: string;
  onChange: (value: string) => void;
}

/**
 * Horizontal status tab row for the import console. Replaces the status
 * dropdown — each tab shows a live count and the active tab is highlighted.
 * Scrolls horizontally on small screens (mobile-responsiveness rule).
 */
export function StatusTabs({ tabs, active, onChange }: StatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        const isSkipped = tab.tone === "skipped";
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors sm:h-8",
              isActive
                ? isSkipped
                  ? "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                  : "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {isSkipped && <span aria-hidden>⊘</span>}
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums",
                isActive
                  ? isSkipped
                    ? "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                    : "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="external-data-status-tabs" 2>&1 | tail -15
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/external-data-status-tabs.tsx apps/web/src/components/admin/__tests__/external-data-status-tabs.test.tsx && git commit -m "feat(admin): add StatusTabs component for import console status filter"
```

---

## Task 3: `skipped` tone on StatusChips

**Files:**
- Modify: `apps/web/src/components/admin/external-data-status-chips.tsx`

This is a self-contained, compiles-green change (nothing passes the new tone yet — Task 4 does).

- [ ] **Step 1: Add the `skipped` tone**

In `apps/web/src/components/admin/external-data-status-chips.tsx`, extend the tone union and the class map:

```typescript
export interface StatusChip {
  label: string;
  count: number;
  tone: "synced" | "queued" | "importing" | "imported" | "failed" | "skipped";
}

const TONE_CLASS: Record<StatusChip["tone"], string> = {
  synced: "bg-muted text-muted-foreground",
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  importing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  imported: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  skipped: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};
```

- [ ] **Step 2: Typecheck (standalone green)**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "status-chips" | head
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/external-data-status-chips.tsx && git commit -m "feat(admin): add skipped tone to import status chips"
```

---

## Task 4: Limitless `displayStatus`, counts, skipped chip + tabs in `external-data.tsx`

**Files:**
- Modify: `apps/web/src/components/admin/external-data-shared.ts`
- Modify: `apps/web/src/components/admin/external-data.tsx`

All edits in this task compile together (the optional field means no other construction site breaks). RK9 is untouched.

- [ ] **Step 1: Shared — optional `displayStatus` + `queueableIds` via it**

In `apps/web/src/components/admin/external-data-shared.ts`:

(a) Import the type at the top (with the other imports):
```typescript
import { type DisplayStatus } from "./limitless-display-status";
```
(b) Add an **optional** field to the `UnifiedRow` interface (next to `status: string; // normalized status`):
```typescript
  /** Fine-grained Limitless display status for the status tabs + counts. Unset for RK9 rows. */
  displayStatus?: DisplayStatus;
```
(c) Replace the body of `queueableIds` so it keys off `displayStatus` — this is what makes "Queue Matching" exclude skipped, including unknown-code rows that are technically `pending`:
```typescript
export function queueableIds(rows: UnifiedRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.source === "limitless" &&
        r.limitless != null &&
        (r.displayStatus === "pending" || r.displayStatus === "failed")
    )
    .map((r) => r.limitless!.tournament_id);
}
```
This compiles standalone (optional field; `queueableIds` returns `[]` for Limitless rows until Step 3 sets `displayStatus`, which is fine because Step 3 is in the same task/commit).

- [ ] **Step 2: external-data.tsx — import the helper + tabs**

Add near the other admin imports (alongside `import { ExternalDataToolbar } ...`):
```typescript
import { deriveLimitlessDisplayStatus } from "./limitless-display-status";
import { StatusTabs, type StatusTab } from "./external-data-status-tabs";
```

- [ ] **Step 3: Set `displayStatus` on Limitless rows only**

In the `limitlessRows` map (the object passed to `UnifiedRow`, ≈ line 620), add:
```typescript
    displayStatus: deriveLimitlessDisplayStatus({
      import_status: t.import_status,
      format_id: t.format_id,
      data_imported_at: t.data_imported_at,
    }),
```
Do **not** touch the `rk9Rows` map — RK9 keeps its dropdown and filters on `row.status` as today.

- [ ] **Step 4: Filter Limitless on `displayStatus`**

In `filteredLimitlessRows` only (≈ line 640), change the status line:
```typescript
      // was: if (f.status !== "all" && row.status !== f.status) return false;
      if (f.status !== "all" && row.displayStatus !== f.status) return false;
```
Leave `filteredRk9Rows` unchanged.

> **Note (conscious choice):** `handleQueueAll` (the "Run Import — drain all" / queue-all path) keeps its existing raw filter `!t.import_status || t.import_status === "failed"`. This already excludes CUSTOM (whose `import_status` is `"skipped"`). It would still include a hypothetical unknown-code row (status `pending`); that's an acceptable edge for now since the **filter-aware** "Queue Matching" path (via `queueableIds`) is the primary control and correctly excludes all skipped. If desired later, route `handleQueueAll` through `queueableIds(limitlessRows)` too.

- [ ] **Step 5: Compute per-status counts + skipped breakdown**

After `const limitlessFailedCount = ...` (the existing counts block), add. Note `displayStatus` is optional on the type, so guard with `?? "pending"` to keep the index type a `string` (every Limitless row sets it, so this never actually defaults):
```typescript
  // Per-display-status counts for the Limitless status tabs.
  const limitlessStatusCounts = limitlessRows.reduce(
    (acc, r) => {
      const ds = r.displayStatus ?? "pending";
      acc[ds] = (acc[ds] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const limitlessSkippedCount = limitlessStatusCounts["skipped"] ?? 0;

  // Skipped breakdown by raw format code (for the explainer banner).
  const limitlessSkippedByFormat = limitlessRows
    .filter((r) => r.displayStatus === "skipped")
    .reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
```
(`r.category` is the displayed format code — `FORMAT_ID_TO_CODE[format_id] ?? format_id` — which for skipped rows is the raw code, e.g. `CUSTOM`.)

- [ ] **Step 6: Add the skipped chip to the stat strip**

In `limitlessChips`, append after the `failed` entry:
```typescript
    { label: "skipped", count: limitlessSkippedCount, tone: "skipped" },
```

- [ ] **Step 7: Build the Limitless tab definitions**

Right before the `return (` of the component, add (Limitless only — RK9 keeps its dropdown):
```typescript
  const limitlessTabs: StatusTab[] = [
    { value: "all", label: "All", count: limitlessRows.length },
    { value: "pending", label: "Pending", count: limitlessStatusCounts["pending"] ?? 0 },
    { value: "queued", label: "Queued", count: limitlessStatusCounts["queued"] ?? 0 },
    { value: "importing", label: "Importing", count: limitlessStatusCounts["importing"] ?? 0 },
    { value: "imported", label: "Imported", count: limitlessStatusCounts["imported"] ?? 0 },
    { value: "failed", label: "Failed", count: limitlessStatusCounts["failed"] ?? 0 },
    { value: "skipped", label: "Skipped", count: limitlessSkippedCount, tone: "skipped" },
  ];
```

- [ ] **Step 8: Render the tabs + skipped banner at the Limitless filters site**

Find the **Limitless** `<ExternalDataFilters ... limFilters={limFilters} ...>` render (the one receiving `limFilters`, ≈ line 1523 — NOT the RK9 one at ≈ 1424). Immediately ABOVE it, add the tabs + the conditional skipped banner. This render path is already the Limitless branch, so no `activeTab` guard is needed:
```tsx
      <StatusTabs
        tabs={limitlessTabs}
        active={limFilters.status}
        onChange={(value) => setLimFilters((p) => ({ ...p, status: value }))}
      />
      {limFilters.status === "skipped" && limitlessSkippedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <span aria-hidden>⊘</span>
          <span className="font-semibold">
            {limitlessSkippedCount.toLocaleString()} events skipped
          </span>
          <span>— their format isn’t supported for import:</span>
          {Object.entries(limitlessSkippedByFormat)
            .sort((a, b) => b[1] - a[1])
            .map(([code, n]) => (
              <span
                key={code}
                className="rounded-full bg-amber-200/60 px-2 py-px font-medium dark:bg-amber-900/40"
              >
                {code} ×{n.toLocaleString()}
              </span>
            ))}
        </div>
      )}
```
Match the surrounding indentation/wrapper. If the Limitless toolbar + filters are inside a wrapping `<div>`/fragment, place these as siblings directly above `<ExternalDataFilters>` within it. If the two filter renders are NOT already split by an `activeTab` conditional (verify the surrounding JSX), wrap this block so it only renders on the Limitless tab (`activeTab === "limitless"`).

- [ ] **Step 9: Typecheck + run the admin tests**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "external-data|displayStatus|status-tabs" | head -20
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/external-data" 2>&1 | tail -20
```
Expected: typecheck clean for these files; existing admin tests pass. Fix type errors originating from your changes.

- [ ] **Step 10: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/external-data.tsx apps/web/src/components/admin/external-data-shared.ts && git commit -m "feat(admin): Limitless status tabs + skipped count/breakdown in import console"
```

---

## Task 5: Gate the status `<Select>` to RK9 only + Queue Matching tooltip

**Files:**
- Modify: `apps/web/src/components/admin/external-data-filters.tsx`
- Modify: `apps/web/src/components/admin/external-data-toolbar.tsx`

For **Limitless**, the tabs own status filtering, so the dropdown is redundant. **RK9 keeps its dropdown** (not converted in this pass), so the status `<Select>` stays but renders for RK9 only. The active-status chip + `Clear all` still work for Limitless (driven by `limFilters.status`, set by the tabs).

- [ ] **Step 1: Desktop inline — render status select for RK9 only**

In the Row 1 markup, change:
```tsx
{!isMobile && renderStatusSelect()}
```
to:
```tsx
{!isMobile && isRk9 && renderStatusSelect()}
```

- [ ] **Step 2: Mobile popover — status section for RK9 only**

In the popover's `isMobile && (...)` block, wrap the **Status** `<div className="space-y-1">…{renderStatusSelect()}…</div>` so it only renders for RK9:
```tsx
{isRk9 && (
  <div className="space-y-1">
    <label className="text-muted-foreground text-xs font-medium">Status</label>
    {renderStatusSelect()}
  </div>
)}
```
Keep the Format/Tier section unconditional.

- [ ] **Step 3: Keep `renderStatusSelect` (still used by RK9)**

Leave `function renderStatusSelect()` and `renderFormatOrTierSelect` / `renderSecondaryFilters` intact. (`renderStatusSelect` is now only invoked on the RK9 path, so its internal `isRk9 ? … : …` always takes the RK9 branch — harmless; no change needed.)

- [ ] **Step 4: Drop status from the LIMITLESS mobile badge count only**

The `Status:` chip in `limitlessChips`/`rk9Chips` stays (reflects the active filter, removable). RK9 still has status in its popover, so `rk9AllActiveCount` is unchanged. For Limitless, status is no longer a popover control (it's tabs), so remove its `+1` from `limitlessAllActiveCount` so it doesn't inflate the mobile "Filters" badge:
```typescript
function limitlessAllActiveCount(filters: LimitlessFilterState): number {
  let count = limitlessSecondaryActiveCount(filters);
  if (filters.format !== INITIAL_LIMITLESS_FILTERS.format) count++;
  return count;
}
```
Leave `rk9AllActiveCount` as-is.

- [ ] **Step 5: Add the "Queue Matching" tooltip (intuitiveness)**

In `apps/web/src/components/admin/external-data-toolbar.tsx`, add a `title` to BOTH "Queue Matching ({count})" buttons (there are two render sites — desktop and the compact/overflow layout) so the affordance is self-explaining:
```tsx
title="Queues the events matching your current tab + filters (skipped events are never queued)"
```
Place it as an attribute on the existing `<button>`/`Button` for Queue Matching. Don't change the count expression — `queueMatchingCount` is already filter-aware (derived from `filteredLimitlessRows` → `queueableIds`, which now excludes skipped via Task 3).

- [ ] **Step 6: Typecheck + lint**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | grep -iE "external-data-filters|external-data-toolbar" | head
cd /Users/gmendoza/source/trainers.gg && pnpm lint --filter @trainers/web 2>&1 | grep -iE "external-data-filters|external-data-toolbar|no-unused|error|warning" | head
```
Expected: no errors. (`renderStatusSelect` and the `Select` import are still used by the RK9 path / format select, so nothing becomes unused.)

- [ ] **Step 7: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/external-data-filters.tsx apps/web/src/components/admin/external-data-toolbar.tsx && git commit -m "feat(admin): hide Limitless status dropdown (tabs replace it) + Queue Matching tooltip"
```

---

## Task 6: Integration tests + manual verification

**Files:**
- Modify: `apps/web/src/components/admin/__tests__/external-data.test.tsx`

- [ ] **Step 1: Reconcile existing tests**

Run the admin suite and fix any assertions that referenced the removed status `<Select>` (e.g. queries for "All statuses"):
```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/external-data" 2>&1 | tail -30
```
Update failing assertions to target the new tabs (`getByRole("tab", { name: /Skipped/ })`) instead of the dropdown.

- [ ] **Step 2: Add coverage for the new behavior**

Add tests (or a describe block) to `external-data.test.tsx` asserting, with a fixture that includes ≥1 CUSTOM-format tournament and ≥1 mapped pending tournament:
- the **Skipped** tab renders with the correct count;
- the stat strip shows a **skipped** chip with that count;
- selecting the Skipped tab shows the breakdown banner containing the format code (e.g. `CUSTOM ×N`);
- the **Queue Matching** count excludes skipped rows (a CUSTOM row is not in `queueableIds`).
Mirror the existing fixture/mock patterns already used in this test file (it mocks the Supabase reads + `@/actions/limitless`).

- [ ] **Step 3: Full admin suite + typecheck + lint green**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="admin/__tests__/external-data|status-tabs|limitless-display-status" 2>&1 | tail -20
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck --filter @trainers/web 2>&1 | tail -5
cd /Users/gmendoza/source/trainers.gg && pnpm lint --filter @trainers/web 2>&1 | grep -iE "admin/external|status-tabs|display-status|error|warning" | head
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/gmendoza/source/trainers.gg && git add apps/web/src/components/admin/__tests__/external-data.test.tsx && git commit -m "test(admin): cover status tabs, skipped count/banner, queue-excludes-skipped"
```

- [ ] **Step 5: Manual verification (Playwright MCP, dev server in tmux `trainers_gg` window 1)**

Navigate to `http://localhost:3000/admin/data?tab=limitless` and confirm:
- the status **tabs** render (All / Pending / Queued / Importing / Imported / Failed / ⊘ Skipped) with counts;
- the stat strip shows the **skipped** chip (≈1,010 on the current dev DB);
- clicking **Skipped** filters the table to CUSTOM rows and shows the breakdown banner;
- **Queue Matching (N)** excludes skipped (N reflects pending/failed only);
- mobile width (`375px`): the tab row scrolls horizontally, no page overflow.

---

## Verification Checklist

- [ ] `deriveLimitlessDisplayStatus` unit tests pass (failed-precedence, CUSTOM, unknown-code, mapped pending, imported).
- [ ] `StatusTabs` renders counts, marks active, fires onChange.
- [ ] Skipped chip + tab counts match; counts across tabs sum to synced total.
- [ ] Skipped banner lists per-format breakdown.
- [ ] Queue Matching excludes skipped (including unknown-code pending rows).
- [ ] Status `<Select>` fully removed from `external-data-filters.tsx`; chips + Clear all still work.
- [ ] Typecheck, lint, and the admin test suite are green.
- [ ] Mobile: tab row scrolls, tap targets ≥40px, no horizontal page overflow.
