"use client";

import { useState } from "react";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";
import {
  ALL_TYPES,
  getDefensiveMatchups,
  getMoveType,
  getSpeciesTypes,
  getTypeEffectiveness,
  type PokemonType,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TYPE_PILL_COLORS } from "./type-colors";

// =============================================================================
// Types
// =============================================================================

type View = "defensive" | "offensive";
type Scope = "team" | "selected";

interface TypeCoverageTabProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
}

// =============================================================================
// Helpers
// =============================================================================

/** Returns the heatmap cell classes and display label for a defensive multiplier. */
function heatmapCell(multiplier: number): { label: string; className: string } {
  if (multiplier === 0)
    return {
      label: "0",
      className: "bg-[#1e293b] text-[#64748b]",
    };
  if (multiplier === 4)
    return {
      label: "4",
      className: "bg-[#991b1b] text-white",
    };
  if (multiplier === 2)
    return {
      label: "2",
      className: "bg-[#fca5a5] text-[#7f1d1d]",
    };
  if (multiplier === 0.5)
    return {
      label: "½",
      className: "bg-[#bbf7d0] text-[#166534]",
    };
  if (multiplier === 0.25)
    return {
      label: "¼",
      className: "bg-[#166534] text-[#dcfce7]",
    };
  // neutral
  return {
    label: "—",
    className: "bg-[#f8fafc] text-[#d4d4d8]",
  };
}

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

/** Abbreviate species name for column headers. */
function abbreviate(species: string): string {
  return species.length > 7 ? species.slice(0, 6) + "…" : species;
}

// =============================================================================
// Shared sub-components
// =============================================================================

function TypeBadge({ type }: { type: string }) {
  const colors =
    TYPE_PILL_COLORS[type as keyof typeof TYPE_PILL_COLORS] ??
    "bg-stone-400 text-white";
  return (
    <span
      className={cn(
        "inline-block rounded px-1 py-0.5 text-[10px] leading-none font-semibold",
        colors
      )}
    >
      {type}
    </span>
  );
}

/** Shared cell style: fixed size, centered, bold, rounded. */
const CELL_BASE =
  "min-w-[36px] rounded px-1 text-center font-semibold text-xs leading-[32px] h-[32px] select-none";

// =============================================================================
// Toggle group
// =============================================================================

