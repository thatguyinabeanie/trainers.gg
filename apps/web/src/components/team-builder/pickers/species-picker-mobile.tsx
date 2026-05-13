"use client";

import { useState } from "react";
import { Filter, Search } from "lucide-react";

import {
  buildSpeciesSearchIndex,
  isLegalSpecies,
  searchSpecies,
  type GameFormat,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../type-symbol-icon";
import { RolePresetsPanel } from "./role-presets-panel";
import {
  getRolesForSpecies,
  ROLE_PRESETS,
  type RoleId,
} from "./role-registry";
import {
  DEFAULT_SPECIES_FILTERS,
  type SpeciesFilterState,
} from "./species-filter-state";
import { SpeciesMobileRow } from "./species-mobile-row";
import { SpeciesSidebar } from "./species-sidebar";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FORMAT_ID = "gen9vgc2025regg";

// Map from RoleId → display label for chip strip.
// RoleIds are kebab-case ("trick-room") but labels are title-case ("Trick Room").
const ROLE_LABEL_BY_ID = new Map(
  ROLE_PRESETS.map((preset) => [preset.id, preset.label])
);

// =============================================================================
// Types
// =============================================================================

type View = "list" | "filters";

interface SpeciesPickerMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | null;
  format: GameFormat | undefined;
  currentTeam?: Array<{ species: string }>;
  onPick: (species: string) => void;
}

// =============================================================================
// SpeciesPickerMobile
// =============================================================================

