"use client";

import { getMoveType } from "@trainers/pokemon";
import { cn } from "@/lib/utils";

// =============================================================================
// Type tint colors — Tailwind classes keyed by Pokemon type name.
// Mirrors TYPE_PILL_COLORS in team-builder/type-colors.ts but is kept
// local to avoid a sibling import across feature boundaries.
// =============================================================================

/** Tailwind background + text classes for each Pokemon type. */
const MOVE_TYPE_CLASSES: Record<string, string> = {
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

/** Fallback classes when the move type cannot be resolved. */
const NEUTRAL_CLASSES = "bg-muted text-muted-foreground";

// =============================================================================
// MoveChip
// =============================================================================

interface MoveChipProps {
  /** Move name as stored in the DB / team sheet (lowercased slug or display name). */
  move: string;
  className?: string;
}

/**
 * Small presentational pill displaying a move name tinted by its type.
 *
 * Resolves the move's type via `getMoveType()` from `@trainers/pokemon` and
 * applies the corresponding Tailwind background. Falls back to a neutral chip
 * when the type is unavailable. Reused across `SpeciesMoveCombos` rows.
 */
export function MoveChip({ move, className }: MoveChipProps) {
  // Convert the lowercased slug to a display name by title-casing each word.
  const displayName = move
    .split(/[-\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Resolve move type — getMoveType accepts the display-name form.
  const moveType = getMoveType(displayName);
  const typeClasses =
    (moveType && MOVE_TYPE_CLASSES[moveType]) ?? NEUTRAL_CLASSES;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        typeClasses,
        className
      )}
    >
      {displayName}
    </span>
  );
}
