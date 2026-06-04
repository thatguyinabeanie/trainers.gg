/**
 * Map an external Limitless sync status to the site's internal status enum.
 * "completed" (Limitless) → "complete" (site), plus passthrough for queued/importing/failed.
 * Anything else (including null) → "pending".
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
    default:
      console.warn(`[limitless] Unknown tournament status: "${status as string}" — defaulting to pending`);
      return "pending";
  }
}
