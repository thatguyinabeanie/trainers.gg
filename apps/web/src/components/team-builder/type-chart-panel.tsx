"use client";

import {
  ALL_TYPES,
  getDefensiveMatchups,
  getSpeciesTypes,
  type PokemonType,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { TYPE_PILL_COLORS } from "./type-colors";

// =============================================================================
// Types
// =============================================================================

interface TypeChartPanelProps {
  /** The team's pokemon. Empty array renders the scaffold with zeroed counts. */
  team: Tables<"pokemon">[];
  className?: string;
}

interface RowSummary {
  type: PokemonType;
  /** Highest multiplier any team member takes from this attack type. */
  worst: number;
  /** Number of team members weak (mult > 1, excluding immunities). */
  weakCount: number;
  /** Number of team members resistant (mult < 1, includes immunities). */
  resistCount: number;
  /** Number of team members neutral (mult === 1). */
  neutralCount: number;
}

// =============================================================================
// Helpers
// =============================================================================

/** Returns the multiplier for an attacking type vs a Pokemon's defensive matchups. */
function getDefMult(
  attackType: PokemonType,
  matchups: ReturnType<typeof getDefensiveMatchups>
): number {
  if (matchups.immunities.includes(attackType)) return 0;
  return (
    matchups.weaknesses[attackType] ?? matchups.resistances[attackType] ?? 1
  );
}

/** Format a multiplier for display in the "worst" column. */
function formatMultiplier(mult: number): string {
  if (mult === 0) return "0";
  if (mult === 0.25) return "¼";
  if (mult === 0.5) return "½";
  return `×${mult}`;
}

/** Tailwind classes for the worst-multiplier pill. */
function worstCellClass(mult: number): string {
  if (mult === 0) return "bg-foreground text-background";
  if (mult === 4)
    return "bg-destructive/15 text-destructive font-mono font-semibold";
  if (mult === 2) return "bg-destructive/10 text-destructive font-mono";
  if (mult === 0.25)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono font-semibold";
  if (mult === 0.5)
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono";
  // mult === 1 (or fallback)
  return "bg-muted text-muted-foreground font-mono";
}

/** Build the per-type row summary across the team. */
function buildRowSummaries(team: Tables<"pokemon">[]): RowSummary[] {
  // Pre-compute matchups once per team member.
  const matchupsList = team.map((p) =>
    getDefensiveMatchups(getSpeciesTypes(p.species))
  );

  return ALL_TYPES.map((type) => {
    // Worst = highest multiplier any team member takes from this attack type.
    // Empty team renders as "neutral baseline" 1 so the column has a value.
    let worst = team.length === 0 ? 1 : -Infinity;
    let weakCount = 0;
    let resistCount = 0;
    let neutralCount = 0;

    for (const matchups of matchupsList) {
      const mult = getDefMult(type, matchups);
      if (mult > worst) worst = mult;
      if (mult > 1) weakCount += 1;
      else if (mult < 1)
        resistCount += 1; // includes immunity (0)
      else neutralCount += 1;
    }

    return { type, worst, weakCount, resistCount, neutralCount };
  });
}

// =============================================================================
// TypePill — full-width pill, mirrors TypeBadge styling for consistency
// =============================================================================

interface TypePillProps {
  type: PokemonType;
}

function TypePill({ type }: TypePillProps) {
  const colors = TYPE_PILL_COLORS[type] ?? "bg-stone-400 text-white";
  return (
    <span
      className={cn(
        "inline-flex w-full items-center justify-center rounded px-1 py-0.5 text-[10px] leading-none font-semibold",
        colors
      )}
    >
      {type}
    </span>
  );
}

// =============================================================================
// TypeChartPanel
// =============================================================================

/**
 * Vertical defensive-coverage table — one row per type — showing the team's
 * worst multiplier vs that attack type plus weak/resist/neutral counts.
 *
 * Renders 18 rows always (one per type). 4× weakness rows get a subtle red
 * background highlight to call attention.
 */
export function TypeChartPanel({ team, className }: TypeChartPanelProps) {
  const rows = buildRowSummaries(team);

  return (
    <div
      className={cn("bg-card overflow-hidden rounded-lg shadow-sm", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3.5 py-3">
        <span className="text-foreground text-sm font-semibold">
          Defensive coverage
        </span>
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Full team
        </span>
      </div>

      {/* Column header row */}
      <div
        className={cn(
          "bg-muted/50 grid grid-cols-[56px_36px_24px_24px_24px] items-center gap-2 px-3 py-1.5",
          "text-muted-foreground text-[10px] font-semibold tracking-wider uppercase"
        )}
      >
        <span>Type</span>
        <span className="text-center">Worst</span>
        <span className="text-center" aria-label="weak count">
          ↓
        </span>
        <span className="text-center" aria-label="resist count">
          ↑
        </span>
        <span className="text-center" aria-label="neutral count">
          =
        </span>
      </div>

      {/* Rows */}
      <div className="divide-muted/40 divide-y">
        {rows.map((row) => {
          const isQuadWeak = row.worst === 4;
          return (
            <div
              key={row.type}
              data-testid={`type-row-${row.type}`}
              className={cn(
                "grid grid-cols-[56px_36px_24px_24px_24px] items-center gap-2 px-3 py-1.5 text-xs transition-colors duration-150",
                isQuadWeak && "bg-destructive/5"
              )}
            >
              <TypePill type={row.type} />

              {/* Worst multiplier pill */}
              <span
                data-testid={`worst-${row.type}`}
                className={cn(
                  "inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px] leading-none",
                  worstCellClass(row.worst)
                )}
              >
                {formatMultiplier(row.worst)}
              </span>

              {/* Weak count */}
              <span
                data-testid={`weak-${row.type}`}
                className={cn(
                  "text-center font-mono text-[11px]",
                  row.weakCount > 0
                    ? "text-destructive font-semibold"
                    : "text-muted-foreground/50"
                )}
              >
                {row.weakCount}
              </span>

              {/* Resist count */}
              <span
                data-testid={`resist-${row.type}`}
                className={cn(
                  "text-center font-mono text-[11px]",
                  row.resistCount > 0
                    ? "font-semibold text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/50"
                )}
              >
                {row.resistCount}
              </span>

              {/* Neutral count */}
              <span
                data-testid={`neutral-${row.type}`}
                className="text-muted-foreground text-center font-mono text-[11px]"
              >
                {row.neutralCount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="bg-muted/50 text-muted-foreground px-3 py-2 text-[10px]">
        ↓ weak · ↑ resist · = neutral
      </div>
    </div>
  );
}
