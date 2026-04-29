"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useIsClient } from "@/hooks/use-is-client";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  type ChannelFailureRow,
  type DmFailureRow,
  type RoleSyncFailureRow,
} from "@trainers/supabase";
import { formatTimeAgo } from "@trainers/utils";

import { retryNotificationAction } from "@/actions/discord-integration";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { FailuresCards } from "./failures-cards";
import {
  type FailureFilter,
  type UnifiedFailureRow,
  type FailuresInnerProps,
  TypeBadge,
  FilterPill,
  formatEventType,
  buildUnifiedRows,
  filterRows,
} from "./failures-shared";

// =============================================================================
// Types
// =============================================================================

interface FailuresTableProps {
  channelFailures: ChannelFailureRow[];
  dmFailures: DmFailureRow[];
  roleSyncFailures: RoleSyncFailureRow[];
  serverId: number;
}

// Re-export shared symbols so prior consumers (tests, cards) keep working.
export {
  type FailureFilter,
  type UnifiedFailureRow,
  type FailuresInnerProps,
  TypeBadge,
  FilterPill,
  formatEventType,
  buildUnifiedRows,
  filterRows,
} from "./failures-shared";

// =============================================================================
// Inner table (desktop)
// =============================================================================

function FailuresTableInner({
  visibleRows,
  retryingId,
  onRetry,
}: FailuresInnerProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Type</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>When</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.map((row) => {
          const key = `${row.kind}-${row.data.id}`;
          const isRetrying = retryingId === key;

          if (row.kind === "channel") {
            const f = row.data;
            return (
              <TableRow key={key}>
                <TableCell>
                  <TypeBadge kind="channel" />
                </TableCell>
                <TableCell>
                  <p className="font-medium">
                    {formatEventType(f.event_type)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {f.consecutive_failures} consecutive{" "}
                    {f.consecutive_failures === 1 ? "failure" : "failures"}
                  </p>
                </TableCell>
                <TableCell>
                  <code className="text-xs">#{f.channel_id}</code>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {f.last_error_reason ?? "Unknown error"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {f.last_attempt_at
                      ? formatTimeAgo(f.last_attempt_at)
                      : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(row)}
                    disabled={isRetrying}
                  >
                    {isRetrying ? "Retrying…" : "Retry"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          }

          // DM row
          const f = row.data;
          return (
            <TableRow key={key}>
              <TableCell>
                <TypeBadge kind="dm" />
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  {formatEventType(f.event_type)}
                </p>
              </TableCell>
              <TableCell>
                <code className="text-xs">@{f.discord_user_id}</code>
              </TableCell>
              <TableCell>
                <div>
                  <span className="text-muted-foreground text-sm">
                    {f.error_reason ?? "Unknown error"}
                  </span>
                  {f.delivered_via_fallback && (
                    <p className="mt-0.5 text-xs text-emerald-600">
                      ✓ Delivered via fallback channel
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-sm">
                  {formatTimeAgo(f.failed_at)}
                </span>
              </TableCell>
              <TableCell>
                {f.delivered_via_fallback ? (
                  <span className="text-muted-foreground text-sm">
                    No action
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(row)}
                    disabled={isRetrying}
                  >
                    {isRetrying ? "Retrying…" : "Retry"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// =============================================================================
// Component
// =============================================================================

export function FailuresTable({
  channelFailures,
  dmFailures,
  roleSyncFailures: _roleSyncFailures,
  serverId: _serverId,
}: FailuresTableProps) {
  const isClient = useIsClient();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<FailureFilter>("all");
  const [rows, setRows] = useState<UnifiedFailureRow[]>(
    buildUnifiedRows(channelFailures, dmFailures)
  );
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [_refreshPending, startRefreshTransition] = useTransition();

  const visibleRows = filterRows(rows, filter);
  const totalCount = rows.length;
  const channelCount = rows.filter((r) => r.kind === "channel").length;
  const dmCount = rows.filter((r) => r.kind === "dm").length;

  // ── Retry single row ──────────────────────────────────────────────────────

  async function handleRetry(row: UnifiedFailureRow) {
    const key = `${row.kind}-${row.data.id}`;
    setRetryingId(key);

    try {
      const result = await retryNotificationAction(row.data.id);

      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Queued for retry");
        // Remove from list optimistically after retry
        setRows((rs) =>
          rs.filter((r) => !(r.kind === row.kind && r.data.id === row.data.id))
        );
      }
    } finally {
      setRetryingId(null);
    }
  }

  // ── Retry all ─────────────────────────────────────────────────────────────

  function handleRetryAll() {
    startRefreshTransition(async () => {
      const retryable = filterRows(rows, filter);

      const results = await Promise.allSettled(
        retryable.map((row) => retryNotificationAction(row.data.id))
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;

      if (successCount > 0) {
        toast.success(
          `${successCount} item${successCount !== 1 ? "s" : ""} queued for retry`
        );
        const retriedIds = new Set(
          retryable.map((r) => `${r.kind}-${r.data.id}`)
        );
        setRows((rs) =>
          rs.filter((r) => !retriedIds.has(`${r.kind}-${r.data.id}`))
        );
      } else {
        toast.error("No items could be queued for retry");
      }
    });
  }

  const innerProps: FailuresInnerProps = {
    visibleRows,
    retryingId,
    onRetry: handleRetry,
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failures</CardTitle>
          <CardDescription>
            Delivery failures from the last 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            No failures in the last 24 hours.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Failures</CardTitle>
            <CardDescription>
              Delivery failures from the last 24 hours.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetryAll}
            >
              Retry all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setRows(buildUnifiedRows(channelFailures, dmFailures))
              }
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <FilterPill
            active={filter === "all"}
            label="All"
            count={totalCount}
            onClick={() => setFilter("all")}
          />
          <FilterPill
            active={filter === "channels"}
            label="Channels"
            count={channelCount}
            onClick={() => setFilter("channels")}
          />
          <FilterPill
            active={filter === "dms"}
            label="DMs"
            count={dmCount}
            onClick={() => setFilter("dms")}
          />
        </div>
      </CardHeader>
      <CardContent>
        {!isClient ? (
          <div
            aria-hidden
            className="bg-muted/30 animate-pulse rounded-lg"
            style={{ height: `${Math.max(visibleRows.length, 1) * 140 + 32}px` }}
          />
        ) : isMobile ? (
          <FailuresCards {...innerProps} />
        ) : (
          <FailuresTableInner {...innerProps} />
        )}
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Resolve persistent channel failures by re-mapping or reinstalling the
          bot. DM failures usually mean the player has DMs from server members
          turned off.
        </p>
      </CardFooter>
    </Card>
  );
}
