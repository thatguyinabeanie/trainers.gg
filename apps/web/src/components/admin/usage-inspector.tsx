"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, BarChart2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { formatTimeAgo } from "@trainers/utils";
import { getActiveFormats, VGC_FORMATS } from "@trainers/pokemon";
import {
  getSpeciesUsage,
  getSpeciesUsageDetail,
  type FormatUsageRow,
  type SpeciesUsagePeriod,
} from "@trainers/supabase";

// =============================================================================
// Constants
// =============================================================================

const SOURCE_LABELS: Record<string, string> = {
  all: "All",
  rk9: "RK9",
  limitless: "Limitless",
  first_party: "First-party",
};

const PERIOD_LABELS: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

type SourceKey = "all" | "rk9" | "limitless" | "first_party";
type PeriodType = "day" | "week" | "month";

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
        "inline-flex items-center gap-0.5 tabular-nums text-xs",
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
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <ul className="space-y-0.5">
        {entries.slice(0, 8).map((e) => (
          <li
            key={e.value}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="truncate">{e.value}</span>
            <span className="text-muted-foreground tabular-nums shrink-0">
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
  // Query 1 — latest bucket meta (direct table read for stat strip)
  // ---------------------------------------------------------------------------
  const {
    data: metaBucket,
    isLoading: metaLoading,
  } = useSupabaseQuery(
    async (sb) => {
      const { data, error } = await sb
        .from("format_meta_stats")
        .select(
          "id, period_start, period_end, total_teams, total_tournaments, computed_at"
        )
        .eq("format", format)
        .eq("source", source)
        .eq("period_type", periodType)
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    [format, source, periodType]
  );

  // ---------------------------------------------------------------------------
  // Query 2 — species ranking
  // ---------------------------------------------------------------------------
  const {
    data: usageRows,
    isLoading: usageLoading,
  } = useSupabaseQuery(
    async (sb) => getSpeciesUsage(sb, { format, source, periodType }),
    [format, source, periodType]
  );

  // ---------------------------------------------------------------------------
  // Query 3 — species detail drill-down (only when a row is expanded)
  // ---------------------------------------------------------------------------
  const {
    data: detailPeriods,
    isLoading: detailLoading,
  } = useSupabaseQuery(
    async (sb): Promise<SpeciesUsagePeriod[]> => {
      if (!expandedSpecies) return [];
      return getSpeciesUsageDetail(sb, {
        format,
        species: expandedSpecies,
        source,
        periodType,
        limit: 1,
      });
    },
    [format, source, periodType, expandedSpecies]
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
            <p className="text-muted-foreground text-xs">Teams</p>
            <p className="text-lg font-semibold tabular-nums">
              {metaBucket.total_teams?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Tournaments</p>
            <p className="text-lg font-semibold tabular-nums">
              {metaBucket.total_tournaments?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Period</p>
            <p className="text-sm font-medium tabular-nums">
              {metaBucket.period_start} → {metaBucket.period_end}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Computed</p>
            <p className="text-sm font-medium">
              {metaBucket.computed_at
                ? formatTimeAgo(metaBucket.computed_at)
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Species ranking table */}
      <div className="rounded-lg border">
        {/* Table header */}
        <div className="bg-muted/30 grid grid-cols-[2.5rem_1fr_6rem_6rem] gap-2 rounded-t-lg border-b px-3 py-2 text-xs font-medium text-muted-foreground">
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
                    <span className="text-muted-foreground tabular-nums text-sm">
                      {row.rank}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                      {row.species}
                    </span>
                    <span className="text-right tabular-nums text-sm text-primary">
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
