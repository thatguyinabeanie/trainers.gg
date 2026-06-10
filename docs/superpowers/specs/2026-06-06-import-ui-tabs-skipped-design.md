# Import Admin UI — Status Tabs + Skipped (Design)

**Date:** 2026-06-06
**Area:** `apps/web/src/components/admin/external-data*.tsx` (Site Admin → Data → Limitless / RK9)
**Status:** Approved (design phase)

## Problem

The import admin table filters status with a dropdown (`All / Pending / Queued / Importing / Complete / Failed`). Two problems:

1. **"Skipped" is invisible.** Events whose format can't be imported (e.g. `CUSTOM`) are synced but never queued. The stat strip shows `6,121 synced` vs `5,111 queued` with no explanation of the ~1,010-event gap, and there is no way to filter to them.
2. **The status dropdown is unintuitive.** Statuses are buried one click away; the active filter and the meaning of "Queue Matching (N)" aren't obvious.

## Goals

- Communicate **how many events were skipped and why** (which formats), at a glance.
- Replace the status **dropdown** with **tabs**, including a first-class **Skipped** tab.
- Make the toolbar more intuitive (filter chips, clearer "Queue Matching" affordance).
- No DB migration — derive everything client-side from already-loaded data.

## Non-goals

- No change to the import **pipeline/worker** logic (queue processor, sync). Server-side queue actions already exclude skip-list formats (fixed separately in `pgInList`).
- No change to RK9-specific statuses beyond reusing the new tabs component. RK9 has no "skipped" concept; its Skipped tab is hidden (or 0).

## Definition of "skipped"

Any event whose format does **not** map to a known format — i.e. `!ALL_VALID_FORMATS.has(format_id)` (from `@/lib/limitless` / `@trainers/data-sources`). This covers `CUSTOM` (explicitly skip-listed, stored with `import_status = "skipped"`) **and** any unknown/unmappable Limitless code (stored at `pending` with the raw code). Known formats are stored as Showdown IDs, which are in `ALL_VALID_FORMATS`; skipped rows keep their raw code, which is not.

## Data model — derived display status

A single pure helper maps a Limitless row to exactly one display status. **Real pipeline states take precedence over skipped** (a failed import stays Failed so it can be retried):

```ts
export type DisplayStatus =
  | "pending" | "queued" | "importing" | "imported" | "failed" | "skipped";

// precedence: imported (source of truth = data_imported_at) → other real
// pipeline states → skipped → pending
export function deriveLimitlessDisplayStatus(row: {
  import_status: string | null;
  format_id: string;
  data_imported_at: string | null;
}): DisplayStatus {
  if (row.data_imported_at) return "imported"; // same source of truth as the existing chip
  switch (row.import_status) {
    case "failed":    return "failed";
    case "queued":    return "queued";
    case "importing": return "importing";
    case "skipped":   return "skipped";
  }
  // remaining: null / "" / "pending" / unknown
  if (!ALL_VALID_FORMATS.has(row.format_id)) return "skipped";
  return "pending";
}
```

- Pure, framework-free, unit-tested in isolation (sits beside `limitless-status.ts`).
- Mutually exclusive: every row lands in exactly one tab; counts sum to the synced total.
- `imported` keys off `data_imported_at` (the existing chip's source of truth) so the tab count and the chip never diverge. The other chips (`queued`/`importing`/`failed`) already key off `import_status` and line up with the matching tabs.

## UI changes

### 1. Status strip — add Skipped chip
Append a slate `⊘ N skipped` chip after `failed`. Count = rows with `deriveLimitlessDisplayStatus(...) === "skipped"`. Tooltip: "Format not supported for import (e.g. CUSTOM) — recorded for visibility, never imported."

### 2. Status dropdown → tabs
Replace the status `<Select>` with a horizontal tab row:
`All · Pending · Queued · Importing · Imported · Failed · ⊘ Skipped`
- Each tab shows a live count badge derived from the loaded rows.
- Active tab uses the teal token; the Skipped tab uses slate to read as "inert", not an error.
- The **Format** filter remains a `<Select>`; Search and "More filters" remain.
- Mobile: the tab row scrolls horizontally (`-mx + overflow-x-auto`) per the mobile-responsiveness rule; tap targets ≥40px.
- A new focused component `external-data-status-tabs.tsx` (props: `counts`, `active`, `onChange`, `showSkipped`). RK9 reuses it with `showSkipped={false}`.

### 3. Skipped tab — self-explaining banner
When the Skipped tab is active, show a banner above the table:
> ⊘ **N events skipped** — their format isn't supported for import. **CUSTOM ×1,010**, …
A per-format breakdown (raw code × count) computed from the skipped rows, sorted desc. If a future unknown code appears, it shows here automatically.

### 4. Intuitiveness pass
- **Queue Matching (N)**: tooltip "Queues the N events matching your current tab + filters." `N` reflects the active tab/filter and **excludes skipped** (only `pending`/`failed` are queueable) — so skipped events can never be queued by accident.
- **Active filter chips**: show the active tab + format as removable chips with "Clear all" (the codebase already renders `Format: M-A ×` / `Status: pending ×` chips — keep that pattern, drive "Status" from the active tab).
- Selecting a tab updates the chips and the table together.

## Components touched

| File | Change |
| --- | --- |
| `apps/web/src/components/admin/limitless-status.ts` (or a sibling `*-display-status.ts`) | Add `deriveLimitlessDisplayStatus` + `DisplayStatus` type |
| `apps/web/src/components/admin/external-data-status-tabs.tsx` | **New** — tabs component |
| `apps/web/src/components/admin/external-data-toolbar.tsx` | Mount tabs; Queue Matching tooltip/wording |
| `apps/web/src/components/admin/external-data.tsx` | Compute per-status counts + skipped count + per-format breakdown; replace status `<Select>`; wire active-tab state + chips; skipped banner; ensure queue-matching excludes skipped |
| Tests | Unit: `deriveLimitlessDisplayStatus` (precedence, unmappable, CUSTOM). Component: tabs render counts + onChange; skipped banner shows breakdown; queue-matching count excludes skipped |

## Data flow

`external-data.tsx` already loads all Limitless rows (`format_id`, `import_status`, …). Derive each row's display status once, group to counts + the skipped per-format breakdown (all client-side, memo-free per React Compiler). The active tab is local component state (optionally synced to a URL/query param for shareable deep links — nice-to-have, not required). Table rows filter by `deriveLimitlessDisplayStatus(row) === activeTab` (or all when `All`).

## Testing

- **Unit** (`deriveLimitlessDisplayStatus`): `it.each` over row inputs `(import_status, format_id, data_imported_at)` → expected status, covering: `data_imported_at` set → imported (even if status odd); failed precedence over skipped; CUSTOM → skipped; unknown-code pending → skipped; mapped pending → pending.
- **Component** (`external-data-status-tabs`): renders all tabs with counts; clicking calls `onChange`; `showSkipped={false}` hides Skipped.
- **Integration** (`external-data`): skipped chip + tab counts match fixture; Skipped tab shows the per-format breakdown banner; "Queue Matching" count excludes skipped rows.

## Rollout

Single PR. Branch: per user's call (currently being done on `trainers-data`). No migration, no feature flag.
