"use client";

import { cn } from "@/lib/utils";

import {
  getVerdict,
  type CalcOutput,
} from "../../use-calc-state";

// =============================================================================
// Types
// =============================================================================

export interface DockbarProps {
  drawer: "matchups" | "speed" | "calc" | null;
  onOpen: (key: "matchups" | "speed" | "calc") => void;
  /** Pre-computed weak-type count for the matchups pill. */
  weakCount: number;
  /** Pre-computed covered-type count for the matchups pill. */
  coveredCount: number;
  /** Pre-computed fastest speed for the speed pill. */
  fastest: number;
  /** Active attacker's defender name, for the calc pill label. */
  defenderSpecies: string;
  /** Calc outputs for all 4 attacker moves, for the calc pill verdict. */
  moveCalcOutputs: readonly (CalcOutput | null)[];
}

// =============================================================================
// Dockbar
// =============================================================================

/**
 * Computes the worst-case KO verdict across all move calc outputs.
 * OHKO > 2HKO > 3HKO > null — returns the highest-damage tier present.
 */
function getWorstCaseVerdict(
  outputs: readonly (CalcOutput | null)[]
): string | null {
  let best: string | null = null;
  for (const output of outputs) {
    if (!output) continue;
    const v = getVerdict(output.minPercent, output.maxPercent);
    if (v === "OHKO") return "OHKO"; // Can't do better
    if (v === "2HKO" && best !== "OHKO") best = "2HKO";
    else if (v === "3HKO" && best === null) best = "3HKO";
  }
  return best;
}

/**
 * Bottom dock toolbar with three pill buttons: Type matchups, Speed tiers,
 * and Damage calc.
 *
 * Each pill shows live mini-stats derived from the current team:
 *   - Matchups: "<weakCount> weak · <coveredCount> covered"
 *   - Speed: "<fastest> fastest · vs format"
 *   - Calc: "vs <defender> · <verdict>"
 *
 * The active pill is highlighted.
 */
export function Dockbar({
  drawer,
  onOpen,
  weakCount,
  coveredCount,
  fastest,
  defenderSpecies,
  moveCalcOutputs,
}: DockbarProps) {

  const calcVerdict = getWorstCaseVerdict(moveCalcOutputs);
  const calcSubLabel = defenderSpecies
    ? `vs ${defenderSpecies}`
    : "no target";

  return (
    <div
      role="toolbar"
      aria-label="Builder tools"
      className="flex min-w-0 shrink-0 flex-wrap items-center justify-center gap-2 border-t bg-background px-3 py-2"
    >
      {/* Type matchups pill */}
      <button
        type="button"
        onClick={() => onOpen("matchups")}
        title="Defensive type matchups"
        aria-pressed={drawer === "matchups"}
        className={cn(
          "flex min-w-0 shrink items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors duration-150",
          drawer === "matchups"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          ▦
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold leading-none">
            Type matchups
          </span>
          <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] leading-none text-muted-foreground">
            <span
              className={cn(
                "font-semibold",
                weakCount > 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {weakCount}
            </span>
            <span>weak</span>
            <span className="opacity-40">·</span>
            <span
              className={cn(
                "font-semibold",
                coveredCount > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              {coveredCount}
            </span>
            <span className="hidden sm:inline">covered</span>
          </span>
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {drawer === "matchups" ? "▾" : "▴"}
        </span>
      </button>

      {/* Speed tiers pill */}
      <button
        type="button"
        onClick={() => onOpen("speed")}
        title="Speed tier ladder"
        aria-pressed={drawer === "speed"}
        className={cn(
          "flex min-w-0 shrink items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors duration-150",
          drawer === "speed"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          ≫
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold leading-none">
            Speed tiers
          </span>
          <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] leading-none text-muted-foreground">
            <span className="font-semibold">
              {fastest > 0 ? fastest : "—"}
            </span>
            <span>fastest</span>
            <span className="hidden opacity-40 sm:inline">·</span>
            <span className="hidden sm:inline">vs format</span>
          </span>
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {drawer === "speed" ? "▾" : "▴"}
        </span>
      </button>

      {/* Damage calc pill */}
      <button
        type="button"
        onClick={() => onOpen("calc")}
        title="Damage calc"
        aria-pressed={drawer === "calc"}
        className={cn(
          "flex min-w-0 shrink items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors duration-150",
          drawer === "calc"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          🎯
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold leading-none">
            Damage calc
          </span>
          <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] leading-none text-muted-foreground">
            <span className="truncate">{calcSubLabel}</span>
            {calcVerdict && (
              <>
                <span className="opacity-40">·</span>
                <span className="font-semibold text-primary">
                  {calcVerdict}
                </span>
              </>
            )}
            {!calcVerdict && defenderSpecies && (
              <>
                <span className="opacity-40">·</span>
                <span>—</span>
              </>
            )}
          </span>
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {drawer === "calc" ? "▾" : "▴"}
        </span>
      </button>

    </div>
  );
}
