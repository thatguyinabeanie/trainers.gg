/**
 * Pure cache-update helpers for match-page realtime subscriptions.
 *
 * These convert a Supabase Realtime `postgres_changes` payload into a new list
 * for `queryClient.setQueryData(...)`, so the match page updates the TanStack
 * cache directly from the pushed row instead of triggering a refetch.
 *
 * They operate on plain arrays of `{ id }`-bearing records and are intentionally
 * framework-free so they can be unit-tested in isolation.
 */

/** Minimal shape every match realtime row shares: a numeric primary key. */
export interface HasId {
  id: number;
}

/**
 * Insert or update a row in a list, merging by `id` and preserving order.
 *
 * - If a row with the same `id` already exists, it is replaced **in place**
 *   (order is preserved — no reordering on UPDATE).
 * - Otherwise the row is appended to the end (INSERT).
 *
 * Treats a nullish list as empty, returning a single-element list.
 *
 * @param list - Current cached list (may be `null`/`undefined`).
 * @param row  - The inserted/updated row from `payload.new`.
 * @returns A new array — never mutates the input.
 */
export function upsertById<T extends HasId>(
  list: readonly T[] | null | undefined,
  row: T
): T[] {
  if (!list || list.length === 0) {
    return [row];
  }

  const index = list.findIndex((item) => item.id === row.id);
  if (index === -1) {
    return [...list, row];
  }

  const next = list.slice();
  next[index] = row;
  return next;
}

/**
 * Remove a row from a list by `id` (DELETE).
 *
 * Treats a nullish list as empty, returning an empty array. Returns a new
 * array — never mutates the input. If no row matches, the list is returned
 * with the same contents (still a fresh array reference).
 *
 * @param list - Current cached list (may be `null`/`undefined`).
 * @param id   - The `id` of the deleted row (from `payload.old`).
 */
export function removeById<T extends HasId>(
  list: readonly T[] | null | undefined,
  id: number
): T[] {
  if (!list || list.length === 0) {
    return [];
  }
  return list.filter((item) => item.id !== id);
}
