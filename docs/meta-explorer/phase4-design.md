# Meta Explorer Phase 4 — Metadata Views (Design)

Date: 2026-06-09
Status: Design — for orchestrator review with the user. No implementation code.

## Overview

Phase 1 gave `/data` a `team_slots` fact table and live SQL RPCs. Phase 2 (being
finalized in parallel) adds the **Overview · Trends · Sources** tab structure, a
`get_usage_conversion` RPC (percentile-driven "Top 10%" conversion), and the
rule that mobile renders the same charts scaled down to 393px.

Phase 4 adds three **metadata breakdown** views — usage sliced by a _player or
event_ dimension rather than over time:

| #   | View                 | One-liner                                                             | Data scope                                                  |
| --- | -------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Usage by country     | Regional meta differences — which species over-index in which country | `country` (RK9 + Limitless only)                            |
| 2   | Division comparison  | Masters vs Seniors vs Juniors meta side by side                       | `division` (RK9 only)                                       |
| 3   | Placement-band usage | How usage shifts from winners → top 10% → top 25% → field             | `placement` (RK9 + Limitless; trainers.gg after completion) |

The defining constraint of this phase is **data sparsity is honest**. Two of the
three dimensions only exist for a subset of sources (`country`: no trainers.gg;
`division`: RK9 only). Every view must communicate its scope in the UI and
degrade to a clear empty state — never silently show a partial or misleading
slice. A second hard constraint is **re-identification safety**: country sliced
by other dimensions can fingerprint a single player in a small-country slice, so
a minimum-sample floor is enforced in SQL, not just the UI.

### Key reuse findings (from reading the current code)

- **`countryFlag(code)`** already exists in
  `apps/web/src/components/limitless/limitless-standings.tsx:218` (ISO-2 →
  regional-indicator emoji). Phase 4 needs it in two more places — **extract it
  to `@trainers/utils`** (next to `COUNTRIES` / `getCountryName`) and have
  Limitless standings import the shared version. No new dep.
- **`getCountryName(code)`** + **`COUNTRIES`** in `@trainers/utils` give the
  full ISO-2 name lookup for tooltips and the ranked list.
- **`assignColor(species)`** (`usage-series.ts`) — every Phase 4 chart keys
  species color by name, identical to Phase 2, so a species is the same color
  across every view.
- **`getPokemonSprite(species)`** returns `{ url, w, h, pixelated }` — sprite
  rows in all three views reuse it (apply `[image-rendering:pixelated]` when
  `.pixelated`).
- **`data-chart-card.tsx` / `data-sprite-tooltip.tsx`** (NEW in Phase 2) — the
  shared card chrome and sprite tooltip. Phase 4 reuses both; it adds **zero new
  shared primitives** beyond a tiny sprite-row list helper.
- **`usage-dumbbell.tsx`** (NEW in Phase 2) — the shared dumbbell track/row
  primitive. The placement-band view can reuse it for its banded variant.
- Only **`recharts ^2.15.4`** and **`d3-sankey`** are installed in the current
  web app. **Phase 4 adds two new dependencies** for the country choropleth:
  `d3-geo` + `world-atlas` topojson (Decision 1 — choropleth world map is the
  build target). These are accepted new deps per the locked decision.

---

## Where these views live (page placement)

Phase 2 establishes three tabs (Overview · Trends · Sources), URL-persisted via
`?tab=`, sidebar persistent across all tabs, lazy-loaded per tab. Three options
for Phase 4:

### Option A — A fourth tab: **Breakdowns** (RECOMMENDED)

Add one tab holding all three metadata views, stacked as cards:

```
┌────────┬──────────────────────────────────────────────────┐
│ FILTER │  [ Overview ] [ Trends ] [ Sources ] [ Breakdowns ]│  ← 4th Base UI tab
│ SIDEBAR│  ── Breakdowns tab ──────────────────────────────  │
│        │  ┌────────────────────────────────────────────┐   │
│ format │  │  Usage by country   · "RK9 + Limitless"     │   │
│ source │  │  ranked flag list + per-country drill       │   │
│ gran.  │  └────────────────────────────────────────────┘   │
│ min pl │  ┌────────────────────────────────────────────┐   │
│        │  │  Division comparison · "RK9 events only"    │   │
│        │  │  Masters / Seniors / Juniors small multiples │   │
│        │  └────────────────────────────────────────────┘   │
│        │  ┌────────────────────────────────────────────┐   │
│        │  │  Placement-band usage · banded slope/heatmap │   │
│        │  └────────────────────────────────────────────┘   │
└────────┴──────────────────────────────────────────────────┘
```

