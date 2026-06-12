"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  useApiQuery,
  type FormatUsageRow,
  type SpeciesUsagePeriod,
} from "@trainers/supabase";
import { getActiveFormats, VGC_FORMATS } from "@trainers/pokemon";

// =============================================================================
// Constants
// =============================================================================

const SOURCE_LABELS: Record<string, string> = {
  all: "All",
  rk9: "RK9",
  limitless: "Limitless",
  "trainers.gg": "Trainers.gg",
};

const PERIOD_LABELS: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

type SourceKey = "all" | "rk9" | "limitless" | "trainers.gg";
type PeriodType = "day" | "week" | "month";

// =============================================================================
// Fetcher helpers — wrap fetch() responses into ActionResult<T> for useApiQuery
// =============================================================================

/**
 * Fetch the species ranking for a format from the /api/v1/usage/species endpoint.
 * Returns ActionResult<FormatUsageRow[]> for consumption by useApiQuery.
 */
async function fetchSpeciesUsage(
  format: string,
  source: string,
  periodType: string
) {
  const params = new URLSearchParams({ format, source, periodType });
  const res = await fetch(`/api/v1/usage/species?${params.toString()}`);
  if (!res.ok) {
    return { success: false as const, error: `HTTP ${res.status}` };
  }
  const data = (await res.json()) as FormatUsageRow[];
  return { success: true as const, data };
}

/**
 * Fetch trailing detail periods for one species from the /api/v1/usage/species/[species]/detail endpoint.
 * Returns ActionResult<SpeciesUsagePeriod[]> for consumption by useApiQuery.
 */
async function fetchSpeciesDetail(
  format: string,
  species: string,
  source: string,
  periodType: string,
  limit: number
) {
  const params = new URLSearchParams({
    format,
    source,
    periodType,
    limit: String(limit),
  });
  const encodedSpecies = encodeURIComponent(species);
  const res = await fetch(
    `/api/v1/usage/species/${encodedSpecies}/detail?${params.toString()}`
  );
  if (!res.ok) {
    return { success: false as const, error: `HTTP ${res.status}` };
  }
  const data = (await res.json()) as SpeciesUsagePeriod[];
  return { success: true as const, data };
}

// =============================================================================
// Sub-components
// =============================================================================

interface DeltaBadgeProps {
  value: number | null;
}

function DeltaBadge({ value }: DeltaBadgeProps) {
  if (value === null) {
    return <span className="text-muted-foreground tabular-nums">—</span>;
  }
  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs tabular-nums",
        value > 0 && "text-emerald-600 dark:text-emerald-400",
        value < 0 && "text-red-500 dark:text-red-400",
        value === 0 && "text-muted-foreground"
      )}
    >
      {value > 0 && <TrendingUp className="h-3 w-3" />}
      {value < 0 && <TrendingDown className="h-3 w-3" />}
      {formatted}
    </span>
  );
}

interface DetailEntryListProps {
  label: string;
  entries: { value: string; count: number; pct: number }[];
}

