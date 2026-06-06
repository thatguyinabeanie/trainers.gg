"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { type FormatUsageTimeseriesPoint, type PipelineDataResult, type FormatEvent } from "@trainers/supabase";

import { fetchFormatUsageTimeseries, fetchPipelineData, fetchFormatEvents } from "@/actions/usage";

import { buildUsageSeries } from "./usage-series";
import {
  UsageControls,
  type UsageFilters,
  type PeriodType,
  type UsageSource,
} from "./usage-controls";
import { UsagePipelineChart } from "./usage-pipeline-chart";
import { UsageLineChart } from "./usage-line-chart";
import {
  coerceFormat,
  coercePeriodType,
  coerceSource,
  coerceThreshold,
  coerceSelectedSpecies,
  coerceRangeStart,
  coerceRangeEnd,
} from "./usage-filters";

// =============================================================================
// Types
// =============================================================================

interface UsageExplorerProps {
  initialPoints: FormatUsageTimeseriesPoint[];
  initialPipelineResult: PipelineDataResult | null;
  initialEvents: FormatEvent[];
  initialFilters: UsageFilters;
}

// =============================================================================
// UsageExplorer
// =============================================================================

/**
 * Client shell for the /data Meta Explorer.
 *
 * URL state: format, source, periodType, threshold, species (comma-sep),
 * rangeStart (ISO date), rangeEnd (ISO date).
 *
 * Local state (ephemeral): highlight (search input substring).
 *
 * TanStack Query is keyed per (format, source, periodType) for the timeseries
 * and per (format, source, periodType, rangeStart, rangeEnd) for pipeline data.
 */
export function UsageExplorer({
  initialPoints,
  initialPipelineResult,
  initialEvents,
  initialFilters,
}: UsageExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Ephemeral search box state — dims non-matching lines in the line chart.
  // Not URL-persisted (transient UI affordance, not a shareable filter).
  const [highlight, setHighlight] = useState("");

  // ── URL-derived state ─────────────────────────────────────────────────────
  const format = coerceFormat(
    searchParams.get("format") ?? initialFilters.format
  );
  const source: UsageSource = coerceSource(
    searchParams.get("source") ?? initialFilters.source
  );
  const periodType: PeriodType = coercePeriodType(
    searchParams.get("periodType") ?? initialFilters.periodType
  );
  const threshold = coerceThreshold(
    searchParams.get("threshold") ?? String(initialFilters.threshold)
  );
  const selectedSpecies = coerceSelectedSpecies(searchParams.get("species"));
  const rangeStart = coerceRangeStart(searchParams.get("rangeStart"));
  const rangeEnd = coerceRangeEnd(searchParams.get("rangeEnd"));

  const currentFilters: UsageFilters = { format, source, periodType, threshold };

  // ── URL updater ───────────────────────────────────────────────────────────
  const updateUrl = (
    nextFilters: UsageFilters,
    nextSpecies?: string[],
    nextRangeStart?: string | null,
    nextRangeEnd?: string | null
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", nextFilters.format);
    params.set("source", nextFilters.source);
    params.set("periodType", nextFilters.periodType);
    params.set("threshold", String(nextFilters.threshold));

    const species = nextSpecies ?? selectedSpecies;
    if (species.length > 0) {
      params.set("species", species.join(","));
    } else {
      params.delete("species");
    }

    const rs = nextRangeStart !== undefined ? nextRangeStart : rangeStart;
    const re = nextRangeEnd !== undefined ? nextRangeEnd : rangeEnd;
    if (rs) params.set("rangeStart", rs);
    else params.delete("rangeStart");
    if (re) params.set("rangeEnd", re);
    else params.delete("rangeEnd");

    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleFiltersChange = (next: UsageFilters) => updateUrl(next);
  const handleSpeciesClick = (species: string) => {
    const next = selectedSpecies.includes(species)
      ? selectedSpecies.filter((s) => s !== species)
      : [...selectedSpecies, species];
    updateUrl(currentFilters, next);
  };
  const handleSelectAll = () => {
    const all = buildUsageSeries(points)
      .filter((s) => s.peak >= threshold)
      .map((s) => s.species);
    updateUrl(currentFilters, all);
  };
  const handleClearSelection = () => updateUrl(currentFilters, [], null, null);
  const handleRangeChange = (start: string | null, end: string | null) =>
    updateUrl(currentFilters, undefined, start, end);

  // ── TanStack Query — timeseries ───────────────────────────────────────────
  const { data: points = [] } = useQuery<FormatUsageTimeseriesPoint[]>({
    queryKey: ["usage-timeseries", format, source, periodType],
    queryFn: async () => {
      const result = await fetchFormatUsageTimeseries({ format, source, periodType });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: initialPoints,
    staleTime: 5 * 60 * 1000,
  });

  // ── TanStack Query — pipeline data ────────────────────────────────────────
  const { data: pipelineResult = initialPipelineResult } =
    useQuery<PipelineDataResult | null>({
      queryKey: ["pipeline-data", format, source, periodType, rangeStart, rangeEnd],
      queryFn: async () => {
        const result = await fetchPipelineData({
          format,
          source,
          periodType,
          periodStart: rangeStart ?? undefined,
          periodEnd: rangeEnd ?? undefined,
        });
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      initialData: initialPipelineResult,
      staleTime: 5 * 60 * 1000,
    });

  // ── TanStack Query — events ───────────────────────────────────────────────
  const { data: events = [] } = useQuery<FormatEvent[]>({
    queryKey: ["format-events", format],
    queryFn: async () => {
      const result = await fetchFormatEvents(format);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: initialEvents,
    staleTime: 60 * 60 * 1000, // events change rarely
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Shared controls bar */}
      <UsageControls
        filters={currentFilters}
        highlight={highlight}
        totalCount={buildUsageSeries(points).length}
        visibleCount={
          buildUsageSeries(points).filter((s) => s.peak >= threshold).length
        }
        onFiltersChange={handleFiltersChange}
        onHighlightChange={setHighlight}
      />

      {/* Panel 1: Meta Pipeline (Sankey) — hero */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Meta Pipeline</h2>
          {selectedSpecies.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {selectedSpecies.map((sp) => (
                <button
                  key={sp}
                  onClick={() => handleSpeciesClick(sp)}
                  className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs"
                >
                  {sp} ×
                </button>
              ))}
            </div>
          )}
        </div>
        <UsagePipelineChart
          pipelineResult={pipelineResult}
          selectedSpecies={selectedSpecies}
          threshold={threshold}
          onSpeciesClick={handleSpeciesClick}
        />
      </div>

      {/* Panel 2: Usage Over Time (line chart) — navigator */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <UsageLineChart
          points={points}
          selectedSpecies={selectedSpecies}
          highlight={highlight}
          threshold={threshold}
          events={events}
          onSpeciesClick={handleSpeciesClick}
          onRangeChange={handleRangeChange}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
        />
      </div>
    </div>
  );
}
