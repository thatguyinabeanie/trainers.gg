# Meta Explorer Phase 3 — Implementation Plan

Date: 2026-06-10
Spec: `docs/meta-explorer/phase3-design.md`
Branch: `feat/meta-explorer-phase3` (off `main`)

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
- **The phrase "top cut" must never appear** in any UI string, comment, label,
  caption, tooltip, or heading. (Carried from Phase 2.)
- **React Compiler** — no `useMemo` / `useCallback` / `React.memo`. Memoization
  is automatic.
- **Tailwind only** — no arbitrary pixel values (`w-[Npx]`, etc.). Use the scale.
  Percentage `left`/`top` via inline `style` is fine (not a px literal). Sprite
  `w`/`h` from `getPokemonSprite` are API-bound pixel props — annotate with a
  comment, as the Phase 2 charts already do.
- **Base UI** (`@base-ui/react`) primitives — NOT Radix, no `asChild`.
- **Zero new dependencies.** Only `recharts` and `d3-sankey` are installed.
  Donuts = recharts `PieChart`; bars/combos = CSS bar lists; constellation +
  heatmap = hand-rolled SVG / CSS grid; timeline reuses `UsageLineChart`.
- **OKLCH teal tokens.** Species colors via `assignColor(species)` (name-keyed,
  matches the overview). Dimension-value ramps (donut slices, source hues) use
  fixed teal-family OKLCH arrays, NOT `assignColor`.
- **Sibling components never import each other.** Shared symbols go through
  `usage-series.ts` (pure helpers) or `data-shared.ts` (constants/types).
  (nextjs-conventions cycle rule.)

### Confirmed reuse surface (verified against the shipped code)

These exist today and Phase 3 reuses them verbatim — do not recreate:

| Symbol                                                                   | Location                                            | Use                                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `getSpeciesUsageDetail` + `SpeciesUsagePeriod` + `UsageDetailEntry`      | `@trainers/supabase` (`queries/usage.ts`)           | fingerprint + timeline data (zero new SQL)                                                       |
| `getCachedSpeciesUsageDetail`                                            | `apps/web/src/lib/data/usage-cache.ts`              | cached detail fetch (`'use cache'` + `USAGE_STATS` + `usageStats(format)`, `cacheLife("hours")`) |
| `getCachedFormatEvents` / `fetchFormatEvents`                            | usage-cache.ts / actions/usage.ts                   | timeline event pins                                                                              |
| `fetchSpeciesUsageDetail`                                                | `apps/web/src/actions/usage.ts`                     | `ActionResult<SpeciesUsagePeriod[]>`                                                             |
| `assignColor(species)`                                                   | `components/data/usage-series.ts`                   | species OKLCH color                                                                              |
| `getPokemonSprite(species)` → `{ url, w, h, pixelated }`                 | `@trainers/pokemon/sprites`                         | sprites (apply `[image-rendering:pixelated]` when `.pixelated`)                                  |
| `getItemSpriteStyle(item)` / `getShowdownTypeIconUrl(type)`              | `@trainers/pokemon/sprites`                         | item icon / tera + move type icon                                                                |
| `getSpeciesTypes(species)`                                               | `@trainers/pokemon`                                 | hero type chips                                                                                  |
| `getFormatLabel(id)` / `isChampionsFormatId(id)` / `getFormatById(id)`   | `@trainers/pokemon`                                 | format display, Champions relabel, format validity                                               |
| `Dex.species.get(slug)`                                                  | `@pkmn/dex`                                         | display name + slug validity (used already in `team-builder/validation-hooks.ts`)                |
| `Combobox*`                                                              | `apps/web/src/components/ui/combobox.tsx` (Base UI) | species switcher                                                                                 |
| `DataChartCard`                                                          | `components/data/data-chart-card.tsx`               | section card chrome                                                                              |
| `DataSpriteTooltip`                                                      | `components/data/data-sprite-tooltip.tsx`           | sprite + name + stat-line tooltip                                                                |
| `UsageLineChart`                                                         | `components/data/usage-line-chart.tsx`              | timeline (reused unchanged)                                                                      |
| coercers `coerceFormat/Source/MinPlayers/RangeStart/RangeEnd/PeriodType` | `components/data/usage-filters.ts`                  | drill-down URL params round-trip with `/data`                                                    |

> **Note on the supabase barrel.** `packages/supabase/src/index.ts` does
> `export * from "./queries"`, and `queries/index.ts` re-exports the usage
> functions + types explicitly. So Phase 3's new wrappers/types only need to be
> added to `queries/usage.ts` and `queries/index.ts` — `src/index.ts` picks them
> up via the `export *`. **Do not** hand-add them to `src/index.ts`.

### Dependency / parallelism map

```
Task 1 (migration: 2 RPCs + db:reset + generate-types)  ─┐
                                                          ├─► Task 2 (TS query wrappers + barrel + tests)
                                                          │      └─► Task 3 (cached fetchers + actions + tests)
                                                          │              └─► Task 4 (route + page + hero + switcher + shell)
                                                          │                       ├─ parallel ─► Task 5 (fingerprint)
                                                          │                       ├─ parallel ─► Task 6 (move combos)
                                                          │                       ├─ parallel ─► Task 7 (teammates: constellation + heatmap)
                                                          │                       └─ parallel ─► Task 8 (timeline adapter)
Task 9 (Sankey removal from Overview) ─ independent of 4–8, depends only on main ─ serialize on shared files
Task 10 (wire Phase 2 speciesHref click-through)        ─ after Task 4 route exists
Task 11 (mobile pass + ui-verifier)                     ─ after 4–10
Task 12 (docs)                                          ─ parallel with 11
```

- **Task 4 gates Tasks 5–8.** Task 4 builds the route, the server page (3 parallel
  fetches), the client shell `SpeciesDrilldown` (3 `useQuery` + species switcher),
  the hero, and the Option A section layout with **labelled mount markers**
  (`{/* TASK5 */}` … `{/* TASK8 */}`). Tasks 5–8 each CREATE their own component
  file + tests and the orchestrator does the one-line mount swap per chart (same
  write-conflict discipline Phase 2 used for `usage-explorer.tsx`).
- **Tasks 5, 6, 7, 8 are mutually parallel** — disjoint file allowlists.
- **Task 9 (Sankey removal)** touches Phase 2 Overview files
  (`usage-explorer.tsx`, `usage-filters.ts`, `data-sidebar.tsx`) and deletes
  `usage-pipeline-chart.tsx` + `usage-pipeline.ts`. It shares **no** files with
  Tasks 4–8 (those are all under `data/pokemon/[species]/` + new `species-*.tsx`
  files). It can run any time after `main` is checked out, but **must be
  serialized against Task 10**, which also edits `usage-explorer.tsx` and the
  Phase 2 chart files (treemap/scatter/dumbbell) to wire `speciesHref`. Run
  **Task 9 first, then Task 10** so Task 10 edits the post-Sankey-removal file.
- **Task 11** (mobile) and **Task 12** (docs) come last.

---

## Task 1 — Migration: `get_species_move_combos` + `get_species_teammates` RPCs

**Objective.** Add the two new Phase 3 SQL RPCs in **one** append-only migration
following Phase 1/Phase 2 conventions exactly, then regenerate types.

**Parallelizable:** No — everything else depends on the generated types.

**Files (allowlist):**

- CREATE `packages/supabase/supabase/migrations/<UTC-timestamp>_usage_phase3_rpcs.sql`
- After `pnpm db:reset` + `pnpm generate-types`, `packages/supabase/src/types.ts`
  is rewritten by the generator — **do not hand-edit it**, just let the command
  rewrite it.

**Conventions every RPC must follow** (copied from the Phase 1 + Phase 2 RPCs):

- `LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''`
- `DROP FUNCTION IF EXISTS public.<name>(<exact arg types>);` before
  `CREATE OR REPLACE FUNCTION` (idempotency).
- `GRANT EXECUTE ON FUNCTION public.<name>(<arg types>) TO anon, authenticated;`
- `COMMENT ON FUNCTION ...` describing purpose.
- `p_source = 'all'` passthrough; otherwise exact match.
- Denominator where needed = `SUM(total_players)` over
  `DISTINCT (source, event_key, division)` with `HAVING SUM(...) >= p_min_players`.
- Numerator = `COUNT(DISTINCT player_key)`.
- `round(100.0 * num / denom, 2)` for percentages; guard `denom > 0`.

