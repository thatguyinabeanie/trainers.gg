# Meta Explorer Phase 2 — Overview-Page Charts (Design)

Date: 2026-06-09
Status: Design — for orchestrator review with the user. No implementation code.

## Overview

Phase 1 (PR #346) gave `/data` a `team_slots` fact table and five live SQL RPCs,
plus a client shell (`UsageExplorer`) that renders two charts (the d3-sankey
**Meta Pipeline** and the recharts **Usage Over Time** line chart) driven by a
left filter sidebar. Filter state (format, source, granularity, date range,
min-players, selected species, pipeline columns) lives entirely in the URL and
is read by both the server page and the client shell.

Phase 2 adds **six overview charts** on top of that foundation:

| # | Chart | One-liner | Data source |
|---|-------|-----------|-------------|
| 1 | ⭐ Usage vs. conversion scatter | Usage % (x) vs. Top-10% conversion rate (y); quadrants flag overrated picks vs. sleepers | **new RPC** `get_usage_conversion` |
| 2 | ⭐ Bump chart | Rank trajectories over time — the rise-and-fall story | `get_usage_timeseries` (existing) |
| 3 | ⭐ Source dumbbells | Same species' usage on trainers.gg vs Limitless vs RK9 | **new RPC** `get_usage_by_source` |
| 4 | Overall vs. Top-10% dumbbell | Species that over/under-perform when it matters | **new RPC** `get_usage_conversion` (same as #1) |
| 5 | Streamgraph | Meta-share composition over time | `get_usage_timeseries` (existing) — variant of the line chart |
| 6 | Treemap | Proportional meta-share snapshot with sprites | `get_usage_pipeline` (existing) |

Two new RPCs total. Charts 5 and 6 reuse data the page **already fetches** — no
extra round trips.

### Key reuse findings (from reading the current code)

- **`insideOutOrder()` already exists** in `usage-series.ts` and is unused. It
  is exactly the stack-ordering a streamgraph needs. The streamgraph is a
  rendering mode of the existing timeseries data, not a new fetch.
- **`assignColor(species)`** gives every chart deterministic, name-keyed OKLCH
  colors. Every new chart uses it so a species is the same color everywhere.
- **`getPokemonSprite(species)`** returns `{ url, w, h, pixelated }` (apply
  `[image-rendering:pixelated]` when `.pixelated`). The Sankey already renders
  sprites as `<image>`; treemap, scatter tooltips, and dumbbell rows reuse this.
- **`buildUsageSeries(points)`** pivots timeseries into per-species aligned
  arrays — the bump chart and streamgraph both build on it.
- Only **`recharts ^2.15.4`** and **`d3-sankey`** are installed. No `d3-shape`,
  `d3-scale`, `nivo`, or `visx`. **The plan adds zero new dependencies** — see
  "Library choices" per chart.

---

## Per-Chart Specs

### 1. ⭐ Usage vs. Conversion Scatter

**What it shows.** Each species is a dot: x = overall usage %, y = conversion
rate (share of that species' players who reached the Top 10% of placements).
Four quadrants:

- High usage + high conversion → **proven meta** (top-right)
- High usage + low conversion → **overrated** (bottom-right)
- Low usage + high conversion → **sleepers** (top-left)
- Low usage + low conversion → **fringe** (bottom-left)

Reference lines at the format's median usage and median conversion split the
quadrants. Dot = Pokemon sprite (falls back to a colored circle if the sprite
fails). Dot radius scales with sample size (more players = bigger, more
trustworthy dot) so a sleeper with 4 players doesn't read as loudly as one with
200.

**Data source.** New RPC `get_usage_conversion` (defined below). Returns, per
species: `players`, `usage_pct`, `top_players`, `conversion_pct`, plus the
fields needed by chart #4. The median reference lines are computed client-side
(median `usage_pct`, median `conversion_pct` over non-NULL species).

**Threshold (Decision 2).** `total_players` varies wildly per event (a 30-player
local vs. a 1200-player regional), so an absolute `placement <= 8` over-weights
small events. The threshold is **top N% by placement within each (source,
event_key, division)**, computed in SQL with `percent_rank()`, where N is the
user-adjustable control **5% / 10% / 25%** (default 10%, URL param `topPct`). The
UI label is **"Top 10%"** (following the control) — **never** "top cut".

**NULL-placement handling.** trainers.gg events have NULL placement until the
tournament completes; Limitless/RK9 have placement at import. Rule:
**rows with NULL placement are excluded from BOTH the conversion numerator and
the conversion denominator, but still count toward overall usage %.** Rationale:
a species' usage is a fact regardless of standings, but its conversion rate is
undefined for events that haven't finished. The RPC computes conversion only
over events that have *any* non-NULL placement (placement-bearing events), and
returns `conversion_pct = NULL` for species that appear only in events without
placement. The scatter drops NULL-conversion species (can't plot a y with no
value) but the treemap/usage charts keep them.

**Component.** `usage-conversion-scatter.tsx` — recharts `ScatterChart` +
`Scatter` + `ReferenceLine` (median splits) + `ZAxis` (sample-size → radius) +
custom sprite shape. recharts ships all of these; no new dep.

**Interactions.**
- Tooltip: sprite + name + usage % + conversion % + n players, styled like the
  existing `bg-popover border-border` tooltip.
- Click a dot → navigate to `/data/pokemon/[species]` (Phase 3). Affordance
  designed now (cursor-pointer, hover halo) but the handler is a no-op until
  Phase 3 lands — gated behind a `speciesHref?` prop that is simply absent in
  Phase 2.
- Subscribes to format / source / date-range / min-players filters.

**Mobile (Decision 6 — same chart, scaled down).** The scatter renders on mobile
as the same `ScatterChart`, responsively sized via `ResponsiveContainer
width="100%"` with a reduced height, fewer axis ticks, and smaller sprite dots
(sprite only on the largest-sample dots; the rest are colored circles). No list
fallback, no conditional mount.

---

### 2. ⭐ Bump Chart

**What it shows.** Rank (not usage %) on the y-axis, time buckets on the x-axis,
one line per species. Lines cross as species overtake each other in rank. The
y-axis is **inverted** (rank 1 at top). Only the **top N by latest-bucket rank**
are drawn — a full bump chart of 200 species is noise.

**Data source.** `get_usage_timeseries` — already fetched by the page. Transform
client-side: for each bucket, sort species by usage desc and assign rank; build
per-species rank arrays. New pure helper `buildRankSeries(points, topN)` added to
`usage-series.ts` (sits next to `buildUsageSeries`). A species absent from a
bucket gets a gap (null), not rank 0 — recharts `connectNulls={false}` shows the
line entering/leaving.

**Top N — default 20 (Decision 3), user-adjustable** via a small inline
segmented control on the chart card (Top 8 / 12 / 20). Default 20. Not
URL-persisted (local `useState`) to avoid bloating the shared URL — it's a
per-chart view preference.

**Component.** `usage-bump-chart.tsx` — recharts `LineChart` with
`YAxis reversed domain={[1, topN]}`, `type="monotone"` lines, dots at each
bucket, sprite + rank label at the right end of each line (custom label
renderer, same `<image>` technique as the Sankey).

**Interactions.**
- Tooltip per bucket: ranked list of the N species with their rank and usage %.
- Click a line → toggle that species in the shared selection (same
  `onSpeciesClick` contract the line chart already uses), and (Phase 3)
  click sprite → drill-down.
- Subscribes to format / source / granularity / date-range / min-players.

**Mobile (Decision 6 — same chart, scaled down).** The bump chart renders on
mobile as the same inverted-rank `LineChart`, responsively sized with a reduced
height and fewer x-axis ticks; the right-end sprite labels shrink. No list
fallback, no conditional mount. (The Top 8/12/20 control lets a phone user drop
to Top 8 if lines feel dense.)

---

### 3. ⭐ Source-Comparison Dumbbells

**What it shows.** This is the platform's unique angle: the same species'
usage on **trainers.gg vs Limitless vs RK9** side by side. Each row is one
species; a horizontal track shows a dot per source at that source's usage %, with
a connecting line (the "dumbbell"). Wide spread = the species behaves
differently online vs. in person. Sorted by overall usage desc, top N rows.

**Data source.** New RPC `get_usage_by_source` (defined below) — ONE call that
returns per-species, per-source usage in a single grouped query.

**Why one RPC, not N parallel calls.** Three tradeoffs weighed:

| Approach | Round trips | Cache granularity | SQL complexity | Verdict |
|----------|-------------|-------------------|----------------|---------|
| 3× `get_usage_pipeline(source=rk9/limitless/trainers.gg)` | 3 (parallel) | 3 cache entries, reuses existing fn | none (reuse) | rejected — heavy payload (full histograms × 3) for data we throw away |
| 1× new `get_usage_by_source` | 1 | 1 cache entry | moderate (group by source) | **chosen** |

The pipeline RPC returns six jsonb histograms per species — far more than the
dumbbell needs (just usage % per source). A purpose-built RPC returns a tiny
`(species, source, usage_pct, players)` shape. One cache entry keyed by
`(format, date-range, min-players)` — no source param, because this chart shows
all sources by definition.

**Source filter is intentionally ignored.** The sidebar `source` filter does not
apply here — the chart's whole purpose is cross-source comparison. The UI
communicates this with a small caption on the card header: *"Always compares all
sources — ignores the Source filter."* When the user has narrowed the Source
filter, the caption gains a subtle muted note so it doesn't read as a bug.

**Component.** `usage-source-dumbbell.tsx`. **Not a recharts chart** — it's a CSS
grid of rows, each a relatively-positioned track with absolutely-positioned dots
(percentage `left`). This is lighter than recharts for a simple 1-D plot and
matches how the Sankey hand-rolls SVG. Source dots use the categorical
`CHART_COLORS`-style fixed hues (one teal-family hue per source) — a new small
`SOURCE_COLORS` map in `usage-series.ts`.

**Interactions.**
- Hover a dot → tooltip: source label + usage % + n players.
- Hover a row → highlight, show the spread delta (max − min across sources).
- Sprite + name at the row's left; click → Phase 3 drill-down (gated).

**Mobile.** Dumbbell rows are naturally responsive (full-width tracks stack
vertically already). The only mobile change: reduce to top 15 rows and shrink
the sprite. No separate component needed — the row layout is fluid.

---

### 4. Overall vs. Top 10% Dumbbell

**Title note (Decision 2).** The card title is **"Overall vs. Top 10% usage"**,
where the "10%" portion follows the threshold control (becomes "Top 5%" / "Top
25%"). **Never** use the phrase "top cut" in this chart's title, dot labels, or
tooltip.

**What it shows.** Per species, two dots on one track: **overall usage %** vs
**usage % within the Top 10% of placements**. A species whose Top-10% dot sits
well to the right of its overall dot is over-performing (winning teams favor it);
to the left means it's popular but under-performs. This is the dumbbell rendering
of the same truth the scatter shows as quadrants — kept because the dumbbell
reads more clearly for "which specific mons over/under-perform" while the scatter
reads better for "show me the whole field's shape."

**Data source.** Reuses **`get_usage_conversion`** (chart #1's RPC). That RPC
returns `usage_pct` (overall) and `top_share_pct` (share within the Top-N% field).
No additional fetch — chart #1 and #4 share one cached fetcher (keyed including
`topPct`).

**NULL-placement handling.** Identical to chart #1 — species with no
placement-bearing events have no Top-10% dot and are dropped from this chart only.

**Component.** `usage-top-share-dumbbell.tsx`, reusing the shared dumbbell
primitive in `usage-dumbbell.tsx` (both #3 and #4 import it). Two dots instead of
three; endpoints colored "overall" (muted) and "Top 10%" (teal/primary, label
follows the threshold).

**Interactions / Mobile.** Same as chart #3 — responsive rows, no list fallback.

---

### 5. Streamgraph

**What it shows.** Stacked area of meta share over time with a `silhouette`
(centered) baseline — the classic "river" that shows composition and how the
meta's makeup shifts, not precise per-species values. It's the **composition
companion** to the existing line chart (which shows precise trajectories).

**Data source.** `get_usage_timeseries` — already fetched. Uses the existing
`insideOutOrder()` helper (currently unused) to order the stack so the
highest-peak species sit in the center — the wave shape.

**Library choice — recharts `AreaChart`, no d3-shape.** recharts `AreaChart`
supports `stackOffset="silhouette"` (centered) and `"wiggle"` natively. We do
**not** need `d3-shape` stack offsets. `stackOffset="silhouette"` + stacked
`<Area stackId="1">` per species gives the streamgraph directly. This is the
cheapest path and adds no dependency.

**Streamgraph vs. line chart — one card, two modes (recommended).** Rather than a
seventh standalone card, add a **mode toggle** to the existing "Usage Over Time"
card: `Lines | Stream`. Same data, same selected-species set, same brush. This
respects the roadmap note ("a streamgraph may be a mode/variant of it") and
avoids doubling the timeseries footprint on the page. Toggle is local
`useState`, defaults to `Lines`.

**Interactions.**
- Tooltip per bucket: top species by share with their %. (Streamgraphs don't
  read exact values well, so the tooltip carries the precise numbers.)
- Selecting species in the sidebar filters the bands (same as lines mode).
- Brush range selection shared with lines mode.

**Mobile.** `ResponsiveContainer width="100%"` adapts. At narrow widths the
stream compresses but stays readable for a top-N set. The sidebar already caps
selection via presets (Top 10/20). No separate mobile component.

---

### 6. Treemap

**What it shows.** A single-snapshot proportional map: each species is a
rectangle sized by its usage share, tiled to fill the card. Sprite centered in
each tile (largest tiles only — small tiles show just color, hover reveals the
name). The most immediate "what's the meta right now" glance, and the most
shareable/screenshot-friendly for content creators.

**Data source.** `get_usage_pipeline` — **already fetched** by the page
(`pipelineResult`). The treemap reads `pipelineResult.data` (each
`PipelineSpeciesData` has `species`, `usagePct`, `rank`). Zero extra fetch.

**Library choice — recharts `Treemap`.** recharts ships a `Treemap` component
(squarified layout). Custom `content` renderer draws the rect (fill =
`assignColor(species)`) + `<image>` sprite for tiles above a size threshold +
name label. No new dependency.

**Threshold.** Apply the same <1% floor convention used elsewhere
(`filterByThreshold` analog on the pipeline rows) so the treemap isn't a haze of
slivers. The "long tail" below threshold collapses into one muted
**"Others (N species)"** tile.

**Interactions.**
- Hover a tile → tooltip: sprite + name + usage % + rank.
- Click a tile → Phase 3 drill-down (gated).
- Subscribes to format / source / date-range / min-players (same params as the
  pipeline fetch — so it costs nothing extra).

**Mobile.** Treemaps are the **best** of the six on mobile — they fill any
aspect ratio and degrade gracefully. Just cap the species count (top ~30) on
narrow viewports so tiles stay tappable (≥40px targets where possible; sub-40px
tiles are decorative-with-tooltip, acceptable since the labelled list in the
sidebar is the accessible path). No separate mobile component.

---

## New RPC Definitions

Both follow Phase 1 conventions exactly: `LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''`, `GRANT EXECUTE ... TO anon, authenticated`, `p_source`
`'all'` passthrough where applicable, `p_min_players` bucket filter, denominator
= `SUM(total_players)` over `DISTINCT (source, event_key, division)`, numerator
= `COUNT(DISTINCT player_key)`. Both go in **one new migration**
`<ts>_usage_phase2_rpcs.sql`.

### RPC A — `get_usage_by_source`

Per-species usage % broken out by source, in one call. Powers chart #3.

```
get_usage_by_source(
  p_format      text,
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0
) RETURNS TABLE (
  species    text,
  source     text,      -- 'rk9' | 'limitless' | 'trainers.gg'
  players    bigint,    -- distinct player_key running species in that source
  usage_pct  numeric    -- players / that-source's denominator
)
```

Notes:
- **No `p_source` param** — this RPC partitions by source by definition.
- Denominator is computed **per source**: `SUM(total_players)` over
  `DISTINCT (event_key, division)` *within each source*. So `usage_pct` is
  "share of that source's field," directly comparable across sources.
- Min-players applies per (source) bucket: a source with `< p_min_players`
  total contributes no rows (so a tiny trainers.gg sample doesn't produce a
  misleading 100%-spike dot).
- Ordered `species ASC, source ASC` for stable client grouping.

### RPC B — `get_usage_conversion`

Per-species overall usage vs. Top-N% conversion, for one slice. Powers charts
#1 and #4. **Naming (Decision 2):** the percentile param is `p_top_percentile`
and all columns use the neutral `top_*` stem — never `topcut`.

```
get_usage_conversion(
  p_format         text,
  p_source         text    DEFAULT 'all',
  p_start          date    DEFAULT NULL,
  p_end            date    DEFAULT NULL,
  p_min_players    int     DEFAULT 0,
  p_top_percentile numeric DEFAULT 0.10   -- top 10% by placement (UI: "Top 10%")
) RETURNS TABLE (
  species           text,
  players           bigint,   -- distinct players running species (placement + no-placement events)
  usage_pct         numeric,  -- overall usage % (full denominator)
  top_players       bigint,   -- distinct players running species who are in the top N%
  top_field         bigint,   -- size of the top-N% field (placement events only)
  top_share_pct     numeric,  -- top_players / top_field  (chart #4 right dot)
  conversion_pct    numeric,  -- top_players / ranked_players (chart #1 y) — NULL if species has no placement events
  ranked_players    bigint    -- distinct players running species in placement-bearing events (conversion denominator)
)
```

Top-percentile computation:
- A **placement-bearing event** = a `(source, event_key, division)` with ≥1
  non-NULL `placement`. Within each such event, a player is in the top N% if
  `percent_rank()` over `placement ASC` (1 = best) `<= p_top_percentile`. This
  makes the threshold event-size-relative.
- `conversion_pct = top_players / ranked_players` where `ranked_players` is
  distinct players running the species **in placement-bearing events only**.
  NULL when the species never appears in a placement-bearing event (e.g.
  trainers.gg-only, pre-completion).
- `usage_pct` uses the **full** denominator (all events) — usage is a fact
  independent of standings.
- The field-baseline median used by the scatter's reference lines is computed
  **client-side** from the returned rows (median of `usage_pct` and median of
  `conversion_pct` over non-NULL species) — no extra RPC.

NULL-placement summary (both charts): NULL-placement rows count toward
`usage_pct` only; they're excluded from `top_*`, `conversion_pct`, and
`ranked_players`.

### Index implications

The existing indexes cover both RPCs:
- `idx_team_slots_format_date (format, event_date)` — date-range scans for both.
- `idx_team_slots_format_source (format, source)` — `get_usage_by_source` group.
- `idx_team_slots_format_species (format, species)` — per-species aggregation.

`get_usage_conversion`'s `percent_rank()` partitions by
`(source, event_key, division)` and orders by `placement` — no existing index
directly serves that window, but the window runs over the already-filtered
`(format, date-range)` working set (small after the format filter), so a sort is
acceptable. **Recommendation: ship with existing indexes; add a
`(format, event_key, division, placement)` index only if the conversion RPC is
*measured* slow** — matches the Phase 1 "indexes-only, escalate on measurement"
stance. Flag the timeseries/conversion shapes as the first matview candidates if
measured slow.

### TS wrappers + types

Add to `packages/supabase/src/queries/usage.ts` (and re-export from the barrel):
- `getUsageBySource(supabase, params)` → `SourceUsageRow[]`
  (`{ species, source, players, usagePct }`), grouped client-side into
  `SourceComparisonRow { species, bySource: Record<source, {usagePct, players}> }`
  by a pure helper in `usage-series.ts`.
- `getUsageConversion(supabase, params)` → `ConversionRow[]`
  (`{ species, players, usagePct, topPlayers, topField, topSharePct,
  conversionPct: number | null, rankedPlayers }`). `params` includes
  `topPct` (mapped to `p_top_percentile`).

Both cast numerics like the existing wrappers (`row.usage_pct` → `usagePct`).

---

## Caching Plan

Both new fetchers follow the exact pattern in `lib/data/usage-cache.ts`:
`'use cache'` + `cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(format))`
+ `cacheLife("hours")` + `createStaticClient()`. Each gets a thin server action
in `actions/usage.ts` returning `ActionResult<T>`, mirroring
`fetchPipelineData`. Invalidation already flows through
`invalidateUsageStatsCaches(formats)` (admin action) and
`/api/revalidate/usage` (import webhook) — both new fetchers carry the same tag,
so **no invalidation changes are needed**. The pattern extends cleanly.

New cached fetchers:
- `getCachedUsageBySource(params)` — params `{ format, periodStart, periodEnd, minPlayers }`
- `getCachedUsageConversion(params)` — params `{ format, source, periodStart, periodEnd, minPlayers, topPct }` (`topPct` keys the cache and maps to `p_top_percentile`)

Charts 2, 5, 6 add **no new fetchers** (reuse timeseries + pipeline). Net: the
page goes from 3 server fetches to **5** (`Promise.all` adds source +
conversion). Both new entries are small payloads.

Client layer: both new datasets get a TanStack `useQuery` in `UsageExplorer`
mirroring the existing `points` / `pipelineResult` queries —
`initialData` from the server page when filter keys match, `placeholderData:
(prev) => prev`, `staleTime: 5 * 60 * 1000`. Charts 2/5/6 read the existing
`points` / `pipelineResult` queries directly.

---

## Page Layout Options

> **Decided: Option A (tabbed), URL-persisted tab, lazy-load per tab.** See
> Decision 1. Options B and C are retained below as the rationale trail.

The current page is a single scrolling column (Sankey, then line chart) beside
the sticky sidebar. Adding six charts to one scroll would overwhelm. Three
options:

### Option A — Tabbed sections (RECOMMENDED)

Group charts into three tabs above the chart area; the sidebar stays persistent
across tabs. Tabs: **Overview · Trends · Sources**.

```
┌────────┬──────────────────────────────────────────────┐
│        │  📊 Data — Pokémon usage across tournaments   │
│ FILTER │  ┌────────────────────────────────────────┐  │
│ SIDEBAR│  │  [ Overview ] [ Trends ] [ Sources ]   │  │  ← Base UI Tabs
│        │  └────────────────────────────────────────┘  │
│ format │                                                │
│ source │  ── Overview tab ───────────────────────────  │
│ gran.  │  ┌──────────────┐  ┌───────────────────────┐  │
│ pipe.  │  │   Treemap     │  │  Usage vs Conversion  │  │
│ min pl │  │  (meta now)   │  │      scatter          │  │
│        │  └──────────────┘  └───────────────────────┘  │
│ ─────  │  ┌────────────────────────────────────────┐  │
│ Pokémon│  │   Meta Pipeline (Sankey)                │  │
│ presets│  └────────────────────────────────────────┘  │
│ search │                                                │
│ ☑ list │  ── Trends tab ─────────────────────────────  │
│        │  Usage Over Time  [ Lines | Stream ]  (card)   │
│        │  Bump chart  [ Top 8 | 12 | 20 ]      (card)   │
│        │                                                │
│        │  ── Sources tab ────────────────────────────  │
│        │  Source dumbbells  ·  Overall vs Top 10%       │
└────────┴──────────────────────────────────────────────┘
```

- **Why recommended:** caps cognitive load (one theme per tab), keeps the
  persistent sidebar driving every tab, and gives a natural home for the
  source-comparison "ignores Source filter" caption (the whole Sources tab is
  cross-source). Tab is URL-persisted (`?tab=trends`) so links are shareable.
- Mobile: tabs become a horizontal-scroll pill row (per mobile-responsiveness
  rule); one chart per row, full width.

### Option B — Single scrolling dashboard with anchor nav

All eight charts (2 existing + 6 new) stack in one column; a sticky in-page
anchor bar (Overview / Trends / Sources) jump-scrolls.

```
│ FILTER │  [Overview] [Trends] [Sources]   ← anchor links
│ SIDEBAR│  Treemap                                       │
│        │  Scatter                                       │
│        │  Sankey                                        │
│        │  Usage Over Time (+Stream toggle)              │
│        │  Bump                                          │
│        │  Source dumbbells                              │
│        │  Overall vs Top 10% dumbbell                   │
```

- Pro: everything visible by scroll, no hidden charts, simplest state.
- Con: eight charts is a long page; all fetch on load (heavier first paint);
  more scrolling on mobile.

### Option C — Chart-picker cards (gallery)

A grid of small "chart cards"; clicking one expands it to full width / opens a
focused view. Only the expanded chart fetches.

- Pro: lightest initial load (lazy per chart), playful/exploratory feel.
- Con: hides charts behind a click (competitive users want them visible);
  more interaction state; weakest for "scan the whole meta at a glance."

**Recommendation: Option A (tabbed).** It matches the audience (competitive
players want grouped, scannable views; casuals aren't overwhelmed), keeps the
sidebar central, and gives the cross-source charts a clean home. Lazy-load each
tab's charts (only the active tab's non-shared fetchers run) to keep first paint
cheap — Overview tab fetches treemap (pipeline, already loaded) + conversion;
Sources tab fetches source + conversion; Trends tab is all reuse.

---

## Shared Filter State

All charts subscribe to the existing URL-driven filter bar (format, source,
date-range via brush, min-players) **except** the two source-comparison charts'
treatment of `source`:

- Charts 1, 2, 4, 5, 6: honor all filters including `source`.
- Chart 3 (source dumbbells): **ignores `source`** by design — communicated via
  the card caption described above. (Chart 4, overall-vs-Top-10%, *does* honor
  `source` — it compares overall vs the Top-10% field *within* the selected
  source.)

Selected-species set (sidebar checklist + presets) drives the **Trends** charts
only: line chart, streamgraph, bump chart. The treemap, scatter, and both
dumbbells show the **whole field** (top-N capped) regardless of selection — see
Decision 5.

`topPct` is a URL param (`?topPct=0.05|0.10|0.25`, default `0.10`, omitted at the
default) driving the **Top 10%** threshold control on both conversion charts
(scatter #1 and dumbbell #4). The active tab is the URL param `tab`
(`overview|trends|sources`, default `overview`). See Decisions 1 and 2.

---

## Component File Map

All under `apps/web/src/components/data/` (per nextjs-conventions: feature dir,
not route-colocated). Tests in `__tests__/`.

```
components/data/
  usage-explorer.tsx            (MODIFY) add tabs (URL-persisted), 2 new useQuery,
                                          stream-mode/topN/topPct state
  usage-line-chart.tsx          (MODIFY) add Lines|Stream mode prop → renders stream
  usage-series.ts               (MODIFY) + buildRankSeries(), + SOURCE_COLORS,
                                          + groupBySource(), + median()/quadrant helpers
  usage-filters.ts              (MODIFY) + coerceTab(), + coerceTopPct()
  data-sidebar.tsx              (unchanged — filters already cover new charts)

  usage-treemap.tsx             (NEW) recharts Treemap + sprite tiles
  usage-conversion-scatter.tsx  (NEW) recharts ScatterChart + quadrants + sprites
  usage-bump-chart.tsx          (NEW) recharts inverted-rank LineChart + sprite labels
  usage-dumbbell.tsx            (NEW) shared DumbbellTrack/DumbbellRow primitive
  usage-source-dumbbell.tsx     (NEW) chart #3, 3 dots/row, uses usage-dumbbell
  usage-top-share-dumbbell.tsx  (NEW) chart #4 "Overall vs. Top 10%", 2 dots/row
  data-tabs.tsx                 (NEW) Tabs wrapper (Overview/Trends/Sources),
                                       horizontal-scroll pill row on mobile
  data-chart-card.tsx           (NEW) shared card chrome (header, caption, body)
  data-sprite-tooltip.tsx       (NEW) shared sprite+name+stat tooltip used by
                                       treemap/scatter/dumbbells
```

> **No `*-mobile.tsx` files.** Per Decision 6, every chart renders the same on
> mobile, responsively scaled — there are no list-substitution components and no
> hidden charts. The earlier `usage-conversion-mobile.tsx` /
> `usage-bump-mobile.tsx` entries are removed.

Shared helpers live in `usage-series.ts` (pure, no framework) and
`data-sprite-tooltip.tsx` / `data-chart-card.tsx` (presentational). Siblings
never import each other (per nextjs-conventions cycle rule) — shared symbols go
through `usage-series.ts` or a `data-shared.ts` if non-JSX constants are needed
(e.g. `SOURCE_COLORS`).

**Server vs client split.** The server page (`data/page.tsx`) fetches all five
datasets via cached fetchers and passes them as `initialData` props to
`UsageExplorer` (a Client Component). Every chart is a Client Component (recharts
needs the DOM). TanStack Query in `UsageExplorer` re-fetches only when filter
keys change — exactly the existing pattern. No chart fetches its own data; they
receive arrays as props. This keeps the React Compiler happy (no manual memo) and
matches the current architecture.

---

## Decisions (locked 2026-06-09)

Every open question is now answered. These decisions are authoritative; where a
per-chart spec above used softer "recommended" language, the rules below override
it. The implementation plan
(`docs/superpowers/plans/2026-06-09-meta-explorer-phase2-plan.md`) builds to these
decisions.

1. **Page layout — Option A (tabbed).** Three tabs: **Overview · Trends ·
   Sources**, with the filter sidebar persistent across all tabs. The active tab
   is **URL-persisted** (`?tab=overview|trends|sources`, default `overview`) so
   links are shareable. Charts **lazy-load per tab** — only the active tab's
   non-shared fetchers run. Tab assignment:
   - **Overview**: Treemap, Usage-vs-Conversion scatter, Meta Pipeline (Sankey).
   - **Trends**: Usage Over Time (Lines | Stream toggle), Bump chart.
   - **Sources**: Source dumbbells, Overall-vs-Top-10% dumbbell.

2. **Conversion threshold — "Top 10%", never "top cut".** The phrase **"top cut"
   must not appear anywhere in the UI** (labels, captions, tooltips, headings).
   The user-facing label is **"Top 10%"**, driven by a small **threshold control
   (5% / 10% / 25%)** on the conversion charts. Internally the concept is a
   percentile; the RPC param is named **`p_top_percentile`** (replaces the
   earlier `p_topcut_pct` name). The threshold control is **URL-persisted**
   (`?topPct=0.05|0.10|0.25`, default `0.10`, omitted when default) so both
   conversion charts and shareable links agree.
   - Chart #4 (the dumbbell) is renamed **"Overall vs. Top 10% usage"**, with the
     "10%" portion **following the threshold dynamically** (e.g. switches to
     "Top 5%" / "Top 25%" when the control changes). The internal/right-dot label
     is "Top 10%" (dynamic), never "top cut".
   - Column/field names in the RPC, TS types, and code use the neutral stem
     **`topPct` / `top_share` / `topShare`** rather than `topcut`. See the
     updated RPC B and per-chart specs.
   - **NULL placement rule (unchanged):** NULL-placement rows count toward
     **usage only** — excluded from both the conversion numerator and
     denominator. Conversion is `NULL` for species that appear only in events
     with no recorded placement.

3. **Top-N for bump chart and streamgraph — 20.** Both the bump chart and the
   streamgraph render the **top 20** species by latest-bucket rank / peak. The
   bump chart's inline segmented control is **Top 8 / 12 / 20**, defaulting to
   **20** (local `useState`, not URL-persisted). The streamgraph caps at top 20
   via `insideOutOrder()` over the threshold-filtered series.

4. **Streamgraph — mode toggle on the existing Usage Over Time card.** No
   separate card. The existing "Usage Over Time" card gains a `Lines | Stream`
   segmented toggle (local `useState`, defaults to `Lines`). Stream mode uses the
   existing **`insideOutOrder()`** helper to centre the highest-peak species and
   recharts `AreaChart` with `stackOffset="silhouette"`. Same data, same selected
   species, same brush as lines mode.

5. **Sidebar species selection scope — snapshot charts always show the whole
   field.** The treemap, scatter, and both dumbbells **always render the whole
   (top-N capped) field** — the sidebar species selection does **not** filter
   them. Sidebar selection drives **only the Trends charts** (line chart,
   streamgraph, bump chart), exactly as the line chart behaves today. Rationale:
   the snapshot charts' value is the overview; selection would defeat their
   purpose.

6. **Mobile — same charts, scaled down. No list fallbacks, no hidden charts.**
   Every chart renders on mobile as the **same chart**, responsively sized to
   stay legible at **393px**: `ResponsiveContainer width="100%"`, fewer axis
   ticks, smaller sprites, and reduced top-N where density demands it (e.g. cap
   sprite labels to the largest tiles/dots). There are **no** `*-mobile.tsx`
   list-substitution components and **no** charts hidden behind a breakpoint.
   This supersedes the per-chart "Mobile fallback: a … list" notes in specs #1
   and #2 above and the "two-column list" / "biggest-movers list" components in
   the file map — those components are **removed** from the plan. The tab pill
   row uses the horizontal-scroll pattern from the mobile-responsiveness rule.

### Wording propagation note

The prose specs, the RPC-B definition, the layout ASCII, and the
shared-filter-state section above have all been reconciled with the locked
decisions: the phrase "top cut" no longer appears anywhere in the UI surface,
the RPC param is `p_top_percentile`, the RPC columns use the neutral `top_*` /
`top_share` stem, and the mobile-list fallback components have been removed from
the file map. **If any residual softer/"recommended" wording remains in a
per-chart spec, Decisions 1–6 override it.** The implementation plan
(`docs/superpowers/plans/2026-06-09-meta-explorer-phase2-plan.md`) is the single
source of truth for the final RPC signature, column names, UI labels, and the
component set.
