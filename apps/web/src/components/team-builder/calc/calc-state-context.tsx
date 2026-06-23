"use client";

/**
 * Thin barrel — re-exports only the LIGHT calc-context surface (hooks, the
 * no-op default, the value type) so existing always-on import sites keep
 * working unchanged WITHOUT pulling in the engine.
 *
 * IMPORTANT: this barrel must NOT re-export `CalcStateProvider`. The provider
 * lives in ./calc-state-provider, which imports ../use-calc-state →
 * @smogon/calc. A static re-export here would drag the engine into every
 * always-on consumer that imports a hook from this barrel (dev bundlers don't
 * tree-shake the unused re-export), defeating the code-split. The provider is
 * imported directly: lazily via next/dynamic in team-workspace.tsx, and
 * directly from ./calc-state-provider in tests.
 */

export {
  useCalcStateContext,
  useCalcEnabled,
  DEFAULT_CALC_CONTEXT,
  type CalcStateContextValue,
} from "./calc-context";
