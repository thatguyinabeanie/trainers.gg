# /data Page Redesign

**Date:** 2026-06-08  
**Status:** Approved for implementation

## Problem

The `/data` Meta Explorer is unusable at scale. It shows all 319 Pokémon by default, making the Sankey pipeline an unreadable mass of teal lines. The top control bar is cluttered, the search is broken, and the page doesn't use the full viewport.

## Decisions

| Area | Decision |
|------|----------|
| Layout | Full viewport height below topnav — no scrolling, app-shell feel |
| Pokémon selection | Sidebar (B+C combo): presets + search + checklist |
| Controls | Format, Source, Granularity move into the sidebar |
| Min Usage % | Removed — presets handle this role |
| Sankey colors | Per-species colored flow lines (already implemented, just readable at ≤20 mons) |
| Default set | Top 20 by usage |

---

## Layout

```
┌─────────────────── topnav (48px) ────────────────────┐
│ trainers.gg    Tournaments  Communities  [Data]  ...  │
└──────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │  Main area                               │
│ 200px    │  (flex-1, full height)                   │
│          │                                          │
│          │  ┌─────────────────────────────────┐    │
│          │  │ Meta Pipeline          Feb–Mar   │    │
│          │  │                                  │    │
│          │  │  [Sankey — full height]          │    │
│          │  │                                  │    │
│          │  └─────────────────────────────────┘    │
│          │                                          │
│          │  ┌─────────────────────────────────┐    │
│          │  │ Usage Over Time        Jan–Jun   │    │
│          │  │  [Line chart — 130px]            │    │
│          │  └─────────────────────────────────┘    │
└──────────┴──────────────────────────────────────────┘
```

The two panels share the main area vertically. Sankey takes flex-1 (grows to fill), Usage Over Time is fixed ~130px tall.

---

## Sidebar

### Format controls (top)

Three stacked labeled dropdowns:

- **Format** — existing `format` select (e.g. "Champions VGC 2026 M-A")
- **Source** — existing `source` select (e.g. "All tournaments")
- **Granularity** — existing `granularity` select (e.g. "Week")

### Pokémon section (below a divider, fills remaining height)

**Header:** "POKÉMON" label

**Preset buttons:** `Top 10` · `Top 20` (default active) · `Top 50` · `All`  
Selecting a preset replaces the current selection with the top N by usage. "All" shows all Pokémon above 0%.

**Search box:** Filters the list below in real time. Does not add Pokémon outside the ranked list — it just helps you find a specific mon to check/uncheck.

**Checklist:** Scrollable list of all ranked Pokémon, sorted by usage descending.  
- Each row: checkbox · colored dot (species color) · name · usage %  
- Checked rows highlighted with subtle teal background  
- Unchecked rows dimmed  
- Clicking a row toggles it immediately; updates the charts

**Footer:** "N selected · 319 total" · "Clear" link (deselects all)

### Sidebar collapse

A `‹` / `›` toggle at the top-right of the sidebar collapses it to ~40px (icon-only) so the chart can go full width. Collapsed state persists in `localStorage`.

---

## Meta Pipeline (Sankey)

No structural changes to the d3-sankey layout or column order (Species → Ability → Nature → Move). Changes:

1. **Default 20 species** — the component receives only the selected species (sidebar-driven), so the chart is naturally readable.
2. **Flow line colors** — already per-species via `assignColor()` in `usage-series.ts`. With ≤20 species these are now distinguishable.
3. **Column headers** — "MOV" → "MOVE" (fix truncation).
4. **Height** — chart grows to fill the panel; `clamp(400px, 65vh, 720px)` stays but the panel itself is now `flex-1` so it expands further on tall screens.

Existing hover behavior (dim non-connected links, tooltip) is retained unchanged.

---

## Usage Over Time (Line Chart)

Scoped to the selected Pokémon set. No structural changes — it already uses `selectedSpecies` from the explorer state. With ≤20 lines it becomes readable.

A small inline legend (colored dot + name) replaces the current unlabeled line chart. Max 10 entries in the legend; overflow shows "+ N more".

---

## Data Fetch

`fetchPipelineData()` gains a fixed threshold of `0` (was user-controlled via Min Usage %). The sidebar needs the full ranked list to populate the checklist — the Sankey then renders only the checked subset client-side. No server action signature change needed; just pass `threshold: 0` at the call site in `usage-explorer.tsx`.

---

## Removed

- **Min Usage % control** — deleted. Sidebar presets serve this purpose.
- **Top-level search box** — deleted. Sidebar search replaces it.
- **"# N Pokémon NNN" counter** — replaced by the sidebar footer ("N of 319 shown").

---

## Files to Change

| File | Change |
|------|--------|
| `apps/web/src/app/(app)/data/page.tsx` | Remove `min-h-screen` / scroll container; wrap in full-viewport shell |
| `apps/web/src/components/data/usage-explorer.tsx` | Major: add sidebar, move controls, wire preset logic, remove min-usage state |
| `apps/web/src/components/data/usage-pipeline-chart.tsx` | Fix "MOV" → "MOVE" column header; remove min-usage prop |
| `apps/web/src/components/data/usage-pipeline.ts` | No change expected |
| `apps/web/src/components/data/usage-series.ts` | No change expected |

New component: `apps/web/src/components/data/data-sidebar.tsx` — sidebar with format controls + Pokémon selector.

---

## Verification

1. `pnpm dev:web` — navigate to `/data`
2. Page fills viewport, no page scroll
3. Default: Top 20 loaded, Sankey shows ~20 species with distinct colored flows
4. Preset buttons switch the set; checklist reflects changes immediately
5. Sidebar search filters the list in real time
6. Sidebar collapse/expand works; state persists on refresh
7. Format/Source/Granularity dropdowns in sidebar trigger data refetch as before
8. Usage Over Time chart lines match the selected species set
9. Playwright screenshot: `pnpm test:e2e` or manual MCP screenshot
