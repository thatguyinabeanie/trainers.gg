"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { type FormatUsageTimeseriesPoint } from "@trainers/supabase";

import { useIsMobile } from "@/hooks/use-mobile";

import { DataChartCard } from "./data-chart-card";
import { buildRankSeries } from "./usage-series";

// =============================================================================
// Constants
// =============================================================================

const TOP_N_OPTIONS = [8, 12, 20] as const;
type TopNOption = (typeof TOP_N_OPTIONS)[number];

/** Default top-N per spec Decision 3. */
const DEFAULT_TOP_N: TopNOption = 20;

// Sprite size for the right-end label marker.
// API-bound pixel value — recharts SVG images require explicit w/h.
const SPRITE_SIZE = 20;

// =============================================================================
// Types
// =============================================================================

export interface UsageBumpChartProps {
  /** All-species timeseries data, oldest → newest. */
  points: FormatUsageTimeseriesPoint[];
  /**
   * How many top species to show by rank in the latest bucket.
   * Owned by the parent (usage-explorer) and not URL-persisted per spec.
   */
  topN: number;
  /** Called when user changes the Top-N segmented control. */
  onTopNChange: (n: number) => void;
  /**
   * Called when user clicks a species line.
   *
   * DESIGN NOTE (Decision 5): The bump chart always draws the top-N species
   * by latest rank, regardless of the shared sidebar selection. This is
   * intentional — the bump chart shows "who is relevant now by rank", not
   * "which species the user selected". Clicking a line is a passthrough that
   * toggles the species in the shared selection (affecting line + stream
   * charts). The bump's own line set is never filtered by selection.
   */
  onSpeciesClick?: (species: string) => void;
}

// =============================================================================
// Segmented control (Top 8 / 12 / 20)
// =============================================================================

interface TopNControlProps {
  value: number;
  onChange: (n: number) => void;
}

