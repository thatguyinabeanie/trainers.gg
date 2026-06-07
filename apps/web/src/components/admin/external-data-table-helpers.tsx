"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";
export type SortColumn =
  | "name"
  | "source"
  | "category"
  | "date"
  | "playerCount"
  | "status"
  | "queueOrder";

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

// Sortable header cell
export function SortableHeader({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: SortColumn;
  label: string;
  sort: SortState;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const isActive = sort.column === column;
  return (
    <div
      className={cn(
        "flex h-10 items-center px-2 font-medium whitespace-nowrap",
        className
      )}
    >
      <button
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => onSort(column)}
      >
        {label}
        {isActive ? (
          sort.direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </div>
  );
}

export function toggleSort(current: SortState, column: SortColumn): SortState {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: SortDirection
): number {
  const aVal = a ?? "";
  const bVal = b ?? "";
  let result: number;
  if (typeof aVal === "number" && typeof bVal === "number") {
    result = aVal - bVal;
  } else {
    result = String(aVal).localeCompare(String(bVal));
  }
  return direction === "desc" ? -result : result;
}