function DetailEntryList({ label, entries }: DetailEntryListProps) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <ul className="space-y-0.5">
        {entries.slice(0, 8).map((e) => (
          <li
            key={e.value}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="truncate">{e.value}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {e.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function UsageInspector() {
  const activeFormats = getActiveFormats();
  const defaultFormatId =
    activeFormats[0]?.id ?? VGC_FORMATS[0]?.id ?? "gen9vgc2025regg";

  const [format, setFormat] = useState(defaultFormatId);
  const [source, setSource] = useState<SourceKey>("all");
  const [periodType, setPeriodType] = useState<PeriodType>("week");
  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Query 1 — species ranking (also drives the stat strip via first-row detail)
  // ---------------------------------------------------------------------------
  const {
    data: usageRows,
    isLoading: usageLoading,
    isError: usageIsError,
    error: usageError,
  } = useApiQuery<FormatUsageRow[]>(
    ["usage", "species", format, source, periodType],
    () => fetchSpeciesUsage(format, source, periodType),
    { staleTime: 5 * 60 * 1000 } // 5 min — matches the "hours" cache profile
  );

  // ---------------------------------------------------------------------------
  // Query 2 — period/sample meta from the top species (drives the stat strip)
  // ---------------------------------------------------------------------------
  const topSpecies = usageRows?.[0]?.species ?? null;
  const {
    data: topDetail,
    isLoading: metaLoading,
    isError: metaIsError,
    error: metaError,
  } = useApiQuery<SpeciesUsagePeriod[]>(
    ["usage", "species-detail", format, source, periodType, topSpecies, 1],
    () =>
      topSpecies
        ? fetchSpeciesDetail(format, topSpecies, source, periodType, 1)
        : Promise.resolve({ success: true as const, data: [] }),
    {
      enabled: topSpecies !== null,
      staleTime: 5 * 60 * 1000,
    }
  );
  const metaBucket = topDetail?.[0] ?? null;

  // ---------------------------------------------------------------------------
  // Query 3 — species detail drill-down (only when a row is expanded)
  // ---------------------------------------------------------------------------
  const {
    data: detailPeriods,
    isLoading: detailLoading,
    isError: detailIsError,
    error: detailError,
  } = useApiQuery<SpeciesUsagePeriod[]>(
    [
      "usage",
      "species-detail",
      format,
      source,
      periodType,
      expandedSpecies,
      1,
    ],
    () =>
      expandedSpecies
        ? fetchSpeciesDetail(format, expandedSpecies, source, periodType, 1)
        : Promise.resolve({ success: true as const, data: [] }),
    {
      enabled: expandedSpecies !== null,
      staleTime: 5 * 60 * 1000,
    }
  );

  const latestDetail: SpeciesUsagePeriod | undefined = detailPeriods?.[0];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function toggleExpand(species: string) {
    setExpandedSpecies((prev) => (prev === species ? null : species));
  }

  const rows: FormatUsageRow[] = usageRows ?? [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          {/* Format */}
          <Select value={format} onValueChange={(v) => v && setFormat(v)}>
            <SelectTrigger className="h-9 w-full text-xs sm:h-8 sm:w-48">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              {activeFormats.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source */}
          <Select
            value={source}
            onValueChange={(v) => setSource(v as SourceKey)}
          >
            <SelectTrigger className="h-9 w-full text-xs sm:h-8 sm:w-48">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SOURCE_LABELS).map(([val, lbl]) => (
                <SelectItem key={val} value={val} className="text-xs">
                  {lbl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period */}
          <Select
            value={periodType}
            onValueChange={(v) => setPeriodType(v as PeriodType)}
          >
            <SelectTrigger className="h-9 w-full text-xs sm:h-8 sm:w-48">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIOD_LABELS).map(([val, lbl]) => (
                <SelectItem key={val} value={val} className="text-xs">
                  {lbl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat strip */}
      {metaLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : metaIsError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Failed to load usage stats:{" "}
            {metaError instanceof Error
              ? metaError.message
              : "Unexpected error"}
          </AlertDescription>
        </Alert>
      ) : metaBucket === null || metaBucket === undefined ? (
        <div className="bg-muted/30 rounded-lg border p-6 text-center">
          <BarChart2 className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm font-medium">
            No usage computed
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            No data for this format / source / period combination.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Sample Size</p>
            <p className="text-lg font-semibold tabular-nums">
              {metaBucket.sampleSize?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Species</p>
            <p className="text-lg font-semibold tabular-nums">
              {usageRows?.length?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Period</p>
            <p className="text-sm font-medium tabular-nums">
              {metaBucket.periodStart} → {metaBucket.periodEnd}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Top Species</p>
            <p className="text-sm font-medium">
              {usageRows?.[0]?.species ?? "—"}
            </p>
          </div>
        </div>
      )}

      {/* Species ranking table */}
      <div className="rounded-lg border">
        {/* Table header */}
        <div className="bg-muted/30 text-muted-foreground grid grid-cols-[2.5rem_1fr_6rem_6rem] gap-2 rounded-t-lg border-b px-3 py-2 text-xs font-medium">
          <span>#</span>
          <span>Species</span>
          <span className="text-right">USG %</span>
          <span className="text-right">Δ7d</span>
        </div>

        {usageLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="mx-3 my-2 h-8 rounded" />
            ))}
          </div>
        ) : usageIsError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Failed to load species rankings:{" "}
                {usageError instanceof Error
                  ? usageError.message
                  : "Unexpected error"}
              </AlertDescription>
            </Alert>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No species data for this selection.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((row) => {
              const isExpanded = expandedSpecies === row.species;
              return (
                <div key={row.species}>
                  {/* Row */}
                  <button
                    className={cn(
                      "grid w-full grid-cols-[2.5rem_1fr_6rem_6rem] items-center gap-2 px-3 py-2.5 text-left transition-colors",
                      "hover:bg-muted/40",
                      isExpanded && "bg-muted/30"
                    )}
                    onClick={() => toggleExpand(row.species)}
                    aria-expanded={isExpanded}
                  >
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {row.rank}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <ChevronDown
                        className={cn(
                          "text-muted-foreground h-3.5 w-3.5 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                      {row.species}
                    </span>
                    <span className="text-primary text-right text-sm tabular-nums">
                      {row.usagePct.toFixed(2)}%
                    </span>
                    <span className="text-right">
                      <DeltaBadge value={row.usageChange7d} />
                    </span>
                  </button>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="bg-muted/20 border-t px-4 py-4">
                      {detailLoading ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-lg" />
                          ))}
                        </div>
                      ) : detailIsError ? (
                        <Alert variant="destructive">
                          <AlertTriangle className="size-4" />
                          <AlertDescription>
                            Failed to load species detail:{" "}
                            {detailError instanceof Error
                              ? detailError.message
                              : "Unexpected error"}
                          </AlertDescription>
                        </Alert>
                      ) : !latestDetail ? (
                        <p className="text-muted-foreground text-xs">
                          No detail data available for this period.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                          <DetailEntryList
                            label="Moves"
                            entries={latestDetail.moves}
                          />
                          <DetailEntryList
                            label="Tera"
                            entries={latestDetail.tera}
                          />
                          <DetailEntryList
                            label="Items"
                            entries={latestDetail.items}
                          />
                          <DetailEntryList
                            label="Abilities"
                            entries={latestDetail.abilities}
                          />
                          <DetailEntryList
                            label="Ability + Item"
                            entries={latestDetail.abilityItems}
                          />
                          <DetailEntryList
                            label="Natures"
                            entries={latestDetail.natures}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
