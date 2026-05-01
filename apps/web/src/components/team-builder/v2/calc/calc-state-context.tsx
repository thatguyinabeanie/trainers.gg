"use client";

import { createContext, use } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import {
  useCalcState,
  type UseCalcStateReturn,
} from "../../use-calc-state";
import { type FieldState } from "../use-builder-state";

// =============================================================================
// Context
// =============================================================================

interface CalcStateContextValue extends UseCalcStateReturn {
  /** Builder-level field state (foesAlive, allyAlive). */
  field: FieldState;
  setField: (patch: Partial<FieldState>) => void;
  /**
   * Whether calc-derived info should be surfaced in consumers like MovesLane.
   * The engine still runs (so toggling the drawer back on doesn't pay a re-mount
   * cost), but UI sites should hide damage previews / KO badges / spread chips
   * while the calc drawer is closed or the showCalc tweak is off.
   */
  calcEnabled: boolean;
}

const CalcStateContext = createContext<CalcStateContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface CalcStateProviderProps {
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

/**
 * Owns the useCalcState call at the workspace level so both the CalcDrawer
 * and the MovesLane can consume the same defender state without duplication.
 *
 * The provider does NOT key on selectedPokemon.id — defender state persists
 * intentionally when the active row switches (the user has configured a
 * target and shouldn't need to re-configure it on every row change).
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
  };

  return (
    <CalcStateContext value={value}>
      {children}
    </CalcStateContext>
  );
}

// =============================================================================
// Consumer hook
// =============================================================================

/**
 * Returns the shared calc state from the workspace-level CalcStateProvider.
 * Must be called within a <CalcStateProvider>.
 */
export function useCalcStateContext(): CalcStateContextValue {
  const ctx = use(CalcStateContext);
  if (!ctx) {
    throw new Error(
      "useCalcStateContext must be used within a <CalcStateProvider>"
    );
  }
  return ctx;
}
