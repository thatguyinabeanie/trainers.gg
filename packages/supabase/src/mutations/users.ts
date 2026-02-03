import type { TypedClient } from "../client";
import type { Database } from "../types";

/**
 * Update user alt
 */
export async function updateAlt(
  supabase: TypedClient,
  altId: number,
  updates: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    inGameName?: string | null;
  }
) {
  // Verify the user owns this alt
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: alt } = await supabase
    .from("alts")
    .select("user_id")
    .eq("id", altId)
    .single();

  if (!alt) throw new Error("Alt not found");
  if (alt.user_id !== user.id) {
    throw new Error("You can only update your own alt");
  }

  // Prepare update data
  const updateData: Database["public"]["Tables"]["alts"]["Update"] = {};
  if (updates.displayName !== undefined)
    updateData.display_name = updates.displayName;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.avatarUrl !== undefined)
    updateData.avatar_url = updates.avatarUrl;
  if (updates.inGameName !== undefined)
    updateData.in_game_name = updates.inGameName;

  const { error } = await supabase
    .from("alts")
    .update(updateData)
    .eq("id", altId);

  if (error) throw error;
  return { success: true };
}

/**
 * Update username (with uniqueness check)
 */
export async function updateUsername(
  supabase: TypedClient,
  altId: number,
  newUsername: string
) {
  // Verify the user owns this alt
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: alt } = await supabase
    .from("alts")
    .select("user_id")
    .eq("id", altId)
    .single();

  if (!alt) throw new Error("Alt not found");
  if (alt.user_id !== user.id) {
    throw new Error("You can only update your own alt");
  }

  // Check username uniqueness
  const { data: existing } = await supabase
    .from("alts")
    .select("id")
    .eq("username", newUsername.toLowerCase())
    .neq("id", altId)
    .single();

  if (existing) {
    throw new Error("Username is already taken");
  }

  const { error } = await supabase
    .from("alts")
    .update({ username: newUsername.toLowerCase() })
    .eq("id", altId);

  if (error) throw error;
  return { success: true };
}

/**
 * Ensure an alt exists for the current user, creating one with defaults if needed
 * Returns the existing or newly created alt
 */
export async function ensureAlt(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if alt already exists
  const { data: existing } = await supabase
    .from("alts")
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
      .from("alts")
      .select("id")
      .eq("username", username)
      .single();

    if (!usernameExists) break;
    username = `${defaultUsername}_${Math.random().toString(36).slice(2, 6)}`;
    attempts++;
  }

  const { data: alt, error } = await supabase
    .from("alts")
    .insert({
      user_id: user.id,
      username,
      display_name: userData?.name ?? username,
      avatar_url: userData?.image ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return alt;
}

/**
 * Create a new alt for a user (if not auto-created by trigger)
 */
export async function createAlt(
  supabase: TypedClient,
  data: {
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    inGameName?: string;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check username uniqueness
  const { data: usernameExists } = await supabase
    .from("alts")
    .select("id")
    .eq("username", data.username.toLowerCase())
    .maybeSingle();

  if (usernameExists) {
    throw new Error("Username is already taken");
  }

  const { data: alt, error } = await supabase
    .from("alts")
    .insert({
      user_id: user.id,
      username: data.username.toLowerCase(),
      display_name: data.displayName,
      bio: data.bio ?? null,
      avatar_url: data.avatarUrl ?? null,
      in_game_name: data.inGameName ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return alt;
}

/**
 * Delete an alt (cannot delete main alt)
 */
export async function deleteAlt(supabase: TypedClient, altId: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify user owns this alt
  const { data: alt } = await supabase
    .from("alts")
    .select("user_id")
    .eq("id", altId)
    .single();

  if (!alt) throw new Error("Alt not found");
  if (alt.user_id !== user.id) {
    throw new Error("You can only delete your own alt");
  }

  // Check if this is the main alt
  const { data: userData } = await supabase
    .from("users")
    .select("main_alt_id")
    .eq("id", user.id)
    .single();

  if (userData?.main_alt_id === altId) {
    throw new Error(
      "Cannot delete your main alt. Set a different main alt first."
    );
  }

  // Check this alt isn't registered in any active tournaments
  const { count } = await supabase
    .from("tournament_registrations")
    .select("*", { count: "exact", head: true })
    .eq("alt_id", altId)
    .in("status", ["registered", "checked_in"]);

  if (count && count > 0) {
    throw new Error(
      "Cannot delete an alt that is registered in active tournaments"
    );
  }

  const { error } = await supabase.from("alts").delete().eq("id", altId);

  if (error) throw error;
  return { success: true };
}

/**
 * Set a user's main alt
 */
export async function setMainAlt(supabase: TypedClient, altId: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify user owns this alt
  const { data: alt } = await supabase
    .from("alts")
    .select("user_id")
    .eq("id", altId)
    .single();

  if (!alt) throw new Error("Alt not found");
  if (alt.user_id !== user.id) {
    throw new Error("You can only set your own alt as main");
  }

  const { error } = await supabase
    .from("users")
    .update({ main_alt_id: altId })
    .eq("id", user.id);

  if (error) throw error;
  return { success: true };
}
