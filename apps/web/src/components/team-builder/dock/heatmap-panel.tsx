"use client";

import { type CSSProperties, useState } from "react";

import {
  ALL_TYPES,
  getMoveCategory,
  getSpeciesTypes,
  type GameFormat,
  type PokemonType,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import Image from "next/image";
import { formatSupportsTera } from "../format-gating";
import { effectiveDefensiveMult } from "./heatmap-effects";
import { effectiveOffensiveMult } from "./move-type-overrides";

// =============================================================================
// Types
// =============================================================================

export interface HeatmapPanelProps {
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  onClose?: () => void;
}

type CoverageMode = "defensive" | "offensive";

// Transposed: each row is a Pokemon, each column is a type
interface PokemonRow {
  pokemon: Tables<"pokemon">;
  /** multipliers[typeIdx] — one per ALL_TYPES entry */
  multipliers: (number | null)[];
  weakCount: number;
  resistCount: number;
  immuneCount: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Compute the net coverage score for a row or column.
 * Defensive: (resists + immunities) - weaknesses (positive = well-defended)
 * Offensive: super-effective - (resisted + immune) (positive = good coverage)
 */
function netScore(
  counts: { wk: number; rs: number; im: number },
  mode: CoverageMode
): number {
  return mode === "defensive"
    ? counts.rs + counts.im - counts.wk
    : counts.wk - counts.rs - counts.im;
}

function getDefenderTypes(
  pokemon: Tables<"pokemon">,
  showTera: boolean
): PokemonType[] {
  if (
    showTera &&
    pokemon.tera_type &&
    (ALL_TYPES as readonly string[]).includes(pokemon.tera_type)
  ) {
    return [pokemon.tera_type as PokemonType];
  }
  return getSpeciesTypes(pokemon.species ?? "") as PokemonType[];
}

/**
 * Build transposed defensive matrix: rows = Pokemon, columns = 18 types.
 * Each cell = multiplier that Pokemon TAKES from that attacking type.
 */
function buildDefensiveRows(
  teamPokemon: TeamWithPokemon["team_pokemon"],
  showTera: boolean
): PokemonRow[] {
  const pokemons = teamPokemon
    .slice()
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  return pokemons.map((p) => {
    const defenderTypes = getDefenderTypes(p, showTera);
    const multipliers: (number | null)[] = [];
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    for (const attackingType of ALL_TYPES) {
      const mult = effectiveDefensiveMult({
        attackingType,
        defenderTypes,
        ability: p.ability,
        item: p.held_item,
      });
      multipliers.push(mult);
      if (mult === 0) immuneCount++;
      else if (mult < 1) resistCount++;
      else if (mult > 1) weakCount++;
    }

    return { pokemon: p, multipliers, weakCount, resistCount, immuneCount };
  });
}

const MOVE_SLOTS = ["move1", "move2", "move3", "move4"] as const;

/**
 * Build transposed offensive matrix: rows = Pokemon, columns = 18 types.
 * Each cell = best coverage multiplier across the Pokemon's damaging moves
 * against that defending type.
 */
function buildOffensiveRows(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): PokemonRow[] {
  const pokemons = teamPokemon
    .slice()
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  return pokemons.map((p) => {
    const multipliers: (number | null)[] = [];
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    for (const defendingType of ALL_TYPES) {
      let best: number | null = null;

      for (const slot of MOVE_SLOTS) {
        const moveName = p[slot];
        if (!moveName) continue;
        const category = getMoveCategory(moveName);
        if (!category || category === "Status") continue;

        const mult = effectiveOffensiveMult({
          move: moveName,
          attackerAbility: p.ability,
          defenderTypes: [defendingType],
        });
        if (best === null || mult > best) best = mult;
      }

      multipliers.push(best);
      if (best === null) {
        // no damaging moves — skip counts
      } else if (best === 0) immuneCount++;
      else if (best < 1) resistCount++;
      else if (best > 1) weakCount++;
    }

    return { pokemon: p, multipliers, weakCount, resistCount, immuneCount };
  });
}

function formatMultiplier(mult: number): string {
  if (mult === 0) return "0";
  if (mult === 0.25) return "¼";
  if (mult === 0.5) return "½";
  if (mult === 1) return "1×";
  if (mult === 1.25) return "1.25";
  if (mult === 2) return "2×";
  if (mult === 4) return "4×";
  return `${mult}×`;
}

function cellClass(mult: number, mode: CoverageMode): string {
  if (mode === "defensive") {
    if (mult === 0)
      return "bg-muted-foreground/20 text-muted-foreground font-bold";
    if (mult >= 4) return "bg-destructive/25 text-destructive font-bold";
    if (mult >= 2) return "bg-destructive/10 text-destructive";
    if (mult <= 0.25)
      return "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold";
    if (mult < 1)
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    return "text-muted-foreground/50";
  }
  // Offensive
  if (mult === 0)
    return "bg-muted-foreground/20 text-muted-foreground font-bold";
  if (mult >= 4)
    return "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold";
  if (mult >= 2)
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (mult <= 0.25) return "bg-destructive/25 text-destructive font-bold";
  if (mult < 1) return "bg-destructive/10 text-destructive";
  return "text-muted-foreground/50";
}

// 3-letter type abbreviations for column headers
const _TYPE_ABBR: Record<PokemonType, string> = {
  Normal: "NOR",
  Fire: "FIR",
  Water: "WAT",
  Electric: "ELE",
  Grass: "GRS",
  Ice: "ICE",
  Fighting: "FIG",
  Poison: "POI",
  Ground: "GND",
  Flying: "FLY",
  Psychic: "PSY",
  Bug: "BUG",
  Rock: "ROK",
  Ghost: "GHO",
  Dragon: "DRA",
  Dark: "DRK",
  Steel: "STL",
  Fairy: "FAI",
};

// =============================================================================
// MonRowLabel
// =============================================================================

function MonRowLabel({ pokemon }: { pokemon: Tables<"pokemon"> }) {
  let spriteUrl: string | undefined;
  try {
    spriteUrl = getPokemonSprite(pokemon.species ?? "", {
      shiny: pokemon.is_shiny ?? false,
    }).url;
  } catch {
    spriteUrl = undefined;
  }
  const name = pokemon.nickname || pokemon.species?.split("-")[0] || "Unknown";

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="bg-muted/40 inline-flex size-8 shrink-0 items-center justify-center rounded-full">
        {spriteUrl ? (
          <img
            src={spriteUrl}
            alt=""
            aria-hidden="true"
            className="size-7 object-contain select-none"
            draggable={false}
          />
        ) : (
          <span className="text-muted-foreground text-[8px]" aria-hidden>
            ?
          </span>
        )}
      </span>
      <span className="text-foreground text-[11px] font-medium whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

// =============================================================================
// HeatmapPanel (Transposed: Pokemon rows × Type columns)
// =============================================================================

export function HeatmapPanel({ team, format, onClose }: HeatmapPanelProps) {
  const [mode, setMode] = useState<CoverageMode>("defensive");
  const [showTera, setShowTera] = useState(false);
  const [hoverCell, setHoverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const teraSupported = formatSupportsTera(format);
  const effectiveShowTera = showTera && teraSupported && mode === "defensive";

  const rows =
    mode === "defensive"
      ? buildDefensiveRows(team, effectiveShowTera)
      : buildOffensiveRows(team);

  // Column totals: per-type weakness count across all Pokemon
  const colTotals = ALL_TYPES.map((_, typeIdx) => {
    let wk = 0;
    let rs = 0;
    let im = 0;
    for (const row of rows) {
      const m = row.multipliers[typeIdx] ?? null;
      if (m === null) continue;
      if (m === 0) im++;
      else if (m < 1) rs++;
      else if (m > 1) wk++;
    }
    return { wk, rs, im };
  });

  // Grid: row-label + 18 type columns + summary column
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `9.5rem repeat(18, minmax(0, 1fr)) 4.5rem`,
  };

  return (
    <div data-testid="heatmap-panel" className="flex h-full min-h-0 flex-col">
      {/* Header: toggle + legend + close */}
      <div className="flex items-center gap-3 border-b px-3 py-1.5">
        {/* Mode toggle (left) */}
        <div
          role="group"
          aria-label="Coverage mode"
          className="bg-muted flex overflow-hidden rounded-md"
        >
          <button
            type="button"
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

        {/* Tera toggle */}
        {teraSupported && mode === "defensive" && (
          <button
            type="button"
            aria-pressed={showTera}
            onClick={() => setShowTera((v) => !v)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors duration-150",
              showTera
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {showTera ? "Tera on" : "View as Tera"}
          </button>
        )}

        {/* Legend (center, fills space) */}
        <div className="flex flex-1 items-center justify-center gap-1.5 text-[10px]">
          {(
            [
              {
                label: "0",
                cls: "bg-muted-foreground/20 text-muted-foreground font-bold",
              },
              {
                label: "¼×",
                cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
              },
              {
                label: "½×",
                cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              },
              { label: "1×", cls: "bg-muted/50 text-muted-foreground/50" },
              { label: "2×", cls: "bg-destructive/10 text-destructive" },
              {
                label: "4×",
                cls: "bg-destructive/15 text-destructive font-semibold",
              },
            ] as { label: string; cls: string }[]
          ).map(({ label, cls }) => (
            <span
              key={label}
              className={cn(
                "inline-flex min-w-[26px] items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] leading-tight",
                cls
              )}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Close button (right) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded transition-colors"
          >
            ×
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {/* Column headers: type abbreviations */}
        <div
          className="bg-muted/50 sticky top-0 z-10 grid items-end gap-px px-2 py-1.5"
          style={gridStyle}
        >
          {/* Row label spacer */}
          <span aria-hidden />
          {ALL_TYPES.map((t, idx) => (
            <Tooltip key={t}>
              <TooltipTrigger
                render={
                  <span
                    tabIndex={0}
                    className={cn(
                      "flex cursor-default items-center justify-center transition-opacity duration-100",
                      hoverCell !== null &&
                        hoverCell.col !== idx &&
                        "opacity-40"
                    )}
                  >
                    <Image
                      src={`/types/${t}.png`}
                      alt={t}
                      width={24}
                      height={24}
                      className="size-6"
                      unoptimized
                    />
                  </span>
                }
              />
              <TooltipContent>{t}</TooltipContent>
            </Tooltip>
          ))}
          {/* Summary header */}
          <span className="text-muted-foreground text-center text-[8px] font-semibold tracking-wide uppercase">
            Net
          </span>
        </div>

        {/* Pokemon rows */}
        <div className="divide-muted/40 divide-y">
          {rows.map((row, rowIdx) => (
            <div
              key={row.pokemon.id}
              className={cn(
                "grid items-center gap-px px-2 py-1 transition-colors duration-100",
                hoverCell !== null && hoverCell.row === rowIdx && "bg-muted/30"
              )}
              style={gridStyle}
            >
              {/* Pokemon label */}
              <MonRowLabel pokemon={row.pokemon} />

              {/* Type cells */}
              {ALL_TYPES.map((t, colIdx) => {
                const mult = row.multipliers[colIdx] ?? null;
                const isHighlightedCol =
                  hoverCell !== null && hoverCell.col === colIdx;
                const isHighlightedRow =
                  hoverCell !== null && hoverCell.row === rowIdx;
                const isCrosshair = isHighlightedCol || isHighlightedRow;

                if (mult === null) {
                  return (
                    <span
                      key={`${row.pokemon.id}-${t}`}
                      className="text-muted-foreground/40 inline-flex items-center justify-center font-mono text-[10px] leading-none"
                      onMouseEnter={() =>
                        setHoverCell({ row: rowIdx, col: colIdx })
                      }
                      onMouseLeave={() => setHoverCell(null)}
                    >
                      —
                    </span>
                  );
                }

                return (
                  <span
                    key={`${row.pokemon.id}-${t}`}
                    className={cn(
                      "inline-flex items-center justify-center rounded px-0.5 py-0.5 font-mono text-[10px] leading-tight transition-all duration-100",
                      cellClass(mult, mode),
                      isCrosshair && "ring-primary/30 ring-1"
                    )}
                    onMouseEnter={() =>
                      setHoverCell({ row: rowIdx, col: colIdx })
                    }
                    onMouseLeave={() => setHoverCell(null)}
                  >
                    {formatMultiplier(mult)}
                  </span>
                );
              })}

              {/* Row summary — net score */}
              {(() => {
                const net = netScore(
                  { wk: row.weakCount, rs: row.resistCount, im: row.immuneCount },
                  mode
                );
                return (
                  <span
                    className={cn(
                      "flex justify-center font-mono text-[10px] font-semibold",
                      net > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : net < 0
                          ? "text-destructive"
                          : "text-muted-foreground/60"
                    )}
                  >
                    {net > 0 ? `+${net}` : net}
                  </span>
                );
              })()}
            </div>
          ))}

          {/* Empty placeholder rows for remaining team slots */}
          {rows.length === 0 && (
            <span className="sr-only" role="status">
              Add Pokémon to your team to populate the heatmap.
            </span>
          )}
          {Array.from({ length: Math.max(0, 6 - rows.length) }).map(
            (_, idx) => (
              <div
                key={`empty-slot-${rows.length + idx}`}
                className="grid items-center gap-px px-2 py-1"
                style={gridStyle}
                aria-hidden="true"
              >
                <span className="text-muted-foreground/30 text-[10px] italic">
                  {rows.length === 0 && idx === 2 ? "Add Pokémon…" : "\u00A0"}
                </span>
                {ALL_TYPES.map((t) => (
                  <span
                    key={`empty-${rows.length + idx}-${t}`}
                    className="text-muted-foreground/15 inline-flex items-center justify-center font-mono text-[10px] leading-none"
                  >
                    ·
                  </span>
                ))}
                <span />
              </div>
            )
          )}
        </div>

        {/* Column totals footer */}
        <div
          className="bg-muted/50 sticky bottom-0 grid items-center gap-px border-t px-2 py-1.5"
          style={gridStyle}
        >
          <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
            TOTAL
          </span>
          {colTotals.map((col, idx) => {
            const net = netScore(col, mode);
            return (
              <span
                key={ALL_TYPES[idx]}
                className={cn(
                  "flex justify-center font-mono text-[9px] font-semibold transition-opacity duration-100",
                  hoverCell !== null && hoverCell.col !== idx && "opacity-40",
                  net > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : net < 0
                      ? "text-destructive"
                      : "text-muted-foreground/60"
                )}
              >
                {net > 0 ? `+${net}` : net}
              </span>
            );
          })}
          {/* Grand total */}
          {(() => {
            const grandNet = colTotals.reduce(
              (s, col) => s + netScore(col, mode),
              0
            );
            return (
              <span
                className={cn(
                  "flex justify-center font-mono text-[9px] font-semibold",
                  grandNet > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : grandNet < 0
                      ? "text-destructive"
                      : "text-muted-foreground/60"
                )}
              >
                {grandNet > 0 ? `+${grandNet}` : grandNet}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mini-stat helpers (exported for Dockbar use)
// =============================================================================

/**
 * Quick team-wide defensive weak/covered counts for the Dockbar pill sub-line.
 * Weak = at least one team member takes ×2+ from this type.
 * Covered = at least one team member resists or is immune (no member is weak).
 */
export function getTeamDefensiveSummary(
  team: TeamWithPokemon["team_pokemon"]
): { weakCount: number; coveredCount: number } {
  const pokemons = team
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  if (pokemons.length === 0) return { weakCount: 0, coveredCount: 0 };

  let weakCount = 0;
  let coveredCount = 0;

  for (const attackingType of ALL_TYPES) {
    let hasWeak = false;
    let hasResistOrImmune = false;

    for (const p of pokemons) {
      const defenderTypes = p.species
        ? (getSpeciesTypes(p.species) as PokemonType[])
        : (["Normal"] as PokemonType[]);
      const mult = effectiveDefensiveMult({
        attackingType,
        defenderTypes,
        ability: p.ability,
        item: p.held_item,
      });
      if (mult >= 2) hasWeak = true;
      if (mult < 1 || mult === 0) hasResistOrImmune = true;
    }

    if (hasWeak) weakCount++;
    if (!hasWeak && hasResistOrImmune) coveredCount++;
  }

  return { weakCount, coveredCount };
}
