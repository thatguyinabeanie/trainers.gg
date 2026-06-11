import { ALL_VALID_FORMATS } from "@trainers/supabase";

/** Mutually-exclusive display buckets for a Limitless tournament row. */
export type DisplayStatus =
  | "pending"
  | "queued"
  | "importing"
  | "imported"
  | "failed"
  | "skipped";

/**
 * Map a Limitless row to exactly one display status.
 *
 * Precedence (real pipeline state wins so a failed import is never hidden as
 * "skipped"):
 *   1. data_imported_at set    → imported   (same source of truth as the chip)
 *   2. import_status failed     → failed
 *   3. import_status queued     → queued
 *   4. import_status importing  → importing
 *   5. import_status skipped    → skipped
 *   6. otherwise (null/""/pending/unknown): unmappable format → skipped, else pending
 *
 * "Unmappable" = `!ALL_VALID_FORMATS.has(format_id)` — covers CUSTOM and any
 * future unrecognized Limitless code.
 */
export function deriveLimitlessDisplayStatus(row: {
  import_status: string | null;
  format_id: string;
  data_imported_at: string | null;
}): DisplayStatus {
  if (row.data_imported_at) return "imported";
  switch (row.import_status) {
    case "failed":
      return "failed";
    case "queued":
      return "queued";
    case "importing":
      return "importing";
    case "skipped":
      return "skipped";
  }
  if (!ALL_VALID_FORMATS.has(row.format_id)) return "skipped";
  return "pending";
}