### RPC A — `get_species_move_combos`

True 4-move joint distribution for one species. Powers Feature 2 (move combos).
The grouping key is the **sorted, lowercased move array**; only rows with
**exactly 4 moves** are included; the denominator is the distinct players who ran
a complete 4-move set of the focal species (after filters).

```sql
DROP FUNCTION IF EXISTS public.get_species_move_combos(text, text, text, date, date, int, int);

CREATE OR REPLACE FUNCTION public.get_species_move_combos(
  p_format      text,
  p_species     text,
  p_source      text  DEFAULT 'all',
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0,
  p_limit       int   DEFAULT 25
)
RETURNS TABLE (
  moves      text[],   -- the sorted, lowercased 4-move combo (the grouping key)
  players    bigint,   -- distinct players running exactly this 4-move set
  combo_pct  numeric,  -- round(100.0 * players / complete_set_players, 2)
  rank       int       -- dense_rank by players desc, sorted-moves text asc tiebreak
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    -- One row per (player slot) of the focal species in qualifying events.
    -- cardinality(moves) = 4: complete sets only — partial sets are excluded
    -- entirely (cannot honestly compare to full sets); >4 treated as malformed.
    SELECT
      ts.source, ts.event_key, ts.division, ts.player_key,
      ts.moves, ts.total_players
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
      AND ts.species = p_species
      AND cardinality(ts.moves) = 4
  ),
  -- Min-players floor: keep only event-divisions whose total_players meets the
  -- bar, using the same DISTINCT (source,event_key,division) denominator pattern
  -- as the other RPCs (a 6-player local must not mint a "combo").
  qualifying_events AS (
    SELECT source, event_key, division
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    WHERE d.total_players >= p_min_players
  ),
  filtered AS (
    SELECT s.player_key, s.source, s.event_key, s.division,
           -- Normalize the combo key: sort + lowercase so [Protect, Fake Out, …]
           -- and [Fake Out, Protect, …] collapse to one combo (move order in
           -- moves text[] is not semantically meaningful).
           ARRAY(SELECT lower(m) FROM unnest(s.moves) AS m ORDER BY lower(m)) AS sorted_moves
    FROM slots s
    INNER JOIN qualifying_events qe
      ON qe.source = s.source
     AND qe.event_key = s.event_key
     AND qe.division IS NOT DISTINCT FROM s.division
  ),
  -- Denominator: distinct players running the focal species with a complete
  -- 4-move set, across all qualifying events.
  complete_set AS (
    SELECT COUNT(DISTINCT player_key) AS complete_set_players FROM filtered
  ),
  combo_counts AS (
    SELECT sorted_moves,
           COUNT(DISTINCT player_key) AS players
    FROM filtered
    GROUP BY sorted_moves
  )
  SELECT
    cc.sorted_moves AS moves,
    cc.players,
    CASE WHEN cs.complete_set_players > 0
      THEN round(100.0 * cc.players / cs.complete_set_players, 2)
      ELSE 0 END AS combo_pct,
    dense_rank() OVER (
      ORDER BY cc.players DESC, array_to_string(cc.sorted_moves, ',') ASC
    )::int AS rank
  FROM combo_counts cc
  CROSS JOIN complete_set cs
  ORDER BY cc.players DESC, array_to_string(cc.sorted_moves, ',') ASC
  LIMIT p_limit
$$;

COMMENT ON FUNCTION public.get_species_move_combos(text, text, text, date, date, int, int) IS
  'True 4-move joint distribution for one species. Groups complete (cardinality=4) move sets by a sorted, lowercased move array; players = distinct player_key running that exact set; combo_pct over the distinct players running any complete 4-move set of the focal species. Incomplete/malformed sets excluded. Powers the moveset combo view.';

GRANT EXECUTE ON FUNCTION public.get_species_move_combos(text, text, text, date, date, int, int)
  TO anon, authenticated;
```

**Implementation notes for the subagent:**

- `division IS NOT DISTINCT FROM` in the `filtered`↔`qualifying_events` join —
  `division` is NULL for non-RK9 sources; `=` would drop those rows.
- Lowercasing in the key makes the combo grouping case-insensitive. `team_slots`
  moves are already normalized by the importer, but lowercasing is cheap defense.
- `array_to_string(..., ',')` for the deterministic tiebreak — sorting a `text[]`
  directly in `ORDER BY` of a window also works, but the joined string is
  unambiguous and matches the `dense_rank` and final `ORDER BY` identically.

### RPC B — `get_species_teammates`

Teammate pair rates **and** a top-N teammate co-occurrence matrix, both scoped to
teams that include the focal species, in **one** call (Decision 5 — avoids
recomputing the focal-teams CTE twice). Powers Feature 3 (constellation) and
Feature 4 (heatmap).

```sql
DROP FUNCTION IF EXISTS public.get_species_teammates(text, text, text, date, date, int, int);

CREATE OR REPLACE FUNCTION public.get_species_teammates(
  p_format      text,
  p_species     text,
  p_source      text  DEFAULT 'all',
  p_start       date  DEFAULT NULL,
  p_end         date  DEFAULT NULL,
  p_min_players int   DEFAULT 0,
  p_top_n       int   DEFAULT 12   -- teammates returned; matrix uses min(p_top_n, 8)
)
RETURNS TABLE (
  focal_players bigint,   -- distinct players running the focal species (constant on every row; the pair-rate denominator)
  teammate      text,     -- teammate species slug
  pair_count    bigint,   -- distinct players running BOTH focal + teammate on the same team
  pair_pct      numeric,  -- round(100.0 * pair_count / focal_players, 2)
  teammate_rank int,      -- dense_rank by pair_count desc, teammate asc
  matrix        jsonb     -- top-N co-occurrence among teammates (see shape below); identical on every row
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH slots AS (
    SELECT ts.source, ts.event_key, ts.division, ts.player_key,
           ts.species, ts.total_players
    FROM public.team_slots ts
    WHERE ts.format = p_format
      AND (p_source = 'all' OR ts.source = p_source)
      AND (p_start IS NULL OR ts.event_date >= p_start)
      AND (p_end   IS NULL OR ts.event_date <= p_end)
  ),
  -- Min-players floor: event-divisions meeting the bar (same denom pattern).
  qualifying_events AS (
    SELECT source, event_key, division
    FROM (
      SELECT DISTINCT source, event_key, division, total_players FROM slots
    ) d
    WHERE d.total_players >= p_min_players
  ),
  -- All slots in qualifying events (the working set for both halves).
  qslots AS (
    SELECT s.source, s.event_key, s.division, s.player_key, s.species
    FROM slots s
    INNER JOIN qualifying_events qe
      ON qe.source = s.source
     AND qe.event_key = s.event_key
     AND qe.division IS NOT DISTINCT FROM s.division
  ),
  -- Focal teams: distinct (source, event_key, player_key) tuples whose team
  -- contains the focal species. This is the shared CTE both halves reuse.
  focal_teams AS (
    SELECT DISTINCT source, event_key, division, player_key
    FROM qslots
    WHERE species = p_species
  ),
  focal_count AS (
    SELECT COUNT(*) AS focal_players FROM focal_teams
  ),
  -- Teammate slots: the OTHER species on those same focal teams.
  -- DISTINCT player_key (not slot count) so a doubled species can't double-count.
  teammate_slots AS (
    SELECT q.player_key, q.species
    FROM qslots q
    INNER JOIN focal_teams ft
      ON ft.source = q.source
     AND ft.event_key = q.event_key
     AND ft.division IS NOT DISTINCT FROM q.division
     AND ft.player_key = q.player_key
    WHERE q.species <> p_species
  ),
  teammate_counts AS (
    SELECT species AS teammate,
           COUNT(DISTINCT player_key) AS pair_count
    FROM teammate_slots
    GROUP BY species
  ),
  teammate_ranked AS (
    SELECT teammate, pair_count,
           dense_rank() OVER (ORDER BY pair_count DESC, teammate ASC)::int AS teammate_rank
    FROM teammate_counts
  ),
  top_teammates AS (
    SELECT teammate, pair_count, teammate_rank
    FROM teammate_ranked
    ORDER BY pair_count DESC, teammate ASC
    LIMIT p_top_n
  ),
  -- Matrix scope: the top min(p_top_n, 8) teammates.
  matrix_members AS (
    SELECT teammate
    FROM teammate_ranked
    ORDER BY pair_count DESC, teammate ASC
    LIMIT LEAST(p_top_n, 8)
  ),
  -- Co-occurrence among matrix members on focal teams: for each unordered pair
  -- (a < b), count distinct players whose focal team runs BOTH a and b.
  -- Self-join teammate_slots on player tuple is implicit via player_key here
  -- (teammate_slots already restricted to focal teams), but we re-derive the
  -- per-team membership to pair them. Use a per-(team, member) presence set.
  member_presence AS (
    SELECT DISTINCT ts.source, ts.event_key, ts.division, ts.player_key, ts.species AS member
    FROM qslots ts
    INNER JOIN focal_teams ft
      ON ft.source = ts.source
     AND ft.event_key = ts.event_key
     AND ft.division IS NOT DISTINCT FROM ts.division
     AND ft.player_key = ts.player_key
    INNER JOIN matrix_members mm ON mm.teammate = ts.species
  ),
  pair_cells AS (
    SELECT a.member AS member_a, b.member AS member_b,
           COUNT(DISTINCT (a.source, a.event_key, a.division, a.player_key)) AS cnt
    FROM member_presence a
    INNER JOIN member_presence b
      ON a.source = b.source
     AND a.event_key = b.event_key
     AND a.division IS NOT DISTINCT FROM b.division
     AND a.player_key = b.player_key
     AND a.member < b.member          -- unordered pairs, no self-pairs
    GROUP BY a.member, b.member
  ),
  matrix_json AS (
    SELECT jsonb_build_object(
      -- ordered member list (top → down) so the client lays out the grid
      -- deterministically without re-sorting.
      'order',
        COALESCE(
          (SELECT jsonb_agg(teammate ORDER BY pair_count DESC, teammate ASC)
           FROM teammate_ranked tr
           WHERE tr.teammate IN (SELECT teammate FROM matrix_members)),
          '[]'::jsonb),
      -- cells keyed "a||b" (a < b), each { count, pct } where pct is over focal_players.
      'cells',
        COALESCE(
          (SELECT jsonb_object_agg(
             pc.member_a || '||' || pc.member_b,
             jsonb_build_object(
               'count', pc.cnt,
               'pct', CASE WHEN fc.focal_players > 0
                        THEN round(100.0 * pc.cnt / fc.focal_players, 2) ELSE 0 END))
           FROM pair_cells pc CROSS JOIN focal_count fc),
          '{}'::jsonb)
    ) AS matrix
  )
  SELECT
    fc.focal_players,
    tt.teammate,
    tt.pair_count,
    CASE WHEN fc.focal_players > 0
      THEN round(100.0 * tt.pair_count / fc.focal_players, 2) ELSE 0 END AS pair_pct,
    tt.teammate_rank,
    mj.matrix
  FROM top_teammates tt
  CROSS JOIN focal_count fc
  CROSS JOIN matrix_json mj
  ORDER BY tt.pair_count DESC, tt.teammate ASC
$$;

COMMENT ON FUNCTION public.get_species_teammates(text, text, text, date, date, int, int) IS
  'Teammate pair rates + a top-N co-occurrence matrix for one species, both scoped to teams that include the focal species. focal_players = distinct players running the focal species (the pair-rate denominator). teammate rows: distinct players running both focal + teammate. matrix jsonb: { order: text[], cells: { "a||b": { count, pct } } } over the top min(p_top_n,8) teammates, duplicated on every row (cheap). Powers the teammate constellation + core heatmap.';

GRANT EXECUTE ON FUNCTION public.get_species_teammates(text, text, text, date, date, int, int)
  TO anon, authenticated;
```

