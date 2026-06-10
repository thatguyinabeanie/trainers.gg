"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

import { type ConversionRow } from "@trainers/supabase";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { DataChartCard } from "./data-chart-card";
import { DataSpriteTooltip } from "./data-sprite-tooltip";
import { topPctLabel } from "./usage-filters";
import {
  median,
  classifyQuadrant,
  assignColor,
  type Quadrant,
} from "./usage-series";

// =============================================================================
// Types
// =============================================================================

interface UsageConversionScatterProps {
  /** Conversion rows from the usage-conversion RPC. */
  rows: ConversionRow[];
  /**
   * Top-percentile threshold used for the conversion axis label.
   * e.g. 0.1 → "Top 10%".
   */
  topPct: number;
  /**
   * Optional callback for species click (Phase 3 drill-down). No-op for now.
   * Defined so the orchestrator can wire it up without a signature change.
   */
  speciesHref?: (species: string) => string;
}

// =============================================================================
// ScatterDotShape
//
// Custom recharts dot shape. Renders a Pokemon sprite when the dot is large
// enough and the sprite URL resolves; falls back to a colored circle otherwise.
//
// The `w`/`h` values come from `getPokemonSprite` — they are pixel dimensions
// from the sprite API, not from our Tailwind scale, so inline style is correct.
// =============================================================================

interface DotProps {
  cx?: number;
  cy?: number;
  r?: number;
  species?: string;
  quadrant?: Quadrant;
  isMobile?: boolean;
}

function ScatterDotShape(props: DotProps) {
  const { cx = 0, cy = 0, r = 6, species = "", isMobile = false } = props;

  // On mobile, only show sprites for large-sample dots (r > threshold).
  const mobileSpriteCutoff = 8;
  const showSprite = !isMobile || r > mobileSpriteCutoff;

  if (showSprite && species) {
    const sprite = getPokemonSprite(species);
    // Sprite render: position the image centred on cx/cy.
    // Sprite w/h are API-bound pixel dimensions — inline style is intentional.
    const size = Math.max(r * 2, 20);
    return (
      <image
        href={sprite.url}
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        style={sprite.pixelated ? { imageRendering: "pixelated" } : undefined}
        aria-label={species}
      />
    );
  }

  // Fallback: colored circle keyed by species name.
  const color = assignColor(species);
  return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.85} />;
}

// =============================================================================
// Quadrant corner label positions
// =============================================================================

interface QuadrantLabel {
  label: string;
  x: string;
  y: string;
  textAnchor: "start" | "end";
  alignmentBaseline: "hanging" | "baseline";
}

const QUADRANT_LABELS: QuadrantLabel[] = [
  {
    label: "Proven meta",
    x: "98%",
    y: "2%",
    textAnchor: "end",
    alignmentBaseline: "hanging",
  },
  {
    label: "Overrated",
    x: "98%",
    y: "98%",
    textAnchor: "end",
    alignmentBaseline: "baseline",
  },
  {
    label: "Sleepers",
    x: "2%",
    y: "2%",
    textAnchor: "start",
    alignmentBaseline: "hanging",
  },
  {
    label: "Fringe",
    x: "2%",
    y: "98%",
    textAnchor: "start",
    alignmentBaseline: "baseline",
  },
];

// =============================================================================
// Tooltip content
// =============================================================================

interface ScatterTooltipPayload {
  payload?: {
    species: string;
    usagePct: number;
    conversionPct: number;
    players: number;
  };
}

function ScatterTooltipContent({
  active,
  payload,
  conversionLabel,
}: {
  active?: boolean;
  payload?: ScatterTooltipPayload[];
  conversionLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <DataSpriteTooltip
      species={d.species}
      lines={[
        { label: "Usage", value: `${d.usagePct.toFixed(1)}%` },
        {
          label: conversionLabel,
          value: `${d.conversionPct.toFixed(1)}%`,
        },
        { label: "Players", value: d.players.toLocaleString() },
      ]}
    />
  );
}

// =============================================================================
// UsageConversionScatter
// =============================================================================

/**
 * Scatter chart of usage % (x) vs. conversion % (y) for the /data Meta
 * Explorer Overview tab.
 *
 * - Drops rows where conversionPct is null — can't plot a y-coordinate.
 * - Median reference lines divide the chart into four labeled quadrants.
 * - Dot radius scales with `players` (larger = more trustworthy sample).
 * - Custom sprite dots; fallback colored circles when sprite unavailable or
 *   dot is below the mobile size threshold.
 */
