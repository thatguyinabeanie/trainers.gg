import type { TypedClient } from "../client";
import { escapeLike } from "@trainers/utils";

// ============================================================================
// Types
// ============================================================================

/** A player card entry for the directory grid */
export type PlayerDirectoryEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  tournamentCount: number;
  winRate: number;
  totalWins: number;
  totalLosses: number;
};

/** Paginated search result */
export type SearchPlayersResult = {
  players: PlayerDirectoryEntry[];
  totalCount: number;
  page: number;
};

/** Sort options for player search */
export type PlayerSortOption =
  | "tournaments"
  | "win_rate"
  | "newest"
  | "alphabetical";

/** Filter options for player search */
export type PlayerSearchFilters = {
  query?: string;
  country?: string;
  format?: string;
  sort?: PlayerSortOption;
};

/** Leaderboard entry (top players by win rate) */
export type LeaderboardEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  winRate: number;
  tournamentCount: number;
};

/** Recently active player entry */
export type RecentlyActivePlayer = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  lastActiveAt: string;
};

/** New member entry */
export type NewMemberEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
};

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 24;

// Minimum tournaments to qualify for the leaderboard
const LEADERBOARD_MIN_TOURNAMENTS = 5;

// ============================================================================
// Queries
// ============================================================================

/**
 * Search players with filters and pagination.
 *
 * Searches across users.username and alts.username using ILIKE.
 * Joins with tournament_player_stats for tournament count and win rate.
 * Supports filtering by country, format, and various sort options.
 */
