import { type PipelineDataResult, type ConversionRow } from "@trainers/supabase";
import { getFormatLabel } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Back-compute an estimate of total unique players from the top conversion row.
 *
 * Total ≈ players / usagePct * 100.
 *
 * Returns null when no conversion rows are available, usagePct is 0 or
 * suspiciously large (>100), or the back-computed result looks unreliable
 * (< 10 players).
 */
function estimateTotalPlayers(rows: ConversionRow[]): number | null {
  // Use the row with the highest players count (most reliable denominator).
  const topRow = rows.reduce<ConversionRow | null>((best, row) => {
    if (best === null) return row;
    return row.players > best.players ? row : best;
  }, null);

  if (!topRow) return null;
  if (topRow.usagePct <= 0 || topRow.usagePct > 100) return null;

  const total = Math.round(topRow.players / (topRow.usagePct / 100));
  return total >= 10 ? total : null;
}

/**
 * Format a half-open ISO date range as a readable string.
 *
 * "2025-01-06" → "Jan 6" etc.
 * When start === end (day bucket), just one date.
 */
function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        d.getUTCFullYear() !== new Date().getUTCFullYear()
          ? "numeric"
          : undefined,
      timeZone: "UTC",
    });

  if (start === end) return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}

// =============================================================================
// Types
// =============================================================================

interface DataSummaryHeaderProps {
  /** Current active format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Pipeline snapshot — drives species count + date range. Null before load. */
  pipelineResult: PipelineDataResult | null;
  /** Conversion rows — used to back-compute total players. May be empty. */
  conversionRows: ConversionRow[];
  className?: string;
}

// =============================================================================
// DataSummaryHeader
// =============================================================================

/**
 * A compact context strip at the top of the /data Overview tab showing:
 *
 * - **Format** — human-readable format label.
 * - **Species** — number of species with usage data in the current period.
 * - **Players** — estimated total unique players (back-computed from conversion
 *   rows when available; omitted when unavailable).
 * - **Period** — date range of the resolved pipeline bucket.
 *
 * All data is derived from props already fetched by `UsageExplorer` — no new
 * data fetches. Fields that cannot be computed yet are omitted (no "—" noise).
 */
export function DataSummaryHeader({
  format,
  pipelineResult,
  conversionRows,
  className,
}: DataSummaryHeaderProps) {
  const speciesCount = pipelineResult?.data.length ?? null;
  const periodStart = pipelineResult?.periodStart ?? null;
  const periodEnd = pipelineResult?.periodEnd ?? null;
  const totalPlayers = estimateTotalPlayers(conversionRows);
  const formatLabel = getFormatLabel(format);

  // If we have nothing to show yet, render a minimal placeholder.
  if (!pipelineResult) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-2",
          className
        )}
      >
        <StatChip label="Format" value={formatLabel} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-1 px-5 pb-2",
        className
      )}
      aria-label="Meta snapshot summary"
    >
      <StatChip label="Format" value={formatLabel} />

      {speciesCount !== null && (
        <StatChip
          label="Species"
          value={speciesCount.toLocaleString()}
          title={`${speciesCount} species with usage data in this period`}
        />
      )}

      {totalPlayers !== null && (
        <StatChip
          label="Players"
          value={`~${totalPlayers.toLocaleString()}`}
          title={`Estimated total unique players (back-computed from top usage species)`}
        />
      )}

      {periodStart && periodEnd && (
        <StatChip
          label="Period"
          value={formatDateRange(periodStart, periodEnd)}
          title={`Data covers ${periodStart} to ${periodEnd}`}
        />
      )}
    </div>
  );
}

// =============================================================================
// StatChip — inline label+value pair
// =============================================================================

interface StatChipProps {
  label: string;
  value: string;
  title?: string;
}

/**
 * A compact inline stat — `label` in muted uppercase, `value` in normal weight.
 * Used inside `DataSummaryHeader` to show meta snapshot stats.
 */
function StatChip({ label, value, title }: StatChipProps) {
  return (
    <span
      className="flex items-baseline gap-1.5 text-xs"
      title={title}
    >
      <span className="text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-foreground tabular-nums">{value}</span>
    </span>
  );
}
