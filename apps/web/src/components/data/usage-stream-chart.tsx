"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

import { type UsageSeries } from "./usage-series";

// =============================================================================
// Types
// =============================================================================

interface UsageStreamChartProps {
  series: UsageSeries[];
  periods: { periodStart: string }[];
  mode: "stream" | "stacked" | "lines";
  /** Substring filter — dims series that don't match (case-insensitive). */
  highlight: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format a period start ISO string into a short label for the X axis.
 *
 * For "day" buckets we expect strings like "2025-04-12". For week/month the
 * date portion is the same structure. We extract the MM/DD portion and trim
 * leading zero from the month to produce labels like "Apr 12" or "May 3".
 */
function formatPeriodLabel(periodStart: string): string {
  const date = new Date(periodStart);
  if (Number.isNaN(date.getTime())) return periodStart;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// =============================================================================
// UsageStreamChart
// =============================================================================

export function UsageStreamChart({
  series,
  periods,
  mode,
  highlight,
}: UsageStreamChartProps) {
  if (series.length === 0 || periods.length === 0) {
    return (
      <div className="text-muted-foreground flex h-96 items-center justify-center text-sm">
        No usage data available for this format and period.
      </div>
    );
  }

  // Build one row per period: { period: label, [species]: value, ... }
  const data = periods.map((p, i) => {
    const row: Record<string, string | number> = {
      period: formatPeriodLabel(p.periodStart),
    };
    for (const s of series) {
      row[s.species] = s.values[i] ?? 0;
    }
    return row;
  });

  const hlLower = highlight.toLowerCase();

  // When highlight is active, compute which series match.
  const isHighlighted = (species: string) =>
    !highlight || species.toLowerCase().includes(hlLower);

  const getOpacity = (species: string) =>
    highlight && !isHighlighted(species) ? 0.08 : 0.85;

  const getStrokeOpacity = (species: string) =>
    highlight && !isHighlighted(species) ? 0.06 : 1;

  if (mode === "lines") {
    return (
      <div
        className={cn("h-96 w-full")}
        role="img"
        aria-label="Pokemon usage over time — line chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}%`,
                name,
              ]}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            {series.map((s) => (
              <Line
                key={s.species}
                type="monotone"
                dataKey={s.species}
                stroke={s.color}
                strokeWidth={isHighlighted(s.species) ? 2 : 1}
                strokeOpacity={getStrokeOpacity(s.species)}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Both "stream" (silhouette) and "stacked" (expand) use AreaChart.
  const stackOffset = mode === "stream" ? "silhouette" : "expand";

  return (
    <div
      className={cn("h-96 w-full")}
      role="img"
      aria-label={`Pokemon usage over time — ${mode} chart`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          stackOffset={stackOffset}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
        >
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          {/* Y axis hidden for stream; shown with % for stacked */}
          {mode === "stacked" && (
            <YAxis
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
          )}
          <Tooltip
            formatter={(value: number, name: string) => [
              mode === "stacked"
                ? `${(value * 100).toFixed(1)}%`
                : `${(value as number).toFixed(1)}%`,
              name,
            ]}
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: 12,
            }}
          />
          {series.map((s) => (
            <Area
              key={s.species}
              type="monotone"
              dataKey={s.species}
              stackId="u"
              stroke={s.color}
              fill={s.color}
              fillOpacity={getOpacity(s.species)}
              strokeOpacity={getStrokeOpacity(s.species)}
              strokeWidth={0.5}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
