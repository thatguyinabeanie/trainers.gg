"use client";

import { type PokemonType } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { TYPE_PILL_COLORS } from "@/components/team-builder/type-colors";

// =============================================================================
// TypePill
// =============================================================================

interface TypePillProps {
  t: PokemonType;
}

/**
 * A small colored pill showing a Pokemon type name.
 * Reuses TYPE_PILL_COLORS for consistent type-color mapping across the app.
 */
export function TypePill({ t }: TypePillProps) {
  const colorClass = TYPE_PILL_COLORS[t] ?? "bg-stone-400 text-white";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-none",
        colorClass
      )}
    >
      {t}
    </span>
  );
}
