"use client";

import { useState } from "react";
import Image from "next/image";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type SpeciesSearchEntry } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TYPE_PILL_COLORS } from "./type-colors";

// =============================================================================
// Constants
// =============================================================================

const MAX_VISIBLE_ROWS = 200;

type SortColumn = "name" | "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "bst";

type SortDirection = "asc" | "desc";

// =============================================================================
// Types
// =============================================================================

interface SpeciesTableProps {
  entries: SpeciesSearchEntry[];
  previewedSpecies: string | null;
  currentSpecies: string | null;
  onPreview: (species: string) => void;
  onSelect: (species: string) => void;
}

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

// =============================================================================
// Helpers
// =============================================================================

function getStatColor(value: number): string {
  if (value >= 120) return "text-emerald-500";
  if (value < 70) return "text-muted-foreground";
  return "";
}

function sortEntries(
  entries: SpeciesSearchEntry[],
  sort: SortState
): SpeciesSearchEntry[] {
  return [...entries].sort((a, b) => {
    let cmp = 0;

    if (sort.column === "name") {
      cmp = a.species.localeCompare(b.species);
    } else if (sort.column === "bst") {
      cmp = a.bst - b.bst;
    } else {
      const statKey = sort.column as keyof SpeciesSearchEntry["baseStats"];
      cmp = a.baseStats[statKey] - b.baseStats[statKey];
    }

    return sort.direction === "asc" ? cmp : -cmp;
  });
}

// =============================================================================
// SortableHead — table header cell with sort toggle
// =============================================================================

interface SortableHeadProps {
  column: SortColumn;
  currentSort: SortState;
  onSort: (column: SortColumn) => void;
  children: React.ReactNode;
  className?: string;
}

function SortableHead({
  column,
  currentSort,
  onSort,
  children,
  className,
}: SortableHeadProps) {
  const isActive = currentSort.column === column;
  return (
    <TableHead
      className={cn("cursor-pointer select-none", className)}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-0.5">
        <span>{children}</span>
        <span
          className={cn("text-[10px]", isActive ? "opacity-100" : "opacity-30")}
        >
          {isActive && currentSort.direction === "asc" ? "↑" : "↓"}
        </span>
      </div>
    </TableHead>
  );
}

// =============================================================================
// SpeciesTable
// =============================================================================

/**
 * Species picker table with sortable columns, row highlighting for
 * current/previewed species, and single/double-click interactions.
 *
 * Single click previews a species in the detail panel.
 * Double click selects it immediately.
 */
