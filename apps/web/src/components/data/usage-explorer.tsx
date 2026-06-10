"use client";

import { useState, useTransition } from "react";
import { BarChart2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  type FormatUsageTimeseriesPoint,
  type PipelineDataResult,
  type FormatEvent,
  type SourceUsageRow,
  type ConversionRow,
} from "@trainers/supabase";

import {
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
  fetchUsageBySource,
  fetchUsageConversion,
} from "@/actions/usage";

import { DataSidebar } from "./data-sidebar";
import { DataTabs } from "./data-tabs";
import { UsagePipelineChart } from "./usage-pipeline-chart";
import { UsageLineChart } from "./usage-line-chart";
import { UsageTreemap } from "./usage-treemap";
import { UsageConversionScatter } from "./usage-conversion-scatter";
import { UsageSourceDumbbell } from "./usage-source-dumbbell";
import { UsageTopShareDumbbell } from "./usage-top-share-dumbbell";
import { UsageBumpChart } from "./usage-bump-chart";
import { groupBySource } from "./usage-series";
import {
  type UsageFilters,
  type PipelineColumn,
  type DataTab,
  type TopPct,
  coerceFormat,
  coercePeriodType,
  coerceSource,
  coerceSelectedSpecies,
  coerceRangeStart,
  coerceRangeEnd,
  coerceColumns,
  coerceMinPlayers,
  coerceTab,
  coerceTopPct,
  DEFAULT_MIN_PLAYERS,
  DEFAULT_TAB,
  DEFAULT_TOP_PCT,
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
  /** Initial source-comparison rows (seeded server-side for default params). */
  initialSourceRows?: SourceUsageRow[];
  /** Initial conversion rows (seeded server-side for default params). */
  initialConversionRows?: ConversionRow[];
}

// =============================================================================
// UsageExplorer
// =============================================================================

/**
 * Client shell for the /data Meta Explorer.
 *
 * URL state: format, source, periodType, species (comma-sep),
 * rangeStart (ISO date), rangeEnd (ISO date), tab (omitted when "overview"),
 * topPct (omitted when 0.1).
 * threshold is no longer URL-persisted — sidebar presets replace it.
 */