export function UsageConversionScatter({
  rows,
  topPct,
  speciesHref: _speciesHref,
}: UsageConversionScatterProps) {
  // Drop rows that cannot be plotted (null y-coordinate).
  const plottable = rows.filter(
    (r): r is ConversionRow & { conversionPct: number } =>
      r.conversionPct !== null
  );

  const conversionLabel = topPctLabel(topPct);

  if (plottable.length === 0) {
    return (
      <DataChartCard
        title={`Usage vs. ${conversionLabel} conversion`}
        caption="Requires placement data"
      >
        <div className="text-muted-foreground flex h-32 items-center justify-center p-4 text-sm">
          No conversion data available for this period.
        </div>
      </DataChartCard>
    );
  }

  // Compute medians over the plotted rows for reference lines.
  const usageMedian = median(plottable.map((r) => r.usagePct));
  const conversionMedian = median(plottable.map((r) => r.conversionPct));

  // Build the scatter data shape recharts expects: flat objects with x/y/z
  // plus the extra fields we need in the tooltip and dot renderer.
  const scatterData = plottable.map((r) => ({
    x: r.usagePct,
    y: r.conversionPct,
    z: r.players,
    species: r.species,
    usagePct: r.usagePct,
    conversionPct: r.conversionPct,
    players: r.players,
    quadrant: classifyQuadrant(
      r.usagePct,
      r.conversionPct,
      usageMedian,
      conversionMedian
    ),
  }));

  return (
    <DataChartCard title={`Usage vs. ${conversionLabel} conversion`}>
      <div className="relative p-2">
        {/* Quadrant corner labels — desktop only; on a 393px-wide chart the four
            corners collapse together and collide, so hide them on mobile (the
            median reference lines still mark the quadrants). */}
        <div className="pointer-events-none absolute inset-2 z-10 hidden sm:block">
          {QUADRANT_LABELS.map((ql) => (
            <span
              key={ql.label}
              className="text-muted-foreground/50 absolute text-xs"
              style={{
                left: ql.textAnchor === "start" ? ql.x : undefined,
                right: ql.textAnchor === "end" ? ql.x : undefined,
                top: ql.alignmentBaseline === "hanging" ? ql.y : undefined,
                bottom: ql.alignmentBaseline === "baseline" ? ql.y : undefined,
              }}
            >
              {ql.label}
            </span>
          ))}
        </div>

        {/* Desktop chart: taller, sprites on all dots */}
        <div className="hidden sm:block">
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <XAxis
                type="number"
                dataKey="x"
                name="Usage"
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                label={{
                  value: "Usage %",
                  position: "insideBottom",
                  offset: -10,
                  style: { fontSize: 10, fill: "var(--muted-foreground)" },
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={conversionLabel}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={36}
                label={{
                  value: `${conversionLabel} %`,
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10, fill: "var(--muted-foreground)" },
                }}
              />
              {/* ZAxis maps players count → dot radius (8–20px range) */}
              <ZAxis type="number" dataKey="z" range={[64, 400]} />
              <ReferenceLine
                x={usageMedian}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={conversionMedian}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Tooltip
                content={({ active, payload }) => (
                  <ScatterTooltipContent
                    active={active}
                    payload={payload as unknown as ScatterTooltipPayload[]}
                    conversionLabel={conversionLabel}
                  />
                )}
                cursor={{ strokeDasharray: "3 3" }}
              />
              <Scatter
                data={scatterData}
                shape={(dotProps: unknown) => {
                  const p = dotProps as DotProps & {
                    payload?: { species: string; quadrant: Quadrant };
                  };
                  return (
                    <ScatterDotShape
                      cx={p.cx}
                      cy={p.cy}
                      r={p.r}
                      species={p.payload?.species ?? ""}
                      quadrant={p.payload?.quadrant}
                      isMobile={false}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Mobile chart: shorter, fewer ticks, sprites only on largest dots */}
        <div className="block sm:hidden">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 16, right: 8, bottom: 16, left: 0 }}>
              <XAxis
                type="number"
                dataKey="x"
                name="Usage"
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tickCount={4}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={conversionLabel}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={28}
                tickCount={4}
              />
              <ZAxis type="number" dataKey="z" range={[36, 196]} />
              <ReferenceLine
                x={usageMedian}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={conversionMedian}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Tooltip
                content={({ active, payload }) => (
                  <ScatterTooltipContent
                    active={active}
                    payload={payload as unknown as ScatterTooltipPayload[]}
                    conversionLabel={conversionLabel}
                  />
                )}
                cursor={{ strokeDasharray: "3 3" }}
              />
              <Scatter
                data={scatterData}
                shape={(dotProps: unknown) => {
                  const p = dotProps as DotProps & {
                    payload?: { species: string; quadrant: Quadrant };
                    r?: number;
                  };
                  return (
                    <ScatterDotShape
                      cx={p.cx}
                      cy={p.cy}
                      r={p.r}
                      species={p.payload?.species ?? ""}
                      quadrant={p.payload?.quadrant}
                      isMobile={true}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataChartCard>
  );
}
