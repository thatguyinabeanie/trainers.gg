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
