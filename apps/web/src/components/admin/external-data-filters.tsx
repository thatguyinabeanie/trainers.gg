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
import { cn } from "@/lib/utils";

import {
  INITIAL_LIMITLESS_FILTERS,
  INITIAL_RK9_FILTERS,
  type HasDataFilter,
  type LimitlessFilterState,
  type PlatformFilter,
  type RK9FilterState,
} from "./external-data-shared";

export interface ExternalDataFiltersProps {
  tab: "rk9" | "limitless";
  rk9Filters?: RK9FilterState;
  limFilters?: LimitlessFilterState;
  onRk9Change?: (patch: Partial<RK9FilterState>) => void;
  onLimChange?: (patch: Partial<LimitlessFilterState>) => void;
  onClear: () => void;
  /** Distinct tier values for RK9 tab */
  tierOptions?: string[];
  /** Distinct country values for RK9 tab */
  countryOptions?: string[];
  /** Distinct format codes for Limitless tab */
  formatOptions?: string[];
  resultCount: number;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Active-chip helpers
// ---------------------------------------------------------------------------

interface FilterChip {
  label: string;
  /** Call this to reset just this field */
  onRemove: () => void;
}

function rk9Chips(
  filters: RK9FilterState,
  onChange: (patch: Partial<RK9FilterState>) => void
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.status !== INITIAL_RK9_FILTERS.status)
    chips.push({
      label: `Status: ${filters.status}`,
      onRemove: () => onChange({ status: INITIAL_RK9_FILTERS.status }),
    });
  if (filters.tier !== INITIAL_RK9_FILTERS.tier)
    chips.push({
      label: `Tier: ${filters.tier}`,
      onRemove: () => onChange({ tier: INITIAL_RK9_FILTERS.tier }),
    });
  if (filters.country !== INITIAL_RK9_FILTERS.country)
    chips.push({
      label: `Country: ${filters.country}`,
      onRemove: () => onChange({ country: INITIAL_RK9_FILTERS.country }),
    });
  if (filters.hasData !== INITIAL_RK9_FILTERS.hasData)
    chips.push({
      label: `Team Lists: ${filters.hasData === "yes" ? "Has teams" : "No teams"}`,
      onRemove: () => onChange({ hasData: INITIAL_RK9_FILTERS.hasData }),
    });
  if (filters.dateFrom !== INITIAL_RK9_FILTERS.dateFrom)
    chips.push({
      label: `From: ${filters.dateFrom}`,
      onRemove: () => onChange({ dateFrom: INITIAL_RK9_FILTERS.dateFrom }),
    });
  if (filters.dateTo !== INITIAL_RK9_FILTERS.dateTo)
    chips.push({
      label: `To: ${filters.dateTo}`,
      onRemove: () => onChange({ dateTo: INITIAL_RK9_FILTERS.dateTo }),
    });
  if (filters.minPlayers !== INITIAL_RK9_FILTERS.minPlayers)
    chips.push({
      label: `Min players: ${filters.minPlayers}`,
      onRemove: () =>
        onChange({ minPlayers: INITIAL_RK9_FILTERS.minPlayers }),
    });

  return chips;
}

