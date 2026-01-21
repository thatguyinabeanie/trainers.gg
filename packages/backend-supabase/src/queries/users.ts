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
 * Get current authenticated user with profile
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profile: profile
      ? {
          id: profile.id,
          displayName: profile.display_name,
          username: profile.username,
          bio: profile.bio,
          avatarUrl: profile.avatar_url,
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
 * Get user with profile by ID
 */
export async function getUserWithProfile(
  supabase: TypedClient,
  userId: string,
) {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return { ...user, profile };
}

/**
 * Get profile by username
 */
export async function getProfileByUsername(
  supabase: TypedClient,
  username: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      user:users(*)
    `,
    )
    .eq("username", username)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get profile by user ID
 */
export async function getProfileByUserId(
  supabase: TypedClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Search profiles by username or display name
 */
export async function searchProfiles(
  supabase: TypedClient,
  query: string,
  limit = 10,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
