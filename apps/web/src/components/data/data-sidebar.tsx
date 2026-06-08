// apps/web/src/components/data/data-sidebar.tsx
"use client";

import { useState, useLayoutEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";

import { getActiveFormats } from "@trainers/pokemon";
import { type PipelineSpeciesData } from "@trainers/supabase";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  type UsageFilters,
  type UsageSource,
  type PeriodType,
  type DataPreset,
  type PipelineColumn,
  ALL_PIPELINE_COLUMNS,
  applyPreset,
  getActivePreset,
} from "./usage-filters";
import { assignColor } from "./usage-series";
import { COLUMN_COLORS } from "./usage-pipeline";

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = "data-sidebar-collapsed";

const PRESETS: { label: string; value: DataPreset }[] = [
  { label: "Top 10", value: "top10" },
  { label: "Top 20", value: "top20" },
  { label: "Top 50", value: "top50" },
  { label: "All", value: "all" },
];

// =============================================================================
// Types
// =============================================================================

interface DataSidebarProps {
  filters: UsageFilters;
  allSpecies: PipelineSpeciesData[];
  selectedSpecies: string[];
  columns: PipelineColumn[];
  onFiltersChange: (filters: UsageFilters) => void;
  onSelectionChange: (selected: string[]) => void;
  onColumnsChange: (columns: PipelineColumn[]) => void;
}

// =============================================================================
// DataSidebar
// =============================================================================

export function DataSidebar({
  filters,
  allSpecies,
  selectedSpecies,
  columns,
  onFiltersChange,
  onSelectionChange,
  onColumnsChange,
}: DataSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const formats = getActiveFormats();
  const activePreset = getActivePreset(allSpecies, selectedSpecies);

  // Restore collapsed state from localStorage before first paint to prevent flash.
  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (localStorage.getItem(STORAGE_KEY) === "true") setCollapsed(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const handlePreset = (preset: DataPreset) => {
    onSelectionChange(applyPreset(allSpecies, preset));
  };

  const handleToggle = (species: string) => {
    const next = selectedSpecies.includes(species)
      ? selectedSpecies.filter((s) => s !== species)
      : [...selectedSpecies, species];
    onSelectionChange(next);
  };

  const filtered = query
    ? allSpecies.filter((s) =>
        s.species.toLowerCase().includes(query.toLowerCase())
      )
    : allSpecies;

  if (collapsed) {
    return (
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] w-10 flex-shrink-0 flex-col items-center border-r pt-3">
        <button
          onClick={handleCollapse}
          aria-label="Expand sidebar"
          className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-16 flex h-[calc(100dvh-4rem)] w-52 flex-shrink-0 flex-col overflow-hidden border-r">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-3 pt-3 pb-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Filters
        </span>
        <button
          onClick={handleCollapse}
          aria-label="Collapse sidebar"
          className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      </div>

      {/* Format / Source / Granularity */}
      <div className="flex flex-shrink-0 flex-col gap-3 px-3 pb-3">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Format
          </span>
          <Select
            value={filters.format}
            onValueChange={(v) =>
              v && onFiltersChange({ ...filters, format: v })
            }
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formats.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Source
          </span>
          <Select
            value={filters.source}
            onValueChange={(v) =>
              v && onFiltersChange({ ...filters, source: v as UsageSource })
            }
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Sources
              </SelectItem>
              <SelectItem value="rk9" className="text-xs">
                RK9
              </SelectItem>
              <SelectItem value="limitless" className="text-xs">
                Limitless
              </SelectItem>
              <SelectItem value="trainers.gg" className="text-xs">
                trainers.gg
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Granularity
          </span>
          <Select
            value={filters.periodType}
            onValueChange={(v) =>
              v && onFiltersChange({ ...filters, periodType: v as PeriodType })
            }
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day" className="text-xs">
                Event
              </SelectItem>
              <SelectItem value="week" className="text-xs">
                Week
              </SelectItem>
              <SelectItem value="month" className="text-xs">
                Month
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="flex flex-shrink-0 flex-col gap-2 px-3 pb-3">
        <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Pipeline
        </span>
        <div className="flex flex-col gap-0.5">
          {/* Enabled columns — in order, with reorder arrows */}
          {columns.map((col, idx) => (
            <div key={col} className="flex items-center gap-1">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: COLUMN_COLORS[col] }}
              />
              <span className="min-w-0 flex-1 truncate text-xs capitalize">
                {col === "item"
                  ? "Item"
                  : col.charAt(0).toUpperCase() + col.slice(1)}
              </span>
              <button
                onClick={() => {
                  if (idx === 0) return;
                  const next = [...columns];
                  [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
                  onColumnsChange(next);
                }}
                disabled={idx === 0}
                aria-label={`Move ${col} up`}
                className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded disabled:opacity-20"
              >
                <ArrowUp className="size-3" />
              </button>
              <button
                onClick={() => {
                  if (idx === columns.length - 1) return;
                  const next = [...columns];
                  [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
                  onColumnsChange(next);
                }}
                disabled={idx === columns.length - 1}
                aria-label={`Move ${col} down`}
                className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded disabled:opacity-20"
              >
                <ArrowDown className="size-3" />
              </button>
              <button
                onClick={() =>
                  onColumnsChange(columns.filter((c) => c !== col))
                }
                aria-label={`Hide ${col}`}
                className="text-primary flex size-5 items-center justify-center rounded text-xs"
                title="Hide"
              >
                ☑
              </button>
            </div>
          ))}
          {/* Disabled columns — shown below, click to re-enable */}
          {ALL_PIPELINE_COLUMNS.filter((col) => !columns.includes(col)).map(
            (col) => (
              <div key={col} className="flex items-center gap-1 opacity-40">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: COLUMN_COLORS[col] }}
                />
                <span className="min-w-0 flex-1 truncate text-xs capitalize">
                  {col === "item"
                    ? "Item"
                    : col.charAt(0).toUpperCase() + col.slice(1)}
                </span>
                <button
                  onClick={() => onColumnsChange([...columns, col])}
                  aria-label={`Show ${col}`}
                  className="text-muted-foreground flex size-5 items-center justify-center rounded text-xs"
                  title="Show"
                >
                  ☐
                </button>
              </div>
            )
          )}
        </div>
      </div>

      <div className="border-t" />

      {/* Pokémon section */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 py-3">
        <span className="text-muted-foreground flex-shrink-0 text-xs font-semibold tracking-widest uppercase">
          Pokémon
        </span>

        {/* Preset buttons */}
        <div className="flex flex-shrink-0 flex-wrap gap-1">
          {PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handlePreset(value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                activePreset === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/60"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 flex-shrink-0 text-xs"
        />

        {/* Scrollable checklist */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-0.5 pr-1">
            {filtered.map((s) => {
              const checked = selectedSpecies.includes(s.species);
              const color = assignColor(s.species);
              return (
                <button
                  key={s.species}
                  onClick={() => handleToggle(s.species)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs transition-colors",
                    checked
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex-shrink-0 text-xs",
                      checked ? "text-primary" : "text-muted-foreground/40"
                    )}
                    aria-hidden
                  >
                    {checked ? "☑" : "☐"}
                  </span>
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.species}</span>
                  <span className="text-muted-foreground/50 flex-shrink-0 text-xs">
                    {s.usagePct.toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-shrink-0 items-center justify-between border-t px-3 py-2">
        <span className="text-muted-foreground text-xs">
          {selectedSpecies.length} selected · {allSpecies.length} total
        </span>
        <button
          onClick={() => onSelectionChange([])}
          className="text-primary hover:text-primary/80 text-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