function limitlessChips(
  filters: LimitlessFilterState,
  onChange: (patch: Partial<LimitlessFilterState>) => void
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.format !== INITIAL_LIMITLESS_FILTERS.format)
    chips.push({
      label: `Format: ${filters.format}`,
      onRemove: () =>
        onChange({ format: INITIAL_LIMITLESS_FILTERS.format }),
    });
  if (filters.status !== INITIAL_LIMITLESS_FILTERS.status)
    chips.push({
      label: `Status: ${filters.status}`,
      onRemove: () =>
        onChange({ status: INITIAL_LIMITLESS_FILTERS.status }),
    });
  if (filters.platform !== INITIAL_LIMITLESS_FILTERS.platform)
    chips.push({
      label: `Platform: ${filters.platform}`,
      onRemove: () =>
        onChange({ platform: INITIAL_LIMITLESS_FILTERS.platform }),
    });
  if (filters.hasData !== INITIAL_LIMITLESS_FILTERS.hasData)
    chips.push({
      label: `Decklists: ${filters.hasData === "yes" ? "Has decklists" : "No decklists"}`,
      onRemove: () =>
        onChange({ hasData: INITIAL_LIMITLESS_FILTERS.hasData }),
    });
  if (filters.dateFrom !== INITIAL_LIMITLESS_FILTERS.dateFrom)
    chips.push({
      label: `From: ${filters.dateFrom}`,
      onRemove: () =>
        onChange({ dateFrom: INITIAL_LIMITLESS_FILTERS.dateFrom }),
    });
  if (filters.dateTo !== INITIAL_LIMITLESS_FILTERS.dateTo)
    chips.push({
      label: `To: ${filters.dateTo}`,
      onRemove: () =>
        onChange({ dateTo: INITIAL_LIMITLESS_FILTERS.dateTo }),
    });
  if (filters.minPlayers !== INITIAL_LIMITLESS_FILTERS.minPlayers)
    chips.push({
      label: `Min players: ${filters.minPlayers}`,
      onRemove: () =>
        onChange({ minPlayers: INITIAL_LIMITLESS_FILTERS.minPlayers }),
    });

  return chips;
}

// Count secondary (popover) filters that are non-default.
// Primary filters (search, format/tier, status) are inline — only secondary
// ones contribute to the badge count.
function rk9SecondaryActiveCount(filters: RK9FilterState): number {
  let count = 0;
  if (filters.country !== INITIAL_RK9_FILTERS.country) count++;
  if (filters.hasData !== INITIAL_RK9_FILTERS.hasData) count++;
  if (filters.dateFrom !== INITIAL_RK9_FILTERS.dateFrom) count++;
  if (filters.dateTo !== INITIAL_RK9_FILTERS.dateTo) count++;
  if (filters.minPlayers !== INITIAL_RK9_FILTERS.minPlayers) count++;
  return count;
}

