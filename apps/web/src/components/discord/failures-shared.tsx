/**
 * Shared types, helpers, and presentational sub-components used by both
 * `FailuresTable` (desktop) and `FailuresCards` (mobile). Lives in its own
 * file to avoid the cards ↔ table circular import.
 *
 * `.tsx` instead of `.ts` because `TypeBadge` and `FilterPill` contain JSX.
 */

import {
  type ChannelFailureRow,
  type DmFailureRow,
} from "@trainers/supabase";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FailureFilter = "all" | "channels" | "dms";

export type UnifiedFailureRow =
  | { kind: "channel"; data: ChannelFailureRow }
  | { kind: "dm"; data: DmFailureRow };

export interface FailuresInnerProps {
  visibleRows: UnifiedFailureRow[];
  retryingId: string | null;
  onRetry: (row: UnifiedFailureRow) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatEventType(eventType: string | null): string {
  if (!eventType) return "Unknown event";
  return eventType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function buildUnifiedRows(
  channelFailures: ChannelFailureRow[],
  dmFailures: DmFailureRow[]
): UnifiedFailureRow[] {
  const channels: UnifiedFailureRow[] = channelFailures.map((f) => ({
    kind: "channel",
    data: f,
  }));
  const dms: UnifiedFailureRow[] = dmFailures.map((f) => ({
    kind: "dm",
    data: f,
  }));
  // Sort DESC by failure timestamp so newer failures appear first regardless of
  // kind. The two row shapes carry the timestamp under different field names —
  // channel rows use `last_attempt_at` (nullable), DM rows use `failed_at`.
  // Null `last_attempt_at` falls back to "" so it sorts last.
  return [...channels, ...dms].sort((a, b) => {
    const aTime = a.kind === "channel" ? (a.data.last_attempt_at ?? "") : a.data.failed_at;
    const bTime = b.kind === "channel" ? (b.data.last_attempt_at ?? "") : b.data.failed_at;
    return bTime.localeCompare(aTime);
  });
}

export function filterRows(
  rows: UnifiedFailureRow[],
  filter: FailureFilter
): UnifiedFailureRow[] {
  if (filter === "channels") return rows.filter((r) => r.kind === "channel");
  if (filter === "dms") return rows.filter((r) => r.kind === "dm");
  return rows;
}

// ---------------------------------------------------------------------------
// Presentational sub-components (used by both layouts)
// ---------------------------------------------------------------------------

export function TypeBadge({ kind }: { kind: "channel" | "dm" }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-mono text-[10px] uppercase",
        kind === "channel"
          ? "bg-red-100 text-red-700"
          : "bg-indigo-100 text-indigo-700"
      )}
    >
      {kind === "channel" ? "CHANNEL" : "DM"}
    </Badge>
  );
}

interface FilterPillProps {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}

export function FilterPill({ active, label, count, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {label} · {count}
    </button>
  );
}
