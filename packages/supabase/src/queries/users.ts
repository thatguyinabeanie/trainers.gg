import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

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
    alt: alt
      ? {
          id: alt.id,
          displayName: alt.display_name,
          username: alt.username,
          bio: alt.bio,
          avatarUrl: alt.avatar_url,
        }
      : null,
  };
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
 * Get alt by user ID
 */
export async function getAltByUserId(supabase: TypedClient, userId: string) {
  const { data, error } = await supabase
    .from("alts")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Search alts by username or display name
 */
export async function searchAlts(
  supabase: TypedClient,
  query: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from("alts")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get user email by username (checks both users.username and alts.username)
 * Used for login with username support
 */
export async function getEmailByUsername(
  supabase: TypedClient,
  username: string
): Promise<string | null> {
  // First try users.username (direct match)
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("username", username)
    .maybeSingle();

  if (user?.email) return user.email;

  // Fallback: check alts.username and join to users
  const { data: alt } = await supabase
    .from("alts")
    .select("user:users(email)")
    .eq("username", username)
    .maybeSingle();

  // Type assertion since we know the structure
  const altUser = alt?.user as { email: string | null } | null;
  return altUser?.email ?? null;
}

// =============================================================================
// Legacy aliases for backward compatibility (deprecated - use new names)
// =============================================================================

/** @deprecated Use getUserWithAlt instead */
export const getUserWithProfile = getUserWithAlt;

/** @deprecated Use getAltByUsername instead */
export const getProfileByUsername = getAltByUsername;

/** @deprecated Use getAltByUserId instead */
export const getProfileByUserId = getAltByUserId;

/** @deprecated Use searchAlts instead */
export const searchProfiles = searchAlts;
