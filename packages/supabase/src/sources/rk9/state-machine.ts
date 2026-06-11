/**
 * RK9 Import State Machine
 *
 * Defines the canonical lifecycle for importing an RK9 tournament event.
 *
 * Lifecycle:
 *   pending  → queued  : Admin queues the event for background import.
 *   queued   → roster  : Worker claims the event and starts the roster fetch.
 *   queued   → failed  : Max attempts reached before roster could start.
 *   roster   → teams   : Roster imported; team-list scraping begins.
 *   roster   → complete: Event has no team lists (e.g. juniors/seniors only).
 *   roster   → failed  : Roster fetch or DB write failed.
 *   teams    → teams   : More team batches remain (partial tick).
 *   teams    → complete: All team lists scraped successfully.
 *   teams    → failed  : No progress after 3 consecutive batches (terminal
 *                        for this attempt; use failed→queued to retry).
 *   complete → queued  : Admin triggers a re-import of an already-imported event.
 *   failed   → queued  : Admin retries via requeueFailedRk9Events (resets import_attempts).
 *
 * NOTE: RK9 uses the spelling 'complete'; Limitless uses 'completed'. This
 * module is the canonical RK9 spelling — do not add a 'completed' variant here.
 */

/** All possible import statuses for an RK9 event row. */
export type Rk9ImportStatus =
  | "pending"
  | "queued"
  | "roster"
  | "teams"
  | "complete"
  | "failed";

/**
 * Legal forward transitions — the single source of truth for the RK9 import
 * lifecycle. Any status write in the worker or actions layer must be
 * consistent with this map (enforced by `canTransition` in tests).
 */
const TRANSITIONS: Record<Rk9ImportStatus, readonly Rk9ImportStatus[]> = {
  pending: ["queued"],
  queued: ["roster", "failed"],
  roster: ["teams", "complete", "failed"],
  // teams → teams covers the multi-batch scraping loop (partial ticks)
  teams: ["teams", "complete", "failed"],
  // complete → queued covers re-import of an already-processed event
  complete: ["queued"],
  // failed → queued is the retry path (requeueFailedRk9Events resets import_attempts)
  failed: ["queued"],
};

/**
 * Returns true when a direct transition from `from` to `to` is a legal
 * forward move in the import lifecycle.
 *
 * @example
 * canTransition("pending", "queued")   // true
 * canTransition("teams", "complete")   // true
 * canTransition("complete", "failed")  // false
 */
export function canTransition(
  from: Rk9ImportStatus,
  to: Rk9ImportStatus
): boolean {
  return (TRANSITIONS[from] as readonly string[]).includes(to);
}

/**
 * Statuses from which an event may be moved to 'queued' (i.e., eligible for
 * queueing). Used by server actions (queueRk9Event, batchQueueRk9Events) and
 * the admin UI queue-strip to filter which events can be acted on.
 *
 * Note: 'complete' is intentionally absent — re-importing a completed event
 * uses a separate explicit reset flow, not the normal queue path.
 */
export const RK9_QUEUEABLE = ["pending", "failed"] as const;

/** Union type of statuses eligible for queueing. */
export type Rk9QueueableStatus = (typeof RK9_QUEUEABLE)[number];
