---
name: working-with-usage-data
description: Use when working with team_slots, usage aggregation RPCs, the /data Meta Explorer, or per-source tournament data (RK9, Limitless, trainers.gg)
---

# Working With Usage Data

Usage stats are computed live from `public.team_slots` — a denormalized fact table with **one row per Pokemon slot per player per tournament**. There is no precomputed rollup layer; aggregation happens in SQL RPCs, cached at the web layer.

## Hard Constraint (also enforced by `.claude/rules/usage-data-sources.md`)

Public tournament data only: species, held item, ability, tera type, moves, nature/stat-alignment. **Never** builder EVs/IVs/gender/level. **Never** player names in `team_slots` — `player_key` is an opaque source-qualified id.

## team_slots Schema

| Group  | Columns                                                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event  | `source` ('rk9' \| 'limitless' \| 'trainers.gg' — never 'first_party'), `event_key`, `format` (Showdown id), `event_date`, `event_tier` (RK9 only), `is_online`, `total_players` (denominator) |
| Player | `player_key` (groups one player's 6 slots), `division` (RK9 only), `placement`, `wins`/`losses`/`ties`, `country` (ISO-2)                                                                      |
| Slot   | `position` (1–6), `species` (slug), `held_item`, `ability`, `tera_type`, `moves text[]`, `nature`                                                                                              |

Excluded by design: EVs, IVs, gender, level, player names.

## Per-Source Field Matrix

| Field      | RK9                                                   | Limitless             | trainers.gg                                      |
| ---------- | ----------------------------------------------------- | --------------------- | ------------------------------------------------ |
| nature     | ✓ (`stat_alignment`, Champions events)                | ✗ NULL                | ✓ (Champions sheets only)                        |
| W/L/T      | ✗ NULL (v1; derivable from `rk9.match_results` later) | ✓                     | ✗ at compile; via completion recompile           |
| placement  | ✓ at import                                           | ✓ at import           | filled by tournament-completion recompile        |
| country    | ✓                                                     | ✓ (optional)          | ✗ NULL v1 (privacy-gated by `show_country_flag`) |
| event_tier | ✓ regional/international/special/worlds               | ✗                     | ✗                                                |
| division   | ✓ masters/senior/junior                               | ✗                     | ✗                                                |
| tera_type  | ✓ (NULL in Champions formats)                         | ✓ (NULL in Champions) | ✓                                                |
| is_online  | always false                                          | per tournament        | always true                                      |

## Denominator Semantics

- `total_players` = players **with team sheets** per event(-division) — not registrant counts.
- Bucket denominator = SUM of `total_players` over DISTINCT `(source, event_key, division)`.
- Species numerator = `COUNT(DISTINCT player_key)` running the species.
- Histogram pct denominator = distinct players running that species.

## RPC Catalog

All take `p_min_players` (UI default **100**) and `p_source` (`'all'` or a concrete source); SECURITY INVOKER, granted to anon/authenticated.

| RPC                                                                                  | Returns                                                                                                                                             |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_usage_timeseries(format, source, period_type, start, end, min_players)`         | per-bucket per-species usage % (day/week/month buckets)                                                                                             |
| `get_usage_pipeline(format, source, start, end, min_players)`                        | one-slice snapshot: usage % + rank + jsonb histograms (abilities, items, natures, moves, tera_types, ability_items) shaped as `{value, count, pct}` |
| `get_species_usage(format, source, period_type, min_players)`                        | latest-bucket ranking + 7d delta                                                                                                                    |
| `get_species_usage_detail(format, species, source, period_type, limit, min_players)` | trailing N buckets for one species + 7d/30d deltas + histograms                                                                                     |
| `get_format_events(format)`                                                          | distinct events for timeline annotation pins                                                                                                        |

TS wrappers live in `packages/supabase/src/queries/usage.ts` (jsonb columns cast to `UsageDetailEntry[]`).

## Compile Flow

1. Import lands in the per-source schema (`rk9.*`, `limitless.*`, `tournament_team_sheets`) — raw schemas stay separate; they are the source of truth.
2. `compileEventTeamSlots(supabase, source, eventId)` (service-role) rebuilds that event's slots: idempotent DELETE by `(source, event_key)` + chunked bulk INSERT. Pure mapping logic: `packages/supabase/src/usage/compile.ts` (`buildTeamSlotRows`).
3. `compileSourceTeamSlots` backfills all importable events for a source (admin → External Data → "Calculate usage").
4. trainers.gg events compile at tournament start (no placement) and recompile at completion (placement/W-L fill in).
5. Cache invalidation: `updateTag` via `invalidateUsageStatsCaches()` from admin server actions; `POST /api/revalidate/usage` (Bearer secret) from non-Next contexts.

## Scaling

Indexes only (`(format, event_date)`, `(format, species)`, `(format, source)`, GIN `moves`). If a query shape is _measured_ slow, escalate in order: materialized view for that shape → SQL-defined aggregate tables → partitioning. Never add precompute speculatively.
