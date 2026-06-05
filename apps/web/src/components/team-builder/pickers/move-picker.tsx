"use client";

/**
 * MovePicker — redesigned 3-column species-picker-style layout for move
 * selection. Composes MoveSidebar (left, Type/Category filters), RolePresetsPanel
 * (middle, 26 roles), and a virtualized move table with a new Roles column (right).
 *
 * Type and Category filtering has moved from column-header popovers into the
 * persistent sidebar. Each row's Type icon, Category icon, and Role chips are
 * click-to-filter affordances — they add to the active filter set without
 * triggering move selection.
 */

import { useRef, useState } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";

import {
  getLearnableMoves,
  getLegalMoves,
  getMoveData,
  legalSetOrPermissive,
  type GameFormat,
  type MoveData,
} from "@trainers/pokemon";
import { cn } from "@/lib/utils";

import { useUsageData } from "../use-usage-data";
import {
  DEFAULT_MOVE_FILTERS,
  type MoveCategory,
  type MoveFilterState,
} from "./move-filter-state";
import {
  MoveListHeader,
  MoveListRow,
  normalizeMoveKey,
  type MoveListSortCol,
  type MoveListSortState,
} from "./move-list-shared";
import { MoveSidebar } from "./move-sidebar";
import { RolePresetsPanel } from "./role-presets-panel";
import { getRolesForMove, type RoleId } from "./role-registry";

// =============================================================================
// Types
// =============================================================================

interface MovePickerProps {
  value: string | null | undefined;
  species: string;
  format: GameFormat | undefined;
  onPick: (moveName: string) => void;
  onClose: () => void;
}

type MoveRow = {
  name: string;
  data: MoveData | null;
};

type MoveUsageEntry = {
  currentPct: number;
  series: number[];
};

// =============================================================================
// Helpers
// =============================================================================

