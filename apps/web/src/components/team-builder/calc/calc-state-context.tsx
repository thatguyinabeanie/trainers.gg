"use client";

/**
 * Thin barrel — re-exports everything callers depend on so existing import
 * sites continue to work unchanged.
 *
 * The heavy @smogon/calc engine now lives exclusively in:
 *   ./calc-state-provider  (loaded lazily via next/dynamic in team-workspace.tsx)
 *   ../use-calc-state      (imported only by calc-state-provider)
 *
 * Context objects, hooks, and the no-op default live in ./calc-context (no
 * engine import), so any component that just reads calc state doesn't pull
 * in the engine bundle.
 */

export {
  useCalcStateContext,
  useCalcEnabled,
  DEFAULT_CALC_CONTEXT,
  type CalcStateContextValue,
} from "./calc-context";

export { CalcStateProvider } from "./calc-state-provider";
export type { CalcStateProviderProps } from "./calc-state-provider";
