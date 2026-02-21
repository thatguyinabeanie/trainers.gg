# @trainers/pokemon

Pokemon data, team validation, stats calculation, type effectiveness, and Showdown format parsing.
Pure TypeScript — no framework dependencies.

## Key Modules

| Module                  | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `showdown-parser.ts`    | Parse Showdown-format team text into `PokemonSet[]` |
| `showdown-format.ts`    | Convert `PokemonSet[]` back to Showdown text        |
| `team-validator.ts`     | Validate team legality for a given format           |
| `type-effectiveness.ts` | Type matchup calculations                           |
| `stats-calculator.ts`   | Base stat / EV / IV calculations                    |
| `format-rules.ts`       | Format-specific rules (VGC, OU, etc.)               |

## Dual Parser System

- `parseShowdownTeam()` — legacy parser, simple text splitting
- `parseTeam()` — advanced parser using `@pkmn/dex` + `@pkmn/sim` for full validation

Use `parseTeam()` for new code. Uses `@pkmn/sets` for Showdown format compatibility.

## Types

Key types: `PokemonSet`, `TeamComposition`. Import from package root or `@trainers/pokemon/types`.

## Exports

| Import Path                 | Target           | Purpose                                         |
| --------------------------- | ---------------- | ----------------------------------------------- |
| `@trainers/pokemon`         | `src/index.ts`   | Main exports (parsers, validators, calculators) |
| `@trainers/pokemon/types`   | `src/types.ts`   | Domain types (`PokemonSet`, `TeamComposition`)  |
| `@trainers/pokemon/sprites` | `src/sprites.ts` | Sprite URL generation                           |

## Commands

```bash
pnpm --filter @trainers/pokemon test          # Run tests
pnpm --filter @trainers/pokemon test:watch    # Watch mode
pnpm --filter @trainers/pokemon typecheck     # Type checking
```

## Testing

- **Test location**: `src/__tests__/`
- **Test data**: Inline Showdown paste strings (e.g., `PIKACHU_PASTE`, `TWO_POKEMON_PASTE`)
- **Dependencies**: `@pkmn/data`, `@pkmn/dex`, `@pkmn/sim` — heavy packages, tests may be slow on first run
