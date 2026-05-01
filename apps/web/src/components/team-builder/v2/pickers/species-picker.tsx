"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { useVirtualizer } from "@tanstack/react-virtual";

import {
  buildSpeciesSearchIndex,
  isLegalSpecies,
  searchSpecies,
  type GameFormat,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../../type-symbol-icon";
import {
  DEFAULT_FILTERS,
  SpeciesFilters,
  type SpeciesFilterState,
} from "./species-filters";

// =============================================================================
// Constants
// =============================================================================

/** Stat threshold for the "high stat" highlight (matches the spec's 110+). */
const HIGH_STAT_THRESHOLD = 110;

/**
 * Shared Tailwind grid template for both the header row and each data row.
 * Having a single constant guarantees column-for-column alignment.
 *
 *   2.75rem  — sprite circle
 *   minmax(0,1fr) — name + abilities info column
 *   3rem     — types column: fits two 20px icons + 4px gap comfortably
 *   auto     — stats block (HP/Atk/Def/SpA/SpD/Spe + BST divider)
 */
const ROW_GRID = "grid-cols-[2.75rem_minmax(0,1fr)_3rem_auto]";

/**
 * Shared Tailwind grid template for the inner stats cells (6 stat cols + BST).
 * Extracted so the header and body cells always use identical column widths.
 */
const STATS_GRID = "grid-cols-[repeat(6,1.75rem)_2.5rem]";

// =============================================================================
// Module-level index cache — buildSpeciesSearchIndex is expensive (~1200+ species)
// =============================================================================

const indexCache = new Map<string, SpeciesSearchEntry[]>();

/** Default format ID used when no format is active. */
const DEFAULT_FORMAT_ID = "gen9vgc2025regg";

function getCachedIndex(format: GameFormat | undefined): SpeciesSearchEntry[] {
  const key = format?.id ?? DEFAULT_FORMAT_ID;
  let idx = indexCache.get(key);
  if (!idx) {
    idx = buildSpeciesSearchIndex(key);
    indexCache.set(key, idx);
  }
  return idx;
}

// =============================================================================
// Types
// =============================================================================

interface SpeciesPickerProps {
  /** Currently-selected species — highlighted in the list. */
  value: string | null;
  /** Active format for legality + meta tier filtering. */
  format: GameFormat | undefined;
  /** Other team members' species — used by the synergy-aware filters. */
  currentTeam?: Array<{ species: string }>;
  /** Called with the picked species name. */
  onPick: (species: string) => void;
  /** Called when the user dismisses without picking (Esc, click-outside). */
  onClose: () => void;
}

type SortCol = "name" | "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "bst";
type SortDir = "asc" | "desc";

interface SortState {
  col: SortCol;
  dir: SortDir;
}

// =============================================================================
// Helpers
// =============================================================================

/** Tailwind classes for a stat cell value, highlighting >=110 as "good". */
function statValueClass(value: number): string {
  if (value >= HIGH_STAT_THRESHOLD) {
    return "text-stat-good font-semibold";
  }
  return "text-foreground";
}

/** Sort a list of entries by the given column and direction. */
function sortEntries(
  entries: SpeciesSearchEntry[],
  sort: SortState
): SpeciesSearchEntry[] {
  return [...entries].sort((a, b) => {
    let cmp: number;
    if (sort.col === "name") {
      cmp = a.species.localeCompare(b.species);
    } else if (sort.col === "bst") {
      cmp = a.bst - b.bst;
    } else {
      cmp = a.baseStats[sort.col] - b.baseStats[sort.col];
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

// =============================================================================
// SpeciesRow — one rich row in the picker
// =============================================================================

interface SpeciesRowProps {
  entry: SpeciesSearchEntry;
  isCurrent: boolean;
  onSelect: () => void;
}

function SpeciesRow({ entry, isCurrent, onSelect }: SpeciesRowProps) {
  const sprite = getPokemonSprite(entry.species);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "hover:bg-muted/60 grid w-full cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-left transition-colors",
        // Must mirror SpeciesRowsHeader (both use ROW_GRID).
        ROW_GRID,
        isCurrent && "bg-primary/5"
      )}
      aria-label={`Select ${entry.species}`}
    >
      {/* Sprite — 44px circle with primary-soft radial bg */}
      <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-full">
        <Image
          src={sprite.url}
          alt={entry.species}
          width={36}
          height={36}
          className={cn(
            "size-9 object-contain",
            sprite.pixelated && "[image-rendering:pixelated]"
          )}
          unoptimized
        />
      </div>

      {/* Info — species name on top, abilities muted below */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-foreground min-w-0 truncate text-sm font-semibold">
          {entry.species}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {entry.abilities.join(" · ")}
        </span>
      </div>

      {/* Types column — fixed 3rem so single-type and dual-type species occupy
          the same column width */}
      <div className="flex min-w-12 items-center gap-1">
        {entry.types.map((type) => (
          <TypeSymbolIcon
            key={type}
            type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
            size={20}
          />
        ))}
      </div>

      {/* Stats — HP / Atk / Def / SpA / SpD / Spe + BST rollup */}
      <div className={cn("grid items-center gap-1.5", STATS_GRID)}>
        <span
          className={cn(
            "text-center font-mono text-xs tabular-nums",
            statValueClass(entry.baseStats.hp)
          )}
        >
          {entry.baseStats.hp}
        </span>
        <span
          className={cn(
            "text-center font-mono text-xs tabular-nums",
            statValueClass(entry.baseStats.atk)
          )}
        >
          {entry.baseStats.atk}
        </span>
        <span
          className={cn(
            "text-center font-mono text-xs tabular-nums",
            statValueClass(entry.baseStats.def)
          )}
        >
          {entry.baseStats.def}
        </span>
        <span
          className={cn(
            "text-center font-mono text-xs tabular-nums",
            statValueClass(entry.baseStats.spa)
          )}
        >
          {entry.baseStats.spa}
        </span>
        <span
          className={cn(
            "text-center font-mono text-xs tabular-nums",
            statValueClass(entry.baseStats.spd)
          )}
        >
          {entry.baseStats.spd}
        </span>
        <span
          className={cn(
            "text-center font-mono text-xs tabular-nums",
            statValueClass(entry.baseStats.spe)
          )}
        >
          {entry.baseStats.spe}
        </span>

        {/* BST — slightly heavier, thin left divider so it reads as the rollup */}
        <span className="border-border/60 text-foreground border-l pl-2 text-center font-mono text-xs font-semibold tabular-nums">
          {entry.bst}
        </span>
      </div>
    </button>
  );
}

// =============================================================================
// SpeciesRowsHeader — column labels for the stats grid
// =============================================================================

/** Arrow indicator shown next to the active sort column. */
function SortArrow({ dir }: { dir: SortDir }) {
  return (
    <span aria-hidden="true" className="ml-0.5 inline-block leading-none">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

interface SpeciesRowsHeaderProps {
  sort: SortState;
  onSort: (col: SortCol) => void;
}

function SpeciesRowsHeader({ sort, onSort }: SpeciesRowsHeaderProps) {
  /** Returns classes for a sortable header button. */
  function headerBtnClass(col: SortCol) {
    return cn(
      "cursor-pointer select-none transition-colors hover:text-foreground",
      sort.col === col ? "text-foreground" : "text-muted-foreground"
    );
  }

  return (
    <div
      className={cn(
        "bg-card sticky top-0 z-20 grid items-center gap-3 border-b px-4 py-1.5 text-xs font-medium tracking-wide uppercase",
        // Must mirror SpeciesRow (both use ROW_GRID).
        ROW_GRID
      )}
    >
      {/* Sprite column — no label */}
      <span aria-hidden="true" />

      {/* Name column — sortable */}
      <button
        type="button"
        className={cn(headerBtnClass("name"), "text-left")}
        onClick={() => onSort("name")}
        aria-label="Sort by name"
      >
        Name
        {sort.col === "name" && <SortArrow dir={sort.dir} />}
      </button>

      {/* Types column — dedicated header */}
      <span className="text-muted-foreground">Types</span>

      {/* Stats sub-grid — each label is a sortable button, using STATS_GRID */}
      <div className={cn("grid items-center gap-1.5", STATS_GRID)}>
        {(
          [
            { col: "hp", label: "HP" },
            { col: "atk", label: "Atk" },
            { col: "def", label: "Def" },
            { col: "spa", label: "SpA" },
            { col: "spd", label: "SpD" },
            { col: "spe", label: "Spe" },
          ] as const
        ).map(({ col, label }) => (
          <button
            key={col}
            type="button"
            className={cn(headerBtnClass(col), "text-center")}
            onClick={() => onSort(col)}
            aria-label={`Sort by ${label}`}
          >
            {label}
            {sort.col === col && <SortArrow dir={sort.dir} />}
          </button>
        ))}

        {/* BST — sortable, with thin left divider matching the data rows */}
        <button
          type="button"
          className={cn(
            headerBtnClass("bst"),
            "border-border/60 border-l pl-2 text-center"
          )}
          onClick={() => onSort("bst")}
          aria-label="Sort by BST"
        >
          BST
          {sort.col === "bst" && <SortArrow dir={sort.dir} />}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// SpeciesPicker
// =============================================================================

/**
 * Dense-table combobox-style species picker.
 *
 * Each row shows sprite, name + abilities, type icons, the six base stats,
 * and BST. Clicking a row calls onPick with the species name.
 *
 * Designed to render inside a <PopoverContent> — the consumer provides the
 * bounding box. This component only supplies flex flex-col with min-h-0 so
 * the rows region scrolls inside the popover.
 *
 * Sorting defaults to alphabetical by name. Clicking any stat header switches
 * to that stat (descending first; clicking again toggles; clicking a new header
 * always starts descending). The Name header also toggles asc/desc.
 */
export function SpeciesPicker({
  value,
  format,
  currentTeam = [],
  onPick,
  onClose: _onClose,
}: SpeciesPickerProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SpeciesFilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>({ col: "name", dir: "asc" });

  // Scroll container ref for the virtualizer
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build the species index — cached at module scope keyed by format id
  const fullIndex = getCachedIndex(format);

  // Pre-filter by format legality so the picker only ever surfaces species
  // legal in this format. The denominator shown to the user reflects the
  // format roster (e.g. ~275 for Champions Reg M-A), not all of gen 9.
  const speciesIndex = format?.id
    ? fullIndex.filter((e) => isLegalSpecies(e.species, format.id))
    : fullIndex;

  // Handle a click on a column header
  function handleSort(col: SortCol) {
    setSort((prev) => {
      if (prev.col === col) {
        // Toggle direction on repeated click
        return { col, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // New column: name sorts ascending by default; stats sort descending
      // (show strongest first)
      return { col, dir: col === "name" ? "asc" : "desc" };
    });
  }

  // Derived list — search + filter (legality already applied to index)
  const matched = searchSpecies(speciesIndex, query, {
    types: filters.types,
    abilities: filters.abilities,
    moves: filters.moves,
    minBaseStat: filters.minBaseStat,
    maxBaseStat: filters.maxBaseStat,
    formatId: format?.id,
  });

  // Sort the full filtered results — virtualization renders only the visible slice
  const sorted = sortEntries(matched, sort);

  // Virtualizer — renders only visible rows, keeping DOM lean regardless of
  // how many species are in the format roster (e.g. 274 for Champions M-A).
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    // Dense row height: 44px sprite (size-11) + py-2.5 top + py-2.5 bottom = ~64px
    estimateSize: () => 64,
    overscan: 5,
  });

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ minHeight: 0 }}
    >
      {/* Filters — search + tier chips + role/type/move/stats */}
      <SpeciesFilters
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        currentTeam={currentTeam}
        totalCount={speciesIndex.length}
        filteredCount={matched.length}
      />

      {/* Rows + sticky header — scrolls inside the popover bounding box */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        data-testid="species-rows"
      >
        {/* Sticky header sits as the first child so position:sticky works
            relative to the scroll container. Must appear before the virtualizer
            positioned container. */}
        <SpeciesRowsHeader sort={sort} onSort={handleSort} />

        {sorted.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No Pokémon match your filters. Try broadening your search.
          </div>
        ) : (
          /* Virtualizer container — explicit height so the scroll container
             knows the full content height without rendering every row. */
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const entry = sorted[virtualRow.index];
              if (!entry) return null;
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 right-0"
                  style={{ top: virtualRow.start }}
                >
                  <SpeciesRow
                    entry={entry}
                    isCurrent={entry.species === value}
                    onSelect={() => onPick(entry.species)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
