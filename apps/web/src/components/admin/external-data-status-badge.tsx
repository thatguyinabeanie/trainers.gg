"use client";

import {
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { type UnifiedRow } from "./external-data-shared";

interface StatusBadgeProps {
  row: UnifiedRow;
}

export function StatusBadge({ row }: StatusBadgeProps) {
  // Rows waiting in the import queue but not yet actively importing — muted
  // amber tone with a hourglass icon to distinguish from the spinner used for
  // actively-running imports.
  if (row.displayStatus === "queued") {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
      >
        <Hourglass className="mr-1 h-3 w-3" />
        Queued
      </Badge>
    );
  }

  // Limitless rows whose format can't be imported (e.g. CUSTOM) — surfaced as a
  // distinct "Skipped" status rather than the default "Pending". Keyed off the
  // derived displayStatus so it matches the Skipped tab/chip.
  if (row.displayStatus === "skipped") {
    return (
      <Badge
        variant="outline"
        className="text-xs text-slate-600 dark:text-slate-400"
      >
        <span className="mr-1" aria-hidden>
          ⊘
        </span>
        Skipped
      </Badge>
    );
  }

  switch (row.status) {
    case "upcoming":
      return (
        <Badge variant="outline" className="text-xs text-blue-600">
          <Clock className="mr-1 h-3 w-3" />
          Upcoming
        </Badge>
      );
    case "complete":
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {row.source === "limitless" ? "Imported" : "Complete"}
        </Badge>
      );
    case "in-progress":
      if (row.limitless?.import_status === "importing") {
        return (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-xs text-blue-700 dark:text-blue-400"
          >
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Importing
          </Badge>
        );
      }
      // RK9 in-progress states
      if (row.rk9?.import_status === "roster") {
        return (
          <Badge variant="secondary" className="text-xs">
            <Users className="mr-1 h-3 w-3" />
            Roster ready
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="mr-1 h-3 w-3" />
          Teams partial
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
          {row.limitless?.import_attempts
            ? ` (${row.limitless.import_attempts}x)`
            : ""}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          Pending
        </Badge>
      );
  }
}
