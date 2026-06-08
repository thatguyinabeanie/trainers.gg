"use client";

import { useState, useTransition } from "react";
import { BarChart2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  type FormatUsageTimeseriesPoint,
  type PipelineDataResult,
  type FormatEvent,
} from "@trainers/supabase";

import {
  fetchFormatUsageTimeseries,
  fetchDirectPipelineData,
  fetchFormatEvents,
} from "@/actions/usage";

import { DataSidebar } from "./data-sidebar";
import { UsagePipelineChart } from "./usage-pipeline-chart";
import { UsageLineChart } from "./usage-line-chart";
import {
  type UsageFilters,
  type PipelineColumn,
  coerceFormat,
  coercePeriodType,
  coerceSource,
  coerceSelectedSpecies,
  coerceRangeStart,
  coerceRangeEnd,
  coerceColumns,
  coerceMinPlayers,
  DEFAULT_MIN_PLAYERS,
  applyPreset,
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
 * URL state: format, source, periodType, species (comma-sep),
 * rangeStart (ISO date), rangeEnd (ISO date).
 * threshold is no longer URL-persisted — sidebar presets replace it.
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

  // ── URL-derived state ─────────────────────────────────────────────────────
  const format = coerceFormat(
    searchParams.get("format") ?? initialFilters.format
  );
  const source = coerceSource(
    searchParams.get("source") ?? initialFilters.source
  );
  const periodType = coercePeriodType(
    searchParams.get("periodType") ?? initialFilters.periodType
  );
  const selectedSpecies = coerceSelectedSpecies(searchParams.get("species"));
  const rangeStart = coerceRangeStart(searchParams.get("rangeStart"));
  const rangeEnd = coerceRangeEnd(searchParams.get("rangeEnd"));
  const columns = coerceColumns(searchParams.get("columns") ?? undefined);
  const minPlayers = coerceMinPlayers(searchParams.get("minPlayers"));

  const [initTimeseriesKey] = useState({ format, source, periodType });
  const [initPipelineKey] = useState({
    format,
    source,
    periodType,
    rangeStart,
    rangeEnd,
    minPlayers,
  });
  const [initEventsFormat] = useState(format);

  const currentFilters: UsageFilters = { format, source, periodType };

  // ── URL updater ───────────────────────────────────────────────────────────
  const updateUrl = (
    nextFilters: UsageFilters,
    nextSpecies?: string[],
    nextRangeStart?: string | null,
    nextRangeEnd?: string | null,
    nextColumns?: PipelineColumn[],
    nextMinPlayers?: number
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", nextFilters.format);
    params.set("source", nextFilters.source);
    params.set("periodType", nextFilters.periodType);
    params.delete("threshold"); // clean up any legacy threshold param

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

    const cols = nextColumns ?? columns;
    params.set("columns", cols.join(","));

    const mp = nextMinPlayers !== undefined ? nextMinPlayers : minPlayers;
    if (mp !== DEFAULT_MIN_PLAYERS) {
      params.set("minPlayers", String(mp));
    } else {
      params.delete("minPlayers"); // keep URLs clean at the default value
    }

    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleFiltersChange = (next: UsageFilters) =>
    updateUrl(next, next.format !== format ? [] : undefined);

  const handleSelectionChange = (next: string[]) =>
    updateUrl(currentFilters, next);

  const handleRangeChange = (start: string | null, end: string | null) =>
    updateUrl(currentFilters, undefined, start, end);

  const handleColumnsChange = (next: PipelineColumn[]) =>
    updateUrl(currentFilters, undefined, undefined, undefined, next);

  const handleMinPlayersChange = (n: number) =>
    updateUrl(currentFilters, undefined, undefined, undefined, undefined, n);

  // ── TanStack Query — timeseries ───────────────────────────────────────────
  const isInitTimeseries =
    format === initTimeseriesKey.format &&
    source === initTimeseriesKey.source &&
    periodType === initTimeseriesKey.periodType;
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
    initialData: isInitTimeseries ? initialPoints : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  // ── TanStack Query — pipeline data ────────────────────────────────────────
  const isInitPipeline =
    format === initPipelineKey.format &&
    source === initPipelineKey.source &&
    periodType === initPipelineKey.periodType &&
    rangeStart === initPipelineKey.rangeStart &&
    rangeEnd === initPipelineKey.rangeEnd &&
    minPlayers === initPipelineKey.minPlayers;
  const { data: pipelineResult = null } = useQuery<PipelineDataResult | null>({
    queryKey: [
      "pipeline-data",
      format,
      source,
      periodType,
      rangeStart,
      rangeEnd,
      minPlayers,
    ],
    queryFn: async () => {
      const result = await fetchDirectPipelineData({
        format,
        source,
        periodStart: rangeStart ?? undefined,
        periodEnd: rangeEnd ?? undefined,
        minPlayers,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: isInitPipeline ? initialPipelineResult : undefined,
    placeholderData: (prev) => prev,
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
    initialData: format === initEventsFormat ? initialEvents : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60 * 60 * 1000,
  });

  const allSpecies = pipelineResult?.data ?? [];

  // When no species are URL-selected, default to top 20 from pipeline data.
  const effectiveSelected =
    selectedSpecies.length > 0
      ? selectedSpecies
      : applyPreset(allSpecies, "top20");

  const handleSpeciesClick = (species: string) => {
    const next = effectiveSelected.includes(species)
      ? effectiveSelected.filter((s) => s !== species)
      : [...effectiveSelected, species];
    updateUrl(currentFilters, next);
  };

  return (
    <div className="flex w-full">
      {/* Sidebar */}
      <DataSidebar
        filters={currentFilters}
        allSpecies={allSpecies}
        selectedSpecies={effectiveSelected}
        columns={columns}
        minPlayers={minPlayers}
        onFiltersChange={handleFiltersChange}
        onSelectionChange={handleSelectionChange}
        onColumnsChange={handleColumnsChange}
        onMinPlayersChange={handleMinPlayersChange}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Page header */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <BarChart2 className="text-muted-foreground size-5" />
          <h1 className="text-xl font-bold tracking-tight">Data</h1>
          <span className="text-muted-foreground text-sm">
            Pokémon usage across tournaments
          </span>
        </div>

        {/* Charts */}
        <div className="flex flex-col gap-3 px-5 pb-4">
          {/* Meta Pipeline (Sankey) */}
          <div className="bg-card flex flex-col rounded-xl shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Meta Pipeline
              </span>
            </div>
            <div>
              <UsagePipelineChart
                pipelineResult={pipelineResult}
                selectedSpecies={effectiveSelected}
                columns={columns}
                onSpeciesClick={handleSpeciesClick}
              />
            </div>
          </div>

          {/* Usage Over Time (line chart) */}
          <div className="bg-card h-36 overflow-hidden rounded-xl shadow-sm">
            <UsageLineChart
              points={points}
              selectedSpecies={effectiveSelected}
              events={events}
              onSpeciesClick={handleSpeciesClick}
              onRangeChange={handleRangeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
