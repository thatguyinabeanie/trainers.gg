"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  Filter,
  PanelLeftOpen,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";

import {
  ALL_TYPES,
  buildSpeciesSearchIndex,
  getAllLegalMoves,
  isLegalSpecies,
  getLegalMoves,
  getMoveData,
  searchSpecies,
  type GameFormat,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../type-symbol-icon";
import { useFormatUsageData } from "../use-format-usage-data";
import { AbilityCell } from "./ability-cell";
import { FilterDialogShell } from "./filter-dialog-shell";
import { RolePresetsPanel } from "./role-presets-panel";
import {
  getRolesForMove,
  getRolesForSpecies,
  type RoleId,
} from "./role-registry";
import {
  DEFAULT_SPECIES_FILTERS,
  type SpeciesFilterState,
} from "./species-filter-state";
import { SpeciesSidebar } from "./species-sidebar";
import { SpeciesSmartSearch } from "./species-smart-search";
import { SpeciesExpandedPanel } from "./species-expanded-panel";
import { STAT_HEADER_COLORS } from "./stat-header-colors";
import { normalizeSpeciesSlug } from "./usage-slug";

// =============================================================================
// Constants
// =============================================================================

/** Stat threshold for the "high stat" highlight (matches the spec's 110+). */
const HIGH_STAT_THRESHOLD = 110;

/** Default format ID used when no format is active. */
const DEFAULT_FORMAT_ID = "gen9vgc2025regg";

// =============================================================================
// Shared grid template
// =============================================================================

/**
 * ONE shared grid template applied to BOTH the sticky header row and every
 * `SpeciesRow` container. Using a CSS grid (not flex) guarantees that every
 * column track is defined once, so header cells and row cells are always
 * aligned — flex per-cell widths drift when cell content differs.
 *
 * Column order (left → right):
 *   1.25rem  chevron   (expand/collapse toggle)
 *   3.5rem   sprite    (Pokémon image)
 *   minmax(11rem,2fr)  name      (species name, truncated)
 *   4.5rem   types     (1–2 type icons)
 *   minmax(8rem,1.5fr) abilities (slot1/slot2/hidden)
 *   repeat(6,3rem)     stats     (HP Atk Def SpA SpD Spe)
 *   3rem     BST
 *   3.5rem   USG       (usage %, right of BST)
 *   minmax(0,2fr)      moves     (matching move chips)
 *
 * rem values map to the Tailwind spacing scale:
 *   1.25rem = w-5 (20px), 3rem = w-12 (48px), 3.5rem = w-14 (56px),
 *   4.5rem = w-18 (72px), 8rem = min-w-32, 11rem = min-w-44
 */
const ROW_GRID =
  "grid grid-cols-[1.25rem_3.5rem_minmax(11rem,2fr)_4.5rem_minmax(8rem,1.5fr)_repeat(6,3rem)_3rem_3.5rem_minmax(0,2fr)] items-center gap-2";

// =============================================================================
// Sort
// =============================================================================

type SortCol =
  | "name"
  | "hp"
  | "atk"
  | "def"
  | "spa"
  | "spd"
  | "spe"
  | "bst"
  | "usage";
type SortDir = "asc" | "desc";

type SortState = {
  col: SortCol;
  dir: SortDir;
};

function sortSpecies(
  rows: SpeciesSearchEntry[],
  sort: SortState,
  usageMap?: Map<string, { usagePct: number }>
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
      case "usage": {
        // Species with no usage data sort to the end regardless of direction.
        const aPct =
          usageMap?.get(normalizeSpeciesSlug(a.species))?.usagePct ?? -1;
        const bPct =
          usageMap?.get(normalizeSpeciesSlug(b.species))?.usagePct ?? -1;
        // Both unknown → treat as equal (fall through to name tie-break)
        if (aPct === -1 && bPct === -1) {
          cmp = 0;
          break;
        }
        // One unknown → always place last (negate direction so it's always last)
        if (aPct === -1) return 1;
        if (bPct === -1) return -1;
        cmp = aPct - bPct;
        break;
      }
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
      <span
        aria-hidden="true"
        className={cn("text-xs leading-none", !isActive && "invisible")}
      >
        {isActive && sort.dir === "asc" ? "↑" : "↓"}
      </span>
    </button>
  );
}

// =============================================================================
// SpeciesRow — one rich row in the picker
// =============================================================================