- **Why recommended:** these three views share one mental model — "slice the
  same usage by a different dimension." Grouping them caps cognitive load
  (matches the Phase 2 one-theme-per-tab rationale), gives the source-scoped
  captions ("RK9 + Limitless", "RK9 events only") a consistent home, and keeps
  lazy-loading clean (the heavier breakdown RPCs only run when the tab opens).
  The tab name **"Breakdowns"** reads more honestly than "Regions" (only one of
  three is regional) or "Demographics" (juniors/seniors/masters is an age
  division, but "Demographics" overstates it and reads clinically).
- Tab value `?tab=breakdowns`, slotted after `sources` in the coercer.
- Mobile: the tab joins the existing horizontal-scroll pill row; one card per
  row, full width.

### Option B — Distribute into existing tabs

Country + division → a new "context" strip under Overview; placement-band folds
into the Phase 2 Top-10% dumbbell on the Sources tab.

- Pro: no new tab; placement-band genuinely overlaps the Phase 2 conversion
  charts (see view 3).
- Con: country and division have no natural home — they'd crowd Overview, which
  Phase 2 already fills with Treemap + Scatter + Sankey. Splits a coherent set.

### Option C — Separate sub-route `/data/breakdowns`

- Pro: fully isolates the sparse-data views; lightest main page.
- Con: breaks the single-page filter-sidebar model; users lose the shared
  filter state on navigation; weakest discoverability. Rejected.

**Decision 2: Option A (Breakdowns tab).** Fourth tab after Overview / Trends /
Sources. Tab value `?tab=breakdowns`. It is the smallest consistent extension of
the Phase 2 structure and keeps the source-scoped honesty captions together.

---

## Per-View Specs

### View 1 — Usage by Country

