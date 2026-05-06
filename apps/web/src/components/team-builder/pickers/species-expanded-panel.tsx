"use client";

import { useRef, useState } from "react";

import { getLegalMoves, getMoveData, type MoveData } from "@trainers/pokemon";

import {
  MoveListHeader,
  MoveListRow,
  sortMoveData,
  type MoveListSortCol,
  type MoveListSortState,
} from "./move-list-shared";

// =============================================================================
// Types
// =============================================================================

interface SpeciesExpandedPanelProps {
  species: string;
  formatId: string;
  /** Currently-active "learns move" filter values — these get highlighted. */
  filteredMoves: readonly string[];
}

// =============================================================================
// SpeciesExpandedPanel
// =============================================================================

/**
 * Expanded content panel for a species row in the picker.
 * Shows the full learnset as a sortable move list matching the move picker
 * dialog layout. Filtered moves (from the "learns move" filter) are
 * highlighted. The panel is vertically resizable via a drag handle.
 */
export function SpeciesExpandedPanel({
  species,
  formatId,
  filteredMoves,
}: SpeciesExpandedPanelProps) {
  const [sort, setSort] = useState<MoveListSortState>({
    col: "bp",
    dir: "desc",
  });
  const [height, setHeight] = useState(320);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const legalMovesResult = getLegalMoves(species, formatId);

  // Handle unavailable/undefined results
  if (!legalMovesResult || typeof legalMovesResult === "symbol") {
    return (
      <div className="text-muted-foreground px-4 py-3 text-xs">
        Learnset data unavailable for this format.
      </div>
    );
  }

  // Build move data list
  const allMoves: MoveData[] = [];
  for (const moveName of legalMovesResult) {
    const data = getMoveData(moveName);
    if (data) allMoves.push(data);
  }

  const sorted = sortMoveData(allMoves, sort);

  const filteredMovesLower = new Set(
    filteredMoves.map((m) => m.toLowerCase())
  );

  function handleSort(col: MoveListSortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "name" ? "asc" : "desc" }
    );
  }

  return (
    <div className="bg-muted/30 border-border/60 border-t">
      {/* Label */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
          Learnset
        </span>
        <span className="text-muted-foreground/70 text-[10px]">
          {allMoves.length} moves
        </span>
      </div>

      {/* Sticky header */}
      <MoveListHeader
        sort={sort}
        onSort={handleSort}
        className="bg-muted/50 sticky top-0 z-10"
      />

      {/* Scrollable move rows — resizable via drag handle */}
      <div className="overflow-y-auto" style={{ maxHeight: `${height}px` }}>
        {sorted.map((move) => (
          <MoveListRow
            key={move.name}
            move={move}
            isHighlighted={filteredMovesLower.has(move.name.toLowerCase())}
          />
        ))}
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize learnset panel"
        className="group flex h-2 cursor-row-resize items-center justify-center"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = { startY: e.clientY, startHeight: height };

          function onMouseMove(ev: MouseEvent) {
            if (!dragRef.current) return;
            const delta = ev.clientY - dragRef.current.startY;
            const next = Math.max(
              120,
              Math.min(800, dragRef.current.startHeight + delta)
            );
            setHeight(next);
          }

          function onMouseUp() {
            dragRef.current = null;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          }

          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      >
        <div className="bg-border group-hover:bg-foreground/30 h-0.5 w-12 rounded-full transition-colors" />
      </div>
    </div>
  );
}
