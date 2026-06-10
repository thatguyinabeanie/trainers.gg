# /data Meta Explorer — Sankey + Line Chart Redesign

**Date:** 2026-06-05  
**Status:** Approved  

---

## Context

The existing `/data` page shows a single streamgraph of species usage over time. It's a solid starting point but lacks the ability to explore *how* a Pokémon is being built — what abilities, natures, and moves are paired with it. This redesign replaces the streamgraph with a two-panel interactive dashboard: a Sankey pipeline (the metagame anatomy) driven by a line chart navigator (usage trends over time).

Goal: give competitive players and analysts a single page that answers both "who is being used?" and "how are they being built?" — scoped to any time window and any set of species.

---

## Layout

```
┌─────────────────────────────────────────────┐
│  Controls bar (shared, sticky)               │
├─────────────────────────────────────────────┤
│  Meta Pipeline (Sankey) — hero, ~60% height  │
│  Species → Ability → Nature → Move           │
├─────────────────────────────────────────────┤
│  Usage Over Time (Line chart) — navigator    │
│  ~40% height                                 │
└─────────────────────────────────────────────┘
```

Single page. Both panels always visible. No tabs, no navigation between views.

---

## Controls Bar

Shared controls that affect both panels:

| Control | Values |
|---------|--------|
| Format selector | All active formats (Champions M-A default) |
| Source toggles | RK9 ✓, Limitless ✓, 1st Party ✓, Showdown (disabled — coming soon) |
| Min usage threshold | Slider ≥1%–20%, default 2% |
| Granularity | day / week / month dropdown |
| Species search | Text input — highlights matching lines in chart |

---

## Panel 1: Meta Pipeline (Sankey)

### Default state
Shows ALL species above the threshold as a full metagame anatomy diagram.

### Focused state
When species are selected (via line chart clicks), shows only those species with full path detail. Species shown as chips with × to deselect.

### Columns
`Species → Ability → Nature → Move`

Column headers shown above each column. Node heights are proportional to usage %. Bezier curves connect nodes between columns.

### Interactions
- **Hover any node** → full path highlighted (upstream + downstream), rest dimmed to low opacity
- **Click a node** → toggles pinned highlight (pinned = doesn't revert on mouseout; click again to unpin)
- **Tooltip on hover** → usage % and sample count within the filtered dataset

### Visual details
- Teal color scheme: varying lightness/opacity of primary teal palette
- Multi-species view: each species gets a color from the full hue spectrum via `assignColor()` in `usage-series.ts` (hashes species name → stable oklch hue). Abilities/natures/moves nodes are shared across species and use neutral teal.
- 1st-party data paths: dashed stroke or subtle glow to distinguish proprietary data
- Time range label shown in panel header (e.g. "Jan 24 – Jan 31")
- Initial load: shows the most recent available period for the selected format

### Data note (Phase 1)
The database stores per-species **marginal histograms** (separate ability %, nature %, move % distributions). Phase 1 uses **proportional allocation** to compute link widths — flows are distributed proportionally assuming independence across dimensions. This is qualitatively correct and visually useful. Phase 2 will extend the backend to capture true joint distributions.

---

## Panel 2: Usage Over Time (Line Chart)

### Chart
- Y axis: usage %
- X axis: time (week/month/day buckets per granularity setting)
- One line per Pokémon above threshold
- Non-selected lines shown dimmed (low opacity gray)
- Selected lines shown in teal with glow effect + species label at end of line

### Interactions
- **Click a line** → selects that species; Sankey above zooms to it. Multi-click = multi-select.
- **Drag on chart** → sets a time range (brush). Sankey above updates to reflect that period's anatomy.
- **Click empty space** → clears selection (returns to all-species Sankey)
- **"Select All / Clear"** in panel header

### Event pins (X axis)
Icon pins appear directly on the X axis at tournament dates:
- 🏆 RK9 majors (Regionals, ICs, NAIC, Worlds)
- 🌐 Major named online events (Victory Road series, Champions Festival)
- **Hover pin** → tooltip with full tournament name + date
- Source: derived from `event_usage` table, filtered to known major events

### Legend strip
Below the chart: selected species chips + active time range label.

---

## Data Architecture

### Reused (no changes)
- `getFormatUsageTimeseries()` — line chart data (`packages/supabase/src/queries/usage.ts`)
- `fetchFormatUsageTimeseries()` — server action with 1h ISR cache
- `format_meta_stats`, `pokemon_usage_stats`, `pokemon_detail_stats` tables

### New: `getPipelineData()`
```typescript
// packages/supabase/src/queries/usage.ts
getPipelineData(params: {
  format: string
  source: UsageSource
  periodType: PeriodType
  periodStart?: string  // ISO date — if omitted, uses most recent period
  periodEnd?: string    // ISO date
}): Promise<PipelineSpeciesData[]>
// Returns: species + usagePct + abilities[] + natures[] + moves[] for all species in range
// Finds meta buckets where period_start >= periodStart AND period_end <= periodEnd,
// aggregates across matching buckets, joins pokemon_usage_stats + pokemon_detail_stats
```

### New: `fetchPipelineData()`
```typescript
// apps/web/src/actions/usage.ts
// Wraps getPipelineData() with unstable_cache, 1h TTL, CacheTags.USAGE_STATS tag
```

### New: `getFormatEvents()`
```typescript
// packages/supabase/src/queries/usage.ts
// SELECT DISTINCT event_key, event_date FROM event_usage WHERE format = $1
// Returns events for annotation pins
```

---

## Files

### Deleted / gutted
- `apps/web/src/components/data/usage-stream-chart.tsx` — replaced

### Modified
- `apps/web/src/components/data/usage-explorer.tsx` — new state model (selectedSpecies[], timeRange, mode removed)
- `apps/web/src/components/data/usage-controls.tsx` — updated controls bar
- `apps/web/src/components/data/usage-filters.ts` — add `selectedSpecies`, `rangeStart`, `rangeEnd` coercers
- `apps/web/src/actions/usage.ts` — add `fetchPipelineData()`, `fetchFormatEvents()`
- `packages/supabase/src/queries/usage.ts` — add `getPipelineData()`, `getFormatEvents()`
- `apps/web/src/app/(app)/data/page.tsx` — prefetch pipeline data server-side
- `apps/web/src/app/(app)/data/loading.tsx` — two-panel skeleton

### Created
- `apps/web/src/components/data/usage-pipeline-chart.tsx` — Sankey component (React SVG + d3-sankey)
- `apps/web/src/components/data/usage-pipeline.ts` — transform histograms → Sankey nodes/links
- `apps/web/src/components/data/usage-line-chart.tsx` — line chart with brush + event pins

### New dependency
`d3-sankey` + `@types/d3-sankey` in `apps/web/package.json`

---

## Out of Scope (Phase 2)
- Exact joint distribution data (ability × nature × move combos)
- Showdown ranked ladder as a data source
- Win rate display
- Mobile-specific layout (follow-up ticket)

---

## Verification
1. `pnpm dev:web+backend` → navigate to `/data`
2. Both panels render; Sankey shows full meta by default
3. Adjust threshold → both panels update
4. Click a line → species chip appears; Sankey focuses on that species
5. Drag time range → Sankey date label updates; pipeline data refreshes
6. Hover Sankey node → path highlights, rest dims
7. Hover event pin → tournament name tooltip appears
8. "Clear" → Sankey returns to full meta
9. `pnpm typecheck && pnpm test`