**Matrix shape (the contract the TS wrapper + components rely on):**

```jsonc
{
  "order": ["miraidon", "flutter-mane", "..."], // top min(topN,8) teammates, pair_count desc
  "cells": {
    "flutter-mane||miraidon": { "count": 88, "pct": 24.1 }, // key is "a||b" with a < b lexicographically
    "...": { "count": 0, "pct": 0 },
  },
}
```

- Keys are `memberA||memberB` with `memberA < memberB` (lexicographic), so the
  client must order the two species the same way before lookup. The diagonal
  (a == a) is **not** emitted — the client renders the diagonal from each
  teammate's own `pair_pct` (its pairing with the focal species) or blanks it,
  per the design.
- `matrix` is identical on every returned row (the same duplicate-on-every-row
  pattern `get_usage_pipeline` uses for slice dates). The TS wrapper reads it
  from the first row only.
- When the species has zero focal teams, `top_teammates` is empty → the function
  returns **zero rows**. The wrapper must handle "no rows" → `focalPlayers: 0`,
  `teammates: []`, `matrix: { order: [], cells: {} }`.

### Index implications

Existing indexes cover both RPCs — **no new index ships in Phase 3** (Phase 1
ladder: do not add speculatively):

- `idx_team_slots_format_species (format, species)` — focal filter + combo group.
- `idx_team_slots_source_event (source, event_key)` — the teammate self-join /
  focal-team re-scan narrowing.
- GIN `idx_team_slots_moves` — combo `cardinality` filtering.

**Named escalation (only if a query is _measured_ slow, never speculative):** a
per-format materialized view of pair counts
`(format, species_a, species_b) → player_count` — which would also serve a future
format-wide core heatmap (Phase 4). Document this in the migration header comment
as the escalation path; do not build it.

**Verification:**

```bash
pnpm db:reset            # replays all migrations on a fresh DB; must succeed
pnpm generate-types      # regenerates packages/supabase/src/types.ts
```

Then a smoke query against local (see the Local data note at the bottom — run the
admin "Calculate usage" first if `team_slots` is empty). Confirm both functions
exist and:

- `get_species_move_combos('gen9championsvgc2026regma', '<a-top-species>')`
  returns `(moves, players, combo_pct, rank)` rows where `moves` is a 4-element
  sorted array and `rank` starts at 1.
- `get_species_teammates('gen9championsvgc2026regma', '<a-top-species>')` returns
  rows where `focal_players` is constant, `pair_pct = round(100*pair_count/focal_players,2)`,
  and the `matrix` jsonb has `order` (≤8 entries) + `cells`.

---

## Task 2 — TS query wrappers + barrel exports + tests

**Objective.** Add typed wrappers for both new RPCs in the supabase package,
following the existing wrapper pattern (DI `supabase` param, `.error` check +
throw with descriptive message, snake→camel mapping, `Number()` casts, JSDoc).