function limitlessSecondaryActiveCount(
  filters: LimitlessFilterState
): number {
  let count = 0;
  if (filters.platform !== INITIAL_LIMITLESS_FILTERS.platform) count++;
  if (filters.hasData !== INITIAL_LIMITLESS_FILTERS.hasData) count++;
  if (filters.dateFrom !== INITIAL_LIMITLESS_FILTERS.dateFrom) count++;
  if (filters.dateTo !== INITIAL_LIMITLESS_FILTERS.dateTo) count++;
  if (filters.minPlayers !== INITIAL_LIMITLESS_FILTERS.minPlayers) count++;
  return count;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExternalDataFilters({
  tab,
  rk9Filters,
  limFilters,
  onRk9Change,
  onLimChange,
  onClear,
  tierOptions = [],
  countryOptions = [],
  formatOptions = [],
  resultCount,
  totalCount,
}: ExternalDataFiltersProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isRk9 = tab === "rk9";

  // Safe accessors — fall back to initial values so we never dereference
  // undefined even when the parent hasn't wired up one of the two tabs yet.
  const rk9 = rk9Filters ?? INITIAL_RK9_FILTERS;
  const lim = limFilters ?? INITIAL_LIMITLESS_FILTERS;

  const handleRk9 = onRk9Change ?? (() => {});
  const handleLim = onLimChange ?? (() => {});

  const activeChips = isRk9
    ? rk9Chips(rk9, handleRk9)
    : limitlessChips(lim, handleLim);

  const secondaryCount = isRk9
    ? rk9SecondaryActiveCount(rk9)
    : limitlessSecondaryActiveCount(lim);

  return (
    <div className="space-y-2">
      {/* ------------------------------------------------------------------ */}
      {/* Row 1 — Search + primary inline dropdowns + "More filters" popover  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-40 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search by name or ID…"
            value={isRk9 ? rk9.search : lim.search}
            onChange={(e) => {
              if (isRk9) handleRk9({ search: e.target.value });
              else handleLim({ search: e.target.value });
            }}
            className="h-8 w-full pl-8 text-sm"
          />
        </div>

        {/* Primary filter: Format (Limitless) or Tier (RK9) */}
        {isRk9 ? (
          <Select
            value={rk9.tier}
            onValueChange={(v) => v && handleRk9({ tier: v })}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-full text-xs sm:w-32",
                rk9.tier !== "all" && "ring-primary/50 ring-2"
              )}
              size="sm"
            >
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {tierOptions.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={lim.format}
            onValueChange={(v) => v && handleLim({ format: v })}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-full text-xs sm:w-32",
                lim.format !== "all" && "ring-primary/50 ring-2"
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
        )}

        {/* Status — same shape for both tabs */}
        <Select
          value={isRk9 ? rk9.status : lim.status}
          onValueChange={(v) => {
            if (v) {
              if (isRk9) handleRk9({ status: v });
              else handleLim({ status: v });
            }
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs sm:w-32" size="sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {isRk9 ? (
              <>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="importing">Importing</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        {/* "More filters" popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger className="relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent">
            <ListFilter className="h-3.5 w-3.5" />
            More filters
            {secondaryCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-4 px-1 text-[10px] leading-none"
              >
                {secondaryCount}
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
              {isRk9 ? (
                /* ---- RK9 secondary filters ---- */
                <>
                  {/* Country */}
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
                      Country
                    </label>
                    <Select
                      value={rk9.country}
                      onValueChange={(v) => v && handleRk9({ country: v })}
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

                  {/* Team Lists */}
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
                      Team Lists
                    </label>
                    <Select
                      value={rk9.hasData}
                      onValueChange={(v) =>
                        v && handleRk9({ hasData: v as HasDataFilter })
                      }
                    >
                      <SelectTrigger className="h-8 w-full text-xs" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Has teams</SelectItem>
                        <SelectItem value="no">No teams</SelectItem>
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
                        value={rk9.dateFrom}
                        onChange={(e) =>
                          handleRk9({ dateFrom: e.target.value })
                        }
                        className="h-7 flex-1 text-xs"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="date"
                        value={rk9.dateTo}
                        onChange={(e) =>
                          handleRk9({ dateTo: e.target.value })
                        }
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
                      value={rk9.minPlayers}
                      onChange={(e) =>
                        handleRk9({ minPlayers: e.target.value })
                      }
                      className="h-7 w-24 text-xs"
                      min={0}
                    />
                  </div>
                </>
              ) : (
                /* ---- Limitless secondary filters ---- */
                <>
                  {/* Platform */}
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
                      Platform
                    </label>
                    <Select
                      value={lim.platform}
                      onValueChange={(v) =>
                        v && handleLim({ platform: v as PlatformFilter })
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

                  {/* Decklists */}
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
                      Decklists
                    </label>
                    <Select
                      value={lim.hasData}
                      onValueChange={(v) =>
                        v && handleLim({ hasData: v as HasDataFilter })
                      }
                    >
                      <SelectTrigger className="h-8 w-full text-xs" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Has decklists</SelectItem>
                        <SelectItem value="no">No decklists</SelectItem>
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
                        value={lim.dateFrom}
                        onChange={(e) =>
                          handleLim({ dateFrom: e.target.value })
                        }
                        className="h-7 flex-1 text-xs"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="date"
                        value={lim.dateTo}
                        onChange={(e) =>
                          handleLim({ dateTo: e.target.value })
                        }
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
                      value={lim.minPlayers}
                      onChange={(e) =>
                        handleLim({ minPlayers: e.target.value })
                      }
                      className="h-7 w-24 text-xs"
                      min={0}
                    />
                  </div>
                </>
              )}
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
