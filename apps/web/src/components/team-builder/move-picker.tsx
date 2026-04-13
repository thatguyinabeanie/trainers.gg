"use client";

import { useState } from "react";

import { getLearnableMoves, getMoveData } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { CATEGORY_COLORS, CATEGORY_LABELS } from "./move-category-ui";
import { TYPE_BG_COLORS } from "./type-colors";

type CategoryFilter = "All" | "Physical" | "Special" | "Status";

// =============================================================================
// Types
// =============================================================================

interface MovePickerProps {
  species: string;
  value: string | null;
  onSelect: (move: string) => void;
  onClose: () => void;
}

// =============================================================================
// MovePicker
// =============================================================================

/**
 * Inline move picker for the team builder Pokemon editor.
 * Shows learnable moves for the selected species with type badge, category,
 * BP, accuracy, and a short description.
 *
 * Includes search filter and category filter buttons.
 * The list is capped to 100 visible entries to keep performance reasonable.
 */
export function MovePicker({
  species,
  value,
  onSelect,
  onClose,
}: MovePickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");

  const allMoves = getLearnableMoves(species);

  // Filter by search text first (cheap string match), then resolve move data
  // only for the narrowed set to avoid unnecessary lookups on every keystroke
  const searchLower = search.toLowerCase();
  const searchFiltered = allMoves.filter((name) =>
    name.toLowerCase().includes(searchLower)
  );

  const movesWithData = searchFiltered.map((name) => ({
    name,
    data: getMoveData(name),
  }));

  const filtered =
    category === "All"
      ? movesWithData
      : movesWithData.filter(({ data }) => data?.category === category);

  // Cap to 100 for performance — search narrows the list further
  const visible = filtered.slice(0, 100);

  function handleSelect(move: string) {
    onSelect(move);
    onClose();
  }

  const categories: CategoryFilter[] = ["All", "Physical", "Special", "Status"];

  return (
    <div className="bg-popover flex flex-col gap-2 rounded-lg border p-2 shadow-md">
      {/* Search */}
      <Input
        placeholder="Search moves…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        className="h-7 text-sm"
      />

      {/* Category filter */}
      <div className="flex gap-1">
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
        {filtered.length > 100 && (
          <span className="text-muted-foreground ml-auto self-center text-xs">
            {filtered.length} moves — search to narrow
          </span>
        )}
      </div>

      {/* Move list */}
      <ScrollArea className="h-72">
        <div className="flex flex-col gap-0.5 pr-2">
          {visible.map(({ name: moveName, data: move }) => {
            const isSelected = moveName === value;
            const typeColor = move?.type
              ? (TYPE_BG_COLORS[move.type as keyof typeof TYPE_BG_COLORS] ??
                "bg-muted")
              : "bg-muted";
            const catLabel = move?.category
              ? (CATEGORY_LABELS[move.category] ?? move.category)
              : "—";
            const catColor = move?.category
              ? (CATEGORY_COLORS[move.category] ?? "text-muted-foreground")
              : "text-muted-foreground";

            return (
              <button
                key={moveName}
                type="button"
                onClick={() => handleSelect(moveName)}
                className={cn(
                  "flex flex-col rounded px-2 py-1.5 text-left transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground"
                )}
              >
                {/* Row 1: name + type badge + category + BP + accuracy */}
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "flex-1 truncate text-sm font-medium",
                      isSelected && "font-semibold"
                    )}
                  >
                    {moveName}
                  </span>

                  {/* Type badge */}
                  {move?.type && (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-medium",
                        typeColor
                      )}
                    >
                      {move.type}
                    </span>
                  )}

                  {/* Category */}
                  <span className={cn("shrink-0 text-xs font-bold", catColor)}>
                    {catLabel}
                  </span>

                  {/* BP */}
                  <span className="text-muted-foreground w-8 shrink-0 text-right text-xs">
                    {move?.basePower && move.basePower > 0
                      ? `${move.basePower}`
                      : "—"}
                  </span>

                  {/* Accuracy */}
                  <span className="text-muted-foreground w-8 shrink-0 text-right text-xs">
                    {move?.accuracy === true || !move?.accuracy
                      ? "—"
                      : `${move.accuracy}%`}
                  </span>
                </div>

                {/* Row 2: short description */}
                {move?.shortDesc && (
                  <span className="text-muted-foreground mt-0.5 line-clamp-1 text-xs leading-tight">
                    {move.shortDesc}
                  </span>
                )}
              </button>
            );
          })}

          {visible.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No moves found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
