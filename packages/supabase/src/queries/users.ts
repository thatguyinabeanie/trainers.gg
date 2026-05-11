import type { TypedClient } from "../client";
import type { Tables } from "../types";
import { escapeLike } from "@trainers/utils";

/**
 * Get count of all users (for seeding check)
 */
export async function getUserCount(supabase: TypedClient) {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

/**
 * Get current authenticated user with their main alt.
 *
 * Users can have multiple alts; we resolve the "main" one via
 * `users.main_alt_id`. If that points to a missing row (deleted alt) or is
 * null (brand-new account), we fall back to the user's oldest alt by
 * `created_at`. Returns `null` on any database error so callers can treat
 * "user unavailable" uniformly with "not signed in" — matches the rest of
 * this file (`getUserById`, `getUserSpritePreference`, etc.).
 */
export async function getCurrentUser(supabase: TypedClient) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (userError || !user) return null;

  let alt: Tables<"alts"> | null = null;
  if (user.main_alt_id != null) {
    // Constrain by `user_id` as well: the `alts` table is publicly readable
    // (RLS USING (true)), so a corrupted/malicious `main_alt_id` pointing at
    // another user's alt would otherwise be returned here as the current
    // user's main. The extra `.eq` makes the lookup return null in that case
    // and trigger the fallback path below.
    const { data, error } = await supabase
      .from("alts")
      .select("*")
      .eq("id", user.main_alt_id)
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (error) {
      console.error("[getCurrentUser] main_alt_id lookup failed", {
        userId: authUser.id,
        mainAltId: user.main_alt_id,
        error,
      });
      return null;
    }
    alt = data;
  }

  // Fallback to the oldest alt when main_alt_id is null OR the referenced row
  // is missing (e.g., the alt was deleted but main_alt_id wasn't cleared).
  if (!alt) {
    const { data, error } = await supabase
      .from("alts")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[getCurrentUser] fallback alt lookup failed", {
        userId: authUser.id,
        error,
      });
      return null;
    }
    alt = data;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    spritePreference: user.sprite_preference ?? "gen5",
    alt: alt
      ? {
          id: alt.id,
          displayName: alt.username,
          username: alt.username,
          bio: alt.bio,
          avatarUrl: alt.avatar_url,
        }
      : null,
  };
}

/**
 * Get user's sprite preference
 */
export async function getUserSpritePreference(
  supabase: TypedClient,
  userId?: string
) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const targetUserId = userId ?? authUser?.id;
  if (!targetUserId) return "gen5";

  const { data, error } = await supabase
    .from("users")
    .select("sprite_preference")
    .eq("id", targetUserId)
    .single();

  if (error || !data) return "gen5";
  return (data.sprite_preference ?? "gen5") as "gen5" | "gen5ani" | "ani";
}

/**
 * Get user by ID
 */
export async function getUserById(supabase: TypedClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get user with alt by ID
 */
export async function getUserWithAlt(supabase: TypedClient, userId: string) {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !user) return null;

  const { data: alt } = await supabase
    .from("alts")
    .select("*")
    .eq("user_id", userId)
    .single();

  return { ...user, alt };
}

/**
 * Get alt by username
 */
export async function getAltByUsername(
  supabase: TypedClient,
  username: string
) {
  const { data, error } = await supabase
    .from("alts")
    .select(
      `
      *,
      user:users!profiles_user_id_fkey(*)
    `
    )
    .eq("username", username)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get alt by user ID (returns first alt only)
 * @deprecated Use getAltsByUserId for users with multiple alts
 */
export async function getAltByUserId(supabase: TypedClient, userId: string) {
  const { data, error } = await supabase
    .from("alts")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

/**
 * Get all alts for a user
 */
export async function getAltsByUserId(supabase: TypedClient, userId: string) {
  const { data, error } = await supabase
    .from("alts")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: true });

  if (error) return [];
  return data ?? [];
}

/**
 * Get current user's alts (for authenticated user)
 */
export async function getCurrentUserAlts(supabase: TypedClient) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return [];

  return getAltsByUserId(supabase, authUser.id);
}

/**
 * Fetch an alt with its owner's username, throwing if not found or not owned by userId.
 * Username is included so callers can invalidate player profile caches after mutations.
 */
