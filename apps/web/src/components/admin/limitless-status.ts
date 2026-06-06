/**
 * Map an external Limitless sync status to the site's internal status enum.
 * "completed" (Limitless) → "complete" (site), plus passthrough for queued/importing/failed.
 * "skipped" — synced for visibility but never imported (e.g. CUSTOM-format tournaments).
 * A null/empty/"pending" status is the normal not-yet-imported state.
 */
export function normalizeLimitlessStatus(status: string | null): string {
  switch (status) {
    case "completed":
      return "complete";
    case "queued":
    case "importing":
      return "in-progress";
    case "failed":
      return "failed";
    case "skipped":
      return "skipped";
    case null:
    case "":
    case "pending":
      // Synced-but-not-yet-imported tournaments have a null/empty status. This
      // is the expected "pending" state — not an anomaly — so do not log it
      // (thousands of synced rows would otherwise flood the console).
      return "pending";
    default:
      // Genuinely unexpected non-null value. Pass `status` as a separate
      // console argument (not interpolated into the format string) to avoid a
      // tainted-format-string finding.
      console.warn(
        "[limitless] Unknown tournament status — defaulting to pending:",
        status
      );
      return "pending";
  }
}
