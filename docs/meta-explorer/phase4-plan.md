# Meta Explorer Phase 4 — Implementation Plan

Date: 2026-06-10
Spec: `docs/meta-explorer/phase4-design.md`
Branch: `feat/meta-explorer-phase4` (off `main`)

## How to use this plan

Execute with **subagent-driven development** (`superpowers:subagent-driven-development`).
Dispatch each task to a **sonnet** subagent with the exact file allowlist given.
After each task, run a two-stage review (spec compliance + code quality) per the
orchestrator's standard loop. Commit between logical chunks (per the project's
"commit often" rule); **the orchestrator commits — not the subagents**.

All design decisions are locked in the spec's **"Decisions (locked 2026-06-09)"**
section. The relevant decisions are restated inline in each task so the
implementer does not need to re-derive them. Where this plan and the spec prose
disagree, **this plan wins**.

### Hard rules (apply to every task)

- **Public tournament data only.** Outputs never carry EVs, IVs, gender, level,
  or player names. `player_key` is opaque. (usage-data-sources rule.)
- **`source` is `'rk9' | 'limitless' | 'trainers.gg'`** — never `'first_party'`.
- **The phrase "top cut" must never appear** in any UI string, comment, label,
  caption, tooltip, or heading. (Carried from Phase 2 / 3.)
- **React Compiler** — no `useMemo` / `useCallback` / `React.memo`. Memoization
  is automatic.
- **Tailwind only** — no arbitrary pixel values (`w-[Npx]`, etc.). Use the scale.
  Percentage `left`/`top` via inline `style` is fine (not a px literal). Sprite
  `w`/`h` from `getPokemonSprite` are API-bound pixel props — annotate with a
  comment, as the Phase 2/3 charts already do.
- **Base UI** (`@base-ui/react`) primitives — NOT Radix, no `asChild`.
- **OKLCH teal tokens.** Species colors via `assignColor(species)` (name-keyed,
  matches every other view). Dimension-value ramps (the choropleth shading, band
  cell intensity) use a fixed teal-family OKLCH ramp, NOT `assignColor`.
- **Sibling components never import each other.** Shared symbols go through
  `usage-series.ts` (pure helpers) or `data-shared.ts` (constants/types).
  (nextjs-conventions cycle rule.)

### New dependencies (Decision 1 — CHOROPLETH WORLD MAP)

Phase 4 is the **first** phase to add web dependencies (Phases 1–3 were zero-dep;
only `recharts` + `d3-sankey` were installed). The country choropleth needs three:

| Package           | Kind    | Why                                                                 |
| ----------------- | ------- | ------------------------------------------------------------------- |
| `d3-geo`          | runtime | `geoNaturalEarth1()` projection + `geoPath()` SVG path generator    |
| `topojson-client` | runtime | `feature()` — decode the world-atlas TopoJSON into GeoJSON features |
| `world-atlas`     | runtime | the `countries-110m.json` TopoJSON world boundaries dataset         |
| `@types/d3-geo`   | dev     | types for `d3-geo` (untyped otherwise)                              |

