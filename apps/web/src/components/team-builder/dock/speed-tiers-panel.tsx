"use client";

import { type Dispatch, type SetStateAction } from "react";

import {
  type GameFormat,
  calculateChampionsStat,
  calculateStat,
  getBaseStats,
  isChampionsFormat,
} from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import {
  SpeedTiersFieldControls,
  SpeedTiersModifiers,
  SpeedTiersTable,
  parseExternalWeather,
} from "./speed-tiers-content";
import { type ToggleState } from "./speed-tiers-state";

// =============================================================================
// SpeedTiersPanel — side-pane container
// =============================================================================

export interface SpeedTiersPanelProps {
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  toggle: ToggleState;
  setToggle: Dispatch<SetStateAction<ToggleState>>;
  /** Capitalized weather from calc state (e.g. "Sun", "Rain", "" for none). */
  weather?: string;
  /** Setter for the shared calc weather state. */
  setWeather?: (v: string) => void;
}

/**
 * Speed tier ladder for the v2 team builder sidebar.
 *
 * Shows your team vs the format meta with min/max speeds.
 * YOURS/THEIRS switches let you simulate real game scenarios.
 * Trick Room toggle inverts the sort order.
 *
 * This is the side-pane presentation: it stacks the three presentation-agnostic
 * content pieces (field controls, table, modifiers) and drives them from an
 * external toggle so a dialog presentation can reuse the same state + content.
 */
export function SpeedTiersPanel({
  team,
  format,
  toggle,
  setToggle,
  weather: externalWeather,
  setWeather: externalSetWeather,
}: SpeedTiersPanelProps) {
  if (!format) {
    return (
      <div className="text-muted-foreground px-3 py-6 text-center text-sm">
        Select a format to see speed tiers.
      </div>
    );
  }

  // Weather: derive from external (calc) state if provided, else use local toggle
  const isExternallyControlled = externalWeather !== undefined;
  const effectiveWeather = isExternallyControlled
    ? parseExternalWeather(externalWeather)
    : toggle.weather;

  const champions = isChampionsFormat(format);
  const maxEv = champions ? 32 : 252;
  const evStep = champions ? 1 : 4;
  const evLabel = champions ? "SP" : "EVs";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* FIELD section — above table */}
      <div className="border-b px-3 py-3">
        <SpeedTiersFieldControls
          toggle={toggle}
          setToggle={setToggle}
          effectiveWeather={effectiveWeather}
          isExternallyControlled={isExternallyControlled}
          externalWeather={externalWeather}
          externalSetWeather={externalSetWeather}
        />
      </div>

      {/* Tier table */}
      <SpeedTiersTable
        team={team}
        format={format}
        toggle={toggle}
        setToggle={setToggle}
        effectiveWeather={effectiveWeather}
      />

      {/* MODIFIERS section — below table */}
      <div className="border-t px-3 py-3">
        <SpeedTiersModifiers
          toggle={toggle}
          setToggle={setToggle}
          maxEv={maxEv}
          evStep={evStep}
          evLabel={evLabel}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Mini-stat helpers (exported for Dockbar use)
// =============================================================================

/**
 * Get the fastest effective speed on the team for the Dockbar pill sub-line.
 * Uses max investment (252 EVs + nature) at format level.
 */
export function getTeamFastestSpeed(
  team: TeamWithPokemon["team_pokemon"],
  format: GameFormat
): number {
  const pokemons = team
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  if (pokemons.length === 0) return 0;

  let fastest = 0;
  for (const p of pokemons) {
    const stats = getBaseStats(p.species ?? "");
    if (!stats) continue;
    const maxSpeed = isChampionsFormat(format)
      ? calculateChampionsStat(stats.speed, 32, 1.1)
      : calculateStat(stats.speed, 31, 252, 50, 1.1);
    if (maxSpeed > fastest) fastest = maxSpeed;
  }
  return fastest;
}
