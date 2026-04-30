"use client";

import { useEffect, useRef, useState } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";

import {
  getLearnableMoves,
  getLegalMoves,
  getMoveData,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TYPE_BG_COLORS } from "../../type-colors";
import { TypeDot } from "../type-dot";

// =============================================================================
// Types
// =============================================================================

type CategoryFilter = "All" | "Physical" | "Special" | "Status";

interface MovePickerProps {
  value: string | null | undefined;
  species: string;
  format: GameFormat | undefined;
  onPick: (moveName: string) => void;
  onClose: () => void;
}

// =============================================================================
// MovePicker
// =============================================================================

/**
 * Searchable move picker filtered to species-legal moves in the given format.
 * Category filter (All / Physical / Special / Status) on top.
 * Virtualized via @tanstack/react-virtual — no row cap.
 *
 * TODO Phase 4: live damage preview, calc detail card on left-click, move picker on right-click.
 */
export function MovePicker({
  value,
  species,
  format,
  onPick,
  onClose,
}: MovePickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allMoves = format
    ? Array.from(
        getLegalMoves(species, format.id) ?? getLearnableMoves(species)
      ).sort()
    : getLearnableMoves(species);

  const lower = search.toLowerCase();
  const searchFiltered = allMoves.filter((m) => m.toLowerCase().includes(lower));

  const filteredMoves: Array<{ name: string; data: ReturnType<typeof getMoveData> }> =
    [];
  for (const name of searchFiltered) {
    const data = getMoveData(name);
    if (category !== "All" && data?.category !== category) continue;
    filteredMoves.push({ name, data });
  }

  const rowVirtualizer = useVirtualizer({
    count: filteredMoves.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  const categories: CategoryFilter[] = ["All", "Physical", "Special", "Status"];

  return (
    <div className="bg-popover text-popover-foreground flex w-[460px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Move
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground flex size-4 items-center justify-center rounded text-sm"
        >
          ×
        </button>
      </div>

      {/* Search */}
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search moves…"
        className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
      />

      {/* Category filter */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Move list — virtualized */}
      <div ref={scrollRef} className="max-h-72 overflow-y-auto p-1">
        {filteredMoves.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No moves found
          </p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = filteredMoves[virtualRow.index];
              if (!item) return null;
              const { name: moveName, data: move } = item;
              const isSelected = moveName === value;
              const typeColor = move?.type
                ? (TYPE_BG_COLORS[move.type as keyof typeof TYPE_BG_COLORS] ??
                  "bg-muted text-foreground")
                : "bg-muted text-foreground";

              return (
                <div
                  key={moveName}
                  className="absolute left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onPick(moveName);
                      onClose();
                    }}
                    className={cn(
                      "flex h-full w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                  >
                    {/* Type dot */}
                    <TypeDot t={move?.type ?? "Normal"} size={10} />

                    {/* Name + secondary effect — vertical stack, expands to fill */}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {moveName}
                      </span>
                      {move?.shortDesc &&
                        move.shortDesc !== "No additional effect." && (
                          <span className="text-muted-foreground line-clamp-2 text-[11px] leading-tight">
                            {move.shortDesc}
                          </span>
                        )}
                    </span>

                    {/* Type badge */}
                    {move?.type && (
                      <span
                        className={cn(
                          "shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none",
                          typeColor
                        )}
                      >
                        {move.type}
                      </span>
                    )}

                    {/* BP */}
                    <span className="text-muted-foreground w-8 shrink-0 text-right font-mono text-xs">
                      {move?.basePower && move.basePower > 0
                        ? move.basePower
                        : "—"}
                    </span>

                    {/* Accuracy */}
                    <span className="text-muted-foreground w-8 shrink-0 text-right font-mono text-xs">
                      {move?.accuracy === true || !move?.accuracy
                        ? "—"
                        : `${move.accuracy}%`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