**What it shows.** For each country with enough sample, which species the
country's players over- or under-index on relative to the global meta. The
honest, low-dependency presentation is a **ranked country list**: each row is a
country (flag + name + player count), and expanding/selecting a country reveals
its **top-10 species with a usage bar, paired with the global usage % for the
same species** so the regional skew is visible (e.g. "JP runs Incineroar at 42%
vs 31% globally").

**Country view rendering — Decision 1: CHOROPLETH WORLD MAP.** This overrides the
doc's original ranked-flag-list recommendation. The primary build target is a
`d3-geo` + `world-atlas` topojson choropleth: countries shaded by a usage-weighted
score (or "number of distinct meta picks over-indexing"), clicking a country opens
its top-10 species panel vs global usage. `d3-geo` and `world-atlas` are accepted
new dependencies. Mobile = same map scaled down (pinch/tap friendly, legible at
393px), consistent with the project's "same charts, scaled down" stance.

The ranked flag list (option b below) is retained as the **documented fallback /
empty-sparse-state companion** — displayed alongside or below the map when data
is too sparse to shade a meaningful proportion of the world's countries.

Design options weighed (for rationale trail — the choropleth is the build target):

| Approach                                       | New deps | What it answers well                                         | Mobile                 | Verdict                                                                 |
| ---------------------------------------------- | -------- | ------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------- |
| **(a) Choropleth (`d3-geo` + `world-atlas`)**  | **2**    | "which regions differ" — visual impact + geographic context  | same map, scaled down  | **BUILD TARGET (Decision 1)**                                           |
| (b) Ranked flag list + per-country drill       | 0        | "which species over-index per country" — the actual question | excellent (rows stack) | fallback / sparse-state companion                                       |
| (c) Grid-cartogram (CSS grid of country tiles) | 0        | spatial-ish glance                                           | OK                     | rejected — tile placement is arbitrary without geo data; reads as noise |

**Data scope + honesty.** `country` is populated for **RK9 and Limitless only**
(trainers.gg is NULL in v1, privacy-gated by `show_country_flag`). Card caption:
_"Country data is available for RK9 and Limitless events only."_ When the global
Source filter is set to `trainers.gg`, this view has no data → empty state
(below).

**Re-identification floor (hard constraint — Decision 5: 20 players).** The RPC
suppresses any country whose total sampled players in the slice is **below 20**
(`p_min_country_players = 20` default). This prevents a 3-player country reading as
"100% usage" and, critically, prevents a small-country slice from fingerprinting
an individual. The floor is applied in SQL (`HAVING country_players >= p_min_country_players`),
not just hidden in the UI, so the suppressed rows never leave the database. A
muted footer notes: _"Countries with fewer than N sampled players are hidden."_

**Component.** `usage-country-breakdown.tsx` — primary: a `d3-geo` choropleth
world map (SVG projection, countries shaded by usage data) with a click handler
that opens a side panel of the country's top-10 species vs global usage. The
ranked flag list (CSS rows of `flag · name · player-count · rank`) renders below
the map as the sparse-state companion and provides accessible navigation.
Selecting a country (map or list) expands an inline panel of top-10 sprite rows,
each with two bars (country usage teal/primary, global usage muted). Reuses
`data-sprite-tooltip.tsx`.

**Mobile (393px).** Same choropleth map scaled to fit the viewport — pinch/tap
friendly; tap a country to open its panel. The ranked list below provides a
fallback for very small screens where the map is too small to tap individual
countries.

**Interactions.** Click a country row → expand its top-10 vs global. Click a
species sprite → Phase 3 drill-down (gated behind the same absent-in-Phase-4
`speciesHref?` prop Phase 2 uses). Subscribes to format / date-range /
min-players; honors `source` (rk9/limitless/all) but renders empty for
trainers.gg.

**Mobile (393px).** Rows are full-width and stack natively; the expanded top-10
is a vertical sprite-row list. No separate component. Flags + bars stay legible;
sprite ≥ tap target where it's clickable.

**Empty / sparse states.**

- Source = trainers.gg → `EmptyState` (minimal variant): _"No country data for
  trainers.gg events. Country usage is available for RK9 and Limitless."_
- All countries below the floor (tiny slice) → _"Not enough data per country to
  show a regional breakdown yet."_

---

### View 2 — Division Comparison

**What it shows.** The meta in **Masters vs Seniors vs Juniors** side by side —
do juniors favor different species than masters? Each division is a column; each
column is a top-10 ranked sprite list with usage % bars. A species' row aligns
across columns so the eye tracks "Pikachu is #2 in Masters but #7 in Juniors."

**Rendering choice — small multiples (RECOMMENDED).** Three options:

| Option                                              | Reads well for                                 | Verdict                                                                                            |
| --------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Grouped bars (species × 3 division bars)            | exact-value comparison of a few species        | rejected — 10 species × 3 bars is dense, sprites don't fit                                         |
| Slope chart (rank lines across 3 columns)           | rank _movement_ between divisions              | strong, but only shows rank not magnitude                                                          |
| **Small-multiples columns** (3 top-10 sprite lists) | "what's the meta in each division" at a glance | **recommended** — sprite-friendly, mobile-friendly, honest about each division being its own field |

**Recommendation: small-multiples columns** — three independent top-10 sprite
lists (Masters / Seniors / Juniors), each with usage % bars, sharing
`assignColor` so a species is the same color across columns. It is the most
sprite-friendly and the cleanest mobile degrade (columns become stacked
sections). A subtle rank-delta chip (e.g. "▲3 vs Masters") on Seniors/Juniors
rows gives the slope-chart insight without a separate chart.

**Data scope + honesty.** `division` is **RK9 only**. Card caption: _"Division
data is available for RK9 events only."_ Limitless and trainers.gg rows have NULL
division and are excluded from this view's denominator entirely (they don't
dilute it). When Source = limitless or trainers.gg → empty state.

