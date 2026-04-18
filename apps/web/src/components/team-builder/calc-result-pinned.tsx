"use client";

import { cn } from "@/lib/utils";

import { type CalcOutput } from "./use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcResultPinnedProps {
  /** The displayed attacker name (after applying direction). */
  attackerName: string;
  /** The displayed defender name (after applying direction). */
  defenderName: string;
  /** The active move name, or null if no move is selected. */
  moveName: string | null;
  /** The calc output for the active move, or null. */
  output: CalcOutput | null;
  /** Optional placeholder message — defaults to a sensible fallback. */
  placeholder?: string;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Verdict text + tone for display. Only called with a non-null output (see ActiveResult). */
function describeVerdict(output: CalcOutput): {
  label: string;
  tone: "guaranteed" | "chance" | "none";
} {
  // OHKO bands take priority — a roll that can KO in one hit is the headline.
  if (output.minPercent >= 100) {
    return { label: "Guaranteed OHKO", tone: "guaranteed" };
  }
  if (output.maxPercent >= 100) {
    return { label: "Possible OHKO", tone: "chance" };
  }
  if (output.minPercent >= 50) {
    return { label: "Guaranteed 2HKO", tone: "guaranteed" };
  }
  if (output.maxPercent >= 50) {
    return { label: "Possible 2HKO", tone: "chance" };
  }
  if (output.minPercent >= 34) {
    return { label: "Guaranteed 3HKO", tone: "guaranteed" };
  }
  if (output.maxPercent >= 34) {
    return { label: "Possible 3HKO", tone: "chance" };
  }
  return { label: "No KO", tone: "none" };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Pinned damage-calc result band. Shows the active matchup, the percentage
 * range, and a verdict label colored by certainty. When no move is selected
 * (or selected pokemon is null) it renders a placeholder caption.
 */
export function CalcResultPinned({
  attackerName,
  defenderName,
  moveName,
  output,
  placeholder = "Pick an attacker move to calculate.",
  className,
}: CalcResultPinnedProps) {
  const isPlaceholder = !moveName || !output;

  return (
    <div
      data-testid="calc-result-pinned"
      className={cn(
        "to-card border-b bg-gradient-to-br from-emerald-50 px-4 py-3 dark:from-emerald-950/30",
        className
      )}
    >
      <p className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
        Result
      </p>

      {isPlaceholder ? (
        <p className="text-muted-foreground mt-2 text-xs">{placeholder}</p>
      ) : (
        <ActiveResult
          attackerName={attackerName}
          defenderName={defenderName}
          moveName={moveName}
          output={output}
        />
      )}
    </div>
  );
}

// =============================================================================
// ActiveResult — narrowed type, no placeholder branch
// =============================================================================

interface ActiveResultProps {
  attackerName: string;
  defenderName: string;
  moveName: string;
  output: CalcOutput;
}

function ActiveResult({
  attackerName,
  defenderName,
  moveName,
  output,
}: ActiveResultProps) {
  const { label, tone } = describeVerdict(output);

  return (
    <>
      <p className="mt-1.5 text-xs font-semibold">
        <span data-testid="calc-result-attacker">{attackerName}</span>
        <span className="text-muted-foreground mx-1">→</span>
        <span data-testid="calc-result-defender">{defenderName}</span>
        <span className="text-muted-foreground mx-1">·</span>
        <span data-testid="calc-result-move">{moveName}</span>
      </p>

      <p
        data-testid="calc-result-range"
        className="mt-1 font-mono text-2xl leading-none font-bold text-emerald-700 dark:text-emerald-400"
      >
        {output.minPercent}–{output.maxPercent}%
      </p>

      <p
        data-testid="calc-result-verdict"
        className={cn(
          "text-foreground mt-1.5 text-xs",
          tone === "guaranteed" && "font-semibold text-emerald-600",
          tone === "chance" && "text-amber-600"
        )}
      >
        {label}
      </p>
    </>
  );
}
