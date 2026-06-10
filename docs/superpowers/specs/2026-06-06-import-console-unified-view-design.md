# Import Console — Unified View + Shared Vocabulary (Design)

**Date:** 2026-06-06
**Area:** Site Admin → Data (`apps/web/src/components/admin/external-data*.tsx`)
**Status:** Approved (design phase)

## Context / Problem

The import console splits RK9 and Limitless into two top-level tabs, each with its own columns, status vocabulary, action verbs (RK9 "Discover/Scrape Rosters/Scrape Teams", Limitless "Sync/Queue/Import"), filters, and toolbar. The two sources are *different pipelines* but the divergent presentation is mostly incidental, not essential — it makes the console harder to scan and learn. Separately, the Usage "Recompute/Calculate" buttons give no feedback during the run ("I have no idea what is going on").

## Goals

1. **One unified table** for both sources; the RK9/Limitless split becomes a **Source filter**, not top-level tabs.
2. **Shared vocabulary** — the same words for both pipelines (Sync, Import, one status set).
3. **Remove redundancies** — drop the Limitless-only Queue column, the RK9 status dropdown, and the duplicated per-source tab panels.
4. **Usage feedback** — visible in-progress state + result for Recompute/Calculate.

## Non-goals

- No change to the underlying ETL mechanics (RK9 still scrapes rosters→teams; Limitless still queues→imports). Only the **UI vocabulary and layout** unify; the per-row action dispatches to the existing source-specific operation.
- The RK9 **Players** sub-view is retained (as a toggle), not redesigned.
- No DB/schema changes.

## Shared vocabulary

| Concept | Today | Unified label |
| --- | --- | --- |
| Fetch latest events from the source | RK9 "Discover" · Limitless "Sync" | **Sync** |
| Bring an event's data in | RK9 "Scrape Rosters" / "Scrape Teams" · Limitless "Queue" / "Import" | **Import** |
| Per-row + bulk action | source-specific buttons | **Import** (row), **Import matching (N)** / **Import all** (bulk), **Import selected (N)** (selection bar) |

"Import" is a per-row dispatcher: Limitless → `queueTournamentForImport`; RK9 → the next needed scrape step (`scrapeRoster` when pending/failed, `scrapeTeams` when roster-ready) — the existing handlers, invoked under one label.

## Unified status model

A single `deriveDisplayStatus(row)` maps **both** sources to one mutually-exclusive set:

`pending · in-progress · imported · failed · skipped`

| Unified status | RK9 maps from | Limitless maps from |
| --- | --- | --- |
| `pending` | `pending`, **`upcoming`** (future event) | `pending` |
| `in-progress` | `roster`, `teams` | `queued`, `importing` |
| `imported` | `complete` | `data_imported_at` set |
| `failed` | `failed` | `failed` |
| `skipped` | — | unmappable format (CUSTOM / unknown) |

- **Queued + Importing collapse to `in-progress`** (approved). Granularity is preserved in the **Status column's live detail**, not the tab.
- **`upcoming` folds into `pending`** at the tab/bucket level; the Status column shows "Upcoming · starts {date}" and the Import action is hidden for upcoming rows (as today). Rationale: an upcoming event isn't yet importable, so it belongs with "not yet imported," but the live detail keeps it distinct.
- `skipped` only ever occurs for Limitless; the tab shows count 0 for an RK9-only filter.

