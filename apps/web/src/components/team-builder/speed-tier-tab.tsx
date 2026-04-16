"use client";

import { useState } from "react";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";
import {
  type GameFormat,
  calculateStat,
  getBaseStats,
  getFormatSpeedBenchmarks,
  getNatureMultiplier,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface SpeedTierTabProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
}

type StatStage = -2 | -1 | 0 | 1 | 2;

interface TableRow {
  kind: "group-header" | "pokemon";
  // group-header fields
  groupLabel?: string;
  // pokemon row fields
  species?: string;
  isTeamMember?: boolean;
  baseSpeed?: number;
  minSpeed?: number;
  maxNeutral?: number;
  maxPositive?: number;
  tailwindSpeed?: number;
  scarfSpeed?: number;
  // For team member rows: their actual build stats
  actualSpeed?: number;
}

// =============================================================================
// Constants
// =============================================================================

const STAGE_MULTIPLIERS: Record<StatStage, number> = {
  [-2]: 0.5,
  [-1]: 0.67,
  [0]: 1.0,
  [1]: 1.5,
  [2]: 2.0,
};

const STAGE_LABELS: Record<StatStage, string> = {
  [-2]: "-2",
  [-1]: "-1",
  [0]: "—",
  [1]: "+1",
  [2]: "+2",
};

// =============================================================================
// Helpers
// =============================================================================

function getPokemonActualSpeed(pokemon: Tables<"pokemon">): number {
  const baseStats = getBaseStats(pokemon.species);
  if (!baseStats) return 0;
  const natureMultiplier = getNatureMultiplier(pokemon.nature, "speed");
  return calculateStat(
    baseStats.speed,
    pokemon.iv_speed ?? 31,
    pokemon.ev_speed ?? 0,
    pokemon.level ?? 50,
    natureMultiplier
  );
}

function applyStage(value: number, stage: StatStage): number {
  return Math.floor(value * STAGE_MULTIPLIERS[stage]);
}

function getSpeedGroup(baseSpeed: number): "fast" | "mid" | "tr" {
  if (baseSpeed >= 100) return "fast";
  if (baseSpeed >= 60) return "mid";
  return "tr";
}

// =============================================================================
// Summary Cards (when a Pokemon is selected)
// =============================================================================

interface SummaryCardsProps {
  pokemon: Tables<"pokemon">;
}

