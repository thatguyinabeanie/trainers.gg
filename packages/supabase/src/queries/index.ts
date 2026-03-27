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
  getPlayerProfileByHandle,
  getFollowerCount,
  getFollowingCount,
  getPlayerTournamentHistoryFull,
  getPlayerPublicTeams,
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
  getPlayerTournamentHistory,
  getPlayerLifetimeStats,
} from "./tournaments";

export type {
  TournamentWithOrg,
  GroupedTournaments,
  PlayerLifetimeStats,
} from "./tournaments";
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
export {
  getNotifications,
  getUnreadNotificationCount,
  getNotificationCount,
  getActiveMatchNotifications,
} from "./notifications";

// Notification preference queries
export { getNotificationPreferences } from "./notification-preferences";

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

// Organization request queries
export {
  getMyOrganizationRequest,
  listOrgRequestsAdmin,
  type ListOrgRequestsAdminOptions,
} from "./organization-requests";

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
} from "./admin-analytics";

export type {
  PlatformOverview,
  UserGrowthEntry,
  ActiveUserStats,
  OrganizationStats,
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

// Player directory queries
export {
  searchPlayers,
  getLeaderboard,
  getRecentlyActivePlayers,
  getNewMembers,
} from "./players";

export type {
  PlayerDirectoryEntry,
  SearchPlayersResult,
  PlayerSortOption,
  PlayerSearchFilters,
  LeaderboardEntry,
  RecentlyActivePlayer,
  NewMemberEntry,
} from "./players";

// Rating queries
export { getPlayerRating } from "./ratings";
export type { PlayerRating } from "./ratings";

// Announcement queries
export {
  listAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./announcements";
