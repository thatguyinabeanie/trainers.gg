"use client";

import { getMoveData } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcStateContext } from "../calc/calc-state-context";
import { getMoveEffectiveness } from "../calc/move-effectiveness";
import { getDisplayRangeAndKoTier } from "./calc-display-helpers";

// =============================================================================
// Types
// =============================================================================

interface CalcColumnProps {
  pokemon: Tables<"pokemon"> | null;
  /** True when this column belongs to the workspace's active row. */
  isActive: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

const MOVE_SLOTS = ["move1", "move2", "move3", "move4"] as const;
type MoveSlot = (typeof MOVE_SLOTS)[number];

// =============================================================================
// CalcRow — one result row aligned to a MoveTile
// =============================================================================

interface CalcRowProps {
  slotIndex: number;
  moveName: string | null;
  /**
   * Whether the parent ActiveRow is the workspace's active row.
   * `calc.moveCalcOutputs` is keyed to the active pokemon, so non-active
   * expanded rows must NOT render calc results OR calc-specific placeholders
   * ("— pick target —" / "— unavailable —") — those messages describe the
   * active row's state. Non-active rows always show the neutral em-dash.
   */
  isActive: boolean;
}

function CalcRow({ slotIndex, moveName, isActive }: CalcRowProps) {
  const calc = useCalcStateContext();
  const output = calc.moveCalcOutputs[slotIndex] ?? null;

  const moveData = moveName ? getMoveData(moveName) : null;
  const isStatus = moveData?.category === "Status";
  // Only show calc-specific UI on the active row. `moveCalcOutputs` is keyed
  // to the active pokemon's slot index, so non-active expanded rows must not
  // render results OR calc-specific placeholders ("— pick target —" /
  // "— unavailable —") — those messages still describe the active row's
  // state. Non-active rows fall through to the neutral em-dash placeholder.
  const canShowCalcState = calc.calcEnabled && isActive;
  const hasDefender = Boolean(calc.defenderSpecies);
  const hasCalc =
    canShowCalcState && moveName !== null && output !== null && !isStatus;

  const { spreadApplied, displayMin, displayMax, koTier } =
    getDisplayRangeAndKoTier({
      moveName,
      output,
      hasCalc,
      foesAlive: calc.field.foesAlive,
      allyAlive: calc.field.allyAlive,
    });

  const effectiveWeather = calc.weather || calc.inferredWeather;
  const eff =
    moveName && hasDefender && !isStatus
      ? getMoveEffectiveness(moveName, calc.defenderSpecies, effectiveWeather)
      : null;

  return (
    <div className={cn("calc-col-row", koTier && `calc-col-row--ko${koTier}`)}>
      {hasCalc && koTier ? (
        <>
          <span className="font-mono text-[8.5px] font-black tracking-[0.07em] uppercase flex-shrink-0">
            {koTier === "1" ? "OHKO" : koTier === "2" ? "2HKO" : koTier === "3" ? "3HKO" : "4HKO+"}
          </span>
          <span className="tabular-nums flex-shrink-0">
            {displayMin.toFixed(1)}–{displayMax.toFixed(1)}%
          </span>
          {((eff !== null && eff !== 1) || spreadApplied) && (
            <span className="flex items-center gap-1">
              {eff !== null && eff !== 1 && (
                <span
                  className={cn(
                    "text-[8.5px] font-bold px-1 py-px rounded",
                    eff > 1
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : eff === 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/60 text-muted-foreground"
                  )}
                  title={eff === 0 ? "Immune" : `${eff}× effectiveness`}
                >
                  {eff}×
                </span>
              )}
              {spreadApplied && (
                <span
                  className="text-[8.5px] font-bold text-muted-foreground"
                  title="Spread −25%"
                >
                  spread
                </span>
              )}
            </span>
          )}
        </>
      ) : canShowCalcState && moveName && !isStatus && hasDefender && output === null ? (
        <span className="text-[9.5px] italic text-muted-foreground/70 font-normal">
          — unavailable —
        </span>
      ) : canShowCalcState && moveName && !isStatus && !hasDefender ? (
        <span className="text-[9.5px] italic text-muted-foreground/50 font-normal">
          — pick target —
        </span>
      ) : (
        <span className="text-muted-foreground/30 font-normal">—</span>
      )}
    </div>
  );
}

// =============================================================================
// CalcColumn
// =============================================================================

/**
 * Fixed 160px column showing damage calc results for all 4 move slots.
 * Rendered beside MovesLane when calc.calcEnabled is true.
 * Each row aligns with the corresponding MoveTile row.
 */
export function CalcColumn({ pokemon, isActive }: CalcColumnProps) {
  return (
    <div className="calc-col">
      <div className="calc-col-header">CALC</div>
      {MOVE_SLOTS.map((slot, i) => (
        <CalcRow
          key={slot}
          slotIndex={i}
          moveName={pokemon ? pokemon[slot as MoveSlot] || null : null}
          isActive={isActive}
        />
      ))}
    </div>
  );
}
