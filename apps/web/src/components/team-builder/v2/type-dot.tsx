"use client";

import { type PokemonType } from "@trainers/pokemon";

import { TYPE_PILL_COLORS } from "@/components/team-builder/type-colors";

// =============================================================================
// TypeDot
// =============================================================================

interface TypeDotProps {
  t: PokemonType;
  size?: number;
}

/**
 * A small colored dot representing a Pokemon type.
 * Uses the type-color map from TYPE_PILL_COLORS; extracts the bg class only
 * since we don't need text contrast here — the dot has no label.
 */
export function TypeDot({ t, size = 10 }: TypeDotProps) {
  // TYPE_PILL_COLORS values are like "bg-orange-500 text-white" — we only
  // need the first token for the background; text color is irrelevant on a dot.
  const bgClass = (TYPE_PILL_COLORS[t] ?? "bg-stone-400").split(" ")[0];

  return (
    <span
      role="img"
      aria-label={t}
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 rounded-full ${bgClass}`}
    />
  );
}
