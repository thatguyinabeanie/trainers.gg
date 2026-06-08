"use client";

import { getActiveFormats } from "@trainers/pokemon";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =============================================================================
// Types
// =============================================================================

export type PeriodType = "day" | "week" | "month";
export type UsageSource = "all" | "rk9" | "limitless" | "trainers.gg";

export interface UsageFilters {
  format: string;
  source: UsageSource;
  periodType: PeriodType;
  threshold: number;
}

interface UsageControlsProps {
  filters: UsageFilters;
  highlight: string;
  totalCount: number;
  visibleCount: number;
  onFiltersChange: (filters: UsageFilters) => void;
  onHighlightChange: (highlight: string) => void;
}

// =============================================================================
// Label maps
// =============================================================================

const PERIOD_LABELS: Record<PeriodType, string> = {
  day: "Event",
  week: "Week",
  month: "Month",
};

const SOURCE_LABELS: Record<UsageSource, string> = {
  all: "All Sources",
  rk9: "RK9",
  limitless: "Limitless",
  "trainers.gg": "trainers.gg",
};

// =============================================================================
// UsageControls
// =============================================================================

export function UsageControls({
  filters,
  highlight,
  totalCount,
  visibleCount,
  onFiltersChange,
  onHighlightChange,
}: UsageControlsProps) {
  const formats = getActiveFormats();

  return (
    <div className="bg-muted/40 flex flex-col flex-wrap gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Format */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Format
        </span>
        <Select
          value={filters.format}
          onValueChange={(v) => v && onFiltersChange({ ...filters, format: v })}
        >
          <SelectTrigger className="h-8 w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formats.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Source */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Source
        </span>
        <Select
          value={filters.source}
          onValueChange={(v) =>
            v && onFiltersChange({ ...filters, source: v as UsageSource })
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["all", "rk9", "limitless", "trainers.gg"] as UsageSource[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Granularity */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Granularity
        </span>
        <Select
          value={filters.periodType}
          onValueChange={(v) =>
            v && onFiltersChange({ ...filters, periodType: v as PeriodType })
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["day", "week", "month"] as PeriodType[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min usage slider */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Min usage
        </span>
        <div className="flex items-center gap-2">
          <Slider
            min={1}
            max={20}
            step={0.5}
            value={filters.threshold}
            onValueChange={(vals) => {
              const next = Array.isArray(vals) ? vals[0] : vals;
              if (next !== undefined) {
                onFiltersChange({ ...filters, threshold: next });
              }
            }}
            aria-label="Minimum usage threshold"
            className="w-32 sm:w-36"
          />
          <span className="text-primary min-w-8 text-sm font-bold">
            {filters.threshold}%
          </span>
        </div>
      </div>

      {/* Species search */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Search
        </span>
        <Input
          placeholder="Search Pokémon..."
          value={highlight}
          onChange={(e) => onHighlightChange(e.target.value)}
          className="h-8 w-full sm:w-44"
          aria-label="Search for a Pokemon by name"
        />
      </div>

      {/* Readout */}
      <div className="text-muted-foreground ml-auto text-xs font-semibold sm:text-right">
        <span className="text-foreground font-bold">{visibleCount}</span> of{" "}
        {totalCount} Pokémon &ge;{filters.threshold}%
      </div>
    </div>
  );
}
