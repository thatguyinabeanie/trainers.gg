"use client";

import { useState } from "react";
import { type MoveComboRow, type SpeciesUsagePeriod } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { DataChartCard } from "./data-chart-card";
import { MoveChip } from "./move-chip";
import { BuildThisButton } from "./build-this-button";

// =============================================================================
// Constants
// =============================================================================

/** Maximum combos shown on wide viewports (≥ lg). */
const MAX_COMBOS_WIDE = 12;

/** Maximum combos shown on narrow viewports (< lg). */
const MAX_COMBOS_NARROW = 8;

/**
 * A move present in this percentage of shown combos or more is considered
 * "core" — always on the species.
 */
const CORE_THRESHOLD = 0.8;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Back-compute the denominator N from the top combo row.
 *
 * The RPC returns `comboPct = round(100.0 * players / N, 2)`, so:
 *   N = players / (comboPct / 100)
 *
 * Guards:
 * - Returns null when `combos` is empty.
 * - Returns null when `comboPct` is 0 (would divide by zero).
 */
function backComputeN(combos: MoveComboRow[]): number | null {
  const top = combos[0];
  if (!top) return null;
  if (top.comboPct === 0) return null;
  return Math.round(top.players / (top.comboPct / 100));
}

/**
 * Derive the "core" moves from the shown combos.
 *
 * A move is "core" if it appears in ≥ CORE_THRESHOLD of the shown combos.
 * The flex count is the number of distinct moves that are NOT core.
 * Returns an object: { coreMoves, flexCount }.
 */
function deriveCoreAndFlex(shownCombos: MoveComboRow[]): {
  coreMoves: string[];
  flexCount: number;
} {
  if (shownCombos.length === 0) return { coreMoves: [], flexCount: 0 };

  const moveCounts = new Map<string, number>();
  for (const combo of shownCombos) {
    // Each combo has exactly 4 moves; track how many combos each move appears in.
    const seen = new Set<string>();
    for (const move of combo.moves) {
      const normalized = move.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        moveCounts.set(normalized, (moveCounts.get(normalized) ?? 0) + 1);
      }
    }
  }

  const threshold = CORE_THRESHOLD * shownCombos.length;
  const coreMoves: string[] = [];
  let flexCount = 0;

  for (const [move, count] of moveCounts.entries()) {
    if (count >= threshold) {
      coreMoves.push(move);
    } else {
      flexCount++;
    }
  }

  return { coreMoves, flexCount };
}

// =============================================================================
// SpeciesMoveCombos
// =============================================================================

interface SpeciesMoveCombosProps {
  /** Ranked true 4-move combos from get_species_move_combos. */
  combos: MoveComboRow[];
  /** Species slug — forwarded to `BuildThisButton`. */
  species: string;
  /**
   * Latest period detail — forwarded to `BuildThisButton` so it can
   * build a set using the top combo's moves combined with the modal
   * item/ability/tera from the fingerprint data.
   */
  latestDetail: SpeciesUsagePeriod | null;
}

/**
 * Ranked true 4-move joint-distribution view.
 *
 * Shows complete 4-move sets as they actually appear across team sheets —
 * this is the honest replacement for a Sankey flowchart, which would multiply
 * marginal move percentages and imply joint distributions that are not real.
 * Every row here represents a genuinely observed combination.
 *
 * - Wrapped in DataChartCard titled "Move combos".
 * - Summary header: denominator N back-computed from the top row.
 * - Core/flex line: moves present in ≥80% of shown combos.
 * - Each row: rank, 4 MoveChips, player count, percentage bar.
 * - Shows top 12 on wide viewports, top 8 on narrow.
 * - "+N more" line when there are additional combos beyond the cap.
 */
