/**
 * @trainers/tournaments
 *
 * Shared tournament logic for trainers.gg.
 * Used by web, mobile, and edge functions.
 *
 * Types and adapters are also available via subpath exports:
 *   - @trainers/tournaments/types
 *   - @trainers/tournaments/adapters
 */

// Types (canonical source for shared tournament types)
export type {
  PhaseType,
  PhaseStatus,
  CutRule,
  PhaseConfig,
  TournamentPreset,
  BattlePlatform,
  BattleFormat,
  RegistrationType,
  TournamentFormData,
  TournamentMatch,
  TournamentRound,
  TournamentPhase,
  SelectedPlayer,
} from "./types";

// Standings
export {
  type PlayerStanding,
  type MatchResult,
  type Player,
  calculateMatchWinPercentage,
  calculateGameWinPercentage,
  calculateOpponentMatchWinPercentage,
  calculateOpponentGameWinPercentage,
  calculateStandings,
} from "./standings";

// Swiss pairing
export {
  type PlayerRecord,
  type SwissPairing,
  type SwissPairingResult,
  generateSwissPairings,
  // These are re-exported with qualified names to avoid collision with standings
  calculateGameWinPercentage as swissCalculateGameWinPercentage,
  calculateMatchWinPercentage as swissCalculateMatchWinPercentage,
  hasXMinus2Record,
  calculateResistance,
} from "./swiss-pairing";

// Top cut bracket
export {
  type BracketPlayer,
  type BracketSettings,
  type BracketMatch,
  type BracketStructure,
  isValidBracketSize,
  calculateBracketRounds,
  getBracketMatchups,
  generateTopCutBracket,
  advanceBracket,
  isBracketComplete,
  getBracketWinner,
} from "./top-cut-bracket";

// Drop and bye handling
export {
  type TournamentPlayerWithStatus,
  type DropRequest,
  type ByeRecord,
  type DropResult,
  type ByeResult,
  type DropHandlingResult,
  type ProcessDropsResult,
  // Re-exported with qualified name to avoid collision with types.ts
  type TournamentPhase as DropByeTournamentPhase,
  canPlayerDrop,
  dropPlayer,
  findByeCandidate,
  assignBye,
  handlePlayerDrop,
  processDropsForRound,
  getActivePlayerCount,
  hasMinimumPlayers,
  getPlayersWithByes,
  getPlayersWithoutByes,
  calculateTotalMatchPoints,
  validateDropTiming,
} from "./drop-bye-handling";

// Tournament flow
export {
  type TournamentSettings,
  // Re-exported with qualified name to avoid collision with types.ts
  type TournamentMatch as FlowTournamentMatch,
  type TournamentPlayer,
  type TournamentDrop,
  type TournamentState,
  type RoundResult,
  canStartNextRound,
  canAdvanceToTopCut,
  getNextRoundNumber,
  calculateRequiredRounds,
  isTournamentComplete,
  hasSufficientParticipants,
  getActivePlayersCount,
} from "./tournament-flow";

// Validation
export {
  type TournamentValidationSettings,
  type TournamentTimingData,
  type MatchResultData,
  type ValidationResult,
  type TournamentStartCheck,
  type RoundStartData,
  validateTournamentSettings,
  validateTournamentTiming,
  validateRoundStart,
  validateMatchResult,
  canStartTournament,
  calculateSwissRounds,
  estimateTournamentDuration,
  canAdvanceRound,
  calculateOptimalTournamentSettings,
  validateTournamentIntegrity,
} from "./validation";

// Adapters
export {
  type DBPhase,
  type DBPhaseUpdate,
  dbPhasesToPhaseConfigs,
  phaseConfigToDbUpdate,
  phaseConfigsToDbUpdates,
  createDefaultSwissPhase,
  createDefaultEliminationPhase,
  getDefaultPhaseName,
  getDefaultRoundTime,
} from "./adapters";

// Schedule calculation
export {
  type RoundSchedule,
  type PhaseSchedule,
  type TournamentSchedule,
  type TournamentScheduleData,
  calculateRequiredSwissRounds,
  calculateTopCutRounds,
  getTopCutRoundName,
  calculateRoundETA,
  getTournamentSchedule,
  formatRoundTime,
  formatStartDateTime,
} from "./schedule";
