# Meta Explorer Phase 3 — Per-Pokémon Drill-Down (`/data/pokemon/[species]`) (Design)

Date: 2026-06-09
Status: Design — for orchestrator review with the user. No implementation code.

## Overview

Phase 1 (PR #346) shipped the `team_slots` fact table and five live SQL RPCs.
Phase 2 (design locked 2026-06-09) adds six overview charts to `/data` inside a
**tabbed layout** (Overview · Trends · Sources), a `Top 10%` conversion control
(user-adjustable 5/10/25%, never the phrase "top cut"), URL-driven filter state,
and the rule that snapshot charts always show the whole field. Phase 2 also
designed **click-through stubs**: a `speciesHref?` prop on the treemap, scatter,
and dumbbell sprites that is absent in Phase 2 and becomes
`/data/pokemon/[species]` in Phase 3.

Phase 3 is the destination those clicks point to: a **single-species drill-down
page** at `/data/pokemon/[species]`. It answers "what does this Pokémon actually
run, who does it pair with, and how is its usage trending?" using the histograms
`get_species_usage_detail` already returns plus three new aggregations (true
4-move combos, teammates, and a teammate-core matrix).

The five Phase 3 features:

| #   | Feature                       | One-liner                                                               | Data source                                                                           |
| --- | ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | ⭐ Build fingerprint card     | Item / ability / tera / nature donuts + top-moves bars at a glance      | `get_species_usage_detail` (latest bucket) — **already returns these**                |
| 2   | Moveset combo view            | TRUE 4-move joint distributions — the honest replacement for the Sankey | **new RPC** `get_species_move_combos`                                                 |
| 3   | Teammate constellation        | Sprite bubbles sized by pair rate around the focal species              | **new RPC** `get_species_teammates`                                                   |
| 4   | Teammate core heatmap         | Top-N × top-N co-occurrence matrix among the focal species' teammates   | same RPC as #3 (`get_species_teammates`, includes a pair matrix) — see Decision below |
| 5   | Single-species usage timeline | Existing line chart scoped to one species with event pins               | `get_species_usage_detail` + `get_format_events` (both existing)                      |

**Two new RPCs total** (`get_species_move_combos`, `get_species_teammates`).
Feature 1 and 5 add **zero** new SQL — they reuse `get_species_usage_detail`,
which the codebase already fetches via `getCachedSpeciesUsageDetail`. Features 3
and 4 share one RPC.

### Key reuse findings (from reading the current code)

- **`get_species_usage_detail` already returns everything the fingerprint card
  needs.** Its trailing-bucket rows each carry `abilities`, `items`, `natures`,
  `moves`, `tera_types`, `ability_items` jsonb histograms shaped as
  `{value, count, pct}` (`UsageDetailEntry[]`), plus `usagePct`, `rank`,
  `sampleSize`, `usageChange7d`, `usageChange30d`. The fingerprint reads the
  **latest** bucket's histograms; the timeline reads **all** buckets' `usagePct`.
  One fetch powers features 1 and 5.
- **`getCachedSpeciesUsageDetail(params)`** already exists in
  `lib/data/usage-cache.ts` with the exact `'use cache'` + `USAGE_STATS` +
  `usageStats(format)` tag pattern. Phase 3 reuses it directly and adds two
  sibling fetchers for the two new RPCs.
- **`species` in `team_slots` is a normalized slug** (`calyrex-ice-rider`,
  `urshifu-rapid-strike`) — confirmed in `compile.ts` (`row.species.trim()`).
  The RPC `p_species` param takes that slug verbatim, and so does
  `getPokemonSprite(species)`. So the route slug **is** the RPC key — no separate
  slug→name normalization table is required (see Route section for the one edge
  case: URL case/encoding).
- **`getPokemonSprite(species)` returns `{ url, w, h, pixelated }`** — apply
  `[image-rendering:pixelated]` when `.pixelated`. The Sankey already renders
  sprites as `<image>`; the constellation, heatmap, and fingerprint reuse it.
- **`getSpeciesTypes(species)`** (from `@trainers/pokemon`) gives the type chips
  for the hero header. **`getFormatLabel` / `isChampionsFormatId`** drive the
  format display and the nature→"Stat Alignment" relabel (per the
  nature-naming memory: UI says "Stat Alignment" only for Champions formats).
- **`assignColor(species)`** gives deterministic name-keyed OKLCH colors so the
  focal species and every teammate is the same color here as on the overview.
- Only **`recharts`** and **`d3-sankey`** are installed. **Phase 3 adds zero new
  dependencies** — donuts use recharts `PieChart`, bars use recharts `BarChart`,
  the constellation and heatmap are hand-rolled SVG/CSS-grid (like the dumbbells
  and Sankey), and the timeline reuses the existing `UsageLineChart`.

---

## Route + Navigation Design

### Route: `apps/web/src/app/(app)/data/pokemon/[species]/page.tsx`

A Server Component that resolves the species slug, fetches the three datasets in
parallel via cached fetchers, and passes them to a client shell
(`SpeciesDrilldown`).

```tsx
// shape only — not implementation
interface DrilldownPageProps {
  params: Promise<{ species: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
```

**Param normalization.** The slug arrives URL-encoded
(`urshifu-rapid-strike`, `calyrex-ice-rider`, `ogerpon-hearthflame`). Steps:

1. `decodeURIComponent(params.species)` then `.trim().toLowerCase()` →
   canonical slug. (Slugs in `team_slots` are lowercase hyphenated; lowercasing
   makes the URL case-insensitive without a lookup table.)
2. Validate the slug is a known species via `Dex.species.get(slug)` from `@pkmn/dex`
   (Decision 1 — same helper used in `validation-hooks.ts` and `stats-calculator.ts`;
   an invalid slug returns undefined → `notFound()`) **before** any DB call. An unknown
   slug → `notFound()` (renders the route's `not-found.tsx`), never a 500. This
   follows the nextjs-conventions route-boundary rule (validate external input,
   404 not 500).
3. After fetch, if `get_species_usage_detail` returns **zero buckets** for the
   resolved (format, species), the species is valid but has no tournament data in
   that format → render an **empty state** ("No usage data for {name} in
   {format} yet") with a format switcher, **not** a 404. (A valid species with no
   data is a real, expected state — e.g. a mon legal but unused in Champions.)

**`generateStaticParams` — intentionally omitted.** Species × format is a large,
data-dependent matrix that changes as imports land. The page is dynamic (reads
`searchParams` for filters) and cached at the fetcher layer via `'use cache'`,
so static params would add build cost without benefit. Under `cacheComponents`
the dynamic `params`/`searchParams` reads require a **Suspense boundary** — a
`loading.tsx` skeleton in the route folder satisfies it (matches the existing
`data/loading.tsx`).

**Metadata / OG (shareability).** `generateMetadata({ params, searchParams })`
returns:

- `title`: `"{DisplayName} usage — {FormatLabel} | trainers.gg"`
- `description`: `"Item, ability, tera, moveset, and teammate data for
{DisplayName} in {FormatLabel} across tournament team sheets."`
- `openGraph` + `twitter` card. **OG image:** Phase 3 ships the **static default
  site OG card** (Decision 4). A per-species dynamic OG route (sprite + name +
  headline usage on a teal card via `next/og`) is **explicitly deferred** — not
  part of Phase 3 scope — and requires its own separate design.

Display name: use `Dex.species.get(slug).name` from `@pkmn/dex` (Decision 1).
This returns proper names like "Urshifu-Rapid-Strike", "Calyrex-Ice-Rider",
"Ho-Oh" — the same helper already used in `apps/web/src/components/team-builder/validation-hooks.ts`
and `packages/pokemon/src/stats-calculator.ts`. An invalid slug → `notFound()`.

### Navigation FROM the overview (Phase 2 stubs → live)

Phase 2 designed `speciesHref?: (species: string) => string` (absent in Phase 2)
on the treemap tiles, scatter dots, and dumbbell rows. Phase 3 supplies it:

```
speciesHref = (species) => `/data/pokemon/${encodeURIComponent(species)}` + activeFilterQuery
```

where `activeFilterQuery` carries the **shared filters** (format, source,
min-players, date range — see Filters section) so the drill-down opens in the
same context the user was exploring. Clicking a sprite navigates with
`router.push` (or a plain `<Link>` for the treemap/heatmap tiles where the whole
tile is the link). This is the only change Phase 3 makes to Phase 2 components:
flip the gated `speciesHref` from absent to present. No chart internals change.

### Navigation ON the drill-down

- **Back to `/data`**: a breadcrumb `Data / {Format} / {Species}` at the top.
  The "Data" and "{Format}" crumbs link back to `/data` preserving filters.
- **Species switcher** (Decision 2 — Base UI `Combobox` type-ahead in the hero): a
  searchable `Combobox` in the hero header, seeded from the format's species list (reuse the
  pipeline/`get_species_usage` ranking the page can fetch, or the sidebar's
  existing species list). Selecting a species navigates to that species' page,
  carrying the current filter query. This lets a user hop Koraidon → Miraidon
  without returning to `/data`.
- **Teammate click-through**: clicking any teammate sprite (constellation or
  heatmap) navigates to _that_ teammate's drill-down (same `speciesHref`).

---

## Per-Feature Specs

### 1. ⭐ Build Fingerprint Card

**What it shows.** The at-a-glance "what does this thing run" card, the page's
hero content below the header. Four small **donut** charts (item, ability, tera,
nature) + a horizontal **top-moves bar** list. Each donut shows the top ~5
values with the rest collapsed into "Other"; center label shows the modal value
and its %. The moves list shows the top 8–10 moves as labeled bars (move name +
%), since a Pokémon has 4 move slots and the marginal move histogram routinely
has 10–20 entries.

**Champions relabel.** When `isChampionsFormatId(format)` is true: the "Nature"
donut is titled **"Stat Alignment"** and the "Tera" donut is **hidden** (Champions
formats have NULL tera — `tera_types` will be `[]`). For non-Champions formats,
show Tera and title the donut "Nature". (Matches the nature-naming and
tera_type-null rules in the usage skill.)

**Data source.** `get_species_usage_detail(format, species, source, periodType,
limit=1, minPlayers)` — but limit must cover the latest bucket. Use the existing
`getCachedSpeciesUsageDetail` with `limit` = the timeline length (12), and the
fingerprint reads the **last** element of the returned array (newest bucket).
**Zero new SQL.** The histograms are exactly `UsageDetailEntry[]` per dimension.

**Component.** `species-fingerprint.tsx`.

- Donuts: recharts `PieChart` + `Pie` with `innerRadius` (donut), custom
  `content` tooltip (`bg-popover border-border` style), slice fills via a fixed
  small categorical ramp (teal-family OKLCH, NOT `assignColor` — these are
  dimension values like items, not species). A shared
  `DONUT_SLICE_COLORS` array in `data-shared.ts`.
- Moves: a CSS bar list (label + `bg-primary/15` track + `bg-primary` fill at
  `width: {pct}%`), reusing the dumbbell's percentage-positioned-div technique —
  lighter than a recharts BarChart and easier to label.
- Item/ability/tera donut slices show the sprite/icon where available
  (`getItemSpriteStyle(item)` for items, `getShowdownTypeIconUrl` for tera) in
  the legend, not inside the donut.

**Interactions.** Hover a slice/bar → tooltip with value + count + %. Donuts are
display-only (no click navigation — these are attributes, not species).

**Mobile (393px).** Donuts stack 2×2 → 1-col on the narrowest width
(`grid-cols-2 sm:grid-cols-4` for the donut row; below `sm` the grid is
`grid-cols-2`, donuts shrink via `ResponsiveContainer`). Moves bar list is
full-width and naturally responsive. Same charts, scaled — no list fallback (per
Phase 2 Decision 6).

---

### 2. Moveset Combo View (TRUE 4-move joint distributions)

**What it shows.** The honest replacement for the Sankey. The Sankey multiplied
**marginals** (P(move A) × P(move B)), implying combos that no real player ran.
This view shows **actual** 4-move sets: each row is a real moveset that ≥1 player
ran, ranked by how many players ran it, with a bar for its share. This is the
single most-requested "what's the standard set" answer.

**Combo grouping / normalization (Decision in this doc).**

- The grouping key is the **sorted, lowercased move array** joined to a stable
  string (sort makes `[Protect, Fake Out, ...]` and `[Fake Out, Protect, ...]`
  the same combo; move order in `moves text[]` is not semantically meaningful).
- **Only rows with exactly 4 moves are included** in the combo numerator and the
  combo denominator. Rows with `<4` moves (incomplete open-team-sheet data, or a
  parser gap) are **excluded** from this view entirely — partial sets would
  pollute the "standard set" ranking and can't be honestly compared to full sets.
  The card caption states the denominator: _"Among the N players who ran a
  complete 4-move set."_ (Rows with >4 are not expected — `moves` is capped at 4
  by team-sheet structure — but if present, they're excluded too, treated as
  malformed.)
