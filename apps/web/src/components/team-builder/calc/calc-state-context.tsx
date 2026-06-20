"use client";

import { createContext, use } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import {
  useCalcState,
  type UseCalcStateReturn,
} from "../use-calc-state";
import { type FieldState } from "../use-builder-state";

// =============================================================================
// Contexts
//
// Two contexts on purpose:
// - CalcEnabledContext is a boolean-only read used by gating consumers
//   (poke-row's EmptyRow, ActiveRow) that don't need the rest of calc state.
//   Putting them on the fat context made them re-render on every weather /
//   defender / boost edit. Splitting this one bool out cuts ~7 unrelated
//   re-renders per edit (6 poke-rows + 1 ActiveRow per workspace).
// - CalcStateContext keeps the full state for MovesLane, CalcColumn, the
//   drawer, and the dock — which legitimately depend on outputs / field /
//   defender state to render their previews.
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
  /** Active game format — lets calc consumers fetch format-aware move data. */
  format: GameFormat | undefined;
}

const CalcStateContext = createContext<CalcStateContextValue | null>(null);
const CalcEnabledContext = createContext<boolean>(false);

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

// =============================================================================
// Consumer hooks
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

/**
 * Subscribe only to the `calcEnabled` boolean. Consumers that read only this
 * (poke-row's EmptyRow, ActiveRow) avoid re-rendering on every calc state
 * change. Reading from CalcStateContext also works but pays the full re-render
 * cost — prefer this hook when only the boolean is needed.
 */
export function useCalcEnabled(): boolean {
  return use(CalcEnabledContext);
}