**Parallelizable:** No (depends on Task 1's generated types). Tasks 3+ depend on this.

**Files (allowlist):**

- MODIFY `packages/supabase/src/queries/usage.ts`
- MODIFY `packages/supabase/src/queries/index.ts` (barrel re-exports)
- ADD cases to `packages/supabase/src/queries/__tests__/usage.test.ts` (check it
  exists first with `ls packages/supabase/src/queries/__tests__/`; if absent,
  CREATE it).

**Add to `usage.ts`:**

1. Types (place near the other usage types):

```ts
/** One true 4-move combo from get_species_move_combos. */
export interface MoveComboRow {
  /** The sorted, lowercased 4-move set (the grouping key). */
  moves: string[];
  /** Distinct players running exactly this 4-move set. */
  players: number;
  /** players / distinct players running any complete 4-move set of the focal species. */
  comboPct: number;
  rank: number;
}

/** Parameters for getSpeciesMoveCombos. */
export interface GetSpeciesMoveCombosParams {
  format: string;
  species: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  /** Max combos returned server-side. Defaults to 25 (client shows ~12). */
  limit?: number;
}

/** One teammate pair-rate row from get_species_teammates. */
export interface TeammateRow {
  teammate: string;
  pairCount: number;
  pairPct: number;
  rank: number;
}

/** Parsed top-N co-occurrence matrix among the focal species' teammates. */
export interface TeammateMatrix {
  /** Ordered teammate slugs (top → down), ≤8 entries. */
  order: string[];
  /** Keyed "a||b" with a < b lexicographically. Diagonal not included. */
  cells: Record<string, { count: number; pct: number }>;
}

/** Combined result from get_species_teammates (powers constellation + heatmap). */
export interface SpeciesTeammatesResult {
  /** Distinct players running the focal species — the pair-rate denominator. */
  focalPlayers: number;
  teammates: TeammateRow[];
  matrix: TeammateMatrix;
}

/** Parameters for getSpeciesTeammates. */
export interface GetSpeciesTeammatesParams {
  format: string;
  species: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  /** Teammates returned; matrix uses min(topN, 8). Defaults to 12. */
  topN?: number;
}
```

2. `getSpeciesMoveCombos(supabase, params)` → `MoveComboRow[]`. Calls
   `supabase.rpc("get_species_move_combos", { p_format, p_species, p_source, p_start, p_end, p_min_players, p_limit })`,
   `.error` check + throw, maps
   `{ moves: row.moves, players: Number(row.players), comboPct: Number(row.combo_pct), rank: row.rank }`.
   Defaults: `source="all"`, `minPlayers=0`, `limit=25`.

3. `getSpeciesTeammates(supabase, params)` → `SpeciesTeammatesResult`. Calls
   `supabase.rpc("get_species_teammates", { p_format, p_species, p_source, p_start, p_end, p_min_players, p_top_n })`,
   `.error` check + throw. Defaults: `source="all"`, `minPlayers=0`, `topN=12`.
   Mapping:
   - When `data` is empty/null → return
     `{ focalPlayers: 0, teammates: [], matrix: { order: [], cells: {} } }`.
   - Otherwise: `focalPlayers = Number(data[0].focal_players)`; map every row to a
     `TeammateRow`; parse `matrix` from `data[0].matrix` (it is identical on every
     row) into `TeammateMatrix` with a defensive fallback
     (`{ order: [], cells: {} }`) if the jsonb is missing/malformed. Cast the jsonb
     via `as unknown as TeammateMatrix` (same `as unknown as` cast the existing
     histogram fields use).

**Barrel (`queries/index.ts`):** add `getSpeciesMoveCombos, getSpeciesTeammates`
to the usage **function** export block and
`MoveComboRow, GetSpeciesMoveCombosParams, TeammateRow, TeammateMatrix,
SpeciesTeammatesResult, GetSpeciesTeammatesParams` to the usage **type** export
block. (`src/index.ts` re-exports via `export * from "./queries"` — no edit there.)

**Tests (per testing-philosophy — mock `rpc()`):**

- `getSpeciesMoveCombos` maps rows + forwards params (assert
  `p_format`/`p_species`/`p_limit` payload), defaults `limit` to 25, throws on `{ error }`.
- `getSpeciesTeammates` maps `focalPlayers` from the first row, maps teammate rows,
  parses the `matrix` jsonb from the first row, returns the empty result on `[]`,
  forwards `p_top_n` from `topN` (default 12), throws on `{ error }`.

**Verification:** `pnpm --filter @trainers/supabase test` passes (CI also runs it).

---

## Task 3 — Cached fetchers + server actions + tests

**Objective.** Add two `'use cache'` fetchers and two public server actions
mirroring the existing usage-cache / actions pattern. Features 1 + 5 reuse the
**existing** `getCachedSpeciesUsageDetail` / `getCachedFormatEvents` and their
`fetchSpeciesUsageDetail` / `fetchFormatEvents` actions — **no new fetcher** for them.

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
/** Fully-resolved parameters for getCachedSpeciesMoveCombos. */
export interface SpeciesMoveCombosParams {
  format: string;
  species: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  limit: number;
}

export async function getCachedSpeciesMoveCombos(
  params: SpeciesMoveCombosParams
): Promise<MoveComboRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");
  const supabase = createStaticClient();
  return getSpeciesMoveCombos(supabase, params);
}

/** Fully-resolved parameters for getCachedSpeciesTeammates. */
export interface SpeciesTeammatesParams {
  format: string;
  species: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  topN: number;
}

export async function getCachedSpeciesTeammates(
  params: SpeciesTeammatesParams
): Promise<SpeciesTeammatesResult> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");
  const supabase = createStaticClient();
  return getSpeciesTeammates(supabase, params);
}
```

**Add to `actions/usage.ts`** two public server actions (`ActionResult<T>`,
try/catch + `getErrorMessage`), resolving defaults before calling the cached fn:

```ts
export interface FetchSpeciesMoveCombosParams {
  format: string;
  species: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  limit?: number;
}
export async function fetchSpeciesMoveCombos(
  params: FetchSpeciesMoveCombosParams
): Promise<ActionResult<MoveComboRow[]>> {
  // resolve source="all", minPlayers=0, limit=25; call getCachedSpeciesMoveCombos
}

