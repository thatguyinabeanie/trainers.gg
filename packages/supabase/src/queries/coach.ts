import type { TypedClient } from "../client";

export interface CoachBadgeInfo {
  showCoachBadge: boolean;
  coachHandle: string | null;
}

/**
 * Resolve coach-badge visibility for a set of alt ids via the privacy-safe,
 * flag-aware SQL function. Returns only booleans + public handles — never is_coach
 * or user_id — so it is safe to call from client components.
 */
export async function getCoachBadges(
  supabase: TypedClient,
  altIds: number[]
): Promise<Map<number, CoachBadgeInfo>> {
  if (altIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_coach_badges", {
    p_alt_ids: altIds,
  });
  if (error) throw error;
  return new Map(
    (data ?? []).map((r) => [
      r.alt_id,
      { showCoachBadge: r.show_coach_badge, coachHandle: r.coach_handle },
    ])
  );
}

export interface CoachProfile {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  formats: string[];
  links: { label: string; url: string }[];
  serviceTypes: string[];
}

/**
 * Resolve a public handle (users.username or any public alt username) to its
 * account, and return the coach profile — but only if the account is a coach.
 */
export async function getCoachProfileByHandle(
  supabase: TypedClient,
  handle: string
): Promise<CoachProfile | null> {
  let userId: string | null = null;
  let userName: string | null = null;
  let userImage: string | null = null;
  // RLS audit #1: read the safe public_user_profiles view, not public.users.
  const { data: byUser, error: byUserError } = await supabase
    .from("public_user_profiles")
    .select("id, is_coach, main_alt_id, name, image")
    .eq("username", handle)
    .maybeSingle();

  if (byUserError) {
    throw new Error(
      `Failed to look up user by username "${handle}": ${byUserError.message}`
    );
  }

  let isCoach = byUser?.is_coach ?? false;
  let mainAltId = byUser?.main_alt_id ?? null;
  userId = byUser?.id ?? null;
  userName = byUser?.name ?? null;
  userImage = byUser?.image ?? null;

  if (!userId) {
    // RLS audit #1: the user embed on alts is no longer possible (public.users
    // SELECT is locked). Resolve the owning user_id from alts, then read the
    // user via the safe public_user_profiles view in a second step.
    const { data: alt, error: altError } = await supabase
      .from("alts")
      .select("user_id, is_public")
      .eq("username", handle)
      .eq("is_public", true)
      .maybeSingle();
    if (altError) {
      throw new Error(
        `Failed to look up alt by username "${handle}": ${altError.message}`
      );
    }
    if (alt?.user_id) {
      const { data: user, error: userViewError } = await supabase
        .from("public_user_profiles")
        .select("id, is_coach, main_alt_id, name, image")
        .eq("id", alt.user_id)
        .maybeSingle();
      if (userViewError) {
        throw new Error(
          `Failed to load user (id=${alt.user_id}) for alt "${handle}": ${userViewError.message}`
        );
      }
      if (user) {
        // public_user_profiles columns are nullable in generated types.
        userId = user.id;
        isCoach = user.is_coach ?? false;
        mainAltId = user.main_alt_id;
        userName = user.name ?? null;
        userImage = user.image ?? null;
      }
    }
  }

  if (!userId || !isCoach) return null;

  let canonicalHandle = handle;
  let mainAltAvatarUrl: string | null = null;
  if (mainAltId) {
    const { data: mainAlt, error: mainAltError } = await supabase
      .from("alts")
      .select("username, avatar_url")
      .eq("id", mainAltId)
      .maybeSingle();
    if (mainAltError) {
      throw new Error(
        `Failed to look up main alt (id=${mainAltId}) for user "${handle}": ${mainAltError.message}`
      );
    }
    if (mainAlt?.username) canonicalHandle = mainAlt.username;
    mainAltAvatarUrl = mainAlt?.avatar_url ?? null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("coach_profiles")
    .select("headline, bio, formats, links, service_types")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Failed to load coach profile for user "${userId}": ${profileError.message}`
    );
  }

  return {
    userId,
    handle: canonicalHandle,
    displayName: userName ?? canonicalHandle,
    avatarUrl: mainAltAvatarUrl ?? userImage ?? null,
    headline: profile?.headline ?? null,
    bio: profile?.bio ?? null,
    formats: profile?.formats ?? [],
    links:
      (profile?.links as { label: string; url: string }[] | null) ?? [],
    serviceTypes: profile?.service_types ?? [],
  };
}

/** Admin: list current coaches (accounts with is_coach = true). */
export async function listCoaches(supabase: TypedClient) {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, name, image, is_coach, main_alt_id")
    .eq("is_coach", true)
    .order("username", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
