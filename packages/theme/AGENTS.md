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
