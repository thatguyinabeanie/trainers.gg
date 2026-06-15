# Meta Explorer (`/data`) — Gap Analysis & Completion Plan

Status: DESIGN ONLY. No production code. Grounded against shipped code as of 2026-06-13.

## 1. What "complete" means

The `/data` Meta Explorer ships a strong **usage** story (treemap, trends, bump,
source comparison, conversion scatter, per-species drill-down). It does **not** yet
deliver three things the product vision and the original design memo treat as the
point of the feature:

1. **Win rate next to usage** — the explicit differentiator vs LabMaus/Pikalytics.
2. **Macro archetype-over-time** with a drill breadcrumb (Archetypes › cores › Pokémon).
3. **The analytics → builder loop** ("Build this" from a set) — the platform's whole reason to integrate analytics into the builder.

Everything else (synergy alluvial, richer clustering) is genuine "later polish."

## 2. Gap analysis

| # | Gap | Shipped today | Tag | Backend gap |
|---|-----|---------------|-----|-------------|
| 1 | **Win rate column** on every usage surface | Conversion scatter uses Top-N% placement as a *proxy* for performance; no true W/L win rate | **NEEDS-BACKEND** | win rate — `team_slots.wins/losses/ties` exist but populated Limitless-only (RK9 null, trainers.gg post-completion). No RPC aggregates them. |
| 2 | **Archetype-over-time stream** + drill breadcrumb | Streamgraph exists but is *per-species* (line-chart silhouette mode). No archetype concept. | **NEEDS-BACKEND** | archetype clustering / composition cores — "archetype" is not a column; must be derived (rule-based cores first, clustering later) |
| 3 | **"Build this" from a set** | Fingerprint + move-combo views display sets; no path into builder | **FRONTEND-ONLY** | none — data exists; builder already imports Showdown paste |
| 4 | **Synergy alluvial** (teammate mix over time) | Static teammate constellation + heatmap (latest period only) | **NEEDS-BACKEND** | teammates-over-time — current `get_species_teammates` is single-period; needs a time-bucketed variant |
| 5 | **Win-rate lift / over-under-performance badges** | Quadrant labels (proven/overrated/sleeper/fringe) from placement only | **NEEDS-BACKEND** | win rate (same as #1) — lift = winrate − 50% baseline |
| 6 | **Format-level summary header** (meta health: # events, # players, sample size, last updated) | No top-of-page context strip | **FRONTEND-ONLY** | none — counts derivable from existing SSR datasets |
| 7 | **Empty/low-sample affordances** across new surfaces | Threshold filter exists; no per-surface "low sample" pills | **FRONTEND-ONLY** | none |

Confirmed by grep: no `archetype`, `alluvial`, `build this`, or usage-context `win rate`
exists anywhere under `apps/web/src` or `packages/`. "core" appears only in
`species-move-combos.tsx` (move-frequency core, unrelated).

## 3. Prioritized completion plan (parallelizable waves)

Disjoint file sets per wave; sequence only true data dependencies.

### Wave A — frontend-buildable NOW (no backend block)

- **A1. "Build this" from a set** (Gap 3) — new `build-this-button.tsx` + set→Showdown-paste
  serializer; wire into `species-fingerprint.tsx` and `species-move-combos.tsx`.
  Files: `apps/web/src/components/data/build-this-button.tsx`, `…/usage-series.ts` (serializer helper).
- **A2. Format summary header** (Gap 6) — new `data-summary-header.tsx`, fed from the
  existing 5 SSR datasets in `usage-explorer.tsx`. Disjoint from A1.
- **A3. Low-sample pill primitive** (Gap 7) — `sample-badge.tsx` + `data-shared.ts` threshold
  constants. Disjoint from A1/A2; consumed later by Wave C.

### Wave B — backend foundations (parallel RPCs, disjoint migrations)

- **B1. Win-rate RPC** (Gaps 1, 5) — `get_species_winrate(format, source, …)` aggregating
  `wins/losses/ties` with a games-played sample floor; returns null-safe winrate + lift.
  Plus TS wrapper in `packages/supabase/src/queries/usage.ts`.
- **B2. Archetype timeseries RPC** (Gap 2) — `get_archetype_timeseries(format, …)` keyed on
  **rule-based restricted-pair cores** (cheap, deterministic). Clustering is a later refinement
  behind the same return shape.
- **B3. Teammates-over-time RPC** (Gap 4) — time-bucketed variant of `get_species_teammates`.

  B1/B2/B3 touch separate migration files + separate functions in `usage.ts` → parallel-safe.

### Wave C — frontend on top of Wave B (depends on B)

- **C1. Win-rate column + lift badges** (Gaps 1, 5) — extend treemap/trends/conversion surfaces;
  reuse Wave A3 sample pill. Depends on B1.
- **C2. Archetype stream + drill breadcrumb** (Gap 2) — new `archetype-stream.tsx` +
  breadcrumb; new tab or Overview sub-view. Depends on B2.
- **C3. Synergy alluvial / teammate-over-time** (Gap 4) — new `teammate-flow.tsx`. Depends on B3.

  C1/C2/C3 touch disjoint component files → parallel within the wave.

## 4. Open questions for the owner

1. **Win-rate coverage:** Limitless-only W/L at launch. OK to ship with a "Games" sample
   floor + low-sample pill (partial coverage), or wait until RK9 match results land?
2. **Archetype definition:** Start with rule-based restricted-pair cores (ships fast), or
   hold for unsupervised clustering (richer, slower)? Recommendation: rule-based first.
3. **"Build this" EV defaults:** Open builder with blank EVs (honors the no-private-data
   boundary) or prefill a guessed spread? Recommendation: blank.
4. **Surface placement:** Does the archetype stream become a 4th tab, or replace/augment the
   Overview treemap as the new "meta now + over time" landing view?
5. **Win-rate definition:** game win rate (per-match) vs match/set win rate — which denominator?

## Mockups

- `/tmp/meta-explorer-mockups/01-winrate-table.html` — Gap 1 (NEEDS-BACKEND: win rate)
- `/tmp/meta-explorer-mockups/02-archetype-stream.html` — Gap 2 (NEEDS-BACKEND: clustering/cores)
- `/tmp/meta-explorer-mockups/03-build-this.html` — Gap 3 (FRONTEND-ONLY)