- **Flexible/partial slots** are communicated by an optional secondary view: the
  top 3 moves that appear in **almost every** set are surfaced as a "**core**"
  ("Protect · Fake Out · 2 flex"), with the flex slots shown as the distribution
  of the 4th/remaining move across the top combos. v1 ships the **ranked exact
  combos**; the "core + flex" summary is a small derived header computed
  client-side from the returned combos (the moves present in ≥X% of the top
  combos), **not** a separate query.

**How many shown.** Top **12** exact combos by player count (covers the long head
of any meta), with a "+N more sets" count. Each row: the 4 move chips (with type
color via `getShowdownTypeIconUrl`/move type) + player count + % bar.

**Data source.** New RPC `get_species_move_combos` (defined below). Returns the
sorted-array combo, its player count, and its pct of complete-set players, ranked
desc, limited server-side to e.g. top 25 (client shows 12, keeps headroom).

**Component.** `species-move-combos.tsx` — a CSS list of combo rows (no recharts;
it's a ranked bar list like the moves fingerprint). Move chips reuse a small
`MoveChip` presentational piece (move label + type-tinted background).

**Interactions.** Hover a row → exact player count + %. No navigation (moves
aren't pages). A subtle "core" summary line above the list.

**Mobile.** Rows are full-width and stack naturally; move chips wrap. Cap to top
8 on narrow widths to keep the card short. No separate component.

**Sankey relationship.** This view **replaces** the Sankey's honest job. See
"Sankey's Fate" below for the recommendation.

---

### 3. Teammate Constellation

**What it shows.** The focal species' sprite in the center, surrounded by sprite
bubbles for its most common teammates, each bubble sized by **pair rate** (how
often that teammate appears on the same team as the focal species). This is the
"what goes with this" glance — visually distinctive and shareable.

**Pair-rate metric.** For each teammate species T:

- `pair_count` = distinct players who ran **both** the focal species and T on the
  same team (same `(source, event_key, player_key)`).
- `pair_pct` = `pair_count / focal_player_count` where `focal_player_count` =
  distinct players running the focal species (the same denominator the
  fingerprint uses). So `pair_pct` reads as "X% of {focal}'s teams also ran T."
- Return **both** raw `pair_count` and `pair_pct` (raw count guards against a
  misleadingly large % on a tiny sample; the UI can show "142 teams (38%)").

**Layout algorithm — deterministic radial ring (Decision: simple, no deps).**

- A single ring (or two concentric rings for >12 teammates) of bubbles around the
  center, placed at evenly-spaced angles, ordered by `pair_pct` desc starting
  from the top (12 o'clock) and alternating sides so the strongest pairs sit
  nearest the top. Angle = `i * (360 / N)`; radius constant per ring. Pure
  trigonometry in the component — **no force-layout library**, fully
  deterministic (same input → same picture, good for SSR and screenshots).
- Bubble diameter scales with `pair_pct` (clamped to a min/max via the Tailwind
  size scale buckets — e.g. map pct ranges to `size-10 … size-20`, avoiding
  arbitrary px), so the eye reads strength by size.
- A faint connecting line from center to each bubble (SVG `<line>`,
  `stroke="var(--border)"`), opacity scaling with `pair_pct`.

**Max teammates shown.** Top **12** by pair rate (one ring); a "show top 20"
toggle expands to two rings (local `useState`). Beyond 20 is noise.

**Data source.** New RPC `get_species_teammates` (defined below) — the teammates
list. (The same RPC also returns the matrix for feature 4 — see Decision.)

**Component.** `species-teammate-constellation.tsx` — a single relatively-
positioned container; center sprite absolutely centered; teammate bubbles
absolutely positioned by computed `top`/`left` percentages from the angle math.
SVG layer underneath for the connecting lines. Sprites via `getPokemonSprite`.

**Interactions.** Click a teammate bubble → navigate to that teammate's
drill-down (`speciesHref`). Hover → tooltip: teammate name + "N teams (X%)".

**Mobile.** The ring scales down with the container; at 393px cap to top 8
bubbles on one ring so they don't overlap, center sprite slightly smaller. Same
component, responsive radius (radius = a fraction of container width). No
fallback list.

---

### 4. Teammate Core Heatmap

**What it shows.** A top-N × top-N matrix among the focal species' **top
teammates**: cell (T_i, T_j) = how often T_i and T_j **both** appear on a focal-
species team. Reveals "cores" — clusters of mons that travel together with the
focal species (e.g. the restricted + its two standard partners all co-occur). The
diagonal is each teammate's own pair rate with the focal species (or blanked).

**Scope decision (answers the prompt's "decide where it lives").** The roadmap
asked whether the heatmap is focal-scoped or a whole-format overview. **Decision:
it is FOCAL-SCOPED and lives on the drill-down.** Rationale: a whole-format
top-N×top-N co-occurrence matrix is an _overview_ artifact (it answers "what are
the format's cores" with no focal species) and belongs to Phase 2/Phase 4
overview work, not here. The drill-down's job is "this species' world," so the
matrix is **restricted to teams that include the focal species** and to that
species' **top N teammates** (N=8, matching the constellation's head). This makes
it a natural companion to the constellation: the constellation shows pair
strength to the focal mon; the heatmap shows pair strength _among the partners_.

**Data source.** Same RPC as #3 — `get_species_teammates` returns (a) the
teammate list and (b) a pair matrix among the top-N teammates, **scoped to
focal-species teams**. One round trip powers both #3 and #4. (See RPC B.)

**Component.** `species-teammate-heatmap.tsx` — a CSS grid `N+1 × N+1` (header
row/col of teammate sprites + cells). Cell background = teal at opacity scaled to
the co-occurrence pct (`bg-primary` with an opacity bucket, or inline
`backgroundColor: oklch(... / {alpha})`). Sprites in the headers via
`getPokemonSprite`. No recharts.

**Interactions.** Hover a cell → "T_i + T_j: N teams (X% of {focal} teams)".
Click a header sprite → that teammate's drill-down.

**Mobile.** An 8×8 grid is tight at 393px. **Cap to top 5×5 on narrow viewports**
(the strongest cores), cells become tap-targets ≥40px where possible; the header
sprites shrink. Same component, reduced N — no fallback. (Decision 3: capped to
5×5 at phone widths for legibility; desktop renders 8×8.)

---

### 5. Single-Species Usage Timeline

**What it shows.** The existing `UsageLineChart`, scoped to **one** line (the
focal species), with the format's event pins on the x-axis (the same annotation
pins the overview timeline uses). Shows the rise/fall of just this mon, with the
hero header's 7d/30d deltas given visual context.

**Data source.** `get_species_usage_detail` (the same fetch as the fingerprint —
its trailing buckets each carry `usagePct` + `periodStart`/`periodEnd`) +
`get_format_events` (existing `getCachedFormatEvents`). **Zero new SQL.**

**Reuse.** Transform the detail buckets into the single-series shape
`UsageLineChart` expects (one species' aligned values) — the line chart already
accepts `points` + `selectedSpecies` + `events`. Passing
`selectedSpecies=[focalSpecies]` and a `points` array built from the detail
buckets renders exactly the scoped line with pins. A thin adapter
(`detailBucketsToTimeseriesPoints(detail, species)`) in `usage-series.ts` builds
the `FormatUsageTimeseriesPoint[]` from the detail rows. **The chart component
is reused unchanged.**

**Component.** Renders `UsageLineChart` directly inside a `data-chart-card`
(the Phase 2 shared card chrome) with no brush (or brush kept — it just scopes
the visible range; harmless). The hero header shows the headline usage % + rank +
7d/30d delta pulled from the latest detail bucket.

**Interactions.** Hover → usage % at that bucket. Event pins show the event on
hover (existing behavior). No species toggling (single series).

**Mobile.** Inherits `UsageLineChart`'s responsive behavior. No change.

---

## New RPC Definitions

Both follow Phase 1 conventions **exactly**: `LANGUAGE sql STABLE SECURITY
INVOKER SET search_path = ''`, `GRANT EXECUTE ... TO anon, authenticated`,
`p_source` `'all'` passthrough, `p_min_players` bucket filter, denominator =
`SUM(total_players)` over `DISTINCT (source, event_key, division)` where a
denominator is needed, numerator = `COUNT(DISTINCT player_key)`. Both go in **one
new migration** `<ts>_usage_phase3_rpcs.sql`. (Phase 2's RPCs land in their own
migration; Phase 3's is separate and append-only.)

### RPC A — `get_species_move_combos`

True 4-move joint distribution for one species. Powers feature 2.

```
get_species_move_combos(
  p_format      text,
  p_species     text,
  p_source      text  DEFAULT 'all',
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0,
  p_limit       int   DEFAULT 25
) RETURNS TABLE (
  moves          text[],   -- the sorted 4-move combo (the grouping key, sorted ASC)
  players        bigint,   -- distinct players running exactly this 4-move set
  combo_pct      numeric,  -- players / complete_set_players (denominator below)
  rank           int       -- dense_rank by players desc, moves asc tiebreak
)
```

Computation:

- Filter `team_slots` to `format` (+ source + date range), `species = p_species`,
  and **`cardinality(moves) = 4`** (complete sets only — the documented
  normalization decision). Apply the per-bucket `p_min_players` filter using the
  same `DISTINCT (source, event_key, division)` denominator pattern (events too
  small to count are excluded — keeps a 6-player local from minting a "combo").
  Concretely: restrict to event-divisions whose `total_players >= p_min_players`,
  consistent with the other RPCs.
- Normalize the combo key: `(SELECT array_agg(m ORDER BY m) FROM
unnest(ts.moves) m)` → a deterministic sorted array per row. Group by that
  sorted array.
- `players` = `COUNT(DISTINCT player_key)` per sorted-combo.
- `complete_set_players` = `COUNT(DISTINCT player_key)` over **all** rows that
  passed the `cardinality = 4` + filters (the combo denominator). `combo_pct =
round(100.0 * players / complete_set_players, 2)`.
- `ORDER BY players DESC, moves ASC`; `LIMIT p_limit`.

Performance: the GIN index on `moves` accelerates the `cardinality`/containment
filtering; the heavy work is a `GROUP BY` on a small sorted-array per row **after**
the `(format, species)` filter (served by `idx_team_slots_format_species`). For a
popular species in a big format the working set is "all slots of one species" —
bounded by that species' total appearances (tens of thousands of rows at the very
top of a large format, not millions). A hash aggregate over a sorted text[] of
length 4 is cheap. **Ship with existing indexes.** Escalation if _measured_ slow:
a materialized view of `(format, species, sorted_moves) → player_count` — the
first Phase-1-ladder candidate for this shape.

### RPC B — `get_species_teammates`

Teammate pair rates + a top-N teammate co-occurrence matrix, both scoped to teams
that include the focal species. Powers features 3 **and** 4 in one call.

```
get_species_teammates(
  p_format      text,
  p_species     text,
  p_source      text  DEFAULT 'all',
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0,
  p_top_n       int   DEFAULT 12   -- teammates returned (constellation head; matrix uses min(p_top_n, 8))
) RETURNS TABLE (
  focal_players   bigint,   -- distinct players running the focal species (constant on every row; the pair-rate denominator)
  teammate        text,     -- teammate species slug
  pair_count      bigint,   -- distinct players running BOTH focal + teammate on the same team
  pair_pct        numeric,  -- round(100.0 * pair_count / focal_players, 2)
  teammate_rank   int,      -- dense_rank by pair_count desc, teammate asc
  matrix          jsonb     -- top-N×top-N co-occurrence among teammates, scoped to focal teams (see below); identical on every row
)
```

Computation:

- **Focal teams CTE**: the set of `(source, event_key, player_key)` tuples that
  ran the focal species (after format/source/date/min-players filters). Its
  distinct count = `focal_players`.
- **Teammates**: self-join `team_slots` to the focal-teams set on
  `(source, event_key, player_key)`, take `species <> p_species`,
  `COUNT(DISTINCT player_key)` per teammate species → `pair_count`. (Distinct
  player_key, not slot count, so a player who somehow lists a species twice
  doesn't double-count.) `ORDER BY pair_count DESC, teammate ASC LIMIT p_top_n`.
- **Matrix** (feature 4): take the **top `min(p_top_n, 8)` teammates**; for each
  unordered pair (T_i, T_j) among them, `COUNT(DISTINCT player_key)` of focal
  teams running **both** T_i and T_j. Emit as a jsonb object
  `{ "ti||tj": { count, pct }, ... }` (pct over `focal_players`) plus the ordered
  teammate list so the client can lay out the grid deterministically. The matrix
  is computed once and **duplicated on every returned row** (same pattern as
  `get_usage_pipeline` repeating slice dates) — or, cleaner, returned via a
  companion column on a single header row. **Recommendation: return the matrix as
  a separate small set is overkill; duplicating a compact jsonb keyed by the
  top-8 pairs (≤28 entries) on each of ≤12 rows is negligible and keeps it one
  RPC.** (Decision 5: one combined RPC is the build target.)

Why one RPC for #3 and #4: both need the identical focal-teams CTE (the expensive
part — the self-join over focal teams). Computing teammates and the matrix in one
pass avoids re-deriving focal teams twice. One cache entry, one round trip.

Performance: the focal-teams self-join is the cost center. It scans one species'
slots (bounded by `idx_team_slots_format_species`), collects player keys, then
re-scans `team_slots` for those `(source, event_key, player_key)` tuples. The
re-scan benefits from `idx_team_slots_source_event` for the event narrowing.
For the very top species in a huge format this is the heaviest Phase 3 query.
**Ship with existing indexes; measure.** Escalation ladder: a covering index
`(format, player_key)` or a per-format matview of pair counts
`(format, species_a, species_b) → player_count` — that matview would also serve a
future _format-wide_ core heatmap (Phase 4), so it's the natural escalation if
either surface is measured slow. Do not add it speculatively (Phase 1 stance).

### Index implications

Existing indexes cover both RPCs:

- `idx_team_slots_format_species (format, species)` — focal filter + combo group.
- `idx_team_slots_source_event (source, event_key)` — teammate self-join narrowing.
- GIN `idx_team_slots_moves` — combo cardinality/containment.

**No new index ships in Phase 3.** Named escalations (matviews) are documented
above and only added on measurement, per the Phase 1 ladder.

### TS wrappers + types

Add to `packages/supabase/src/queries/usage.ts` (and re-export from the barrel):

- `getSpeciesMoveCombos(supabase, params)` → `MoveComboRow[]`
  (`{ moves: string[]; players: number; comboPct: number; rank: number }`).
- `getSpeciesTeammates(supabase, params)` → `SpeciesTeammatesResult`
  (`{ focalPlayers: number; teammates: TeammateRow[]; matrix: TeammateMatrix }`)
  where `TeammateRow = { teammate: string; pairCount: number; pairPct: number;
rank: number }` and `TeammateMatrix` is the parsed jsonb
  (`{ order: string[]; cells: Record<string, { count: number; pct: number }> }`).
  The wrapper parses the duplicated `matrix` jsonb from the first row.

Both cast numerics like the existing wrappers (`row.usage_pct` → `usagePct`).
`params` for both: `{ format, species, source?, periodStart?, periodEnd?,
minPlayers? }` (+ `limit?`/`topN?`).

---

## Page Layout Options

The page has a hero header (sprite, name, types, headline usage + rank + delta)
plus five feature sections. Three arrangements:

### Option A — Hero + scrolling sections (RECOMMENDED)

A full-width hero header, then the five features in a single scrolling column,
grouped into a responsive 2-up grid where sections are small. No tabs (the page
is one species' story; tabbing would hide its parts).

```
┌──────────────────────────────────────────────────────────────┐
│  Data / Champions M-A / Calyrex-Ice-Rider     [species ▾]      │  ← breadcrumb + switcher
│  ┌────┐  Calyrex-Ice-Rider   [Ice][Psychic]                    │
│  │spr │  48.2% usage · Rank #1 · ▲ +2.1 (7d)  ▼ -0.4 (30d)     │  ← hero
│  └────┘  Champions Reg M-A · all sources · 1,204 players       │
├──────────────────────────────────────────────────────────────┤
│  BUILD FINGERPRINT                                             │
│  ┌──────┐┌──────┐┌──────┐┌──────┐   Top moves                  │
│  │ item ││abilty││ tera ││nature│   ▓▓▓▓▓▓ Glacial Lance 96%   │
│  │ donut││donut ││donut ││donut │   ▓▓▓▓▓  Trick Room    71%   │
│  └──────┘└──────┘└──────┘└──────┘   ▓▓▓▓   Protect       64%   │
├───────────────────────────────┬──────────────────────────────┤
│  MOVESET COMBOS                │  USAGE TIMELINE                │
│  core: Glacial Lance · Protect │   ╱╲    ╱╲___                  │
│  ▓▓▓▓ GL·TR·Prot·Crunch  38%   │  ╱  ╲__╱      (event pins)     │
│  ▓▓▓  GL·TR·Prot·Hail    12%   │                                │
├───────────────────────────────┴──────────────────────────────┤
│  TEAMMATES                                                     │
│  ┌──────────────────────┐   ┌──────────────────────────────┐  │
│  │   constellation       │   │   core heatmap (8×8)          │  │
│  │      (ring)           │   │   ▦▦▦ co-occurrence grid      │  │
│  └──────────────────────┘   └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

- **Why recommended:** one species = one continuous story; the fingerprint is the
  hero payload (top), combos + timeline read side-by-side (set + trend), teammates
  anchor the bottom (the "world" around the mon). No content hidden behind tabs —
  competitive users want it all visible, and it's the most screenshot-friendly
  (a content creator can grab the whole page). Sections collapse to one column on
  mobile in this order: hero → fingerprint → combos → timeline → constellation →
  heatmap.
- No left sidebar here — the drill-down's filters are a **compact filter bar** in
  the hero (format + source + min-players + date range as small controls), since
  there's no species checklist to host a full sidebar. Keeps the page focused.

### Option B — Hero + tabbed sections

Hero header, then Base UI tabs: **Build · Teammates · Trend**. Build tab =
fingerprint + combos; Teammates tab = constellation + heatmap; Trend tab =
timeline.

- Pro: matches the `/data` overview's tabbed mental model (consistency); lighter
  initial paint (lazy-load per tab).
- Con: hides the fingerprint→teammates relationship behind clicks; worse for
  screenshots; the page isn't large enough to _need_ tabs (5 sections, 3 fetches).

### Option C — Hero + left section-nav (sticky anchor rail)

Hero, then a sticky left rail of section anchors (Fingerprint / Combos /
Teammates / Trend) that jump-scroll the single column.

- Pro: fast navigation on a long page, everything still rendered.
- Con: adds chrome for a page that's only ~4 sections tall; the anchor rail
  competes with the breadcrumb for the same job.

**Recommendation: Option A (hero + scrolling sections, compact filter bar in the
hero).** It treats the page as one cohesive species profile, keeps everything
visible and shareable, and avoids tab/rail chrome the page doesn't need. The
2-up grids (combos+timeline, constellation+heatmap) collapse cleanly to one
column on mobile.

**Mobile behavior per section at 393px (Option A):**
| Section | 393px behavior |
|---------|----------------|
| Hero | sprite + name + types stack; stats wrap to 2 lines; filter bar becomes full-width stacked controls |
| Fingerprint | donuts `grid-cols-2`, shrink via ResponsiveContainer; moves list full-width below |
| Move combos | full-width rows, chips wrap, cap top 8 |
| Timeline | inherits UsageLineChart responsiveness |
| Constellation | single ring, cap top 8, radius = fraction of width |
| Heatmap | cap to top 5×5, ≥40px cells |

---

## Caching Plan

Extends `lib/data/usage-cache.ts` with two new per-species fetchers mirroring
`getCachedSpeciesUsageDetail` exactly. Feature 1 and 5 reuse the **existing**
`getCachedSpeciesUsageDetail` and `getCachedFormatEvents` — no new fetcher.

New cached fetchers:

- `getCachedSpeciesMoveCombos(params)` — `params { format, species, source,
periodStart, periodEnd, minPlayers, limit }`
- `getCachedSpeciesTeammates(params)` — `params { format, species, source,
periodStart, periodEnd, minPlayers, topN }`

Both:

```
"use cache";
cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
cacheLife("hours");
const supabase = createStaticClient();
return getSpeciesMoveCombos(supabase, params);   // (or getSpeciesTeammates)
```

**Cache key / tag decision.** Function arguments are the cache key (Cache
Components), so `species` is already part of the key — **no per-species cache tag
is needed**. The existing `USAGE_STATS` + `usageStats(format)` tags are correct:
when a format's data recompiles, `invalidateUsageStatsCaches(format)` /
`revalidateUsageStatsCaches(format)` busts **all** that format's species entries
at once (the per-format tag covers every species fetcher keyed by that format).
A per-species tag would be **overkill** — imports always recompile a whole event
(many species at once), never a single species, so format-granularity
invalidation is exactly right. **No changes to `lib/cache.ts` or
`lib/cache-invalidation.ts` are required.**

Server actions in `actions/usage.ts`: add `fetchSpeciesMoveCombos` and
`fetchSpeciesTeammates`, each returning `ActionResult<T>`, mirroring
`fetchSpeciesUsageDetail`. The page calls all three fetchers (detail, combos,
teammates) in `Promise.all`; events comes from the existing
`getCachedFormatEvents`. Net: **4 cached fetches** on the drill-down (detail,
combos, teammates, events) — detail and events are already-warm shared entries.

**Client layer (TanStack Query).** `SpeciesDrilldown` (client shell) wraps each
dataset in `useQuery` mirroring `UsageExplorer`: `initialData` from the server
page when the filter key matches, `placeholderData: (prev) => prev`,
`staleTime: 5 * 60 * 1000`. Query keys include `species` so switching species via
the switcher refetches correctly:
`["species-detail", format, species, source, ...]`,
`["species-combos", ...]`, `["species-teammates", ...]`. Refetch fires only when
a filter or the species changes.

---

## Filters: which carry onto the drill-down + URL scheme

The drill-down honors a **subset** of the `/data` filters — the ones that change
the aggregation:

| Filter                               | Carries to drill-down?  | Why                                                                                               |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `format`                             | **Yes** (required)      | The page is per-(format, species); format is part of identity                                     |
| `source`                             | **Yes**                 | "Calyrex on RK9 vs Limitless" is a meaningful drill-down lens                                     |
| `minPlayers`                         | **Yes**                 | Same event-size floor should apply to combos/teammates                                            |
| date range (`rangeStart`/`rangeEnd`) | **Yes**                 | Scope the species' data to the same window                                                        |
| `periodType`                         | **Yes** (timeline only) | Drives the timeline buckets; ignored by the snapshot sections (they use the full filtered window) |
| selected `species` (checklist)       | **No**                  | Irrelevant — the page is one species                                                              |
| `columns` (Sankey columns)           | **No**                  | Sankey-specific, no Sankey here                                                                   |
| `topPct` (Phase 2 conversion)        | **No**                  | No conversion chart on the drill-down                                                             |
| `tab` (Phase 2 tab)                  | **No**                  | Different page                                                                                    |

**URL param scheme (drill-down):** reuse the **exact same param names and
coercers** as `/data` so links round-trip and the same `usage-filters.ts`
coercers validate them:

```
/data/pokemon/[species]?format=…&source=…&minPlayers=…&rangeStart=…&rangeEnd=…&periodType=…
```

- `format` defaults to `DEFAULT_FORMAT` if absent/invalid (same `coerceFormat`).
- `source` via `coerceSource`, `minPlayers` via `coerceMinPlayers`, range via
  `coerceRangeStart`/`coerceRangeEnd`, `periodType` via `coercePeriodType`.
- The species is the **path segment**, not a query param.

**Sync with `/data` state.** When navigating _from_ `/data` (Phase 2 click-
through), `speciesHref` appends the current `format/source/minPlayers/range/
periodType` query so the drill-down opens in-context. The breadcrumb "Data" and
"{Format}" links carry the **same** query back to `/data` (minus the species
path), so a round-trip preserves the user's exploration context. The species
switcher and teammate clicks navigate _within_ the drill-down carrying the
current query unchanged.

---

## The Sankey's Fate

**Recommendation: REMOVE the Meta Pipeline (Sankey) from the Overview tab once
the moveset combo view ships, and do not relocate it to the drill-down.**

Rationale:

- The roadmap explicitly opened the door: _"Sankey fate: open to replacing it
  once the moveset combo view exists."_
- **The Sankey is mathematically dishonest** for its headline job. It renders
  flows from species → ability → item → nature → move using **marginal**
  histograms, so the visual width of a species→move flow implies a joint
  probability the data never measured (P(move) is independent of P(ability) in
  the Sankey, but real sets are correlated). Feature 2 (true 4-move combos) is
  the _honest_ answer to "what does this run," and the fingerprint donuts give the
  honest marginal-per-dimension breakdown. Between them, the Sankey's job is fully
  and more-accurately covered.
- **Don't move it to the drill-down**: the drill-down already has the honest
  replacements (fingerprint + combos). Adding a per-species Sankey there would
  re-introduce the same marginal-multiplication artifact at the species level.

**Migration path (keeps the change low-risk):**

1. Phase 3 ships the fingerprint + combo view on the drill-down.
2. In the same Phase 3 PR (or a tiny follow-up), the Overview tab's Sankey card
   is **replaced** by the treemap as the primary "meta now" snapshot (treemap is
   already Phase 2's Overview content), and the Sankey component
   (`usage-pipeline-chart.tsx`, `usage-pipeline.ts`) is **deleted** along with its
   `columns` URL param and sidebar control.
3. `get_usage_pipeline` RPC is **retained** — the treemap and the fingerprint's
   data flow still use the pipeline/detail RPCs; only the Sankey _rendering_ is
   removed.

**Decision 6 — the Sankey is REMOVED.** Phase 3 includes deleting the Sankey
rendering from the Overview tab; the treemap (Phase 2) becomes the primary "meta
now" snapshot. `get_usage_pipeline` RPC is **retained** — the treemap and
fingerprint data flow still use it. Only the Sankey component
(`usage-pipeline-chart.tsx`) and its `columns` URL param and sidebar control are
deleted.

---

## Component File Map

All under `apps/web/src/components/data/` (per nextjs-conventions feature-dir
rule; the route prefix `app/(app)/data/pokemon/[species]/` is already long, so
components live in the feature dir, not co-located). Tests in `__tests__/`.

```
app/(app)/data/pokemon/[species]/
  page.tsx                       (NEW) Server Component: resolve slug, validate,
                                        Promise.all 3 fetches, render shell
  loading.tsx                    (NEW) skeleton (Suspense boundary for dynamic reads)
  not-found.tsx                  (NEW) unknown-species 404 view

components/data/
  species-drilldown.tsx          (NEW) client shell: URL filters, 3 useQuery,
                                        species switcher, lays out Option A sections
  species-hero.tsx               (NEW) sprite + name + types + headline stats +
                                        compact filter bar + breadcrumb
  species-fingerprint.tsx        (NEW) 4 donuts + top-moves bar list (feature 1)
  species-move-combos.tsx        (NEW) ranked 4-move combo rows + core summary (#2)
  species-teammate-constellation.tsx (NEW) radial sprite-bubble ring (#3)
  species-teammate-heatmap.tsx   (NEW) top-N×top-N co-occurrence grid (#4)
  species-switcher.tsx           (NEW) Base UI Combobox → navigate to species page
  move-chip.tsx                  (NEW) small move-label chip (type-tinted)

  usage-series.ts                (MODIFY) + detailBucketsToTimeseriesPoints(),
                                          + angle/ring layout helper (pure),
                                          + DONUT_SLICE_COLORS lookup if not in shared
  data-shared.ts                 (MODIFY/NEW) shared non-JSX constants
                                          (DONUT_SLICE_COLORS, SOURCE_COLORS from Ph2)
  data-chart-card.tsx            (REUSE from Phase 2) section card chrome
  data-sprite-tooltip.tsx        (REUSE from Phase 2) sprite+name+stat tooltip
  usage-line-chart.tsx           (REUSE unchanged) for the timeline (feature 5)

packages/supabase/
  supabase/migrations/<ts>_usage_phase3_rpcs.sql  (NEW) RPC A + RPC B
  src/queries/usage.ts           (MODIFY) + getSpeciesMoveCombos,
                                          + getSpeciesTeammates + types
  src/index.ts / queries barrel  (MODIFY) re-export new fns + types

apps/web/src/
  lib/data/usage-cache.ts        (MODIFY) + getCachedSpeciesMoveCombos,
                                          + getCachedSpeciesTeammates
  actions/usage.ts               (MODIFY) + fetchSpeciesMoveCombos,
                                          + fetchSpeciesTeammates
```

> **Sankey removal (Decision 6 — DECIDED):** `usage-pipeline-chart.tsx` and
> `usage-pipeline.ts` are **deleted**; the `columns` param/coercer
> (`coerceColumns`, `PipelineColumn`, `ALL_PIPELINE_COLUMNS`) and the sidebar
> column control are removed. `get_usage_pipeline` RPC is retained. The treemap
> becomes the primary "meta now" snapshot on the Overview tab.

**Server vs client split.** `page.tsx` (Server Component) fetches all data via
cached fetchers and passes arrays as `initialData` props to `SpeciesDrilldown`
(Client Component). Every chart is a Client Component (recharts/SVG need the DOM).
TanStack Query in the shell refetches only on filter/species change. No chart
fetches its own data. React Compiler handles memoization (no manual memo).
Siblings never import each other — shared symbols go through `usage-series.ts`
(pure) or `data-shared.ts` (constants), per the nextjs-conventions cycle rule.

---

## Decisions (locked 2026-06-09)

All questions from the design phase are now answered. These are authoritative.

1. **Species display name:** use `Dex.species.get(slug).name` from `@pkmn/dex`
   (already used in `apps/web/src/components/team-builder/validation-hooks.ts`
   and `packages/pokemon/src/stats-calculator.ts`). Returns proper names like
   "Urshifu-Rapid-Strike", "Calyrex-Ice-Rider", "Ho-Oh". An invalid slug →
   `notFound()` (never a 500).

2. **Species switcher:** Base UI `Combobox` type-ahead in the hero header,
   seeded from the format's species list. Supports keyboard navigation (fast
   hop between species without returning to `/data`).

3. **Heatmap on mobile:** cap to **5×5** at phone widths (≤393px). Desktop
   renders 8×8. Same component, reduced N — no separate mobile component.

4. **OG image:** static default site OG card for Phase 3. A dynamic per-species
   OG card (sprite + name + headline usage via `next/og`) is **explicitly
   deferred** — not part of Phase 3 — and requires its own separate design.

5. **Teammates RPC:** the single combined `get_species_teammates` RPC (teammate
   list + jsonb co-occurrence matrix in one call), as the doc recommends. Avoids
   recomputing the costly focal-teams CTE twice.

6. **Sankey: REMOVE.** Phase 3 includes deleting the Sankey rendering from the
   Overview tab. The treemap (Phase 2) becomes the primary "meta now" snapshot.
   `get_usage_pipeline` RPC is **retained** (treemap + fingerprint still use it).
   Only `usage-pipeline-chart.tsx`, `usage-pipeline.ts`, the `columns` URL param,
   and the sidebar column control are deleted.