`topojson-client` ships its own types; `world-atlas` is a static JSON asset (no
types needed — imported through `topojson-client`'s `Topology` type).

> **Frozen-lockfile / CI implication (call-out).** Adding these to
> `apps/web/package.json` **changes `pnpm-lock.yaml`**. CI and Vercel install with
> `--frozen-lockfile`, so the lockfile change **must be committed in the same
> commit** as the `package.json` change, or every CI install fails with
> `ERR_PNPM_OUTDATED_LOCKFILE`. Task 4 runs `pnpm install` locally to regenerate
> the lockfile and commits **both** files together. None of these packages need a
> postinstall build step, so they do **not** go in `allowBuilds` in
> `pnpm-workspace.yaml` (leave that file alone). `world-atlas` (~110m dataset,
> ~100KB gzipped) is the only sizeable add — Task 5 **dynamic-imports** the map
> component so it stays out of the initial `/data` bundle (see Task 5, "Thorny
> bits resolved").

### Confirmed reuse surface (verified against the shipped code)

Phases 2 and 3 are **fully landed**. These exist today and Phase 4 reuses them
verbatim — do not recreate:

| Symbol                                                                  | Location                                  | Use                                                             |
| ----------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `DataChartCard`                                                         | `components/data/data-chart-card.tsx`     | section card chrome (title + caption + actions slots)           |
| `DataSpriteTooltip`                                                     | `components/data/data-sprite-tooltip.tsx` | sprite + name + stat-line tooltip                               |
| `assignColor(species)`                                                  | `components/data/usage-series.ts`         | species OKLCH color (same across every view)                    |
| `getPokemonSprite(species)` → `{url,w,h,pixelated}`                     | `@trainers/pokemon` (sprites)             | sprites (apply `[image-rendering:pixelated]` when `.pixelated`) |
| `DataTabs` + re-exported `TabsContent`                                  | `components/data/data-tabs.tsx`           | tab shell — **extended** in Task 4 to add a 4th panel           |
| `SOURCE_COLORS` / `SOURCE_LABELS`                                       | `components/data/data-shared.ts`          | source hues + labels                                            |
| coercers (`coerceFormat/Source/MinPlayers/RangeStart/RangeEnd/Tab/...`) | `components/data/usage-filters.ts`        | URL params round-trip                                           |
| `getCountryName(code)` / `COUNTRIES`                                    | `@trainers/utils`                         | ISO-2 → name + full country list                                |
| `EmptyState`                                                            | `components/ui/empty-state`               | empty / sparse states                                           |
| `useIsMobile()` / `useIsClient()`                                       | `@/hooks`                                 | viewport + hydration guards                                     |

> **`countryFlag()` location confirmed.** It lives at
> `apps/web/src/components/limitless/limitless-standings.tsx:219` (ISO-2 →
> regional-indicator emoji, a private module function). Task 4 **extracts it to
> `@trainers/utils`** (next to `COUNTRIES` / `getCountryName` in `countries.ts`)
> and rewrites the Limitless component to import the shared version. No new dep.

> **Supabase barrel.** `packages/supabase/src/index.ts` does
> `export * from "./queries"`, and `queries/index.ts` re-exports usage functions +
> types explicitly. Phase 4's new wrappers/types only need adding to
> `queries/usage.ts` and `queries/index.ts` — **do not** hand-edit `src/index.ts`.

### Dependency / parallelism map

```
Task 1 (migration: 3 RPCs + db:reset + generate-types)  ─┐
                                                          ├─► Task 2 (TS query wrappers + barrel + tests)
                                                          │      └─► Task 3 (cached fetchers + actions + tests)
                                                          │              └─► Task 4 (deps + countryFlag extract + Breakdowns tab scaffold)
                                                          │                       ├─ parallel ─► Task 5 (country choropleth + click panel)
                                                          │                       ├─ parallel ─► Task 6 (division comparison)
                                                          │                       └─ parallel ─► Task 7 (placement-band heatmap + edge control)
Task 8 (mobile pass + ui-verifier)                       ─ after 4–7
Task 9 (docs)                                            ─ parallel with 8
```

- **Task 4 gates Tasks 5–7.** Task 4 adds the deps, extracts `countryFlag`, extends
  the filters/tab/sidebar plumbing, lands the shared `data-sprite-row-list.tsx`
  helper + the `BREAKDOWN_CAPTIONS` constant, adds the three breakdown `useQuery`
  hooks (lazy/`enabled`-gated on `tab === "breakdowns"`), and adds **labelled mount
  markers** (`{/* TASK5 */}` … `{/* TASK7 */}`) in the Breakdowns panel. Tasks 5–7
  each CREATE their own component file + tests; the orchestrator does the one-line
  mount swap per view (same write-conflict discipline Phases 2 + 3 used).
- **Tasks 5, 6, 7 are mutually parallel** — disjoint file allowlists.
- **`usage-explorer.tsx` write-conflict.** All three views mount into
  `usage-explorer.tsx`, and Tasks 4–7 all logically touch it. **Resolution:** Task 4
  **owns every edit to `usage-explorer.tsx`** (and `usage-filters.ts`,
  `data-tabs.tsx`, `data-sidebar.tsx`, `data/page.tsx`). Tasks 5–7 CREATE only their
  own `usage-*.tsx` + test files and never touch `usage-explorer.tsx`; the
  orchestrator swaps each `{/* TASKn */}` marker for the real component as it
  integrates. If 5–7 run truly in parallel, the mount-swap edits are serialized
  through the orchestrator.
- **Task 8** (mobile) and **Task 9** (docs) come last.

---

## Task 1 — Migration: `get_usage_by_country` + `get_usage_by_division` + `get_usage_by_placement_band` RPCs

**Objective.** Add the three new Phase 4 SQL RPCs in **one** append-only migration
following Phase 1/2/3 conventions exactly, then regenerate types.

**Parallelizable:** No — everything else depends on the generated types.

**Files (allowlist):**

- CREATE `packages/supabase/supabase/migrations/<UTC-timestamp>_usage_phase4_rpcs.sql`
- After `pnpm db:reset` + `pnpm generate-types`, `packages/supabase/src/types.ts`
  is rewritten by the generator — **do not hand-edit it**, just let the command
  rewrite it.

> Generate the timestamp with `date -u +%Y%m%d%H%M%S` so it sorts after the
> existing `20260610132004_usage_phase3_rpcs.sql`. Never edit/rename a committed
> migration.

**Conventions every RPC must follow** (copied from the Phase 1/2/3 RPCs —
`20260610005051_create_team_slots.sql`, `20260610050020_usage_phase2_rpcs.sql`,
`20260610132004_usage_phase3_rpcs.sql`):

- `LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''`
- `DROP FUNCTION IF EXISTS public.<name>(<exact arg types>);` before
  `CREATE OR REPLACE FUNCTION` (idempotency).
- `GRANT EXECUTE ON FUNCTION public.<name>(<arg types>) TO anon, authenticated;`
- `COMMENT ON FUNCTION ...` describing purpose.
- `p_source = 'all'` passthrough where the RPC takes a source param.
- Event-level denominator = `SUM(total_players)` over
  `DISTINCT (source, event_key, division)`.
- Numerator = `COUNT(DISTINCT player_key)`.
- `round(100.0 * num / denom, 2)` for percentages; guard `denom > 0`.
- `division IS NOT DISTINCT FROM` in any `slots`↔derived join (division is NULL
  for non-RK9 sources; `=` would silently drop those rows).

### RPC A — `get_usage_by_country` (powers View 1, the choropleth)

Per-country, per-species usage % in one call, with a **re-identification floor**.
The denominator is **per-country distinct players** (a player's country is a player
attribute — the honest denominator is "players from this country with a sheet",
counted distinctly), NOT the event-level `SUM(total_players)`.

```sql
DROP FUNCTION IF EXISTS public.get_usage_by_country(text, text, date, date, int, int);

CREATE OR REPLACE FUNCTION public.get_usage_by_country(
  p_format              text,
  p_source              text  DEFAULT 'all',   -- 'all' | 'rk9' | 'limitless' (trainers.gg has no country)
  p_start               date  DEFAULT NULL,
  p_end                 date  DEFAULT NULL,
  p_min_players         int   DEFAULT 0,        -- event-bucket floor (existing semantics)
  p_min_country_players int   DEFAULT 20        -- re-identification floor per country (Decision 5)
)
RETURNS TABLE (
  country         text,     -- ISO-2
  species         text,
  country_players bigint,   -- distinct player_key in this country running species
  country_total   bigint,   -- distinct player_key total in this country (the per-country denominator)
  usage_pct       numeric   -- round(100.0 * country_players / country_total, 2)
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.country, ts.total_players
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
      AND ts.country IS NOT NULL            -- excludes trainers.gg + country-less rows
  ),
  -- Event-bucket floor: keep only event-divisions meeting the bar (same DISTINCT
  -- (source,event_key,division) pattern as the other RPCs). A 6-player local
  -- must not contribute a country slice.
  qualifying_events AS (
    SELECT source, event_key, division
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    WHERE d.total_players >= p_min_players
  ),
  qslots AS (
    SELECT s.country, s.player_key, s.species
    FROM slots s
    INNER JOIN qualifying_events qe
      ON qe.source = s.source
     AND qe.event_key = s.event_key
     AND qe.division IS NOT DISTINCT FROM s.division
  ),
  -- Per-country denominator: distinct players from this country with a sheet.
  country_totals AS (
    SELECT country, COUNT(DISTINCT player_key) AS country_total
    FROM qslots
    GROUP BY country
    HAVING COUNT(DISTINCT player_key) >= p_min_country_players   -- SUPPRESSION (Decision 5)
  ),
  country_species AS (
    SELECT q.country, q.species, COUNT(DISTINCT q.player_key) AS country_players
    FROM qslots q
    INNER JOIN country_totals ct ON ct.country = q.country
    GROUP BY q.country, q.species
  )
  SELECT
    cs.country,
    cs.species,
    cs.country_players,
    ct.country_total,
    CASE WHEN ct.country_total > 0
      THEN round(100.0 * cs.country_players / ct.country_total, 2) ELSE 0 END AS usage_pct
  FROM country_species cs
  INNER JOIN country_totals ct ON ct.country = cs.country
  ORDER BY cs.country ASC, usage_pct DESC
$$;

COMMENT ON FUNCTION public.get_usage_by_country(text, text, date, date, int, int) IS
  'Per-country, per-species usage % over team_slots. Denominator = distinct player_key per country (a player attribute), NOT the event SUM(total_players). country IS NOT NULL excludes trainers.gg + country-less rows, so p_source=''trainers.gg'' yields zero rows. Re-identification floor: countries with fewer than p_min_country_players (default 20) distinct sampled players are suppressed entirely in SQL (HAVING), never sent. Powers the /data Breakdowns country choropleth + ranked-flag companion.';

GRANT EXECUTE ON FUNCTION public.get_usage_by_country(text, text, date, date, int, int)
  TO anon, authenticated;
```

**Implementation notes for the subagent:**

- The suppression floor is a `HAVING COUNT(DISTINCT player_key) >= p_min_country_players`
  on `country_totals` — suppressed countries produce **no rows** (never leave the
  DB). This is the hard re-identification constraint (Decision 5), enforced in SQL.
- `country IS NOT NULL` is the data-scope guard. trainers.gg always has NULL
  country in v1; Limitless rows may have NULL country too — both are excluded.
- The "vs global" comparison numbers are **NOT** in this RPC (Decision: reuse the
  pipeline `usagePct` the page already fetched — see Task 5 "Thorny bits"). Do not
  add a `'__global__'` synthetic group.

### RPC B — `get_usage_by_division` (powers View 2, division comparison; RK9-scoped)

Per-division, per-species usage %. `division` is RK9-only — NULL-division rows
(Limitless / trainers.gg) are excluded, so `p_source='limitless'` returns zero
rows. The per-division denominator uses the **standard event denominator** scoped
to the division: `SUM(total_players)` over `DISTINCT (source, event_key, division)`
within each division (division is already part of the distinct key).

```sql
DROP FUNCTION IF EXISTS public.get_usage_by_division(text, date, date, int);

CREATE OR REPLACE FUNCTION public.get_usage_by_division(
  p_format      text,
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0
)
RETURNS TABLE (
  division         text,     -- 'masters' | 'senior' | 'junior'
  species          text,
  division_players bigint,   -- distinct player_key in this division running species
  division_total   bigint,   -- SUM(total_players) over DISTINCT (source,event_key,division) for this division
  usage_pct        numeric   -- round(100.0 * division_players / division_total, 2)
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.total_players
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
      AND ts.division IS NOT NULL            -- RK9-only; excludes limitless + trainers.gg
  ),
  -- Per-division denominator: each (source,event_key,division) counted once,
  -- summed within the division. HAVING floors small event-divisions out.
  division_denoms AS (
    SELECT d.division, SUM(d.total_players) AS division_total
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    GROUP BY d.division
    HAVING SUM(d.total_players) >= p_min_players
  ),
  division_species AS (
    SELECT s.division, s.species, COUNT(DISTINCT s.player_key) AS division_players
    FROM slots s
    INNER JOIN division_denoms dd ON dd.division = s.division
    GROUP BY s.division, s.species
  )
  SELECT
    ds.division,
    ds.species,
    ds.division_players,
    dd.division_total,
    CASE WHEN dd.division_total > 0
      THEN round(100.0 * ds.division_players / dd.division_total, 2) ELSE 0 END AS usage_pct
  FROM division_species ds
  INNER JOIN division_denoms dd ON dd.division = ds.division
  ORDER BY ds.division ASC, usage_pct DESC
$$;

COMMENT ON FUNCTION public.get_usage_by_division(text, date, date, int) IS
  'Per-division (RK9 masters/senior/junior), per-species usage %. division IS NOT NULL excludes Limitless + trainers.gg entirely (they do not dilute the denominator). Per-division denominator = SUM(total_players) over DISTINCT (source,event_key,division) within each division. No p_source param — division is RK9-only by construction. Per-column sample suppression for tiny divisions is applied client-side from division_total. Powers the /data Breakdowns division-comparison small multiples.';

GRANT EXECUTE ON FUNCTION public.get_usage_by_division(text, date, date, int)
  TO anon, authenticated;
```

**Implementation notes for the subagent:**

- **No `p_source` param** (the spec confirms `'all'` effectively equals `rk9` here
  since only RK9 has division). Keeping it absent avoids a misleading param. The
  UI still maps the sidebar `source` filter to an empty state when it is
  `limitless`/`trainers.gg` (handled client-side in Task 6 — the RPC is simply not
  called, or called and returns the same RK9 rows; Task 6 decides whether to render
  empty based on the active `source`).
- Per-division UI column-suppression (a tiny Junior field) is **client-side** from
  the returned `division_total` (Task 6), keeping the RPC simple. The floor is a
  presentation choice, not a re-identification constraint here.

### RPC C — `get_usage_by_placement_band` (powers View 3, the band heatmap)

Per-band, per-species usage % across **disjoint** percentile bands. This mirrors
the Phase 2 `get_usage_conversion` `percent_rank()` machinery but is a **distinct**
function — Phase 2 returns _cumulative_ top-N% conversion (2-band); this returns
_disjoint_ multi-band composition (each player in exactly one band). Band edges are
parameterized (`p_band_edges`, default `{0.01,0.10,0.25}` → 4 bands).

```sql
DROP FUNCTION IF EXISTS public.get_usage_by_placement_band(text, text, date, date, int, numeric[]);

CREATE OR REPLACE FUNCTION public.get_usage_by_placement_band(
  p_format      text,
  p_source      text      DEFAULT 'all',
  p_start       date      DEFAULT NULL,
  p_end         date      DEFAULT NULL,
  p_min_players int       DEFAULT 0,
  p_band_edges  numeric[] DEFAULT '{0.01,0.10,0.25}'   -- Decision 4: exclusive band boundaries
)
RETURNS TABLE (
  species      text,
  band_index   int,      -- 0..n (0 = best band; n = field). n = cardinality(p_band_edges)
  band_label   text,     -- 'winners' | 'top10' | 'top25' | 'field' (derived from edges)
  players      bigint,   -- distinct player_key in this band running species
  band_total   bigint,   -- distinct player_key total in this band (the band denominator)
  usage_pct    numeric   -- round(100.0 * players / band_total, 2)
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.placement, ts.total_players
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Event-bucket floor (same DISTINCT pattern as every other RPC).
  qualifying_events AS (
    SELECT source, event_key, division
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    WHERE d.total_players >= p_min_players
  ),
  -- One row per (event-division, player) that HAS a placement, with its
  -- percentile rank. percent_rank() over placement ASC: 0 = best. NULL
  -- placement rows are excluded (no standing to band by). Collapse a player's
  -- 6 slots to one player row before ranking (DISTINCT on the player tuple).
  placement_players AS (
    SELECT DISTINCT s.source, s.event_key, s.division, s.player_key, s.placement
    FROM slots s
    INNER JOIN qualifying_events qe
      ON qe.source = s.source
     AND qe.event_key = s.event_key
     AND qe.division IS NOT DISTINCT FROM s.division
    WHERE s.placement IS NOT NULL
  ),
  ranked AS (
    SELECT
      source, event_key, division, player_key,
      percent_rank() OVER (
        PARTITION BY source, event_key, division
        ORDER BY placement ASC
      ) AS pr
    FROM placement_players
  ),
  -- Assign each player to exactly one band. band_index = number of edges the
  -- player's percent_rank is STRICTLY GREATER than. With edges {0.01,0.10,0.25}:
  --   pr <= 0.01            → 0 (winners)
  --   0.01 < pr <= 0.10     → 1 (top10)
  --   0.10 < pr <= 0.25     → 2 (top25)
  --   pr > 0.25             → 3 (field)
  banded AS (
    SELECT r.source, r.event_key, r.division, r.player_key,
           (SELECT count(*)::int
            FROM unnest(p_band_edges) AS e
            WHERE r.pr > e) AS band_index
    FROM ranked r
  ),
  -- Band denominator: distinct players in each band across the slice.
  band_totals AS (
    SELECT band_index, COUNT(*) AS band_total
    FROM banded
    GROUP BY band_index
  ),
  -- Species per band: join species back via slots on the player tuple.
  band_species AS (
    SELECT b.band_index, s.species,
           COUNT(DISTINCT s.player_key) AS players
    FROM banded b
    INNER JOIN slots s
      ON s.source = b.source
     AND s.event_key = b.event_key
     AND s.division IS NOT DISTINCT FROM b.division
     AND s.player_key = b.player_key
    GROUP BY b.band_index, s.species
  )
  SELECT
    bs.species,
    bs.band_index,
    -- Derive a stable label from the band index + edge count. 4-band default
    -- maps 0→winners, 1→top10, 2→top25, 3→field. For non-default edge counts the
    -- label falls back to a generic 'band{n}' (the TS wrapper relabels anyway).
    CASE
      WHEN cardinality(p_band_edges) = 3 THEN
        (ARRAY['winners','top10','top25','field'])[bs.band_index + 1]
      ELSE 'band' || bs.band_index::text
    END AS band_label,
    bs.players,
    bt.band_total,
    CASE WHEN bt.band_total > 0
      THEN round(100.0 * bs.players / bt.band_total, 2) ELSE 0 END AS usage_pct
  FROM band_species bs
  INNER JOIN band_totals bt ON bt.band_index = bs.band_index
  ORDER BY bs.band_index ASC, usage_pct DESC
$$;

COMMENT ON FUNCTION public.get_usage_by_placement_band(text, text, date, date, int, numeric[]) IS
  'Per-band, per-species usage % across DISJOINT percentile bands (each player in exactly one band) — distinct from Phase 2 get_usage_conversion (cumulative top-N%). percent_rank() over placement ASC per (source,event_key,division); a player''s slots collapse to one row before ranking; NULL placement excluded entirely. band_index = count of p_band_edges the player''s percent_rank exceeds (default edges {0.01,0.10,0.25} → 4 bands: winners/top10/top25/field). band_total = distinct players in that band; usage_pct = share of the band running the species. p_band_edges is user-adjustable (Decision 4). Powers the /data Breakdowns species × band heatmap.';

GRANT EXECUTE ON FUNCTION public.get_usage_by_placement_band(text, text, date, date, int, numeric[])
  TO anon, authenticated;
```

**Implementation notes for the subagent:**

- **Disjoint bands** are the whole point. The `band_index` is computed as
  `count(edges WHERE pr > edge)` so the bands partition `[0,1]` into
  `(−∞,e1], (e1,e2], (e2,e3], (e3,∞)`. Each player lands in exactly one band ⇒ the
  4 usage %s within a band are a coherent composition, NOT cumulative. Caption the
  view: _"Bands are exclusive — 'Top 10%' means ranked 1–10% but outside the top
  1%."_ (Task 7.)
- `percent_rank()` over `placement ASC` returns `0` for the single best placement;
  ties share the lower rank (everyone tied at the top counts as top) — same
  behavior Phase 2 relies on.
- The `band_label` derivation is intentionally only "nice" at the default 3-edge
  case; the TS wrapper derives labels from the edge array for any edge count, so
  this SQL label is a best-effort hint. **Both** the SQL fallback and the TS
  labeller must agree on the default 4 labels.

### Index implications

Existing indexes cover all three RPCs — **no new index ships in Phase 4** (Phase 1
ladder: do not add speculatively):

- `idx_team_slots_format_date (format, event_date)` — date-range scans.
- `idx_team_slots_format_source (format, source)` — source filter.
- `idx_team_slots_format_species (format, species)` — per-species aggregation.

No index directly serves `country` or `division` group-bys, but both run over the
already-format-filtered working set (small after the format filter), so a
hash-aggregate/sort is acceptable. RPC C's `percent_rank()` partitions by
`(source, event_key, division)` ordered by `placement` — the same window shape
Phase 2 flagged. **Ship with existing indexes; add a targeted index only if a view
is _measured_ slow.** Document the candidate in the migration header comment, do
not build it: a partial index `(format, country) WHERE country IS NOT NULL` for
View 1.

**Verification:**

```bash
pnpm db:reset            # replays all migrations on a fresh DB; must succeed
pnpm generate-types      # regenerates packages/supabase/src/types.ts
```

Then a smoke query against local (see the Local data note at the bottom — run the
admin "Calculate usage" first if `team_slots` is empty). Confirm all three
functions exist and:

- `get_usage_by_country('gen9championsvgc2026regma')` returns
  `(country, species, country_players, country_total, usage_pct)` rows; every
  returned country has `country_total >= 20`; no `country = NULL` rows.
- `get_usage_by_division('gen9championsvgc2026regma')` returns rows only for
  `masters`/`senior`/`junior`; `usage_pct = round(100*division_players/division_total,2)`.
- `get_usage_by_placement_band('gen9championsvgc2026regma')` returns 4 distinct
  `band_index` values (0..3) with labels `winners/top10/top25/field`; each band's
  top species `usage_pct` is plausible; NULL-placement players are absent.

---

## Task 2 — TS query wrappers + barrel exports + tests

**Objective.** Add typed wrappers for the three new RPCs in the supabase package,
following the existing wrapper pattern (DI `supabase` param, `.error` check +
throw with descriptive message, snake→camel mapping, `Number()` casts, JSDoc).

**Parallelizable:** No (depends on Task 1's generated types). Task 3 depends on this.

**Files (allowlist):**

- MODIFY `packages/supabase/src/queries/usage.ts`
- MODIFY `packages/supabase/src/queries/index.ts` (barrel re-exports)
- ADD cases to `packages/supabase/src/queries/__tests__/usage.test.ts`
  (`ls packages/supabase/src/queries/__tests__/` first; the file exists from
  Phases 2/3 — ADD, don't recreate).

**Add to `usage.ts`:**

1. Types (place near the other usage types):

```ts
/** One per-country, per-species usage row from get_usage_by_country. */
export interface CountryUsageRow {
  country: string; // ISO-2
  species: string;
  countryPlayers: number;
  countryTotal: number;
  usagePct: number;
}

/** Parameters for getUsageByCountry. */
export interface GetUsageByCountryParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  /** Re-identification floor — suppress countries below this many players. Maps to p_min_country_players (default 20). */
  minCountryPlayers?: number;
}

/** One per-division, per-species usage row from get_usage_by_division. */
export interface DivisionUsageRow {
  division: string; // 'masters' | 'senior' | 'junior'
  species: string;
  divisionPlayers: number;
  divisionTotal: number;
  usagePct: number;
}

/** Parameters for getUsageByDivision. */
export interface GetUsageByDivisionParams {
  format: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
}

/** One per-band, per-species usage row from get_usage_by_placement_band. */
export interface PlacementBandRow {
  species: string;
  bandIndex: number;
  bandLabel: string; // 'winners' | 'top10' | 'top25' | 'field' at default edges
  players: number;
  bandTotal: number;
  usagePct: number;
}

/** Parameters for getUsageByPlacementBand. */
export interface GetUsageByPlacementBandParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  /** Exclusive band boundaries in [0,1]. Maps to p_band_edges. Default [0.01, 0.10, 0.25]. */
  bandEdges?: number[];
}
```

2. `getUsageByCountry(supabase, params)` → `CountryUsageRow[]`. Calls
   `supabase.rpc("get_usage_by_country", { p_format, p_source, p_start, p_end, p_min_players, p_min_country_players })`,
   `.error` check + throw, maps
   `{ country, species, countryPlayers: Number(row.country_players), countryTotal: Number(row.country_total), usagePct: Number(row.usage_pct) }`.
   Defaults: `source="all"`, `minPlayers=0`, `minCountryPlayers=20`.

3. `getUsageByDivision(supabase, params)` → `DivisionUsageRow[]`. Calls
   `supabase.rpc("get_usage_by_division", { p_format, p_start, p_end, p_min_players })`,
   `.error` check + throw, maps snake→camel with `Number()` casts. Default
   `minPlayers=0`. **No `source` param** (the RPC has none).

4. `getUsageByPlacementBand(supabase, params)` → `PlacementBandRow[]`. Calls
   `supabase.rpc("get_usage_by_placement_band", { p_format, p_source, p_start, p_end, p_min_players, p_band_edges: bandEdges ?? [0.01, 0.10, 0.25] })`,
   `.error` check + throw, maps snake→camel with `Number()` casts. Defaults:
   `source="all"`, `minPlayers=0`, `bandEdges=[0.01,0.10,0.25]`.

**Barrel (`queries/index.ts`):** add `getUsageByCountry, getUsageByDivision,
getUsageByPlacementBand` to the usage **function** export block and
`CountryUsageRow, GetUsageByCountryParams, DivisionUsageRow,
GetUsageByDivisionParams, PlacementBandRow, GetUsageByPlacementBandParams` to the
usage **type** export block. (`src/index.ts` re-exports via `export *` — no edit.)

**Tests (per testing-philosophy — mock `rpc()`):**

- `getUsageByCountry` maps rows + forwards params (assert `p_min_country_players`
  default 20 and override), `Number()` casts, throws on `{ error }`.
- `getUsageByDivision` maps rows, sends **no** `p_source`, throws on `{ error }`.
- `getUsageByPlacementBand` forwards `p_band_edges` from `bandEdges`, defaults it to
  `[0.01,0.10,0.25]` when omitted, maps `bandIndex`/`bandLabel`, throws on `{ error }`.

**Verification:** `pnpm --filter @trainers/supabase test` passes (CI also runs it).

---

## Task 3 — Cached fetchers + server actions + tests

**Objective.** Add three `'use cache'` fetchers and three public server actions
mirroring the existing usage-cache / actions pattern (Phases 2/3).

**Parallelizable:** No (depends on Task 2). Task 4 consumes these.

**Files (allowlist):**

- MODIFY `apps/web/src/lib/data/usage-cache.ts`
- MODIFY `apps/web/src/actions/usage.ts`
- Action-layer tests: the actions are thin pass-throughs; check
  `ls apps/web/src/actions/__tests__/` — if there is no existing usage action test,
  **skip** action tests (Task 2's wrapper tests cover the logic). Do not invent a
  new test location.

**Add to `usage-cache.ts`** (follow the existing block style exactly — `'use
cache'`, `cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format))`,
`cacheLife("hours")`, `createStaticClient()`; import the new fns + types from
`@trainers/supabase`):

```ts
/** Fully-resolved parameters for getCachedUsageByCountry. */
export interface UsageByCountryParams {
  format: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  minCountryPlayers: number; // keys the cache; maps to p_min_country_players
}

export async function getCachedUsageByCountry(
  params: UsageByCountryParams
): Promise<CountryUsageRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");
  const supabase = createStaticClient();
  return getUsageByCountry(supabase, params);
}

/** Fully-resolved parameters for getCachedUsageByDivision. */
export interface UsageByDivisionParams {
  format: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
}

export async function getCachedUsageByDivision(
  params: UsageByDivisionParams
): Promise<DivisionUsageRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");
  const supabase = createStaticClient();
  return getUsageByDivision(supabase, params);
}

/** Fully-resolved parameters for getCachedUsageByPlacementBand. */
export interface UsageByPlacementBandParams {
  format: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  bandEdges: number[]; // serialized into the cache key; default [0.01,0.10,0.25]
}

export async function getCachedUsageByPlacementBand(
  params: UsageByPlacementBandParams
): Promise<PlacementBandRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");
  const supabase = createStaticClient();
  return getUsageByPlacementBand(supabase, params);
}
```

> **Cache-key note for `bandEdges`.** `bandEdges` is a `number[]` and it is a
> function argument, so it is part of the `'use cache'` key automatically. The
> action (below) must resolve it to a **stable** array (default
> `[0.01, 0.10, 0.25]`) before calling — do not pass `undefined` through, or the
> default-vs-explicit forms key differently.

**Add to `actions/usage.ts`** three public server actions (`ActionResult<T>`,
try/catch + `getErrorMessage`), resolving defaults before calling the cached fn:

```ts
export interface FetchUsageByCountryParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  minCountryPlayers?: number;
}
export async function fetchUsageByCountry(
  params: FetchUsageByCountryParams
): Promise<ActionResult<CountryUsageRow[]>> {
  // resolve source="all", minPlayers=0, minCountryPlayers=20; call getCachedUsageByCountry
}

export interface FetchUsageByDivisionParams {
  format: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
}
export async function fetchUsageByDivision(
  params: FetchUsageByDivisionParams
): Promise<ActionResult<DivisionUsageRow[]>> {
  // resolve minPlayers=0; call getCachedUsageByDivision
}

export interface FetchUsageByPlacementBandParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  bandEdges?: number[];
}
export async function fetchUsageByPlacementBand(
  params: FetchUsageByPlacementBandParams
): Promise<ActionResult<PlacementBandRow[]>> {
  // resolve source="all", minPlayers=0, bandEdges=[0.01,0.10,0.25]; call getCachedUsageByPlacementBand
}
```

**Caching note (from `reviewing-caching`).** No new `CacheTags` entry and no new
invalidation helper are needed — all three fetchers carry the existing
`USAGE_STATS` + `usageStats(format)` tags, so `invalidateUsageStatsCaches(formats)`
(admin action) and `revalidateUsageStatsCaches(formats)` (import webhook) already
bust them. Do **not** add a segment-level `export const revalidate/dynamic`.

**Verification:** `pnpm --filter @trainers/web typecheck` clean.

---

## Task 4 — Deps + extract `countryFlag` + Breakdowns tab scaffold (owns `usage-explorer.tsx`)

**Objective.** Install the choropleth dependencies, extract `countryFlag` to
`@trainers/utils`, extend the filters/tab/sidebar/page plumbing for a 4th
**Breakdowns** tab, land the shared `data-sprite-row-list.tsx` helper + the
`BREAKDOWN_CAPTIONS` constants, add the three breakdown `useQuery` hooks
(lazy/`enabled`-gated), and add labelled mount markers in the Breakdowns panel.
**No breakdown view components yet** — this task lands the shell + plumbing; Tasks
5–7 drop the views into the markers.

**Parallelizable:** No — gates Tasks 5–7. Owns every shared-file edit.

**Files (allowlist):**

- MODIFY `apps/web/package.json` (add the 3 runtime deps + 1 dev dep)
- MODIFY `pnpm-lock.yaml` (regenerated by `pnpm install` — commit with package.json)
- MODIFY `packages/utils/src/countries.ts` (add `countryFlag`)
- MODIFY `packages/utils/src/index.ts` (export `countryFlag`)
- MODIFY `packages/utils/src/__tests__/countries.test.ts` (ADD `countryFlag` cases;
  `ls` first — create only if absent)
- MODIFY `apps/web/src/components/limitless/limitless-standings.tsx` (delete the
  private `countryFlag` fn, import the shared one)
- MODIFY `apps/web/src/components/data/usage-filters.ts` (extend `VALID_TABS` +
  `coerceTab`; add `coerceMinCountryPlayers` + `coerceBandEdges`)
- MODIFY `apps/web/src/components/data/data-tabs.tsx` (add the 4th trigger + panel)
- MODIFY `apps/web/src/components/data/data-sidebar.tsx` ONLY IF a new sidebar
  control is needed for `minCountryPlayers` — **decision: no.** The country floor
  default (20) is fixed in the RPC; the UI exposes nothing for it (Decision 5 is a
  hard floor, not a user knob). **Do not edit `data-sidebar.tsx`.** (Listed here
  only to mark it explicitly out of scope and prevent a stray edit.)
- MODIFY `apps/web/src/components/data/usage-explorer.tsx` (4th panel, 3 useQuery,
  markers, state for `bandEdges`)
- MODIFY `apps/web/src/app/(app)/data/page.tsx` (3 new parallel fetches +
  `initial*` props, gated to seed only when `tab === "breakdowns"` is the initial tab)
- MODIFY `apps/web/src/components/data/data-shared.ts` (add `BREAKDOWN_CAPTIONS` +
  `BAND_EDGE_PRESETS` constants)
- CREATE `apps/web/src/components/data/data-sprite-row-list.tsx` (shared "top-N
  sprite rows with usage bars" presentational helper used by Tasks 5/6)
- MODIFY `apps/web/src/components/data/__tests__/usage-filters.test.ts`
  (`coerceTab` "breakdowns" case + `coerceMinCountryPlayers` + `coerceBandEdges`)
- MODIFY `apps/web/src/components/data/__tests__/usage-explorer.test.tsx` (keep
  green with the new props/tab)
- CREATE `apps/web/src/components/data/__tests__/data-sprite-row-list.test.tsx`

**4.1 — Dependencies.** Add to `apps/web/package.json`:

```jsonc
// dependencies
"d3-geo": "^3.1.1",
"topojson-client": "^3.1.0",
"world-atlas": "^2.0.2",
// devDependencies
"@types/d3-geo": "^3.1.0"
```

Run `pnpm install` from the repo root to regenerate `pnpm-lock.yaml`. **Commit
`package.json` + `pnpm-lock.yaml` together** (frozen-lockfile CI requirement). Do
NOT touch `pnpm-workspace.yaml` (`allowBuilds` is for postinstall-build packages;
none of these build). Verify versions exist with
`pnpm view d3-geo version` etc. before pinning; if a pinned minor is unavailable,
use the latest `^3.x` (d3-geo) / `^3.x` (topojson-client) / `^2.x` (world-atlas).

**4.2 — Extract `countryFlag` to `@trainers/utils`.** Add to
`packages/utils/src/countries.ts` (next to `getCountryName`):

```ts
/**
 * Convert an ISO 3166-1 alpha-2 country code to its flag emoji
 * (regional-indicator pair). Returns "" for an empty/invalid code.
 */
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}
```

Export it from `packages/utils/src/index.ts` in the country export group. Then in
`limitless-standings.tsx`: delete the private `countryFlag` (lines ~218–225),
`import { countryFlag } from "@trainers/utils"` (it already imports nothing from
utils — add the import in the monorepo-package group), and keep the call site
`{countryFlag(player.country)}` unchanged. The added length guard is a behavior
improvement (empty string instead of garbage for malformed codes) — note it in the
commit message.

**4.3 — `usage-filters.ts` additions.** Extend the existing `VALID_TABS`:

```ts
export const VALID_TABS = [
  "overview",
  "trends",
  "sources",
  "breakdowns", // Phase 4 — Decision 2
] as const;
```

`coerceTab` already validates membership generically — no change to its body.
`DataTab` widens automatically. Add two new coercers + the band-edge preset set:

```ts
// Country re-identification floor is a fixed RPC default (Decision 5); this
// coercer exists only to defensively clamp a hand-edited URL param if one is ever
// added. Default 20, clamp to [1, 1000].
export const DEFAULT_MIN_COUNTRY_PLAYERS = 20;
export function coerceMinCountryPlayers(
  raw: string | null | undefined
): number {
  if (!raw) return DEFAULT_MIN_COUNTRY_PLAYERS;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1
    ? Math.min(1000, n)
    : DEFAULT_MIN_COUNTRY_PLAYERS;
}

// Band-edge presets (Decision 4). Default first; omitted from URL when at default.
export const BAND_EDGE_PRESETS = [
  [0.01, 0.1, 0.25], // "1/10/25" — default
  [0.01, 0.08, 0.16], // "1/8/16"
] as const;
export const DEFAULT_BAND_EDGES = BAND_EDGE_PRESETS[0];

/**
 * Coerce a "bandEdges" URL param (comma-separated, e.g. "0.01,0.1,0.25") to a
 * known preset. Returns DEFAULT_BAND_EDGES when absent/unknown. Only the two
 * presets are accepted — arbitrary edges are not URL-addressable.
 */
export function coerceBandEdges(
  raw: string | null | undefined
): readonly number[] {
  if (!raw) return DEFAULT_BAND_EDGES;
  const parsed = raw.split(",").map(Number);
  const match = BAND_EDGE_PRESETS.find(
    (p) => p.length === parsed.length && p.every((e, i) => e === parsed[i])
  );
  return match ?? DEFAULT_BAND_EDGES;
}

/** "1/10/25" label for a band-edge preset. */
export function bandEdgesLabel(edges: readonly number[]): string {
  return edges.map((e) => Math.round(e * 100)).join("/");
}
```

**4.4 — `data-tabs.tsx`.** Add a 4th controlled trigger + panel:

```tsx
// add to DataTabsProps:
breakdownsContent?: React.ReactNode;
// add the trigger after Sources:
<TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
// add the panel after the sources panel:
<TabsContent value="breakdowns">{breakdownsContent}</TabsContent>
```

The trigger row already uses the `-mx-4 overflow-x-auto px-4 sm:…` mobile
horizontal-scroll wrapper — the 4th pill joins it automatically.

**4.5 — `data-shared.ts` additions.** Add the static honesty captions + a fixed
single-hue ramp for the choropleth + band-cell intensity (NOT `assignColor` — these
shade a continuous usage value, not a categorical species):

```ts
/** Source-scoped honesty captions for the Breakdowns views. */
export const BREAKDOWN_CAPTIONS = {
  country: "Country data is available for RK9 and Limitless events only.",
  countryFloor: "Countries with fewer than 20 sampled players are hidden.",
  division: "Division data is available for RK9 events only.",
  placement: "Completed-event placements only. Bands are exclusive.",
} as const;

/**
 * Single-hue teal ramp (light → dark) for choropleth shading and band-cell
 * intensity. A continuous usage value maps to one of these stops (or interpolates
 * via the lightness channel). NOT for species coloring (use assignColor()).
 */
export const USAGE_RAMP: string[] = [
  "oklch(0.94 0.03 190)",
  "oklch(0.86 0.06 188)",
  "oklch(0.78 0.09 186)",
  "oklch(0.70 0.11 185)",
  "oklch(0.62 0.12 184)",
  "oklch(0.54 0.12 183)",
];
```

**4.6 — `data-sprite-row-list.tsx` (NEW, shared presentational helper).** Used by
Tasks 5 (country panel) and 6 (division columns). A small "top-N sprite rows with
usage bar(s)" list:

```tsx
"use client";
// Props:
interface SpriteUsageRow {
  species: string;
  usagePct: number;
  players: number;
  /** Optional second bar (e.g. global usage for the country panel). */
  comparePct?: number;
}
interface DataSpriteRowListProps {
  rows: SpriteUsageRow[];
  /** Label for the primary bar in the tooltip, e.g. "JP" or "Masters". */
  primaryLabel?: string;
  /** Label for the compare bar, e.g. "Global". */
  compareLabel?: string;
  /** Optional navigation; whole row becomes a <Link> when provided (Phase 3 drill). */
  speciesHref?: (species: string) => string;
}
```

- Each row: sprite (`getPokemonSprite`, `[image-rendering:pixelated]` when
  `.pixelated`) + name + a `bg-primary/15` track with a `bg-primary` fill at
  `width: {usagePct}%` (percentage inline style allowed). When `comparenPct` is
  set, render a second muted bar (`bg-muted-foreground/30`) so the regional skew is
  visible. Hover → `DataSpriteTooltip` (sprite + name + primary % + compare % + n).
- When `speciesHref` is provided, wrap the row in `<Link href={speciesHref(species)}>`.
- Sort rows by `usagePct` desc; cap to the top 10 by default (the caller can slice).
- Mobile: rows are fluid full-width; no separate component.

**4.7 — `usage-explorer.tsx` changes (owns all edits):**

- Read `bandEdges = coerceBandEdges(searchParams.get("bandEdges"))` and (defensive)
  `minCountryPlayers = coerceMinCountryPlayers(searchParams.get("minCountryPlayers"))`.
- Extend `updateUrl` to accept `nextBandEdges?: readonly number[]`, writing
  `bandEdges` as `edges.join(",")` and **omitting** it when it equals
  `DEFAULT_BAND_EDGES` (keep URLs clean — mirror the `topPct`/`tab` omit rules
  already in the file). Add a `params.delete("bandEdges")` at default. Do NOT
  URL-persist `minCountryPlayers` (it has no UI knob).
- Add a `handleBandEdgesChange = (edges) => updateUrl(currentFilters, undefined, undefined, undefined, undefined, undefined, undefined, edges)`
  — extend the `updateUrl` signature accordingly (it already takes nextTab/nextTopPct).
- **Three new `useQuery` hooks** mirroring the existing source/conversion ones
  (stable initial-key captured with `useState`, `initialData` when keys match,
  `placeholderData: (prev) => prev`, `staleTime: 5 * 60 * 1000`):
  - `["usage-by-country", format, source, rangeStart, rangeEnd, minPlayers, minCountryPlayers]`
    → `fetchUsageByCountry(...)`; `enabled: tab === "breakdowns"`.
  - `["usage-by-division", format, rangeStart, rangeEnd, minPlayers]`
    → `fetchUsageByDivision(...)`; `enabled: tab === "breakdowns"`.
  - `["usage-by-placement-band", format, source, rangeStart, rangeEnd, minPlayers, bandEdges.join(",")]`
    → `fetchUsageByPlacementBand({ ..., bandEdges: [...bandEdges] })`;
    `enabled: tab === "breakdowns"`.
- **Lazy-load (Decision 2 / Phase 2 pattern):** all three are `enabled`-gated on
  `tab === "breakdowns"` so the heavier breakdown RPCs only run when the tab opens.
  Add `breakdowns` to the enablement-matrix comment block.
- **`breakdownsContent`** panel — a vertical stack of the three views with labelled
  mount markers (orchestrator swaps each marker for the real component):

  ```tsx
  const breakdownsContent = (
    <div className="flex flex-col gap-3 pt-3">
      {/* TASK5: <UsageCountryBreakdown rows={countryRows} pipeline={pipelineResult?.data ?? []} source={source} speciesHref={speciesHref} /> */}
      {/* TASK6: <UsageDivisionComparison rows={divisionRows} source={source} minPlayers={minPlayers} speciesHref={speciesHref} /> */}
      {/* TASK7: <UsagePlacementBands rows={bandRows} bandEdges={bandEdges} onBandEdgesChange={handleBandEdgesChange} source={source} speciesHref={speciesHref} /> */}
    </div>
  );
  ```

  Pass `breakdownsContent={breakdownsContent}` to `<DataTabs>`.

- The country panel's **"vs global" bars reuse the already-fetched pipeline
  `usagePct`** (Decision / Task 5 thorny-bit) — pass `pipelineResult?.data` to the
  country view so it can look up each species' global usage. No extra fetch.
- `speciesHref` already exists in the file (Phase 3) — pass it to all three views.

**4.8 — `data/page.tsx` changes.** Add the initial tab read + 3 conditional
parallel fetches. Only seed the breakdown datasets when the initial tab is
`breakdowns` (otherwise the client lazy-fetches on tab open — saves three RPC calls
on the common Overview-first load):

```tsx
const tab = coerceTab(raw("tab"));
const bandEdges = coerceBandEdges(raw("bandEdges"));
// ... existing Promise.all stays; add a SECOND conditional Promise.all:
const breakdowns =
  tab === "breakdowns"
    ? await Promise.all([
        fetchUsageByCountry({
          format,
          source,
          periodStart,
          periodEnd,
          minPlayers,
        }),
        fetchUsageByDivision({ format, periodStart, periodEnd, minPlayers }),
        fetchUsageByPlacementBand({
          format,
          source,
          periodStart,
          periodEnd,
          minPlayers,
          bandEdges: [...bandEdges],
        }),
      ])
    : null;
const initialCountryRows = breakdowns?.[0].success ? breakdowns[0].data : [];
const initialDivisionRows = breakdowns?.[1].success ? breakdowns[1].data : [];
const initialBandRows = breakdowns?.[2].success ? breakdowns[2].data : [];
```

Pass `initialCountryRows`, `initialDivisionRows`, `initialBandRows` as new optional
props to `UsageExplorer` (default `[]` when not the initial tab — the client
`initialData` handoff only fires when keys match, which they will when the initial
tab is breakdowns).

**Tests:**

- `usage-filters.test.ts`: `coerceTab("breakdowns")` returns `"breakdowns"`;
  `coerceMinCountryPlayers` (valid, invalid, clamp, default 20); `coerceBandEdges`
  (default, "1/8/16" preset, unknown → default); `bandEdgesLabel`.
- `data-sprite-row-list.test.tsx`: renders N rows; compare bar present only when
  `comparePct` set; row is a `<Link>` only when `speciesHref` provided; sorted desc.
  Mock `getPokemonSprite` per the sprite-return-shape memo.
- `countries.test.ts`: `countryFlag("us")` → 🇺🇸 pair; `countryFlag("")` → "".
- `usage-explorer.test.tsx`: stays green with the new tab + props (sensible
  defaults; breakdown queries disabled unless `tab==="breakdowns"`).

**Verification:** `pnpm install` regenerates the lockfile; `pnpm --filter
@trainers/web typecheck` + `pnpm --filter @trainers/utils typecheck` clean; the
4th tab renders empty markers; lazy-load verified (breakdown query keys fire only
on the Breakdowns tab). `grep -rn "function countryFlag" apps/web/src` returns
nothing (only the shared util remains).

---

## Task 5 — Country choropleth + click panel (View 1, Decision 1)

**Objective.** The `d3-geo` + `world-atlas` choropleth world map: countries shaded
by a usage-weighted score; clicking a country opens an inline panel of that
country's top-10 species vs global usage. A ranked-flag list renders below as the
sparse-state companion.

**Parallelizable:** Yes — with Tasks 6, 7 (disjoint files).

**Files (allowlist):**

- CREATE `apps/web/src/components/data/usage-country-breakdown.tsx` (the card +
  ranked-flag companion + click-panel orchestration; does NOT statically import the
  map)
- CREATE `apps/web/src/components/data/usage-country-map.tsx` (the heavy `d3-geo`
  SVG map — **dynamic-imported** by `usage-country-breakdown.tsx`)
- CREATE `apps/web/src/components/data/__tests__/usage-country-breakdown.test.tsx`
- (mount into `{/* TASK5 */}` — orchestrator swaps)

**Details (`"use client"`):**

- `usage-country-breakdown.tsx` props:
  `{ rows: CountryUsageRow[]; pipeline: PipelineSpeciesData[]; source: string; speciesHref?: (s: string) => string }`.
- Wrap in `DataChartCard` titled "Usage by country" with
  `caption={BREAKDOWN_CAPTIONS.country}` and a muted footer
  `BREAKDOWN_CAPTIONS.countryFloor`.
- **Group `rows` client-side** into a `Map<country, { total, species: {species,usagePct,players}[] }>`
  (a pure helper `groupByCountry(rows)` lives in `usage-series.ts` — add it in this
  task's allowlist? NO — `usage-series.ts` is a shared file owned by Task 4. **Add
  `groupByCountry` to `usage-series.ts` in Task 4** and import it here.) → adjust:
  see "Shared-helper note" below.
- **Map shading metric:** per country, a **usage-weighted score** = the count of
  species whose `country usagePct` exceeds that species' **global** usagePct by ≥ a
  small margin (i.e. "number of distinct meta picks over-indexing here"), OR simply
  the country's player count — pick the over-index count as the primary shading
  (more meaningful than raw volume). Map the score to `USAGE_RAMP` via a quantile
  or linear scale. Countries absent from `rows` (suppressed/no data) render with a
  neutral `bg-muted`-equivalent fill.
- **Map component (`usage-country-map.tsx`):** uses `geoNaturalEarth1()` +
  `geoPath()`; decodes `world-atlas/countries-110m.json` via
  `topojson-client.feature(...)`. Each country `<path>` is filled by the shading
  metric keyed on the country's ISO-2 (world-atlas uses numeric ids → map via the
  bundled `countries-110m` name/id, or join on a small ISO-numeric→ISO-2 table; if
  the join is fiddly, use the `world-atlas` country `id` → ISO-2 via a tiny lookup
  in the map module). Clicking a `<path>` calls `onSelectCountry(iso2)`.
- **Click panel:** selecting a country (map path or ranked-list row) sets local
  `selected` state and renders an inline panel = `DataSpriteRowList` of that
  country's **top-10 species** with two bars: country `usagePct` (primary teal) and
  the **global** usagePct for the same species (compare, muted). Global comes from
  the `pipeline` prop (look up `species` → `usagePct`). Pass `speciesHref`.
- **Ranked-flag list companion:** below the map, CSS rows of `flag · name ·
player-count · rank` using the extracted `countryFlag` + `getCountryName`. Click a
  row = same `onSelectCountry`. This is the accessible navigation path AND the
  sparse-state fallback.
- **Empty / sparse states:**
  - `source === "trainers.gg"` → `EmptyState` (minimal): _"No country data for
    trainers.gg events. Country usage is available for RK9 and Limitless."_ (render
    INSTEAD of the map — no fetch happened, `rows` is `[]`).
  - `rows` empty for any other reason (all countries below the floor) →
    _"Not enough data per country to show a regional breakdown yet."_
- **Mobile (393px):** the same `<svg>` map with `viewBox` + `width="100%"` so it
  scales down (pinch/tap friendly); tap a country to open its panel. The ranked
  list below stays as the fallback for very small taps. No `*-mobile` file.

**Thorny bits resolved (call-outs):**

1. **topojson bundle size → dynamic import.** `world-atlas` (~100KB) + `d3-geo`
   must NOT inflate the initial `/data` bundle (Overview is the default tab and
   most-visited). `usage-country-breakdown.tsx` imports the map with
   `const UsageCountryMap = dynamic(() => import("./usage-country-map"), { ssr: false, loading: () => <MapSkeleton /> })`.
   The breakdown card itself is small; the map chunk only loads when the Breakdowns
   tab renders the country card. `ssr: false` because the map is client-only SVG and
   the data is already lazy-fetched client-side.
2. **Choropleth color scale for usage %.** Use the fixed single-hue `USAGE_RAMP`
   (Task 4) mapped via a **quantile** scale over the shading metric (not linear) so
   a few high-volume countries don't wash everything else to the lightest stop.
   Countries with no data get a neutral muted fill, visually distinct from "low but
   present".
3. **Country-panel data = client-filter of `get_usage_by_country`, NOT a separate
   query.** The single `get_usage_by_country` call returns every (country, species)
   row; the panel just filters `rows` to the selected country and joins global
   usage from the already-fetched `pipeline`. No per-country round trip.

**Shared-helper note.** `groupByCountry(rows: CountryUsageRow[])` is a pure helper.
Per the sibling-import rule it belongs in `usage-series.ts`. Because `usage-series.ts`
is owned by Task 4, **Task 4 adds `groupByCountry` (and `groupByDivision`,
`groupByBand` for Tasks 6/7) to `usage-series.ts`** as part of its shared
scaffolding, and Tasks 5/6/7 import them. (Add this to Task 4's allowlist note: the
three `groupBy*` helpers + their `usage-series.test.ts` cases.)

**Tests:** `usage-country-breakdown.test.tsx` — trainers.gg source → empty state
(map not rendered); empty rows → sparse state; selecting a country renders the
top-10 panel with both bars; global lookup from `pipeline` is correct; no "top cut"
string. Mock `dynamic`/the map module and `getPokemonSprite`.

**Verification:** test green; visual deferred to Task 8.

---

## Task 6 — Division comparison (View 2)

**Objective.** Masters / Seniors / Juniors small-multiples — three top-10 ranked
sprite lists side by side, sharing `assignColor`, with rank-delta chips. RK9-only;
honest empty state when the active source excludes RK9.

**Parallelizable:** Yes — with Tasks 5, 7.

**Files (allowlist):**

- CREATE `apps/web/src/components/data/usage-division-comparison.tsx`
- CREATE `apps/web/src/components/data/__tests__/usage-division-comparison.test.tsx`
- (mount into `{/* TASK6 */}` — orchestrator swaps)

**Details (`"use client"`):**

- Props: `{ rows: DivisionUsageRow[]; source: string; minPlayers: number; speciesHref?: (s: string) => string }`.
- Wrap in `DataChartCard` titled "Division comparison" with
  `caption={BREAKDOWN_CAPTIONS.division}`.
- **Empty state (honesty):** when `source === "limitless" || source === "trainers.gg"`
  → `EmptyState`: _"No division data for this source. Division
  (Masters/Seniors/Juniors) is available for RK9 events only."_ (Render instead of
  the columns. The RPC has no `source` param, so `rows` may still contain RK9 data
  even when the sidebar source is limitless; the **UI** decides to show empty based
  on the active source, matching the design.)
- **Group `rows` client-side** via `groupByDivision(rows)` (added to
  `usage-series.ts` by Task 4) → ordered `[masters, senior, junior]` columns, each a
  top-10 `SpeciesUsageRow[]`.
- **Layout:** `grid grid-cols-1 sm:grid-cols-3 gap-3` (wide-grid-collapse rule).
  Each column = a labelled header ("Masters" / "Seniors" / "Juniors") + a
  `DataSpriteRowList` of the division's top 10, colored via `assignColor` so a
  species is the same color across columns.
- **Rank-delta chips:** for Seniors/Juniors rows, compute the species' rank in
  Masters and show a chip (e.g. "▲3" / "▼2" / "—") vs Masters. Pure client
  computation from the grouped data.
- **Per-column sample suppression:** a division whose `divisionTotal < minPlayers`
  (or below a small floor) shows _"Not enough {Division} data in this slice"_ in
  place of its list; the other columns still render. Derive from the grouped
  `divisionTotal`.
- Sprite click → `speciesHref` (Phase 3 drill, gated). Hover row → tooltip (sprite +
  name + usage % + n players in that division) via `DataSpriteRowList`'s tooltip.
- **Mobile (393px):** `grid-cols-1` → stacked labelled sections. Rank-delta chips
  remain. No `*-mobile` file.

**Tests:** limitless/trainers.gg source → empty state; RK9/all → 3 columns;
rank-delta chip computed correctly (a species higher in Juniors than Masters shows
▲); a below-floor division shows its per-column sparse note while others render;
`assignColor` shared across columns; no "top cut". Mock sprites.

**Verification:** test green; visual in Task 8.

---

## Task 7 — Placement-band heatmap + band-edge preset control (View 3, Decisions 3 + 4)

**Objective.** The standalone species × band heatmap: species rows × 4 disjoint
bands (winners / top10 / top25 / field), cells shaded by usage % within the band.
A band-edge preset control (chips "1/10/25" | "1/8/16") URL-persisted. Widest source
coverage of the three views.

**Parallelizable:** Yes — with Tasks 5, 6.

**Files (allowlist):**

- CREATE `apps/web/src/components/data/usage-placement-bands.tsx`
- CREATE `apps/web/src/components/data/__tests__/usage-placement-bands.test.tsx`
- (mount into `{/* TASK7 */}` — orchestrator swaps)

**Details (`"use client"`):**

- Props:
  `{ rows: PlacementBandRow[]; bandEdges: readonly number[]; onBandEdgesChange: (edges: readonly number[]) => void; source: string; speciesHref?: (s: string) => string }`.
- Wrap in `DataChartCard` titled "Placement bands" with
  `caption={BREAKDOWN_CAPTIONS.placement}` and the exclusive-band note:
  _"'Top 10%' means players ranked 1–10% but outside the top 1%."_ The band-edge
  preset chips go in the card's `actions` slot.
- **Band-edge control:** render `BAND_EDGE_PRESETS` as a `ToggleGroup`/segmented
  control labelled via `bandEdgesLabel(edges)` ("1/10/25" | "1/8/16"). The active
  preset = `bandEdges` prop. Selecting a preset calls `onBandEdgesChange(preset)`
  (which the shell wires to `updateUrl`, refetching the band RPC with new edges).
- **Group `rows` client-side** via `groupByBand(rows)` (added to `usage-series.ts`
  by Task 4) → `{ bands: { index, label, total }[]; species: { species, byBand:
Record<bandIndex, { usagePct, players }> }[] }`. Cap species rows to the **top ~25
  by overall usage** (sum across bands, or the `field` band's usage — pick overall;
  the design caps to ~25, mobile ~20).
- **Heatmap layout:** CSS grid — a sprite-label column + N band columns (N = number
  of bands = `bandEdges.length + 1`). Each cell = a tile colored from `USAGE_RAMP`
  by the species' `usagePct` within that band (quantile or lightness-ramp on the
  cell's usage), with the `%` text overlaid. The eye scans left→right for a species'
  trajectory; the column gradient shows concentration at the top.
- **Empty / sparse states:** a slice with no placement-bearing events (e.g.
  trainers.gg in-progress only) → `rows` empty → _"No completed-event placement
  data in this slice yet."_ A band below the per-slice floor collapses visually into
  "Field" with a note (derive from `band_total`).
- Sprite (row label) click → `speciesHref` (Phase 3 drill, gated). Hover a cell →
  `DataSpriteTooltip` (species + band label + usage % within band + n players in
  band).
- **Mobile (393px):** cap to top ~20 species; the 4 band columns fit at 393px
  (sprite label + 4 narrow columns). If cramped, the sprite-label column is
  `sticky left-0` and the 4 band columns get a tiny horizontal scroll **within the
  card only** (the status-pill-row `-mx … overflow-x-auto` pattern), never
  page-level overflow. No `*-mobile` file.

**Thorny bit resolved (call-out).** **Disjoint vs cumulative is load-bearing.**
This view must read as a _composition_ (bands sum coherently within a slice), unlike
the Phase 2 Top-10% dumbbell which is _cumulative_. The exclusive-band caption is
mandatory copy, and the RPC (Task 1 C) enforces disjointness in SQL — the component
must not re-derive bands client-side or it risks re-introducing the cumulative
reading. The component only renders what the RPC returns.

**Tests:** band-edge chip switch calls `onBandEdgesChange` with the new preset;
default vs "1/8/16" labels via `bandEdgesLabel`; top-25 species cap; empty rows →
empty state; cell color maps higher usage → darker stop; exclusive-band caption
present; no "top cut". Mock sprites + `useIsMobile`.

**Verification:** test green; visual in Task 8.

---

## Task 8 — Mobile responsiveness pass + ui-verifier

**Objective.** Verify every Breakdowns view is legible at 393px — same charts,
scaled down, no list-only fallbacks beyond the documented sparse companions. Fix
overflow / tap-target / density issues found.

**Parallelizable:** No — runs after 4–7.

**Files (allowlist):** any of the new `apps/web/src/components/data/usage-country-*.tsx`,
`usage-division-comparison.tsx`, `usage-placement-bands.tsx`,
`data-sprite-row-list.tsx`, and `data-tabs.tsx` (tab-pill scroll) — responsive
tweaks only, no structural changes. Do **not** create `*-mobile.tsx` files.

**Steps:**

1. Run the two mobile-responsiveness probes (page overflow `false`; no sub-40px tap
   targets) on `/data?tab=breakdowns` at 393×852.
2. Apply fixes within the views: choropleth `viewBox`/`width="100%"` scales; ranked
   flag list rows ≥40px tap height; division grid `grid-cols-1` stacks; heatmap
   sticky sprite-label column + in-card horizontal scroll if the band columns are
   cramped; band-edge chips are full-width-wrappable. Per the mobile behavior notes
   in the design.
3. Dispatch `ui-verifier` (Playwright visual + design-system check) on
   `/data?tab=breakdowns` at mobile + desktop widths. Store screenshots in
   `.playwright-mcp/screenshots/`.

**Verification:** ui-verifier passes; both probes clean; the map taps to open a
country panel at 393px; no horizontal page overflow.

---

## Task 9 — Docs updates

**Objective.** Keep the skills in sync with the three new RPCs + the new
choropleth/heatmap chart patterns + the new dependencies.

**Parallelizable:** Yes — with Task 8.

**Files (allowlist):**

- MODIFY `.claude/skills/working-with-usage-data/SKILL.md` — add
  `get_usage_by_country`, `get_usage_by_division`, `get_usage_by_placement_band` to
  the RPC Catalog table with their return shapes and the key notes (per-country
  distinct-player denominator + 20-floor suppression; RK9-only division denominator;
  disjoint percentile bands vs Phase 2's cumulative conversion).
- MODIFY `.claude/skills/building-charts/SKILL.md` — document the genuinely new
  reusable patterns: the `d3-geo` + `world-atlas` choropleth (dynamic-imported,
  `USAGE_RAMP` quantile shading), the CSS-grid species × band heatmap, the
  `DataSpriteRowList` two-bar comparison helper, and the new web dependencies (note
  Phase 4 is the first to add `d3-geo`/`topojson-client`/`world-atlas`). Read the
  skill first; only add genuinely new patterns.
- MODIFY the Meta Explorer phase checklist if one exists in
  `.claude/skills/product-vision/SKILL.md` or a design doc — mark Phase 4 done.
  Confirm the exact location before editing; if there's no explicit checklist, skip
  rather than invent one.

**Verification:** docs read cleanly; RPC catalog matches the shipped signatures
(arg order + return columns).

---

## Local data note (for the verifier and anyone running the Breakdowns tab locally)

`team_slots` is **derived** and is **empty after a fresh `pnpm db:reset`** unless
seeded. All three new RPCs return zero rows against an empty fact table:
`get_usage_by_country` → `[]` (country card empty state),
`get_usage_by_division` → `[]` (division empty/sparse), `get_usage_by_placement_band`
→ `[]` (heatmap empty state). To verify with real data locally, run the admin
**"Calculate usage"** action first (admin → External Data → "Calculate usage"),
which calls `compileSourceTeamSlots` for rk9 + limitless and backfills `team_slots`.
The verifier (Task 8) must do this before visual checks, on the default format
`gen9championsvgc2026regma`. Note: **country and placement need RK9/Limitless data**
and **division needs RK9 data** — a trainers.gg-only local slice shows the documented
empty states by design, not a bug.

## Out of scope (do not build)

- **Per-species drill-down pages** — already shipped in Phase 3. Phase 4 reuses the
  existing `speciesHref` from `usage-explorer.tsx`; clicking a species sprite in any
  Breakdowns view navigates to `/data/pokemon/{species}` carrying the active filters.
- **A `minCountryPlayers` UI knob** — Decision 5 is a fixed re-identification floor
  (20), enforced in SQL, not a user control. The coercer exists only to defensively
  clamp a hand-edited URL param.
- **Arbitrary band edges** — only the two presets (`1/10/25`, `1/8/16`) are
  URL-addressable (Decision 4 via preset chips). The RPC accepts any edges, but the
  UI exposes only the presets.
- **A `'__global__'` synthetic group in `get_usage_by_country`** — the country
  panel's "vs global" bars reuse the already-fetched pipeline `usagePct` (one source
  of truth, no extra round trip).
- **New indexes / materialized views** — only if a query is _measured_ slow (it
  isn't yet). The candidate partial index `(format, country) WHERE country IS NOT
NULL` is documented in the Task 1 migration header, not built.
- **New cache tag or invalidation helper** — the existing `USAGE_STATS` +
  `usageStats(format)` tags cover all three new fetchers (every distinguishing value
  is a function argument and thus part of the `'use cache'` key).
- **Folding placement bands into the Phase 2 dumbbell** — Decision 3 makes the
  heatmap a standalone card; the dumbbell stays 2-band cumulative.
- **Editing `pnpm-workspace.yaml` / `allowBuilds`** — the new deps have no
  postinstall build step.
