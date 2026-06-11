/**
 * Monitor query for the autonomous import pipeline.
 *
 * Merges RK9 + Limitless events into a single unified event list with computed
 * display statuses. Status counts are derived from the same array so they can
 * never disagree with the rows.
 */

import type { TypedClient } from "../client";

/** The five display statuses the Monitor list filters by. */
export type DisplayStatus =
  | "queued"
  | "processing"
  | "failed"
  | "skipped"
  | "complete";

/** One row in the unified Monitor event list. */
export interface PipelineEvent {
  source: "rk9" | "limitless";
  sourceEventId: string;
  name: string;
  format: string | null;
  /** Raw per-source import_status value. */
  importStatus: string;
  displayStatus: DisplayStatus;
  playerCount: number;
  dateStart: string | null;
  /** Populated for skipped rows: why it was skipped. */
  skipReason: string | null;
}

export interface StatusCounts {
  queued: number;
  processing: number;
  failed: number;
  skipped: number;
  complete: number;
}

export interface PipelineMonitor {
  events: PipelineEvent[];
  counts: StatusCounts;
}

/**
 * Map a raw per-source import_status to the unified display status.
 *
 * RK9 statuses: pending | roster | teams | pairings | complete | failed | queued
 * Limitless statuses: queued | importing | complete | failed | skipped (string enum)
 *
 * Note: "pending" (rk9 pre-discovery) is excluded upstream before calling this.
 */
export function toDisplayStatus(
  _source: "rk9" | "limitless",
  importStatus: string
): DisplayStatus {
  if (importStatus === "queued") return "queued";
  if (importStatus === "failed") return "failed";
  if (importStatus === "skipped") return "skipped";
  if (importStatus === "complete" || importStatus === "completed")
    return "complete";
  // rk9: roster | teams | pairings ; limitless: importing — all "in progress"
  return "processing";
}

/**
 * Tally display statuses for the count chips.
 *
 * Counts and rows derive from the same array, so they can never disagree.
 */
export function computeStatusCounts(events: PipelineEvent[]): StatusCounts {
  const counts: StatusCounts = {
    queued: 0,
    processing: 0,
    failed: 0,
    skipped: 0,
    complete: 0,
  };
  for (const e of events) counts[e.displayStatus] += 1;
  return counts;
}

/**
 * Load the unified pipeline event list (RK9 + Limitless) plus status counts.
 *
 * Both sources are fetched in parallel. RK9 "pending" rows are excluded —
 * they are pre-discovery and do not map to any of the five display statuses.
 *
 * @param supabase - DI TypedClient (server/service-role client recommended —
 *   both rk9 and limitless schemas require elevated access)
 */
export async function getPipelineMonitor(
  supabase: TypedClient
): Promise<PipelineMonitor> {
  const [rk9, limitless] = await Promise.all([
    supabase
      .schema("rk9")
      .from("events")
      .select(
        "event_id, name, format_id, import_status, import_error, player_count, date_start"
      )
      .order("date_start", { ascending: false })
      .limit(500),
    supabase
      .schema("limitless")
      .from("tournaments")
      .select(
        "tournament_id, name, format_id, import_status, import_error, player_count, date"
      )
      .order("date", { ascending: false })
      .limit(500),
  ]);

  if (rk9.error)
    throw new Error(`rk9 events read failed: ${rk9.error.message}`);
  if (limitless.error)
    throw new Error(`limitless read failed: ${limitless.error.message}`);

  const events: PipelineEvent[] = [
    // Exclude "pending" — pre-discovery rows not yet in the queue
    ...(rk9.data ?? [])
      .filter((r) => r.import_status !== "pending")
      .map((r) => ({
        source: "rk9" as const,
        sourceEventId: r.event_id,
        name: r.name ?? r.event_id,
        format: r.format_id ?? null,
        importStatus: r.import_status ?? "pending",
        displayStatus: toDisplayStatus("rk9", r.import_status ?? "pending"),
        playerCount: r.player_count ?? 0,
        dateStart: r.date_start ?? null,
        skipReason: null,
      })),
    ...(limitless.data ?? []).map((r) => ({
      source: "limitless" as const,
      sourceEventId: r.tournament_id,
      name: r.name ?? r.tournament_id,
      format: r.format_id ?? null,
      importStatus: r.import_status ?? "queued",
      displayStatus: toDisplayStatus("limitless", r.import_status ?? "queued"),
      playerCount: r.player_count ?? 0,
      dateStart: r.date ?? null,
      skipReason:
        r.import_status === "skipped" ? (r.import_error ?? "skipped") : null,
    })),
  ];

  return { events, counts: computeStatusCounts(events) };
}

/**
 * Load all active tombstones (for the Config exclusions view).
 *
 * @param supabase - DI TypedClient (authenticated or service-role)
 */
export async function getImportExclusions(supabase: TypedClient) {
  const { data, error } = await supabase
    .from("import_exclusions")
    .select("id, source, source_event_id, reason, excluded_at")
    .order("excluded_at", { ascending: false });

  if (error) throw new Error(`exclusions read failed: ${error.message}`);
  return data ?? [];
}

export type ImportExclusion = NonNullable<
  Awaited<ReturnType<typeof getImportExclusions>>
>[number];
