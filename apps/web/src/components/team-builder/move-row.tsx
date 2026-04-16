"use client";

import {
  type MoveData,
  type PokemonType,
  getMoveHelperText,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TYPE_PILL_COLORS } from "./type-colors";

// =============================================================================
// Types
// =============================================================================

interface MoveRowProps {
  /** Move data resolved via `getMoveData(name)`, or `null` for an empty slot. */
  move: MoveData | null;
  onOpenPicker: () => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Single-letter category chip styling. */
function categoryChip(category: MoveData["category"]): {
  letter: string;
  classes: string;
} {
  if (category === "Physical") {
    return { letter: "P", classes: "bg-orange-400 text-white" };
  }
  if (category === "Special") {
    return { letter: "S", classes: "bg-blue-500 text-white" };
  }
  return {
    letter: "—",
    classes: "bg-muted-foreground/30 text-muted-foreground",
  };
}

/** Format accuracy: `100%`, `—` for `true` (always hits) or 0 (unknown). */
function formatAccuracy(accuracy: MoveData["accuracy"]): string {
  if (accuracy === true) return "—";
  if (accuracy === 0) return "—";
  return `${accuracy}`;
}

// =============================================================================
// MoveRow
// =============================================================================

/**
 * A single row in the moves list. Renders a type pill, the move name with
 * machine-derived helper text, a category chip, base power, and accuracy.
 *
 * When `move` is `null`, renders the empty-slot variant: a single-column
 * "+ Add move" affordance (no dashed border).
 */
export function MoveRow({ move, onOpenPicker, className }: MoveRowProps) {
  // -------------------------------------------------------------------------
  // Empty slot variant
  // -------------------------------------------------------------------------

  if (!move) {
    return (
      <button
        type="button"
        onClick={onOpenPicker}
        className={cn(
          "bg-muted/30 hover:bg-muted/50 text-muted-foreground w-full cursor-pointer rounded-xl py-3 text-center text-sm",
          "transition-colors duration-150",
          className
        )}
      >
        + Add move
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Filled row
  // -------------------------------------------------------------------------

  const isStatus = move.category === "Status";
  const { letter: catLetter, classes: catClasses } = categoryChip(
    move.category
  );
  const helper = getMoveHelperText(move);

  return (
    <button
      type="button"
      onClick={onOpenPicker}
      className={cn(
        "bg-muted/50 hover:bg-muted grid w-full cursor-pointer grid-cols-[52px_minmax(0,1fr)_22px_38px_38px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-left",
        "transition-colors duration-150",
        className
      )}
    >
      {/* Type pill */}
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-center text-[10px] leading-none font-semibold",
          TYPE_PILL_COLORS[move.type as PokemonType | "Stellar"] ??
            "bg-muted text-foreground"
        )}
      >
        {move.type}
      </span>

      {/* Name + helper */}
      <div className="flex min-w-0 flex-col">
        <span className="text-foreground truncate text-sm leading-tight font-semibold">
          {move.name}
        </span>
        {helper && (
          <span className="text-muted-foreground truncate text-xs leading-snug">
            {helper}
          </span>
        )}
      </div>

      {/* Category chip */}
      <span
        aria-label={`Category: ${move.category}`}
        className={cn(
          "flex size-[22px] items-center justify-center rounded-md text-[11px] leading-none font-bold",
          catClasses
        )}
      >
        {catLetter}
      </span>

      {/* BP */}
      <div className="flex flex-col items-center">
        <span className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
          BP
        </span>
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            isStatus || move.basePower === 0
              ? "text-muted-foreground/60"
              : "text-foreground"
          )}
        >
          {isStatus || move.basePower === 0 ? "—" : move.basePower}
        </span>
      </div>

      {/* ACC */}
      <div className="flex flex-col items-center">
        <span className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
          Acc
        </span>
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            isStatus
              ? "text-muted-foreground/60"
              : move.accuracy === true || move.accuracy === 0
                ? "text-muted-foreground/60"
                : "text-foreground"
          )}
        >
          {isStatus ? "—" : formatAccuracy(move.accuracy)}
        </span>
      </div>
    </button>
  );
}
