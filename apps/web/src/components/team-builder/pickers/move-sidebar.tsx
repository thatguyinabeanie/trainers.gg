/**
 * MoveSidebar — left-column panel of the move picker.
 *
 * Renders two filter sections:
 *   1. Category chips (Physical / Special / Status, multi-select OR)
 *   2. Type grid (18 types, multi-select OR, 3 columns)
 *
 * Pairs with <RolePresetsPanel> for the role section below.
 * Filter state is managed externally via `filters` + `onFiltersChange`.
 */
"use client";

import { ALL_TYPES } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { getTypeStyle } from "@/lib/pokemon/type-colors";

import { TypeSymbolIcon } from "../type-symbol-icon";
import {
  type MoveCategory,
  type MoveFilterState,
} from "./move-filter-state";

// =============================================================================
// Shared section styles (same as species-sidebar)
// =============================================================================

const SECTION_HEADER =
  "text-muted-foreground mb-1.5 block text-[9px] font-bold tracking-widest uppercase";

const SECTION_PADDING = "px-3 py-2.5";

// =============================================================================
// Constants
// =============================================================================

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex w-full flex-col divide-y divide-border/40">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Category chips                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className={SECTION_PADDING}>
        <span className={SECTION_HEADER}>Category</span>
        <div className="flex flex-wrap gap-1">
          {(["Physical", "Special", "Status"] as const).map((cat) => {
            const isActive = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isActive}
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
      {/* 2. Type grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className={SECTION_PADDING}>
        <span className={SECTION_HEADER}>Type</span>
        <div className="grid grid-cols-3 gap-1">
          {(ALL_TYPES as readonly string[]).map((type) => {
            const isActive = filters.types.includes(type);
            const typeStyle = getTypeStyle(type);
            return (
              <button
                key={type}
                type="button"
                aria-label={type}
                aria-pressed={isActive}
                onClick={() => toggleType(type)}
                className={cn(
                  "relative flex items-center justify-center rounded border border-transparent px-1 py-1 transition-all",
                  typeStyle.bg,
                  isActive
                    ? cn(typeStyle.border, "ring-primary ring-2 ring-offset-background ring-offset-1")
                    : cn(typeStyle.borderHover, "before:absolute before:inset-0 before:rounded before:bg-background/50 before:transition-opacity before:pointer-events-none hover:before:opacity-0")
                )}
              >
                <TypeSymbolIcon
                  type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
                  size={28}
                  className="relative z-10"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