interface ToggleGroupProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: ToggleGroupProps<T>) {
  return (
    <div className="border-border bg-muted flex rounded-full border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-teal-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Defensive heatmap — full team
// =============================================================================

interface DefensiveTeamMatrixProps {
  teamPokemon: Tables<"pokemon">[];
}

function DefensiveTeamMatrix({ teamPokemon }: DefensiveTeamMatrixProps) {
  if (teamPokemon.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Add Pokemon to see the defensive heatmap.
      </p>
    );
  }

  const matchupsByPokemon = teamPokemon.map((p) => ({
    pokemon: p,
    matchups: getDefensiveMatchups(getSpeciesTypes(p.species)),
  }));

  // Collect insights: weaknesses shared by 2+ and 3+ resists
  const weakCountByType: Partial<Record<PokemonType, number>> = {};
  const resistCountByType: Partial<Record<PokemonType, number>> = {};

  for (const { matchups } of matchupsByPokemon) {
    for (const type of ALL_TYPES) {
      const mult = getDefMult(type, matchups);
      if (mult > 1) {
        weakCountByType[type] = (weakCountByType[type] ?? 0) + 1;
      }
      if (mult < 1) {
        resistCountByType[type] = (resistCountByType[type] ?? 0) + 1;
      }
    }
  }

  const sharedWeaknesses = ALL_TYPES.filter(
    (t) => (weakCountByType[t] ?? 0) >= 2
  );
  const goodResistances = ALL_TYPES.filter(
    (t) => (resistCountByType[t] ?? 0) >= 3
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Matrix */}
      <div className="rounded-lg border bg-white p-3 shadow-sm">
        <div className="overflow-x-auto">
          <table style={{ borderSpacing: "4px", borderCollapse: "separate" }}>
            <thead>
              <tr>
                {/* Type label column header */}
                <th className="w-20 pr-3 text-left" />
                {teamPokemon.map((p) => (
                  <th
                    key={p.id}
                    className="text-muted-foreground min-w-[36px] pb-1 text-center text-[10px] font-medium"
                    title={p.species}
                  >
                    {abbreviate(p.species)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_TYPES.map((attackType) => (
                <tr key={attackType}>
                  <td className="py-1 pr-3 text-left">
                    <TypeBadge type={attackType} />
                  </td>
                  {matchupsByPokemon.map(({ pokemon, matchups }) => {
                    const mult = getDefMult(attackType, matchups);
                    const { label, className } = heatmapCell(mult);
                    return (
                      <td key={pokemon.id} className="p-0">
                        <div
                          className={cn(CELL_BASE, className)}
                          title={`${attackType} vs ${pokemon.species}: ${mult}×`}
                          aria-label={`${attackType} vs ${pokemon.species}: ${mult}×`}
                        >
                          {label}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      {(sharedWeaknesses.length > 0 || goodResistances.length > 0) && (
        <DefensiveInsights
          sharedWeaknesses={sharedWeaknesses}
          goodResistances={goodResistances}
          weakCountByType={weakCountByType}
          resistCountByType={resistCountByType}
        />
      )}
    </div>
  );
}

// =============================================================================
// Defensive heatmap — selected Pokemon
// =============================================================================

interface DefensiveSelectedProps {
  pokemon: Tables<"pokemon">;
}

function DefensiveSelected({ pokemon }: DefensiveSelectedProps) {
  const types = getSpeciesTypes(pokemon.species);
  const matchups = getDefensiveMatchups(types);

  const teraType = pokemon.tera_type as PokemonType | null;
  const teraMatchups = teraType ? getDefensiveMatchups([teraType]) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Single-pokemon defensive column */}
      <div className="rounded-lg border bg-white p-3 shadow-sm">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {pokemon.species} — Defensive
          {types.length > 0 && (
            <span className="ml-1.5 inline-flex gap-1 normal-case">
              {types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </span>
          )}
        </p>
        <div className="overflow-x-auto">
          <table style={{ borderSpacing: "4px", borderCollapse: "separate" }}>
            <thead>
              <tr>
                <th className="w-20 pr-3 text-left" />
                <th className="text-muted-foreground min-w-[36px] pb-1 text-center text-[10px] font-medium">
                  Current
                </th>
                {teraMatchups && (
                  <th className="text-muted-foreground min-w-[36px] pb-1 text-center text-[10px] font-medium">
                    Tera {teraType}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ALL_TYPES.map((attackType) => {
                const mult = getDefMult(attackType, matchups);
                const { label, className } = heatmapCell(mult);

                const teraMult = teraMatchups
                  ? getDefMult(attackType, teraMatchups)
                  : null;
                const teraCell =
                  teraMult !== null ? heatmapCell(teraMult) : null;

                // Skip rows that are neutral in both columns
                if (mult === 1 && (teraMult === null || teraMult === 1))
                  return null;

                return (
                  <tr key={attackType}>
                    <td className="py-1 pr-3 text-left">
                      <TypeBadge type={attackType} />
                    </td>
                    <td className="p-0">
                      <div
                        className={cn(CELL_BASE, className)}
                        title={`${attackType}: ${mult}×`}
                      >
                        {label}
                      </div>
                    </td>
                    {teraCell && (
                      <td className="p-0">
                        <div
                          className={cn(CELL_BASE, teraCell.className)}
                          title={`Tera ${teraType} vs ${attackType}: ${teraMult}×`}
                        >
                          {teraCell.label}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Offensive heatmap — full team
// =============================================================================

interface OffensiveTeamMatrixProps {
  teamPokemon: Tables<"pokemon">[];
}

function OffensiveTeamMatrix({ teamPokemon }: OffensiveTeamMatrixProps) {
  if (teamPokemon.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Add Pokemon to see the offensive coverage heatmap.
      </p>
    );
  }

  // For each Pokemon, determine which target types it hits SE via any of its 4 moves
  const seByPokemon = teamPokemon.map((p) => {
    const moves = [p.move1, p.move2, p.move3, p.move4].filter(
      (m): m is string => Boolean(m)
    );
    const seTypes = new Set<PokemonType>();
    for (const moveName of moves) {
      const moveTypeStr = getMoveType(moveName);
      if (!moveTypeStr) continue;
      const moveType = moveTypeStr as PokemonType;
      for (const targetType of ALL_TYPES) {
        if (getTypeEffectiveness(moveType, [targetType]) >= 2) {
          seTypes.add(targetType);
        }
      }
    }
    return { pokemon: p, seTypes };
  });

  // Insights: types with no SE coverage across the team
  const uncoveredTypes = ALL_TYPES.filter(
    (t) => !seByPokemon.some(({ seTypes }) => seTypes.has(t))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-3 shadow-sm">
        <div className="overflow-x-auto">
          <table style={{ borderSpacing: "4px", borderCollapse: "separate" }}>
            <thead>
              <tr>
                <th className="w-20 pr-3 text-left" />
                {teamPokemon.map((p) => (
                  <th
                    key={p.id}
                    className="text-muted-foreground min-w-[36px] pb-1 text-center text-[10px] font-medium"
                    title={p.species}
                  >
                    {abbreviate(p.species)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_TYPES.map((targetType) => (
                <tr key={targetType}>
                  <td className="py-1 pr-3 text-left">
                    <TypeBadge type={targetType} />
                  </td>
                  {seByPokemon.map(({ pokemon, seTypes }) => {
                    const hasSE = seTypes.has(targetType);
                    return (
                      <td key={pokemon.id} className="p-0">
                        <div
                          className={cn(
                            CELL_BASE,
                            hasSE
                              ? "bg-[#bbf7d0] text-[#166534]"
                              : "bg-[#f8fafc] text-[#d4d4d8]"
                          )}
                          title={`${pokemon.species} vs ${targetType}: ${hasSE ? "SE coverage" : "no SE"}`}
                        >
                          {hasSE ? "✓" : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      {uncoveredTypes.length > 0 && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Coverage Gaps
          </p>
          <div className="flex flex-col gap-1.5">
            {uncoveredTypes.map((type) => (
              <div
                key={type}
                className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1"
              >
                <span className="text-red-600">⚠</span>
                <TypeBadge type={type} />
                <span className="text-xs text-red-700">No SE coverage</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// =============================================================================
// Offensive heatmap — selected Pokemon
// =============================================================================

interface OffensiveSelectedProps {
  pokemon: Tables<"pokemon">;
}

function OffensiveSelected({ pokemon }: OffensiveSelectedProps) {
  const moves = [
    pokemon.move1,
    pokemon.move2,
    pokemon.move3,
    pokemon.move4,
  ].filter((m): m is string => Boolean(m));

  if (moves.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Add moves to see offensive coverage.
      </p>
    );
  }

  // For each move, compute its type and which target types it hits SE
  const moveRows = moves.map((moveName) => {
    const moveTypeStr = getMoveType(moveName);
    const moveType = moveTypeStr as PokemonType | null;
    const seTypes = new Set<PokemonType>();
    if (moveType) {
      for (const targetType of ALL_TYPES) {
        if (getTypeEffectiveness(moveType, [targetType]) >= 2) {
          seTypes.add(targetType);
        }
      }
    }
    return { moveName, moveType, seTypes };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-3 shadow-sm">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {pokemon.species} — Offensive Coverage
        </p>
        <div className="overflow-x-auto">
          <table style={{ borderSpacing: "4px", borderCollapse: "separate" }}>
            <thead>
              <tr>
                <th className="w-20 pr-3 text-left" />
                {moveRows.map(({ moveName, moveType }) => (
                  <th
                    key={moveName}
                    className="text-muted-foreground min-w-[44px] pb-1 text-center text-[9px] font-medium"
                    title={moveName}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="max-w-[44px] truncate">{moveName}</span>
                      {moveType && <TypeBadge type={moveType} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_TYPES.map((targetType) => (
                <tr key={targetType}>
                  <td className="py-1 pr-3 text-left">
                    <TypeBadge type={targetType} />
                  </td>
                  {moveRows.map(({ moveName, seTypes }) => {
                    const hasSE = seTypes.has(targetType);
                    return (
                      <td key={moveName} className="p-0">
                        <div
                          className={cn(
                            CELL_BASE,
                            hasSE
                              ? "bg-[#bbf7d0] text-[#166534]"
                              : "bg-[#f8fafc] text-[#d4d4d8]"
                          )}
                          title={`${moveName} vs ${targetType}: ${hasSE ? "super-effective" : "not SE"}`}
                        >
                          {hasSE ? "✓" : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Defensive Insights
// =============================================================================

interface DefensiveInsightsProps {
  sharedWeaknesses: PokemonType[];
  goodResistances: PokemonType[];
  weakCountByType: Partial<Record<PokemonType, number>>;
  resistCountByType: Partial<Record<PokemonType, number>>;
}

function DefensiveInsights({
  sharedWeaknesses,
  goodResistances,
  weakCountByType,
  resistCountByType,
}: DefensiveInsightsProps) {
  return (
    <section>
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        Insights
      </p>
      <div className="flex flex-col gap-1.5">
        {sharedWeaknesses.map((type) => (
          <div
            key={type}
            className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1"
          >
            <span className="text-red-600">⚠</span>
            <TypeBadge type={type} />
            <span className="text-xs text-red-700">
              {weakCountByType[type]} members weak
            </span>
          </div>
        ))}
        {goodResistances.map((type) => (
          <div
            key={type}
            className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2 py-1"
          >
            <span className="text-green-600">✓</span>
            <TypeBadge type={type} />
            <span className="text-xs text-green-700">
              {resistCountByType[type]}+ resistances
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// TypeCoverageTab
// =============================================================================

export function TypeCoverageTab({
  team,
  selectedPokemon,
}: TypeCoverageTabProps) {
  const [view, setView] = useState<View>("defensive");
  const [scope, setScope] = useState<Scope>("team");

  const teamPokemon = team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon!);

  // Determine effective scope: fall back to "team" if no Pokemon is selected
  const effectiveScope = selectedPokemon ? scope : "team";

  function renderContent() {
    if (view === "defensive") {
      if (effectiveScope === "selected" && selectedPokemon) {
        return <DefensiveSelected pokemon={selectedPokemon} />;
      }
      return <DefensiveTeamMatrix teamPokemon={teamPokemon} />;
    }
    // offensive
    if (effectiveScope === "selected" && selectedPokemon) {
      return <OffensiveSelected pokemon={selectedPokemon} />;
    }
    return <OffensiveTeamMatrix teamPokemon={teamPokemon} />;
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup<View>
          value={view}
          onChange={setView}
          options={[
            { value: "defensive", label: "Defensive" },
            { value: "offensive", label: "Offensive" },
          ]}
        />
        <ToggleGroup<Scope>
          value={effectiveScope}
          onChange={setScope}
          options={[
            { value: "team", label: "Full Team" },
            { value: "selected", label: "Selected" },
          ]}
        />
        {!selectedPokemon && effectiveScope === "team" && (
          <span className="text-muted-foreground text-xs">
            Select a Pokemon to view individually
          </span>
        )}
      </div>

      {/* Matrix */}
      {renderContent()}
    </div>
  );
}
