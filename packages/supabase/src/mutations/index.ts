/**
 * Supabase Mutation Functions
 *
 * Write operations for data modifications.
 */

// User mutations
export {
  updateAlt,
  updateUsername,
  createAlt,
  ensureAlt,
  deleteAlt,
  setMainAlt,
} from "./users";

// Organization mutations
export {
  createOrganization,
  updateOrganization,
  inviteToOrganization,
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
  leaveOrganization,
  removeStaff,
  // Staff group management
  addStaffMember,
  addStaffToGroup,
  removeStaffFromGroup,
  changeStaffRole,
  removeStaffCompletely,
} from "./organizations";

// Tournament mutations
export {
  createTournament,
  updateTournament,
  registerForTournament,
  updateRegistrationPreferences,
  cancelRegistration,
  archiveTournament,
  updateRegistrationStatus,
  checkIn,
  undoCheckIn,
  startMatch,
  reportMatchResult,
  withdrawFromTournament,
  deleteTournament,
  sendTournamentInvitations,
  respondToTournamentInvitation,
  // Round management
  createRound,
  generateRoundPairings,
  startRound,
  completeRound,
  deleteRoundAndMatches,
  recalculateStandings,
  dropPlayer,
  // Phase management
  updatePhase,
  createPhase,
  deletePhase,
  saveTournamentPhases,
  // Team submission
  submitTeam,
  selectTeamForTournament,
  // Tournament flow
  startTournamentEnhanced,
  advanceToTopCut,
  generateEliminationPairings,
  completeTournament,
} from "./tournaments";

// Match game mutations
export {
  submitGameSelection,
  sendMatchMessage,
  sendSystemMessage,
  createMatchGames,
  judgeOverrideGame,
  judgeResetGame,
  resetMatch,
} from "./match-games";

// Notification mutations
export {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "./notifications";
