"use client";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcStateContext } from "../calc/calc-state-context";
import { getMoveEffectiveness } from "../calc/move-effectiveness";
import { getMoveTargetInfo } from "../calc/move-target-info";
import { getVerdict } from "../../use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcColumnProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
}

type KoTier = "1" | "2" | "3" | "4" | null;

// =============================================================================
// Helpers
// =============================================================================

const MOVE_SLOTS = ["move1", "move2", "move3", "move4"] as const;
type MoveSlot = (typeof MOVE_SLOTS)[number];

function getKoTier(minPct: number, maxPct: number): KoTier {
  const verdict = getVerdict(minPct, maxPct);
  if (verdict === "OHKO") return "1";
  if (verdict === "2HKO") return "2";
  if (verdict === "3HKO") return "3";
  if (maxPct > 0) return "4";
  return null;
}

// =============================================================================
// CalcRow — one result row aligned to a MoveTile
// =============================================================================

interface CalcRowProps {
  slotIndex: number;
  moveName: string | null;
}

function CalcRow({ slotIndex, moveName }: CalcRowProps) {
  const calc = useCalcStateContext();
  const output = calc.moveCalcOutputs[slotIndex] ?? null;

  const moveData = moveName ? getMoveData(moveName) : null;
  const isStatus = moveData?.category === "Status";
  const hasCalc = calc.calcEnabled && output !== null && !isStatus;
  const hasDefender = calc.calcEnabled && Boolean(calc.defenderSpecies);

  const targetInfo = moveName ? getMoveTargetInfo(moveName) : null;
  const isSpread = targetInfo?.isSpread ?? false;
  const foesAlive = calc.field.foesAlive;
  const allyAlive = calc.field.allyAlive;
  const spreadApplied =
    isSpread &&
    (targetInfo?.kind === "all-foes"
      ? foesAlive >= 2
      : foesAlive >= 2 || allyAlive);

  const rawMin = output?.minPercent ?? 0;
  const rawMax = output?.maxPercent ?? 0;
  const displayMin = spreadApplied ? rawMin * 0.75 : rawMin;
  const displayMax = spreadApplied ? rawMax * 0.75 : rawMax;

  const koTier = hasCalc ? getKoTier(displayMin, displayMax) : null;
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
      ) : moveName && !isStatus && hasDefender && output === null ? (
        <span className="text-[9.5px] italic text-muted-foreground/70 font-normal">
          — unavailable —
        </span>
      ) : moveName && !isStatus && !hasDefender ? (
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
export function CalcColumn({ pokemon, format: _format }: CalcColumnProps) {
  return (
    <div className="calc-col">
      <div className="calc-col-header">CALC</div>
      {MOVE_SLOTS.map((slot, i) => (
        <CalcRow
          key={slot}
          slotIndex={i}
          moveName={pokemon[slot as MoveSlot] ?? null}
        />
      ))}
    </div>
  );
}
