import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * Update user profile
 */
export async function updateProfile(
  supabase: TypedClient,
  profileId: string,
  updates: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }
) {
  // Verify the user owns this profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (profile.user_id !== user.id) {
    throw new Error("You can only update your own profile");
  }

  // Prepare update data
  const updateData: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (updates.displayName !== undefined)
    updateData.display_name = updates.displayName;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.avatarUrl !== undefined)
    updateData.avatar_url = updates.avatarUrl;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profileId);

  if (error) throw error;
  return { success: true };
}

/**
 * Update username (with uniqueness check)
 */
export async function updateUsername(
  supabase: TypedClient,
  profileId: string,
  newUsername: string
) {
  // Verify the user owns this profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (profile.user_id !== user.id) {
    throw new Error("You can only update your own profile");
  }

  // Check username uniqueness
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", newUsername.toLowerCase())
    .neq("id", profileId)
    .single();

  if (existing) {
    throw new Error("Username is already taken");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: newUsername.toLowerCase() })
    .eq("id", profileId);

  if (error) throw error;
  return { success: true };
}

/**
 * Ensure a profile exists for the current user, creating one with defaults if needed
 * Returns the existing or newly created profile
 */
export async function ensureProfile(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if profile already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return existing;
  }

  // Get user record for default values
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Generate default username from email or user id
  const email = userData?.email ?? user.email ?? "";
  const defaultUsername =
    email
      .split("@")[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9_]/g, "_") || `user_${user.id.slice(0, 8)}`;

  // Ensure username is unique by appending random suffix if needed
  let username = defaultUsername;
  let attempts = 0;
  while (attempts < 5) {
    const { data: usernameExists } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (!usernameExists) break;
    username = `${defaultUsername}_${Math.random().toString(36).slice(2, 6)}`;
    attempts++;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      username,
      display_name: userData?.name ?? username,
      avatar_url: userData?.image ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return profile;
}

/**
 * Create a new profile for a user (if not auto-created by trigger)
 */
export async function createProfile(
  supabase: TypedClient,
  data: {
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if profile already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    throw new Error("Profile already exists for this user");
  }

  // Check username uniqueness
  const { data: usernameExists } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", data.username.toLowerCase())
    .single();

  if (usernameExists) {
    throw new Error("Username is already taken");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      username: data.username.toLowerCase(),
      display_name: data.displayName,
      bio: data.bio ?? null,
      avatar_url: data.avatarUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return profile;
}
