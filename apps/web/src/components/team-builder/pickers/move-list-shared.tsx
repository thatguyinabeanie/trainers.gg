"use client";

/**
 * Shared move list components used by both the MovePicker dialog and the
 * SpeciesExpandedPanel learnset. Keeps the grid layout, sort logic, header,
 * and row rendering in one place.
 */

import Image from "next/image";

import { type MoveData } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../type-symbol-icon";
import { CATEGORY_ICON_URLS } from "../move-category-ui";
import { type MoveCategory } from "./move-filter-state";
import { RoleChip } from "./role-chip";
import { getRolesForMove, type RoleId } from "./role-registry";

// =============================================================================
// Types
// =============================================================================

export type MoveListSortCol = "type" | "name" | "category" | "bp" | "acc";
export type MoveListSortDir = "asc" | "desc";
export type MoveListSortState = { col: MoveListSortCol; dir: MoveListSortDir };

// =============================================================================
// Grid template
// =============================================================================

/**
 * Shared grid template for move list rows.
 *
 *   56px                — type icon
 *   56px                — category icon
 *   minmax(100px,1fr)   — name
 *   40px                — BP
 *   48px                — Accuracy
 *   56px                — Usage (coming soon)
 *   minmax(0,2fr)       — effect (short description)
 *   minmax(140px,1fr)   — roles chips
 */
export const MOVE_LIST_GRID =
  "grid-cols-[56px_56px_minmax(100px,1fr)_40px_48px_56px_minmax(0,2fr)_minmax(140px,1fr)]";

// =============================================================================
// Sort logic
// =============================================================================

