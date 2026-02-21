# @trainers/tournaments

Tournament business logic — Swiss pairings, standings, brackets, drop/bye handling.
No framework dependencies — pure TypeScript.

## Domain Model vs DB Schema

DB tables use raw IDs and phase records. This package uses typed domain objects.
Always convert via `adapters.ts` before passing DB records into tournament logic.

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
| `drop-bye-handling.ts` | Player drop validation, bye assignment (tracks bye history to avoid double-byes) |
| `tournament-flow.ts`   | Round/phase progression, tournament completion detection                         |
| `schedule.ts`          | ETA calculation for rounds and phases                                            |
| `validation.ts`        | Timing constraints, participant count checks, integrity validation               |

## Swiss Pairing Inputs

`generatePairings(standings, matchHistory, options)`:

- `standings`: sorted player list with record (W/L/T) and resistance
- `matchHistory`: Set of `"altId1-altId2"` strings (prevents rematches)
- Returns: array of `[alt1Id, alt2Id]` pairs + bye assignment (null alt2 = bye)

## Exports

| Import Path                      | Target            | Purpose                             |
| -------------------------------- | ----------------- | ----------------------------------- |
| `@trainers/tournaments`          | `src/index.ts`    | All tournament logic                |
| `@trainers/tournaments/types`    | `src/types.ts`    | Domain types (use this for imports) |
| `@trainers/tournaments/adapters` | `src/adapters.ts` | DB↔domain conversion                |

## Types

Import domain types from `@trainers/tournaments/types`, not directly from the package root.
DB↔domain conversion always goes through `@trainers/tournaments/adapters`.

## Commands

```bash
pnpm --filter @trainers/tournaments test          # Run tests
pnpm --filter @trainers/tournaments test:watch    # Watch mode
pnpm --filter @trainers/tournaments typecheck     # Type checking
```

## Testing

- **Test location**: `src/__tests__/`
- **No external dependencies** — pure logic tests, fast execution
- **Key test scenarios**: Swiss pairing correctness, standing calculations, bye assignment, drop validation
