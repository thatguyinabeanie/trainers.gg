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

import { TypeDot } from "../type-dot";
import { formatSupportsTera } from "../format-gating";
import { effectiveDefensiveMult } from "./heatmap-effects";
import { effectiveOffensiveMult } from "./move-type-overrides";

// =============================================================================
// Types
// =============================================================================

export interface HeatmapPanelProps {
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
}

type CoverageMode = "defensive" | "offensive";

interface MatrixRow {
  type: PokemonType;
  multipliers: (number | null)[];
  weakCount: number;
  resistCount: number;
  immuneCount: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Returns the effective defender types for a Pokemon in the heatmap.
 *
 * When showTera is true and the Pokemon has a tera_type set, the Tera type
 * replaces all species types (matching in-game Tera behavior: the Pokemon's
 * type becomes solely the Tera type for all defensive matchup purposes).
 * Falls back to species types if tera_type is not set.
 *
 * When showTera is false, always returns species types (pre-Tera baseline).
 */
function getDefenderTypes(
  pokemon: Tables<"pokemon">,
  showTera: boolean
): PokemonType[] {
  if (showTera && pokemon.tera_type) {
    return [pokemon.tera_type as PokemonType];
  }
  return getSpeciesTypes(pokemon.species ?? "") as PokemonType[];
}

function buildDefensiveMatrix(
  teamPokemon: TeamWithPokemon["team_pokemon"],
  showTera: boolean
): MatrixRow[] {
  const pokemons = teamPokemon
    .slice()
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  return ALL_TYPES.map((attackingType) => {
    const multipliers: (number | null)[] = [];
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    for (const p of pokemons) {
      const defenderTypes = getDefenderTypes(p, showTera);
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

    return { type: attackingType, multipliers, weakCount, resistCount, immuneCount };
  });
}

const MOVE_SLOTS = ["move1", "move2", "move3", "move4"] as const;

function buildOffensiveMatrix(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): MatrixRow[] {
  const pokemons = teamPokemon
    .slice()
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  return ALL_TYPES.map((defendingType) => {
    const multipliers: (number | null)[] = [];
    let weakCount = 0; // super-effective for attacker = "good"
    let resistCount = 0;
    let immuneCount = 0;

    for (const p of pokemons) {
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

    return { type: defendingType, multipliers, weakCount, resistCount, immuneCount };
  });
}

/** Sort rows so most threatened (highest max multiplier) appear first. */
function sortDefensive(rows: MatrixRow[]): MatrixRow[] {
  return [...rows].sort((a, b) => {
    const maxA = Math.max(...a.multipliers.map((m) => m ?? 0));
    const maxB = Math.max(...b.multipliers.map((m) => m ?? 0));
    return maxB - maxA;
  });
}

function formatMultiplier(mult: number): string {
  if (mult === 0) return "0";
  if (mult === 0.25) return "1/4";
  if (mult === 0.5) return "1/2";
  if (mult === 1.25) return "1.25";
  return `x${mult}`;
}

function cellClass(mult: number, mode: CoverageMode): string {
  if (mode === "defensive") {
    if (mult === 0)
      return "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold";
    if (mult >= 4) return "bg-destructive/15 text-destructive font-semibold";
    if (mult >= 2) return "bg-destructive/10 text-destructive";
    if (mult <= 0.25)
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
    if (mult < 1)
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    return "bg-muted/30 text-muted-foreground";
  }
  // Offensive
  if (mult === 0)
    return "bg-muted text-muted-foreground/60 line-through font-semibold";
  if (mult >= 4)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
  if (mult >= 2)
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (mult <= 0.25) return "bg-destructive/15 text-destructive font-semibold";
  if (mult < 1) return "bg-destructive/10 text-destructive";
  return "bg-muted/30 text-muted-foreground";
}

// =============================================================================
// MonHeaderIcon
// =============================================================================

function MonHeaderIcon({ pokemon }: { pokemon: Tables<"pokemon"> }) {
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
            className="bg-muted/40 inline-flex size-6 cursor-default items-center justify-center rounded-full"
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
// HeatmapPanel
// =============================================================================

/**
 * Defensive/offensive type coverage matrix for the v2 team builder bottom drawer.
 *
 * DEFENSIVE (default): rows = 18 attacking types, columns = team slots.
 *   Cell = multiplier the team member TAKES from that type.
 *   Ability/item modifiers applied via effectiveDefensiveMult.
 *   When showTera is true (Tera-format only): each Pokemon's defender types
 *   become [tera_type] if set, otherwise fall back to species types.
 *
 * OFFENSIVE: rows = 18 defending types, columns = team slots.
 *   Cell = best multiplier that team member can deal with its damaging moves.
 *   This matrix is coverage-only (no STAB weighting). Tera does not change
 *   which types a move hits — it only changes STAB identity. Since this matrix
 *   does not weight by STAB, the offensive view is invariant to Tera and the
 *   toggle has no effect on offensive rows (showTera only affects defensive view).
 *
 * Sorted by severity (most weaknesses first) in defensive view.
 */
export function HeatmapPanel({ team, format }: HeatmapPanelProps) {
  const [mode, setMode] = useState<CoverageMode>("defensive");
  // showTera is only meaningful when the format supports Tera.
  // Defaults to false so the baseline view is always species types.
  const [showTera, setShowTera] = useState(false);

  const teraSupported = formatSupportsTera(format);

  const pokemons = team
    .slice()
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  const monCount = pokemons.length;

  // showTera is only active in defensive mode (offensive is coverage-only, not STAB-weighted)
  const effectiveShowTera = showTera && teraSupported && mode === "defensive";

  const rawRows =
    mode === "defensive"
      ? buildDefensiveMatrix(team, effectiveShowTera)
      : buildOffensiveMatrix(team);

  const rows = mode === "defensive" ? sortDefensive(rawRows) : rawRows;

  // Summary counts (team-wide totals) for the footer row
  const totalWeak = rows.reduce((sum, r) => sum + r.weakCount, 0);
  const totalResist = rows.reduce((sum, r) => sum + r.resistCount, 0);
  const totalImmune = rows.reduce((sum, r) => sum + r.immuneCount, 0);

  // CSS grid: type-icon col + one per mon + summary col
  const gridStyle: CSSProperties = {
    "--mon-count": monCount,
    gridTemplateColumns: `2.5rem repeat(${monCount}, minmax(0, 1fr)) 4rem`,
  } as CSSProperties;

  return (
    <div data-testid="heatmap-panel" className="flex min-h-0 flex-col">
      {/* Panel header + toggles — outside the scroll wrapper so it stays pinned */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-foreground text-sm font-semibold">
          {mode === "defensive" ? "Defensive coverage" : "Offensive coverage"}
        </span>
        <div className="flex items-center gap-2">
          {/* Tera toggle — only shown for Tera-supporting formats, defensive mode only */}
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
        </div>
      </div>

      {monCount === 0 && (
        <div className="text-muted-foreground px-3 py-6 text-center text-xs">
          Add Pokémon to your team to see the type chart.
        </div>
      )}

      {monCount > 0 && (
        /* Inner scroll wrapper: the matrix can be wide (18 rows × N cols +
           summary col). Scroll horizontally inside the panel so the page
           itself never produces a horizontal scrollbar. */
        <div className="overflow-x-auto">
          {/* Column headers */}
          <div
            className="bg-muted/50 grid items-center gap-0.5 px-2 py-1"
            style={gridStyle}
          >
            <span aria-hidden />
            {pokemons.map((mon) => (
              <span key={mon.id} className="flex justify-center">
                <MonHeaderIcon pokemon={mon} />
              </span>
            ))}
            {/* Summary header */}
            <span className="text-muted-foreground text-center text-[9px] font-semibold uppercase tracking-wide">
              {mode === "defensive" ? "Weak/Res/Imm" : "SE/Res/Imm"}
            </span>
          </div>

          {/* Type rows */}
          <div className="divide-muted/40 divide-y">
            {rows.map((row) => {
              const maxMult = Math.max(...row.multipliers.map((m) => m ?? 0));
              return (
                <div
                  key={row.type}
                  className={cn(
                    "grid items-center gap-0.5 px-2 py-px text-xs",
                    mode === "defensive" && maxMult >= 4 && "bg-destructive/5"
                  )}
                  style={gridStyle}
                >
                  {/* Type icon */}
                  <span className="flex items-center justify-center">
                    <TypeDot t={row.type} size={12} />
                  </span>

                  {/* Per-mon cells */}
                  {pokemons.map((mon, idx) => {
                    const mult = row.multipliers[idx] ?? null;
                    if (mult === null) {
                      return (
                        <span
                          key={`${row.type}-${mon.id}`}
                          className="text-muted-foreground/40 inline-flex items-center justify-center font-mono text-[10px] leading-none"
                        >
                          —
                        </span>
                      );
                    }
                    return (
                      <span
                        key={`${row.type}-${mon.id}`}
                        className={cn(
                          "inline-flex items-center justify-center rounded px-0.5 py-0 font-mono text-[10px] leading-tight",
                          cellClass(mult, mode)
                        )}
                      >
                        {formatMultiplier(mult)}
                      </span>
                    );
                  })}

                  {/* Row summary */}
                  <span className="flex justify-center gap-1 font-mono text-[9px]">
                    <span
                      className={cn(
                        row.weakCount > 0
                          ? mode === "defensive"
                            ? "text-destructive font-semibold"
                            : "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-muted-foreground/40"
                      )}
                    >
                      {row.weakCount}
                    </span>
                    <span className="text-muted-foreground/40">/</span>
                    <span
                      className={cn(
                        row.resistCount > 0
                          ? mode === "defensive"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                          : "text-muted-foreground/40"
                      )}
                    >
                      {row.resistCount}
                    </span>
                    <span className="text-muted-foreground/40">/</span>
                    <span
                      className={cn(
                        row.immuneCount > 0
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-muted-foreground/40"
                      )}
                    >
                      {row.immuneCount}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Team-wide totals footer */}
          <div
            className="bg-muted/50 grid items-center gap-0.5 border-t px-2 py-1.5"
            style={gridStyle}
          >
            <span className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wide">
              TOTAL
            </span>
            {pokemons.map((mon) => {
              // Per-mon totals (count across all type rows)
              const monIdx = pokemons.findIndex((p) => p.id === mon.id);
              let wk = 0;
              let rs = 0;
              let im = 0;
              for (const row of rows) {
                const m = row.multipliers[monIdx] ?? null;
                if (m === null) continue;
                if (m === 0) im++;
                else if (m < 1) rs++;
                else if (m > 1) wk++;
              }
              return (
                <div key={mon.id} className="flex flex-col items-center gap-0">
                  <span className="text-destructive font-mono text-[9px] font-semibold">
                    {wk}w
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[9px]">
                    {rs}r
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[9px]">
                    {im}i
                  </span>
                </div>
              );
            })}
            <div className="flex flex-col items-center gap-0">
              <span className="text-destructive font-mono text-[9px] font-semibold">
                {totalWeak}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[9px]">
                {totalResist}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[9px]">
                {totalImmune}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-muted/30 text-muted-foreground px-3 py-1.5 text-[10px]">
            {mode === "defensive"
              ? effectiveShowTera
                ? "Columns: Tera type active · ability & item modifiers applied · Pokemon without a Tera type use species types"
                : teraSupported
                  ? "Columns: ability & item modifiers applied · Toggle 'View as Tera' to simulate Tera defensive types"
                  : "Columns: ability & item modifiers applied"
              : "Best coverage move per slot · STAB not weighted (Tera does not change move types offensively)"}
          </div>

          {/* Legend dots */}
          <div className="bg-muted/30 flex flex-wrap gap-2 px-3 pb-2 text-[10px]">
            {(
              [
                { label: "Immune (0)", cls: "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300" },
                { label: "1/4×", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
                { label: "1/2×", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
                { label: "1× neutral", cls: "bg-muted/30 text-muted-foreground" },
                { label: "2×", cls: "bg-destructive/10 text-destructive" },
                { label: "4×", cls: "bg-destructive/15 text-destructive font-semibold" },
              ] as { label: string; cls: string }[]
            ).map(({ label, cls }) => (
              <span key={label} className={cn("rounded px-1 font-mono", cls)}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
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
