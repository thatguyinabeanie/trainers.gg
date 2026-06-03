import type { TypedClient } from "../client";
import { escapeLike } from "@trainers/utils";
import { getCoachBadges, type CoachBadgeInfo } from "./coach";

// ============================================================================
// Types
// ============================================================================

/** A player card entry for the directory grid */
export type PlayerDirectoryEntry = {
  userId: string;
  /**
   * Primary (first) alt id for this user. Used to resolve coach-badge
   * visibility via getCoachBadges — callers must run that lookup OUTSIDE any
   * unstable_cache (it is gated on the global coaching flag and per-user coach
   * status, neither of which busts the directory cache tag).
   */
  altId: number | null;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  tournamentCount: number;
  winRate: number;
  totalWins: number;
  totalLosses: number;
  /**
   * Coach-badge visibility for this entry's primary alt. Populated by the
   * caller after searchPlayers (never inside the cache). Privacy-safe: only
   * a boolean + the public canonical handle, never is_coach or user_id.
   */
  coachBadge?: CoachBadgeInfo;
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

/** Leaderboard entry (top players by ELO rating) */
export type LeaderboardEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  rating: number;
  skillBracket: "beginner" | "intermediate" | "advanced" | "expert";
  gamesPlayed: number;
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

/**
 * Max ids per PostgREST `.in()` filter. A directory with hundreds of users
 * builds an IN-list that overflows the server's URI length limit ("URI too
 * long"), which previously came back as a silently-ignored error — stripping
 * every alt/stat row. Splitting the list keeps each request's URI well under
 * the limit.
 */
const IN_QUERY_CHUNK_SIZE = 100;

// ============================================================================
// Helpers
// ============================================================================

/** Split an array into fixed-size chunks (the last chunk may be smaller). */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Run a PostgREST `.in()` query in URI-safe chunks and merge the rows. Throws
 * on the first chunk error so failures are visible — never silently returns a
 * partial/empty set (the bug this guards against stripped every altId and all
 * coach badges from the directory).
 */
async function fetchInChunks<Id extends string | number, Row>(
  ids: Id[],
  fetcher: (
    idChunk: Id[]
  ) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
): Promise<Row[]> {
  const rows: Row[] = [];
  for (const idChunk of chunk(ids, IN_QUERY_CHUNK_SIZE)) {
    const { data, error } = await fetcher(idChunk);
    if (error) throw new Error(`Chunked IN-query failed: ${error.message}`);
    if (data) rows.push(...data);
  }
  return rows;
}

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
    // First get tournament IDs for this format (server-side filter)
    const { data: formatTournaments } = await supabase
      .from("tournaments")
      .select("id")
      .ilike("format", format);

    const tournamentIds = (formatTournaments ?? []).map((t) => t.id);

    if (tournamentIds.length === 0) {
      return { players: [], totalCount: 0, page };
    }

    // Then get alt IDs that have stats in those tournaments
    const { data: formatStats } = await supabase
      .from("tournament_player_stats")
      .select("alt_id")
      .in("tournament_id", tournamentIds);

    const altIds = [...new Set((formatStats ?? []).map((s) => s.alt_id))];

    if (altIds.length === 0) {
      return { players: [], totalCount: 0, page };
    }

    // Resolve alt IDs to user IDs
    const { data: altUsers } = await supabase
      .from("alts")
      .select("user_id")
      .in("id", altIds);

    const resolvedUserIds = [
      ...new Set((altUsers ?? []).map((a) => a.user_id)),
    ];

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

  // Step 4: Get primary alt (avatar) for each user. Chunk the user_id IN-list
  // (see fetchInChunks) and order by is_public DESC, id ASC so the primary alt
  // picked per user is deterministic and prefers a PUBLIC alt — a private alt
  // must never represent a user in the public directory, and coach-badge
  // resolution only answers for public alts.
  const allUserIds = userList.map((u) => u.id);
  const altRows = await fetchInChunks(allUserIds, (idChunk) =>
    supabase
      .from("alts")
      .select("id, user_id, username, avatar_url")
      .in("user_id", idChunk)
      .order("is_public", { ascending: false })
      .order("id", { ascending: true })
  );

  // Map: userId -> first alt (primary)
  const altMap = new Map<
    string,
    { altId: number; username: string; avatarUrl: string | null }
  >();
  // Also collect all alt IDs for stats lookup
  const allAltIds: number[] = [];
  // Map: altId -> userId for reverse lookup
  const altToUser = new Map<number, string>();

  for (const alt of altRows) {
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
    // Same chunking rationale as the alts query above — allAltIds can hold
    // hundreds/thousands of ids across the whole directory.
    const stats = await fetchInChunks(allAltIds, (idChunk) =>
      supabase
        .from("tournament_player_stats")
        .select("alt_id, match_wins, match_losses, tournament_id")
        .in("alt_id", idChunk)
    );

    // Group by user (a user may have multiple alts, each in multiple tournaments)
    // Count unique tournaments per user
    const userTournaments = new Map<string, Set<number>>();

    for (const stat of stats) {
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
      altId: alt?.altId ?? null,
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
 * Get the top players by ELO rating for the leaderboard.
 * Only includes players who have played at least one rated match.
 */
export async function getLeaderboard(
  supabase: TypedClient,
  limit = 5
): Promise<LeaderboardEntry[]> {
  const { data: ratings, error } = await supabase
    .from("player_ratings")
    .select("alt_id, rating, skill_bracket, games_played")
    .eq("format", "overall")
    .gt("games_played", 0)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!ratings || ratings.length === 0) return [];

  // Resolve alt IDs to user info
  const altIds = ratings.map((r) => r.alt_id);
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

  return ratings
    .map((r) => {
      const altInfo = altInfoMap.get(r.alt_id);
      if (!altInfo) return null;
      return {
        userId: altInfo.userId,
        username: altInfo.username,
        avatarUrl: altInfo.avatarUrl,
        rating: Math.round(Number(r.rating)),
        skillBracket: r.skill_bracket as LeaderboardEntry["skillBracket"],
        gamesPlayed: r.games_played,
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

/**
 * Attach coach-badge visibility to a list of directory entries.
 *
 * MUST be called OUTSIDE any unstable_cache: getCoachBadges is gated on the
 * global coaching flag and per-user coach status, neither of which busts the
 * directory cache tag — caching the result would serve stale badges. The
 * underlying SQL function is privacy-safe (returns only a boolean + the public
 * canonical handle, never is_coach or user_id), so this is safe on any client.
 *
 * Returns a new array; entries with no primary alt id are passed through
 * unchanged. Resolution is account-level: the badge handle is the coach's
 * canonical (main-alt) username, and the badge only shows when that primary
 * alt is public and the account is a coach.
 */
export async function attachCoachBadges(
  supabase: TypedClient,
  entries: PlayerDirectoryEntry[]
): Promise<PlayerDirectoryEntry[]> {
  const altIds = entries
    .map((e) => e.altId)
    .filter((id): id is number => id != null);

  if (altIds.length === 0) return entries;

  const badges = await getCoachBadges(supabase, altIds);

  return entries.map((entry) => {
    const badge = entry.altId != null ? badges.get(entry.altId) : undefined;
    return badge ? { ...entry, coachBadge: badge } : entry;
  });
}