export function sortMoveData(
  moves: MoveData[],
  sort: MoveListSortState
): MoveData[] {
  const out = [...moves];
  out.sort((a, b) => {
    let cmp = 0;
    switch (sort.col) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "type":
        cmp = a.type.localeCompare(b.type);
        break;
      case "category":
        cmp = a.category.localeCompare(b.category);
        break;
      case "bp": {
        const ap = a.basePower ?? 0;
        const bp = b.basePower ?? 0;
        cmp = ap - bp;
        break;
      }
      case "acc": {
        const aa = a.accuracy === true ? 101 : (a.accuracy || 0);
        const ba = b.accuracy === true ? 101 : (b.accuracy || 0);
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

function SortArrow({
  active,
  dir,
}: {
  active: boolean;
  dir: MoveListSortDir;
}) {
  if (!active) return null;
  return (
    <span aria-hidden="true" className="ml-0.5 inline-block leading-none">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

// =============================================================================
// MoveListHeader
// =============================================================================

interface MoveListHeaderProps {
  sort: MoveListSortState;
  onSort: (col: MoveListSortCol) => void;
  className?: string;
}

export function MoveListHeader({ sort, onSort, className }: MoveListHeaderProps) {
  function headerBtnClass(col: MoveListSortCol) {
    return sort.col === col
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground";
  }

  return (
    <div
      className={cn(
        "grid items-center gap-2 border-b px-3 py-1.5 text-xs font-semibold tracking-wide uppercase",
        MOVE_LIST_GRID,
        className
      )}
    >
      {/* Type — no label */}
      <span />
      {/* Category — no label */}
      <span />

      {/* Name */}
      <button
        type="button"
        className={cn(headerBtnClass("name"), "flex items-center gap-0.5")}
        onClick={() => onSort("name")}
        aria-pressed={sort.col === "name"}
        aria-label={`Sort by name${sort.col === "name" ? `, ${sort.dir === "asc" ? "ascending" : "descending"}` : ""}`}
      >
        Name
        <SortArrow active={sort.col === "name"} dir={sort.dir} />
      </button>

      {/* BP */}
      <button
        type="button"
        className={cn(
          headerBtnClass("bp"),
          "flex items-center justify-end gap-0.5"
        )}
        onClick={() => onSort("bp")}
        aria-pressed={sort.col === "bp"}
        aria-label={`Sort by base power${sort.col === "bp" ? `, ${sort.dir === "asc" ? "ascending" : "descending"}` : ""}`}
      >
        BP
        <SortArrow active={sort.col === "bp"} dir={sort.dir} />
      </button>

      {/* Accuracy */}
      <button
        type="button"
        className={cn(
          headerBtnClass("acc"),
          "flex items-center justify-end gap-0.5"
        )}
        onClick={() => onSort("acc")}
        aria-pressed={sort.col === "acc"}
        aria-label={`Sort by accuracy${sort.col === "acc" ? `, ${sort.dir === "asc" ? "ascending" : "descending"}` : ""}`}
      >
        ACC
        <SortArrow active={sort.col === "acc"} dir={sort.dir} />
      </button>

      {/* Usage — placeholder */}
      <span
        className="text-muted-foreground/50 cursor-default text-center"
        title="Coming soon"
      >
        USE%
      </span>

      {/* Effect */}
      <span className="text-muted-foreground">Effect</span>

      {/* Roles */}
      <span className="text-muted-foreground">Roles</span>
    </div>
  );
}

// =============================================================================
// MoveListRow
// =============================================================================

interface MoveListRowProps {
  move: MoveData;
  /** Whether this row is visually highlighted (e.g. matches a filter). */
  isHighlighted?: boolean;
  /** Whether this row is selected (e.g. current move in picker). */
  isSelected?: boolean;
  /** Called when the row is clicked (e.g. to pick a move). */
  onSelect?: () => void;
  /** Called when the type icon is clicked (filter affordance). */
  onTypeFilter?: (type: string) => void;
  /** Called when the category icon is clicked (filter affordance). */
  onCategoryFilter?: (category: MoveCategory) => void;
  /** Called when a role chip is clicked (filter affordance). */
  onRoleFilter?: (roleId: RoleId) => void;
}

export function MoveListRow({
  move,
  isHighlighted,
  isSelected,
  onSelect,
  onTypeFilter,
  onCategoryFilter,
  onRoleFilter,
}: MoveListRowProps) {
  const roles = getRolesForMove(move.name);

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!onSelect) return;
    if (e.currentTarget !== e.target) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      role={onSelect ? "row" : undefined}
      aria-label={onSelect ? `Select ${move.name}` : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={onSelect ? handleKey : undefined}
      className={cn(
        "grid h-full items-center gap-2 border-b px-3 py-1 text-xs transition-colors",
        onSelect && "cursor-pointer focus:outline-none",
        onSelect &&
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        isHighlighted && !isSelected && "bg-primary/10",
        MOVE_LIST_GRID
      )}
    >
      {/* Type icon */}
      {move.type ? (
        onTypeFilter ? (
          <button
            type="button"
            aria-label={`Filter by ${move.type}`}
            title={`Filter by ${move.type}`}
            onClick={(e) => {
              e.stopPropagation();
              onTypeFilter(move.type);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="focus-visible:ring-primary flex cursor-pointer items-center justify-center rounded outline-none focus-visible:ring-2"
          >
            <TypeSymbolIcon
              type={move.type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
              size={24}
            />
          </button>
        ) : (
          <div className="flex items-center justify-center">
            <TypeSymbolIcon
              type={move.type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
              size={24}
            />
          </div>
        )
      ) : (
        <span className="text-muted-foreground flex justify-center text-xs">
          —
        </span>
      )}

      {/* Category icon */}
      {move.category && CATEGORY_ICON_URLS[move.category] ? (
        onCategoryFilter ? (
          <button
            type="button"
            aria-label={`Filter by ${move.category}`}
            title={`Filter by ${move.category}`}
            onClick={(e) => {
              e.stopPropagation();
              onCategoryFilter(move.category);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="focus-visible:ring-primary flex cursor-pointer items-center justify-center rounded outline-none focus-visible:ring-2"
          >
            <Image
              src={CATEGORY_ICON_URLS[move.category]!}
              alt={move.category}
              width={32}
              height={14}
              unoptimized
              className="h-6 w-auto [image-rendering:pixelated]"
            />
          </button>
        ) : (
          <div className="flex items-center justify-center">
            <Image
              src={CATEGORY_ICON_URLS[move.category]!}
              alt={move.category}
              width={32}
              height={14}
              unoptimized
              className="h-6 w-auto [image-rendering:pixelated]"
            />
          </div>
        )
      ) : (
        <span className="text-muted-foreground flex justify-center font-mono text-xs">
          —
        </span>
      )}

      {/* Name */}
      <span
        className={cn(
          "min-w-0 truncate text-sm font-medium",
          isHighlighted && "text-foreground"
        )}
        title={move.name}
      >
        {move.name}
      </span>

      {/* BP */}
      <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
        {move.basePower > 0 ? move.basePower : "—"}
      </span>

      {/* Accuracy */}
      <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
        {move.accuracy === true || !move.accuracy
          ? "—"
          : `${move.accuracy}%`}
      </span>

      {/* Usage — coming soon placeholder */}
      <span
        className="text-muted-foreground/30 cursor-default text-center font-mono text-xs tabular-nums"
        title="Coming soon"
      >
        —
      </span>

      {/* Effect (shortDesc) */}
      <span
        className="text-muted-foreground min-w-0 truncate text-xs"
        title={move.shortDesc}
      >
        {move.shortDesc !== "No additional effect." ? move.shortDesc : ""}
      </span>

      {/* Roles */}
      <div
        role="presentation"
        onClick={onRoleFilter ? (e) => e.stopPropagation() : undefined}
        className="flex min-w-0 gap-1 overflow-x-auto"
      >
        {roles.map((roleId) => (
          <RoleChip
            key={roleId}
            roleId={roleId}
            onClick={onRoleFilter}
          />
        ))}
      </div>
    </div>
  );
}
