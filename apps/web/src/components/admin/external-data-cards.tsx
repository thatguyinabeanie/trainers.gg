import { ExternalLink } from "lucide-react";

import { formatTimeAgo } from "@trainers/utils";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { UnifiedRow } from "./external-data-shared";

export interface EventListProps {
  rows: UnifiedRow[];
  renderActions: (row: UnifiedRow) => React.ReactNode;
  onToggleExpand: (id: string) => void;
  expandedRowId: string | null;
}

const STATUS_TONE: Record<string, string> = {
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "in-progress": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  complete: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  upcoming: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
};

/** Mobile card list mirroring the desktop events table. */
export function EventList({ rows, renderActions }: EventListProps) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No events for this selection.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 font-semibold">
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              <ExternalLink className="size-3 shrink-0 opacity-60" />
            </div>
            {renderActions(row)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{row.category}</Badge>
            <span className="text-muted-foreground">
              {formatTimeAgo(row.date)}
            </span>
            {row.playerCount != null && (
              <span className="text-muted-foreground">
                · {row.playerCount} players
              </span>
            )}
            <span
              className={cn(
                "ml-auto rounded-full px-2 py-0.5 font-semibold",
                STATUS_TONE[row.status] ?? STATUS_TONE.pending
              )}
            >
              {row.statusDetail}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