export function SpeciesMoveCombos({
  combos,
  species,
  latestDetail,
}: SpeciesMoveCombosProps) {
  // Toggle between narrow (8) and wide (12) — controlled by Tailwind grid
  // breakpoints. We use a single state that tracks whether the user has
  // explicitly expanded to show more on narrow viewports.
  const [showAll, setShowAll] = useState(false);

  if (combos.length === 0) {
    return (
      <DataChartCard title="Move combos">
        <div className="text-muted-foreground flex min-h-24 items-center justify-center px-4 py-6 text-sm">
          No complete 4-move sets found for the current filters.
        </div>
      </DataChartCard>
    );
  }

  // --- Denominator back-computation ---
  const n = backComputeN(combos);

  // --- Determine how many combos to show ---
  // On wide screens always show MAX_COMBOS_WIDE; on narrow show MAX_COMBOS_NARROW
  // unless the user has toggled "show all". We apply both caps in the render
  // so we can compute core/flex from the "shown" set.
  const capWide = Math.min(combos.length, MAX_COMBOS_WIDE);
  const capNarrow = showAll
    ? Math.min(combos.length, MAX_COMBOS_WIDE)
    : Math.min(combos.length, MAX_COMBOS_NARROW);

  // Use capWide for the wide variant, capNarrow for narrow.
  // We display the wide variant's combos for core/flex since it represents the
  // most information.
  const shownCombos = combos.slice(0, capWide);
  const { coreMoves, flexCount } = deriveCoreAndFlex(shownCombos);
  const hasCore = coreMoves.length > 0;

  const remainingWide = combos.length - capWide;
  const remainingNarrow = combos.length - capNarrow;

  // Max pct for bar width scaling — use the first combo's pct as the anchor.
  const maxPct = combos[0]?.comboPct ?? 100;

  // Build a detail variant using the top combo's 4 specific moves for the
  // "Build this" button so the user gets a set that matches the top combo,
  // not just the individually most-used moves (which can differ from the
  // top joint distribution).
  const topComboMoves = combos[0]?.moves ?? [];
  const detailWithTopComboMoves: SpeciesUsagePeriod | null =
    latestDetail !== null && topComboMoves.length === 4
      ? {
          ...latestDetail,
          moves: topComboMoves.map((m, i) => ({ value: m, count: i, pct: 0 })),
        }
      : latestDetail;

  return (
    <DataChartCard
      title="Move combos"
      caption={
        n !== null ? (
          <>
            Among the {n.toLocaleString()} players who ran a complete 4-move
            set.
          </>
        ) : undefined
      }
      actions={
        <BuildThisButton
          species={species}
          detail={detailWithTopComboMoves}
        />
      }
    >
      <div className="flex flex-col gap-1 px-4 py-3">
        {/* Core/flex summary line */}
        {hasCore && (
          <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-foreground font-medium">Core:</span>
            {coreMoves.map((move) => (
              <MoveChip key={move} move={move} />
            ))}
            {flexCount > 0 && (
              <span className="text-muted-foreground">· {flexCount} flex</span>
            )}
          </div>
        )}

        {/* Combo rows — wide (lg+): show up to 12; narrow: show up to 8 (or all if expanded) */}
        {/* Narrow rows */}
        <div className="flex flex-col gap-2 lg:hidden">
          {combos.slice(0, capNarrow).map((combo) => (
            <ComboRow key={combo.rank} combo={combo} maxPct={maxPct} />
          ))}
          {remainingNarrow > 0 && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-muted-foreground hover:text-foreground mt-1 text-xs transition-colors"
            >
              +{remainingNarrow} more set{remainingNarrow !== 1 ? "s" : ""}
            </button>
          )}
          {showAll &&
            remainingNarrow <= 0 &&
            combos.length > MAX_COMBOS_NARROW && (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="text-muted-foreground hover:text-foreground mt-1 text-xs transition-colors"
              >
                Show fewer
              </button>
            )}
        </div>

        {/* Wide rows */}
        <div className="hidden flex-col gap-2 lg:flex">
          {combos.slice(0, capWide).map((combo) => (
            <ComboRow key={combo.rank} combo={combo} maxPct={maxPct} />
          ))}
          {remainingWide > 0 && (
            <span className="text-muted-foreground mt-1 text-xs">
              +{remainingWide} more set{remainingWide !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </DataChartCard>
  );
}

// =============================================================================
// ComboRow — one ranked 4-move set with a percentage bar
// =============================================================================

interface ComboRowProps {
  combo: MoveComboRow;
  /** The maximum comboPct across all shown combos — used to scale bar widths. */
  maxPct: number;
}

/**
 * A single ranked moveset combo row.
 *
 * Layout: rank badge | 4 MoveChips (wrapping) | player count | % bar
 */
function ComboRow({ combo, maxPct }: ComboRowProps) {
  const barWidthPct = maxPct > 0 ? (combo.comboPct / maxPct) * 100 : 0;

  return (
    <div
      className="group relative flex flex-col gap-1"
      title={`${combo.players.toLocaleString()} player${combo.players !== 1 ? "s" : ""} — ${combo.comboPct}%`}
    >
      {/* Row header: rank + chips + stat */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Rank badge */}
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            combo.rank === 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {combo.rank}
        </span>

        {/* 4 move chips — wrap on narrow viewports */}
        {combo.moves.map((move, idx) => (
          <MoveChip key={`${move}-${idx}`} move={move} />
        ))}

        {/* Player count + pct */}
        <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
          {combo.players.toLocaleString()} ({combo.comboPct}%)
        </span>
      </div>

      {/* Percentage bar */}
      <div
        className="bg-primary/15 h-1.5 w-full overflow-hidden rounded-full"
        aria-hidden
      >
        <div
          className="bg-primary h-full rounded-full transition-[width]"
          // Inline style for percentage positioning — not an arbitrary px value.
          style={{ width: `${barWidthPct}%` }}
        />
      </div>
    </div>
  );
}
