/**
 * Canonical Pokemon nature roster — zero imports.
 *
 * Deliberately dependency-free so importers/edge bundles can pull in
 * `isNature()` without dragging `@pkmn/dex` (which `stats-calculator.ts`
 * imports at module top) into their bundle. See the `managing-edge-imports`
 * skill and `docs/decisions/2026-07-01-pokemon-nature-enum.md` for context.
 *
 * `stats-calculator.ts` re-exports `ALL_NATURES`, `Nature`, and `isNature`
 * from here to keep the barrel's public API unchanged.
 */

/**
 * Canonical 25-nature roster. Source of truth for the `Nature` type and the
 * `isNature` runtime guard. Order matches `NATURE_EFFECTS` (in
 * stats-calculator.ts) and the picker's preferred display order.
 */
export const ALL_NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
] as const;

/** 25-nature literal union. Derived from `ALL_NATURES`. */
export type Nature = (typeof ALL_NATURES)[number];

const ALL_NATURES_SET: ReadonlySet<string> = new Set(ALL_NATURES);

/** Runtime guard. Use at parse-time / DB-read boundaries. */
export function isNature(s: string | null | undefined): s is Nature {
  return s != null && ALL_NATURES_SET.has(s);
}
