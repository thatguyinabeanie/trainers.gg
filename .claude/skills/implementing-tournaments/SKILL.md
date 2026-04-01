---
name: implementing-tournaments
description: Use when working with tournament logic, Swiss pairings, standings, brackets, drops, byes, or the tournaments package
---

# @trainers/tournaments

Tournament business logic — Swiss pairings, standings, brackets, drop/bye handling. Pure TypeScript, no framework dependencies.

## Domain Model vs DB Schema

DB tables use raw IDs and phase records. This package uses typed domain objects. **Always convert via `adapters.ts`** before passing DB records into tournament logic.

```typescript
import { toPhaseConfig } from "@trainers/tournaments/adapters";
const phaseConfig = toPhaseConfig(dbPhaseRow, dbRoundRows);
```

## Key Modules

| Module                 | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `swiss-pairing.ts`     | Generates pairings for a round. Input: standings + history. Output: match pairs. |
| `standings.ts`         | Calculates match wins, game wins, resistance (strength-of-schedule)              |
| `top-cut-bracket.ts`   | Double-elimination bracket generation and winner advancement                     |
| `drop-bye-handling.ts` | Player drop validation, bye assignment (tracks history to avoid double-byes)     |
| `tournament-flow.ts`   | Round/phase progression, tournament completion detection                         |
| `schedule.ts`          | ETA calculation for rounds and phases                                            |
| `validation.ts`        | Timing constraints, participant count checks, integrity validation               |

## Swiss Pairing Inputs

`generatePairings(standings, matchHistory, options)`:

- `standings`: sorted player list with record (W/L/T) and resistance
- `matchHistory`: Set of `"altId1-altId2"` strings (prevents rematches)
- Returns: array of `[alt1Id, alt2Id]` pairs + bye (`null` alt2 = bye)

## Key Subpaths

- `@trainers/tournaments/types` — domain types (use this for imports, not the package root)
- `@trainers/tournaments/adapters` — DB↔domain conversion (always go through this)

## Commands

```bash
pnpm --filter @trainers/tournaments test          # Run tests
pnpm --filter @trainers/tournaments test:watch    # Watch mode
pnpm --filter @trainers/tournaments typecheck     # Type checking
```

## Team Sheet Architecture

### Private Teams vs Public Snapshots

Player teams are stored in `teams` + `team_pokemon` + `pokemon` — these contain full
private data (EVs, IVs, nature, gender, shininess). RLS restricts access to:

- Team owner only (via `alts.user_id = auth.uid()`)
- Anyone, if the owner set `is_public = true` (irreversible)

Public tournament team data is served from `tournament_team_sheets` — OTS snapshots
containing only species, ability, held_item, tera_type, and moves. No EVs/IVs/nature.

### When Snapshots Are Created

At tournament start (`startTournamentEnhanced`), AFTER teams are locked:

1. Teams locked via `team_locked = true` on registrations
2. `createTournamentTeamSheets()` reads private data via service role
3. Writes OTS-format rows to `tournament_team_sheets` (6 rows per player)
4. No-shows (not checked in) get no snapshots
5. Before tournament start, zero snapshot data exists — eliminates leaks

### Open vs Closed Team Sheets

The `open_team_sheets` boolean on tournaments controls match-level UI:

- **Open:** Opponents see each other's full OTS at round start (standard VGC)
- **Closed:** Opponents do NOT see OTS during active play
- **Both:** All OTS become public after tournament completes

This is a UI toggle, not a data access control — snapshots always exist for
started tournaments. The `tournament_team_sheets` table uses `USING(true)` SELECT
intentionally because if a row exists, it's meant to be public.

### Snapshot Table Format

One row per Pokemon per player per tournament (flat table, no JSONB):

- `format` column stores Showdown format IDs (e.g., `gen9vgc2026regi`)
- Group by `(tournament_id, registration_id)` for a full team sheet
- Indexes on `(format, species)` for per-format analytics queries
- Can add Postgres LIST partitioning later if data volume warrants it

### Format Registry

Format IDs are defined in `packages/pokemon/src/formats.ts`. This maps Showdown IDs
to display metadata (game name, regulation, label). Use `getFormatById()` for lookups,
`getFormatLabel()` for display, `getActiveFormats()` for current formats.

### Key Functions

| Function                     | Package                          | Purpose                                         |
| ---------------------------- | -------------------------------- | ----------------------------------------------- |
| `createTournamentTeamSheets` | `@trainers/supabase` (mutations) | Snapshot all seeded players at tournament start |
| `getTournamentTeamSheets`    | `@trainers/supabase` (queries)   | All snapshots for a tournament                  |
| `getTeamSheetByRegistration` | `@trainers/supabase` (queries)   | Single player's OTS                             |
| `getMatchTeamSheets`         | `@trainers/supabase` (queries)   | Both players' OTS for a match                   |
| `getFormatById`              | `@trainers/pokemon`              | Format metadata lookup                          |

## Testing

- **Location**: `src/__tests__/`
- **No external dependencies** — pure logic, fast execution
- **Key scenarios**: Swiss pairing correctness, standing calculations, bye assignment, drop validation
