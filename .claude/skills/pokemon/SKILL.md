---
name: pokemon
description: Use when parsing Pokemon teams, validating team legality, calculating type effectiveness, or working with the pokemon package
---

# @trainers/pokemon

Pokemon data, team validation, stats calculation, type effectiveness, and Showdown format parsing. Pure TypeScript, no framework dependencies.

## Key Modules

| Module | Purpose |
| ------ | ------- |
| `showdown-parser.ts` | Parse Showdown-format team text into `PokemonSet[]` |
| `showdown-format.ts` | Convert `PokemonSet[]` back to Showdown text |
| `team-validator.ts` | Validate team legality for a given format |
| `type-effectiveness.ts` | Type matchup calculations |
| `stats-calculator.ts` | Base stat / EV / IV calculations |
| `format-rules.ts` | Format-specific rules (VGC, OU, etc.) |

## Dual Parser System

- `parseShowdownTeam()` — legacy parser, simple text splitting
- `parseTeam()` — advanced parser using `@pkmn/dex` + `@pkmn/sim` for full validation

**Use `parseTeam()` for new code.** Uses `@pkmn/sets` for Showdown format compatibility.

## Key Subpaths

- `@trainers/pokemon/sprites` — sprite URL generation (not in main export)
- Key types (`PokemonSet`, `TeamComposition`) available from package root

## Commands

```bash
pnpm --filter @trainers/pokemon test          # Run tests
pnpm --filter @trainers/pokemon test:watch    # Watch mode
pnpm --filter @trainers/pokemon typecheck     # Type checking
```

## Testing

- **Location**: `src/__tests__/`
- **Test data**: Inline Showdown paste strings (e.g. `PIKACHU_PASTE`, `TWO_POKEMON_PASTE`)
- **Note**: `@pkmn/data`, `@pkmn/dex`, `@pkmn/sim` are heavy — first run may be slow