**Sample floor.** Each division column is suppressed if its sampled players fall
below the same per-slice floor (juniors are often a small field). A column that
falls below shows _"Not enough Junior data in this slice"_ in place of its list,
rather than a misleading 2-player 100%.

**Component.** `usage-division-comparison.tsx` — a responsive 3-column grid of
sprite-row lists. Reuses the sprite-row list helper and `data-sprite-tooltip`.
Not a recharts chart.

**Interactions.** Hover a row → tooltip (sprite + name + usage % + n players in
that division). Click sprite → Phase 3 (gated). Subscribes to format /
date-range / min-players; honors `source` (only `rk9` or `all` produce data).

**Mobile (393px).** 3 columns → stacked sections (`grid-cols-1 sm:grid-cols-3`
per the wide-grid-collapse rule). Each division becomes a labeled top-10 list.
Rank-delta chips remain.

**Empty / sparse states.**

- Source = limitless or trainers.gg → _"No division data for this source.
  Division (Masters/Seniors/Juniors) is available for RK9 events only."_
- A single division below floor → that column shows a per-column sparse note;
  the others still render.

---

### View 3 — Placement-Band Usage

**What it shows.** How a species' usage changes as you move up the standings:
**winners (top 1%) → top 10% → top 25% → field (rest)**. A species that climbs
across bands is over-performing; one that fades is popular-but-underperforming.

**Relationship to Phase 2's Top-10% dumbbell (the honest part).** Phase 2's
"Overall vs. Top 10%" dumbbell already covers **two** bands (overall vs top-N%).
Phase 4's added value is the **multi-band gradient** — 4 bands, not 2 — showing
the _monotonic climb or fade_ across the full placement spectrum. Two ways to
deliver that:

**Option 3a — Standalone multi-band view (species × band heatmap or banded
slope).** A heatmap with species as rows, the 4 bands as columns, cell shaded by
that species' usage % within the band (teal intensity = `assignColor` hue at
varying lightness, or a single-hue ramp). The eye scans left-to-right for a
species' trajectory; the column gradient shows which mons concentrate at the top.
Alternative within 3a: a banded slope chart (4 x-positions, one line per top-N
species) — reads the climb/fade more directly but gets noisy past ~12 species.
**Recommended sub-choice: heatmap**, capped to top ~25 species by overall usage,
because it scales to more species and is screenshot-friendly.

**Option 3b — Fold into the Phase 2 dumbbell as an "advanced" multi-band mode.**
Add a `2-band | 4-band` toggle to the existing Top-10% dumbbell: 2-band is the
Phase 2 default (overall vs Top-10%); 4-band renders 4 dots per track (field /
25% / 10% / 1%) on the same dumbbell primitive. No new chart, no new card.

**Recommendation: 3a (standalone heatmap) — but this is the open question.** The
multi-band gradient is a genuinely different read from the 2-dot dumbbell (a
heatmap of 25 species × 4 bands shows the _whole field's_ concentration pattern,
which a dumbbell can't), so it earns its own card. **However**, if the user
prefers the leaner page, 3b is a legitimate honest fold-in — the 4-dot dumbbell
mode reuses the Phase 2 primitive and adds almost no surface. The deciding factor
is whether the user wants the "field-wide concentration" view (→ heatmap) or just
"these specific mons climb/fade" (→ dumbbell mode). Listed as an open question.

**Band definitions (open question).** Proposed percentile bands, computed per
`(source, event_key, division)` with `percent_rank()` over `placement ASC` so
they're event-size-relative (consistent with Phase 2's conversion threshold):

| Band    | Definition                      |
| ------- | ------------------------------- |
| Winners | `percent_rank <= 0.01` (top 1%) |
| Top 10% | `0.01 < percent_rank <= 0.10`   |
| Top 25% | `0.10 < percent_rank <= 0.25`   |
| Field   | `percent_rank > 0.25`           |

Bands are **disjoint** (each player in exactly one band) so the 4 usage %s within
a band sum coherently — distinct from Phase 2's _cumulative_ "top 10%" (which
includes the top 1%). This distinction is worth surfacing in a caption:
_"Bands are exclusive — 'Top 10%' here means players ranked 1–10% but outside the
top 1%."_ The exact edges (1/10/25 vs e.g. 1/8/16) are the user's call.

