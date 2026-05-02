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

import { useMemo, useRef, useState } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";

import {
  getLearnableMoves,
  getLegalMoves,
  getMoveData,
  legalSetOrPermissive,
  type GameFormat,
} from "@trainers/pokemon";
import { cn } from "@/lib/utils";

import { CATEGORY_ICON_URLS } from "../../move-category-ui";
import { TypeSymbolIcon } from "../../type-symbol-icon";
import {
  DEFAULT_MOVE_FILTERS,
  type MoveCategory,
  type MoveFilterState,
} from "./move-filter-state";
import { MoveSidebar } from "./move-sidebar";
import { RoleChip } from "./role-chip";
import { RolePresetsPanel } from "./role-presets-panel";
import { getRolesForMove } from "./role-registry";

// =============================================================================
// Types
// =============================================================================

type SortCol = "type" | "name" | "category" | "bp" | "acc";
type SortDir = "asc" | "desc";

interface SortState {
  col: SortCol;
  dir: SortDir;
}

interface MovePickerProps {
  value: string | null | undefined;
  species: string;
  format: GameFormat | undefined;
  onPick: (moveName: string) => void;
  onClose: () => void;
}

type MoveRow = {
  name: string;
  data: ReturnType<typeof getMoveData>;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * Shared grid template for header and data rows.
 *
 *   56px              — type icon (h-6 Showdown badge)
 *   56px              — category icon (h-6 Showdown badge)
 *   minmax(140px,1.4fr) — name (fits longest competitive move names)
 *   minmax(0,2fr)     — effect (short description, truncates if cramped)
 *   40px              — BP
 *   48px              — Accuracy
 *   minmax(140px,1fr) — roles chips
 */
const ROW_GRID =
  "grid-cols-[56px_56px_minmax(140px,1.4fr)_minmax(0,2fr)_40px_48px_minmax(140px,1fr)]";

// =============================================================================
// Helpers
// =============================================================================

function sortMoves(rows: MoveRow[], sort: SortState): MoveRow[] {
  const out = [...rows];
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
// SortArrow
// =============================================================================

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return (
    <span aria-hidden="true" className="ml-0.5 inline-block leading-none">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

// =============================================================================
// MoveRow — one row in the virtualized list
// =============================================================================

interface MoveRowProps {
  row: MoveRow;
  isSelected: boolean;
  onSelect: () => void;
  onTypeFilter: (type: string) => void;
  onCategoryFilter: (cat: MoveCategory) => void;
  onRoleFilter: (roleId: string) => void;
}

function MoveRowItem({
  row,
  isSelected,
  onSelect,
  onTypeFilter,
  onCategoryFilter,
  onRoleFilter,
}: MoveRowProps) {
  const { name, data } = row;
  const roles = getRolesForMove(name);

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    // Only handle Enter/Space when the row itself is focused. Nested
    // interactive elements (RoleChip <button>, the Type/Category buttons)
    // bubble keyboard events up to this handler, so without this guard
    // pressing Enter on a chip would both toggle the chip AND select the
    // row (closing the picker).
    if (e.currentTarget !== e.target) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      role="row"
      aria-label={`Select ${name}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKey}
      className={cn(
        "grid h-full w-full cursor-pointer items-center gap-2 border-b px-3 transition-colors focus:outline-none",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        ROW_GRID
      )}
    >
      {/* Type icon — clickable filter affordance. Real <button> for keyboard
          accessibility; stopPropagation prevents the row select from firing. */}
      {data?.type ? (
        <button
          type="button"
          aria-label={`Filter by ${data.type}`}
          title={`Filter by ${data.type}`}
          onClick={(e) => {
            e.stopPropagation();
            onTypeFilter(data.type!);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="focus-visible:ring-primary flex cursor-pointer items-center justify-center rounded outline-none focus-visible:ring-2"
        >
          <TypeSymbolIcon
            type={data.type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
            size={24}
          />
        </button>
      ) : (
        <span className="text-muted-foreground flex justify-center text-xs">
          —
        </span>
      )}

      {/* Category icon — clickable filter affordance (real <button>). */}
      {data?.category && CATEGORY_ICON_URLS[data.category] ? (
        <button
          type="button"
          aria-label={`Filter by ${data.category}`}
          title={`Filter by ${data.category}`}
          onClick={(e) => {
            e.stopPropagation();
            onCategoryFilter(data.category as MoveCategory);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="focus-visible:ring-primary flex cursor-pointer items-center justify-center rounded outline-none focus-visible:ring-2"
        >
          <img
            src={CATEGORY_ICON_URLS[data.category]}
            alt={data.category}
            width={32}
            height={14}
            className="h-6 w-auto [image-rendering:pixelated]"
          />
        </button>
      ) : (
        <span className="text-muted-foreground flex justify-center font-mono text-xs">
          —
        </span>
      )}

      {/* Name */}
      <span className="min-w-0 truncate text-sm font-medium" title={name}>
        {name}
      </span>

      {/* Effect (shortDesc) */}
      <span
        className="text-muted-foreground min-w-0 truncate text-xs"
        title={data?.shortDesc ?? undefined}
      >
        {data?.shortDesc && data.shortDesc !== "No additional effect."
          ? data.shortDesc
          : ""}
      </span>

      {/* BP */}
      <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
        {data?.basePower && data.basePower > 0 ? data.basePower : "—"}
      </span>

      {/* Accuracy */}
      <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
        {data?.accuracy === true || !data?.accuracy ? "—" : `${data.accuracy}%`}
      </span>

      {/* Roles — click-to-filter, stopPropagation on the container */}
      <div
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        className="flex min-w-0 flex-wrap gap-1"
      >
        {roles.map((roleId) => (
          <RoleChip key={roleId} roleId={roleId} onClick={onRoleFilter} />
        ))}
      </div>
    </div>
  );
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
  const [sort, setSort] = useState<SortState>({ col: "name", dir: "asc" });

  const scrollRef = useRef<HTMLDivElement>(null);

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

  const sorted = sortMoves(rows, sort);

  // -------------------------------------------------------------------------
  // Bucket counts for the RolePresetsPanel
  // Manual useMemo justified here: stabilizes the (id: string) => number
  // function reference so RolePresetsPanel doesn't re-render on every keystroke
  // via React Compiler identity checks on the callback argument.
  // -------------------------------------------------------------------------
  const bucketCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      for (const id of getRolesForMove(r.name)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return (id: string) => counts.get(id) ?? 0;
  }, [rows]);

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

  function handleSort(col: SortCol) {
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

  function handleRoleFilter(roleId: string) {
    setFilters((f) =>
      f.roles.includes(roleId)
        ? { ...f, roles: f.roles.filter((r) => r !== roleId) }
        : { ...f, roles: [...f.roles, roleId] }
    );
  }

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------

  function headerBtnClass(col: SortCol) {
    return cn(
      "cursor-pointer select-none transition-colors hover:text-foreground",
      sort.col === col ? "text-foreground" : "text-muted-foreground"
    );
  }

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
        <div className="flex w-[88px] shrink-0 items-center justify-end">
          {(() => {
            const count =
              filters.types.length +
              filters.categories.length +
              filters.roles.length;
            if (count === 0) return null;
            return (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_MOVE_FILTERS)}
                aria-label={`Clear ${count} active ${count === 1 ? "filter" : "filters"}`}
                className="text-primary hover:bg-primary/10 border-primary/30 bg-primary/5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
              >
                {count} {count === 1 ? "filter" : "filters"}
                <span aria-hidden="true" className="text-[10px] opacity-70">
                  ×
                </span>
              </button>
            );
          })()}
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
        <div className="border-border flex w-[380px] flex-shrink-0 flex-col border-r">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MoveSidebar filters={filters} onFiltersChange={setFilters} />
          </div>
          <div className="border-border min-h-0 flex-1 overflow-hidden border-t">
            <RolePresetsPanel
              selected={filters.roles}
              onChange={(roles) => setFilters((f) => ({ ...f, roles }))}
              bucketCount={bucketCount}
              className="h-full"
            />
          </div>
        </div>

        {/* Right — sticky header + virtualized list. Active filter count is
            shown in the search header (not via a separate strip below — that
            produced layout shift the user objected to). */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Sticky table header */}
          <div
            className={cn(
              "bg-card sticky top-0 z-20 grid shrink-0 items-center gap-2 border-b px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase",
              ROW_GRID
            )}
          >
            {/* Type — icon only, no header label */}
            <span />

            {/* Category — icon only, no header label */}
            <span />

            {/* Name — sortable */}
            <button
              type="button"
              className={cn(
                headerBtnClass("name"),
                "flex items-center gap-0.5"
              )}
              onClick={() => handleSort("name")}
              aria-label="Sort by name"
            >
              Name
              <SortArrow active={sort.col === "name"} dir={sort.dir} />
            </button>

            {/* Effect — plain label */}
            <span className="text-muted-foreground">Effect</span>

            {/* BP — sortable */}
            <button
              type="button"
              className={cn(
                headerBtnClass("bp"),
                "flex items-center justify-end gap-0.5"
              )}
              onClick={() => handleSort("bp")}
              aria-label="Sort by base power"
            >
              BP
              <SortArrow active={sort.col === "bp"} dir={sort.dir} />
            </button>

            {/* Accuracy — sortable */}
            <button
              type="button"
              className={cn(
                headerBtnClass("acc"),
                "flex items-center justify-end gap-0.5"
              )}
              onClick={() => handleSort("acc")}
              aria-label="Sort by accuracy"
            >
              Acc
              <SortArrow active={sort.col === "acc"} dir={sort.dir} />
            </button>

            {/* Roles — plain label */}
            <span className="text-muted-foreground">Roles</span>
          </div>

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
                  if (!item) return null;
                  return (
                    <div
                      key={item.name}
                      className="absolute left-0 w-full"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <MoveRowItem
                        row={item}
                        isSelected={item.name === value}
                        onSelect={() => {
                          onPick(item.name);
                          onClose();
                        }}
                        onTypeFilter={handleTypeFilter}
                        onCategoryFilter={handleCategoryFilter}
                        onRoleFilter={handleRoleFilter}
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
