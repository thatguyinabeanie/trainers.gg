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
  getOwnedAlt,
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
  getAltByHandle,
  getUserMainAltId,
} from "./users";

// Community queries (renamed from organization)
export {
  listPublicCommunities,
  listFeaturedCommunities,
  listAllCommunitiesForSudo,
  listCommunities,
  getCommunityBySlug,
  getCommunityById,
  listMyCommunities,
  listMyOwnedCommunities,
  getCommunityWithTournamentStats,
  listCommunityTournaments,
  canManageCommunity,
  listCommunityStaff,
  hasCommunityAccess,
  getMyCommunityInvitations,
  getCommunityInvitations,
  // Staff management
  listCommunityStaffWithRoles,
  listCommunityGroups,
  searchUsersForInvite,
  hasCommunityPermission,
  // Dashboard stats, top players, activity feed
  getCommunityStats,
  getTopReturningPlayers,
  getCommunityActivity,
} from "./communities";

export type {
  StaffWithRole,
  CommunityGroup,
  CommunityWithCounts,
  CommunityStats,
  TopPlayer,
  CommunityActivityType,
  CommunityActivityItem,
} from "./communities";

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
  getAltsBulkStats,
  getTeamsForAlt,
  getLiveTournamentCommunityIds,
} from "./tournaments";

export type {
  TournamentWithOrg,
  GroupedTournaments,
  PlayerLifetimeStats,
  AltStats,
  AltTeam,
} from "./tournaments";
// CommunityWithCounts already exported above

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

// User preference queries
export { getUserPreferences } from "./user-preferences";

// Audit log queries
export {
  getTournamentAuditLog,
  getMatchAuditLog,
  getAuditLog,
  getAuditLogStats,
} from "./audit-log";
export type { AuditLogEntry } from "./audit-log";

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

// Admin community queries (renamed from organization)
export {
  listCommunitiesAdmin,
  getCommunityAdminDetails,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferCommunityOwnership,
} from "./admin-communities";

export type { ListOrganizationsAdminOptions } from "./admin-communities";

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
  getUsersByIds,
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
  hasCommunityFeatureAccess,
  getCommunityIdsWithFeatureAccess,
  hasTeamBuilderAccess,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} from "./feature-flags";

export type { FeatureFlag, AccessCheckResult } from "./feature-flags";

// Player directory queries
export {
  searchPlayers,
  attachCoachBadges,
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
export { getPlayerRating, getPlayerRatingsBulk } from "./ratings";
export type { PlayerRating } from "./ratings";

// Announcement queries
export {
  listAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./announcements";

// Tournament team sheets (OTS snapshots)
export {
  getTournamentTeamSheets,
  getTeamSheetByRegistration,
  getMatchTeamSheets,
  type TeamSheetPokemon,
  type PlayerTeamSheet,
} from "./tournament-team-sheets";

// Team builder queries
export {
  getTeamsForAltList,
  getTeamsForAltFull,
  getTeamWithPokemon,
  getTeamsForAltByFormatFull,
  getTeamsForUser,
  type TeamListItem,
  type TeamWithPokemon,
  type CrossAltTeamListItem,
} from "./teams";

// Coach queries
export {
  getCoachBadges,
  getCoachProfileByHandle,
  listCoaches,
} from "./coach";

export type { CoachBadgeInfo, CoachProfile } from "./coach";

// Discord bot queries
export {
  getDiscordServerById,
  getDiscordServerByGuildId,
  getDiscordServerByCommunityId,
  getDiscordServerByChannelId,
  listDiscordServers,
  getRoleMappingById,
  listChannelMappings,
  getChannelMappingsForEvent,
  listDmSettings,
  getDmSetting,
  listDmPreferences,
  getDmPreference,
  isDmEnabledForUser,
  listRoleMappings,
  getRoleMapping,
  getEnabledRoleMappings,
  listChannelFailures,
  getChannelFailureCount,
  getDeliveryFailure,
  // Reconcile-roles helpers
  listAllEnabledRoleMappingsWithServer,
  getDiscordIdsByUserIds,
  getCommunityStaffUserIds,
  getCommunityParticipantUserIds,
  getCommunityWinnerUserIds,
  getCommunityCurrentlyPlayingUserIds,
  getCommunityMemberUserIds,
  getUserByDiscordId,
  // Slash command helpers
  listActiveTournaments,
  listUpcomingTournaments,
  getTournamentByNameOrSlugInCommunity,
  listStandings,
  listCurrentPairings,
  listCommunityLeaderboard,
  getPlayerByUsername,
  getPlayerCommunityStats,
  getPublicTeamForCommunity,
  // Autocomplete helpers
  searchTournamentsInCommunity,
  searchUserActiveTournamentRegistrations,
  searchPlayersInCommunity,
  // Integration page composite queries
  getDiscordIntegrationOverview,
  listRecentFailures,
  getPublicDiscordHandle,
  type DiscordServer,
  type DiscordChannelMapping,
  type DiscordDmSetting,
  type DiscordUserDmPreference,
  type DiscordRoleMapping,
  type DiscordChannelFailure,
  type DiscordDeliveryFailure,
  type DiscordDmEventType,
  ALL_DM_EVENT_TYPES,
  ALL_CHANNEL_EVENT_TYPES,
  type DiscordChannelEventType,
  type DiscordRoleType,
  type EnabledRoleMappingWithServer,
  type DiscordTournamentRow,
  type DiscordStandingRow,
  type DiscordPairingRow,
  type DiscordLeaderboardRow,
  type DiscordIntegrationOverview,
  type ChannelFailureRow,
  type DmFailureRow,
  type RoleSyncFailureRow,
} from "./discord";

// Usage stats queries
export {
  getSpeciesUsageDetail,
  getSpeciesUsage,
  getFormatUsageTimeseries,
  getPipelineData,
} from "./usage";

export type {
  UsageDetailEntry,
  SpeciesUsagePeriod,
  SpeciesUsageDetailParams,
  FormatUsageRow,
  FormatUsageTimeseriesPoint,
  PipelineSpeciesData,
  PipelineDataResult,
  GetPipelineDataParams,
} from "./usage";
