"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import {
  type SpeciesUsagePeriod,
  type UsageDetailEntry,
} from "@trainers/supabase";

import { DataChartCard } from "./data-chart-card";
import { DONUT_SLICE_COLORS } from "./data-shared";
import { BuildThisButton } from "./build-this-button";

// =============================================================================
// Types
// =============================================================================

interface SpeciesFingerprintProps {
  /** The latest period bucket from the species detail series. */
  detail: SpeciesUsagePeriod | null;
  /**
   * When true the format is a Champions format:
   * - "Nature" donut is relabelled "Stat Alignment"
   * - Tera donut is hidden (Champions has no Tera)
   */
  isChampions: boolean;
  /** Species slug — passed through to `BuildThisButton`. */
  species: string;
}

// =============================================================================
// Constants
// =============================================================================

/** How many named slices to show before collapsing the rest into "Other". */
const TOP_N_SLICES = 5;

/** How many moves to show in the top-moves bar list. */
const TOP_MOVES_COUNT = 10;

// =============================================================================
// Helpers
// =============================================================================

interface DonutSlice {
  name: string;
  pct: number;
  count: number;
}

/**
 * Convert `UsageDetailEntry[]` into at most `TOP_N_SLICES` named slices
 * plus an "Other" bucket summing the remainder.
 *
 * Entries are assumed to be sorted by pct descending (as returned by the RPC).
 */
function toSlices(entries: UsageDetailEntry[]): DonutSlice[] {
  if (entries.length === 0) return [];

  const top = entries.slice(0, TOP_N_SLICES);
  const rest = entries.slice(TOP_N_SLICES);

  const slices: DonutSlice[] = top.map((e) => ({
    name: e.value,
    pct: e.pct,
    count: e.count,
  }));

  if (rest.length > 0) {
    const otherPct = rest.reduce((sum, e) => sum + e.pct, 0);
    const otherCount = rest.reduce((sum, e) => sum + e.count, 0);
    slices.push({
      name: "Other",
      pct: Math.round(otherPct * 10) / 10,
      count: otherCount,
    });
  }

  return slices;
}

// =============================================================================
// Sub-components
// =============================================================================

interface TooltipEntry {
  payload?: DonutSlice;
}

interface DonutTooltipPassedProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

/** Custom tooltip for each donut — shows label + count + pct. */
function DonutTooltipContent({ active, payload }: DonutTooltipPassedProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry?.payload) return null;
  const slice = entry.payload;
  return (
    <div className="bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm">
      <p className="font-medium">{slice.name}</p>
      <p className="text-muted-foreground">
        {slice.count} team{slice.count !== 1 ? "s" : ""} ·{" "}
        {slice.pct.toFixed(1)}%
      </p>
    </div>
  );
}

interface DonutChartProps {
  /** Dimension label displayed above the donut. */
  title: string;
  /** Pre-processed slices (from `toSlices()`). */
  slices: DonutSlice[];
}

/**
 * Single donut chart for one dimension (item / ability / tera / nature).
 *
 * `innerRadius` and `outerRadius` are API-bound pixel values from recharts Pie —
 * the Tailwind scale cannot express fractional ring geometry.
 */
