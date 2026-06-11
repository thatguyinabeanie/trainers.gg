"use client";

import { ChevronDown, History } from "lucide-react";

import { type ImportRunRow } from "@trainers/supabase";
import { formatTimeAgo } from "@trainers/utils";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// =============================================================================
// Status badge styling
// =============================================================================

/**
 * Per-status badge appearance for an import_runs row.
 * ok=emerald, partial=amber, error=red, skipped=gray, running=blue.
 */
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ok: {
    label: "OK",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  partial: {
    label: "Partial",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  error: {
    label: "Error",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  },
  skipped: {
    label: "Skipped",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
  running: {
    label: "Running",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
};

/** Human-readable source label. */
const SOURCE_LABELS: Record<string, string> = {
  limitless: "Limitless",
  rk9: "RK9",
  compile: "Compile",
};

function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_STYLES[status] ?? {
    label: status,
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  };
  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

// =============================================================================
// RecentRuns
// =============================================================================

interface RecentRunsProps {
  /** Import-run rows, newest first. Fetched by the parent (presentational). */
  runs: ImportRunRow[];
  /** Shows a skeleton placeholder while the parent is fetching. */
  loading?: boolean;
  className?: string;
}

/**
 * Compact collapsible "Recent runs" disclosure for the admin import panel.
 *
 * Purely presentational — the parent fetches `runs` (via getRecentImportRuns)
 * and passes them in, so the wiring wave controls fetch timing and caching.
 */
export function RecentRuns({ runs, loading, className }: RecentRunsProps) {
  return (
    <Collapsible className={cn("rounded-lg border", className)}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
        <span className="flex items-center gap-2">
          <History className="size-4" />
          Recent runs
          {runs.length > 0 ? (
            <span className="text-muted-foreground text-xs font-normal">
              ({runs.length})
            </span>
          ) : null}
        </span>
        <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t">
        {loading && runs.length === 0 ? (
          // Only show the skeleton on the initial load (no data yet).
          // When refreshing with existing data, keep rendering the list so the
          // header count badge and body stay in sync (the count could show "(3)"
          // while a poll-refresh flips loading=true, causing a blank/skeleton
          // body otherwise).
          <RecentRunsSkeleton />
        ) : runs.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">
            No import runs recorded yet.
          </p>
        ) : (
          <ul className="divide-y">
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {SOURCE_LABELS[run.source] ?? run.source}
                  </span>
                  <RunStatusBadge status={run.status} />
                  <span className="text-muted-foreground text-xs">
                    {run.trigger}
                  </span>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span>
                    {run.processed} processed
                    {run.errors > 0 ? (
                      <span className="text-red-600 dark:text-red-400">
                        {" "}
                        · {run.errors} errors
                      </span>
                    ) : null}
                  </span>
                  {run.skip_reason ? (
                    <span className="italic">{run.skip_reason}</span>
                  ) : null}
                  <span>{formatTimeAgo(run.started_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Pulsing skeleton rows shown while the parent fetches runs. */
function RecentRunsSkeleton() {
  return (
    <div aria-hidden className="space-y-2 px-3 py-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-muted/40 h-6 animate-pulse rounded" />
      ))}
    </div>
  );
}
