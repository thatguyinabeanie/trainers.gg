/**
 * @trainers/pokemon
 *
 * Shared Pokemon utilities for trainers.gg.
 * Used by web, mobile, and edge functions.
 *
 * Sprites are available via a separate entry point:
 *   import { getPokemonSprite } from "@trainers/pokemon/sprites"
 *
 * Types are available via a separate entry point:
 *   import type { PokemonSet } from "@trainers/pokemon/types"
 */

// Types and conversion utilities
export {
  type PokemonCore,
  type PokemonStats,
  type PokemonMoves,
  type PokemonSet,
  type PokemonSetFlat,
  type TeamPokemonSlot,
  type PokemonSetWithMeta,
  type TeamComposition,
  fromFlat,
  toFlat,
  toShowdownFormat,
  createDefault,
  createDefaultEvs,
  createDefaultIvs,
  createDefaultMoves,
} from "./types";

// Format rules and validation
export {
  type FormatRule,
  type ValidationResult,
  FORMAT_RULES,
  validateTeamForFormat,
  getFormatDescription,
} from "./format-rules";

// Stats calculator
export {
  type BaseStats,
  type NatureEffect,
  NATURE_EFFECTS,
  POKEMON_BASE_STATS,
  calculateHP,
  calculateStat,
  getNatureMultiplier,
  calculateStats,
  getStatStageMultiplier,
  formatStats,
  getStatColor,
  calculateBulk,
} from "./stats-calculator";

// Type effectiveness
export {
  type PokemonType,
  ALL_TYPES,
  POKEMON_TYPES,
  getTypeEffectiveness,
  getDefensiveMatchups,
  calculateTeamCoverage,
  calculateTeamSynergy,
  getTypeColor,
  getEffectivenessDisplay,
} from "./type-effectiveness";

// Showdown parser (legacy parser)
export {
  type ShowdownParseResult,
  parseShowdownTeam,
  exportToShowdownFormat,
} from "./showdown-parser";

// Showdown format (advanced parser/exporter)
export {
  type ShowdownPokemon,
  parsePokemon,
  parseTeam,
  exportPokemonToShowdown,
  exportPokemonSetToShowdown,
  exportTeamToShowdown,
  exportTeamSetToShowdown,
  convertShowdownToPokemonSet,
  convertShowdownToDbFormat,
  convertShowdownTeamToPokemonSets,
  convertShowdownTeamToDbFormat,
} from "./showdown-format";

// Pokemon validation (using @pkmn/dex)
export {
  type PokemonValidationError,
  type PokemonValidationResult,
  validatePokemon,
  getValidAbilities,
  getValidTeraTypes,
  getValidNatures,
  isValidSpecies,
  isValidMove,
  getLearnableMoves,
  getAllSpeciesNames,
} from "./validation";

// Team validator (using @pkmn/sim)
export {
  type FormatId,
  type TeamValidationError,
  type TeamValidationResult,
  SUPPORTED_FORMATS,
  AdvancedTeamValidator,
} from "./team-validator";
