/**
 * Supabase Query Functions
 *
 * Read-only query functions for data retrieval.
 */

// User queries
export {
  getUserCount,
  getCurrentUser,
  getUserById,
  getUserWithProfile,
  getProfileByUsername,
  getProfileByUserId,
  searchProfiles,
  getEmailByUsername,
} from "./users";

// Organization queries
export {
  listPublicOrganizations,
  listOrganizations,
  getOrganizationBySlug,
  getOrganizationById,
  listMyOrganizations,
  canManageOrganization,
  listOrganizationMembers,
  isOrganizationMember,
  getMyOrganizationInvitations,
  getOrganizationInvitations,
} from "./organizations";

// Tournament queries
export {
  listPublicTournaments,
  listTournaments,
  getTournamentByOrgAndSlug,
  getTournamentById,
  getTournamentRegistrations,
  isRegisteredForTournament,
  getTournamentPhases,
  getTournamentRounds,
  getRoundMatches,
  getTournamentStandings,
  getPlayerTournamentStats,
  getPlayerMatches,
  getMyDashboardData,
  getCheckInStatus,
  getCheckInStats,
  getUserTeams,
  getMatchDetails,
  getRegistrationStatus,
  getTournamentInvitationsSent,
  getTournamentInvitationsReceived,
} from "./tournaments";

// Permission queries
export { getUserPermissions, hasPermission } from "./permissions";
