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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// =============================================================================
// Types
// =============================================================================

export type ChartMode = "stream" | "stacked" | "lines";
export type PeriodType = "day" | "week" | "month";
export type UsageSource = "all" | "rk9" | "limitless" | "first_party";

export interface UsageFilters {
  format: string;
  source: UsageSource;
  periodType: PeriodType;
  threshold: number;
}

interface UsageControlsProps {
  filters: UsageFilters;
  mode: ChartMode;
  highlight: string;
  totalCount: number;
  visibleCount: number;
  onFiltersChange: (filters: UsageFilters) => void;
  onModeChange: (mode: ChartMode) => void;
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
  "first_party": "trainers.gg",
};

// =============================================================================
// UsageControls
// =============================================================================

export function UsageControls({
  filters,
  mode,
  highlight,
  totalCount,
  visibleCount,
  onFiltersChange,
  onModeChange,
  onHighlightChange,
}: UsageControlsProps) {
  const formats = getActiveFormats();

  return (
    <div className="bg-muted/40 flex flex-col flex-wrap gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Highlight search */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Highlight
        </span>
        <Input
          placeholder="Type a Pokemon..."
          value={highlight}
          onChange={(e) => onHighlightChange(e.target.value)}
          className="h-8 w-full sm:w-48"
          aria-label="Highlight a Pokemon by name"
        />
      </div>

      {/* Min usage slider */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Min usage
        </span>
        <div className="flex items-center gap-2">
          <Slider
            min={0}
            max={10}
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

      {/* Chart type */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Chart type
        </span>
        <Tabs
          value={mode}
          onValueChange={(v) => onModeChange(v as ChartMode)}
        >
          <TabsList>
            <TabsTrigger value="stream">Stream</TabsTrigger>
            <TabsTrigger value="stacked">Stacked</TabsTrigger>
            <TabsTrigger value="lines">Lines</TabsTrigger>
          </TabsList>
        </Tabs>
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
            {(
              ["all", "rk9", "limitless", "first_party"] as UsageSource[]
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Format */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Format
        </span>
        <Select
          value={filters.format}
          onValueChange={(v) =>
            v && onFiltersChange({ ...filters, format: v })
          }
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

      {/* Readout */}
      <div className="text-muted-foreground ml-auto text-xs font-semibold sm:text-right">
        <span className="text-foreground font-bold">{visibleCount}</span> of{" "}
        {totalCount} Pokemon &ge;{filters.threshold}% usage
      </div>
    </div>
  );
}
