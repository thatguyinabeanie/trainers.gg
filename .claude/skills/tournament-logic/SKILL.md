---
name: tournament-logic
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

## Testing

- **Location**: `src/__tests__/`
- **No external dependencies** — pure logic, fast execution
- **Key scenarios**: Swiss pairing correctness, standing calculations, bye assignment, drop validation
