"use client";

import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { Sprite } from "../sprite";

// =============================================================================
// Types
// =============================================================================

interface AttackerChipStripProps {
  /** Team's pokemon, in slot order (0..5). May contain nulls for empty slots. */
  pokemon: (Tables<"pokemon"> | null)[];
  /** Currently active attacker slot (0..5). */
  activeIdx: number;
  /** Click handler — sets the attacker slot. */
  onPick: (idx: number) => void;
}

// =============================================================================
// AttackerChipStrip
// =============================================================================

/**
 * Horizontal row of up to 6 sprite chips for selecting the active attacker.
 * Active chip is outlined in primary teal. Inactive chips are 60% opacity.
 * Empty slots are disabled.
 */
export function AttackerChipStrip({
  pokemon,
  activeIdx,
  onPick,
}: AttackerChipStripProps) {
  return (
    <div className="flex gap-1 rounded-md bg-muted/40 p-1.5">
      {pokemon.map((p, idx) => {
        const isActive = idx === activeIdx;
        const isEmpty = p === null;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => !isEmpty && onPick(idx)}
            disabled={isEmpty}
            className={cn(
              // size-8 (32px) is the nearest scale token to the 30px design intent
              "relative flex size-8 flex-shrink-0 items-center justify-center rounded bg-card transition-opacity",
              isActive
                ? "border-2 border-primary shadow-[0_0_0_2px_oklch(0.6_0.13_195_/_0.18)]"
                : "border border-border opacity-55 hover:opacity-90",
              isEmpty && "cursor-not-allowed opacity-30"
            )}
            aria-pressed={isActive}
            aria-label={`Use slot ${String(idx + 1).padStart(2, "0")} as calc attacker`}
          >
            {/* slot number badge */}
            <span className="absolute -left-1 -top-1 rounded border bg-card px-1 font-mono text-xs text-muted-foreground">
              {String(idx + 1).padStart(2, "0")}
            </span>
            {!isEmpty && p?.species ? (
              <Sprite species={p.species} types={[]} size={20} />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
