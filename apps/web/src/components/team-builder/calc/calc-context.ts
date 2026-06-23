"use client";

import { createContext, use } from "react";

import { type GameFormat } from "@trainers/pokemon";

import { type FieldState } from "../use-builder-state";
import {
  type UseCalcStateReturn,
  type AttackerSideState,
  type BaseSideState,
  type CalcDirection,
  type CalcOutput,
  type DefenderBoosts,
  type DefenderEvs,
  type DefenderIvs,
  type AttackerBoosts,
  type StatBoosts,
  type StatusLabel,
} from "../use-calc-state";

// =============================================================================
// Context value type
// =============================================================================

export interface CalcStateContextValue extends UseCalcStateReturn {
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

export const CalcStateContext = createContext<CalcStateContextValue | null>(null);
export const CalcEnabledContext = createContext<boolean>(false);

// =============================================================================
// Default (no-op) context value — returned when no provider is mounted
// =============================================================================

const noop = () => undefined;
const noopBoost = (_stat: keyof StatBoosts, _v: number) => undefined;
const noopOutputs: readonly (CalcOutput | null)[] = [null, null, null, null];
const noopDefenderMoves: readonly [string, string, string, string] = [
  "",
  "",
  "",
  "",
];
const noopAttackerSide: AttackerSideState = {
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  tailwind: false,
  helpingHand: false,
  friendGuard: false,
  protect: false,
  stealthRock: false,
  spikes: 0,
  saltCure: false,
  leechSeed: false,
  crit: false,
  singleTarget: false,
};
const noopDefenderSide: BaseSideState = {
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  tailwind: false,
  helpingHand: false,
  friendGuard: false,
  protect: false,
  stealthRock: false,
  spikes: 0,
  saltCure: false,
  leechSeed: false,
  crit: false,
  singleTarget: false,
};
const noopBoosts: AttackerBoosts = {
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};
const noopDefenderEvs: DefenderEvs = {
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};
const noopDefenderIvs: DefenderIvs = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};
const noopDefenderBoosts: DefenderBoosts = {
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};
const noopField: FieldState = {
  doubles: true,
  weather: null,
  terrain: null,
  screens: false,
  helpingHand: false,
  tailwind: false,
  stealthRock: false,
  defStage: 0,
  atkStage: 0,
  defStatus: "healthy",
  foesAlive: 2,
  allyAlive: true,
};

/**
 * Stable no-op default value used when children read from CalcStateContext
 * but no CalcStateProvider is mounted (e.g. before the dynamic import resolves).
 * Every member is type-valid so consumers can safely deref fields when
 * `calcEnabled` is false.
 */
export const DEFAULT_CALC_CONTEXT: CalcStateContextValue = {
  // Direction
  direction: "offense" as CalcDirection,
  setDirection: noop,
  // Active move
  selectedMoveIdx: 0,
  setSelectedMoveIdx: noop,
  // Crit per move
  critMoves: [false, false, false, false],
  toggleCrit: noop,
  // Attacker
  attackerStatus: "Healthy" as StatusLabel,
  setAttackerStatus: noop,
  attackerBoosts: noopBoosts,
  setAttackerBoost: noopBoost as (stat: keyof AttackerBoosts, v: number) => void,
  // Defender
  defenderSpecies: "",
  defenderAbility: "",
  defenderItem: "",
  defenderNature: "",
  defenderTera: "",
  defenderEvs: noopDefenderEvs,
  defenderIvs: noopDefenderIvs,
  defenderBoosts: noopDefenderBoosts,
  defenderStatus: "Healthy" as StatusLabel,
  defenderHpPercent: 100,
  defenderMoves: noopDefenderMoves,
  setDefenderSpecies: noop,
  setDefenderAbility: noop,
  setDefenderItem: noop,
  setDefenderNature: noop,
  setDefenderTera: noop,
  setDefenderEv: noopBoost as (stat: keyof DefenderEvs, v: number) => void,
  setDefenderIv: noopBoost as (stat: keyof DefenderIvs, v: number) => void,
  setDefenderBoost: noopBoost as (
    stat: keyof DefenderBoosts,
    v: number
  ) => void,
  setDefenderStatus: noop,
  setDefenderHpPercent: noop,
  attackerMegaActive: false,
  setAttackerMegaActive: noop,
  defenderMegaActive: false,
  setDefenderMegaActive: noop,
  setDefenderMove: (_slotIdx: number, _name: string) => undefined,
  resetDefenderForSpecies: noop,
  // Field
  gameType: "Doubles",
  weather: "",
  terrain: "",
  gravity: false,
  setGameType: noop,
  setWeather: noop,
  setTerrain: noop,
  setGravity: noop,
  fairyAura: false,
  setFairyAura: noop,
  magicRoom: false,
  setMagicRoom: noop,
  wonderRoom: false,
  setWonderRoom: noop,
  // Sides
  attackerSide: noopAttackerSide,
  defenderSide: noopDefenderSide,
  setAttackerSide: noop,
  setDefenderSide: noop,
  // Derived results
  moves: [null, null, null, null],
  moveCalcOutputs: noopOutputs,
  computeForwardOutputsForRow: () => noopOutputs,
  computeReverseOutputsForRow: () => noopOutputs,
  moveCalcOutputsReverse: noopOutputs,
  computeReverseOutput: () => null,
  selectedMoveName: null,
  selectedMoveOutput: null,
  inferredWeather: null,
  inferredTerrain: null,
  // CalcStateContextValue extras
  field: noopField,
  setField: noop,
  calcEnabled: false,
  format: undefined,
};

// =============================================================================
// Consumer hooks
// =============================================================================

/**
 * Returns the shared calc state from the workspace-level CalcStateProvider.
 * When called outside a provider, returns DEFAULT_CALC_CONTEXT (calcEnabled=false)
 * so consumers can safely deref fields without throwing.
 */
export function useCalcStateContext(): CalcStateContextValue {
  const ctx = use(CalcStateContext);
  return ctx ?? DEFAULT_CALC_CONTEXT;
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