export async function searchPlayers(
  supabase: TypedClient,
  filters: PlayerSearchFilters = {},
  page = 1
): Promise<SearchPlayersResult> {
  const { query, country, format, sort = "tournaments" } = filters;
  const offset = (page - 1) * PAGE_SIZE;

  // Step 1: Find matching user IDs via username search
  // We search both users.username and alts.username
  let userIds: string[] | null = null;

  if (query && query.trim().length > 0) {
    const escaped = escapeLike(query.trim());
    const pattern = `%${escaped}%`;

    // Search users.username
    const { data: userMatches } = await supabase
      .from("users")
      .select("id")
      .ilike("username", pattern);

    // Search alts.username and resolve to user_id
    const { data: altMatches } = await supabase
      .from("alts")
      .select("user_id")
      .ilike("username", pattern);

    const idSet = new Set<string>();
    for (const u of userMatches ?? []) {
      idSet.add(u.id);
    }
    for (const a of altMatches ?? []) {
      idSet.add(a.user_id);
    }

    userIds = Array.from(idSet);

    // If no matches found, return empty
    if (userIds.length === 0) {
      return { players: [], totalCount: 0, page };
    }
  }

  // Step 2: Build the main query for users with their primary alt
  // We need to get users with at least one alt (so they have a displayable username)
  let usersQuery = supabase
    .from("users")
    .select("id, username, country, created_at", { count: "exact" });

  // Apply search filter
  if (userIds) {
    usersQuery = usersQuery.in("id", userIds);
  }

  // Apply country filter
  if (country) {
    usersQuery = usersQuery.eq("country", country);
  }

  // We need username to be non-null for display
  usersQuery = usersQuery.not("username", "is", null);

  // Step 3: If filtering by format, get user IDs that have played that format
  if (format) {
    // Find alt IDs that have stats in tournaments with this format
    const { data: formatAlts } = await supabase
      .from("tournament_player_stats")
      .select(
        "alt_id, tournament:tournaments!tournament_player_stats_tournament_id_fkey(format)"
      );

    const formatUserIds = new Set<string>();
    for (const row of formatAlts ?? []) {
      const tournament = row.tournament as { format: string | null } | null;
      if (tournament?.format === format) {
        // We need to resolve alt_id to user_id
        // Collect alt IDs first, then batch resolve
        formatUserIds.add(String(row.alt_id));
      }
    }

    if (formatUserIds.size === 0) {
      return { players: [], totalCount: 0, page };
    }

    // Resolve alt IDs to user IDs
    const altIdNumbers = Array.from(formatUserIds).map(Number);
    const { data: altUsers } = await supabase
      .from("alts")
      .select("user_id")
      .in("id", altIdNumbers);

    const resolvedUserIds = (altUsers ?? []).map((a) => a.user_id);

    if (resolvedUserIds.length === 0) {
      return { players: [], totalCount: 0, page };
    }

    // Intersect with existing userIds filter if present
    if (userIds) {
      const intersection = resolvedUserIds.filter((id) =>
        userIds!.includes(id)
      );
      if (intersection.length === 0) {
        return { players: [], totalCount: 0, page };
      }
      usersQuery = usersQuery.in("id", intersection);
    } else {
      usersQuery = usersQuery.in("id", resolvedUserIds);
    }
  }

  // Apply sort and pagination
  switch (sort) {
    case "newest":
      usersQuery = usersQuery.order("created_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "alphabetical":
      usersQuery = usersQuery.order("username", { ascending: true });
      break;
    default:
      // For "tournaments" and "win_rate", we sort after enrichment
      usersQuery = usersQuery.order("created_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
  }

  // For sorts that need post-processing, fetch all matching users
  // For simple sorts, use DB pagination
  const needsPostSort = sort === "tournaments" || sort === "win_rate";

  if (!needsPostSort) {
    usersQuery = usersQuery.range(offset, offset + PAGE_SIZE - 1);
  }

  const { data: users, count, error } = await usersQuery;

  if (error) throw error;

  const userList = users ?? [];
  const totalCount = count ?? 0;

  if (userList.length === 0) {
    return { players: [], totalCount: 0, page };
  }

  // Step 4: Get primary alt (avatar) for each user
  const allUserIds = userList.map((u) => u.id);
  const { data: alts } = await supabase
    .from("alts")
    .select("id, user_id, username, avatar_url")
    .in("user_id", allUserIds);

  // Map: userId -> first alt (primary)
  const altMap = new Map<
    string,
    { altId: number; username: string; avatarUrl: string | null }
  >();
  // Also collect all alt IDs for stats lookup
  const allAltIds: number[] = [];
  // Map: altId -> userId for reverse lookup
  const altToUser = new Map<number, string>();

  for (const alt of alts ?? []) {
    if (!altMap.has(alt.user_id)) {
      altMap.set(alt.user_id, {
        altId: alt.id,
        username: alt.username,
        avatarUrl: alt.avatar_url,
      });
    }
    allAltIds.push(alt.id);
    altToUser.set(alt.id, alt.user_id);
  }

  // Step 5: Get tournament stats for all alts
  const statsPerUser = new Map<
    string,
    { tournamentCount: number; totalWins: number; totalLosses: number }
  >();

  if (allAltIds.length > 0) {
    const { data: stats } = await supabase
      .from("tournament_player_stats")
      .select("alt_id, match_wins, match_losses, tournament_id")
      .in("alt_id", allAltIds);

    // Group by user (a user may have multiple alts, each in multiple tournaments)
    // Count unique tournaments per user
    const userTournaments = new Map<string, Set<number>>();

    for (const stat of stats ?? []) {
      const userId = altToUser.get(stat.alt_id);
      if (!userId) continue;

      const current = statsPerUser.get(userId) ?? {
        tournamentCount: 0,
        totalWins: 0,
        totalLosses: 0,
      };

      current.totalWins += stat.match_wins ?? 0;
      current.totalLosses += stat.match_losses ?? 0;
      statsPerUser.set(userId, current);

      // Track unique tournaments
      const tourneySet = userTournaments.get(userId) ?? new Set<number>();
      tourneySet.add(stat.tournament_id);
      userTournaments.set(userId, tourneySet);
    }

    // Set tournament counts from unique sets
    for (const [userId, tourneySet] of userTournaments) {
      const current = statsPerUser.get(userId);
      if (current) {
        current.tournamentCount = tourneySet.size;
      }
    }
  }

  // Step 6: Build player entries
  let players: PlayerDirectoryEntry[] = userList.map((user) => {
    const alt = altMap.get(user.id);
    const stats = statsPerUser.get(user.id) ?? {
      tournamentCount: 0,
      totalWins: 0,
      totalLosses: 0,
    };
    const totalMatches = stats.totalWins + stats.totalLosses;
    const winRate =
      totalMatches > 0 ? (stats.totalWins / totalMatches) * 100 : 0;

    return {
      userId: user.id,
      username: alt?.username ?? user.username ?? "Unknown",
      avatarUrl: alt?.avatarUrl ?? null,
      country: user.country,
      tournamentCount: stats.tournamentCount,
      winRate: Math.round(winRate * 10) / 10,
      totalWins: stats.totalWins,
      totalLosses: stats.totalLosses,
    };
  });

  // Step 7: Post-sort if needed
  if (needsPostSort) {
    if (sort === "tournaments") {
      players.sort((a, b) => b.tournamentCount - a.tournamentCount);
    } else if (sort === "win_rate") {
      players.sort((a, b) => b.winRate - a.winRate);
    }

    // Apply pagination after sorting
    const paginatedPlayers = players.slice(offset, offset + PAGE_SIZE);
    return {
      players: paginatedPlayers,
      totalCount,
      page,
    };
  }

  return { players, totalCount, page };
}

/**
 * Get the top players by win rate for the leaderboard.
 * Only includes players with at least LEADERBOARD_MIN_TOURNAMENTS tournaments.
 */
export async function getLeaderboard(
  supabase: TypedClient,
  limit = 5
): Promise<LeaderboardEntry[]> {
  // Get all tournament_player_stats with alt info
  const { data: stats, error } = await supabase
    .from("tournament_player_stats")
    .select("alt_id, tournament_id, match_wins, match_losses");

  if (error) throw error;

  // Aggregate by alt_id
  const altStats = new Map<
    number,
    {
      tournaments: Set<number>;
      totalWins: number;
      totalLosses: number;
    }
  >();

  for (const row of stats ?? []) {
    const current = altStats.get(row.alt_id) ?? {
      tournaments: new Set<number>(),
      totalWins: 0,
      totalLosses: 0,
    };
    current.tournaments.add(row.tournament_id);
    current.totalWins += row.match_wins ?? 0;
    current.totalLosses += row.match_losses ?? 0;
    altStats.set(row.alt_id, current);
  }

  // Filter to alts with minimum tournaments and calculate win rate
  const qualifiedAlts: Array<{
    altId: number;
    tournamentCount: number;
    winRate: number;
  }> = [];

  for (const [altId, data] of altStats) {
    const tournamentCount = data.tournaments.size;
    if (tournamentCount < LEADERBOARD_MIN_TOURNAMENTS) continue;

    const totalMatches = data.totalWins + data.totalLosses;
    if (totalMatches === 0) continue;

    const winRate = (data.totalWins / totalMatches) * 100;
    qualifiedAlts.push({ altId, tournamentCount, winRate });
  }

  // Sort by win rate descending
  qualifiedAlts.sort((a, b) => b.winRate - a.winRate);

  // Take top N
  const topAlts = qualifiedAlts.slice(0, limit);

  if (topAlts.length === 0) return [];

  // Resolve alt IDs to user info
  const altIds = topAlts.map((a) => a.altId);
  const { data: alts } = await supabase
    .from("alts")
    .select("id, user_id, username, avatar_url")
    .in("id", altIds);

  const altInfoMap = new Map<
    number,
    { userId: string; username: string; avatarUrl: string | null }
  >();
  for (const alt of alts ?? []) {
    altInfoMap.set(alt.id, {
      userId: alt.user_id,
      username: alt.username,
      avatarUrl: alt.avatar_url,
    });
  }

  return topAlts
    .map((entry) => {
      const altInfo = altInfoMap.get(entry.altId);
      if (!altInfo) return null;
      return {
        userId: altInfo.userId,
        username: altInfo.username,
        avatarUrl: altInfo.avatarUrl,
        winRate: Math.round(entry.winRate * 10) / 10,
        tournamentCount: entry.tournamentCount,
      };
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);
}

/**
 * Get recently active players based on tournament registration activity.
 */
export async function getRecentlyActivePlayers(
  supabase: TypedClient,
  limit = 5
): Promise<RecentlyActivePlayer[]> {
  // Get the most recent tournament registrations
  const { data: regs, error } = await supabase
    .from("tournament_registrations")
    .select("alt_id, created_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) throw error;

  // Deduplicate by alt_id (keep most recent), then resolve to users
  const seenAlts = new Map<number, string>();
  for (const reg of regs ?? []) {
    if (!seenAlts.has(reg.alt_id)) {
      seenAlts.set(reg.alt_id, reg.created_at ?? new Date().toISOString());
    }
  }

  const altIds = Array.from(seenAlts.keys());
  if (altIds.length === 0) return [];

  const { data: alts } = await supabase
    .from("alts")
    .select("id, user_id, username, avatar_url")
    .in("id", altIds);

  // Deduplicate by user_id (a user could have multiple alts)
  const seenUsers = new Set<string>();
  const results: RecentlyActivePlayer[] = [];

  for (const alt of alts ?? []) {
    if (seenUsers.has(alt.user_id)) continue;
    seenUsers.add(alt.user_id);

    results.push({
      userId: alt.user_id,
      username: alt.username,
      avatarUrl: alt.avatar_url,
      lastActiveAt: seenAlts.get(alt.id) ?? new Date().toISOString(),
    });

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Get the most recently created user accounts.
 */
export async function getNewMembers(
  supabase: TypedClient,
  limit = 5
): Promise<NewMemberEntry[]> {
  // Get newest users that have a username (completed onboarding)
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, created_at")
    .not("username", "is", null)
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  if (!users || users.length === 0) return [];

  // Get avatars from alts
  const userIds = users.map((u) => u.id);
  const { data: alts } = await supabase
    .from("alts")
    .select("user_id, username, avatar_url")
    .in("user_id", userIds);

  const altMap = new Map<
    string,
    { username: string; avatarUrl: string | null }
  >();
  for (const alt of alts ?? []) {
    if (!altMap.has(alt.user_id)) {
      altMap.set(alt.user_id, {
        username: alt.username,
        avatarUrl: alt.avatar_url,
      });
    }
  }

  return users.map((user) => {
    const alt = altMap.get(user.id);
    return {
      userId: user.id,
      username: alt?.username ?? user.username ?? "Unknown",
      avatarUrl: alt?.avatarUrl ?? null,
      joinedAt: user.created_at ?? new Date().toISOString(),
    };
  });
}
