/**
 * Consistent action result type for server actions and edge functions.
 * This type is shared across the entire platform (web, mobile, edge functions).
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
