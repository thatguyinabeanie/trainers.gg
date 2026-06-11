"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PipelineEvent } from "@trainers/supabase/queries";

// Map unified display status → StatusBadge semantic color bucket
const DISPLAY_TO_BADGE: Record<
  string,
  "active" | "upcoming" | "draft" | "completed" | "cancelled"
> = {
  complete: "active",
  processing: "upcoming",
  queued: "draft",
  skipped: "completed",
  failed: "cancelled",
};

interface EventListProps {
  events: PipelineEvent[];
  /** Called when the user clicks Delete on a row. */
  onDelete: (e: PipelineEvent) => void;
  /** Called when the user clicks Delete & exclude on a row. */
  onExclude: (e: PipelineEvent) => void;
  /**
   * Called when the user clicks Import anyway on a skipped row.
   * Only skipped rows show this action.
   */
  onForceImport: (e: PipelineEvent) => void;
  /**
   * Composite key `${source}:${sourceEventId}` of the row whose action is
   * currently in-flight, or null when nothing is pending.
   * Busy rows have all their buttons disabled.
   */
  pendingKey: string | null;
}

/**
 * The single, filtered event list shared by every status chip.
 *
 * Skipped rows render their `skipReason` in amber and expose an
 * "Import anyway" button. Every row has Delete and Delete & exclude.
 * Actions are wired via callback props — no data-fetching here.
 */
export function EventList({
  events,
  onDelete,
  onExclude,
  onForceImport,
  pendingKey,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="bg-muted/50 text-muted-foreground rounded-lg p-6 text-center text-sm">
        No events in this status.
      </p>
    );
  }

  return (
    <ul className="divide-border divide-y">
      {events.map((e) => {
        const key = `${e.source}:${e.sourceEventId}`;
        const busy = pendingKey === key;

        return (
          <li
            key={key}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            {/* Left: name, metadata, skip reason */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={DISPLAY_TO_BADGE[e.displayStatus] ?? "completed"}
                  label={e.displayStatus}
                />
                <span className="truncate text-sm font-semibold">{e.name}</span>
              </div>

              <p className="text-muted-foreground mt-0.5 text-xs">
                {e.source} · {e.format ?? "unknown format"} · {e.playerCount}{" "}
                players · {e.dateStart ?? "—"}
              </p>

              {/* Skip reason — only present on skipped rows */}
              {e.skipReason ? (
                <p className="mt-1 text-xs font-medium text-amber-600">
                  {e.skipReason}
                </p>
              ) : null}
            </div>

            {/* Right: per-row action buttons */}
            <div className="flex shrink-0 items-center gap-2">
              {e.displayStatus === "skipped" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onForceImport(e)}
                >
                  Import anyway
                </Button>
              ) : null}

              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onDelete(e)}
              >
                Delete
              </Button>

              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onExclude(e)}
              >
                Delete &amp; exclude
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
