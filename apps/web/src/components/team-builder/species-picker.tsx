"use client";

import { useState } from "react";
import Image from "next/image";

import {
  isLegalSpecies,
  searchSpecies,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  SpeciesFilters,
  DEFAULT_FILTERS,
  type SpeciesFilterState,
} from "./species-filters";
import { TYPE_PILL_COLORS } from "./type-colors";

// =============================================================================
// Constants
// =============================================================================

/** Cap visible rows so a wide-open search doesn't render thousands of nodes. */
const MAX_VISIBLE_ROWS = 200;

/** Stat threshold for the "high stat" highlight (matches the spec's 110+). */
const HIGH_STAT_THRESHOLD = 110;

// =============================================================================
// Types
// =============================================================================

interface SpeciesPickerProps {
  speciesIndex: SpeciesSearchEntry[];
  currentTeam: Array<{ species: string }>;
  currentSpecies: string | null;
  /** Active format ID. When set, illegal species are filtered out. */
  formatId?: string;
  /**
   * Single-click row selection callback. Selection always uses default
   * loadout (first ability). Per the rich-rows spec the legacy "select
   * blank" flow is dropped — `mode` is left on the signature so the
   * caller (team-workspace) doesn't have to branch on picker variant.
   */
  onSelect: (species: string, mode: "defaults" | "blank") => void;
  onCancel: () => void;
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
        // Grid template:
        //  44px (sprite circle)
        //  minmax(0, 1fr) (info column: name + types, abilities)
        //  auto (compact stats block — see StatsCells below, ~240px wide)
        "grid-cols-[2.75rem_minmax(0,1fr)_auto]",
        isCurrent && "bg-primary/5"
      )}
      aria-label={`Select ${entry.species}`}
    >
      {/* Sprite — 44px circle with primary-soft radial bg, mirrors the editor
          header sprite styling. */}
      <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-full">
        <Image
          src={sprite.url}
          alt={entry.species}
          width={36}
          height={36}
          className={cn(
            "size-9 object-contain",
            sprite.pixelated && "image-rendering-pixelated"
          )}
          unoptimized
        />
      </div>

      {/* Info — name + type pills on top, abilities muted below. The name
          span carries `min-w-0` so it can shrink and truncate as a last
          resort if the column is unusually narrow; type pills stay
          `shrink-0` so they never collapse. */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-foreground min-w-0 truncate text-sm font-semibold">
            {entry.species}
          </span>
          <div className="flex shrink-0 gap-1">
            {entry.types.map((type) => (
              <span
                key={type}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                  TYPE_PILL_COLORS[type as keyof typeof TYPE_PILL_COLORS] ??
                    "bg-muted text-foreground"
                )}
              >
                {type}
              </span>
            ))}
          </div>
        </div>
        <span className="text-muted-foreground truncate text-xs">
          {entry.abilities.join(" · ")}
        </span>
      </div>

      {/* Stats — HP / Atk / Def / SpA / SpD / Spe in Geist Mono, plus BST
          rollup with a thin left divider. Compact (~240px) so the info
          column gets the visual weight. Mirror this template in
          SpeciesRowsHeader. */}
      <div className="grid grid-cols-[repeat(6,1.75rem)_2.5rem] items-center gap-1.5">
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

        {/* BST — slightly heavier, thin left divider so it reads as the rollup. */}
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

function SpeciesRowsHeader() {
  return (
    <div
      className={cn(
        "bg-muted/50 text-muted-foreground sticky top-0 z-10 grid items-center gap-3 border-b px-4 py-1.5 text-xs font-medium tracking-wide uppercase",
        // Mirror the SpeciesRow grid template so the stats block aligns
        // over the per-row stats.
        "grid-cols-[2.75rem_minmax(0,1fr)_auto]"
      )}
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <div className="grid grid-cols-[repeat(6,1.75rem)_2.5rem] items-center gap-1.5">
        <span className="text-center">HP</span>
        <span className="text-center">Atk</span>
        <span className="text-center">Def</span>
        <span className="text-center">SpA</span>
        <span className="text-center">SpD</span>
        <span className="text-center">Spe</span>
        <span className="border-border/60 border-l pl-2 text-center">BST</span>
      </div>
    </div>
  );
}

// =============================================================================
// SpeciesPicker
// =============================================================================

/**
 * Single-column rich-row species picker. Each row shows sprite, name + types,
 * abilities, the six base stats, and BST. Clicking a row selects the species
 * with default loadout (first ability) — there is no separate "select blank"
 * flow. The previous split-pane (table + detail) layout has been retired.
 */
export function SpeciesPicker({
  speciesIndex,
  currentTeam,
  currentSpecies,
  formatId,
  onSelect,
  onCancel,
}: SpeciesPickerProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SpeciesFilterState>(DEFAULT_FILTERS);

  // Derived list — search + filter + format legality.
  const matched = searchSpecies(speciesIndex, query, {
    types: filters.types,
    abilities: filters.abilities,
    moves: filters.moves,
    minBaseStat: filters.minBaseStat,
    maxBaseStat: filters.maxBaseStat,
  });
  const legal = formatId
    ? matched.filter((e) => isLegalSpecies(e.species, formatId))
    : matched;
  const visible = legal.slice(0, MAX_VISIBLE_ROWS);
  const isTruncated = legal.length > MAX_VISIBLE_ROWS;

  return (
    <div
      className="flex h-full flex-1 flex-col overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2 md:px-4">
        <h2 className="text-sm font-semibold">Choose a species</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Filters — search + tier chips + role/type/move/stats */}
      <SpeciesFilters
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        currentTeam={currentTeam}
        totalCount={speciesIndex.length}
        filteredCount={legal.length}
      />

      {/* Truncation banner */}
      {isTruncated && (
        <div className="text-muted-foreground border-b px-4 py-1.5 text-xs">
          Showing {MAX_VISIBLE_ROWS} of {legal.length} results — search to
          narrow.
        </div>
      )}

      {/* Rows + sticky header. The header reads HP / Atk / Def / SpA / SpD /
          Spe / BST, mirrored from the SpeciesRow grid template. */}
      <div className="flex-1 overflow-y-auto" data-testid="species-rows">
        <SpeciesRowsHeader />
        {visible.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No Pokémon match your filters. Try broadening your search.
          </div>
        ) : (
          visible.map((entry) => (
            <SpeciesRow
              key={entry.species}
              entry={entry}
              isCurrent={entry.species === currentSpecies}
              onSelect={() => onSelect(entry.species, "defaults")}
            />
          ))
        )}
      </div>
    </div>
  );
}
