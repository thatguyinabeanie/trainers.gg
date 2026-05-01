"use client";

import { type Tables } from "@trainers/supabase";

import { CALC_TARGETS } from "./calc-target-options";

// =============================================================================
// Types
// =============================================================================

interface UseDefenderMovesArgs {
  defenderSpecies: string;
  defenderMoves: readonly [string, string, string, string];
  /** Teammates available — used for "your team" defaults. */
  teammates: Tables<"pokemon">[];
}

interface UseDefenderMovesReturn {
  /** The 4 effective moves: explicit override if set, else default. */
  effectiveMoves: [string, string, string, string];
  /** True if the user has manually overridden any slot. */
  hasOverrides: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Resolves the 4 effective defender moves for the reverse-calc column.
 *
 * Priority order:
 * 1. Explicit user override stored in `defenderMoves[n]` (non-empty string)
 * 2. Preset default from CALC_TARGETS (if the defender is a preset species)
 * 3. Teammate's actual moves (if the defender was chosen from "Your team")
 * 4. Empty string → rendered as "+ Add move" dashed tile
 */
export function useDefenderMoves({
  defenderSpecies,
  defenderMoves,
  teammates,
}: UseDefenderMovesArgs): UseDefenderMovesReturn {
  // 1. Find a default source: preset → teammate → empty
  const preset = CALC_TARGETS.find((t) => t.species === defenderSpecies);
  const teammate = teammates.find((p) => p.species === defenderSpecies);

  let defaults: [string, string, string, string] = ["", "", "", ""];

  if (preset?.moves) {
    defaults = [
      preset.moves[0] ?? "",
      preset.moves[1] ?? "",
      preset.moves[2] ?? "",
      preset.moves[3] ?? "",
    ];
  } else if (teammate) {
    defaults = [
      teammate.move1 ?? "",
      teammate.move2 ?? "",
      teammate.move3 ?? "",
      teammate.move4 ?? "",
    ];
  }

  // 2. Effective: explicit override (non-empty) wins; else default
  const effectiveMoves: [string, string, string, string] = [
    defenderMoves[0] || defaults[0],
    defenderMoves[1] || defaults[1],
    defenderMoves[2] || defaults[2],
    defenderMoves[3] || defaults[3],
  ];

  const hasOverrides = defenderMoves.some((m, i) => Boolean(m) && m !== defaults[i]);

  return { effectiveMoves, hasOverrides };
}
