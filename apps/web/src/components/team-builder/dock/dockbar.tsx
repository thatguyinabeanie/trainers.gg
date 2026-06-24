"use client";

import { type ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { CopyrightYear } from "@/components/layout/copyright-year";

import { type CalcOutput } from "../use-calc-state";
import { getVerdict } from "../calc/calc-verdict";

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
  onOpen: (key: "matchups" | "speed" | "calc") => void;
  /** Left drawer state (speed tiers) */
  sideDrawer: "speed" | null;
  /** Right drawer state (damage calc) */
  rightDrawer: "calc" | null;
  /** Bottom drawer state (matchups) */
  bottomDrawer: "matchups" | null;
  /** Pre-computed fastest speed for the speed pill. */
  fastest: number;
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
 * The active pill is highlighted.
 */
export function Dockbar({
  onOpen,
  sideDrawer,
  rightDrawer,
  bottomDrawer,
  fastest: _fastest,
}: DockbarProps) {
  const isMatchupsActive = bottomDrawer === "matchups";
  const isSpeedActive = sideDrawer === "speed";
  const isCalcActive = rightDrawer === "calc";

  return (
    <div className="bg-background relative w-full rounded-b-lg border-t">
      {/* Footer disclaimer — left side, absolutely positioned */}
      <p className="text-muted-foreground absolute top-1/2 left-3 hidden -translate-y-1/2 text-xs lg:block">
        Not affiliated with Nintendo, The Pok&eacute;mon Company, or Game Freak.
      </p>

      <div
        role="toolbar"
        aria-label="Builder tools"
        className="flex min-w-0 items-center justify-center gap-2 overflow-x-auto px-3 py-2"
      >
        {/* Type matchups pill */}
        <DockPill
          active={isMatchupsActive}
          onOpen={() => onOpen("matchups")}
          ariaLabel="Defensive type matchups"
        >
          <span className="shrink-0 text-base leading-none" aria-hidden>
            ▦
          </span>
          <span className="text-xs leading-none font-semibold">
            Type matchups
          </span>
          <span
            className="text-muted-foreground ml-1 shrink-0 text-xs"
            aria-hidden
          >
            {isMatchupsActive ? "▾" : "▴"}
          </span>
        </DockPill>

        {/* Speed tiers pill */}
        <DockPill
          active={isSpeedActive}
          onOpen={() => onOpen("speed")}
          ariaLabel="Speed tier ladder"
        >
          <span className="shrink-0 text-base leading-none" aria-hidden>
            ≫
          </span>
          <span className="text-xs leading-none font-semibold">
            Speed tiers
          </span>
          <span
            className="text-muted-foreground ml-1 shrink-0 text-xs"
            aria-hidden
          >
            {isSpeedActive ? "▾" : "▴"}
          </span>
        </DockPill>

        {/* Damage calc pill */}
        <DockPill
          active={isCalcActive}
          onOpen={() => onOpen("calc")}
          ariaLabel="Damage calc"
        >
          <span className="shrink-0 text-base leading-none" aria-hidden>
            🎯
          </span>
          <span className="text-xs leading-none font-semibold">
            Damage calc
          </span>
          <span
            className="text-muted-foreground ml-1 shrink-0 text-xs"
            aria-hidden
          >
            {isCalcActive ? "▾" : "▴"}
          </span>
        </DockPill>
      </div>

      {/* Footer copyright — right side, absolutely positioned */}
      <p className="text-muted-foreground absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-1 text-xs whitespace-nowrap lg:flex">
        <a
          href="https://x.com/thatguyinabeani"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/icons/beanie_logo.png"
            alt="Beanie LLC"
            width={28}
            height={28}
            className="inline-block"
          />
        </a>
        &copy; <CopyrightYear /> Beanie LLC
      </p>
    </div>
  );
}
