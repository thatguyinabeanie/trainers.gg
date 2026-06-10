---
paths:
  - "packages/data-sources/**"
  - "packages/supabase/src/usage/**"
  - "packages/supabase/src/queries/usage.ts"
  - "packages/supabase/src/mutations/team-slots.ts"
  - "apps/web/src/components/data/**"
  - "apps/web/src/actions/usage.ts"
---

# Usage Data Sources

Constraints for the usage-stats pipeline (`team_slots`, aggregation RPCs, the `/data` Meta Explorer).

## Hard Constraint: Public Tournament Data Only

`team_slots` and everything derived from it carry **public tournament data only** — the open-team-sheet fields:

- ✅ species, held item, ability, tera type, moves, nature/stat-alignment
- ❌ **NEVER** team-builder EVs, IVs, gender, or level
- ❌ **NEVER** player names in `team_slots` — `player_key` is an opaque source-qualified id (`rk9:<standing_id>`, `limitless:<standing_id>`, `trainers.gg:<registration_id>`)

This is a privacy/product boundary, not a convenience. Private builder data stays in `teams`/`team_pokemon` and is never compiled into usage stats.

## Source Discriminator

`source` is `'rk9' | 'limitless' | 'trainers.gg'` — **never `'first_party'`** (legacy value, retired with the rollup layer).

## Compile Model

- `team_slots` is **derived** data: rebuilt per event via idempotent DELETE + bulk INSERT (`compileEventTeamSlots`). It is always safe to recompile an event.
- The raw per-source schemas (`rk9.*`, `limitless.*`, `tournament_team_sheets`) are the source of truth and stay **separate** — do not merge them or write usage features against them directly; read `team_slots`.

## Denominator Semantics

- `total_players` = players **with team sheets** per event(-division) — not registrant counts.
- Usage % = distinct `player_key` running the species ÷ SUM of `total_players` over distinct `(source, event_key, division)`.
- Histogram pct denominator = distinct players running that species.

Deeper reference (schema, per-source field matrix, RPC catalog): the `working-with-usage-data` skill.