Implementation: generalize the existing `deriveLimitlessDisplayStatus` into a source-aware `deriveDisplayStatus(row: UnifiedRow)` (new `display-status.ts`, or extend the current file) that branches on `row.source`. `UnifiedRow.displayStatus` becomes **required** and is set for both sources (today it's Limitless-only/optional).

## Layout (one table)

```
[stat chips: synced · pending · in progress · imported · failed · skipped]   [Sync] [Import matching (N) ▾]  | [Usage ▾ + inline state]  | [⚙] [↻]
Source: ( All | RK9 | Limitless )   [🔍 Search]   [Type ▾]   [More filters]
[ All · Pending · In progress · Imported · Failed · ⊘ Skipped ]   ← unified status tabs (both sources)
┌───────────────────────────────────────────────────────────────────────────┐
│ ☑ │ Event (src badge + name + links; RK9 also location) │ Type │ Date │ Players │ Status (live detail) │ Actions (Import) │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Source filter** (segmented `All / RK9 / Limitless`) replaces the top tabs; each row carries a small `RK9`/`LIMITLESS` badge in the Event cell.
- **Status column** is kept as the *live-detail* column: Upcoming · Queued (2m ago) · Importing (started) · Roster ready · Teams 312/1,204 · Imported · Failed (2x) · ⊘ Skipped. Essential in the All view.
- **Drop** the Limitless-only **Queue** column (its timing moves into the Status detail).
- **Type** column = tier (RK9) or format code (Limitless) — already `row.category`.
- **RK9 Players** → an `Events │ Players` view toggle, shown only when Source = RK9.
- **Toolbar** action group is contextual to the Source filter: when a single source is selected, Sync/Import target it; when All, they act across both (Import matching dispatches per row source). Sync with a source selected fetches that source; with All, syncs both.

## Usage feedback

- **Usage is a global, cross-source operation** — Recompute/Calculate always recomputes the full usage rollups across **all** sources (RK9 + Limitless + first-party). It is **independent of the Source filter**: the Usage control sits in the shared toolbar group (alongside Refresh/Settings), unaffected by whether the table is filtered to RK9, Limitless, or All. (The underlying `triggerUsageRollup` / usage-compute actions already aggregate across sources — no per-source scoping is added.)
- Recompute/Calculate buttons enter a **loading state** (spinner + "Recalculating usage…", disabled) while the action runs.
- On completion, a **result toast** with specifics from the action's return (`{ formatsProcessed, bucketsWritten }` → "Recomputed 4 formats · 312 buckets"); errors surface the real message.
- A subtle **"last calculated {timeAgo}"** line near the Usage control (persisted via the existing `usage_rollup_last_run_at` site_config, already read by the rollup status).

## Components touched

| File | Change |
| --- | --- |
| `external-data.tsx` | Merge the two `<TabsContent>` into one table; set `displayStatus` for both sources; one unified filter pass; unified status-tab counts; per-row `handleImport` dispatcher; render one `StatusTabs` + Source filter; keep RK9 Players toggle |
| `display-status.ts` (rename/extend `limitless-display-status.ts`) | Source-aware `deriveDisplayStatus(row)` |
| `external-data-shared.ts` | `displayStatus` required on `UnifiedRow`; unify filter state to one `ImportFilterState` with a `source` field (shared search/status/date/minPlayers + source-conditional type/platform/country); update `queueableIds`→`importableIds` semantics |
| `external-data-filters.tsx` | Add the **Source** segmented filter; status via tabs for both; type filter = tier-or-format by source; platform/country become source-conditional secondary filters |
| `external-data-toolbar.tsx` | Unified **Sync** + **Import matching/all** buttons (contextual to Source); Usage inline loading state + last-calculated line |
| `external-data-selection-bar.tsx` | Unified **Import selected (N)** (dispatches per source); RK9 Reset stays (source-conditional) |
| `external-data-status-tabs.tsx` | Reused as-is (already generic) |
| `external-data-status-chips.tsx` | Reused (already has `skipped` tone) |
| Tests | Unit: `deriveDisplayStatus` for both sources (incl. upcoming→pending, queued/importing→in-progress). Integration: source filter narrows rows; unified status tab counts; per-row Import dispatches the right op; usage button shows loading→result |

## Testing

- **Unit** (`deriveDisplayStatus`): `it.each` over RK9 + Limitless inputs → unified bucket (upcoming→pending, roster/teams→in-progress, complete→imported, queued/importing→in-progress, imported, failed, CUSTOM→skipped).
- **Component** (`external-data.test.tsx`): Source filter = RK9 hides Limitless rows (and vice-versa); status tabs show combined counts; clicking Import on a Limitless row calls the queue action, on an RK9 row calls the scrape action; usage button enters loading state and shows a result toast.
- Keep the existing admin suites green; reconcile any assertions tied to the old two-tab layout / per-source verbs.

## Verification (Playwright, dev server in tmux `trainers_gg` window 1)

`/admin/data` →
- one table with a Source filter (All/RK9/Limitless); switching narrows rows;
- unified status tabs with combined counts; All shows both sources with per-row source badges;
- a single **Import** verb on rows + **Import matching/all** in the toolbar; **Sync** present;
- Status column shows live detail (Teams X/Y for RK9, "started/queued" for Limitless, ⊘ Skipped);
- clicking Recompute/Calculate shows a spinner + "Recalculating…", then a result toast + "last calculated" line;
- mobile width: table→cards, tab row scrolls, no overflow.

## Rollout

Single PR on a fresh branch off `main` (the import console now lives on the merged work). No migration, no flag.
