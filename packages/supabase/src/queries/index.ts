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
  getUserSpritePreference,
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
  getActiveMatch,
  getMyDashboardData,
  getCheckInStatus,
  getCheckInStats,
  getUserTeams,
  getMatchDetails,
  getMatchByRoundAndTable,
  getRegistrationStatus,
  getTournamentInvitationsSent,
  getTournamentInvitationsReceived,
  checkTournamentSlugAvailable,
  getTeamForRegistration,
  getTournamentMatchesForStaff,
  getUnpairedCheckedInPlayers,
  getUserTournamentHistory,
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
export {
  getTournamentAuditLog,
  getMatchAuditLog,
  getAuditLog,
  getAuditLogStats,
} from "./audit-log";

// Sudo mode queries
export {
  getActiveSudoSession,
  isSudoModeActive,
  getSudoSessions,
  startSudoSession,
  endSudoSession,
} from "./sudo-mode";

// Admin organization queries
export {
  listOrganizationsAdmin,
  getOrganizationAdminDetails,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferOrgOwnership,
} from "./admin-organizations";

export type { ListOrganizationsAdminOptions } from "./admin-organizations";

// Admin analytics queries
export {
  getPlatformOverview,
  getUserGrowthStats,
  getActiveUserStats,
  getTournamentStats,
  getOrganizationStats,
  getInviteConversionStats,
} from "./admin-analytics";

export type {
  PlatformOverview,
  UserGrowthEntry,
  ActiveUserStats,
  OrganizationStats,
  InviteConversionStats,
} from "./admin-analytics";

// Admin user management queries
export {
  listUsersAdmin,
  getUserAdminDetails,
  suspendUser,
  unsuspendUser,
  startImpersonation,
  endImpersonation,
} from "./admin-users";

export type { ListUsersAdminOptions } from "./admin-users";

// Feature flag queries
export {
  listFeatureFlags,
  getFeatureFlag,
  isFeatureEnabled,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} from "./feature-flags";

// Announcement queries
export {
  listAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./announcements";
