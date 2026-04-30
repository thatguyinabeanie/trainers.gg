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
  /** Builder-level field state (foesAlive, allyAlive, atkTera). */
  field: FieldState;
  setField: (field: FieldState) => void;
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
  setField: (field: FieldState) => void;
  /** Whether the calc panel is currently visible (showCalc tweak && calcOpen). */
  calcEnabled: boolean;
  children: React.ReactNode;
}

/**
 * Owns the useCalcState call at the workspace level so both the CalcDrawer
 * and the MovesLane can consume the same defender state without duplication.
 *
 * The provider does NOT key on selectedPokemon.id — defender state persists
 * intentionally when the active row switches (the user has configured a
 * target and shouldn't need to re-configure it on every row change).
 * CalcDrawer previously keyed on selectedPokemon.id via CalcDrawerInner;
 * that key has been removed and now lives here implicitly (no reset on switch).
 */
export function CalcStateProvider({
  selectedPokemon,
  format,
  field,
  setField,
  calcEnabled,
  children,
}: CalcStateProviderProps) {
  const calc = useCalcState({ selectedPokemon, format });

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