export function SpeciesPickerMobile({
  open,
  onOpenChange,
  value,
  format,
  currentTeam = [],
  onPick,
}: SpeciesPickerMobileProps) {
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SpeciesFilterState>(
    DEFAULT_SPECIES_FILTERS
  );

  // Build the species index — same logic as desktop picker.
  const fullIndex = buildSpeciesSearchIndex(
    format?.id ?? DEFAULT_FORMAT_ID,
    getRolesForSpecies
  );
  const speciesIndex = format?.id
    ? fullIndex.filter((e) => isLegalSpecies(e.species, format.id))
    : fullIndex;

  const filtered = searchSpecies(speciesIndex, query, {
    types: filters.types,
    ability: filters.ability ?? undefined,
    moves: filters.moves,
    roles: filters.roles.length > 0 ? filters.roles : undefined,
    megaOnly: filters.megaOnly,
    formatId: format?.id,
  });
  // Default sort: BST descending (same as desktop default).
  const matched: SpeciesSearchEntry[] = [...filtered].sort(
    (a, b) => b.bst - a.bst
  );

  const activeFilterCount =
    filters.types.length +
    filters.moves.length +
    filters.roles.length +
    (filters.ability ? 1 : 0) +
    (filters.megaOnly ? 1 : 0);

  // Bucket counts for role-presets — number of matched species with each role.
  const roleCounts = new Map<string, number>();
  for (const entry of matched) {
    for (const roleId of entry.roles ?? []) {
      roleCounts.set(roleId, (roleCounts.get(roleId) ?? 0) + 1);
    }
  }
  const bucketCount = (roleId: RoleId) => roleCounts.get(roleId) ?? 0;

  function handlePick(species: string) {
    onPick(species);
    onOpenChange(false);
  }

  function clearAllFilters() {
    setFilters(DEFAULT_SPECIES_FILTERS);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[95dvh] flex-col gap-0 overflow-hidden rounded-t-[20px] p-0"
      >
        <SheetTitle className="sr-only">
          {view === "list" ? "Choose species" : "Filters"}
        </SheetTitle>

        {/* Drag handle */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/20"
        />

        {/* Bounded container — gives ListView/FiltersView a fixed height to flex within */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "list" ? (
          <ListView
            query={query}
            onQueryChange={setQuery}
            matched={matched}
            speciesIndexCount={speciesIndex.length}
            activeFilterCount={activeFilterCount}
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFilters={() => setView("filters")}
            onPick={handlePick}
            currentSpecies={value}
          />
        ) : (
          <FiltersView
            filters={filters}
            onFiltersChange={setFilters}
            format={format}
            currentTeam={currentTeam}
            bucketCount={bucketCount}
            matchedCount={matched.length}
            onBack={() => setView("list")}
            onClearAll={clearAllFilters}
          />
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// ListView
// =============================================================================

interface ListViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  matched: SpeciesSearchEntry[];
  speciesIndexCount: number;
  activeFilterCount: number;
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  onOpenFilters: () => void;
  onPick: (species: string) => void;
  currentSpecies: string | null;
}

function ListView({
  query,
  onQueryChange,
  matched,
  speciesIndexCount,
  activeFilterCount,
  filters,
  onFiltersChange,
  onOpenFilters,
  onPick,
  currentSpecies,
}: ListViewProps) {
  return (
    <>
      {/* Search header */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <Search className="text-muted-foreground size-4 shrink-0" />
        <input
          type="text"
          placeholder="Search Pokémon, type, ability, or move…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search species"
          className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
            activeFilterCount > 0
              ? "bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
              : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Filter className="size-3" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-sm px-1 text-[9px]">
              {activeFilterCount}
            </span>
          )}
        </button>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {matched.length}/{speciesIndexCount}
        </span>
      </div>

      {/* Active filter chip strip — only when filters active */}
      {activeFilterCount > 0 && (
        <ChipStrip filters={filters} onFiltersChange={onFiltersChange} />
      )}

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {matched.map((entry) => (
          <SpeciesMobileRow
            key={entry.species}
            entry={entry}
            onPick={onPick}
            isSelected={entry.species === currentSpecies}
          />
        ))}
        {matched.length === 0 && (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No Pokémon match these filters.
          </div>
        )}
      </div>
    </>
  );
}

// =============================================================================
// ChipStrip — dismissible active filter pills
// =============================================================================

interface ChipStripProps {
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
}

function ChipStrip({ filters, onFiltersChange }: ChipStripProps) {
  const chipClass =
    "bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium";

  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-1.5 [scrollbar-width:none]">
      {filters.types.map((type) => (
        <button
          key={type}
          type="button"
          aria-label={`Remove ${type} type filter`}
          onClick={() =>
            onFiltersChange({
              ...filters,
              types: filters.types.filter((t) => t !== type),
            })
          }
          className={chipClass}
        >
          <TypeSymbolIcon
            type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
            className="size-3"
          />
          {type}
          <span aria-hidden="true" className="opacity-60">
            ×
          </span>
        </button>
      ))}
      {filters.ability && (
        <button
          type="button"
          aria-label={`Remove ${filters.ability} ability filter`}
          onClick={() => onFiltersChange({ ...filters, ability: null })}
          className={chipClass}
        >
          {filters.ability}
          <span aria-hidden="true" className="opacity-60">
            ×
          </span>
        </button>
      )}
      {filters.moves.map((move) => (
        <button
          key={move}
          type="button"
          aria-label={`Remove ${move} move filter`}
          onClick={() =>
            onFiltersChange({
              ...filters,
              moves: filters.moves.filter((m) => m !== move),
            })
          }
          className={chipClass}
        >
          {move}
          <span aria-hidden="true" className="opacity-60">
            ×
          </span>
        </button>
      ))}
      {filters.roles.map((roleId) => (
        <button
          key={roleId}
          type="button"
          aria-label={`Remove ${ROLE_LABEL_BY_ID.get(roleId) ?? roleId} role filter`}
          onClick={() =>
            onFiltersChange({
              ...filters,
              roles: filters.roles.filter((r) => r !== roleId),
            })
          }
          className={chipClass}
        >
          {ROLE_LABEL_BY_ID.get(roleId) ?? roleId}
          <span aria-hidden="true" className="opacity-60">
            ×
          </span>
        </button>
      ))}
      {filters.megaOnly && (
        <button
          type="button"
          aria-label="Remove Mega only filter"
          onClick={() => onFiltersChange({ ...filters, megaOnly: false })}
          className={chipClass}
        >
          Mega only
          <span aria-hidden="true" className="opacity-60">
            ×
          </span>
        </button>
      )}
    </div>
  );
}

// =============================================================================
// FiltersView
// =============================================================================

interface FiltersViewProps {
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  format: GameFormat | undefined;
  currentTeam: Array<{ species: string }>;
  bucketCount: (roleId: RoleId) => number;
  matchedCount: number;
  onBack: () => void;
  onClearAll: () => void;
}

function FiltersView({
  filters,
  onFiltersChange,
  format,
  currentTeam,
  bucketCount,
  matchedCount,
  onBack,
  onClearAll,
}: FiltersViewProps) {
  return (
    <>
      {/* Header — back · title · clear all */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to results"
          className="text-primary hover:text-primary/80 inline-flex items-center gap-0.5 text-sm font-medium transition-colors"
        >
          <span aria-hidden="true">‹</span> Back
        </button>
        <span className="flex-1 text-center text-sm font-semibold">Filters</span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Filter content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SpeciesSidebar
          filters={filters}
          onFiltersChange={onFiltersChange}
          format={format}
          currentTeam={currentTeam}
        />
        <RolePresetsPanel
          selected={filters.roles}
          onChange={(next) => onFiltersChange({ ...filters, roles: next })}
          bucketCount={bucketCount}
        />
      </div>

      {/* Show N results footer */}
      <div className="shrink-0 border-t border-border p-3">
        <Button className="w-full" onClick={onBack}>
          Show {matchedCount} results
        </Button>
      </div>
    </>
  );
}
