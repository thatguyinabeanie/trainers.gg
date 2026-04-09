/**
 * Speed tier calculator for competitive Pokemon formats.
 *
 * Provides benchmarks for all format-legal species and comparison utilities
 * to determine what a given Pokemon outspeeds or is outsped by.
 */

import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

import { calculateStat } from "./stats-calculator";
import { getFormatById } from "./formats";

// Local Generations instance — supports any generation, not just gen9
const gens = new Generations(Dex);

// =============================================================================
// Types
// =============================================================================

export interface SpeedBenchmark {
  species: string;
  baseSpeed: number;
  /** Minimum speed: level 50, 0 EVs, 0 IVs, -nature (0.9 multiplier) */
  minSpeed: number;
  /** Maximum speed: level 50, 252 EVs, 31 IVs, +nature (1.1 multiplier) */
  maxSpeed: number;
  commonSpeeds: {
    /** 252 EVs, 31 IVs, neutral nature (1.0 multiplier), level 50 */
    neutral252: number;
    /** 252 EVs, 31 IVs, +speed nature (1.1 multiplier), level 50 */
    positive252: number;
    /** max speed * 1.5, floored — Choice Scarf */
    scarf: number;
    /** max speed * 2, floored — Tailwind */
    tailwind: number;
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a SpeedBenchmark for a single species given its base speed stat.
 */
function buildBenchmark(
  speciesName: string,
  baseSpeed: number
): SpeedBenchmark {
  // Min: 0 EVs, 0 IVs, -nature (0.9), level 50
  const minSpeed = calculateStat(baseSpeed, 0, 0, 50, 0.9);

  // Max: 252 EVs, 31 IVs, +nature (1.1), level 50
  const maxSpeed = calculateStat(baseSpeed, 31, 252, 50, 1.1);

  // Neutral: 252 EVs, 31 IVs, neutral nature (1.0), level 50
  const neutral252 = calculateStat(baseSpeed, 31, 252, 50, 1.0);

  // Positive252 is the same as maxSpeed
  const positive252 = maxSpeed;

  // Scarf and Tailwind multiply the max speed
  const scarf = Math.floor(maxSpeed * 1.5);
  const tailwind = Math.floor(maxSpeed * 2);

  return {
    species: speciesName,
    baseSpeed,
    minSpeed,
    maxSpeed,
    commonSpeeds: {
      neutral252,
      positive252,
      scarf,
      tailwind,
    },
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get speed benchmarks for all format-legal species.
 *
 * Uses the format's generation to select the correct dex and iterates all
 * existing species, computing min/max/common speed values at level 50.
 *
 * Falls back to generation 9 if the format ID is not found in the registry.
 *
 * @param formatId - Showdown format ID (e.g., "gen9vgc2026regi")
 * @returns Array of SpeedBenchmark objects for every legal species
 */
export function getFormatSpeedBenchmarks(formatId: string): SpeedBenchmark[] {
  // Determine generation from format registry; default to 9 if unknown
  const format = getFormatById(formatId);
  const generation = format?.generation ?? 9;

  // Clamp to max supported generation by @pkmn/dex (currently 9)
  const safeGen = Math.min(generation, 9) as Parameters<typeof gens.get>[0];
  const gen = gens.get(safeGen);

  const benchmarks: SpeedBenchmark[] = [];

  for (const species of gen.species) {
    // Only include species that are real and not non-standard (e.g., Pokestar)
    if (!species.exists || species.isNonstandard) continue;

    benchmarks.push(buildBenchmark(species.name, species.baseStats.spe));
  }

  return benchmarks;
}

/**
 * Compare a specific Pokemon's speed against format benchmarks.
 *
 * Splits all format benchmarks into two sorted lists:
 * - `outspeeds`: species whose maxSpeed is strictly less than calculatedSpeed
 * - `outspedBy`: species whose maxSpeed is strictly greater than calculatedSpeed
 *
 * Both lists are sorted ascending by maxSpeed.
 *
 * @param species - Display name of the Pokemon being compared (for reference)
 * @param calculatedSpeed - The actual computed speed stat of the Pokemon
 * @param formatId - Showdown format ID used to scope the benchmark pool
 * @returns Object with `outspeeds` and `outspedBy` arrays of SpeedBenchmarks
 */
export function compareSpeedTier(
  species: string,
  calculatedSpeed: number,
  formatId: string
): { outspeeds: SpeedBenchmark[]; outspedBy: SpeedBenchmark[] } {
  const benchmarks = getFormatSpeedBenchmarks(formatId);

  // Exclude the subject species from both lists to avoid self-comparison
  const others = benchmarks.filter((b) => b.species !== species);

  // outspeeds: benchmarks whose max speed is strictly below our speed
  const outspeeds = others
    .filter((b) => b.maxSpeed < calculatedSpeed)
    .sort((a, b) => a.maxSpeed - b.maxSpeed);

  // outspedBy: benchmarks whose max speed is strictly above our speed
  const outspedBy = others
    .filter((b) => b.maxSpeed > calculatedSpeed)
    .sort((a, b) => a.maxSpeed - b.maxSpeed);

  return { outspeeds, outspedBy };
}