function SummaryCards({ pokemon }: SummaryCardsProps) {
  const actualSpeed = getPokemonActualSpeed(pokemon);
  const tailwindSpeed = Math.floor(actualSpeed * 2);
  const scarfSpeed = Math.floor(actualSpeed * 1.5);

  const cards = [
    { label: "Current", value: actualSpeed },
    { label: "Tailwind ×2", value: tailwindSpeed },
    { label: "Scarf ×1.5", value: scarfSpeed },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center rounded-lg border bg-white p-3"
        >
          <span className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
          <span className="font-mono text-2xl font-bold text-teal-600">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// EV Suggestion
// =============================================================================

interface EvSuggestionProps {
  pokemon: Tables<"pokemon">;
  formatId: string;
}

function EvSuggestion({ pokemon, formatId }: EvSuggestionProps) {
  const baseStats = getBaseStats(pokemon.species);
  if (!baseStats) return null;

  const natureMultiplier = getNatureMultiplier(pokemon.nature, "speed");
  const actualSpeed = getPokemonActualSpeed(pokemon);
  const currentEvs = pokemon.ev_speed ?? 0;
  const benchmarks = getFormatSpeedBenchmarks(formatId);

  // Iterate the full EV range in +4 steps. We compare new speed against the
  // benchmark's `commonSpeeds.neutral252` (the most common investment pattern
  // players actually run) rather than against max speed, which produced
  // misleading suggestions. When multiple benchmarks become newly outspoken
  // at the same EV step, pick the one with the highest base speed — that's
  // the most meaningful threat to outrun.
  let suggestion: string | null = null;

  for (let evStep = 4; currentEvs + evStep <= 252; evStep += 4) {
    const newEvs = currentEvs + evStep;
    const newSpeed = calculateStat(
      baseStats.speed,
      pokemon.iv_speed ?? 31,
      newEvs,
      pokemon.level ?? 50,
      natureMultiplier
    );

    if (newSpeed <= actualSpeed) continue;

    const newlyOutspeeds = benchmarks.filter(
      (b) =>
        b.commonSpeeds.neutral252 < newSpeed &&
        b.commonSpeeds.neutral252 >= actualSpeed
    );

    if (newlyOutspeeds.length === 0) continue;

    const topTarget = newlyOutspeeds.reduce((best, cur) =>
      cur.baseSpeed > best.baseSpeed ? cur : best
    );

    suggestion = `+${evStep} Speed EVs → ${newSpeed} Spe, outspeeds neutral 252 ${topTarget.species} (${topTarget.commonSpeeds.neutral252})`;
    break;
  }

  if (!suggestion) return null;

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
      <span className="text-sm text-teal-700">💡 {suggestion}</span>
    </div>
  );
}

// =============================================================================
// Stat Stage Toggle
// =============================================================================

interface StageToggleProps {
  activeStage: StatStage;
  onChange: (stage: StatStage) => void;
}

function StageToggle({ activeStage, onChange }: StageToggleProps) {
  const stages: StatStage[] = [-2, -1, 0, 1, 2];

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground mr-1 text-xs font-medium">
        Stage
      </span>
      {stages.map((stage) => (
        <button
          key={stage}
          type="button"
          onClick={() => onChange(stage)}
          className={cn(
            "h-7 min-w-[2rem] rounded px-2 text-xs font-semibold transition-colors",
            activeStage === stage
              ? "bg-teal-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {STAGE_LABELS[stage]}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Speed Data Table
// =============================================================================

interface SpeedTableProps {
  team: TeamWithPokemon;
  formatId: string;
  activeStage: StatStage;
}

function SpeedTable({ team, formatId, activeStage }: SpeedTableProps) {
  const benchmarks = getFormatSpeedBenchmarks(formatId);

  // Build a set of team member species for quick lookup
  const teamPokemon = team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .map((tp) => tp.pokemon!);

  const teamSpeciesSet = new Set(teamPokemon.map((p) => p.species));

  // Build team member rows (use actual build stats)
  const teamRows: TableRow[] = teamPokemon.map((p) => {
    const baseStats = getBaseStats(p.species);
    const baseSpe = baseStats?.speed ?? 0;
    const actualSpeed = getPokemonActualSpeed(p);

    // Compute generic benchmarks for this species
    const minSpe = calculateStat(baseSpe, 0, 0, 50, 0.9);
    const maxNeutral = calculateStat(baseSpe, 31, 252, 50, 1.0);
    const maxPositive = calculateStat(baseSpe, 31, 252, 50, 1.1);
    const tailwind = Math.floor(maxPositive * 2);
    const scarf = Math.floor(maxPositive * 1.5);

    return {
      kind: "pokemon",
      species: p.species,
      isTeamMember: true,
      baseSpeed: baseSpe,
      minSpeed: minSpe,
      maxNeutral,
      maxPositive,
      tailwindSpeed: tailwind,
      scarfSpeed: scarf,
      actualSpeed,
    };
  });

  // Build benchmark rows (skip species already on the team)
  const benchmarkRows: TableRow[] = benchmarks
    .filter((b) => !teamSpeciesSet.has(b.species))
    .map(
      (b): TableRow => ({
        kind: "pokemon",
        species: b.species,
        isTeamMember: false,
        baseSpeed: b.baseSpeed,
        minSpeed: b.minSpeed,
        maxNeutral: b.commonSpeeds.neutral252,
        maxPositive: b.commonSpeeds.positive252,
        tailwindSpeed: b.commonSpeeds.tailwind,
        scarfSpeed: b.commonSpeeds.scarf,
      })
    );

  // Merge and sort by baseSpeed descending
  const allPokemonRows = [...teamRows, ...benchmarkRows].sort(
    (a, b) => (b.baseSpeed ?? 0) - (a.baseSpeed ?? 0)
  );

  // Inject group-header dividers
  const rows: TableRow[] = [];
  const seenGroups = new Set<string>();

  for (const row of allPokemonRows) {
    const group = getSpeedGroup(row.baseSpeed ?? 0);
    if (!seenGroups.has(group)) {
      seenGroups.add(group);
      const label =
        group === "fast"
          ? "Fast (Base 100+)"
          : group === "mid"
            ? "Mid (Base 60–99)"
            : "Trick Room (Base <60)";
      rows.push({ kind: "group-header", groupLabel: label });
    }
    rows.push(row);
  }

  const headers = [
    "Pokemon",
    "Base",
    "Min",
    "Max Neutral",
    "Max +Nat",
    "Tailwind",
    "Scarf",
  ];

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 bg-gray-50">
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-b px-3 py-2 text-left text-[10px] font-semibold tracking-wide text-gray-500 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              if (row.kind === "group-header") {
                return (
                  <tr
                    key={`group-${row.groupLabel}-${idx}`}
                    className="bg-gray-50"
                  >
                    <td
                      colSpan={7}
                      className="border-b px-3 py-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
                    >
                      {row.groupLabel}
                    </td>
                  </tr>
                );
              }

              const isTeam = row.isTeamMember;

              // For team members: show actual speed in the column that matches their build,
              // "—" in others. For benchmarks: show computed values with stage modifier.
              const displayMin = isTeam
                ? row.actualSpeed === row.minSpeed
                  ? applyStage(row.actualSpeed!, activeStage)
                  : "—"
                : applyStage(row.minSpeed!, activeStage);

              const displayNeutral = isTeam
                ? row.actualSpeed === row.maxNeutral
                  ? applyStage(row.actualSpeed!, activeStage)
                  : "—"
                : applyStage(row.maxNeutral!, activeStage);

              const displayPositive = isTeam
                ? row.actualSpeed === row.maxPositive ||
                  (row.actualSpeed !== row.minSpeed &&
                    row.actualSpeed !== row.maxNeutral)
                  ? applyStage(row.actualSpeed!, activeStage)
                  : "—"
                : applyStage(row.maxPositive!, activeStage);

              const displayTailwind = isTeam
                ? applyStage(Math.floor(row.actualSpeed! * 2), activeStage)
                : applyStage(row.tailwindSpeed!, activeStage);

              const displayScarf = isTeam
                ? applyStage(Math.floor(row.actualSpeed! * 1.5), activeStage)
                : applyStage(row.scarfSpeed!, activeStage);

              return (
                <tr
                  key={`${isTeam ? "team" : "bench"}-${row.species}-${idx}`}
                  className={cn(
                    "border-b transition-colors last:border-0",
                    isTeam ? "bg-teal-50 hover:bg-teal-100" : "hover:bg-gray-50"
                  )}
                >
                  {/* Pokemon name */}
                  <td
                    className={cn(
                      "px-3 py-1.5 font-medium",
                      isTeam ? "text-teal-700" : "text-gray-800"
                    )}
                  >
                    {isTeam ? `★ ${row.species}` : row.species}
                  </td>
                  {/* Base speed — slightly accented */}
                  <td className="bg-gray-50/50 px-3 py-1.5 font-mono text-gray-600">
                    {row.baseSpeed}
                  </td>
                  {/* Min */}
                  <td
                    className={cn(
                      "px-3 py-1.5 font-mono",
                      isTeam ? "text-teal-600" : "text-gray-500"
                    )}
                  >
                    {displayMin}
                  </td>
                  {/* Max Neutral */}
                  <td
                    className={cn(
                      "px-3 py-1.5 font-mono",
                      isTeam ? "text-teal-600" : "text-gray-600"
                    )}
                  >
                    {displayNeutral}
                  </td>
                  {/* Max +Nat */}
                  <td
                    className={cn(
                      "px-3 py-1.5 font-mono font-semibold",
                      isTeam ? "text-teal-700" : "text-gray-700"
                    )}
                  >
                    {displayPositive}
                  </td>
                  {/* Tailwind */}
                  <td
                    className={cn(
                      "px-3 py-1.5 font-mono",
                      isTeam ? "text-teal-600" : "text-gray-500"
                    )}
                  >
                    {displayTailwind}
                  </td>
                  {/* Scarf */}
                  <td
                    className={cn(
                      "px-3 py-1.5 font-mono",
                      isTeam ? "text-teal-600" : "text-gray-500"
                    )}
                  >
                    {displayScarf}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// SpeedTierTab
// =============================================================================

export function SpeedTierTab({
  team,
  selectedPokemon,
  format,
}: SpeedTierTabProps) {
  const [activeStage, setActiveStage] = useState<StatStage>(0);
  const formatId = format?.id ?? "gen9vgc2026regi";

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Summary cards — only when a Pokemon is selected */}
      {selectedPokemon && (
        <>
          <SummaryCards pokemon={selectedPokemon} />
          <EvSuggestion pokemon={selectedPokemon} formatId={formatId} />
        </>
      )}

      {/* Stat modifier toggle */}
      <div className="flex items-center justify-between">
        <StageToggle activeStage={activeStage} onChange={setActiveStage} />
        {activeStage !== 0 && (
          <span className="text-muted-foreground text-xs">
            ×{STAGE_MULTIPLIERS[activeStage]} applied to all speeds
          </span>
        )}
      </div>

      {/* Data table */}
      <SpeedTable team={team} formatId={formatId} activeStage={activeStage} />
    </div>
  );
}
