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
  getAltsByUserId,
  getCurrentUserAlts,
} from "./users";

// Organization queries
export {
  listPublicOrganizations,
  listOrganizations,
  getOrganizationBySlug,
  getOrganizationById,
  listMyOrganizations,
  listMyOwnedOrganizations,
  getOrganizationWithTournamentStats,
  listOrganizationTournaments,
  canManageOrganization,
  listOrganizationStaff,
  hasOrganizationAccess,
  getMyOrganizationInvitations,
  getOrganizationInvitations,
} from "./organizations";

// Tournament queries
export {
  listPublicTournaments,
  listTournamentsGrouped,
  listTournaments,
  getTournamentBySlug,
  getTournamentByOrgAndSlug,
  getTournamentById,
  getTournamentRegistrations,
  isRegisteredForTournament,
  getCurrentUserRegisteredTournamentIds,
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

export type { TournamentWithOrg, GroupedTournaments } from "./tournaments";
export type { OrganizationWithCounts } from "./organizations";

// Permission queries
export { getUserPermissions, hasPermission } from "./permissions";

// Site role queries
export {
  isSiteAdmin,
  getSiteRoles,
  getSiteAdmins,
  getUserSiteRoles,
  grantSiteRole,
  revokeSiteRole,
} from "./site-roles";
