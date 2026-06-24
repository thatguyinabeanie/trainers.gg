"use client";

/**
 * Thin barrel — re-exports only the LIGHT calc-context surface (hooks, the
 * no-op default, the value type) so existing always-on import sites keep
 * working unchanged WITHOUT pulling in the engine.
 *
 * IMPORTANT: this barrel must NOT re-export `CalcStateProvider`. The provider
 * lives in ./calc-state-provider, which imports ../use-calc-state. use-calc-state
 * dynamically imports ./calc-engine → @smogon/calc at runtime. A static
 * re-export here would drag the engine into every always-on consumer that
 * imports a hook from this barrel (dev bundlers don't tree-shake unused
 * re-exports), defeating the code-split. The provider is imported directly
 * from ./calc-state-provider in team-workspace.tsx and in tests.
 */

export {
  useCalcStateContext,
  useCalcEnabled,
  DEFAULT_CALC_CONTEXT,
  type CalcStateContextValue,
} from "./calc-context";
