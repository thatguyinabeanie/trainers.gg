"use client";

import { getMoveData } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcStateContext } from "../calc/calc-state-context";
import { getMoveEffectiveness } from "../calc/move-effectiveness";
import { type CalcOutput } from "../../use-calc-state";
import { getDisplayRangeAndKoTier } from "./calc-display-helpers";

// =============================================================================
// Types
// =============================================================================

interface CalcColumnProps {
  pokemon: Tables<"pokemon"> | null;
}

// =============================================================================
// Helpers
// =============================================================================

const MOVE_SLOTS = ["move1", "move2", "move3", "move4"] as const;

// =============================================================================
// CalcRow — one result row aligned to a MoveTile
// =============================================================================

interface CalcRowProps {
  moveName: string | null;
  /**
   * Pre-computed forward output for this row + slot, from
   * `calc.computeForwardOutputsForRow(rowPokemon)`. Null when the slot has no
   * move, the row has no pokemon, or the calc engine couldn't build an
   * attacker/defender (e.g. defender not configured yet).
   */
  output: CalcOutput | null;
  /**
   * Whether this row's pokemon is non-null. An empty slot still renders a
   * placeholder column (for width parity with active rows) but its CalcRow
   * must not show calc-specific placeholder text — those messages describe
   * a configured pokemon's state, not an empty slot.
   */
  hasPokemon: boolean;
}

function CalcRow({ moveName, output, hasPokemon }: CalcRowProps) {
  const calc = useCalcStateContext();

  const moveData = moveName ? getMoveData(moveName) : null;
  const isStatus = moveData?.category === "Status";
  const canShowCalcState = calc.calcEnabled && hasPokemon;
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
          <span className="flex-shrink-0 font-mono text-[8.5px] font-black tracking-[0.07em] uppercase">
            {koTier === "1"
              ? "OHKO"
              : koTier === "2"
                ? "2HKO"
                : koTier === "3"
                  ? "3HKO"
                  : "4HKO+"}
          </span>
          <span className="flex-shrink-0 tabular-nums">
            {displayMin.toFixed(1)}–{displayMax.toFixed(1)}%
          </span>
          {((eff !== null && eff !== 1) || spreadApplied) && (
            <span className="flex items-center gap-1">
              {eff !== null && eff !== 1 && (
                <span
                  className={cn(
                    "rounded px-1 py-px text-[8.5px] font-bold",
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
                  className="text-muted-foreground text-[8.5px] font-bold"
                  title="Spread −25%"
                >
                  spread
                </span>
              )}
            </span>
          )}
        </>
      ) : canShowCalcState &&
        moveName &&
        !isStatus &&
        hasDefender &&
        output === null ? (
        <span className="text-muted-foreground/70 text-[9.5px] font-normal italic">
          — unavailable —
        </span>
      ) : canShowCalcState && moveName && !isStatus && !hasDefender ? (
        <span className="text-muted-foreground/50 text-[9.5px] font-normal italic">
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
 * Rendered beside MovesLane when calc.calcEnabled is true. Each row aligns
 * with the corresponding MoveTile row. Every row in the team (not just the
 * workspace active row) computes its own per-row outputs against the shared
 * defender via `calc.computeForwardOutputsForRow(pokemon)`.
 */
export function CalcColumn({ pokemon }: CalcColumnProps) {
  const calc = useCalcStateContext();
  const outputs = calc.computeForwardOutputsForRow(pokemon);
  const hasPokemon = pokemon !== null;
  return (
    <div className="calc-col">
      <div className="calc-col-header">CALC</div>
      {MOVE_SLOTS.map((slot, i) => (
        <CalcRow
          key={slot}
          moveName={pokemon ? pokemon[slot] || null : null}
          output={outputs[i] ?? null}
          hasPokemon={hasPokemon}
        />
      ))}
    </div>
  );
}