interface SpeciesRowProps {
  entry: SpeciesSearchEntry;
  isCurrent: boolean;
  isExpanded: boolean;
  formatId: string;
  filteredMoves: readonly string[];
  filteredRoles: readonly RoleId[];
  /** Pre-looked-up usage %, or undefined when no data exists for this species. */
  usagePct: number | undefined;
  onSelect: () => void;
  onToggleExpand: () => void;
  onFilterAbility: (ability: string) => void;
}

function SpeciesRow({
  entry,
  isCurrent,
  isExpanded,
  formatId,
  filteredMoves,
  filteredRoles,
  usagePct,
  onSelect,
  onToggleExpand,
  onFilterAbility,
}: SpeciesRowProps) {
  const sprite = getPokemonSprite(entry.species);

  // Compute moves matching active role filters (only when roles are active)
  const matchingMoveNames: string[] = [];
  if (filteredRoles.length > 0) {
    const legalMoves = getLegalMoves(entry.species, formatId);
    if (legalMoves && typeof legalMoves !== "symbol") {
      for (const moveName of legalMoves) {
        const moveRoles = getRolesForMove(moveName);
        if (filteredRoles.some((role) => moveRoles.includes(role))) {
          const data = getMoveData(moveName);
          if (data) matchingMoveNames.push(data.name);
        }
      }
    }
  }

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
    <div className={cn(!isExpanded && "border-b")}>
      {/* Using `<div role="row" tabIndex={0}>` instead of a wrapping `<button>`
          because the row contains nested interactive elements (AbilityCell
          `<button>`s) and nested buttons are invalid HTML. The row is itself
          keyboard-accessible (tabIndex + onKeyDown handles Enter/Space) and
          mouse-accessible (onClick fires onSelect). Nested AbilityCell buttons
          stopPropagation so cell clicks don't also select the row. */}
      <div
        role="row"
        aria-label={`Select ${entry.species}`}
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleRowKey}
        className={cn(
          ROW_GRID,
          "hover:bg-muted/60 focus-visible:bg-muted/80 focus-visible:outline-primary relative w-full cursor-pointer px-4 py-2 text-left transition-colors outline-none focus-visible:outline-2",
          isCurrent && "bg-primary/5"
        )}
      >
        {/* Track 1: Expand/collapse chevron */}
        <button
          type="button"
          aria-label={
            isExpanded ? `Collapse ${entry.species}` : `Expand ${entry.species}`
          }
          aria-expanded={isExpanded}
          aria-controls={`panel-${entry.species}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className={cn(
            "text-muted-foreground hover:text-foreground relative z-10 flex items-center justify-center transition-transform",
            isExpanded && "rotate-90"
          )}
        >
          <ChevronRight className="size-4" />
        </button>

        {/* Track 2: Sprite — 48px circle inside the 3.5rem track */}
        <div className="bg-primary/10 relative z-10 flex size-12 items-center justify-center self-center rounded-full">
          <Image
            src={sprite.url}
            alt={entry.species}
            width={40}
            height={40}
            className={cn(
              "size-10 object-contain",
              sprite.pixelated && "[image-rendering:pixelated]"
            )}
            unoptimized
          />
        </div>

        {/* Track 3: Name */}
        <span className="text-foreground relative z-10 min-w-0 truncate text-sm font-semibold">
          {entry.species}
        </span>

        {/* Track 4: Types — two icons */}
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

        {/* Track 5: Abilities — all slots stacked: • regular, ★ hidden */}
        <div className="relative z-10 flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="text-muted-foreground/50 inline-block w-2.5 shrink-0 text-center text-xs">
              ●
            </span>
            <AbilityCell
              name={entry.abilitySlot1 ?? null}
              slot="slot1"
              onFilter={onFilterAbility}
            />
          </div>
          {entry.abilitySlot2 && (
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="text-muted-foreground/50 inline-block w-2.5 shrink-0 text-center text-xs">
                ●
              </span>
              <AbilityCell
                name={entry.abilitySlot2}
                slot="slot2"
                onFilter={onFilterAbility}
              />
            </div>
          )}
          {entry.hiddenAbility && (
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="inline-block w-2.5 shrink-0 text-center text-xs text-amber-400/70">
                ★
              </span>
              <AbilityCell
                name={entry.hiddenAbility}
                slot="hidden"
                onFilter={onFilterAbility}
              />
            </div>
          )}
        </div>

        {/* Tracks 6–11: Stats (HP Atk Def SpA SpD Spe) */}
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

        {/* Track 12: BST */}
        <span className="border-border/60 text-foreground relative z-10 border-l pl-1.5 text-center font-mono text-xs font-semibold tabular-nums">
          {entry.bst}
        </span>

        {/* Track 13: USG — latest period usage % for this species */}
        <span
          className={cn(
            "relative z-10 text-center font-mono text-xs tabular-nums",
            usagePct != null && usagePct > 0
              ? "text-foreground"
              : "text-muted-foreground"
          )}
          data-testid={`usg-cell-${entry.species}`}
        >
          {usagePct != null && usagePct > 0
            ? `${usagePct.toFixed(1)}%`
            : "—"}
        </span>

        {/* Track 14: Matching move chips */}
        <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-1 overflow-hidden">
          {matchingMoveNames.map((name) => (
            <span
              key={name}
              className="bg-primary/8 text-primary border-primary/15 shrink-0 rounded-full border px-1.5 py-px text-xs leading-tight font-medium"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded content — learnset panel */}
      {isExpanded && (
        <div className="border-b">
          <SpeciesExpandedPanel
            id={`panel-${entry.species}`}
            species={entry.species}
            formatId={formatId}
            filteredMoves={filteredMoves}
            filteredRoles={filteredRoles}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Warm-up helper
// =============================================================================

/**
 * Eagerly builds the species search index for a format so the first open of
 * the species picker is instant. Call from the workspace on mount via
 * requestIdleCallback.
 */
export function warmSpeciesIndex(formatId: string): void {
  buildSpeciesSearchIndex(formatId, getRolesForSpecies);
}

// =============================================================================
// CollapsedSidebarStrip
// =============================================================================

/**
 * Thin icon strip shown when the filter sidebar is collapsed.
 *
 * Shows vertically stacked icon buttons representing each filter section,
 * with small badges indicating active filter counts. Clicking any icon
 * expands the sidebar. The top button is the expand toggle.
 */
function CollapsedSidebarStrip({
  filters,
  onExpand,
}: {
  filters: SpeciesFilterState;
  onExpand: () => void;
}) {
  const typeCount = filters.types.length;
  const moveCount = filters.moves.length;
  const roleCount = filters.roles.length;
  const abilityCount = filters.abilities.length;
  const totalActive =
    typeCount +
    moveCount +
    roleCount +
    abilityCount +
    (filters.megaOnly ? 1 : 0);

  return (
    <div className="bg-muted/50 flex h-full flex-col items-center gap-1 py-2">
      {/* Expand toggle */}
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand filter sidebar"
        className="text-muted-foreground hover:text-foreground hover:bg-accent relative rounded p-1.5 transition-colors"
      >
        <PanelLeftOpen className="size-4" />
      </button>

      <div className="bg-border my-1 h-px w-6" />

      {/* Filter indicator — total count */}
      <button
        type="button"
        onClick={onExpand}
        aria-label={`${totalActive} active filters — expand sidebar`}
        className={cn(
          "relative rounded p-1.5 transition-colors",
          totalActive > 0
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Filter className="size-4" />
        {totalActive > 0 && (
          <span className="bg-primary absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs leading-none font-bold text-white">
            {totalActive}
          </span>
        )}
      </button>

      {/* Type filter indicator */}
      <button
        type="button"
        onClick={onExpand}
        aria-label={`${typeCount} type filters — expand sidebar`}
        className={cn(
          "relative rounded p-1.5 transition-colors",
          typeCount > 0
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Sparkles className="size-4" />
        {typeCount > 0 && (
          <span className="bg-primary absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs leading-none font-bold text-white">
            {typeCount}
          </span>
        )}
      </button>

      {/* Ability indicator */}
      <button
        type="button"
        onClick={onExpand}
        aria-label={
          abilityCount > 0
            ? `${abilityCount} ability filter${abilityCount > 1 ? "s" : ""} — expand sidebar`
            : "Ability filter — expand sidebar"
        }
        className={cn(
          "relative rounded p-1.5 transition-colors",
          abilityCount > 0
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Zap className="size-4" />
        {abilityCount > 0 && (
          <span className="bg-primary absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs leading-none font-bold text-white">
            {abilityCount}
          </span>
        )}
      </button>

      {/* Move filter indicator */}
      <button
        type="button"
        onClick={onExpand}
        aria-label={`${moveCount} move filters — expand sidebar`}
        className={cn(
          "relative rounded p-1.5 transition-colors",
          moveCount > 0
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Swords className="size-4" />
        {moveCount > 0 && (
          <span className="bg-primary absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs leading-none font-bold text-white">
            {moveCount}
          </span>
        )}
      </button>

      {/* Role filter indicator */}
      {roleCount > 0 && (
        <button
          type="button"
          onClick={onExpand}
          aria-label={`${roleCount} role filters — expand sidebar`}
          className="text-primary hover:bg-primary/10 relative rounded p-1.5 transition-colors"
        >
          <span className="text-xs leading-none font-bold">R</span>
          <span className="bg-primary absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs leading-none font-bold text-white">
            {roleCount}
          </span>
        </button>
      )}
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

  // Track which species row is expanded (null = none expanded)
  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null);

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

  // Format-wide usage data — Map<normalizedSlug, FormatUsageRow>.
  // Provides USG % for every species in the picker without per-row fetches.
  const usageMap = useFormatUsageData(format);

  // Derived list — search + filter (legality already applied to index)
  const filtered = searchSpecies(speciesIndex, query, {
    types: filters.types,
    abilities: filters.abilities.length > 0 ? filters.abilities : undefined,
    moves: filters.moves,
    roles: filters.roles.length > 0 ? filters.roles : undefined,
    megaOnly: filters.megaOnly,
    formatId: format?.id,
  });
  const matched = sortSpecies(filtered, sort, usageMap);

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
      if (ability && !prev.abilities.includes(ability)) {
        next = { ...next, abilities: [...prev.abilities, ability] };
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
    setFilters((prev) => {
      if (prev.abilities.includes(ability)) return prev;
      return { ...prev, abilities: [...prev.abilities, ability] };
    });
  }

  // ---------------------------------------------------------------------------
  // Active filter count — drives the badge in the search header
  // ---------------------------------------------------------------------------

  const activeFilterCount =
    filters.types.length +
    filters.moves.length +
    filters.roles.length +
    filters.abilities.length +
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

  // The smart-search banner + sticky header sit ABOVE the virtualized rows
  // inside the same scroll container. Measure that offset so we can pass it
  // to the virtualizer as `scrollMargin` — without it, virtualRow.start is
  // measured from scrollRef's top while the rows actually live further down,
  // and the virtualizer unmounts top rows prematurely as you scroll.
  const virtualParentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const showSmartSearch = query.trim().length > 0;

  useEffect(() => {
    const measure = () => {
      if (!virtualParentRef.current) return;
      setScrollMargin(virtualParentRef.current.offsetTop);
    };
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (virtualParentRef.current) observer.observe(virtualParentRef.current);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [showSmartSearch, query]);

  const rowVirtualizer = useVirtualizer({
    count: matched.length,
    getScrollElement: () => scrollRef.current,
    // Estimate: collapsed row ~80px, expanded row will be measured dynamically
    estimateSize: (index) => {
      const entry = matched[index];
      return entry?.species === expandedSpecies ? 400 : 80;
    },
    overscan: 5,
    scrollMargin,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  function clearAllFilters() {
    setFilters(DEFAULT_SPECIES_FILTERS);
    setExpandedSpecies(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <FilterDialogShell
      data-testid="species-picker"
      search={{
        value: query,
        onChange: setQuery,
        onKeyDown: handleSearchKeyDown,
        placeholder: "Search Pokémon, type, ability, or move…",
        ariaLabel: "Search species",
        "data-testid": "species-search",
      }}
      headerCenter={
        /* Fixed-width slot reserves space for the filter badge so the search
            input does not shrink when filters become active (no layout shift). */
        <div className="flex w-22 shrink-0 items-center justify-end">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-primary hover:bg-primary/10 border-primary/30 bg-primary/5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors"
              aria-label={`Clear ${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`}
            >
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"}
              <span aria-hidden="true" className="text-xs opacity-70">
                ×
              </span>
            </button>
          )}
        </div>
      }
      headerCount={
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {matched.length} of {speciesIndex.length}
        </span>
      }
      rail={
        <>
          <div className="min-h-0 overflow-y-auto">
            <SpeciesSidebar
              filters={filters}
              onFiltersChange={setFilters}
              format={format}
              currentTeam={currentTeam}
            />
          </div>
          <div className="bg-muted/20 border-border min-h-0 flex-1 overflow-y-auto border-t">
            <RolePresetsPanel
              selected={filters.roles}
              onChange={(next) =>
                setFilters((prev) => ({
                  ...prev,
                  roles: next,
                }))
              }
              bucketCount={bucketCount}
            />
          </div>
        </>
      }
      railFooter={
        <button
          type="button"
          onClick={clearAllFilters}
          className="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full rounded px-2 py-1.5 text-xs font-medium transition-colors"
        >
          Clear all filters
        </button>
      }
      collapsedStrip={(onExpand) => (
        <CollapsedSidebarStrip filters={filters} onExpand={onExpand} />
      )}
    >
      {/* Right — table (always rendered, filtered by query). When the
          query is non-empty the SpeciesSmartSearch panel renders above
          the table to offer "promote query into structured filter"
          shortcuts (Type / Moves / Abilities). Pokémon matches stay in
          the table below as full rich rows — they are not duplicated
          in the smart-search panel. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-x-hidden overflow-y-auto"
          data-testid="species-rows"
        >
          {/* Smart-search banner scrolls UP with the content as you move
                through results. The virtualizer's `scrollMargin` accounts
                for the banner + sticky header height (measured via
                virtualParentRef.offsetTop), so top species rows stay
                mounted even when the banner is partly visible. */}
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

          <div>
            {/* Sticky sortable header — same ROW_GRID as SpeciesRow */}
            <div
              className={cn(
                ROW_GRID,
                "bg-card sticky top-0 z-20 border-b px-4 py-2 text-xs font-semibold tracking-wider uppercase"
              )}
              role="row"
            >
              {/* Track 1: chevron placeholder */}
              <span aria-hidden="true" />
              {/* Track 2: sprite placeholder */}
              <span aria-hidden="true" />
              {/* Track 3: Name */}
              <div>
                <SortHeaderButton
                  col="name"
                  label="Name"
                  align="left"
                  sort={sort}
                  onSort={handleSort}
                />
              </div>
              {/* Track 4: Types */}
              <span className="text-muted-foreground text-center text-xs whitespace-nowrap">
                Types
              </span>
              {/* Track 5: Abilities */}
              <span className="text-muted-foreground min-w-0 truncate text-center text-xs whitespace-nowrap">
                Abilities
              </span>
              {/* Track 6: HP */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="hp"
                  label="HP"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.hp}
                />
              </div>
              {/* Track 7: ATK */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="atk"
                  label="ATK"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.atk}
                />
              </div>
              {/* Track 8: DEF */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="def"
                  label="DEF"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.def}
                />
              </div>
              {/* Track 9: SPA */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="spa"
                  label="SPA"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.spa}
                />
              </div>
              {/* Track 10: SPD */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="spd"
                  label="SPD"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.spd}
                />
              </div>
              {/* Track 11: SPE */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="spe"
                  label="SPE"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                  colorClass={STAT_HEADER_COLORS.spe}
                />
              </div>
              {/* Track 12: BST */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="bst"
                  label="BST"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
              </div>
              {/* Track 13: USG */}
              <div className="flex justify-center">
                <SortHeaderButton
                  col="usage"
                  label="USG"
                  align="center"
                  sort={sort}
                  onSort={handleSort}
                />
              </div>
              {/* Track 14: Moves */}
              <span className="text-muted-foreground min-w-0 truncate text-center text-xs whitespace-nowrap">
                Moves
              </span>
            </div>

            {matched.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm">
                No Pokémon match your filters. Try broadening your search.
              </div>
            ) : (
              <div
                ref={virtualParentRef}
                className="relative w-full"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = matched[virtualRow.index];
                  if (!entry) return null;
                  return (
                    <div
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className="absolute right-0 left-0"
                      style={{ top: virtualRow.start - scrollMargin }}
                    >
                      <SpeciesRow
                        entry={entry}
                        isCurrent={entry.species === value}
                        isExpanded={entry.species === expandedSpecies}
                        formatId={format?.id ?? DEFAULT_FORMAT_ID}
                        filteredMoves={filters.moves}
                        filteredRoles={filters.roles}
                        usagePct={
                          usageMap.get(normalizeSpeciesSlug(entry.species))
                            ?.usagePct
                        }
                        onSelect={() => onPick(entry.species)}
                        onToggleExpand={() =>
                          setExpandedSpecies((prev) =>
                            prev === entry.species ? null : entry.species
                          )
                        }
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
    </FilterDialogShell>
  );
}
