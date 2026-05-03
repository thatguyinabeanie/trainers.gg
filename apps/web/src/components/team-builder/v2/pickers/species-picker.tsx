"use client";

import { useRef, useState } from "react";
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
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../../type-symbol-icon";
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
 *   64px              — sprite circle (size-16, sprite rendered at size-14)
 *   minmax(180px,2fr) — name column. 180px floor fits "Kangaskhan-Mega",
 *                       "Aegislash-Blade", "Charizard-Mega-X", etc. without
 *                       truncation.
 *   72px              — Types (two wordless icons side-by-side; em-dash
 *                       for monotypes)
 *   minmax(160px,2fr) — Regular abilities — slot 1 stacked above slot 2.
 *                       If the species has only one regular ability, only
 *                       that ability renders (no empty placeholder line).
 *   minmax(180px,2fr) — Hidden ability (italic + muted). 180px floor so
 *                       names like "Magic Guard", "Heavy Metal", "Aroma
 *                       Veil", "Sheer Force" don't truncate.
 *   repeat(6,44px)    — HP/Atk/Def/SpA/SpD/Spe stat cells. 44px so the
 *                       active sort arrow (e.g. "SPA ↓") doesn't push the
 *                       header label into the neighboring cell. Empty
 *                       buffer on each side keeps adjacent labels from
 *                       visually touching.
 *   48px              — BST rollup (large enough for "BST ↓" when sorted
 *                       by base-stat total)
 */
const ROW_GRID =
  "grid-cols-[64px_minmax(180px,2fr)_72px_minmax(160px,2fr)_minmax(180px,2fr)_repeat(6,44px)_48px]";

/** Default format ID used when no format is active. */
const DEFAULT_FORMAT_ID = "gen9vgc2025regg";

// =============================================================================
// Sort
// =============================================================================

type SortCol = "name" | "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "bst";
type SortDir = "asc" | "desc";

type SortState = {
  col: SortCol;
  dir: SortDir;
};

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
      default:
        sort.col satisfies never;
        return 0;
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
  /**
   * Optional Tailwind color class. When set, the label is rendered in this
   * color (e.g. the rose/orange/amber stat palette from the editor) and
   * stays colored whether or not the column is the active sort.
   */
  colorClass?: string;
}

