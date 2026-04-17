"use client";

import { type CSSProperties } from "react";

import {
  ALL_TYPES,
  getDefensiveMatchups,
  getSpeciesTypes,
  type PokemonType,
} from "@trainers/pokemon";
import {
  getPokemonSprite,
  getShowdownTypeIconUrl,
} from "@trainers/pokemon/sprites";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// Types
// =============================================================================

interface TypeChartPanelProps {
  /** The team's pokemon. Empty array renders the scaffold with zeroed counts. */
  team: Tables<"pokemon">[];
  className?: string;
}

interface MatrixRow {
  type: PokemonType;
  /** One per team mon, in the same order as `team` — multiplier they take. */
  multipliers: number[];
  /** Number of team members weak to this type (mult > 1, excluding immunities). */
  weakCount: number;
  /** Number of team members resistant or immune (mult < 1 or 0). */
  resistCount: number;
  /** Number of team members neutral (mult === 1). */
  neutralCount: number;
  /** Highest multiplier any team member takes — drives the row highlight. */
  worst: number;
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

/**
 * Format a multiplier for display in matrix cells. Uses short tokens so the
 * narrow per-mon columns don't truncate at the rail's 460px width:
 *   0    → "0"
 *   ¼    → "¼"
 *   ½    → "½"
 *   1    → "x1"
 *   2    → "x2"
 *   4    → "x4"
 */
function formatMultiplier(mult: number): string {
  if (mult === 0) return "0";
  if (mult === 0.25) return "¼";
  if (mult === 0.5) return "½";
  return `x${mult}`;
}

/** Tailwind classes for a matrix multiplier cell, color-coded by intensity. */
function cellClass(mult: number): string {
  if (mult === 0) return "bg-foreground text-background";
  if (mult === 4) return "bg-destructive/15 text-destructive font-semibold";
  if (mult === 2) return "bg-destructive/10 text-destructive";
  if (mult === 0.25)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
  if (mult === 0.5)
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  // mult === 1 (or fallback)
  return "bg-muted/30 text-muted-foreground";
}

/** Build per-type rows with team-member multipliers + summary counts. */
function buildMatrix(team: Tables<"pokemon">[]): MatrixRow[] {
  // Pre-compute matchups once per team member so we don't re-run
  // getDefensiveMatchups inside the inner type loop.
  const matchupsList = team.map((p) =>
    getDefensiveMatchups(getSpeciesTypes(p.species))
  );

  return ALL_TYPES.map((type) => {
    const multipliers: number[] = [];
    let weakCount = 0;
    let resistCount = 0;
    let neutralCount = 0;
    // Worst = highest multiplier any team member takes from this attack type.
    // For an empty team we render "1" so cells have a sensible value rather
    // than -Infinity.
    let worst = team.length === 0 ? 1 : -Infinity;

    for (const matchups of matchupsList) {
      const mult = getDefMult(type, matchups);
      multipliers.push(mult);
      if (mult > worst) worst = mult;
      if (mult > 1) weakCount += 1;
      else if (mult < 1) resistCount += 1;
      else neutralCount += 1;
    }

    return { type, multipliers, weakCount, resistCount, neutralCount, worst };
  });
}

// =============================================================================
// TypeIcon — Showdown type icon with hover tooltip showing the full name
// =============================================================================

interface TypeIconProps {
  type: PokemonType;
}

/**
 * Defensive coverage row label. Showdown type icon so the row reads at a
 * glance without leaning on 3-letter abbreviations. Full type name surfaces
 * via the tooltip and the underlying `<img alt>` for screen readers.
 */
function TypeIcon({ type }: TypeIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={type}
            data-type={type}
            className={cn(
              "inline-flex w-full cursor-default items-center justify-center",
              "outline-ring/40 rounded focus-visible:outline-2"
            )}
          >
            <img
              src={getShowdownTypeIconUrl(type)}
              alt={type}
              width={32}
              height={14}
              className="image-rendering-pixelated h-3.5 w-8 select-none"
              draggable={false}
            />
          </span>
        }
      />
      <TooltipContent>{type}</TooltipContent>
    </Tooltip>
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
              "bg-muted/40 inline-flex size-6 cursor-default items-center justify-center rounded-full",
              "outline-ring/40 focus-visible:outline-2"
            )}
          >
            {spriteUrl ? (
              <img
                src={spriteUrl}
                alt=""
                aria-hidden="true"
                className="size-5 object-contain select-none"
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
 * Defensive type matrix — one row per type, one column per team mon (only as
 * many columns as there are mons — no empty placeholder columns), plus three
 * summary columns (↓ weak, ↑ resist, = neutral).
 *
 * Cell color tracks the multiplier intensity:
 *   x4  → strong red  (4× weakness — the row also gets a soft red highlight)
 *   x2  → light red
 *   x1  → muted neutral background
 *   ½   → light green
 *   ¼   → strong green
 *   0   → ink (immunity)
 *
 * Layout fits inside the 460px analytics rail: up to 6 mon columns × ~32px
 * + the type label + summary columns. CSS Grid uses --mon-count so the column
 * count automatically tracks the actual team size.
 */
export function TypeChartPanel({ team, className }: TypeChartPanelProps) {
  const rows = buildMatrix(team);
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

  return (
    <div
      data-testid="type-chart-panel"
      className={cn("bg-card overflow-hidden rounded-lg shadow-sm", className)}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-foreground text-sm font-semibold">
          Defensive coverage
        </span>
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Per Pokémon
        </span>
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
          {/* Column header row: sprite per mon + ↓ ↑ = summary headers */}
          <div
            className="bg-muted/50 grid items-center gap-1 px-2 py-1.5"
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
              aria-label="weak count"
              title="Weak count"
            >
              ↓
            </span>
            <span
              className="text-muted-foreground text-center text-[11px] font-semibold"
              aria-label="resist count"
              title="Resist count"
            >
              ↑
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
            {rows.map((row) => {
              const isQuadWeak = row.worst === 4;
              return (
                <div
                  key={row.type}
                  data-testid={`type-row-${row.type}`}
                  className={cn(
                    "grid items-center gap-1 px-2 py-1 text-xs transition-colors duration-150",
                    isQuadWeak && "bg-destructive/5"
                  )}
                  style={gridStyle}
                >
                  {/* Type icon — left column */}
                  <TypeIcon type={row.type} />

                  {/* Per-mon multiplier cells — one per actual team mon */}
                  {team.map((mon, idx) => {
                    const mult = row.multipliers[idx] ?? 1;
                    return (
                      <span
                        key={`mult-${row.type}-${mon.id}`}
                        data-testid={`mult-${row.type}-${mon.id}`}
                        className={cn(
                          "inline-flex items-center justify-center rounded px-0.5 py-0.5 font-mono text-[10px] leading-none",
                          cellClass(mult)
                        )}
                      >
                        {formatMultiplier(mult)}
                      </span>
                    );
                  })}

                  {/* Summary: weak count */}
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

                  {/* Summary: resist count */}
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

                  {/* Summary: neutral count */}
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
        </>
      )}
    </div>
  );
}
