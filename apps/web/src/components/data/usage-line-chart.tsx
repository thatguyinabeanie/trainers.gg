"use client";

import { useEffect, useRef, useState } from "react";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

import {
  buildUsageSeries,
  filterByThreshold,
  insideOutOrder,
} from "./usage-series";

// =============================================================================
// Types
// =============================================================================

/** View mode toggle — "lines" is the default; "stream" is a silhouette AreaChart. */
type ChartMode = "lines" | "stream";

/** Maximum number of series shown in stream mode (Decision 3). */
const STREAM_MAX_SERIES = 20;

interface UsageLineChartProps {
  /** All-species timeseries data, oldest → newest. */
  points: FormatUsageTimeseriesPoint[];
  /** Currently selected species. Empty = show all series. */
  selectedSpecies: string[];
  /** Events for annotation pins on X axis. */
  events: FormatEvent[];
  /** Called when user clicks a line. */
  onSpeciesClick: (species: string) => void;
  /** Called when brush selection changes. Arguments are ISO date strings. */
  onRangeChange: (start: string | null, end: string | null) => void;
}

// =============================================================================
// Lines | Stream mode toggle
// =============================================================================

interface ModeToggleProps {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
}

function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5">
      {(["lines", "stream"] as ChartMode[]).map((m) => (
        <button
          key={m}
          type="button"
          className={
            mode === m
              ? "bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs font-medium capitalize transition-colors"
              : "text-muted-foreground hover:text-foreground rounded px-2 py-0.5 text-xs capitalize transition-colors"
          }
          onClick={() => onModeChange(m)}
          aria-pressed={mode === m}
          aria-label={`${m === "lines" ? "Lines" : "Stream"} mode`}
        >
          {m === "lines" ? "Lines" : "Stream"}
        </button>
      ))}
    </div>
  );
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
  events,
  onSpeciesClick,
  onRangeChange,
}: UsageLineChartProps) {
  // Local mode state — Lines is default. Not URL-persisted (spec Decision 4).
  const [mode, setMode] = useState<ChartMode>("lines");

  // Map period points to Recharts data shape: { periodStart, [species]: pct, ... }
  const chartData = points.map((p) => ({
    periodStart: p.periodStart,
    ...p.usage,
  }));

  const allSeries = buildUsageSeries(points);
  const visibleSeries =
    selectedSpecies.length > 0
      ? allSeries.filter((s) => selectedSpecies.includes(s.species))
      : allSeries;

  // Stream mode uses insideOutOrder over the threshold-filtered series,
  // capped at STREAM_MAX_SERIES (20). The 1%-threshold filter keeps the
  // stream readable; insideOutOrder places the highest-peak series in the
  // centre for the visual wave effect.
  const streamSeries = insideOutOrder(filterByThreshold(allSeries, 1)).slice(
    0,
    STREAM_MAX_SERIES
  );

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
      {/* Panel header with mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Usage Over Time</span>
          <span className="text-muted-foreground text-xs">
            {visibleSeries.length} Pokémon
          </span>
        </div>
        <ModeToggle mode={mode} onModeChange={setMode} />
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl border p-2">
        {mode === "lines" ? (
          <LinesChart
            chartData={chartData}
            visibleSeries={visibleSeries}
            points={points}
            eventsForTick={eventsForTick}
            handleBrushChange={handleBrushChange}
            handleLineClick={handleLineClick}
          />
        ) : (
          <StreamChart
            chartData={chartData}
            streamSeries={streamSeries}
            points={points}
            eventsForTick={eventsForTick}
            handleBrushChange={handleBrushChange}
            onSpeciesClick={onSpeciesClick}
          />
        )}
      </div>

      {/* Inline legend */}
      {selectedSpecies.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {selectedSpecies.slice(0, 10).map((sp) => {
            const series = allSeries.find((s) => s.species === sp);
            return (
              <div key={sp} className="flex items-center gap-1">
                <div
                  className="h-0.5 w-3 flex-shrink-0 rounded-full"
                  style={{ background: series?.color ?? "#94a3b8" }}
                />
                <span className="text-muted-foreground text-xs">{sp}</span>
              </div>
            );
          })}
          {selectedSpecies.length > 10 && (
            <span className="text-muted-foreground text-xs">
              +{selectedSpecies.length - 10} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LinesChart — existing line mode (unchanged behavior, extracted to sub-component)
// =============================================================================

interface LinesChartProps {
  chartData: Record<string, unknown>[];
  visibleSeries: ReturnType<typeof buildUsageSeries>;
  points: FormatUsageTimeseriesPoint[];
  eventsForTick: (periodStart: string) => FormatEvent[];
  handleBrushChange: (range: {
    startIndex?: number;
    endIndex?: number;
  }) => void;
  handleLineClick: (data: unknown) => void;
}

function LinesChart({
  chartData,
  visibleSeries,
  eventsForTick,
  handleBrushChange,
  handleLineClick,
}: LinesChartProps) {
  return (
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
        {visibleSeries.map((s) => (
          <Line
            key={s.species}
            type="monotone"
            dataKey={s.species}
            stroke={s.color}
            strokeWidth={2.5}
            strokeOpacity={1}
            dot={false}
            activeDot={{ r: 3 }}
            onClick={handleLineClick}
            style={{ cursor: "pointer" }}
          />
        ))}
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
  );
}

// =============================================================================
// StreamChart — silhouette AreaChart mode
// =============================================================================

interface StreamChartProps {
  chartData: Record<string, unknown>[];
  streamSeries: ReturnType<typeof buildUsageSeries>;
  points: FormatUsageTimeseriesPoint[];
  eventsForTick: (periodStart: string) => FormatEvent[];
  handleBrushChange: (range: {
    startIndex?: number;
    endIndex?: number;
  }) => void;
  onSpeciesClick: (species: string) => void;
}

/**
 * Stream mode — recharts AreaChart with stackOffset="silhouette".
 *
 * Series are ordered via insideOutOrder() (highest-peak species in the
 * visual centre) and capped at STREAM_MAX_SERIES (20).
 *
 * The brush and selected-species legend are shared with lines mode
 * (same parent state, same onRangeChange callback).
 *
 * Tooltip shows top species by share for the hovered bucket — streams
 * read poorly without exact numbers.
 */
function StreamChart({
  chartData,
  streamSeries,
  eventsForTick,
  handleBrushChange,
  onSpeciesClick,
}: StreamChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart
        data={chartData}
        stackOffset="silhouette"
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
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={36}
          // Silhouette offsets can go negative — hide the axis ticks
          tickFormatter={() => ""}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            // Sort by raw value descending so the top species appear first.
            const sorted = [...payload]
              .filter((e) => e.value !== null && e.value !== undefined)
              .sort((a, b) => Number(b.value) - Number(a.value))
              .slice(0, 8);

            return (
              <div className="bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm">
                <p className="text-muted-foreground mb-1">
                  {formatAxisLabel(label)}
                </p>
                {sorted.map((entry) => (
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
        {streamSeries.map((s) => (
          <Area
            key={s.species}
            type="monotone"
            dataKey={s.species}
            stackId="1"
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.7}
            strokeWidth={1}
            dot={false}
            onClick={() => onSpeciesClick(s.species)}
            style={{ cursor: "pointer" }}
          />
        ))}
        <Brush
          dataKey="periodStart"
          height={20}
          stroke="var(--primary)"
          fill="var(--muted)"
          travellerWidth={6}
          onChange={handleBrushChange}
        />
      </AreaChart>
    </ResponsiveContainer>
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
