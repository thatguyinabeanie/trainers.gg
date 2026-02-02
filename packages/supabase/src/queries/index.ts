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
  getUserWithAlt,
  getAltByUsername,
  getAltByUserId,
  searchAlts,
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
  // Staff management
  listOrganizationStaffWithRoles,
  listOrganizationGroups,
  searchUsersForInvite,
  hasOrgPermission,
} from "./organizations";

export type { StaffWithRole, OrganizationGroup } from "./organizations";

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
  getUserRegistrationDetails,
  getTournamentPhases,
  getTournamentRounds,
  getRoundMatches,
  getTournamentStandings,
  getPlayerTournamentStats,
  getTournamentPlayerStats,
  getPhaseRoundsWithStats,
  getPhaseRoundsWithMatches,
  getRoundMatchesWithStats,
  getPlayerMatches,
  getMyDashboardData,
  getCheckInStatus,
  getCheckInStats,
  getUserTeams,
  getMatchDetails,
  getRegistrationStatus,
  getTournamentInvitationsSent,
  getTournamentInvitationsReceived,
  checkTournamentSlugAvailable,
  getTeamForRegistration,
  getTournamentMatchesForStaff,
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

// Match game queries
export {
  getMatchGames,
  getMatchGamesForPlayer,
  getMatchMessages,
  getMatchGame,
} from "./match-games";

// Notification queries
export { getNotifications, getUnreadNotificationCount } from "./notifications";

// Audit log queries
export { getTournamentAuditLog, getMatchAuditLog } from "./audit-log";