**NULL-placement handling.** Identical to Phase 2: rows with NULL placement
(trainers.gg pre-completion) are **excluded from all bands** — they have no
standing to band by. They are not shown in this view at all (unlike usage charts,
which keep them). Caption notes the view covers placement-bearing events only.

**Data scope.** `placement` exists for RK9 + Limitless at import, and
trainers.gg after tournament completion. So this view has the **widest** source
coverage of the three (no source produces a guaranteed-empty state, though a
trainers.gg-only slice of in-progress events would be empty). Honors `source`.

**Component.** `usage-placement-bands.tsx` — if 3a heatmap: a CSS grid (species
rows × 4 band columns), each cell a colored tile with the usage % and a sprite in
the row label; reuses `assignColor` lightness ramp and `data-sprite-tooltip`. If
3b: a mode prop on the existing `usage-top-share-dumbbell.tsx`. Not recharts in
either case (grid/dumbbell are hand-rolled, matching the Sankey/dumbbell pattern).

**Interactions.** Hover a cell → tooltip (species + band + usage % within band +
n players in band). Click sprite → Phase 3 (gated). Subscribes to format /
source / date-range / min-players. The band-edge control (if exposed) is local
`useState` or a URL param — see open questions; default to fixed 1/10/25 unless
the user wants it adjustable.

**Mobile (393px).** Heatmap: 4 band columns are narrow but fit at 393px (4 ×
~70px + sprite label); cap to top ~20 species so rows stay ≥ tap height. If 4
columns feel cramped, the sprite-label column is sticky-left and the 4 band
columns get a tiny horizontal scroll _within the card only_ (the status-pill-row
pattern), never page-level overflow. Dumbbell mode: rows stack natively, same as
Phase 2.

**Empty / sparse states.** Slice with no placement-bearing events (e.g.
trainers.gg in-progress only) → _"No completed-event placement data in this
slice yet."_ A band below the per-slice floor collapses into "Field" with a note.

---

## New RPC Definitions

All follow Phase 1 conventions exactly: `LANGUAGE sql STABLE SECURITY INVOKER SET
search_path = ''`, `GRANT EXECUTE … TO anon, authenticated`, `p_source` `'all'`
passthrough where applicable, `p_min_players` bucket filter, denominator =
`SUM(total_players)` over `DISTINCT (source, event_key, division)`, numerator =
`COUNT(DISTINCT player_key)`. All go in **one new migration**
`<ts>_usage_phase4_rpcs.sql`.

### RPC A — `get_usage_by_country`

Per-country, per-species usage % in one call, with a re-identification floor.
Powers View 1.

```
get_usage_by_country(
  p_format             text,
  p_source             text  DEFAULT 'all',   -- 'all' | 'rk9' | 'limitless' (trainers.gg has no country)
  p_start              date  DEFAULT NULL,
  p_end                date  DEFAULT NULL,
  p_min_players        int   DEFAULT 0,        -- event-bucket floor (existing semantics)
  p_min_country_players int  DEFAULT 20        -- re-identification floor per country (suppression)
) RETURNS TABLE (
  country         text,     -- ISO-2
  species         text,
  country_players bigint,   -- distinct player_key in this country running species
  country_total   bigint,   -- distinct player_key total in this country (the per-country denominator)
  usage_pct       numeric   -- country_players / country_total
)
```

Notes:

- Rows with NULL `country` are excluded (trainers.gg, and Limitless rows where
  country was optional/absent). So `p_source='trainers.gg'` yields zero rows by
  construction.
