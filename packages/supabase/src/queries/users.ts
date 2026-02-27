import type { TypedClient } from "../client";
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
 * Get current authenticated user with alt
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

  const { data: alt } = await supabase
    .from("alts")
    .select("*")
    .eq("user_id", user.id)
    .single();

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
      user:users(*)
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
 * Get a player's public profile by alt username (handle).
 * Returns the alt record with joined user data, or null if not found.
 */
export async function getPlayerProfileByHandle(
  supabase: TypedClient,
  handle: string
) {
  const { data, error } = await supabase
    .from("alts")
    .select("*, user:users(id, username, country, did, pds_handle)")
    .eq("username", handle)
    .maybeSingle();

  if (error) return null;
  return data;
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
