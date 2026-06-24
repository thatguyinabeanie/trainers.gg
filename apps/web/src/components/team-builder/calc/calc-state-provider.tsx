"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { type FieldState } from "../use-builder-state";
import { useCalcState } from "../use-calc-state";
import { CalcStateContext, CalcEnabledContext, type CalcStateContextValue } from "./calc-context";

// =============================================================================
// Provider props
// =============================================================================

export interface CalcStateProviderProps {
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
  field: FieldState;
  setField: (patch: Partial<FieldState>) => void;
  /** Whether calc results should be computed and surfaced (always true in the bottom-panel layout). */
  calcEnabled: boolean;
  children: React.ReactNode;
  /**
   * Number of fainted Pokémon on YOUR team (0..5).
   * Forwarded to useCalcState for Last Respects / Triumphant Wave BP scaling.
   */
  faintedYours?: number;
  /**
   * Number of fainted Pokémon on THEIR team (0..5).
   * Forwarded to useCalcState for Last Respects / Triumphant Wave BP scaling.
   */
  faintedTheirs?: number;
}

// =============================================================================
// Provider
// =============================================================================

/**
 * Owns the useCalcState call at the workspace level so both the CalcDrawer
 * and the MovesLane can consume the same defender state without duplication.
 *
 * The provider does NOT key on selectedPokemon.id — defender state persists
 * intentionally when the active row switches (the user has configured a
 * target and shouldn't need to re-configure it on every row change).
 *
 * This component is always-mounted in team-workspace.tsx. The @smogon/calc
 * engine is excluded from the initial JS chunk via a lazy dynamic import()
 * inside use-calc-state.ts — loaded on first mount, not gated on calc open.
 */
export function CalcStateProvider({
  selectedPokemon,
  format,
  field,
  setField,
  calcEnabled,
  children,
  faintedYours,
  faintedTheirs,
}: CalcStateProviderProps) {
  const calc = useCalcState({ selectedPokemon, format, faintedYours, faintedTheirs });

  const value: CalcStateContextValue = {
    ...calc,
    field,
    setField,
    calcEnabled,
    format,
  };

  return (
    <CalcEnabledContext value={calcEnabled}>
      <CalcStateContext value={value}>
        {children}
      </CalcStateContext>
    </CalcEnabledContext>
  );
}
