"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Search } from "lucide-react";

import {
  ALL_TYPES,
  buildSpeciesSearchIndex,
  getAllLegalMoves,
  isLegalSpecies,
  searchSpecies,
  type GameFormat,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";
import {
  getPokemonSprite,
  getShowdownTypeIconUrl,
} from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { AbilityCell } from "./ability-cell";
import { RolePresetsPanel } from "./role-presets-panel";
import { getRolesForSpecies } from "./role-registry";
import {
  DEFAULT_SPECIES_FILTERS,
  type SpeciesFilterState,
} from "./species-filter-state";
import { SpeciesSidebar } from "./species-sidebar";
import { SpeciesSmartSearch } from "./species-smart-search";

// =============================================================================
// Constants
// =============================================================================

/** Stat threshold for the "high stat" highlight (matches the spec's 110+). */
const HIGH_STAT_THRESHOLD = 110;

/**
 * Shared Tailwind grid template for each data row.
 *
 *   40px              — sprite circle
 *   minmax(120px,1fr) — name column (truncates if needed)
 *   56px              — Type 1 (Showdown icon)
 *   56px              — Type 2 (icon, or em-dash for monotype)
 *   minmax(0,1fr)×3   — slot1 / slot2 / hidden abilities (truncate-safe,
 *                       share remaining horizontal space proportionally)
 *   repeat(6,30px)    — HP/Atk/Def/SpA/SpD/Spe stat cells (3-digit safe)
 *   40px              — BST rollup
 *
 * Total fixed: 40 + 56 + 56 + (6×30) + 40 = 372px; flex columns share the rest
 * with `gap-2` (12 gaps × 8px = 96px). Comfortably fits inside the right
 * column at any dialog width >= ~900px.
 */
const ROW_GRID =
  "grid-cols-[40px_minmax(120px,1.4fr)_56px_56px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_repeat(6,30px)_40px]";

/** Default format ID used when no format is active. */
const DEFAULT_FORMAT_ID = "gen9vgc2025regg";

// =============================================================================
// Sort
// =============================================================================

type SortCol = "name" | "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "bst";
type SortDir = "asc" | "desc";

interface SortState {
  col: SortCol;
  dir: SortDir;
}

function sortSpecies(
  rows: SpeciesSearchEntry[],
  sort: SortState
): SpeciesSearchEntry[] {
  const out = [...rows];
  out.sort((a, b) => {
    let cmp = 0;
    switch (sort.col) {
      case "name":
        cmp = a.species.localeCompare(b.species);
        break;
      case "hp":
        cmp = a.baseStats.hp - b.baseStats.hp;
        break;
      case "atk":
        cmp = a.baseStats.atk - b.baseStats.atk;
        break;
      case "def":
        cmp = a.baseStats.def - b.baseStats.def;
        break;
      case "spa":
        cmp = a.baseStats.spa - b.baseStats.spa;
        break;
      case "spd":
        cmp = a.baseStats.spd - b.baseStats.spd;
        break;
      case "spe":
        cmp = a.baseStats.spe - b.baseStats.spe;
        break;
      case "bst":
        cmp = a.bst - b.bst;
        break;
    }
    if (cmp === 0) cmp = a.species.localeCompare(b.species);
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return out;
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
// SortHeaderButton — sticky-header sortable column label
// =============================================================================

interface SortHeaderButtonProps {
  col: SortCol;
  label: string;
  align: "left" | "center" | "right";
  sort: SortState;
  onSort: (col: SortCol) => void;
}

function SortHeaderButton({
  col,
  label,
  align,
  sort,
  onSort,
}: SortHeaderButtonProps) {
  const isActive = sort.col === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      aria-label={`Sort by ${label}`}
      aria-pressed={isActive}
      className={cn(
        "hover:text-foreground flex items-center gap-0.5 transition-colors select-none",
        align === "left" && "justify-start",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      {isActive && (
        <span aria-hidden="true" className="text-[8px] leading-none">
          {sort.dir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// SpeciesRow — one rich row in the picker
// =============================================================================

interface SpeciesRowProps {
  entry: SpeciesSearchEntry;
  isCurrent: boolean;
  onSelect: () => void;
  onFilterAbility: (ability: string) => void;
}

function SpeciesRow({
  entry,
  isCurrent,
  onSelect,
  onFilterAbility,
}: SpeciesRowProps) {
  const sprite = getPokemonSprite(entry.species);

  return (
    // Using div[role="row"] instead of <button> because this row contains
    // nested interactive elements (ability cells, role chips). Nested buttons
    // are invalid HTML. The full-row click target is handled by an invisible
    // overlay button behind the row content.
    <div
      role="row"
      aria-label={`Select ${entry.species}`}
      className={cn(
        "hover:bg-muted/60 relative grid w-full cursor-pointer items-center gap-2 border-b px-4 py-2 text-left transition-colors",
        ROW_GRID,
        isCurrent && "bg-primary/5"
      )}
    >
      {/* Full-row invisible click target — sits behind interactive cells */}
      <button
        type="button"
        aria-label={`Select ${entry.species}`}
        onClick={onSelect}
        className="absolute inset-0 z-0"
        tabIndex={-1}
      />

      {/* Sprite — 44px circle */}
      <div className="bg-primary/10 relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full">
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

      {/* Name */}
      <span className="text-foreground relative z-10 min-w-0 truncate text-sm font-semibold">
        {entry.species}
      </span>

      {/* Type 1 — Showdown rectangular type icon (h-6 matches the editor) */}
      <div className="relative z-10 flex min-w-0 items-center">
        {entry.types[0] ? (
          <img
            src={getShowdownTypeIconUrl(entry.types[0])}
            alt={entry.types[0]}
            className="h-6 w-auto [image-rendering:pixelated]"
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>

      {/* Type 2 — em-dash for monotypes */}
      <div className="relative z-10 flex min-w-0 items-center">
        {entry.types[1] ? (
          <img
            src={getShowdownTypeIconUrl(entry.types[1])}
            alt={entry.types[1]}
            className="h-6 w-auto [image-rendering:pixelated]"
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>

      {/* Slot 1 ability */}
      <div className="relative z-10 min-w-0 overflow-hidden">
        <AbilityCell
          name={entry.abilitySlot1 ?? null}
          slot="slot1"
          onFilter={onFilterAbility}
        />
      </div>

      {/* Slot 2 ability */}
      <div className="relative z-10 min-w-0 overflow-hidden">
        <AbilityCell
          name={entry.abilitySlot2 ?? null}
          slot="slot2"
          onFilter={onFilterAbility}
        />
      </div>

      {/* Hidden ability */}
      <div className="relative z-10 min-w-0 overflow-hidden">
        <AbilityCell
          name={entry.hiddenAbility ?? null}
          slot="hidden"
          onFilter={onFilterAbility}
        />
      </div>

      {/* HP */}
      <span
        className={cn(
          "relative z-10 text-center font-mono text-xs tabular-nums",
          statValueClass(entry.baseStats.hp)
        )}
      >
        {entry.baseStats.hp}
      </span>
      {/* Atk */}
      <span
        className={cn(
          "relative z-10 text-center font-mono text-xs tabular-nums",
          statValueClass(entry.baseStats.atk)
        )}
      >
        {entry.baseStats.atk}
      </span>
      {/* Def */}
      <span
        className={cn(
          "relative z-10 text-center font-mono text-xs tabular-nums",
          statValueClass(entry.baseStats.def)
        )}
      >
        {entry.baseStats.def}
      </span>
      {/* SpA */}
      <span
        className={cn(
          "relative z-10 text-center font-mono text-xs tabular-nums",
          statValueClass(entry.baseStats.spa)
        )}
      >
        {entry.baseStats.spa}
      </span>
      {/* SpD */}
      <span
        className={cn(
          "relative z-10 text-center font-mono text-xs tabular-nums",
          statValueClass(entry.baseStats.spd)
        )}
      >
        {entry.baseStats.spd}
      </span>
      {/* Spe */}
      <span
        className={cn(
          "relative z-10 text-center font-mono text-xs tabular-nums",
          statValueClass(entry.baseStats.spe)
        )}
      >
        {entry.baseStats.spe}
      </span>

      {/* BST */}
      <span className="border-border/60 text-foreground relative z-10 border-l pl-1.5 text-center font-mono text-xs font-semibold tabular-nums">
        {entry.bst}
      </span>
    </div>
  );
}

// =============================================================================
// SpeciesPicker
// =============================================================================

/**
 * Redesigned species picker with 3-column layout:
 *   left: SpeciesSidebar (type grid, ability, mega toggle, moves)
 *   middle: RolePresetsPanel (26 roles, 7 groups)
 *   right: FilterChipsBar + virtualized species table (or SmartSearch overlay)
 *
 * When the search input is non-empty, SpeciesSmartSearch replaces the table,
 * categorizing results as Types / Moves / Abilities / Pokémon.
 *
 * Designed to render inside a <PopoverContent> — the consumer provides the
 * bounding box. This component only supplies flex flex-col with min-h-0 so
 * the rows region scrolls inside the popover.
 */
export function SpeciesPicker({
  value,
  format,
  currentTeam = [],
  onPick,
  onClose,
}: SpeciesPickerProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SpeciesFilterState>(
    DEFAULT_SPECIES_FILTERS
  );
  const [sort, setSort] = useState<SortState>({ col: "name", dir: "asc" });

  // Scroll container ref for the virtualizer
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "name" ? "asc" : "desc" }
    );
  }

  // Build the species index — expensive, memoize by format id.
  // getRolesForSpecies is stable (module-level fn) so this only rebuilds when
  // format changes. Manual useMemo is justified here because buildSpeciesSearchIndex
  // can process 1200+ species and the React Compiler cannot hoist module-level
  // function calls across renders.
  const fullIndex = useMemo(
    () =>
      buildSpeciesSearchIndex(
        format?.id ?? DEFAULT_FORMAT_ID,
        (abilities, speciesName, formatId) =>
          getRolesForSpecies(abilities, speciesName, formatId)
      ),
    [format?.id]
  );

  // Pre-filter by format legality so the picker only ever surfaces species
  // legal in this format. The denominator shown to the user reflects the
  // format roster, not all of gen 9.
  const speciesIndex = useMemo(
    () =>
      format?.id
        ? fullIndex.filter((e) => isLegalSpecies(e.species, format.id))
        : fullIndex,
    [fullIndex, format?.id]
  );

  // Derived list — search + filter (legality already applied to index)
  const filtered = searchSpecies(speciesIndex, query, {
    types: filters.types,
    ability: filters.ability ?? undefined,
    moves: filters.moves,
    roles: filters.roles.length > 0 ? filters.roles : undefined,
    megaOnly: filters.megaOnly,
    formatId: format?.id,
  });
  const matched = sortSpecies(filtered, sort);

  // Bucket counts — for each role, how many matched species carry it
  const bucketCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of matched) {
      for (const roleId of entry.roles ?? []) {
        counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
      }
    }
    return (roleId: string) => counts.get(roleId) ?? 0;
  }, [matched]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Called by SpeciesSmartSearch "Filter" buttons and type icons. */
  function handleSmartFilter({
    type,
    move,
    ability,
  }: {
    type?: string;
    move?: string;
    ability?: string;
  }) {
    setFilters((prev) => {
      let next = { ...prev };
      if (type && !prev.types.includes(type)) {
        next = { ...next, types: [...prev.types, type] };
      }
      if (move && !prev.moves.includes(move)) {
        next = { ...next, moves: [...prev.moves, move] };
      }
      if (ability) {
        next = { ...next, ability };
      }
      return next;
    });
    setQuery("");
  }

  function handleTypeFilter(type: string) {
    setFilters((prev) => {
      if (prev.types.includes(type)) return prev;
      return { ...prev, types: [...prev.types, type] };
    });
  }

  function handleAbilityFilter(ability: string) {
    setFilters((prev) => ({ ...prev, ability }));
  }

  // ---------------------------------------------------------------------------
  // Active filter count — drives the badge in the search header
  // ---------------------------------------------------------------------------

  const activeFilterCount =
    filters.types.length +
    filters.moves.length +
    filters.roles.length +
    (filters.ability ? 1 : 0) +
    (filters.megaOnly ? 1 : 0);

  // ---------------------------------------------------------------------------
  // Enter key handler on search input
  // ---------------------------------------------------------------------------

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = query.trim();
    if (!q) return;

    // 1. Exact species match — pick it and close
    const exact = speciesIndex.find(
      (entry) => entry.species.toLowerCase() === q.toLowerCase()
    );
    if (exact) {
      onPick(exact.species);
      onClose();
      return;
    }

    // 2. Top-of-priority type filter
    const matchedType = (ALL_TYPES as readonly string[]).find((t) =>
      t.toLowerCase().startsWith(q.toLowerCase())
    );
    if (matchedType) {
      handleTypeFilter(matchedType);
      setQuery("");
      return;
    }

    // 3. Top-of-priority move filter (if format is known)
    if (format?.id) {
      const moves = getAllLegalMoves(format.id);
      const matchedMove = moves.find((m) =>
        m.toLowerCase().startsWith(q.toLowerCase())
      );
      if (matchedMove) {
        setFilters((prev) =>
          prev.moves.includes(matchedMove)
            ? prev
            : { ...prev, moves: [...prev.moves, matchedMove] }
        );
        setQuery("");
        return;
      }
    }

    // 4. Top-of-priority ability filter from index
    const abilitySet = new Set<string>();
    for (const entry of speciesIndex) {
      for (const ab of [
        entry.abilitySlot1,
        entry.abilitySlot2,
        entry.hiddenAbility,
      ]) {
        if (ab && ab.toLowerCase().startsWith(q.toLowerCase())) {
          abilitySet.add(ab);
        }
      }
    }
    const [firstAbility] = abilitySet;
    if (firstAbility) {
      handleAbilityFilter(firstAbility);
      setQuery("");
    }
  }

  // ---------------------------------------------------------------------------
  // Virtualizer
  // ---------------------------------------------------------------------------

  const rowVirtualizer = useVirtualizer({
    count: matched.length,
    getScrollElement: () => scrollRef.current,
    // Dense row height: 44px sprite (size-11) + py-2 top + py-2 bottom ≈ 60px
    estimateSize: () => 60,
    overscan: 5,
  });

  const showSmartSearch = query.trim().length > 0;

  function clearAllFilters() {
    setFilters(DEFAULT_SPECIES_FILTERS);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="bg-popover text-popover-foreground flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl"
      data-testid="species-picker"
    >
      {/* -------------------------------------------------------------------- */}
      {/* Header — search input + count                                         */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <Search className="text-muted-foreground size-4 shrink-0" />
        <input
          type="text"
          placeholder="Search Pokémon, type, ability, or move…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          aria-label="Search species"
          data-testid="species-search"
          className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        {/* Fixed-width slot reserves space for the filter badge so the search
            input does not shrink when filters become active (no layout shift). */}
        <div className="flex w-[88px] shrink-0 items-center justify-end">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-primary hover:bg-primary/10 border-primary/30 bg-primary/5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
              aria-label={`Clear ${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`}
            >
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"}
              <span aria-hidden="true" className="text-[10px] opacity-70">
                ×
              </span>
            </button>
          )}
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {matched.length} of {speciesIndex.length}
        </span>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3-column body                                                          */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left rail — sidebar (top) + role presets (bottom). Single column,
            stacked vertically. Both halves scroll independently. */}
        <div className="border-border flex w-[380px] flex-shrink-0 flex-col border-r">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SpeciesSidebar
              filters={filters}
              onFiltersChange={setFilters}
              format={format}
              currentTeam={currentTeam}
            />
          </div>
          <div className="border-border min-h-0 flex-1 overflow-hidden border-t">
            <RolePresetsPanel
              selected={filters.roles}
              onChange={(next) =>
                setFilters((prev) => ({ ...prev, roles: next }))
              }
              bucketCount={bucketCount}
              className="h-full"
            />
          </div>
        </div>

        {/* Right — list/smart-search. Active filters are surfaced via the
            filter-count badge in the search header (no chips strip below
            the search bar — that produced layout shift the user objected to). */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Smart-search overlay or virtualized table */}
          {showSmartSearch ? (
            <div
              className="flex-1 overflow-y-auto"
              data-testid="smart-search-container"
            >
              <SpeciesSmartSearch
                query={query}
                index={speciesIndex}
                format={format}
                onFilter={handleSmartFilter}
                onPick={(species) => {
                  onPick(species);
                  onClose();
                }}
              />
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex-1 overflow-x-hidden overflow-y-auto"
              data-testid="species-rows"
            >
              {/* Sticky sortable header */}
              <div
                className={cn(
                  "bg-card sticky top-0 z-20 grid items-center gap-2 border-b px-4 py-2 text-[10px] font-semibold tracking-wider uppercase",
                  ROW_GRID
                )}
                role="row"
              >
                <span aria-hidden="true" />
                <SortHeaderButton
                  col="name"
                  label="Name"
                  align="left"
                  sort={sort}
                  onSort={handleSort}
                />
                <span className="text-muted-foreground text-[9px]">Type 1</span>
                <span className="text-muted-foreground text-[9px]">Type 2</span>
                <span className="text-muted-foreground text-[9px]">
                  Ability 1
                </span>
                <span className="text-muted-foreground text-[9px]">
                  Ability 2
                </span>
                <span className="text-muted-foreground text-[9px]">Hidden</span>
                <SortHeaderButton
                  col="hp"
                  label="HP"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeaderButton
                  col="atk"
                  label="Atk"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeaderButton
                  col="def"
                  label="Def"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeaderButton
                  col="spa"
                  label="SpA"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeaderButton
                  col="spd"
                  label="SpD"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeaderButton
                  col="spe"
                  label="Spe"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeaderButton
                  col="bst"
                  label="BST"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
              </div>

              {matched.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center text-sm">
                  No Pokémon match your filters. Try broadening your search.
                </div>
              ) : (
                <div
                  className="relative w-full"
                  style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const entry = matched[virtualRow.index];
                    if (!entry) return null;
                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute right-0 left-0"
                        style={{ top: virtualRow.start }}
                      >
                        <SpeciesRow
                          entry={entry}
                          isCurrent={entry.species === value}
                          onSelect={() => onPick(entry.species)}
                          onFilterAbility={handleAbilityFilter}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
