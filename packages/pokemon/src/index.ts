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
  MAX_TEAM_SIZE,
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
  getBaseStats,
  calculateHP,
  calculateStat,
  calculateChampionsHP,
  calculateChampionsStat,
  getNatureMultiplier,
  calculateStats,
  getStatStageMultiplier,
  formatStats,
  calculateBulk,
} from "./stats-calculator";

// Type effectiveness
export {
  type PokemonType,
  ALL_TYPES,
  POKEMON_TYPES,
  getSpeciesTypes,
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
  type ShowdownStats,
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

// Format legality
export {
  getCanonicalBaseSpecies,
  getFormsForSpecies,
  getLegalAbilities,
  getLegalItems,
  getLegalMoves,
  getLegalSpecies,
  getLegalTeraTypes,
  getMegaAbilityForSpecies,
  getMegaStoneForSpecies,
  isLegalAbility,
  isLegalItem,
  isLegalMove,
  isLegalSpecies,
  isLegalTeraType,
  speciesHasForms,
} from "./format-legality";

// Competitive format registry (Showdown format IDs + display metadata)
export {
  type GameFormat,
  type PokemonGame,
  POKEMON_GAMES,
  VGC_FORMATS,
  ALL_FORMAT_IDS,
  SIM_UNSUPPORTED_FORMAT_IDS,
  DEFAULT_FORMAT_ID,
  buildVgcShowdownNameMap,
  getFormatById,
  getFormatLabel,
  getFormatsByGame,
  getActiveFormats,
  getAvailableGames,
  formatHasTera,
  isChampionsFormat,
  isChampionsFormatId,
} from "./formats";

// Featured Pokemon for avatar picker
export { FEATURED_POKEMON } from "./featured-pokemon";

// Canonical stat keys, ordered array, display labels, and stat-investment caps
export type { StatKey } from "./stat-keys";
export {
  STAT_KEYS,
  STAT_LABELS,
  EV_PER_STAT_MAX,
  EV_TOTAL_MAX,
  EV_STEP,
  SP_PER_STAT_MAX,
  SP_TOTAL_MAX,
  SP_STEP,
} from "./stat-keys";

// Stat breakpoint calculator
export { findStatBreakpoints, type FindStatBreakpointsArgs } from "./nature-bumps";

// Speed tier benchmarks and comparison
export {
  type SpeedBenchmark,
  getFormatSpeedBenchmarks,
  compareSpeedTier,
} from "./speed-tiers";

// Species search index and filtering
export {
  type SpeciesSearchEntry,
  buildSpeciesSearchIndex,
  searchSpecies,
} from "./species-search";

// Move data utilities
export {
  type MoveCategory,
  type MoveData,
  getMoveType,
  getMoveCategory,
  getMoveBP,
  getMoveData,
  getMoveHelperInput,
} from "./move-data";

// Item data utilities
export { getAllItems, getItemShortDesc } from "./items";

// Ability data utilities
export { getAbilityShortDesc } from "./abilities";

// Stat-tier bucketing for color-coded base stats
export { type StatTier, getStatTier } from "./stat-tiers";

// Plain-English helper text for moves (team builder editor)
export {
  type MoveHelperInput,
  type BoostsTable,
  type StatusName,
  getMoveHelperText,
} from "./move-helpers";

// Battle-time speed modifier helpers (stage / item / status / weather / tailwind)
export {
  type SpeedModifiers,
  type SpeedTierLabel,
  type SpeedAffectingItem,
  applySpeedModifiers,
  getSpeedTierLabel,
  groupBySpeed,
  getSpeedAffectingItems,
} from "./speed-helpers";

// Curated meta-relevant speed tier datasets (per format)
export {
  type MetaSpeedEntry,
  type SpeedAbility,
  getMetaSpeedTiers,
} from "./meta-speed-tiers";
