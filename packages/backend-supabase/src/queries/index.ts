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
} from "./users";

// Organization queries
export {
  listOrganizations,
  getOrganizationBySlug,
  getOrganizationById,
  listMyOrganizations,
  canManageOrganization,
  listOrganizationMembers,
  isOrganizationMember,
} from "./organizations";

// Tournament queries
export {
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
} from "./tournaments";