function DonutChart({ title, slices }: DonutChartProps) {
  // Modal slice = highest pct entry (first, since entries are pct-desc)
  const modal = slices[0];

  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </span>
        <div className="text-muted-foreground flex h-20 items-center text-xs">
          —
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </span>

      {/* Donut + center label */}
      <div className="relative w-full">
        <ResponsiveContainer width="100%" height={96}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="pct"
              nameKey="name"
              cx="50%"
              cy="50%"
              /* innerRadius/outerRadius are px values required by recharts Pie API —
                 cannot be expressed as Tailwind tokens */
              innerRadius={28}
              outerRadius={44}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {slices.map((slice, i) => (
                <Cell
                  key={slice.name}
                  fill={
                    slice.name === "Other"
                      ? DONUT_SLICE_COLORS[DONUT_SLICE_COLORS.length - 1]!
                      : (DONUT_SLICE_COLORS[i] ??
                        DONUT_SLICE_COLORS[DONUT_SLICE_COLORS.length - 1]!)
                  }
                />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <DonutTooltipContent
                  active={props.active}
                  payload={props.payload as TooltipEntry[] | undefined}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — modal value + pct */}
        {modal && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="max-w-14 truncate text-center text-xs leading-tight font-semibold"
              title={modal.name}
            >
              {modal.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {modal.pct.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Inline legend — top 3 named entries */}
      <div className="w-full space-y-0.5">
        {slices.slice(0, 3).map((slice, i) => (
          <div key={slice.name} className="flex items-center gap-1.5">
            <div
              className="size-2 shrink-0 rounded-sm"
              style={{
                background:
                  slice.name === "Other"
                    ? DONUT_SLICE_COLORS[DONUT_SLICE_COLORS.length - 1]
                    : (DONUT_SLICE_COLORS[i] ??
                      DONUT_SLICE_COLORS[DONUT_SLICE_COLORS.length - 1]),
              }}
            />
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {slice.name}
            </span>
            <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
              {slice.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Top-moves bar list
// =============================================================================

interface TopMovesListProps {
  moves: UsageDetailEntry[];
}

/**
 * Horizontal percentage-bar list for the top N moves.
 *
 * Uses a `bg-primary/15` track + `bg-primary` fill at `width: {pct}%`.
 * Percentage-inline style is allowed per the project rules (not a px literal).
 */
function TopMovesList({ moves }: TopMovesListProps) {
  const topMoves = moves.slice(0, TOP_MOVES_COUNT);

  if (topMoves.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No move data
      </p>
    );
  }

  // Max pct for relative bar scaling — first entry is the modal move
  const maxPct = topMoves[0]?.pct ?? 100;

  return (
    <div className="space-y-1.5">
      {topMoves.map((move) => (
        <div key={move.value} className="flex items-center gap-2">
          {/* Move name */}
          <span className="text-muted-foreground w-32 shrink-0 truncate text-xs">
            {move.value}
          </span>

          {/* Bar track */}
          <div className="bg-primary/15 relative h-2 min-w-0 flex-1 rounded-full">
            {/* Bar fill — percentage inline style (not a px literal) */}
            <div
              className="bg-primary absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${maxPct > 0 ? (move.pct / maxPct) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Pct label */}
          <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
            {move.pct.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// SpeciesFingerprint
// =============================================================================

/**
 * "Build Fingerprint" card for the per-species drill-down page.
 *
 * Shows four donuts (item / ability / tera / nature) plus a top-moves bar list,
 * all from the **latest** `SpeciesUsagePeriod` bucket. A "Build this" button
 * copies the modal set to clipboard for quick import into the team builder.
 *
 * Champions rules (when `isChampions` is true):
 * - "Nature" donut is relabelled **"Stat Alignment"** (per the nature-naming convention).
 * - Tera donut is **hidden** entirely (Champions format has no Tera Type data).
 */
export function SpeciesFingerprint({
  detail,
  isChampions,
  species,
}: SpeciesFingerprintProps) {
  // Empty / null guard
  if (!detail) {
    return (
      <DataChartCard title="Build fingerprint">
        <div className="text-muted-foreground flex min-h-32 items-center justify-center p-4 text-sm">
          No usage data yet
        </div>
      </DataChartCard>
    );
  }

  const itemSlices = toSlices(detail.items);
  const abilitySlices = toSlices(detail.abilities);
  const teraSlices = toSlices(detail.tera);
  const natureSlices = toSlices(detail.natures);

  // Champions: 3 donuts (item / ability / nature); non-Champions: 4 donuts
  // Grid adapts: 3 cols on sm when Champions, 4 cols on sm otherwise;
  // both collapse to 2 cols below sm (mobile).
  const donutGridClass = isChampions
    ? "grid grid-cols-2 gap-4 sm:grid-cols-3"
    : "grid grid-cols-2 gap-4 sm:grid-cols-4";

  return (
    <DataChartCard
      title="Build fingerprint"
      actions={<BuildThisButton species={species} detail={detail} />}
    >
      <div className="p-4 pb-3">
        {/* Donut grid */}
        <div className={donutGridClass}>
          <DonutChart title="Item" slices={itemSlices} />
          <DonutChart title="Ability" slices={abilitySlices} />
          {/* Tera donut — hidden for Champions formats */}
          {!isChampions && <DonutChart title="Tera" slices={teraSlices} />}
          {/* Nature donut — relabelled "Stat Alignment" for Champions */}
          <DonutChart
            title={isChampions ? "Stat Alignment" : "Nature"}
            slices={natureSlices}
          />
        </div>

        {/* Top moves */}
        <div className="mt-4 border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
            Top Moves
          </p>
          <TopMovesList moves={detail.moves} />
        </div>
      </div>
    </DataChartCard>
  );
}
