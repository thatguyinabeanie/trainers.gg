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

## Penpot Export

`pnpm --filter @trainers/theme export:penpot` regenerates `design/tokens/tokens.json` for import into the local Penpot instance. See `scripts/export-penpot.ts` for the export logic and `infra/penpot/AGENTS.md` for the Penpot setup.