export interface FetchSpeciesTeammatesParams {
  format: string;
  species: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  topN?: number;
}
export async function fetchSpeciesTeammates(
  params: FetchSpeciesTeammatesParams
): Promise<ActionResult<SpeciesTeammatesResult>> {
  // resolve source="all", minPlayers=0, topN=12; call getCachedSpeciesTeammates
}
```

**Caching note (from `reviewing-caching`).** No new `CacheTags` entry and no new
invalidation helper are needed — both fetchers carry the existing
`USAGE_STATS` + `usageStats(format)` tags, so `invalidateUsageStatsCaches(formats)`
(admin action) and `revalidateUsageStatsCaches(formats)` (import webhook) already
bust them. Per the design's "Cache key / tag decision", `species` is part of the
function arguments and therefore already part of the cache key — a per-species tag
would be **overkill** (imports recompile a whole event = many species at once).
Do **not** add a segment-level `export const revalidate/dynamic`.

**Verification:** `pnpm --filter @trainers/web typecheck` clean.

---

## Task 4 — Route + server page + hero + species switcher + client shell

**Objective.** Build the `/data/pokemon/[species]` route end-to-end: server page
(slug validation, parallel fetch, metadata), `loading.tsx`, `not-found.tsx`, the
client shell `SpeciesDrilldown` (URL filters, 3 `useQuery`, species switcher,
Option A section layout with labelled mount markers), and the hero. **No feature
charts in this task** — it lands the shell + plumbing; Tasks 5–8 drop charts into
the markers.

**Parallelizable:** No — gates Tasks 5–8.

**Files (allowlist):**

- CREATE `apps/web/src/app/(app)/data/pokemon/[species]/page.tsx`
- CREATE `apps/web/src/app/(app)/data/pokemon/[species]/loading.tsx`
- CREATE `apps/web/src/app/(app)/data/pokemon/[species]/not-found.tsx`
- CREATE `apps/web/src/components/data/species-drilldown.tsx`
- CREATE `apps/web/src/components/data/species-hero.tsx`
- CREATE `apps/web/src/components/data/species-switcher.tsx`
- MODIFY `apps/web/src/components/data/usage-series.ts` (add the pure
  `detailBucketsToTimeseriesPoints` adapter — used by Task 8; landing it here
  avoids a Task 8 edit to a Task-4-owned helper) and the pure ring-layout helper
  `computeRingLayout` (used by Task 7).
- MODIFY `apps/web/src/components/data/data-shared.ts` (add `DONUT_SLICE_COLORS`
  constant — used by Task 5)
- CREATE `apps/web/src/components/data/__tests__/species-drilldown.test.tsx`
- ADD cases to `apps/web/src/components/data/__tests__/usage-series.test.ts`
  (for `detailBucketsToTimeseriesPoints` + `computeRingLayout`)

> **Dynamic-segment naming check (nextjs-conventions).** `ls apps/web/src/app/(app)/data/`
> first. There is no existing `[param]` sibling at the `data/` level today (only
> `loading.tsx` + `page.tsx`), so `[species]` under `data/pokemon/` is clean.

**4.1 — `page.tsx` (Server Component).** Signature:

```ts
interface DrilldownPageProps {
  params: Promise<{ species: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
```

Steps (in order):

1. `const { species: rawSlug } = await params;` then
   `const slug = decodeURIComponent(rawSlug).trim().toLowerCase();`
2. **Validate** via `Dex.species.get(slug)` from `@pkmn/dex`. If it returns
   `undefined`/falsy or `!result.exists` → `notFound()` **before any DB call**.
   The validated display name = `dexSpecies.name`.
3. Read + coerce filters from `searchParams` using the **same** coercers as
   `/data`: `coerceFormat`, `coerceSource`, `coerceMinPlayers`, `coerceRangeStart`,
   `coerceRangeEnd`, `coercePeriodType`. (Import from
   `@/components/data/usage-filters`.) Use the same `raw(key)` helper the existing
   `data/page.tsx` uses.
4. **Parallel fetch** via `Promise.all`:
   - `fetchSpeciesUsageDetail({ format, species: slug, source, periodType, limit: 12, minPlayers })`
   - `fetchSpeciesMoveCombos({ format, species: slug, source, periodStart, periodEnd, minPlayers, limit: 25 })`
   - `fetchSpeciesTeammates({ format, species: slug, source, periodStart, periodEnd, minPlayers, topN: 20 })`
     — fetch `topN: 20` server-side so the constellation's "show top 20" toggle
     never needs a refetch; the constellation defaults to showing 12.
   - `fetchFormatEvents(format)`
5. **Empty state, NOT 404:** if the detail result is empty (zero buckets), the
   species is valid but has no data in this format. Pass an `hasData={false}` flag
   to `SpeciesDrilldown`; the shell renders the empty-state message
   ("No usage data for {name} in {format} yet") **with the format switcher still
   usable**. (A valid-but-unused mon is a real, expected state.)
6. Render `<SpeciesDrilldown ... />` passing: `species={slug}`, `displayName`,
   `initialFilters` (`{ format, source, periodType, minPlayers, rangeStart, rangeEnd }`),
   and the four datasets as `initialDetail`, `initialCombos`, `initialTeammates`,
   `initialEvents` (unwrap `result.success ? result.data : <empty>`).

**4.2 — `generateMetadata({ params, searchParams })`** (async). Resolve slug +
format the same way (validate slug → if invalid, return minimal metadata; the
page's `notFound()` handles the actual 404). Build with `getFormatLabel(format)`
and `dexSpecies.name`:

- `title`: `` `${displayName} usage — ${formatLabel} | trainers.gg` ``
- `description`: `` `Item, ability, tera, moveset, and teammate data for ${displayName} in ${formatLabel} across tournament team sheets.` ``
- `openGraph` + `twitter` card. **OG image: the static default site OG card**
  (Decision 4). Do **not** add a per-species `next/og` route — explicitly deferred.

**4.3 — `loading.tsx`.** A skeleton matching the existing `data/loading.tsx`
style (the Suspense boundary that satisfies the dynamic `params`/`searchParams`
reads under `cacheComponents`). Hero skeleton + a couple of card skeletons.
**Do not** add `generateStaticParams` (intentionally omitted — see design).

**4.4 — `not-found.tsx`.** A focused "Pokémon not found" view with a link back to
`/data`. Use the `EmptyState` UI primitive.

**4.5 — `species-switcher.tsx`** (`"use client"`). Base UI `Combobox` type-ahead
in the hero (Decision 2). Props: `{ currentSpecies: string; options: { slug: string; name: string }[]; onSelect: (slug: string) => void }`.
The options list = the format's species list. **Seed it from the timeline/detail
context the page already has** — simplest correct source: derive the option list
from a fetched format species ranking. To avoid a 5th fetch, pass the option list
down from `SpeciesDrilldown`, which can derive names via `Dex.species.get(slug).name`
over the teammate slugs + focal — but that is incomplete. **Decision for this
plan:** `SpeciesDrilldown` fetches the format's species list via the existing
`fetchFormatUsage({ format })` action (returns `FormatUsageRow[]` with `species`),
wrapped in a `useQuery` keyed `["format-species", format]` with
`staleTime: Infinity`-ish (`60 * 60 * 1000`), seeded with `initialData` only when
the server passed it. To keep Task 4 self-contained, **the server page also adds
`fetchFormatUsage({ format })` to its `Promise.all`** and passes `initialSpeciesList`.
Map each row to `{ slug: row.species, name: Dex.species.get(row.species)?.name ?? row.species }`.
Selecting an option calls `router.push` to that species' page carrying the current
filter query (see 4.7).

**4.6 — `species-hero.tsx`** (`"use client"`). Renders: the focal sprite
(`getPokemonSprite`, `[image-rendering:pixelated]` when `.pixelated`), display
name (`text-2xl`/`text-4xl` per hierarchy), type chips from
`getSpeciesTypes(species)`, the headline stat line (usage % · Rank #N · ▲/▼ 7d ·
30d) pulled from the **latest** detail bucket, the format/source/players context
line, the breadcrumb `Data / {FormatLabel} / {Name}` (Data + Format crumbs link
back to `/data` + filter query), the species switcher, and the **compact filter
bar** (format / source / min-players / date-range controls — small versions of the
sidebar controls; full-width stacked on mobile per the mobile rule). Filter
changes call back into `SpeciesDrilldown`'s `updateUrl`. Use the `Breadcrumb` UI
primitive.

**4.7 — `species-drilldown.tsx`** (`"use client"`). The client shell.

- Props: `{ species: string; displayName: string; hasData: boolean; initialFilters; initialDetail: SpeciesUsagePeriod[]; initialCombos: MoveComboRow[]; initialTeammates: SpeciesTeammatesResult; initialEvents: FormatEvent[]; initialSpeciesList: { slug: string; name: string }[] }`.
- **URL filter state**, read via `useSearchParams` + the shared coercers (format,
  source, minPlayers, rangeStart, rangeEnd, periodType). `species` is the **path
  segment**, not a query param.
- **`updateUrl`** writes the same param names `/data` uses (so links round-trip)
  via `router.replace("?" + params, { scroll: false })` inside `startTransition`.
  Omit defaults to keep URLs clean (mirror the Phase 2 `updateUrl` defaults:
  `minPlayers` omitted at `DEFAULT_MIN_PLAYERS`, range omitted when null,
  `periodType` written always or omitted at default — match Phase 2's exact omit
  rules). It does **not** write `species`, `columns`, `topPct`, `tab`, or the
  selection `species=` checklist param (those don't apply here per the design's
  Filters table).
- **Navigation helper** `speciesPath(slug)` = `` `/data/pokemon/${encodeURIComponent(slug)}${activeFilterQuery}` `` where
  `activeFilterQuery` is the current filter query string (format/source/minPlayers/
  range/periodType). Used by the switcher and (Task 7) teammate clicks. The
  switcher's `onSelect` does `router.push(speciesPath(slug))`.
- **3 `useQuery` hooks** mirroring `UsageExplorer`'s pattern (stable initial-key
  captured with `useState`, `initialData` when the key matches, `placeholderData:
(prev) => prev`, `staleTime: 5 * 60 * 1000`). **Query keys include `species`** so
  the switcher refetches correctly:
  - `["species-detail", format, species, source, periodType, rangeStart, rangeEnd, minPlayers]` → `fetchSpeciesUsageDetail(...)`
  - `["species-combos", format, species, source, rangeStart, rangeEnd, minPlayers]` → `fetchSpeciesMoveCombos(...)`
  - `["species-teammates", format, species, source, rangeStart, rangeEnd, minPlayers]` → `fetchSpeciesTeammates({ ..., topN: 20 })`
  - plus `["format-events", format]` → `fetchFormatEvents(format)` (matches the
    overview's events query) and `["format-species", format]` → `fetchFormatUsage({ format })`
    for the switcher options.
- **Latest bucket** = `detail[detail.length - 1]` (detail is oldest→newest). The
  hero + fingerprint read the latest bucket; the timeline reads all buckets.
- **Layout (Option A — hero + scrolling sections, RECOMMENDED in the design).**
  `<SpeciesHero ... />` then a single scrolling column with labelled mount markers:

  ```tsx
  {
    /* TASK5: <SpeciesFingerprint detail={latest} isChampions={isChampionsFormatId(format)} /> */
  }
  {
    /* combos + timeline read side-by-side (2-up on lg, stack on mobile) */
  }
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
    {/* TASK6: <SpeciesMoveCombos combos={combos} completeSetPlayers={...} /> */}
    {/* TASK8: <SpeciesTimeline detail={detail} species={species} events={events} /> */}
  </div>;
  {
    /* teammates: constellation + heatmap (2-up on lg, stack on mobile) */
  }
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
    {/* TASK7: <SpeciesTeammateConstellation ... /> + <SpeciesTeammateHeatmap ... /> */}
  </div>;
  ```

  When `hasData === false`, render the empty-state block in place of the sections
  (hero + switcher remain).

**4.8 — `usage-series.ts` additions (pure, framework-free):**

- `detailBucketsToTimeseriesPoints(detail: SpeciesUsagePeriod[], species: string): FormatUsageTimeseriesPoint[]`
  — one `FormatUsageTimeseriesPoint` per detail bucket:
  `{ periodStart, periodEnd, usage: { [species]: bucket.usagePct } }`. This is the
  single-series shape `UsageLineChart` consumes (Task 8 passes
  `selectedSpecies={[species]}`).
- `computeRingLayout(count: number, opts?: { rings?: number }): { x: number; y: number; angle: number }[]`
  — deterministic radial positions as **percentages** (0–100) relative to a square
  container, evenly spaced by `angle = i * (360 / n)` starting at 12 o'clock,
  alternating sides so the strongest pairs (lowest index) sit nearest the top. For
  > 12 with two rings, split across an inner/outer radius. Pure trig, no deps.
  > Returns `x`/`y` as percentages so the component sets `left: x%`, `top: y%`.

**4.9 — `data-shared.ts` addition:**

- `DONUT_SLICE_COLORS: string[]` — a fixed teal-family OKLCH categorical ramp
  (~6 entries: 5 slices + an "Other" gray). NOT `assignColor` (donut slices are
  dimension values like items, not species). Mirror the `SOURCE_COLORS` style.

**Tests:**

- `species-drilldown.test.tsx`: smoke render with mock data (mock
  `getPokemonSprite` per the sprite-return-shape memo; mock `useIsMobile`/
  `useIsClient` per the mobile-responsiveness test infra); empty-state path when
  `hasData=false`; switcher `onSelect` builds the right path. Mock the action
  modules so no real fetch fires.
- `usage-series.test.ts` additions: `detailBucketsToTimeseriesPoints` produces one
  point per bucket keyed by species; `computeRingLayout` is deterministic, returns
  `count` entries, first entry near top (y < 50), percentages in [0,100].

**Verification:** `pnpm --filter @trainers/web typecheck` clean; the route renders
(empty markers are fine); `species-drilldown` + `usage-series` tests green.

---

## Task 5 — Build Fingerprint card (Feature 1)

**Objective.** The hero-payload card: four donuts (item / ability / tera / nature)

- a top-moves CSS bar list, reading the **latest** detail bucket. Zero new SQL.

**Parallelizable:** Yes — with Tasks 6, 7, 8 (disjoint files).

**Files (allowlist):**

- CREATE `apps/web/src/components/data/species-fingerprint.tsx`
- CREATE `apps/web/src/components/data/__tests__/species-fingerprint.test.tsx`
- (mount into the `{/* TASK5 */}` marker — orchestrator does the one-line swap)

**Details (`"use client"`):**

- Props: `{ detail: SpeciesUsagePeriod; isChampions: boolean }` (pass the **latest**
  bucket from the shell). Reads `detail.items`, `detail.abilities`,
  `detail.tera`, `detail.natures`, `detail.moves` (each `UsageDetailEntry[]`).
- Wrap in `DataChartCard` titled "Build fingerprint".
- **Donuts:** recharts `PieChart` + `Pie` with `innerRadius` (donut), inside a
  `ResponsiveContainer`. For each dimension, take the top ~5 entries and collapse
  the remainder into a single **"Other"** slice (summed pct). Slice fills from
  `DONUT_SLICE_COLORS` (the "Other" slice = the gray entry). Center label = the
  modal value + its %. Custom `content` tooltip styled `bg-popover border-border`
  showing value + count + %.
- **Champions relabel (Decision):** when `isChampions` is true, the "Nature" donut
  is titled **"Stat Alignment"** and the **Tera donut is hidden** (Champions tera
  is NULL → `detail.tera` is `[]`). When false, show Tera and title the donut
  "Nature". (nature-naming + tera-null rules.)
- **Donut grid:** `grid-cols-2 sm:grid-cols-4` (Champions: `sm:grid-cols-3` since
  Tera is hidden — or keep 4 columns and simply omit the Tera cell). Donuts shrink
  via `ResponsiveContainer`.
- **Top moves:** a CSS bar list (top 8–10 moves) — label + `bg-primary/15` track +
  `bg-primary` fill at `width: {pct}%` (percentage inline style is allowed). Reuse
  the dumbbell's percentage-positioned technique. Optionally tint the move label
  via `getShowdownTypeIconUrl`/move type icon, but text + bar is sufficient.
- Item/ability/tera legends may show the icon via `getItemSpriteStyle(item)` /
  `getShowdownTypeIconUrl(tera)` next to the legend label (not inside the donut).
- Display-only — donuts/bars do **not** navigate (attributes, not species).
- **Mobile (393px):** donuts `grid-cols-2`, shrink via `ResponsiveContainer`;
  moves list full-width below. Same charts, scaled — no list fallback.

**Tests:** transform behavior — top-5 + "Other" collapse for a dimension with >5
entries; Champions branch hides Tera + relabels Nature → "Stat Alignment";
non-Champions shows Tera + "Nature"; modal value in the center label. Mock sprites.
Assert no "top cut" string.

**Verification:** test green; visual deferred to Task 11.

---

## Task 6 — Moveset Combo View (Feature 2)

**Objective.** Ranked true-4-move combos as a CSS bar list — the honest Sankey
replacement. A small client-derived "core" summary header.

**Parallelizable:** Yes — with Tasks 5, 7, 8.

**Files (allowlist):**

- CREATE `apps/web/src/components/data/species-move-combos.tsx`
- CREATE `apps/web/src/components/data/move-chip.tsx` (small type-tinted move chip)
- CREATE `apps/web/src/components/data/__tests__/species-move-combos.test.tsx`
- CREATE `apps/web/src/components/data/__tests__/move-chip.test.tsx`

**Details (`"use client"`):**

- `species-move-combos.tsx` props: `{ combos: MoveComboRow[] }`.
- Wrap in `DataChartCard` titled "Move combos". Caption (muted): the denominator
  statement — _"Among the N players who ran a complete 4-move set."_ Derive **N**
  as `Math.round(combos[0].players / (combos[0].comboPct / 100))` when `combos`
  is non-empty (combo_pct = players/N → N = players / (combo_pct/100)); guard the
  zero/empty case (render an empty state). (The RPC does not return N directly;
  this back-computes it from the top row's pct, which is exact since both come
  from the same denominator. If `comboPct` is 0, omit the count.)
- **Rows:** show the top **12** combos (cap to top **8** on narrow widths). Each
  row: the 4 `MoveChip`s + player count + `% bar` (same `bg-primary/15` track +
  `bg-primary` fill at `width: {comboPct}%`). A "+N more sets" line when
  `combos.length > shown`.
- **"Core" summary line** above the list (client-derived, NOT a query): the moves
  present in ≥ a threshold (e.g. ≥80%) of the **shown** combos → render as
  "Core: Glacial Lance · Protect · 2 flex". Compute by counting each move's
  appearances across shown combos; moves above the threshold are "core", the
  remainder count = "N flex".
- `move-chip.tsx`: presentational — props `{ move: string }`. Move label with a
  type-tinted background (resolve the move's type; if unavailable, neutral chip).
  Keep it dependency-free; type lookup via `@trainers/pokemon` if a move→type
  helper exists, else a neutral chip is acceptable (do not add a dep).
- Hover a row → exact player count + %. No navigation (moves aren't pages).
- **Mobile:** rows full-width, chips wrap, cap to top 8. No separate component.

**Tests:** denominator back-computation from the top row; top-12 cap + "+N more";
core/flex derivation (moves appearing in all shown combos → core; varying move →
flex count); empty state when `combos` is `[]`; no "top cut" string. Smoke render.

**Verification:** test green; visual in Task 11.

---

## Task 7 — Teammate Constellation + Core Heatmap (Feature 3 + 4, one RPC)

**Objective.** Both teammate visualizations, powered by the single
`SpeciesTeammatesResult` (Decision 5). Constellation = deterministic radial ring
(top 12 default, toggle to 20); heatmap = focal-scoped top-8×8 (mobile cap 5×5).

**Parallelizable:** Yes — with Tasks 5, 6, 8.

**Files (allowlist):**

- CREATE `apps/web/src/components/data/species-teammate-constellation.tsx`
- CREATE `apps/web/src/components/data/species-teammate-heatmap.tsx`
- CREATE `apps/web/src/components/data/__tests__/species-teammate-constellation.test.tsx`
- CREATE `apps/web/src/components/data/__tests__/species-teammate-heatmap.test.tsx`
- (both mount into the `{/* TASK7 */}` marker — orchestrator swaps)

**Shared inputs.** Both receive data sliced from the shell's `teammates` result.
Pass `speciesHref` (the shell's `speciesPath` fn) so teammate clicks navigate.
Use `assignColor(species)` for any species coloring; `getPokemonSprite` for sprites.

**7.1 — `species-teammate-constellation.tsx`** (`"use client"`):

- Props: `{ focalSpecies: string; focalDisplayName: string; teammates: TeammateRow[]; onTeammateHref: (slug: string) => string }`.
- Wrap in `DataChartCard` titled "Teammates".
- A square, relatively-positioned container. Focal sprite absolutely centered.
  Teammate bubbles absolutely positioned by `computeRingLayout(n)` (from
  `usage-series.ts`) → `left: x%`, `top: y%`. SVG `<line>` layer underneath from
  center to each bubble, `stroke="var(--border)"`, opacity scaling with `pairPct`.
- **Default top 12** (one ring); a **"show top 20"** toggle (local `useState`)
  expands to two rings. (The shell already fetched `topN: 20`, so the toggle never
  refetches — just slices.)
- Bubble diameter scales with `pairPct` via Tailwind **size-scale buckets**
  (e.g. map pct ranges to `size-10 … size-20`) — no arbitrary px.
- Click a bubble → `<Link href={onTeammateHref(teammate)}>` (whole bubble is the
  link). Hover → `DataSpriteTooltip` showing "{name}: N teams (X%)" (raw
  `pairCount` + `pairPct` — show both so a big % on a tiny sample reads honestly).
- **Mobile (393px):** cap to top 8 on one ring; center sprite slightly smaller;
  radius = a fraction of container width (responsive). Same component.

**7.2 — `species-teammate-heatmap.tsx`** (`"use client"`):

- Props: `{ focalSpecies: string; teammates: TeammateRow[]; matrix: TeammateMatrix; onTeammateHref: (slug: string) => string }`.
- Wrap in `DataChartCard` titled "Teammate cores".
- CSS grid `(N+1) × (N+1)`: a header row + header col of teammate sprites
  (`matrix.order`), then cells. N = `matrix.order.length` (≤8). Cell (T_i, T_j) =
  look up `matrix.cells[key]` where `key = [a, b].sort()[0] + "||" + sort()[1]`
  (order the two slugs lexicographically to match the RPC key convention). Cell
  background = teal at opacity scaled to the co-occurrence pct
  (`bg-primary` + an opacity bucket, or inline `backgroundColor: oklch(... / {alpha})`).
  The **diagonal** (i == j) renders that teammate's own `pairPct` with the focal
  species (look it up from `teammates`) or is blanked — pick blanked-with-a-dash
  for clarity.
- Hover a cell → tooltip "{T_i} + {T_j}: N teams (X% of {focal} teams)". Click a
  **header** sprite → `<Link href={onTeammateHref(teammate)}>`.
- **Mobile (Decision 3):** cap to top **5×5** at phone widths (use `useIsMobile()`
  - slice `matrix.order` to 5 and only render cells among those 5); cells become
    tap targets ≥40px where possible; header sprites shrink. Desktop renders the full
    N×N (≤8). Same component, reduced N — no separate mobile file.

**Tests:**

- Constellation: renders `n` bubbles for `n` teammates; "show top 20" toggle
  expands the shown count; each bubble links to the teammate path; tooltip shows
  count + pct. Mock sprites + `useIsMobile`.
- Heatmap: cell lookup uses the lexicographically-ordered `a||b` key (assert a
  known cell resolves regardless of T_i/T_j order); mobile path slices to 5×5;
  header click navigates. Mock sprites + `useIsMobile`/`useIsClient`.

**Verification:** tests green; visual in Task 11.

---

## Task 8 — Single-Species Usage Timeline (Feature 5)

**Objective.** Reuse `UsageLineChart` scoped to one species via the
`detailBucketsToTimeseriesPoints` adapter (landed in Task 4) + existing event pins.
Zero new SQL, chart component reused unchanged.

**Parallelizable:** Yes — with Tasks 5, 6, 7.

**Files (allowlist):**

- CREATE `apps/web/src/components/data/species-timeline.tsx`
- CREATE `apps/web/src/components/data/__tests__/species-timeline.test.tsx`
- (mount into the `{/* TASK8 */}` marker)

**Details (`"use client"`):**

- Props: `{ detail: SpeciesUsagePeriod[]; species: string; events: FormatEvent[] }`.
- Wrap in `DataChartCard` titled "Usage over time".
- Build the single-series `points` via `detailBucketsToTimeseriesPoints(detail, species)`
  (already in `usage-series.ts`). Render `UsageLineChart` with:
  - `points={points}`
  - `selectedSpecies={[species]}` (one line)
  - `events={events}`
  - `onSpeciesClick={() => {}}` (no toggling — single series; pass a no-op)
  - `onRangeChange={() => {}}` (the drill-down does not brush-drive the URL range;
    a no-op keeps the chart self-contained. The brush remains harmless — it just
    scopes the visible range locally.)
- **No new chart code** — `UsageLineChart` is imported and used as-is. Do **not**
  edit `usage-line-chart.tsx` (Task 8 owns no edits to it).
- **Mobile:** inherits `UsageLineChart`'s responsive behavior. No change.

**Tests:** the adapter produces one point per bucket keyed by `species` (the
adapter itself is unit-tested in Task 4; here assert `species-timeline` passes
`selectedSpecies=[species]` and renders without crashing). Mock the chart's
recharts internals via the existing test setup; smoke render with 2–3 buckets.

**Verification:** test green; visual in Task 11.

---

## Task 9 — Remove the Sankey from the Overview tab (Decision 6)

**Objective.** Delete the Meta Pipeline (Sankey) rendering, its `columns` URL
param + sidebar control, and the Sankey modules. The **treemap (Phase 2) becomes
the primary "meta now" snapshot** on the Overview tab. `get_usage_pipeline` RPC
and `getPipelineData`/`getCachedPipelineData`/`fetchPipelineData` are **RETAINED**
— the treemap still consumes pipeline data. Only the Sankey _rendering_ + its
`columns` config are removed.

**Parallelizable:** No against Task 10 (shared `usage-explorer.tsx`). Independent
of Tasks 4–8. **Run before Task 10.**

**Files (allowlist):**

- DELETE `apps/web/src/components/data/usage-pipeline-chart.tsx`
- DELETE `apps/web/src/components/data/usage-pipeline.ts`
- DELETE `apps/web/src/components/data/__tests__/usage-pipeline-chart.test.tsx`
  (if present) and `__tests__/usage-pipeline.test.ts` (if present) — `ls` first.
- MODIFY `apps/web/src/components/data/usage-explorer.tsx`
- MODIFY `apps/web/src/components/data/usage-filters.ts`
- MODIFY `apps/web/src/components/data/data-sidebar.tsx`
- MODIFY `apps/web/src/components/data/__tests__/usage-filters.test.ts` (drop
  `coerceColumns` cases)
- MODIFY `apps/web/src/components/data/__tests__/usage-explorer.test.tsx` (drop
  any Sankey/columns assertions; keep green)

**Edits:**

1. **`usage-explorer.tsx`:**
   - Remove the `UsagePipelineChart` import and the entire "Meta Pipeline (Sankey)"
     card block from `overviewContent` (lines rendering the `<div className="bg-card …">`
     wrapper around `<UsagePipelineChart … />`). The Overview tab then contains the
     **treemap + conversion scatter** only (treemap is the primary snapshot).
   - Remove `columns` derivation (`coerceColumns`), the `columns` arg threaded
     through `updateUrl`, the `handleColumnsChange` handler, and the `columns`/
     `onColumnsChange` props passed to `<DataSidebar />`.
   - Remove the `PipelineColumn` import and the `params.set("columns", …)` line in
     `updateUrl`. Also remove `params.delete("columns")` cleanup is unnecessary —
     but ADD a one-time `params.delete("columns")` in `updateUrl` to scrub any
     legacy `columns` param from old shared links (mirrors the existing
     `params.delete("threshold")` legacy cleanup already in the file).
   - The `pipelineResult` query stays (treemap + sidebar species list use it).
2. **`usage-filters.ts`:** remove `PipelineColumn`, `ALL_PIPELINE_COLUMNS`,
   `DEFAULT_PIPELINE_COLUMNS`, and `coerceColumns`. Grep the repo for remaining
   importers (`grep -rn "PipelineColumn\|coerceColumns\|ALL_PIPELINE_COLUMNS" apps/web/src`)
   and ensure only the files in this allowlist reference them after the edit.
3. **`data-sidebar.tsx`:** remove the entire "Pipeline columns" block (the
   `{/* Pipeline columns */}` section — column reorder/toggle UI), the `columns`
   and `onColumnsChange` props, the `PipelineColumn`/`ALL_PIPELINE_COLUMNS` imports,
   the `PIPELINE_COLUMN_LABELS` map, and the `COLUMN_COLORS` import (it came from
   the deleted `usage-pipeline.ts`).
4. **Confirm `assignColor`** still has a home. It currently lives in
   `usage-series.ts` (NOT in the deleted `usage-pipeline.ts`), so deleting
   `usage-pipeline.ts` does not orphan it — verify with a grep before deleting.

**Verification:** `grep -rn "usage-pipeline\|UsagePipelineChart\|coerceColumns\|PipelineColumn" apps/web/src`
returns nothing outside deleted files; `pnpm --filter @trainers/web typecheck`
clean; `usage-filters` + `usage-explorer` tests green; `/data` Overview renders the
treemap + scatter with no Sankey and no sidebar Pipeline section.

---

## Task 10 — Wire Phase 2 `speciesHref` click-through to the drill-down

**Objective.** Phase 2 gated `speciesHref?` on the treemap, scatter, and dumbbell
sprites as an **absent** no-op prop. Phase 3 supplies it: clicking a species sprite
on `/data` navigates to `/data/pokemon/{species}` carrying the active filter query.
This is the only change Phase 3 makes to Phase 2 chart internals.

**Parallelizable:** No — depends on Task 4 (the route must exist) and Task 9 (edits
the same `usage-explorer.tsx`; run **after** Task 9).

**Files (allowlist):**

- MODIFY `apps/web/src/components/data/usage-explorer.tsx` (build the
  `speciesHref` fn, pass it to the three charts)
- MODIFY `apps/web/src/components/data/usage-treemap.tsx` (use the prop)
- MODIFY `apps/web/src/components/data/usage-conversion-scatter.tsx` (use the prop)
- MODIFY `apps/web/src/components/data/usage-source-dumbbell.tsx` (use the prop)
- MODIFY `apps/web/src/components/data/usage-top-share-dumbbell.tsx` (use the prop)
- MODIFY `apps/web/src/components/data/usage-dumbbell.tsx` only if the shared
  dumbbell primitive is where the sprite/click lives (check — if the `speciesHref`
  hook point is in the shared primitive, wire it there and have both dumbbell
  charts pass it through).
- MODIFY the corresponding `__tests__/*` for any chart whose click behavior changed.

**Details:**

1. In `usage-explorer.tsx`, build:
   ```ts
   const speciesHref = (species: string) =>
     `/data/pokemon/${encodeURIComponent(species)}?${filterQuery}`;
   ```
   where `filterQuery` is the current `format/source/minPlayers/rangeStart/
rangeEnd/periodType` query (omit defaults to keep the URL clean — reuse the same
   omit rules `updateUrl` uses, or build a small helper). Pass `speciesHref` to
   `<UsageTreemap>`, `<UsageConversionScatter>`, `<UsageSourceDumbbell>`,
   `<UsageTopShareDumbbell>`.
2. In each chart, the `speciesHref?` prop already exists as a no-op. Change the
   sprite/tile/dot/row to a navigating element when `speciesHref` is provided:
   - Treemap tiles + dumbbell rows: wrap in `<Link href={speciesHref(species)}>`
     (whole tile/row is the link).
   - Scatter dots: recharts scatter shape — use an `onClick` that does
     `router.push(speciesHref(species))` (the chart is already a client component;
     accept a `router.push` via the existing click pathway, or add a small click
     handler). Keep keyboard accessibility where the element is a real link.
3. Do **not** change any chart's data, layout, or computation — only flip the
   gated click from no-op to navigation.

**Verification:** clicking a treemap tile / scatter dot / dumbbell row on `/data`
navigates to `/data/pokemon/{species}?<filters>`; filters carry over (verify the
URL query); `pnpm --filter @trainers/web typecheck` clean; updated chart tests
green.

---

## Task 11 — Mobile responsiveness pass + ui-verifier

**Objective.** Verify every drill-down section is legible at 393px (same charts,
scaled — no list fallbacks). Fix overflow / tap-target / density issues found.

**Parallelizable:** No — runs after 4–10.

**Files (allowlist):** any of the new `apps/web/src/components/data/species-*.tsx`
files + `move-chip.tsx` + the route's `page.tsx`/`loading.tsx` (responsive tweaks
only — no structural changes). Do **not** create `*-mobile.tsx` files (the design
forbids them — same charts scaled).

**Steps:**

1. Run the two mobile-responsiveness probes (page overflow `false`; no sub-40px
   tap targets) on `/data/pokemon/<a-top-species>` at 393×852.
2. Apply fixes within components: donut grid `grid-cols-2` at narrow widths; combo
   rows cap to top 8 + chips wrap; constellation cap to top 8 / responsive radius;
   heatmap cap to 5×5 + ≥40px cells; hero stacks (sprite + name + types; stats wrap;
   filter bar full-width stacked). Per the mobile behavior table in the design.
3. Dispatch `ui-verifier` (Playwright visual + design-system check) on the
   drill-down at mobile + desktop widths, plus a quick re-check of `/data` Overview
   (post-Sankey-removal). Store screenshots in `.playwright-mcp/screenshots/`.

**Verification:** ui-verifier passes; both probes clean; charts legible at 393px;
no horizontal scroll.

---

## Task 12 — Docs updates

**Objective.** Keep the skills in sync with the two new RPCs + any new chart
patterns.

**Parallelizable:** Yes — with Task 11.

**Files (allowlist):**

- MODIFY `.claude/skills/working-with-usage-data/SKILL.md` — add
  `get_species_move_combos` and `get_species_teammates` to the RPC Catalog table
  with their return shapes, the sorted-4-move normalization + complete-set
  denominator note (combos), and the shared focal-teams CTE + duplicated-matrix-jsonb
  note (teammates).
- MODIFY `.claude/skills/building-charts/SKILL.md` — document the genuinely new
  reusable patterns Phase 3 introduces (radial constellation via `computeRingLayout`
  - percentage-positioned bubbles; CSS-grid co-occurrence heatmap; recharts donut
    with "Other" collapse; the `detailBucketsToTimeseriesPoints` single-series adapter
    for reusing `UsageLineChart`). Read the skill first; only add new patterns. Note
    the Sankey removal (the `usage-pipeline` modules are gone).
- MODIFY the Meta Explorer phase checklist if one exists in
  `.claude/skills/product-vision/SKILL.md` or a design doc — mark Phase 3 features
  done. Confirm the exact location before editing; if there's no explicit checklist,
  skip rather than invent one.

**Verification:** docs read cleanly; RPC catalog matches the shipped signatures
(arg order + return columns).

---

## Local data note (for the verifier and anyone running the drill-down locally)

`team_slots` is **derived** and is **empty after a fresh `pnpm db:reset`** unless
seeded. Both new RPCs return zero rows against an empty fact table:
`get_species_move_combos` → `[]` (combo card empty state),
`get_species_teammates` → zero rows → `{ focalPlayers: 0, teammates: [], matrix: { order: [], cells: {} } }`
(constellation/heatmap empty), and `get_species_usage_detail` → zero buckets →
the route renders the **valid-species empty state** (not a 404). To verify with
real data locally, run the admin **"Calculate usage"** action first (admin →
External Data → "Calculate usage"), which calls `compileSourceTeamSlots` for
rk9 + limitless and backfills `team_slots`. The verifier (Task 11) must do this
before visual checks, and should drill into a top species of
`gen9championsvgc2026regma` (the default format) so the fingerprint/combos/
teammates all have data.

## Out of scope (do not build)

- **Dynamic per-species OG image** (`next/og` route with sprite + name + headline
  usage on a teal card) — explicitly deferred (Decision 4); requires its own design.
  Phase 3 ships the static default site OG card.
- **A per-species Sankey** on the drill-down — the fingerprint + combos are the
  honest replacements; re-introducing marginal multiplication is forbidden.
- **A format-wide core heatmap** (no focal species) — that is a Phase 2/Phase 4
  overview artifact; the Phase 3 heatmap is focal-scoped only.
- **New indexes / materialized views** — only if a query is _measured_ slow (it
  isn't yet). The named matview escalation is documented in the Task 1 migration
  header, not built.
- **New cache tag or invalidation helper** — the existing `USAGE_STATS` +
  `usageStats(format)` tags cover both new fetchers (`species` is in the cache key
  via function args).
- **`generateStaticParams`** for the route — intentionally omitted (large,
  data-dependent species×format matrix; the fetcher layer caches via `'use cache'`).