function SortHeaderButton({
  col,
  label,
  align,
  sort,
  onSort,
  colorClass,
}: SortHeaderButtonProps) {
  const isActive = sort.col === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      aria-label={`Sort by ${label}`}
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-0.5 whitespace-nowrap transition-colors select-none",
        align === "left" && "justify-start",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        // When a color is provided (stat columns), use it always; otherwise
        // toggle muted/foreground based on active sort state.
        colorClass
          ? cn(colorClass, "hover:opacity-80")
          : isActive
            ? "text-foreground hover:text-foreground"
            : "text-muted-foreground hover:text-foreground"
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

/** Header stat colors — picker uses short stat-key names (atk/def/spa/spd/spe) and adds bst. Hues mirror STAT_COLOR_CLASS in stat-types.ts. */
const STAT_HEADER_COLORS: Record<
  "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "bst",
  string
> = {
  hp: "text-rose-500 dark:text-rose-400",
  atk: "text-orange-500 dark:text-orange-400",
  def: "text-amber-500 dark:text-amber-400",
  spa: "text-sky-500 dark:text-sky-400",
  spd: "text-emerald-500 dark:text-emerald-400",
  spe: "text-fuchsia-500 dark:text-fuchsia-400",
  bst: "text-foreground",
};

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

  function handleRowKey(e: React.KeyboardEvent<HTMLDivElement>) {
    // Only respond when focus is on the row itself (not on a nested
    // interactive child like AbilityCell or a future filter button).
    if (e.currentTarget !== e.target) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    // Using `<div role="row" tabIndex={0}>` instead of a wrapping `<button>`
    // because the row contains nested interactive elements (AbilityCell
    // `<button>`s) and nested buttons are invalid HTML. The row is itself
    // keyboard-accessible (tabIndex + onKeyDown handles Enter/Space) and
    // mouse-accessible (onClick fires onSelect). Nested AbilityCell buttons
    // stopPropagation so cell clicks don't also select the row.
    <div
      role="row"
      aria-label={`Select ${entry.species}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleRowKey}
      className={cn(
        "hover:bg-muted/60 focus-visible:bg-muted/80 focus-visible:outline-primary relative grid w-full cursor-pointer items-center gap-2 border-b px-4 py-2 text-left transition-colors outline-none focus-visible:outline-2",
        ROW_GRID,
        isCurrent && "bg-primary/5"
      )}
    >
      {/* Sprite — 64px circle, image rendered at 56px */}
      <div className="bg-primary/10 relative z-10 flex size-16 shrink-0 items-center justify-center rounded-full">
        <Image
          src={sprite.url}
          alt={entry.species}
          width={56}
          height={56}
          className={cn(
            "size-14 object-contain",
            sprite.pixelated && "[image-rendering:pixelated]"
          )}
          unoptimized
        />
      </div>

      {/* Name */}
      <span className="text-foreground relative z-10 min-w-0 truncate text-sm font-semibold">
        {entry.species}
      </span>

      <div className="relative z-10 flex min-w-0 items-center gap-1.5">
        {entry.types[0] ? (
          <TypeSymbolIcon
            type={
              entry.types[0] as Parameters<typeof TypeSymbolIcon>[0]["type"]
            }
            size={28}
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
        {entry.types[1] ? (
          <TypeSymbolIcon
            type={
              entry.types[1] as Parameters<typeof TypeSymbolIcon>[0]["type"]
            }
            size={28}
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>

      {/* Regular abilities — slot 1 stacked above slot 2, left-aligned.
          If the species has only one regular ability, render just that one. */}
      <div className="relative z-10 flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden">
        {entry.abilitySlot1 ? (
          <AbilityCell
            name={entry.abilitySlot1}
            slot="slot1"
            onFilter={onFilterAbility}
          />
        ) : null}
        {entry.abilitySlot2 ? (
          <AbilityCell
            name={entry.abilitySlot2}
            slot="slot2"
            onFilter={onFilterAbility}
          />
        ) : null}
      </div>

      {/* Hidden ability — italic + muted, left-aligned in its own column */}
      <div className="relative z-10 flex min-w-0 items-center overflow-hidden">
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
  // Default sort: BST descending — surfaces the strongest legal Pokémon
  // overall before the user narrows by stat or role.
  const [sort, setSort] = useState<SortState>({ col: "bst", dir: "desc" });

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
  // buildSpeciesSearchIndex caches by (resolver, formatId) at the module level
  // via a WeakMap keyed on the getRoles function identity. Pass
  // getRolesForSpecies directly — wrapping it in an inline lambda would change
  // identity per render and defeat the cache. React Compiler tracks downstream
  // stability — no manual memo needed.
  const fullIndex = buildSpeciesSearchIndex(
    format?.id ?? DEFAULT_FORMAT_ID,
    getRolesForSpecies
  );

  // Pre-filter by format legality so the picker only ever surfaces species
  // legal in this format. The denominator shown to the user reflects the
  // format roster, not all of gen 9.
  const speciesIndex = format?.id
    ? fullIndex.filter((e) => isLegalSpecies(e.species, format.id))
    : fullIndex;

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

  // Bucket counts — for each role, how many matched species carry it.
  // React Compiler memoizes this lookup based on the matched array identity.
  const roleCounts = new Map<string, number>();
  for (const entry of matched) {
    for (const roleId of entry.roles ?? []) {
      roleCounts.set(roleId, (roleCounts.get(roleId) ?? 0) + 1);
    }
  }
  const bucketCount = (roleId: string) => roleCounts.get(roleId) ?? 0;

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
    // Row height: 64px sprite (size-16) + py-2 top + py-2 bottom ≈ 80px
    estimateSize: () => 80,
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
                setFilters((prev) => ({
                  ...prev,
                  roles: next,
                }))
              }
              bucketCount={bucketCount}
              className="h-full"
            />
          </div>
        </div>

        {/* Right — table (always rendered, filtered by query). When the
            query is non-empty the SpeciesSmartSearch panel renders above
            the table to offer "promote query into structured filter"
            shortcuts (Type / Moves / Abilities). Pokémon matches stay in
            the table below as full rich rows — they are not duplicated
            in the smart-search panel. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Smart-search banner sits ABOVE the scroll container so it
              doesn't shift the virtualizer's row offsets. Keeping it inside
              the scroll element causes @tanstack/react-virtual to unmount
              top rows prematurely as you scroll, since virtualRow.start is
              measured from scrollRef but actual row offsets include the
              banner's height. */}
          {showSmartSearch && (
            <div
              className="border-border border-b"
              data-testid="smart-search-container"
            >
              <SpeciesSmartSearch
                query={query}
                index={speciesIndex}
                format={format}
                onFilter={handleSmartFilter}
              />
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 overflow-x-hidden overflow-y-auto"
            data-testid="species-rows"
          >
            <div>
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
                <span className="text-muted-foreground text-center text-[9px] whitespace-nowrap">
                  Types
                </span>
                <span className="text-muted-foreground text-[9px] whitespace-nowrap">
                  Abilities
                </span>
                <span className="text-muted-foreground text-[9px] whitespace-nowrap">
                  Hidden
                </span>
                <SortHeaderButton
                  col="hp"
                  label="HP"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.hp}
                />
                <SortHeaderButton
                  col="atk"
                  label="ATK"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.atk}
                />
                <SortHeaderButton
                  col="def"
                  label="DEF"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.def}
                />
                <SortHeaderButton
                  col="spa"
                  label="SPA"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.spa}
                />
                <SortHeaderButton
                  col="spd"
                  label="SPD"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.spd}
                />
                <SortHeaderButton
                  col="spe"
                  label="SPE"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.spe}
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
          </div>
        </div>
      </div>
    </div>
  );
}