function sortMoves(
  rows: MoveRow[],
  sort: MoveListSortState,
  usageMap: Map<string, MoveUsageEntry>
): MoveRow[] {
  const out = [...rows];

  // When usage data is available and no explicit column sort has been chosen by
  // the user (default "name" asc state), sort descending by latest usage % so
  // the most commonly used moves float to the top. Moves with no usage data
  // (pct === 0) sort after moves with data, tie-broken by name.
  const hasUsageData = usageMap.size > 0;
  const isDefaultNameSort = sort.col === "name" && sort.dir === "asc";

  if (hasUsageData && isDefaultNameSort) {
    out.sort((a, b) => {
      const au = usageMap.get(normalizeMoveKey(a.name))?.currentPct ?? 0;
      const bu = usageMap.get(normalizeMoveKey(b.name))?.currentPct ?? 0;
      if (bu !== au) return bu - au; // higher usage first
      return a.name.localeCompare(b.name); // tie-break by name
    });
    return out;
  }

  out.sort((a, b) => {
    let cmp = 0;
    switch (sort.col) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "type":
        cmp = (a.data?.type ?? "").localeCompare(b.data?.type ?? "");
        break;
      case "category":
        cmp = (a.data?.category ?? "").localeCompare(b.data?.category ?? "");
        break;
      case "bp": {
        const ap = a.data?.basePower ?? 0;
        const bp = b.data?.basePower ?? 0;
        cmp = ap - bp;
        break;
      }
      case "acc": {
        const aa = a.data?.accuracy === true ? 101 : (a.data?.accuracy ?? 0);
        const ba = b.data?.accuracy === true ? 101 : (b.data?.accuracy ?? 0);
        cmp = aa - ba;
        break;
      }
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return out;
}

// =============================================================================
// MovePicker
// =============================================================================

/**
 * Searchable, filterable, sortable move picker.
 *
 * 3-column layout: MoveSidebar (left) | RolePresetsPanel (middle) | list (right).
 * The list panel features a FilterChipsBar above a virtualized table with
 * click-to-filter affordances on Type icon, Category icon, and Role chips.
 *
 * Rows use `<div role="row">` (not `<button>`) so nested interactive elements
 * (chips + filter icons) remain valid HTML.
 */
export function MovePicker({
  value,
  species,
  format,
  onPick,
  onClose,
}: MovePickerProps) {
  const [filters, setFilters] = useState<MoveFilterState>(DEFAULT_MOVE_FILTERS);
  const [sort, setSort] = useState<MoveListSortState>({ col: "name", dir: "asc" });

  const scrollRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Usage data — fetch rollup for the species in the current format.
  // Provides per-move currentPct (latest period) and series (oldest→newest)
  // for the USE% column and sparklines.
  // -------------------------------------------------------------------------

  const { data: usagePeriods } = useUsageData(species, format);

  // Build slug-normalized map: normalizedMoveName → { currentPct, series }.
  // The DB move values may not match the builder's internal ids exactly (e.g.
  // "Fake Out" vs "fake-out"), so both sides are normalized before lookup.
  const usageMap = new Map<string, MoveUsageEntry>();
  if (usagePeriods && usagePeriods.length > 0) {
    // Collect pct across periods per move key, keeping insertion order
    // (oldest → newest per the hook's guarantee).
    const seriesAccumulator = new Map<string, number[]>();
    for (const period of usagePeriods) {
      for (const m of period.moves) {
        const key = normalizeMoveKey(m.value);
        const existing = seriesAccumulator.get(key);
        if (existing) {
          existing.push(m.pct);
        } else {
          seriesAccumulator.set(key, [m.pct]);
        }
      }
    }
    // The last period is the latest; grab currentPct from the final element.
    for (const [key, series] of seriesAccumulator) {
      const currentPct = series[series.length - 1] ?? 0;
      usageMap.set(key, { currentPct, series });
    }
  }

  // -------------------------------------------------------------------------
  // Candidate move list — species-legal in format or all learnable
  // -------------------------------------------------------------------------

  const legalMoves = format
    ? Array.from(
        legalSetOrPermissive(getLegalMoves(species, format.id)) ??
          getLearnableMoves(species)
      ).sort()
    : getLearnableMoves(species);

  // -------------------------------------------------------------------------
  // Filter pipeline
  // -------------------------------------------------------------------------

  const lower = filters.search.toLowerCase();
  const rows: MoveRow[] = [];
  for (const name of legalMoves) {
    const data = getMoveData(name);

    // types: multi-select OR — skip only when array is non-empty and no match
    if (filters.types.length > 0 && !filters.types.includes(data?.type ?? ""))
      continue;

    // categories: multi-select OR
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(data?.category as MoveCategory)
    )
      continue;

    // roles: multi-select AND — keep only if move carries every selected role
    if (filters.roles.length > 0) {
      const moveRoles = getRolesForMove(name);
      if (!filters.roles.every((r) => moveRoles.includes(r))) continue;
    }

    // search — matches name, shortDesc, type, or category
    if (lower) {
      const matches =
        name.toLowerCase().includes(lower) ||
        data?.shortDesc?.toLowerCase().includes(lower) ||
        data?.type?.toLowerCase().includes(lower) ||
        data?.category?.toLowerCase().includes(lower);
      if (!matches) continue;
    }

    rows.push({ name, data });
  }

  const sorted = sortMoves(rows, sort, usageMap);

  // -------------------------------------------------------------------------
  // Bucket counts for the RolePresetsPanel
  // -------------------------------------------------------------------------
  const roleCounts = new Map<string, number>();
  for (const r of rows) {
    for (const id of getRolesForMove(r.name)) {
      roleCounts.set(id, (roleCounts.get(id) ?? 0) + 1);
    }
  }
  const bucketCount = (id: string) => roleCounts.get(id) ?? 0;

  // -------------------------------------------------------------------------
  // Virtualizer
  // -------------------------------------------------------------------------

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSort(col: MoveListSortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "name" || col === "type" ? "asc" : "desc" }
    );
  }

  function handleTypeFilter(type: string) {
    setFilters((f) =>
      f.types.includes(type)
        ? { ...f, types: f.types.filter((t) => t !== type) }
        : { ...f, types: [...f.types, type] }
    );
  }

  function handleCategoryFilter(cat: MoveCategory) {
    setFilters((f) =>
      f.categories.includes(cat)
        ? { ...f, categories: f.categories.filter((c) => c !== cat) }
        : { ...f, categories: [...f.categories, cat] }
    );
  }

  function handleRoleFilter(roleId: RoleId) {
    setFilters((f) =>
      f.roles.includes(roleId)
        ? { ...f, roles: f.roles.filter((r) => r !== roleId) }
        : { ...f, roles: [...f.roles, roleId] }
    );
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const activeFilterCount =
    filters.types.length + filters.categories.length + filters.roles.length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={cn(
        "bg-popover text-popover-foreground flex h-full min-h-0 w-full flex-1",
        "flex-col overflow-hidden rounded-xl"
      )}
    >
      {/* Header — search input + filter count + result count + close button */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <input
          autoFocus
          type="text"
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
          placeholder="Search by name, effect, type, category…"
          className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        {/* Fixed-width slot reserves space so the search input width is stable
            whether or not filters are active (no layout shift on toggle). */}
        <div className="flex w-22 shrink-0 items-center justify-end">
          {activeFilterCount > 0 && (
            <button
              type="button"
              // Preserve `search` so the chip's behavior matches its label —
              // activeFilterCount counts types/categories/roles only, so
              // resetting the entire filter object would also wipe a typed
              // query the user did not ask to clear.
              onClick={() =>
                setFilters((f) => ({ ...DEFAULT_MOVE_FILTERS, search: f.search }))
              }
              aria-label={`Clear ${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`}
              className="text-primary hover:bg-primary/10 border-primary/30 bg-primary/5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
            >
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"}
              <span aria-hidden="true" className="text-xs opacity-70">
                ×
              </span>
            </button>
          )}
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {sorted.length} of {legalMoves.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground ml-1 flex size-6 items-center justify-center rounded text-base leading-none"
        >
          ×
        </button>
      </div>

      {/* 2-column body — left rail stacks sidebar (top) + role presets
          (bottom); right column hosts the filter chips + virtualized table. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left rail — sidebar on top, role presets below */}
        <div className="border-border flex w-96 flex-shrink-0 flex-col border-r">
          <div className="shrink-0">
            <MoveSidebar filters={filters} onFiltersChange={setFilters} />
          </div>
          <div className="bg-muted/20 border-border min-h-0 flex-1 overflow-y-auto border-t">
            <RolePresetsPanel
              selected={filters.roles}
              onChange={(roles) =>
                setFilters((f) => ({ ...f, roles }))
              }
              bucketCount={bucketCount}
            />
          </div>
          <div className="border-border shrink-0 border-t p-2.5">
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...DEFAULT_MOVE_FILTERS, search: f.search }))}
              className="border-border bg-background text-muted-foreground hover:border-destructive/50 hover:text-destructive w-full rounded-md border py-1 text-xs transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Right — sticky header + virtualized list. Active filter count is
            shown in the search header (not via a separate strip below — that
            produced layout shift the user objected to). */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Sticky table header */}
          <MoveListHeader
            sort={sort}
            onSort={handleSort}
            className="bg-card sticky top-0 z-20 shrink-0"
          />

          {/* Virtualized rows */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-hidden overflow-y-auto"
          >
            {sorted.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No moves found
              </p>
            ) : (
              <div
                className="relative w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = sorted[virtualRow.index];
                  if (!item || !item.data) return null;
                  // Ensure `name` is present — getMoveData includes it in
                  // production but test mocks may omit it. item.name is the
                  // canonical source.
                  const moveData = { ...item.data, name: item.name };
                  return (
                    <div
                      key={item.name}
                      className="absolute left-0 w-full"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <MoveListRow
                        move={moveData}
                        isSelected={item.name === value}
                        onSelect={() => {
                          onPick(item.name);
                          onClose();
                        }}
                        onTypeFilter={handleTypeFilter}
                        onCategoryFilter={(cat) =>
                          handleCategoryFilter(cat)
                        }
                        onRoleFilter={handleRoleFilter}
                        usagePct={
                          usageMap.get(normalizeMoveKey(item.name))
                            ?.currentPct
                        }
                        usageSeries={
                          usageMap.get(normalizeMoveKey(item.name))?.series
                        }
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
  );
}
