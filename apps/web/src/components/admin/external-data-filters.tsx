"use client";

import { useState } from "react";
import { ListFilter, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import {
  INITIAL_IMPORT_FILTERS,
  type HasDataFilter,
  type ImportFilterState,
  type PlatformFilter,
} from "./external-data-shared";

export interface ExternalDataFiltersProps {
  filters: ImportFilterState;
  onChange: (patch: Partial<ImportFilterState>) => void;
  onClear: () => void;
  /** Distinct country values from RK9 rows */
  countryOptions?: string[];
  /** Distinct format/regulation codes from all rows */
  formatOptions?: string[];
  resultCount: number;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Active-chip helpers
// ---------------------------------------------------------------------------

interface FilterChip {
  label: string;
  onRemove: () => void;
}

function buildChips(
  filters: ImportFilterState,
  onChange: (patch: Partial<ImportFilterState>) => void
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.source !== INITIAL_IMPORT_FILTERS.source)
    chips.push({
      label: `Source: ${filters.source.toUpperCase()}`,
      onRemove: () => onChange({ source: INITIAL_IMPORT_FILTERS.source }),
    });
  if (filters.format !== INITIAL_IMPORT_FILTERS.format)
    chips.push({
      label: `Format: ${filters.format}`,
      onRemove: () => onChange({ format: INITIAL_IMPORT_FILTERS.format }),
    });
  if (
    filters.country !== INITIAL_IMPORT_FILTERS.country &&
    filters.source !== "limitless"
  )
    chips.push({
      label: `Country: ${filters.country}`,
      onRemove: () => onChange({ country: INITIAL_IMPORT_FILTERS.country }),
    });
  if (
    filters.platform !== INITIAL_IMPORT_FILTERS.platform &&
    filters.source !== "rk9"
  )
    chips.push({
      label: `Platform: ${filters.platform}`,
      onRemove: () => onChange({ platform: INITIAL_IMPORT_FILTERS.platform }),
    });
  if (filters.hasData !== INITIAL_IMPORT_FILTERS.hasData)
    chips.push({
      label: `Data: ${filters.hasData === "yes" ? "Has data" : "No data"}`,
      onRemove: () => onChange({ hasData: INITIAL_IMPORT_FILTERS.hasData }),
    });
  if (filters.dateFrom !== INITIAL_IMPORT_FILTERS.dateFrom)
    chips.push({
      label: `From: ${filters.dateFrom}`,
      onRemove: () => onChange({ dateFrom: INITIAL_IMPORT_FILTERS.dateFrom }),
    });
  if (filters.dateTo !== INITIAL_IMPORT_FILTERS.dateTo)
    chips.push({
      label: `To: ${filters.dateTo}`,
      onRemove: () => onChange({ dateTo: INITIAL_IMPORT_FILTERS.dateTo }),
    });
  if (filters.minPlayers !== INITIAL_IMPORT_FILTERS.minPlayers)
    chips.push({
      label: `Min players: ${filters.minPlayers}`,
      onRemove: () =>
        onChange({ minPlayers: INITIAL_IMPORT_FILTERS.minPlayers }),
    });

  return chips;
}

// Count secondary (popover) filters that are non-default.
// Primary filters (search, format, source segmented control) are inline.
function secondaryActiveCount(filters: ImportFilterState): number {
  let count = 0;
  if (
    filters.country !== INITIAL_IMPORT_FILTERS.country &&
    filters.source !== "limitless"
  )
    count++;
  if (
    filters.platform !== INITIAL_IMPORT_FILTERS.platform &&
    filters.source !== "rk9"
  )
    count++;
  if (filters.hasData !== INITIAL_IMPORT_FILTERS.hasData) count++;
  if (filters.dateFrom !== INITIAL_IMPORT_FILTERS.dateFrom) count++;
  if (filters.dateTo !== INITIAL_IMPORT_FILTERS.dateTo) count++;
  if (filters.minPlayers !== INITIAL_IMPORT_FILTERS.minPlayers) count++;
  return count;
}

// On mobile ALL non-search filters live in the popover.
function mobileActiveCount(filters: ImportFilterState): number {
  let count = secondaryActiveCount(filters);
  if (filters.format !== INITIAL_IMPORT_FILTERS.format) count++;
  if (filters.source !== INITIAL_IMPORT_FILTERS.source) count++;
  return count;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExternalDataFilters({
  filters,
  onChange,
  onClear,
  countryOptions = [],
  formatOptions = [],
  resultCount,
  totalCount,
}: ExternalDataFiltersProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isMobile = useIsMobile();

  const activeChips = buildChips(filters, onChange);
  const secondaryCount = secondaryActiveCount(filters);
  const mobileCount = mobileActiveCount(filters);

  // Show platform filter unless viewing RK9 exclusively
  const showPlatform = filters.source !== "rk9";
  // Show country filter unless viewing Limitless exclusively
  const showCountry = filters.source !== "limitless";

  function renderFormatSelect() {
    return (
      <Select
        value={filters.format}
        onValueChange={(v) => v && onChange({ format: v })}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-full text-xs sm:w-32",
            filters.format !== "all" && "ring-primary/50 ring-2"
          )}
          size="sm"
        >
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All formats</SelectItem>
          {formatOptions.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function renderSecondaryFilters() {
    return (
      <>
        {/* Country — hidden when viewing Limitless exclusively */}
        {showCountry && (
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium">
              Country
            </label>
            <Select
              value={filters.country}
              onValueChange={(v) => v && onChange({ country: v })}
            >
              <SelectTrigger className="h-8 w-full text-xs" size="sm">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Platform — hidden when viewing RK9 exclusively */}
        {showPlatform && (
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium">
              Platform
            </label>
            <Select
              value={filters.platform}
              onValueChange={(v) =>
                v && onChange({ platform: v as PlatformFilter })
              }
            >
              <SelectTrigger className="h-8 w-full text-xs" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="SWITCH">Switch</SelectItem>
                <SelectItem value="SIM">Simulator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Data available */}
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            Data
          </label>
          <Select
            value={filters.hasData}
            onValueChange={(v) =>
              v && onChange({ hasData: v as HasDataFilter })
            }
          >
            <SelectTrigger className="h-8 w-full text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Has data</SelectItem>
              <SelectItem value="no">No data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            Date Range
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ dateFrom: e.target.value })}
              className="h-7 flex-1 text-xs"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ dateTo: e.target.value })}
              className="h-7 flex-1 text-xs"
            />
          </div>
        </div>

        {/* Min Players */}
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            Min Players
          </label>
          <Input
            type="number"
            placeholder="0"
            value={filters.minPlayers}
            onChange={(e) => onChange({ minPlayers: e.target.value })}
            className="h-7 w-24 text-xs"
            min={0}
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {/* ------------------------------------------------------------------ */}
      {/* Row 1 — Source segmented control + Search + Format + More filters   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Source segmented control — always visible */}
        <div className="flex items-center rounded-md border text-xs font-medium">
          {(["all", "rk9", "limitless"] as const).map((src) => (
            <button
              key={src}
              onClick={() => onChange({ source: src })}
              className={cn(
                "h-8 cursor-pointer px-3 capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                filters.source === src
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {src === "all" ? "All" : src.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search — always visible, full width on mobile */}
        <div className="relative min-w-40 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search by name or ID…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="h-8 w-full pl-8 text-sm"
          />
        </div>

        {/* Desktop: Format inline */}
        {!isMobile && renderFormatSelect()}

        {/* Popover trigger — desktop: "More filters" for secondary only;
            mobile: "Filters" for all non-search filters */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            className={cn(
              "hover:bg-accent relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
              isMobile && "shrink-0"
            )}
          >
            <ListFilter className="h-3.5 w-3.5" />
            {isMobile ? "Filters" : "More filters"}
            {(isMobile ? mobileCount : secondaryCount) > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-4 px-1 text-[10px] leading-none"
              >
                {isMobile ? mobileCount : secondaryCount}
              </Badge>
            )}
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-4"
            align="end"
            side="bottom"
            sideOffset={6}
          >
            <div className="space-y-3">
              {/* Mobile: format + source live in the popover too */}
              {isMobile && (
                <>
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
                      Source
                    </label>
                    <div className="flex items-center rounded-md border text-xs font-medium">
                      {(["all", "rk9", "limitless"] as const).map((src) => (
                        <button
                          key={src}
                          onClick={() => {
                            onChange({ source: src });
                            setPopoverOpen(false);
                          }}
                          className={cn(
                            "h-8 flex-1 cursor-pointer capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                            filters.source === src
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          {src === "all" ? "All" : src.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
                      Format
                    </label>
                    {renderFormatSelect()}
                  </div>
                </>
              )}
              {renderSecondaryFilters()}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Row 2 — Active filter chips + result count                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-1.5">
        {activeChips.map((chip) => (
          <span
            key={chip.label}
            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          >
            {chip.label}
            <button
              onClick={chip.onRemove}
              className="hover:text-foreground text-muted-foreground ml-0.5 rounded-full transition-colors"
              aria-label={`Remove filter: ${chip.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {activeChips.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground h-6 gap-1 px-2 text-xs"
          >
            Clear all
          </Button>
        )}

        {/* Result count — right-aligned via margin-start: auto */}
        <span className="text-muted-foreground ml-auto text-xs">
          Showing {resultCount} of {totalCount}
        </span>
      </div>
    </div>
  );
}
