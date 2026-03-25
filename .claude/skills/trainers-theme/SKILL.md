---
name: trainers-theme
description: Use when adding design tokens, OKLCH color primitives, or building the theme package for web or mobile
---

# @trainers/theme

Shared design tokens — OKLCH color primitives, semantic tokens, and CSS variable utilities. Used by both Tailwind (web) and Tamagui (mobile).

## Structure

- `src/colors.ts` — OKLCH color palettes (light + dark)
- `src/tokens/` — semantic tokens mapped to OKLCH values
- `src/utils/` — `oklchToHex()`, `oklchToCss()` converters

## Usage

- **Web (Tailwind)**: tokens generate CSS custom properties consumed by the Tailwind config
- **Mobile (Tamagui)**: tokens imported directly into Tamagui theme config

Always use theme tokens for colors — never hardcode hex values.

## Key Subpaths

- `@trainers/theme/css` — generated CSS custom properties for Tailwind (web)
- `@trainers/theme/mobile` — generated Tamagui theme object (mobile)
- `@trainers/theme/tailwind` — Tailwind plugin
- Other subpaths (primitives, semantic, colors) — see `package.json` exports field

## Commands

```bash
pnpm --filter @trainers/theme build           # Generate all tokens (src/generated/)
pnpm --filter @trainers/theme typecheck       # Type checking
```

## Build Process

`pnpm build` runs `tsx scripts/generate.ts` and outputs:
- `src/generated/theme.css` — CSS custom properties for Tailwind
- `src/generated/mobile-theme.ts` — Tamagui theme object
- `src/generated/colors.hex.ts` — Hex color values

**Rebuild after changing any token values** — generated files are not auto-updated.
