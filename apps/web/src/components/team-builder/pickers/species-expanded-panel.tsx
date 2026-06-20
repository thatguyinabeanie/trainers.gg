"use client";

import { useEffect, useRef, useState } from "react";

import { getLegalMoves, getMoveData, type MoveData } from "@trainers/pokemon";

import {
  MoveListHeader,
  MoveListRow,
  sortMoveData,
  type MoveListSortCol,
  type MoveListSortState,
} from "./move-list-shared";
import { getRolesForMove, type RoleId } from "./role-registry";

// =============================================================================
// Types
// =============================================================================

interface SpeciesExpandedPanelProps {
  id?: string;
  species: string;
  formatId: string;
  /** Currently-active "learns move" filter values — these get highlighted. */
  filteredMoves: readonly string[];
  /** Currently-active role filters — moves are filtered to only show matches. */
  filteredRoles: readonly RoleId[];
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
  id,
  species,
  formatId,
  filteredMoves,
  filteredRoles,
}: SpeciesExpandedPanelProps) {
  const [sort, setSort] = useState<MoveListSortState>({
    col: "bp",
    dir: "desc",
  });
  const [height, setHeight] = useState(320);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const moveHandlerRef = useRef<((ev: PointerEvent) => void) | null>(null);
  const upHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (moveHandlerRef.current) {
        document.removeEventListener("pointermove", moveHandlerRef.current);
      }
      if (upHandlerRef.current) {
        document.removeEventListener("pointerup", upHandlerRef.current);
        document.removeEventListener("pointercancel", upHandlerRef.current);
      }
      dragRef.current = null;
    };
  }, []);

  const legalMovesResult = getLegalMoves(species, formatId);

  // Handle unavailable/undefined results
  if (!legalMovesResult || typeof legalMovesResult === "symbol") {
    return (
      <div className="text-muted-foreground px-4 py-3 text-xs">
        Learnset data unavailable for this format.
      </div>
    );
  }

  // Build move data list — pass formatId so Champions moves show correct stats
  const allMoves: MoveData[] = [];
  for (const moveName of legalMovesResult) {
    const data = getMoveData(moveName, formatId);
    if (data) allMoves.push(data);
  }

  // Filter by active roles — a move must carry ALL selected roles (AND logic)
  const visibleMoves =
    filteredRoles.length > 0
      ? allMoves.filter((move) => {
          const moveRoles = getRolesForMove(move.name);
          return filteredRoles.some((role) => moveRoles.includes(role));
        })
      : allMoves;

  const sorted = sortMoveData(visibleMoves, sort);

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
    <div id={id} className="bg-muted/30 border-border/60 border-t">
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
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { startY: e.clientY, startHeight: height };

          function onPointerMove(ev: PointerEvent) {
            if (!dragRef.current) return;
            const delta = ev.clientY - dragRef.current.startY;
            const next = Math.max(
              120,
              Math.min(800, dragRef.current.startHeight + delta)
            );
            setHeight(next);
          }

          function onPointerUp() {
            dragRef.current = null;
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
            document.removeEventListener("pointercancel", onPointerUp);
            moveHandlerRef.current = null;
            upHandlerRef.current = null;
          }

          moveHandlerRef.current = onPointerMove;
          upHandlerRef.current = onPointerUp;

          document.addEventListener("pointermove", onPointerMove);
          document.addEventListener("pointerup", onPointerUp);
          document.addEventListener("pointercancel", onPointerUp);
        }}
      >
        <div className="bg-border group-hover:bg-foreground/30 h-0.5 w-12 rounded-full transition-colors" />
      </div>
    </div>
  );
}
