import { type UnifiedRow } from "./external-data-shared";
import { deriveLimitlessDisplayStatus } from "./limitless-display-status";

/**
 * Mutually-exclusive display buckets for a unified (RK9 or Limitless) row.
 * Coarser than the Limitless-only `DisplayStatus` — `queued` and `importing`
 * are collapsed into `in-progress` so both sources share one visual language.
 */
export type DisplayStatus =
  | "pending"
  | "in-progress"
  | "imported"
  | "failed"
  | "skipped";

/**
 * Map any import row (RK9 or Limitless) to one shared display status:
 * `pending · in-progress · imported · failed · skipped`.
 *
 * - Limitless delegates to `deriveLimitlessDisplayStatus` (queued+importing →
 *   in-progress; unmappable format → skipped).
 * - RK9 maps from its normalized `row.status`: complete → imported,
 *   in-progress (roster/teams) → in-progress, failed → failed; both `pending`
 *   and future `upcoming` events → pending. RK9 has no `skipped`.
 */
export function deriveDisplayStatus(row: UnifiedRow): DisplayStatus {
  if (row.source === "limitless" && row.limitless) {
    const limitlessStatus = deriveLimitlessDisplayStatus({
      import_status: row.limitless.import_status,
      format_id: row.limitless.format_id,
      data_imported_at: row.limitless.data_imported_at,
    });
    // Collapse Limitless-granular statuses into the unified vocabulary
    if (limitlessStatus === "queued" || limitlessStatus === "importing") {
      return "in-progress";
    }
    return limitlessStatus;
  }
  switch (row.status) {
    case "complete":
      return "imported";
    case "in-progress":
      return "in-progress";
    case "failed":
      return "failed";
    default:
      return "pending"; // includes "pending" and "upcoming"
  }
}
