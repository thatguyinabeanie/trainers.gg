// =============================================================================
// move-effectiveness.ts
//
// Computes type effectiveness multiplier for a move against a defender.
// Delegates to the shared @trainers/pokemon type chart so no logic is
// duplicated here.
// =============================================================================

import {
  getMoveData,
  getSpeciesTypes,
  getTypeEffectiveness,
  type PokemonType,
} from "@trainers/pokemon";

// =============================================================================
// Warn-once for unknown moves
// =============================================================================

const warnedMoves = new Set<string>();
function warnUnknownMove(move: string): void {
  if (warnedMoves.has(move)) return;
  warnedMoves.add(move);
  console.warn(`[getMoveEffectiveness] Unknown move data for: "${move}"`);
}

// =============================================================================
// Weather Ball type override
// =============================================================================

/**
 * Maps active weather to the type Weather Ball becomes under that weather.
 * Under no weather (or unrecognised weather), Weather Ball stays Normal.
 */
const WEATHER_BALL_TYPE: Record<string, PokemonType> = {
  Sun: "Fire",
  "Harsh Sunshine": "Fire",
  Rain: "Water",
  "Heavy Rain": "Water",
  Sand: "Rock",
  Snow: "Ice",
  Hail: "Ice",
};

/**
 * Returns the effective type of Weather Ball given the active weather.
 * Falls back to "Normal" when weather is absent or unrecognised.
 */
function getWeatherBallType(weather: string | null | undefined): PokemonType {
  if (!weather) return "Normal";
  return WEATHER_BALL_TYPE[weather] ?? "Normal";
}

// =============================================================================
// getMoveEffectiveness
// =============================================================================

/**
 * Returns the type effectiveness multiplier (e.g. 2, 0.5, 0) for a named
 * move against a named defender species.  Returns 1 when data is unavailable.
 *
 * @param moveName - The Pokémon move name (case-insensitive lookup).
 * @param defenderSpecies - The defender's species name.
 * @param weather - Active weather ("Sun", "Rain", "Sand", "Snow", etc.).
 *   Required to resolve the correct type for weather-dependent moves like
 *   Weather Ball (Normal under no weather → Fire/Water/Rock/Ice under weather).
 * @param formatId - Optional Champions format ID (e.g. "gen9championsvgc2026regma").
 *   When provided, Champions move-type overrides are applied (e.g. Snap Trap
 *   Normal→Steel, Growth Normal→Grass) so effectiveness reflects the actual
 *   in-format type rather than the vanilla type.
 *
 * If `defenderSpecies` is empty the function returns 1 (no information).
 */
export function getMoveEffectiveness(
  moveName: string,
  defenderSpecies: string,
  weather?: string | null,
  formatId?: string | null
): number {
  if (!moveName || !defenderSpecies) return 1;

  const moveData = getMoveData(moveName, formatId ?? undefined);
  if (!moveData) {
    warnUnknownMove(moveName);
    return 1;
  }

  // Status moves don't have type effectiveness
  if (moveData.category === "Status") return 1;

  // Determine the effective move type, accounting for weather-dependent moves.
  let moveType = moveData.type as PokemonType;

  // Weather Ball changes type based on the active weather.
  if (moveName === "Weather Ball") {
    moveType = getWeatherBallType(weather);
  }

  const defenderTypes = getSpeciesTypes(defenderSpecies);
  if (defenderTypes.length === 0) return 1;

  return getTypeEffectiveness(moveType, defenderTypes);
}