export function SpeciesTable({
  entries,
  previewedSpecies,
  currentSpecies,
  onPreview,
  onSelect,
}: SpeciesTableProps) {
  const [sort, setSort] = useState<SortState>({
    column: "name",
    direction: "asc",
  });

  function handleSort(column: SortColumn) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );
  }

  const sorted = sortEntries(entries, sort);
  const visible = sorted.slice(0, MAX_VISIBLE_ROWS);
  const isTruncated = sorted.length > MAX_VISIBLE_ROWS;

  return (
    <div className="flex flex-col">
      {isTruncated && (
        <div className="text-muted-foreground border-b px-3 py-1.5 text-xs">
          Showing {MAX_VISIBLE_ROWS} of {sorted.length} results — search to
          narrow
        </div>
      )}

      <Table>
        <TableHeader className="bg-background sticky top-0 z-10">
          <TableRow className="border-b">
            {/* Sprite column — no sort */}
            <TableHead className="w-10 px-2" />

            <SortableHead column="name" currentSort={sort} onSort={handleSort}>
              Name
            </SortableHead>

            {/* Types — no sort */}
            <TableHead>Types</TableHead>

            {/* Ability — no sort */}
            <TableHead>Ability</TableHead>

            <SortableHead
              column="hp"
              currentSort={sort}
              onSort={handleSort}
              className="w-10 text-right"
            >
              HP
            </SortableHead>
            <SortableHead
              column="atk"
              currentSort={sort}
              onSort={handleSort}
              className="w-10 text-right"
            >
              Atk
            </SortableHead>
            <SortableHead
              column="def"
              currentSort={sort}
              onSort={handleSort}
              className="w-10 text-right"
            >
              Def
            </SortableHead>
            <SortableHead
              column="spa"
              currentSort={sort}
              onSort={handleSort}
              className="w-10 text-right"
            >
              SpA
            </SortableHead>
            <SortableHead
              column="spd"
              currentSort={sort}
              onSort={handleSort}
              className="w-10 text-right"
            >
              SpD
            </SortableHead>
            <SortableHead
              column="spe"
              currentSort={sort}
              onSort={handleSort}
              className="w-10 text-right"
            >
              Spe
            </SortableHead>
            <SortableHead
              column="bst"
              currentSort={sort}
              onSort={handleSort}
              className="w-12 text-right"
            >
              BST
            </SortableHead>

            {/* Usage — no data in V1 */}
            <TableHead className="text-right">Usage</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {visible.map((entry) => {
            const isCurrent = entry.species === currentSpecies;
            const isPreviewed = entry.species === previewedSpecies;
            const sprite = getPokemonSprite(entry.species);

            return (
              <TableRow
                key={entry.species}
                className={cn(
                  "cursor-pointer border-0",
                  isCurrent &&
                    "border-l-2 border-l-teal-500 bg-teal-50 dark:bg-teal-950/20",
                  isPreviewed &&
                    !isCurrent &&
                    "border-l-2 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
                )}
                onClick={() => onPreview(entry.species)}
                onDoubleClick={() => onSelect(entry.species)}
              >
                {/* Sprite */}
                <TableCell className="px-2 py-1">
                  <div className="relative size-8 shrink-0">
                    <Image
                      src={sprite.url}
                      alt={entry.species}
                      width={32}
                      height={32}
                      className={cn(
                        "object-contain",
                        sprite.pixelated && "image-rendering-pixelated"
                      )}
                    />
                  </div>
                </TableCell>

                {/* Name */}
                <TableCell className="py-1 font-medium">
                  {entry.species}
                </TableCell>

                {/* Types */}
                <TableCell className="py-1">
                  <div className="flex gap-0.5">
                    {entry.types.map((type) => (
                      <span
                        key={type}
                        className={cn(
                          "rounded px-1 py-0.5 text-[10px] leading-none font-medium",
                          TYPE_PILL_COLORS[type] ?? "bg-muted text-foreground"
                        )}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </TableCell>

                {/* Primary ability */}
                <TableCell className="text-muted-foreground py-1 text-xs">
                  {entry.abilities[0] ?? "—"}
                </TableCell>

                {/* Stats */}
                <TableCell
                  className={cn(
                    "py-1 text-right text-xs tabular-nums",
                    getStatColor(entry.baseStats.hp)
                  )}
                >
                  {entry.baseStats.hp}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-1 text-right text-xs tabular-nums",
                    getStatColor(entry.baseStats.atk)
                  )}
                >
                  {entry.baseStats.atk}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-1 text-right text-xs tabular-nums",
                    getStatColor(entry.baseStats.def)
                  )}
                >
                  {entry.baseStats.def}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-1 text-right text-xs tabular-nums",
                    getStatColor(entry.baseStats.spa)
                  )}
                >
                  {entry.baseStats.spa}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-1 text-right text-xs tabular-nums",
                    getStatColor(entry.baseStats.spd)
                  )}
                >
                  {entry.baseStats.spd}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-1 text-right text-xs tabular-nums",
                    getStatColor(entry.baseStats.spe)
                  )}
                >
                  {entry.baseStats.spe}
                </TableCell>

                {/* BST */}
                <TableCell className="py-1 text-right text-xs font-bold tabular-nums">
                  {entry.bst}
                </TableCell>

                {/* Usage */}
                <TableCell className="text-muted-foreground py-1 text-right text-xs">
                  —
                </TableCell>
              </TableRow>
            );
          })}

          {visible.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={13}
                className="text-muted-foreground py-8 text-center text-sm"
              >
                No species found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
