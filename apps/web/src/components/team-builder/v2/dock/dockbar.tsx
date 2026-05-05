"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  getVerdict,
  type CalcOutput,
} from "../../use-calc-state";

// =============================================================================
// Internal components
// =============================================================================

interface DockPillProps {
  active: boolean;
  onOpen: () => void;
  ariaLabel: string;
  children: ReactNode;
}

function DockPill({ active, onOpen, ariaLabel, children }: DockPillProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={ariaLabel}
      aria-pressed={active}
      className={cn(
        "flex min-w-0 shrink items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors duration-150",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Types
// =============================================================================

export interface DockbarProps {
  drawer: "matchups" | "speed" | "calc" | null;
  onOpen: (key: "matchups" | "speed" | "calc") => void;
  /** Side drawer state (calc/speed) for independent active tracking. */
  sideDrawer?: "speed" | "calc" | null;
  /** Bottom drawer state (matchups) for independent active tracking. */
  bottomDrawer?: "matchups" | null;
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
export function getWorstCaseVerdict(
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
  sideDrawer,
  bottomDrawer,
  fastest: _fastest,
  defenderSpecies,
  moveCalcOutputs,
}: DockbarProps) {

  // Use split state if available, fall back to legacy `drawer` for compat
  const isMatchupsActive = bottomDrawer !== undefined ? bottomDrawer === "matchups" : drawer === "matchups";
  const isSpeedActive = sideDrawer !== undefined ? sideDrawer === "speed" : drawer === "speed";
  const isCalcActive = sideDrawer !== undefined ? sideDrawer === "calc" : drawer === "calc";

  const _calcVerdict = getWorstCaseVerdict(moveCalcOutputs);
  const calcSubLabel = defenderSpecies
    ? `vs ${defenderSpecies}`
    : "no target";

  return (
    <div className="@container/dock w-full rounded-b-lg border-t bg-background">
    <div
      role="toolbar"
      aria-label="Builder tools"
      className="flex min-w-0 items-center gap-2 overflow-x-auto flex-nowrap px-3 py-2 @[700px]/dock:flex-wrap @[700px]/dock:overflow-visible @[700px]/dock:justify-center"
    >
      {/* Type matchups pill */}
      <DockPill
        active={isMatchupsActive}
        onOpen={() => onOpen("matchups")}
        ariaLabel="Defensive type matchups"
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          ▦
        </span>
        <span className="text-xs font-semibold leading-none">
          Type matchups
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {isMatchupsActive ? "▾" : "▴"}
        </span>
      </DockPill>

      {/* Speed tiers pill */}
      <DockPill
        active={isSpeedActive}
        onOpen={() => onOpen("speed")}
        ariaLabel="Speed tier ladder"
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          ≫
        </span>
        <span className="text-xs font-semibold leading-none">
          Speed tiers
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {isSpeedActive ? "▾" : "▴"}
        </span>
      </DockPill>

      {/* Damage calc pill */}
      <DockPill
        active={isCalcActive}
        onOpen={() => onOpen("calc")}
        ariaLabel="Damage calc"
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
          </span>
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {isCalcActive ? "▾" : "▴"}
        </span>
      </DockPill>

    </div>
    </div>
  );
}
