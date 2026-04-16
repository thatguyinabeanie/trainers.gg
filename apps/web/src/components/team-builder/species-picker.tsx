"use client";

import { useState } from "react";

import { searchSpecies, type SpeciesSearchEntry } from "@trainers/pokemon";

import { Button } from "@/components/ui/button";

import { SpeciesDetail } from "./species-detail";
import {
  SpeciesFilters,
  DEFAULT_FILTERS,
  type SpeciesFilterState,
} from "./species-filters";
import { SpeciesTable } from "./species-table";

// =============================================================================
// Types
// =============================================================================

interface SpeciesPickerProps {
  speciesIndex: SpeciesSearchEntry[];
  currentTeam: Array<{ species: string }>;
  currentSpecies: string | null;
  /** Active format ID. When set, illegal species are dimmed + select is blocked. */
  formatId?: string;
  onSelect: (species: string, mode: "defaults" | "blank") => void;
  onCancel: () => void;
}

// =============================================================================
// SpeciesPicker
// =============================================================================

/**
 * Full-width species picker overlay for the team builder.
 *
 * Left 52%: filterable/sortable species table (single click to preview,
 * double click to select with defaults).
 * Right 48%: species detail panel with type info, competitive moves,
 * team fit analysis, and add buttons.
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
  const [previewedSpecies, setPreviewedSpecies] = useState<string | null>(null);

  // Derived — computed during render (React Compiler handles optimization)
  const filteredEntries = searchSpecies(speciesIndex, query, {
    types: filters.types,
    abilities: filters.abilities,
    moves: filters.moves,
    minBaseStat: filters.minBaseStat,
    maxBaseStat: filters.maxBaseStat,
  });

  const previewedEntry =
    previewedSpecies !== null
      ? (filteredEntries.find((e) => e.species === previewedSpecies) ?? null)
      : null;

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      onKeyDown={(e) => {
        // Escape closes the picker from anywhere inside it
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

      {/* Filters */}
      <SpeciesFilters
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        currentTeam={currentTeam}
        totalCount={speciesIndex.length}
        filteredCount={filteredEntries.length}
      />

      {/* Split layout — stacked vertically on mobile, side-by-side on md+ */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Table — full width on mobile, 52% on md+ */}
        <div className="w-full overflow-y-auto border-r md:w-[52%]">
          <SpeciesTable
            entries={filteredEntries}
            previewedSpecies={previewedSpecies}
            currentSpecies={currentSpecies}
            formatId={formatId}
            onPreview={setPreviewedSpecies}
            onSelect={(species) => onSelect(species, "defaults")}
          />
        </div>

        {/* Detail panel — full width on mobile, 48% on md+ */}
        <div className="max-h-[40vh] w-full overflow-y-auto md:max-h-none md:w-[48%]">
          <SpeciesDetail
            species={previewedEntry}
            currentTeam={currentTeam}
            formatId={formatId}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}
