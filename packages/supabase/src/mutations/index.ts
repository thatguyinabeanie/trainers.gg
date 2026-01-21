/**
 * Supabase Mutation Functions
 *
 * Write operations for data modifications.
 */

// User mutations
export {
  updateProfile,
  updateUsername,
  createProfile,
  ensureProfile,
} from "./users";

// Organization mutations
export {
  createOrganization,
  updateOrganization,
  inviteToOrganization,
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
  leaveOrganization,
  removeMember,
} from "./organizations";

// Tournament mutations
export {
  createTournament,
  updateTournament,
  registerForTournament,
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
} from "./tournaments";
