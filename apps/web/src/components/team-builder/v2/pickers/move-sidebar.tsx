/**
 * MoveSidebar — left-column panel of the move picker.
 *
 * Renders two filter sections in a fixed-width aside:
 *   1. Type grid (18 types, multi-select OR, 3 columns)
 *   2. Category chips (Physical / Special / Status, multi-select OR)
 *   3. Clear all filters — pinned at bottom, always visible
 *
 * Pairs with <RolePresetsPanel> for the middle column inside <MovePicker>.
 * Filter state is managed externally via `filters` + `onFiltersChange`.
 */
"use client";

import { ALL_TYPES } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import {
  DEFAULT_MOVE_FILTERS,
  type MoveCategory,
  type MoveFilterState,
} from "./move-filter-state";

// =============================================================================
// Constants
// =============================================================================

/** Tailwind background + text classes for each of the 18 Pokémon types. */
const TYPE_BG: Record<string, string> = {
  Normal: "bg-stone-400 text-white",
  Bug: "bg-lime-500 text-white",
  Dark: "bg-stone-700 text-white",
  Dragon: "bg-indigo-600 text-white",
  Electric: "bg-yellow-400 text-black",
  Fairy: "bg-pink-400 text-white",
  Fighting: "bg-red-700 text-white",
  Fire: "bg-orange-500 text-white",
  Flying: "bg-sky-300 text-black",
  Ghost: "bg-purple-600 text-white",
  Grass: "bg-green-500 text-white",
  Ground: "bg-amber-600 text-white",
  Ice: "bg-cyan-300 text-black",
  Poison: "bg-purple-500 text-white",
  Psychic: "bg-pink-500 text-white",
  Rock: "bg-amber-700 text-white",
  Steel: "bg-slate-400 text-black",
  Water: "bg-blue-500 text-white",
};

/** Dot color classes for each move category. */
const CATEGORY_DOT: Record<MoveCategory, string> = {
  Physical: "bg-orange-500",
  Special: "bg-blue-500",
  Status: "bg-slate-400",
};

// =============================================================================
// Types
// =============================================================================

interface MoveSidebarProps {
  filters: MoveFilterState;
  onFiltersChange: (filters: MoveFilterState) => void;
}

// =============================================================================
// MoveSidebar
// =============================================================================

export function MoveSidebar({ filters, onFiltersChange }: MoveSidebarProps) {
  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function toggleType(type: string) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  }

  function toggleCategory(cat: MoveCategory) {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onFiltersChange({ ...filters, categories: next });
  }

  function clearAll() {
    onFiltersChange(DEFAULT_MOVE_FILTERS);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-muted/30 border-border flex w-40 flex-shrink-0 flex-col overflow-y-auto border-r">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Type grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-border/60 border-b p-2.5">
        <span className="text-muted-foreground mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest">
          Type
        </span>
        <div className="grid grid-cols-3 gap-1">
          {(ALL_TYPES as readonly string[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                "rounded px-0.5 py-1 text-[9px] font-bold transition-all",
                filters.types.includes(type)
                  ? cn(
                      TYPE_BG[type] ?? "bg-muted text-foreground",
                      "outline outline-2 outline-offset-0 outline-white shadow-[0_0_0_3px_currentColor]"
                    )
                  : (TYPE_BG[type] ?? "bg-muted text-foreground")
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Category chips                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-border/60 border-b p-2.5">
        <span className="text-muted-foreground mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest">
          Category
        </span>
        <div className="flex flex-wrap gap-1">
          {(["Physical", "Special", "Status"] as const).map((cat) => {
            const isActive = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors",
                  isActive
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "inline-block size-2.5 rounded-sm",
                    CATEGORY_DOT[cat]
                  )}
                />
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Clear all filters                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-border mt-auto border-t p-2.5">
        <button
          type="button"
          onClick={clearAll}
          className="border-border bg-background text-muted-foreground hover:border-destructive/50 hover:text-destructive w-full rounded-md border py-1 text-[11px] transition-colors"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
