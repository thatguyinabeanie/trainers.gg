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

// Community mutations (renamed from organization)
export {
  createCommunity,
  updateCommunity,
  inviteToCommunity,
  acceptCommunityInvitation,
  declineCommunityInvitation,
  leaveCommunity,
  removeStaff,
  // Staff group management
  addStaffMember,
  addStaffToGroup,
  removeStaffFromGroup,
  changeStaffRole,
  removeStaffCompletely,
} from "./communities";

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

// Community request mutations (renamed from organization)
export {
  submitCommunityRequest,
  grantCommunityRequest,
  rejectCommunityRequest,
} from "./organization-requests";

// Match game mutations
export {
  submitGameSelection,
  sendMatchMessage,
  sendSystemMessage,
  createMatchGames,
  judgeOverrideGame,
  judgeResetGame,
  resetMatch,
  confirmMatchCheckIn,
} from "./match-games";

// Notification mutations
export {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "./notifications";

// Notification preference mutations
export { upsertNotificationPreferences } from "./notification-preferences";

// User preference mutations
export { upsertUserPreferences } from "./user-preferences";

// Team builder mutations
export {
  createTeam,
  updateTeam,
  deleteTeam,
  forkTeam,
  addPokemonToTeam,
  updatePokemon,
  removePokemonFromTeam,
  reorderTeamPokemon,
} from "./teams";

// Coach mutations
export {
  grantCoachStatus,
  revokeCoachStatus,
  updateCoachProfile,
} from "./coach";

// Discord bot mutations
export {
  createDiscordServer,
  deleteDiscordServer,
  deleteDiscordServerByGuildId,
  upsertChannelMapping,
  deleteChannelMapping,
  upsertDmSetting,
  deleteDmSetting,
  setDmPreference,
  upsertRoleMapping,
  toggleRoleMapping,
  deleteRoleMapping,
  recordChannelFailure,
  resetChannelFailures,
  markChannelEmailSent,
  recordDeliveryFailure,
} from "./discord";

// Team slots mutations (fact-table pipeline — replaces the retired rollup layer)
export {
  compileEventTeamSlots,
  compileSourceTeamSlots,
  type TeamSlotSource,
} from "./team-slots";

// Import-runs observability log write path (shared by cron route + admin action)
export {
  recordImportRuns,
  deriveImportRunStatus,
  type ImportRunRecord,
  type ImportRunSource,
  type ImportRunTrigger,
  type ImportRunStatus,
} from "./import-runs";

// import-recovery.ts — pipeline recovery/admin mutations (delete/exclude/reset/
// requeue/force-import) + eventKeyFor. Pure DB; scraper-free so web can import.
export {
  eventKeyFor,
  deleteSourceEvent,
  excludeSourceEvent,
  clearExclusion,
  resetStuckEvents,
  requeueFailedEvents,
  forceImportEvent,
} from "./import-recovery";
