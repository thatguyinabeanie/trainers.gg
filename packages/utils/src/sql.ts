/**
 * Escape LIKE/ILIKE special characters (%, _, \) so the value is
 * matched literally in a PostgreSQL LIKE or ILIKE expression.
 *
 * Use this before passing user input to Supabase `.ilike()` or `.like()`
 * to prevent wildcard injection (e.g., `_` matching any character).
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
