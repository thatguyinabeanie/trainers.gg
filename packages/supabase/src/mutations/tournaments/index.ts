// Shared helpers and types
export {
  getCurrentUser,
  getCurrentAlt,
  type TypedClient,
  type CutRule,
  type PhaseConfig,
} from "./helpers";

// Tournament CRUD
export {
  createTournament,
  updateTournament,
  archiveTournament,
  deleteTournament,
} from "./tournament-crud";

// Registration
export {
  registerForTournament,
  updateRegistrationPreferences,
  cancelRegistration,
  updateRegistrationStatus,
  checkIn,
  undoCheckIn,
  withdrawFromTournament,
  sendTournamentInvitations,
  respondToTournamentInvitation,
} from "./registration";

// Matches
export { startMatch, reportMatchResult } from "./matches";

// Rounds
export {
  generateRoundPairings,
  startRound,
  completeRound,
  createRound,
  deleteRoundAndMatches,
} from "./rounds";

// Standings
export { recalculateStandings, dropPlayer } from "./standings";

// Phases
export {
  updatePhase,
  createPhase,
  deletePhase,
  saveTournamentPhases,
} from "./phases";

// Teams
export {
  submitTeam,
  selectTeamForTournament,
  type SubmitTeamResult,
  type SelectTeamResult,
} from "./teams";

// Tournament flow
export {
  startTournamentEnhanced,
  advanceToTopCut,
  generateEliminationPairings,
  completeTournament,
} from "./tournament-flow";