export function UsageExplorer({
  initialPoints,
  initialPipelineResult,
  initialEvents,
  initialFilters,
  initialSourceRows,
  initialConversionRows,
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
  const hasSpeciesParam = searchParams.has("species");
  const selectedSpecies = coerceSelectedSpecies(searchParams.get("species"));
  const rangeStart = coerceRangeStart(searchParams.get("rangeStart"));
  const rangeEnd = coerceRangeEnd(searchParams.get("rangeEnd"));
  const columns = coerceColumns(searchParams.get("columns") ?? undefined);
  const minPlayers = coerceMinPlayers(searchParams.get("minPlayers"));

  // Tab + topPct are URL-persisted for shareable links.
  const tab = coerceTab(searchParams.get("tab"));
  const topPct = coerceTopPct(searchParams.get("topPct"));

  // ── Local UI state ────────────────────────────────────────────────────────
  // bumpTopN is local-only (not shareable); plain useState per React Compiler rules.
  // Default 20 (Decision 3); control offers 8 / 12 / 20.
  // Named without underscore so the orchestrator's Task 8B mount swap is a one-liner.
  const [bumpTopN, setBumpTopN] = useState<number>(20);

  // ── Stable initial-data keys (captured at first render) ──────────────────
  const [initTimeseriesKey] = useState({
    format,
    source,
    periodType,
    rangeStart,
    rangeEnd,
    minPlayers,
  });
  const [initPipelineKey] = useState({
    format,
    source,
    periodType,
    rangeStart,
    rangeEnd,
    minPlayers,
  });
  const [initEventsFormat] = useState(format);
  const [initSourceKey] = useState({
    format,
    rangeStart,
    rangeEnd,
    minPlayers,
  });
  const [initConversionKey] = useState({
    format,
    source,
    rangeStart,
    rangeEnd,
    minPlayers,
    topPct,
  });

  const currentFilters: UsageFilters = { format, source, periodType };

  // ── URL updater ───────────────────────────────────────────────────────────
  const updateUrl = (
    // Species param has three states, signalled by nextSpecies:
    //   undefined  → leave the param untouched (unrelated change: range, columns…)
    //   "reset"    → delete the param → default preset (Top 20) for the new context
    //   string[]   → set explicitly; an empty array writes "species=" (present-empty)
    //                so the explicit "no selection" state is preserved, not snapped
    //                back to the default preset.
    nextFilters: UsageFilters,
    nextSpecies?: string[] | "reset",
    nextRangeStart?: string | null,
    nextRangeEnd?: string | null,
    nextColumns?: PipelineColumn[],
    nextMinPlayers?: number,
    nextTab?: DataTab,
    nextTopPct?: TopPct
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", nextFilters.format);
    params.set("source", nextFilters.source);
    params.set("periodType", nextFilters.periodType);
    params.delete("threshold"); // clean up any legacy threshold param

    if (nextSpecies === "reset") {
      params.delete("species");
    } else if (nextSpecies !== undefined) {
      if (nextSpecies.length > 0) {
        params.set("species", nextSpecies.join(","));
      } else {
        params.set("species", "");
      }
    }
    // nextSpecies === undefined → leave the species param exactly as-is.

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

    // Tab: omit when "overview" (the default) to keep URLs clean.
    const resolvedTab = nextTab ?? tab;
    if (resolvedTab !== DEFAULT_TAB) {
      params.set("tab", resolvedTab);
    } else {
      params.delete("tab");
    }

    // topPct: omit when 0.1 (the default) to keep URLs clean.
    const resolvedTopPct = nextTopPct ?? topPct;
    if (resolvedTopPct !== DEFAULT_TOP_PCT) {
      params.set("topPct", String(resolvedTopPct));
    } else {
      params.delete("topPct");
    }

    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleFiltersChange = (next: UsageFilters) =>
    // Changing format resets species to that format's default preset (Top 20),
    // so we delete the param rather than writing an explicit-empty selection.
    updateUrl(next, next.format !== format ? "reset" : undefined);

  const handleSelectionChange = (next: string[]) =>
    updateUrl(currentFilters, next);

  const handleRangeChange = (start: string | null, end: string | null) =>
    updateUrl(currentFilters, undefined, start, end);

  const handleColumnsChange = (next: PipelineColumn[]) =>
    updateUrl(currentFilters, undefined, undefined, undefined, next);

  const handleMinPlayersChange = (n: number) =>
    updateUrl(currentFilters, undefined, undefined, undefined, undefined, n);

  const handleTabChange = (next: DataTab) =>
    updateUrl(
      currentFilters,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      next
    );

  // ── TanStack Query — timeseries ───────────────────────────────────────────
  const isInitTimeseries =
    format === initTimeseriesKey.format &&
    source === initTimeseriesKey.source &&
    periodType === initTimeseriesKey.periodType &&
    rangeStart === initTimeseriesKey.rangeStart &&
    rangeEnd === initTimeseriesKey.rangeEnd &&
    minPlayers === initTimeseriesKey.minPlayers;

  const { data: points = [] } = useQuery<FormatUsageTimeseriesPoint[]>({
    queryKey: [
      "usage-timeseries",
      format,
      source,
      periodType,
      rangeStart,
      rangeEnd,
      minPlayers,
    ],
    queryFn: async () => {
      const result = await fetchFormatUsageTimeseries({
        format,
        source,
        periodType,
        periodStart: rangeStart ?? undefined,
        periodEnd: rangeEnd ?? undefined,
        minPlayers,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: isInitTimeseries ? initialPoints : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    // Enablement matrix (see below) — timeseries always enabled:
    // Overview treemap + Sankey and Trends line/bump/stream all reuse it;
    // pipeline also powers the sidebar species list.
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
      const result = await fetchPipelineData({
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
    // Enablement matrix — pipeline always enabled: powers the Overview treemap +
    // Sankey + sidebar species list.
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

  // ── TanStack Query — per-source usage breakdown ───────────────────────────
  //
  // Enablement matrix:
  //   timeseries  — always enabled (Overview treemap + Trends line/bump/stream + sidebar)
  //   pipeline    — always enabled (Overview treemap + Sankey + sidebar species list)
  //   conversion  — enabled when tab === "overview" || tab === "sources"
  //                 (scatter on Overview, top-share dumbbell on Sources)
  //   source      — enabled when tab === "sources" only
  //                 (source dumbbells on Sources tab)

  const isInitSource =
    format === initSourceKey.format &&
    rangeStart === initSourceKey.rangeStart &&
    rangeEnd === initSourceKey.rangeEnd &&
    minPlayers === initSourceKey.minPlayers;

  const { data: sourceRows = [] } = useQuery<SourceUsageRow[]>({
    queryKey: ["usage-by-source", format, rangeStart, rangeEnd, minPlayers],
    queryFn: async () => {
      const result = await fetchUsageBySource({
        format,
        periodStart: rangeStart ?? undefined,
        periodEnd: rangeEnd ?? undefined,
        minPlayers,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: isInitSource ? initialSourceRows : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    enabled: tab === "sources",
  });

  // ── TanStack Query — usage conversion (top-percentile penetration) ────────
  const isInitConversion =
    format === initConversionKey.format &&
    source === initConversionKey.source &&
    rangeStart === initConversionKey.rangeStart &&
    rangeEnd === initConversionKey.rangeEnd &&
    minPlayers === initConversionKey.minPlayers &&
    topPct === initConversionKey.topPct;

  const { data: conversionRows = [] } = useQuery<ConversionRow[]>({
    queryKey: [
      "usage-conversion",
      format,
      source,
      rangeStart,
      rangeEnd,
      minPlayers,
      topPct,
    ],
    queryFn: async () => {
      const result = await fetchUsageConversion({
        format,
        source,
        periodStart: rangeStart ?? undefined,
        periodEnd: rangeEnd ?? undefined,
        minPlayers,
        topPct,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: isInitConversion ? initialConversionRows : undefined,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    enabled: tab === "overview" || tab === "sources",
  });

  // ── Species selection ─────────────────────────────────────────────────────

  const allSpecies = pipelineResult?.data ?? [];

  // No species param at all → default to Top 20. An explicitly-present species
  // param (even empty, from "Clear") is honored as-is, so the empty state is
  // reachable.
  const effectiveSelected = hasSpeciesParam
    ? selectedSpecies
    : applyPreset(allSpecies, "top20");

  // Decision 5: effectiveSelected drives ONLY Trends charts (line/stream/bump).
  // Treemap, scatter, and both dumbbells receive the whole field — no effectiveSelected filter.

  const handleSpeciesClick = (species: string) => {
    const next = effectiveSelected.includes(species)
      ? effectiveSelected.filter((s) => s !== species)
      : [...effectiveSelected, species];
    updateUrl(currentFilters, next);
  };

  // ── Tab content ───────────────────────────────────────────────────────────

  const overviewContent = (
    <div className="flex flex-col gap-3 pt-3">
      <UsageTreemap data={pipelineResult?.data ?? []} />

      <UsageConversionScatter rows={conversionRows} topPct={topPct} />

      {/* Meta Pipeline (Sankey) — existing, moved from the flat layout */}
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
    </div>
  );

  const trendsContent = (
    <div className="flex flex-col gap-3 pt-3">
      {/* Usage Over Time (line chart) — existing, moved from the flat layout */}
      <div className="bg-card h-36 overflow-hidden rounded-xl shadow-sm">
        <UsageLineChart
          points={points}
          selectedSpecies={effectiveSelected}
          events={events}
          onSpeciesClick={handleSpeciesClick}
          onRangeChange={handleRangeChange}
        />
      </div>

      <UsageBumpChart
        points={points}
        topN={bumpTopN}
        onTopNChange={setBumpTopN}
        onSpeciesClick={handleSpeciesClick}
      />
    </div>
  );

  const sourcesContent = (
    <div className="flex flex-col gap-3 pt-3">
      <UsageSourceDumbbell rows={groupBySource(sourceRows)} />

      <UsageTopShareDumbbell rows={conversionRows} topPct={topPct} />
    </div>
  );

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

        {/* Tab shell */}
        <div className="px-5 pb-4">
          <DataTabs
            value={tab}
            onValueChange={handleTabChange}
            overviewContent={overviewContent}
            trendsContent={trendsContent}
            sourcesContent={sourcesContent}
          />
        </div>
      </div>
    </div>
  );
}
