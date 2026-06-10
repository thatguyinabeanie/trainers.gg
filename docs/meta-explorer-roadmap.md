# Meta Explorer Roadmap

Visualization roadmap for the `/data` Meta Explorer, built on the `team_slots`
fact table (one row per Pokemon slot per player per tournament — see the
`working-with-usage-data` skill for the schema, RPC catalog, and the hard
public-data-only constraint).

Audience priority: **competitive players first**, approachable for casuals and
shareable for content creators.

## Phase 1 — Foundation ✅ (PR #346)

- `team_slots` fact table + live SQL aggregation RPCs replace the rollup layer
- Source values `'rk9' | 'limitless' | 'trainers.gg'`; min-players default 100
- Next.js 16 Cache Components migration (`'use cache'` + tags + webhook
  revalidation)
- Scaling stance: indexes only (`(format, event_date)`, `(format, species)`,
  GIN on `moves`). Escalation ladder if a shape is _measured_ slow:
  materialized view → SQL-defined aggregate tables → partitioning. Likeliest
  first matview candidate: the usage timeseries.

## Phase 2 — Overview page charts

| Chart                           | What it shows                                                                                       | Data                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------- |
| ⭐ Usage vs. conversion scatter | Usage % (x) vs. top-cut/conversion rate (y); quadrants expose "overrated" picks and sleepers        | `placement` + usage from `team_slots` |
| ⭐ Bump chart                   | Rank trajectories over time — the rise-and-fall narrative                                           | `get_usage_timeseries`                |
| ⭐ Source-comparison dumbbells  | Same species' usage on trainers.gg vs Limitless vs RK9 — online/in-person divergence (unique to us) | per-source RPC calls                  |
| Overall vs. top-cut dumbbell    | Which species over/under-perform when it matters                                                    | placement bands                       |
| Streamgraph                     | Meta share over time, composition feel                                                              | `get_usage_timeseries`                |
| Treemap                         | Proportional meta-share snapshot, sprite-friendly                                                   | `get_usage_pipeline`                  |

## Phase 3 — Per-Pokemon drill-down (`/data/pokemon/[species]`)

| Chart                         | What it shows                                                                                        | Data                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| ⭐ Build fingerprint card     | Item/ability/tera/nature donuts + top-moves bars at a glance                                         | `get_species_usage_detail`                               |
| Moveset combo view            | TRUE 4-move joint distributions — the honest replacement for the Sankey (which multiplied marginals) | needs a joint-combos RPC over `moves` (GIN index exists) |
| Teammate constellation        | Sprite bubbles sized by pair rate around the focal species                                           | self-join on `player_key`                                |
| Teammate core heatmap         | Top-N × top-N co-occurrence matrix                                                                   | self-join on `player_key`                                |
| Single-species usage timeline | Existing line chart scoped to one species with event pins                                            | `get_species_usage_detail` + `get_format_events`         |

Sankey fate: open to replacing it once the moveset combo view exists.

## Phase 4 — Metadata views

| Chart                | What it shows                      | Data                      |
| -------------------- | ---------------------------------- | ------------------------- |
| Usage by country map | Regional meta differences          | `country` (RK9/Limitless) |
| Division comparison  | Masters vs Seniors vs Juniors meta | `division` (RK9)          |
| Placement-band usage | Winning teams vs. the field        | `placement`               |

## Future inputs

- **Showdown/Smogon data** — arrives pre-aggregated (marginals only, huge
  sample sizes); lands in its own aggregate-shaped side table, never in
  `team_slots`. Adds an online-ladder source to the comparison charts.
- **RK9 W/L records** — derivable from `rk9.match_results`; null in v1.
- **trainers.gg country** — privacy-gated by `show_country_flag`; needs an
  explicit opt-in before compiling into `team_slots`.

## Cut (deliberately)

- **Spread/EV clusters** — usage stats use public open-team-sheet data only;
  builder EVs/IVs are never compiled (see `.claude/rules/usage-data-sources.md`).
