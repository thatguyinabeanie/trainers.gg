# @trainers/theme

Shared design tokens — OKLCH color primitives, semantic tokens, and CSS variable utilities.
Used by both Tailwind (web) and Tamagui (mobile).

## Structure

- `src/colors.ts` — OKLCH color palettes (light + dark)
- `src/tokens/` — semantic tokens mapped to OKLCH values
- `src/utils/` — `oklchToHex()`, `oklchToCss()` converters

## Usage

Web (Tailwind): tokens generate CSS custom properties consumed by the Tailwind config.
Mobile (Tamagui): tokens imported directly into Tamagui theme config.

Always use theme tokens for colors — never hardcode hex values.

## Exports

| Import Path                  | Target                           | Purpose                             |
| ---------------------------- | -------------------------------- | ----------------------------------- |
| `@trainers/theme`            | `src/index.ts`                   | Main exports                        |
| `@trainers/theme/primitives` | `src/primitives/colors.oklch.ts` | OKLCH color palettes (light + dark) |
| `@trainers/theme/semantic`   | `src/tokens/semantic.ts`         | Semantic tokens (primary, surface)  |
| `@trainers/theme/css`        | `src/generated/theme.css`        | Generated CSS custom properties     |
| `@trainers/theme/mobile`     | `src/generated/mobile-theme.ts`  | Generated Tamagui theme             |
| `@trainers/theme/colors`     | `src/generated/colors.hex.ts`    | Generated hex color values          |
| `@trainers/theme/tailwind`   | `src/tailwind.ts`                | Tailwind plugin                     |

## Commands

```bash
pnpm --filter @trainers/theme build           # Generate all tokens (src/generated/)
pnpm --filter @trainers/theme export:penpot   # Sync tokens to Penpot
pnpm --filter @trainers/theme typecheck       # Type checking
```

## Build Process

`pnpm build` runs `tsx scripts/generate.ts` which outputs:

- `src/generated/theme.css` — CSS custom properties for Tailwind
- `src/generated/mobile-theme.ts` — Tamagui theme object
- `src/generated/colors.hex.ts` — Hex color values

Rebuild after changing any token values — generated files are not auto-updated.

## Penpot Export

`pnpm --filter @trainers/theme export:penpot` regenerates `design/tokens/tokens.json` for import into the local Penpot instance. See `scripts/export-penpot.ts` for the export logic and `infra/penpot/AGENTS.md` for the Penpot setup.