- **Per-country denominator** = `COUNT(DISTINCT player_key)` within that country
  across the slice (not `SUM(total_players)` — a player's country is a player
  attribute, so the honest denominator is "players from this country with a
  sheet," counted distinctly). This differs from the event-level denominator and
  is the correct one for "share of this country's players running X."
- **Suppression floor:** `HAVING country_total >= p_min_country_players` — any
  country below the floor returns **no rows** (suppressed in SQL, never sent).
- The global comparison usage % (for the drill's "vs global" bars) is **not**
  re-fetched — the client already has the pipeline/timeseries data, or computes
  global from summing the country rows; to avoid a second source of truth, the
  RPC can optionally return a `country = '__global__'` synthetic group OR the
  client reuses the existing pipeline `usagePct`. **Recommendation: reuse the
  existing pipeline usage % the page already fetched** (no synthetic group, no
  extra round trip).
- Ordered `country ASC, usage_pct DESC` for stable client grouping.

### RPC B — `get_usage_by_division`

Per-division, per-species usage %, RK9-scoped. Powers View 2.

```
get_usage_by_division(
  p_format       text,
  p_source       text  DEFAULT 'all',   -- only rk9 rows have division; 'all' effectively = rk9 here
  p_start        date  DEFAULT NULL,
  p_end          date  DEFAULT NULL,
  p_min_players  int   DEFAULT 0
) RETURNS TABLE (
  division        text,     -- 'masters' | 'senior' | 'junior'
  species         text,
  division_players bigint,  -- distinct player_key in this division running species
  division_total  bigint,   -- distinct (event_key)-summed total_players for this division
  usage_pct       numeric   -- division_players / division_total
)
```

Notes:

- Rows with NULL `division` are excluded. Limitless/trainers.gg therefore
  contribute nothing; a `p_source='limitless'` call returns zero rows.
- **Per-division denominator** uses the standard event denominator scoped to the
  division: `SUM(total_players)` over `DISTINCT (source, event_key, division)`
  _within each division_. Because `total_players` is recorded per
  event(-division) (see schema comment), this is exact and reuses Phase 1
  semantics — division is already part of the distinct key.
- Per-division sample floor for the UI column-suppression is applied
  **client-side** from the returned `division_total` (so the RPC stays simple and
  the floor is a presentation choice), OR mirrored as a param if the user wants
  it enforced in SQL. Default: client-side suppression of columns below the floor.
- Ordered `division ASC, usage_pct DESC`.

### RPC C — `get_usage_by_placement_band`

Per-band, per-species usage % across exclusive percentile bands. Powers View 3.
Generalizes the _concept_ behind Phase 2's `get_usage_conversion` but does **not**
replace it — Phase 2's RPC returns cumulative top-N% conversion (2-band); this
returns **disjoint** multi-band usage. (See "Overlap with Phase 2" below.)

```
get_usage_by_placement_band(
  p_format       text,
  p_source       text    DEFAULT 'all',
  p_start        date    DEFAULT NULL,
  p_end          date    DEFAULT NULL,
  p_min_players  int     DEFAULT 0,
  p_band_edges   numeric[] DEFAULT ARRAY[0.01, 0.10, 0.25]  -- exclusive band boundaries
) RETURNS TABLE (
  band           text,     -- 'winners' | 'top10' | 'top25' | 'field' (derived from edges)
  species        text,
  band_players   bigint,   -- distinct player_key in this band running species
  band_total     bigint,   -- distinct player_key total in this band (band denominator)
  usage_pct      numeric   -- band_players / band_total
)
```

Notes:

- **Placement-bearing events only:** a `(source, event_key, division)` with ≥1
  non-NULL `placement`. Within each, `percent_rank()` over `placement ASC`
  (1 = best) assigns each player to exactly one band using `p_band_edges`. NULL
  placement rows are excluded entirely.
- **Exclusive bands** (each player in one band) — distinct from Phase 2's
  cumulative top-N%. The band denominator `band_total` = distinct players in that
  band across the slice; `usage_pct` = share of that band running the species.
- `p_band_edges` is parameterized so the user can adjust edges (1/10/25 default)
  without an RPC change. Band labels are derived in the TS wrapper from the edges
  (so 3 edges → 4 bands). If the user wants fixed edges, the param can default and
  the UI simply never overrides it.
- Ordered `band ASC, usage_pct DESC`.

### Overlap with Phase 2 — explicit non-duplication note

Phase 2's `get_usage_conversion` answers "what share of a species' players reached
the **cumulative** top N%?" (a per-species conversion _rate_). RPC C answers
"within each **disjoint** placement band, what's the species' usage %?" (a
per-band _composition_). They share the `percent_rank()` machinery but produce
different shapes for different charts. **A generalization is attractive** — one
RPC returning both cumulative and disjoint slices — but redesigning Phase 2 is
out of scope here. _Option noted for the user:_ if Phase 2 is not yet locked, its
`get_usage_conversion` could be widened to accept band edges and return disjoint
bands, making RPC C unnecessary. **Do not act on this without the user's call** —
Phase 2 is being finalized in parallel. Default plan: RPC C is its own function.

### Index implications

Existing indexes cover the country/division group-bys:

- `idx_team_slots_format_date (format, event_date)` — date-range scans.
- `idx_team_slots_format_source (format, source)` — source filter.
- `idx_team_slots_format_species (format, species)` — per-species aggregation.

No existing index directly serves `country` or `division` grouping, but both run
over the already-format-filtered working set (small after the format filter), so
a hash-aggregate/sort is acceptable. RPC C's `percent_rank()` partitions by
`(source, event_key, division)` ordered by `placement` — same window shape Phase
2 flagged. **Recommendation: ship with existing indexes; add a targeted index
only if a view is _measured_ slow** — matches the Phase 1 indexes-only,
escalate-on-measurement stance. Candidate if measured slow: a partial index on
`(format, country)` `WHERE country IS NOT NULL` for View 1.

### TS wrappers + types

Add to `packages/supabase/src/queries/usage.ts` (re-export from the barrel):

- `getUsageByCountry(supabase, params)` → `CountryUsageRow[]`
  (`{ country, species, countryPlayers, countryTotal, usagePct }`), grouped
  client-side into `CountryBreakdown { country, total, species: SpeciesUsage[] }`
  by a pure helper in `usage-series.ts`.
- `getUsageByDivision(supabase, params)` → `DivisionUsageRow[]`
  (`{ division, species, divisionPlayers, divisionTotal, usagePct }`), grouped
  into `DivisionColumn { division, total, species: SpeciesUsage[] }`.
- `getUsageByPlacementBand(supabase, params)` → `PlacementBandRow[]`
  (`{ band, species, bandPlayers, bandTotal, usagePct }`), grouped into
  `BandColumn { band, total, species: SpeciesUsage[] }`. `params` includes
  optional `bandEdges` (mapped to `p_band_edges`).

All cast numerics like existing wrappers (`row.usage_pct` → `usagePct`). Per the
re-identification floor, `getUsageByCountry` params include `minCountryPlayers`
(mapped to `p_min_country_players`).

---

## Caching Plan

All three new fetchers follow the exact pattern in `lib/data/usage-cache.ts`:
`'use cache'` + `cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(format))` +
`cacheLife("hours")` + `createStaticClient()`. Each gets a thin server action in
`actions/usage.ts` returning `ActionResult<T>`, mirroring `fetchPipelineData`.
Invalidation already flows through `invalidateUsageStatsCaches(formats)` (admin
action) and `/api/revalidate/usage` (import webhook) — both new fetchers carry the
same tag, so **no invalidation changes are needed**.

New cached fetchers:

- `getCachedUsageByCountry(params)` — params
  `{ format, source, periodStart, periodEnd, minPlayers, minCountryPlayers }`
  (`minCountryPlayers` keys the cache and maps to `p_min_country_players`).
- `getCachedUsageByDivision(params)` — params
  `{ format, source, periodStart, periodEnd, minPlayers }`.
- `getCachedUsageByPlacementBand(params)` — params
  `{ format, source, periodStart, periodEnd, minPlayers, bandEdges }`
  (`bandEdges` serialized into the cache key; default omitted at 1/10/25).

**Lazy per tab.** Per the Phase 2 lazy-load decision, the Breakdowns tab's three
fetchers only run when `?tab=breakdowns` is active. View 1's "vs global" bars
reuse the already-fetched pipeline `usagePct` (no extra fetch). Net: opening the
Breakdowns tab adds **three** small server fetches via `Promise.all`.

**Client layer.** Each dataset gets a TanStack `useQuery` in `UsageExplorer`
mirroring the existing `points` / `pipelineResult` queries — `initialData` from
the server page when the tab is the initial tab and filter keys match,
`placeholderData: (prev) => prev`, `staleTime: 5 * 60 * 1000`. When Breakdowns is
not the initial tab, the queries are `enabled`-gated until the tab opens (lazy).

---

## Component File Map

All under `apps/web/src/components/data/` (per nextjs-conventions: feature dir).
Tests in `__tests__/`.

```
components/data/
  usage-explorer.tsx            (MODIFY) add 'breakdowns' tab, 3 new useQuery
                                          (lazy/enabled-gated), minCountryPlayers
                                          + bandEdges state
  usage-filters.ts              (MODIFY) + coerceTab() extended for 'breakdowns',
                                          + coerceMinCountryPlayers(), + coerceBandEdges()
  usage-series.ts               (MODIFY) + groupByCountry(), + groupByDivision(),
                                          + groupByBand() pure helpers
  data-tabs.tsx                 (MODIFY, from Phase 2) add 4th tab pill

  usage-country-breakdown.tsx   (NEW) ranked flag list + per-country drill (View 1)
  usage-division-comparison.tsx (NEW) 3-column small-multiples sprite lists (View 2)
  usage-placement-bands.tsx     (NEW) species × band heatmap (View 3, option 3a)
                                       OR a mode on usage-top-share-dumbbell (3b)
  data-sprite-row-list.tsx      (NEW) small shared "top-N sprite rows with usage
                                       bars" presentational helper used by all 3
```

Reuses from Phase 2 (no re-creation): `data-chart-card.tsx`,
`data-sprite-tooltip.tsx`, `usage-dumbbell.tsx`, `assignColor`, `SOURCE_COLORS`.

Reuses from `@trainers/utils` (after the extraction): `countryFlag`,
`getCountryName`, `COUNTRIES`.

**Server vs client split.** The server page (`data/page.tsx`) fetches the three
breakdown datasets via cached fetchers and passes them as `initialData` props to
`UsageExplorer` **only when `?tab=breakdowns`** is the initial tab (otherwise the
client lazy-fetches on tab open). Every view is a Client Component (interactive
expand/hover). No view fetches its own data; they receive arrays as props. React
Compiler handles memoization (no manual `useMemo`). Sibling views never import
each other — shared symbols go through `usage-series.ts` / `data-sprite-row-list`.

**Honesty captions** are static strings co-located in each view component (or a
small `data-shared.ts` constant map) — `"RK9 + Limitless events only"`,
`"RK9 events only"`, `"Completed-event placements only"`.

---

## Open Questions (for the user)

1. **Country view — list or map?** Recommended: **ranked flag list, zero deps**
   (answers "which species over-index per country," renders well on mobile). If
   you want a literal choropleth world map for visual impact, that adds **two
   small deps** (`d3-geo` + a `world-atlas` topojson, ~tens of KB) and is
   weak/empty at current data volume. Your call.

2. **Tab placement.** Recommended: **a fourth "Breakdowns" tab** holding all
   three views. Alternatives: distribute into existing tabs (country/division
   crowd Overview; placement-band folds into the Sources dumbbell), or a separate
   `/data/breakdowns` sub-route (loses shared filter state). Which do you prefer?

3. **Placement-band — standalone heatmap or fold into Phase 2's dumbbell?**
   Recommended: **standalone species × band heatmap** (shows the whole field's
   concentration across 4 bands — a different read from the 2-dot dumbbell). The
   leaner alternative: add a `2-band | 4-band` mode toggle to Phase 2's existing
   Top-10% dumbbell (no new card). Which?

4. **Band definitions.** Proposed exclusive bands: **Winners (top 1%) · Top 10%
   · Top 25% · Field**, percentile-based per event. Are these the right edges, or
   do you want different cuts (e.g. 1/8/16%)? Should the edges be a
   user-adjustable control or fixed?

5. **Country suppression floor.** Proposed: **hide countries with fewer than 20
   sampled players** in the slice (re-identification safety + avoids 3-player
   "100%" rows). Is 20 the right floor, or higher/lower?
