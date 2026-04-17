"use client";

import { type CSSProperties, useState } from "react";

import {
  ALL_TYPES,
  getDefensiveMatchups,
  getMoveCategory,
  getMoveType,
  getSpeciesTypes,
  getTypeEffectiveness,
  type PokemonType,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { TypeSymbolIcon } from "./type-symbol-icon";

// =============================================================================
// Types
// =============================================================================

interface TypeChartPanelProps {
  /** The team's pokemon. Empty array renders the scaffold with zeroed counts. */
  team: Tables<"pokemon">[];
  className?: string;
}

/** Which view the user is looking at. */
type CoverageMode = "defensive" | "offensive";

interface MatrixRow {
  type: PokemonType;
  /** One per team mon, in the same order as `team` — multiplier they take/deal. */
  multipliers: (number | null)[];
  /**
   * Defensive mode: number of team members weak to this type (mult > 1).
   * Offensive mode: number of team members that can hit this type super-effectively (mult > 1).
   */
  positiveCount: number;
  /**
   * Defensive mode: number of team members resistant or immune (mult < 1 or 0).
   * Offensive mode: number of team members that are resisted or blocked (mult < 1 or 0).
   */
  negativeCount: number;
  /** Number of team members neutral (mult === 1). */
  neutralCount: number;
  /**
   * Defensive mode: highest multiplier any team member takes — drives row highlight.
   * Offensive mode: highest multiplier any team member can deal.
   */
  best: number;
}

// =============================================================================
// Helpers — defensive
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

/** Build per-type rows for DEFENSIVE coverage (what the team takes from each type). */
function buildDefensiveMatrix(team: Tables<"pokemon">[]): MatrixRow[] {
  // Pre-compute matchups once per team member so we don't re-run
  // getDefensiveMatchups inside the inner type loop.
  const matchupsList = team.map((p) =>
    getDefensiveMatchups(getSpeciesTypes(p.species))
  );

  return ALL_TYPES.map((type) => {
    const multipliers: number[] = [];
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    // Worst = highest multiplier any team member takes from this attack type.
    // For an empty team we render "1" so cells have a sensible value rather
    // than -Infinity.
    let best = team.length === 0 ? 1 : -Infinity;

    for (const matchups of matchupsList) {
      const mult = getDefMult(type, matchups);
      multipliers.push(mult);
      if (mult > best) best = mult;
      if (mult > 1) positiveCount += 1;
      else if (mult < 1) negativeCount += 1;
      else neutralCount += 1;
    }

    return {
      type,
      multipliers,
      positiveCount,
      negativeCount,
      neutralCount,
      best,
    };
  });
}

// =============================================================================
// Helpers — offensive
// =============================================================================

/** The move slots we check on each pokemon. */
const MOVE_SLOTS = ["move1", "move2", "move3", "move4"] as const;

/**
 * Compute the best type-effectiveness multiplier a mon's damaging moves can
 * achieve against a given defending type.
 *
 * Returns null if the mon has NO damaging moves at all ("—" display).
 *
 * Design note: we use raw type-matchup multipliers without STAB — STAB is a
 * damage bonus, not a coverage signal. Two different mons with the same move
 * type cover the same matchup regardless of which one gets STAB.
 */
function bestOffensiveMult(
  pokemon: Tables<"pokemon">,
  defendingType: PokemonType
): number | null {
  let best: number | null = null;

  for (const slot of MOVE_SLOTS) {
    const moveName = pokemon[slot];
    if (!moveName) continue;

    const category = getMoveCategory(moveName);
    // Skip status moves — they deal no direct damage and don't cover types.
    if (!category || category === "Status") continue;

    const moveType = getMoveType(moveName);
    if (!moveType) continue;

    // getTypeEffectiveness(attackingType, [defendingType]) — single defender.
    const mult = getTypeEffectiveness(moveType as PokemonType, [defendingType]);
    if (best === null || mult > best) best = mult;
  }

  return best;
}

/** Build per-type rows for OFFENSIVE coverage (what the team can deal to each type). */
function buildOffensiveMatrix(team: Tables<"pokemon">[]): MatrixRow[] {
  return ALL_TYPES.map((defendingType) => {
    const multipliers: (number | null)[] = [];
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let best = team.length === 0 ? 1 : -Infinity;

    for (const pokemon of team) {
      const mult = bestOffensiveMult(pokemon, defendingType);
      multipliers.push(mult);

      if (mult === null) {
        // No damaging moves — counts as neutral for summary purposes.
        neutralCount += 1;
      } else {
        if (mult > best) best = mult;
        if (mult > 1) positiveCount += 1;
        else if (mult < 1) negativeCount += 1;
        else neutralCount += 1;
      }
    }

    // If no mon had moves, reset best to 1 to avoid -Infinity display.
    if (best === -Infinity) best = 1;

    return {
      type: defendingType,
      multipliers,
      positiveCount,
      negativeCount,
      neutralCount,
      best,
    };
  });
}

// =============================================================================
// Cell formatting
// =============================================================================

/**
 * Format a multiplier for display in matrix cells. Uses short ASCII tokens for
 * legibility at small sizes — the Unicode fraction glyphs (½ ¼) are illegible
 * at text-[10px], so we use "1/2" and "1/4" instead:
 *   0    → "0"
 *   1/4  → "1/4"
 *   1/2  → "1/2"
 *   1    → "x1"
 *   2    → "x2"
 *   4    → "x4"
 */
function formatMultiplier(mult: number): string {
  if (mult === 0) return "0";
  if (mult === 0.25) return "1/4";
  if (mult === 0.5) return "1/2";
  return `x${mult}`;
}

/**
 * Tailwind classes for a matrix multiplier cell.
 *
 * Color semantics: "red = bad for you, green = good for you" across BOTH modes.
 *
 * Defensive mode:
 *   x4/x2 = taking big damage = BAD → red
 *   1/2/1/4 = resisting = GOOD → green
 *   0 = immune = GOOD → ink
 *
 * Offensive mode (inverted multiplier meaning):
 *   x4/x2 = dealing big damage = GOOD → green
 *   1/2/1/4 = resisted = BAD → red
 *   0 = immune/blocked = BAD → ink
 */
function cellClass(mult: number, mode: CoverageMode): string {
  if (mode === "defensive") {
    if (mult === 0)
      return "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold";
    if (mult === 4) return "bg-destructive/15 text-destructive font-semibold";
    if (mult === 2) return "bg-destructive/10 text-destructive";
    if (mult === 0.25)
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
    if (mult === 0.5)
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    return "bg-muted/30 text-muted-foreground";
  }

  // Offensive — green = good (super effective), red = bad (resisted/immune).
  if (mult === 0)
    return "bg-muted text-muted-foreground/60 line-through font-semibold";
  if (mult === 4)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
  if (mult === 2)
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (mult === 0.25) return "bg-destructive/15 text-destructive font-semibold";
  if (mult === 0.5) return "bg-destructive/10 text-destructive";
  return "bg-muted/30 text-muted-foreground";
}

// =============================================================================
// TypeIcon — round type symbol icon with hover tooltip showing the full name
// =============================================================================

interface TypeIconProps {
  type: PokemonType;
}

/**
 * Row label. Uses TypeSymbolIcon (round glyph on colored background, no text)
 * so the label column stays compact and reads at a glance.
 * Full type name surfaces via the Tooltip and the wrapper's aria-label.
 */
function TypeIcon({ type }: TypeIconProps) {
  return (
    <span className="inline-flex w-full items-center justify-center">
      <TypeSymbolIcon type={type} size={14} />
    </span>
  );
}

// =============================================================================
// MonHeaderIcon — small sprite circle in the column header, with tooltip
// =============================================================================

interface MonHeaderIconProps {
  pokemon: Tables<"pokemon">;
}

/**
 * Per-mon column header — small sprite circle with the species name surfaced
 * via tooltip on hover (the header circles are too small for a visible label
 * at the rail's narrow width).
 */
function MonHeaderIcon({ pokemon }: MonHeaderIconProps) {
  // Sprite lookup can throw for an empty / unknown species; treat as missing.
  let spriteUrl: string | undefined;
  try {
    spriteUrl = getPokemonSprite(pokemon.species ?? "", {
      shiny: pokemon.is_shiny ?? false,
    }).url;
  } catch {
    spriteUrl = undefined;
  }
  const label = pokemon.nickname
    ? `${pokemon.nickname} (${pokemon.species})`
    : (pokemon.species ?? "Unknown");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={label}
            data-testid={`mon-header-${pokemon.id}`}
            className={cn(
              "bg-muted/40 inline-flex size-5 cursor-default items-center justify-center rounded-full",
              "outline-ring/40 focus-visible:outline-2"
            )}
          >
            {spriteUrl ? (
              <img
                src={spriteUrl}
                alt=""
                aria-hidden="true"
                className="size-4 object-contain select-none"
                draggable={false}
              />
            ) : (
              <span className="text-muted-foreground text-[8px]" aria-hidden>
                ?
              </span>
            )}
          </span>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// TypeChartPanel
// =============================================================================

/**
 * Type coverage matrix with two modes toggled via a segmented control:
 *
 * DEFENSIVE (default) — one row per attacking type, one column per team mon.
 *   Each cell shows the multiplier that mon TAKES from moves of that type.
 *   Red = bad (taking damage), green = good (resisting).
 *
 * OFFENSIVE — one row per defending type, one column per team mon.
 *   Each cell shows the BEST multiplier that mon's damaging moves can deal
 *   to a target of that type. "—" when the mon has no damaging moves.
 *   Green = good (super effective), red = bad (resisted).
 *
 * Offensive note: raw type-matchup multipliers are used — STAB is not folded in
 * because STAB is a damage scalar, not a coverage indicator.
 *
 * Layout fits inside the 460px analytics rail: up to 6 mon columns × ~32px
 * + the type label + summary columns. CSS Grid uses --mon-count so the column
 * count automatically tracks the actual team size.
 */
export function TypeChartPanel({ team, className }: TypeChartPanelProps) {
  const [mode, setMode] = useState<CoverageMode>("defensive");

  const rows =
    mode === "defensive"
      ? buildDefensiveMatrix(team)
      : buildOffensiveMatrix(team);
  const monCount = team.length;

  // CSS Grid template:
  //   32px  — type icon column
  //   repeat(var(--mon-count), minmax(0, 1fr)) — one column per actual mon
  //   1.5rem × 3 — summary columns (↓ ↑ =)
  //
  // --mon-count is set via inline style so the grid adapts to the real team
  // size without empty placeholder columns.
  const gridStyle = {
    "--mon-count": monCount,
    gridTemplateColumns:
      "2rem repeat(var(--mon-count), minmax(0, 1fr)) repeat(3, 1.5rem)",
  } as CSSProperties;

  // Defensive summary labels
  const posLabel = mode === "defensive" ? "↓" : "↑";
  const negLabel = mode === "defensive" ? "↑" : "↓";
  const posAriaLabel =
    mode === "defensive" ? "weak count" : "super-effective count";
  const negAriaLabel = mode === "defensive" ? "resist count" : "resisted count";
  const posTitle =
    mode === "defensive" ? "Weak count" : "Super-effective count";
  const negTitle = mode === "defensive" ? "Resist count" : "Resisted count";

  // Row highlight: defensive = worst is x4 weakness; offensive = best is x4 SE
  function shouldHighlightRow(row: MatrixRow): boolean {
    return mode === "defensive" ? row.best === 4 : row.best === 4;
  }

  return (
    <div
      data-testid="type-chart-panel"
      className={cn("bg-card overflow-hidden rounded-lg shadow-sm", className)}
    >
      {/* Panel header with Defensive / Offensive toggle */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-foreground text-sm font-semibold">
          {mode === "defensive" ? "Defensive coverage" : "Offensive coverage"}
        </span>
        {/* Segmented toggle: Defensive | Offensive */}
        <div
          data-testid="coverage-mode-toggle"
          role="group"
          aria-label="Coverage mode"
          className="bg-muted flex overflow-hidden rounded-md"
        >
          <button
            type="button"
            data-testid="mode-defensive"
            aria-pressed={mode === "defensive"}
            onClick={() => setMode("defensive")}
            className={cn(
              "px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors duration-150",
              mode === "defensive"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Defensive
          </button>
          <button
            type="button"
            data-testid="mode-offensive"
            aria-pressed={mode === "offensive"}
            onClick={() => setMode("offensive")}
            className={cn(
              "px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors duration-150",
              mode === "offensive"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Offensive
          </button>
        </div>
      </div>

      {/* Empty state — no mons on the team yet */}
      {monCount === 0 && (
        <div className="text-muted-foreground px-3 py-6 text-center text-xs">
          Add Pokémon to your team to see the type chart.
        </div>
      )}

      {/* Matrix — only rendered when there is at least one team mon */}
      {monCount > 0 && (
        <>
          {/* Column header row: sprite per mon + summary headers */}
          <div
            className="bg-muted/50 grid items-center gap-0.5 px-2 py-0.5"
            style={gridStyle}
          >
            {/* Empty cell over the type-icon column */}
            <span aria-hidden="true" />

            {/* One sprite header per actual mon — no placeholder circles */}
            {team.map((mon, idx) => (
              <span
                key={`mon-header-${mon.id}`}
                className="flex justify-center"
                data-testid={`type-chart-mon-col-${idx}`}
              >
                <MonHeaderIcon pokemon={mon} />
              </span>
            ))}

            {/* Summary column headers */}
            <span
              className="text-muted-foreground text-center text-[11px] font-semibold"
              aria-label={posAriaLabel}
              title={posTitle}
            >
              {posLabel}
            </span>
            <span
              className="text-muted-foreground text-center text-[11px] font-semibold"
              aria-label={negAriaLabel}
              title={negTitle}
            >
              {negLabel}
            </span>
            <span
              className="text-muted-foreground text-center text-[11px] font-semibold"
              aria-label="neutral count"
              title="Neutral count"
            >
              =
            </span>
          </div>

          {/* Body — one row per type */}
          <div className="divide-muted/40 divide-y">
            {rows.map((row) => (
              <div
                key={row.type}
                data-testid={`type-row-${row.type}`}
                className={cn(
                  "grid items-center gap-0.5 px-2 py-px text-xs transition-colors duration-150",
                  shouldHighlightRow(row) && "bg-destructive/5"
                )}
                style={gridStyle}
              >
                {/* Type icon — left column */}
                <TypeIcon type={row.type} />

                {/* Per-mon multiplier cells — one per actual team mon */}
                {team.map((mon, idx) => {
                  const mult = row.multipliers[idx] ?? null;
                  // null means mon has no damaging moves (offensive mode only)
                  if (mult === null) {
                    return (
                      <span
                        key={`mult-${row.type}-${mon.id}`}
                        data-testid={`mult-${row.type}-${mon.id}`}
                        className="text-muted-foreground/40 inline-flex items-center justify-center font-mono text-[10px] leading-none"
                      >
                        —
                      </span>
                    );
                  }
                  return (
                    <span
                      key={`mult-${row.type}-${mon.id}`}
                      data-testid={`mult-${row.type}-${mon.id}`}
                      className={cn(
                        "inline-flex items-center justify-center rounded px-1 py-0 font-mono text-[10px] leading-none",
                        cellClass(mult, mode)
                      )}
                    >
                      {formatMultiplier(mult)}
                    </span>
                  );
                })}

                {/* Summary: positive count (weak in defensive, SE in offensive) */}
                <span
                  data-testid={`weak-${row.type}`}
                  className={cn(
                    "text-center font-mono text-[11px]",
                    row.positiveCount > 0
                      ? mode === "defensive"
                        ? "text-destructive font-semibold"
                        : "font-semibold text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/50"
                  )}
                >
                  {row.positiveCount}
                </span>

                {/* Summary: negative count (resist in defensive, resisted in offensive) */}
                <span
                  data-testid={`resist-${row.type}`}
                  className={cn(
                    "text-center font-mono text-[11px]",
                    row.negativeCount > 0
                      ? mode === "defensive"
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : "text-destructive font-semibold"
                      : "text-muted-foreground/50"
                  )}
                >
                  {row.negativeCount}
                </span>

                {/* Summary: neutral count */}
                <span
                  data-testid={`neutral-${row.type}`}
                  className="text-muted-foreground text-center font-mono text-[11px]"
                >
                  {row.neutralCount}
                </span>
              </div>
            ))}
          </div>

          {/* Footer legend */}
          <div className="bg-muted/50 text-muted-foreground px-3 py-2 text-[10px]">
            {mode === "defensive"
              ? "↓ weak · ↑ resist · = neutral"
              : "↑ super effective · ↓ resisted · = neutral"}
          </div>
        </>
      )}
    </div>
  );
}
