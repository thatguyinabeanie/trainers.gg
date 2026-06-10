"use client";

import { type FormatEvent, type SpeciesUsagePeriod } from "@trainers/supabase";

import { DataChartCard } from "./data-chart-card";
import { detailBucketsToTimeseriesPoints } from "./usage-series";
import { UsageLineChart } from "./usage-line-chart";

// =============================================================================
// Types
// =============================================================================

interface SpeciesTimelineProps {
  /** Trailing period buckets for this species, ordered oldest → newest. */
  detail: SpeciesUsagePeriod[];
  /** The species slug — used to key the usage map passed to UsageLineChart. */
  species: string;
  /** Format-level events for annotation pins on the X axis. */
  events: FormatEvent[];
}

// =============================================================================
// SpeciesTimeline
// =============================================================================

/**
 * Single-species usage timeline card.
 *
 * Adapts the species' `SpeciesUsagePeriod[]` buckets into the
 * `FormatUsageTimeseriesPoint[]` shape that `UsageLineChart` consumes,
 * then renders one line scoped to this species with format event pins.
 *
 * Reuses `UsageLineChart` unchanged via the `detailBucketsToTimeseriesPoints`
 * adapter from `usage-series.ts`.
 *
 * The `onSpeciesClick` and `onRangeChange` handlers are intentional no-ops:
 * the drill-down page has no brush-driven URL range (the /data overview owns
 * that; the drilldown scope is already fixed to one species), and clicking
 * the single line would navigate to itself, which is a no-op by design
 * (per phase3-plan.md Task 8 — "drill-down has no brush-driven URL range").
 */
export function SpeciesTimeline({
  detail,
  species,
  events,
}: SpeciesTimelineProps) {
  // Convert the species' detail buckets into the single-series timeseries
  // shape UsageLineChart expects.
  const points = detailBucketsToTimeseriesPoints(detail, species);

  if (detail.length === 0) {
    return (
      <DataChartCard title="Usage Over Time">
        <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          No usage timeline data available.
        </div>
      </DataChartCard>
    );
  }

  return (
    <DataChartCard title="Usage Over Time">
      <div className="p-2">
        <UsageLineChart
          points={points}
          events={events}
          // Pin this single species as the selected series so UsageLineChart
          // renders exactly one line scoped to this species.
          selectedSpecies={[species]}
          // No-op: clicking the line would navigate to the same species page.
          // The drill-down scope is already fixed to one species.
          onSpeciesClick={() => undefined}
          // No-op: the drill-down has no brush-driven URL range (intentional
          // per phase3-plan.md Task 8 — the /data overview owns brush navigation;
          // the drill-down shows a fixed single-species view).
          onRangeChange={() => undefined}
        />
      </div>
    </DataChartCard>
  );
}