function TopNControl({ value, onChange }: TopNControlProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5">
      {TOP_N_OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          className={
            value === n
              ? "bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-medium transition-colors"
              : "text-muted-foreground hover:text-foreground rounded px-2 py-0.5 text-xs transition-colors"
          }
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          aria-label={`Show top ${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Right-end sprite + rank labels (custom dot renderer)
// =============================================================================

interface EndLabelProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number | null;
  species?: string;
  totalPeriods?: number;
}

/**
 * Renders a Pokemon sprite + rank number at the rightmost data point of
 * each bump line. Only renders on the last period bucket.
 *
 * Uses an SVG `<image>` element for sprite rendering.
 * Sprite pixel dimensions are API-bound (SPRITE_SIZE px) — allowed exception
 * per code-style rule for API-bound pixel params.
 */
function EndLabel({
  cx = 0,
  cy = 0,
  index = 0,
  value,
  species = "",
  totalPeriods = 0,
}: EndLabelProps) {
  // Only render on the last bucket and when the value (rank) is not null.
  if (index < totalPeriods - 1) return null;
  if (value === null || value === undefined) return null;

  // Sprite URL — use simple deterministic path matching getPokemonSprite.
  // For the SVG <image> element we inline the sprite URL directly.
  const spriteUrl = `https://img.pokemondb.net/sprites/scarlet-violet/icon/${species.toLowerCase()}.png`;

  return (
    <g>
      <image
        x={cx + 4}
        y={cy - SPRITE_SIZE / 2}
        width={SPRITE_SIZE}
        height={SPRITE_SIZE}
        href={spriteUrl}
        aria-label={`${species} rank ${value}`}
      />
      <text
        x={cx + SPRITE_SIZE + 8}
        y={cy + 4}
        fontSize={9}
        fill="var(--muted-foreground)"
        dominantBaseline="middle"
      >
        #{value}
      </text>
    </g>
  );
}

// =============================================================================
// UsageBumpChart
// =============================================================================

/**
 * Bump chart — shows per-species rank trajectory over time.
 *
 * - Y-axis is inverted (rank 1 at top). Domain is [1, topN].
 * - Uses `buildRankSeries(points, topN)` from usage-series.ts.
 * - Absent periods produce null rank values → `connectNulls={false}` creates
 *   visible gaps in the line for those buckets.
 * - Color is deterministic per species via `assignColor` (inside RankSeries).
 * - A Top 8/12/20 segmented control sits in the DataChartCard actions slot.
 *
 * Selection passthrough — see `onSpeciesClick` JSDoc above.
 */
export function UsageBumpChart({
  points,
  topN,
  onTopNChange,
  onSpeciesClick,
}: UsageBumpChartProps) {
  const isMobile = useIsMobile();

  const { series, periods } = buildRankSeries(points, topN);

  // Recharts needs a flat array of objects: { period, [species]: rank | null }
  const chartData = periods.map((period, i) => {
    const row: Record<string, string | number | null> = { period };
    for (const s of series) {
      row[s.species] = s.ranks[i] ?? null;
    }
    return row;
  });

  // Fewer X-axis ticks on mobile to avoid crowding.
  const xTickInterval = isMobile ? "preserveStartEnd" : "preserveStartEnd";

  const chartHeight = isMobile ? 220 : 320;

  // Right margin needs room for sprite labels; left margin minimal (no axis numbers).
  const chartMargin = isMobile
    ? { top: 8, right: 60, bottom: 20, left: 0 }
    : { top: 8, right: 80, bottom: 20, left: 0 };

  if (points.length === 0) {
    return (
      <DataChartCard
        title="Usage Rank Over Time"
        actions={
          <TopNControl value={topN || DEFAULT_TOP_N} onChange={onTopNChange} />
        }
      >
        <div className="text-muted-foreground flex h-32 items-center justify-center px-4 py-3 text-sm">
          No usage data for this format.
        </div>
      </DataChartCard>
    );
  }

  return (
    <DataChartCard
      title="Usage Rank Over Time"
      actions={
        <TopNControl value={topN || DEFAULT_TOP_N} onChange={onTopNChange} />
      }
    >
      <div className="px-4 py-3">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData} margin={chartMargin}>
            <XAxis
              dataKey="period"
              tickFormatter={formatPeriodLabel}
              tick={{
                fontSize: isMobile ? 9 : 10,
                fill: "var(--muted-foreground)",
              }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval={xTickInterval}
            />
            {/*
             * Y-axis: reversed so rank 1 is at the top.
             * Domain [1, topN] ensures every rank position is visible.
             */}
            <YAxis
              reversed
              domain={[1, topN]}
              tickFormatter={(v: number) => `#${v}`}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                // Build a ranked list of species visible in this tooltip bucket.
                const entries = payload
                  .filter((e) => e.value !== null && e.value !== undefined)
                  .sort((a, b) => Number(a.value) - Number(b.value))
                  .slice(0, topN);

                return (
                  <div className="bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm">
                    <p className="text-muted-foreground mb-1">
                      {formatPeriodLabel(label as string)}
                    </p>
                    {entries.map((entry) => (
                      <p
                        key={entry.dataKey as string}
                        style={{ color: entry.color as string }}
                      >
                        #{entry.value} {entry.dataKey}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {series.map((s) => (
              <Line
                key={s.species}
                type="monotone"
                dataKey={s.species}
                stroke={s.color}
                strokeWidth={isMobile ? 1.5 : 2}
                strokeOpacity={1}
                dot={false}
                connectNulls={false}
                onClick={() => onSpeciesClick?.(s.species)}
                style={{ cursor: onSpeciesClick ? "pointer" : "default" }}
                // Right-end sprite + rank label
                label={(props: EndLabelProps) => (
                  <EndLabel
                    {...props}
                    species={s.species}
                    totalPeriods={periods.length}
                  />
                )}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DataChartCard>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatPeriodLabel(periodStart: string): string {
  const d = new Date(periodStart);
  if (Number.isNaN(d.getTime())) return periodStart;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