export async function getOwnedAlt(
  supabase: TypedClient,
  altId: number,
  userId: string
) {
  const { data: alt, error } = await supabase
    .from("alts")
    .select("user_id, users!profiles_user_id_fkey!inner(username)")
    .eq("id", altId)
    .single();

  if (error) throw new Error(`Failed to fetch alt: ${error.message}`);
  if (!alt) throw new Error("Alt not found");
  if (alt.user_id !== userId) {
    throw new Error("You can only update your own alt");
  }
  return alt;
}

/**
 * Search alts by username or display name
 */
export async function searchAlts(
  supabase: TypedClient,
  query: string,
  limit = 10
) {
  const escapedQuery = escapeLike(query);
  const { data, error } = await supabase
    .from("alts")
    .select("*")
    .ilike("username", `%${escapedQuery}%`)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get a player's public profile by username (handle).
 * Resolves to a user with all their alts — one profile per user, not per alt.
 * Checks users.username first, then falls back to alts.username.
 * Returns user record with all alts, or null if not found.
 */
export async function getPlayerProfileByHandle(
  supabase: TypedClient,
  handle: string
) {
  // Try users.username first (exact match)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, username, country, did, pds_handle, main_alt_id, created_at")
    .eq("username", handle)
    .maybeSingle();

  if (userError) return null;

  let userId: string | null = user?.id ?? null;
  let resolvedViaAlt: { id: number; is_public: boolean } | null = null;

  // Fallback: check alts.username and resolve to user
  if (!userId) {
    const { data: alt, error: altError } = await supabase
      .from("alts")
      .select("user_id, id, is_public")
      .eq("username", handle)
      .maybeSingle();

    if (altError || !alt) return null;
    userId = alt.user_id;
    resolvedViaAlt = { id: alt.id, is_public: alt.is_public };
  }

  // If resolved via a private alt, don't expose the parent profile
  if (resolvedViaAlt && !resolvedViaAlt.is_public) {
    return {
      type: "private-alt" as const,
      altUsername: handle,
    };
  }

  // Fetch all alts for this user (include is_public for profile visibility)
  const { data: alts, error: altsError } = await supabase
    .from("alts")
    .select("id, username, bio, avatar_url, tier, tier_expires_at, is_public")
    .eq("user_id", userId)
    .order("id", { ascending: true });

  if (altsError) return null;

  // Re-fetch user if we only had it from alt lookup
  const userData =
    user ??
    (await (async () => {
      const { data } = await supabase
        .from("users")
        .select(
          "id, username, country, did, pds_handle, main_alt_id, created_at"
        )
        .eq("id", userId!)
        .maybeSingle();
      return data;
    })());

  if (!userData) return null;

  // Find the main alt (or first alt as fallback)
  const mainAlt =
    alts?.find((a) => a.id === userData.main_alt_id) ?? alts?.[0] ?? null;

  return {
    type: "profile" as const,
    userId: userData.id,
    username: userData.username,
    country: userData.country,
    did: userData.did,
    pdsHandle: userData.pds_handle,
    createdAt: userData.created_at,
    mainAlt,
    alts: alts ?? [],
    altIds: (alts ?? []).map((a) => a.id),
    /** The alt that was used to resolve this profile (null if resolved via user username) */
    resolvedViaAlt,
  };
}

/**
 * Get user email by username (checks both users.username and alts.username)
 * Used for login with username support
 */
export async function getEmailByUsername(
  supabase: TypedClient,
  username: string
): Promise<string | null> {
  const escaped = escapeLike(username);

  // First try users.username (case-insensitive match)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("email")
    .ilike("username", escaped)
    .maybeSingle();

  if (userError) {
    console.error("Error looking up email by username in users:", userError);
    return null;
  }

  if (user?.email) return user.email;

  // Fallback: check alts.username and join to users (case-insensitive)
  const { data: alt, error: altError } = await supabase
    .from("alts")
    .select("user:users(email)")
    .ilike("username", escaped)
    .maybeSingle();

  if (altError) {
    console.error("Error looking up email by username in alts:", altError);
    return null;
  }

  // Type assertion since we know the structure
  const altUser = alt?.user as { email: string | null } | null;
  return altUser?.email ?? null;
}

/**
 * Get the number of followers for a user.
 * Counts rows where following_user_id = userId (people following this user).
 */
export async function getFollowerCount(
  supabase: TypedClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_user_id", userId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Get the number of users this user is following.
 * Counts rows where follower_user_id = userId (people this user follows).
 */
export async function getFollowingCount(
  supabase: TypedClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_user_id", userId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Full paginated tournament history for a player's alts.
 * Supports filtering by format, year, and status.
 * Returns all tournaments (not just completed) with pagination.
 */
export async function getPlayerTournamentHistoryFull(
  supabase: TypedClient,
  altIds: number[],
  filters?: {
    format?: string;
    year?: number;
    status?: string;
  },
  page = 1,
  pageSize = 20
) {
  if (altIds.length === 0) return { data: [], totalCount: 0, page };

  // Query tournament_player_stats — only tournaments where the player actually played
  let query = supabase
    .from("tournament_player_stats")
    .select(
      `
      id,
      alt_id,
      match_wins,
      match_losses,
      final_ranking,
      created_at,
      tournament:tournaments!tournament_player_stats_tournament_id_fkey (
        id,
        name,
        slug,
        start_date,
        status,
        format,
        organization:communities!tournaments_community_id_fkey (
          id,
          name,
          slug
        )
      )
    `,
      { count: "exact" }
    )
    .in("alt_id", altIds)
    .order("created_at", { ascending: false });

  // Apply filters on the nested tournament relation
  if (filters?.format) {
    query = query.eq("tournament.format" as string, filters.format);
  }
  if (filters?.status) {
    query = query.eq("tournament.status" as string, filters.status);
  }
  if (filters?.year) {
    const yearStart = `${filters.year}-01-01`;
    const yearEnd = `${filters.year}-12-31`;
    query = query.gte("tournament.start_date" as string, yearStart);
    query = query.lte("tournament.start_date" as string, yearEnd);
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: stats, error, count } = await query;

  if (error) throw error;
  if (!stats) return { data: [], totalCount: 0, page };

  // Transform results — stats already contain wins/losses/placement
  const results = stats
    .map((s) => {
      const t = s.tournament as {
        id: number;
        name: string;
        slug: string;
        start_date: string | null;
        status: string;
        format: string | null;
        organization: { id: number; name: string; slug: string } | null;
      } | null;

      if (!t) return null;

      return {
        id: s.id,
        altId: s.alt_id,
        tournamentId: t.id,
        tournamentName: t.name,
        tournamentSlug: t.slug,
        startDate: t.start_date,
        status: t.status,
        format: t.format,
        organizationName: t.organization?.name ?? null,
        organizationSlug: t.organization?.slug ?? null,
        placement: s.final_ranking ?? null,
        wins: s.match_wins ?? 0,
        losses: s.match_losses ?? 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return { data: results, totalCount: count ?? 0, page };
}

/**
 * Get public team sheets from completed tournaments for a player's alts.
 * Returns team data parsed from tournament registrations that have team submissions.
 */
export async function getPlayerPublicTeams(
  supabase: TypedClient,
  altIds: number[]
) {
  if (altIds.length === 0) return [];

  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      id,
      alt_id,
      team_id,
      registered_at,
      tournament:tournaments!tournament_registrations_tournament_id_fkey (
        id,
        name,
        slug,
        start_date,
        status,
        format
      ),
      team:teams!tournament_registrations_team_fk (
        id,
        pokemon_data,
        pokepaste_url
      )
    `
    )
    .in("alt_id", altIds)
    .not("team_id", "is", null)
    .order("registered_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  // Only return teams from completed tournaments
  return data
    .filter((r) => {
      const t = r.tournament as { status: string } | null;
      return t?.status === "completed";
    })
    .map((r) => {
      const t = r.tournament as {
        id: number;
        name: string;
        slug: string;
        start_date: string | null;
        format: string | null;
      };
      const team = r.team as {
        id: number;
        pokemon_data: unknown;
        pokepaste_url: string | null;
      } | null;

      return {
        registrationId: r.id,
        tournamentName: t.name,
        tournamentSlug: t.slug,
        startDate: t.start_date,
        format: t.format,
        teamId: team?.id ?? null,
        pokemonData: team?.pokemon_data ?? null,
        pokepasteUrl: team?.pokepaste_url ?? null,
      };
    });
}

// ============================================================================
// Standalone alt lookup (for /alts/[handle] — private alt pages)
// ============================================================================

/**
 * Fetch an alt by its username without exposing parent user info.
 * Returns basic alt data for the standalone alt page.
 */
export async function getAltByHandle(supabase: TypedClient, handle: string) {
  const { data: alt, error } = await supabase
    .from("alts")
    .select("id, username, bio, avatar_url, tier, tier_expires_at, is_public")
    .eq("username", handle)
    .maybeSingle();

  if (error || !alt) return null;
  return alt;
}
