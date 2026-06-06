"use client";

import { useEffect, useRef } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";

import {
  type FormatUsageTimeseriesPoint,
  type FormatEvent,
} from "@trainers/supabase";

import { buildUsageSeries, filterByThreshold } from "./usage-series";

// =============================================================================
// Types
// =============================================================================

interface UsageLineChartProps {
  /** All-species timeseries data, oldest → newest. */
  points: FormatUsageTimeseriesPoint[];
  /** Currently selected species. Empty = none selected (show all dimmed). */
  selectedSpecies: string[];
  /** Case-insensitive search substring; non-matching lines are dimmed. Empty = no filter. */
  highlight: string;
  /** Min usage % to show a line. */
  threshold: number;
  /** Events for annotation pins on X axis. */
  events: FormatEvent[];
  /** Called when user clicks a line. */
  onSpeciesClick: (species: string) => void;
  /** Called when brush selection changes. Arguments are ISO date strings. */
  onRangeChange: (start: string | null, end: string | null) => void;
  /** Called when "Select All" is clicked. */
  onSelectAll: () => void;
  /** Called when "Clear" is clicked. */
  onClearSelection: () => void;
}

// =============================================================================
// Custom X-axis tick with event pins
// =============================================================================

function XAxisTickWithPin({
  x,
  y,
  payload,
  events,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  events: FormatEvent[];
}) {
  const date = payload?.value;
  if (!date) return null;

  const pin = events[0]; // events is already pre-filtered to this tick by eventsForTick()
  const cx = x ?? 0;
  const cy = y ?? 0;

  return (
    <g transform={`translate(${cx},${cy})`}>
      {pin && <title>{`${pin.eventKey} · ${pin.eventDate}`}</title>}
      {pin && (
        <text y={-8} textAnchor="middle" style={{ fontSize: 11 }}>
          {pin.source === "rk9" ? "🏆" : "🌐"}
        </text>
      )}
      <text
        y={14}
        textAnchor="middle"
        style={{ fontSize: 10, fill: "var(--muted-foreground)" }}
      >
        {formatAxisLabel(date)}
      </text>
    </g>
  );
}

// =============================================================================
// UsageLineChart
// =============================================================================

export function UsageLineChart({
  points,
  selectedSpecies,
  highlight,
  threshold,
  events,
  onSpeciesClick,
  onRangeChange,
  onSelectAll,
  onClearSelection,
}: UsageLineChartProps) {
  // Map period points to Recharts data shape: { periodStart, [species]: pct, ... }
  const chartData = points.map((p) => ({
    periodStart: p.periodStart,
    ...p.usage,
  }));

  const allSeries = buildUsageSeries(points);
  const visibleSeries = filterByThreshold(allSeries, threshold);

  const rangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the debounce timer on unmount to prevent calling onRangeChange
  // after the component has been torn down.
  useEffect(() => {
    return () => {
      if (rangeTimer.current) {
        clearTimeout(rangeTimer.current);
        rangeTimer.current = null;
      }
    };
  }, []);

  const handleBrushChange = (range: {
    startIndex?: number;
    endIndex?: number;
  }) => {
    const start =
      range.startIndex !== undefined
        ? (points[range.startIndex]?.periodStart ?? null)
        : null;
    const end =
      range.endIndex !== undefined
        ? (points[range.endIndex]?.periodEnd ?? null)
        : null;
    if (rangeTimer.current) clearTimeout(rangeTimer.current);
    rangeTimer.current = setTimeout(() => onRangeChange(start, end), 250);
  };

  const handleLineClick = (data: unknown) => {
    // Recharts line onClick gives us the dataKey (species name)
    if (data && typeof data === "object" && "dataKey" in data) {
      onSpeciesClick(data.dataKey as string);
    }
  };

  // Events that fall within the visible time range
  const visibleEvents = events.filter((e) =>
    points.some(
      (p) => p.periodStart <= e.eventDate && e.eventDate <= p.periodEnd
    )
  );

  // Events mapped to the closest period start for X-axis tick rendering
  const eventsForTick = (periodStart: string) =>
    visibleEvents.filter((e) => {
      const closest = points.reduce((best, p) => {
        const d = Math.abs(
          new Date(p.periodStart).getTime() - new Date(e.eventDate).getTime()
        );
        const bd = Math.abs(
          new Date(best.periodStart).getTime() - new Date(e.eventDate).getTime()
        );
        return d < bd ? p : best;
      });
      return closest.periodStart === periodStart;
    });

  if (points.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        No usage data for this format.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Usage Over Time</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {visibleSeries.length} Pokémon
          </span>
          <button
            onClick={onSelectAll}
            className="text-primary text-xs hover:underline"
          >
            Select All
          </button>
          <button
            onClick={onClearSelection}
            className="text-muted-foreground text-xs hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl border p-2">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 16, bottom: 20, left: 0 }}
          >
            <XAxis
              dataKey="periodStart"
              tick={(props) => (
                <XAxisTickWithPin
                  {...props}
                  events={eventsForTick(props.payload?.value ?? "")}
                />
              )}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm">
                    <p className="text-muted-foreground mb-1">
                      {formatAxisLabel(label)}
                    </p>
                    {payload.slice(0, 8).map((entry) => (
                      <p
                        key={entry.dataKey as string}
                        style={{ color: entry.color as string }}
                      >
                        {entry.dataKey}: {Number(entry.value).toFixed(1)}%
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {visibleSeries.map((s) => {
              // A line is "active" (highlighted) when it passes BOTH the
              // selection filter and the search filter. Inactive lines dim.
              const matchesHighlight =
                !highlight ||
                s.species.toLowerCase().includes(highlight.toLowerCase());
              const isActive =
                (selectedSpecies.length === 0 ||
                  selectedSpecies.includes(s.species)) &&
                matchesHighlight;
              return (
                <Line
                  key={s.species}
                  type="monotone"
                  dataKey={s.species}
                  stroke={isActive ? s.color : "var(--muted)"}
                  strokeWidth={isActive ? 2.5 : 1}
                  strokeOpacity={isActive ? 1 : 0.3}
                  dot={false}
                  activeDot={isActive ? { r: 3 } : false}
                  onClick={handleLineClick}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
            <Brush
              dataKey="periodStart"
              height={20}
              stroke="var(--primary)"
              fill="var(--muted)"
              travellerWidth={6}
              onChange={handleBrushChange}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend strip */}
      {selectedSpecies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedSpecies.map((sp) => {
            const s = allSeries.find((x) => x.species === sp);
            return (
              <span
                key={sp}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: s?.color ?? "var(--muted)",
                  color: "white",
                }}
              >
                {sp}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatAxisLabel(periodStart: string): string {
  const d = new Date(periodStart);
  if (Number.isNaN(d.getTime())) return periodStart;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
