"use client";

import { formatTimeAgo } from "@trainers/utils";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  TypeBadge,
  formatEventType,
  type FailuresInnerProps,
  type UnifiedFailureRow,
} from "./failures-table";

// =============================================================================
// FailureCard (per-row)
// =============================================================================

interface FailureCardProps {
  row: UnifiedFailureRow;
  isRetrying: boolean;
  onRetry: (row: UnifiedFailureRow) => void;
}

function FailureCard({ row, isRetrying, onRetry }: FailureCardProps) {
  if (row.kind === "channel") {
    const f = row.data;
    return (
      <div className="ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1">
        {/* Type badge + timestamp */}
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
          <TypeBadge kind="channel" />
          <span className="text-muted-foreground text-xs">
            {f.last_attempt_at ? formatTimeAgo(f.last_attempt_at) : "—"}
          </span>
        </div>

        {/* Event name */}
        <p className="px-3 py-1 font-medium">
          {formatEventType(f.event_type)}
        </p>

        {/* Target */}
        <p className="text-muted-foreground px-3 pb-1 text-xs">
          Target: <code className="text-foreground">#{f.channel_id}</code>
        </p>

        {/* Error reason */}
        <p className="text-muted-foreground line-clamp-2 px-3 pb-1 text-xs">
          {f.last_error_reason ?? "Unknown error"}
        </p>

        {/* Consecutive failures */}
        <p className="text-muted-foreground px-3 pb-2 text-xs">
          {f.consecutive_failures} consecutive{" "}
          {f.consecutive_failures === 1 ? "failure" : "failures"}
        </p>

        {/* Actions */}
        <div className="border-t px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onRetry(row)}
            disabled={isRetrying}
          >
            {isRetrying ? "Retrying…" : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  // DM row
  const f = row.data;
  return (
    <div className="ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1">
      {/* Type badge + timestamp */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
        <TypeBadge kind="dm" />
        <span className="text-muted-foreground text-xs">
          {formatTimeAgo(f.failed_at)}
        </span>
      </div>

      {/* Event name */}
      <p className="px-3 py-1 font-medium">
        {formatEventType(f.event_type)}
      </p>

      {/* Target */}
      <p className="text-muted-foreground px-3 pb-1 text-xs">
        Target: <code className="text-foreground">@{f.discord_user_id}</code>
      </p>

      {/* Error reason */}
      <p className="text-muted-foreground line-clamp-2 px-3 pb-1 text-xs">
        {f.error_reason ?? "Unknown error"}
      </p>

      {/* Fallback note */}
      {f.delivered_via_fallback && (
        <p className="px-3 pb-2 text-xs text-emerald-600">
          ✓ Delivered via fallback channel
        </p>
      )}

      {/* Actions */}
      <div className="border-t px-3 py-2">
        {f.delivered_via_fallback ? (
          <span className="text-muted-foreground text-sm">No action</span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onRetry(row)}
            disabled={isRetrying}
          >
            {isRetrying ? "Retrying…" : "Retry"}
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// FailuresCards
// =============================================================================

export function FailuresCards({
  visibleRows,
  retryingId,
  onRetry,
}: FailuresInnerProps) {
  return (
    <div className={cn("flex flex-col gap-2")}>
      {visibleRows.map((row) => {
        const key = `${row.kind}-${row.data.id}`;
        const isRetrying = retryingId === key;
        return (
          <FailureCard
            key={key}
            row={row}
            isRetrying={isRetrying}
            onRetry={onRetry}
          />
        );
      })}
    </div>
  );
}
