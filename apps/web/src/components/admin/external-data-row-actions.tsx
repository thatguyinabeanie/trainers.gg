"use client";

import { CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { type UnifiedRow } from "./external-data-shared";

export interface RowActionsProps {
  row: UnifiedRow;
  queuingIds: Set<string>;
  batchQueuing: boolean;
  isUpcomingRow: boolean;
  onImport: (row: UnifiedRow) => void;
  onResetEvent: (eventId: string) => void;
}

export function RowActions({
  row,
  queuingIds,
  batchQueuing,
  isUpcomingRow,
  onImport,
  onResetEvent,
}: RowActionsProps) {
  if (row.source === "rk9" && row.rk9) {
    const event = row.rk9;
    if (isUpcomingRow) return null;

    // Per-row busy state: the row was just queued from this client. Server-side
    // progress shows through the row's own import_status via StatusBadge.
    const isBusy = queuingIds.has(event.event_id);

    const resetButton =
      event.import_status !== "pending" ? (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onResetEvent(event.event_id)}
          title="Reset roster and team data"
          aria-label="Reset event"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null;

    // Fully imported with team lists — show check + reset only
    if (event.import_status === "complete" && event.has_team_lists) {
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {resetButton}
        </div>
      );
    }

    // Show Import button for pending, failed, roster, teams, or complete-without-teams
    if (
      event.import_status === "pending" ||
      event.import_status === "failed" ||
      event.import_status === "roster" ||
      event.import_status === "teams" ||
      (event.import_status === "complete" && !event.has_team_lists)
    ) {
      return (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onImport(row)}
            disabled={isBusy}
          >
            {isBusy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Import
          </Button>
          {resetButton}
        </div>
      );
    }

    return null;
  }

  if (row.source === "limitless" && row.limitless) {
    const t = row.limitless;
    const isQueuing = queuingIds.has(t.tournament_id);

    // Gate on the unified display status (not raw import_status) so skipped /
    // unmappable rows never show an Import that would fail server-side.
    if (row.displayStatus === "pending" || row.displayStatus === "failed") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onImport(row)}
          disabled={isQueuing || batchQueuing}
        >
          {isQueuing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Import
        </Button>
      );
    }

    return null;
  }

  return null;
}
