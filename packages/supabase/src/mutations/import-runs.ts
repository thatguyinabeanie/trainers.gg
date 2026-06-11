/**
 * Write path for the import_runs observability log.
 *
 * One row is recorded per source per import "tick". Both the cron route
 * (trigger 'cron') and the admin "Process now" action (trigger 'manual') call
 * recordImportRuns after the workers settle, so the recent-runs admin feed
 * reflects every pass without anyone reading server logs.
 *
 * CRITICAL: observability must never break the pipeline. recordImportRuns
 * swallows its own insert error (logging it) and returns instead of throwing —
 * a failed log write must not fail the import tick that produced real data.
 *
 * Only called with a service-role client (RLS is bypassed; there are no
 * INSERT policies on import_runs by design).
 */

import { type TypedClient } from "../client";
import { type Json, type TablesInsert } from "../types";

// =============================================================================
// Types
// =============================================================================

/** Source the run belongs to. Mirrors the import_runs.source CHECK constraint. */
export type ImportRunSource = "limitless" | "rk9" | "compile";

/** What initiated the run. Mirrors the import_runs.trigger CHECK constraint. */
export type ImportRunTrigger = "cron" | "manual";

/** Outcome status. Mirrors the import_runs.status CHECK constraint. */
export type ImportRunStatus =
  | "running"
  | "ok"
  | "partial"
  | "error"
  | "skipped";

/**
 * A normalized per-source run summary, ready to insert. Callers build one of
 * these per source from their own (differently-shaped) worker result objects.
 */
export interface ImportRunRecord {
  source: ImportRunSource;
  status: ImportRunStatus;
  /** Populated only when status is 'skipped'. */
  skipReason?: string | null;
  processed: number;
  errors: number;
  /** Queue depth left after the run; null when unknown / not applicable. */
  remaining?: number | null;
  /** Full worker result object, stored verbatim for debugging. */
  detail?: Json | null;
}

// =============================================================================
// Status mapping
// =============================================================================

/**
 * Map a settled per-source worker outcome to an import_runs status.
 *
 * - skipped → 'skipped'  (gated off, interval not elapsed, etc.)
 * - threw   → 'error'    (worker raised — no usable stats)
 * - errors > 0 but work was done → 'partial'
 * - otherwise → 'ok'
 *
 * `processed` is the count of items the source actually completed this tick
 * (Limitless processed, RK9 eventsTouched). It distinguishes "errored but
 * still got work done" (partial) from "errored and produced nothing".
 */
export function deriveImportRunStatus(outcome: {
  skipped?: boolean;
  threw?: boolean;
  errors: number;
  processed: number;
}): ImportRunStatus {
  if (outcome.skipped) return "skipped";
  if (outcome.threw) return "error";
  if (outcome.errors > 0) {
    // Errors but some work landed → partial; errors and nothing done → error.
    return outcome.processed > 0 ? "partial" : "error";
  }
  return "ok";
}

// =============================================================================
// Write
// =============================================================================

/**
 * Insert one import_runs row per provided record.
 *
 * The whole batch shares one `trigger` ('cron' or 'manual') — the cron route
 * and the admin action each call this once with all of their per-source
 * records. `finished_at` is stamped now() (the rows are written after the
 * workers settle) and `started_at` falls back to the column default (now()),
 * which is close enough for an observability log.
 *
 * Returns void. Insert failures are logged via console.error and otherwise
 * ignored: a broken log write must not fail an import tick that already did
 * real work. Callers do not need to await-guard this for correctness.
 */
export async function recordImportRuns(
  supabase: TypedClient,
  trigger: ImportRunTrigger,
  records: ImportRunRecord[]
): Promise<void> {
  if (records.length === 0) return;

  const finishedAt = new Date().toISOString();

  const rows: TablesInsert<"import_runs">[] = records.map((r) => ({
    source: r.source,
    trigger,
    status: r.status,
    skip_reason: r.skipReason ?? null,
    processed: r.processed,
    errors: r.errors,
    remaining: r.remaining ?? null,
    detail: r.detail ?? null,
    finished_at: finishedAt,
  }));

  const { error } = await supabase.from("import_runs").insert(rows);

  if (error) {
    // Observability never breaks the pipeline — log and move on. The import
    // work already succeeded; only the audit row failed to write.
    console.error("[import_runs] failed to record import runs:", error);
  }
}
