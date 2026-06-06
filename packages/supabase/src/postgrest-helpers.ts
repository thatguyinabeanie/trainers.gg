/**
 * Format an array of values as a PostgREST `in`-list literal: `("a","b")`.
 *
 * Use with `.not(col, "in", pgInList(values))` (and `.filter(col, "in", ...)`).
 * supabase-js only auto-parenthesizes `.in(col, array)`; passing a raw array to
 * `.not(col, "in", array)` yields `not.in.a,b` (no parens) → PostgREST 400.
 * Values are double-quoted (quotes/backslashes escaped) so commas/specials are safe.
 *
 * Callers MUST guard the empty case — an empty list `()` is invalid PostgREST.
 */
export function pgInList(values: ReadonlyArray<string | number>): string {
  return `(${values
    .map((v) => `"${String(v).replace(/(["\\])/g, "\\$1")}"`)
    .join(",")})`;
}
