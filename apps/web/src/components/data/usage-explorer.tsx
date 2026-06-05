"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { type FormatUsageTimeseriesPoint } from "@trainers/supabase";

import { fetchFormatUsageTimeseries } from "@/actions/usage";

import {
  buildUsageSeries,
  filterByThreshold,
  insideOutOrder,
} from "./usage-series";
import {
  UsageControls,
  type ChartMode,
  type PeriodType,
  type UsageFilters,
  type UsageSource,
} from "./usage-controls";
import { UsageStreamChart } from "./usage-stream-chart";

// =============================================================================
// Types
// =============================================================================

interface UsageExplorerProps {
  initialPoints: FormatUsageTimeseriesPoint[];
  initialFilters: UsageFilters;
}

// =============================================================================
// UsageExplorer
// =============================================================================

/**
 * Client shell for the /data page.
 *
 * - Filter state (format, source, periodType, threshold) lives in the URL so
 *   deep links work and the browser back button restores the view.
 * - Chart mode (stream/stacked/lines) also lives in the URL.
 * - Highlight (search) is local state — it's ephemeral and not shareable.
 * - TanStack Query is keyed on [format, source, periodType] and receives the
 *   server-rendered initialData so there is no waterfall on first load.
 */
export function UsageExplorer({
  initialPoints,
  initialFilters,
}: UsageExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ---- Local state (not in URL) -------------------------------------------
  const [highlight, setHighlight] = useState("");

  // ---- URL-derived state ---------------------------------------------------
  const format =
    searchParams.get("format") ?? initialFilters.format;
  const source = (searchParams.get("source") as UsageSource) ?? initialFilters.source;
  const periodType =
    (searchParams.get("periodType") as PeriodType) ?? initialFilters.periodType;
  const threshold = parseFloat(
    searchParams.get("threshold") ?? String(initialFilters.threshold)
  );
  const safeThreshold = Number.isNaN(threshold) ? initialFilters.threshold : threshold;
  const mode =
    (searchParams.get("mode") as ChartMode) ?? "stream";

  const currentFilters: UsageFilters = {
    format,
    source,
    periodType,
    threshold: safeThreshold,
  };

  // ---- URL updater ---------------------------------------------------------
  const updateUrl = (
    nextFilters: UsageFilters,
    nextMode?: ChartMode
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", nextFilters.format);
    params.set("source", nextFilters.source);
    params.set("periodType", nextFilters.periodType);
    params.set("threshold", String(nextFilters.threshold));
    params.set("mode", nextMode ?? mode);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleFiltersChange = (next: UsageFilters) => updateUrl(next, mode);
  const handleModeChange = (next: ChartMode) => updateUrl(currentFilters, next);

  // ---- TanStack Query -------------------------------------------------------
  const { data: points = [] } = useQuery<FormatUsageTimeseriesPoint[]>({
    queryKey: ["usage-timeseries", format, source, periodType],
    queryFn: async () => {
      const result = await fetchFormatUsageTimeseries({
        format,
        source,
        periodType,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: initialPoints,
    staleTime: 5 * 60 * 1000, // 5 minutes — backed by 1h server cache
  });

  // ---- Derive series -------------------------------------------------------
  const allSeries = buildUsageSeries(points);
  const filteredSeries = filterByThreshold(allSeries, safeThreshold);
  // For stream/stacked, use inside-out ordering; lines just use peak-desc.
  const orderedSeries =
    mode === "lines" ? filteredSeries : insideOutOrder(filteredSeries);

  return (
    <div className="space-y-3">
      <UsageControls
        filters={currentFilters}
        mode={mode}
        highlight={highlight}
        totalCount={allSeries.length}
        visibleCount={filteredSeries.length}
        onFiltersChange={handleFiltersChange}
        onModeChange={handleModeChange}
        onHighlightChange={setHighlight}
      />

      <div className="bg-card rounded-2xl p-3 shadow-sm sm:p-4">
        <UsageStreamChart
          series={orderedSeries}
          periods={points}
          mode={mode}
          highlight={highlight}
        />
      </div>

      <p className="text-muted-foreground px-1 text-xs">
        Default hides Pokemon under{" "}
        <strong className="text-foreground">1%</strong> usage — drag the slider
        to include more or fewer. Type a name to{" "}
        <strong className="text-foreground">highlight</strong> its band.{" "}
        <strong className="text-foreground">Stacked</strong> shows cumulative
        share; <strong className="text-foreground">Lines</strong> shows exact
        trajectories. Hover for a tooltip.
      </p>
    </div>
  );
}
