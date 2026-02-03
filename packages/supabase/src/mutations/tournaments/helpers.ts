import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types";

export type TypedClient = SupabaseClient<Database>;

/**
 * Helper to get current user (for organization ownership checks)
 */
export async function getCurrentUser(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper to get current alt (for tournament registrations/matches)
 * If altId is provided, fetches that specific alt (must belong to user)
 * Otherwise, uses the user's main_alt_id from the users table
 */
export async function getCurrentAlt(supabase: TypedClient, altId?: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // If specific altId provided, verify it belongs to this user
  if (altId !== undefined) {
    const { data: alt } = await supabase
      .from("alts")
      .select("*")
      .eq("id", altId)
      .eq("user_id", user.id)
      .maybeSingle();

    return alt;
  }

  // Otherwise, get the user's main alt
  const { data: userData } = await supabase
    .from("users")
    .select("main_alt_id")
    .eq("id", user.id)
    .single();

  if (!userData?.main_alt_id) {
    // Fallback: get first alt for this user
    const { data: alt } = await supabase
      .from("alts")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    return alt;
  }

  // Get the main alt
  const { data: alt } = await supabase
    .from("alts")
    .select("*")
    .eq("id", userData.main_alt_id)
    .maybeSingle();

  return alt;
}

/**
 * Cut rule for elimination phases preceded by Swiss
 */
export type CutRule =
  | "x-1"
  | "x-2"
  | "x-3"
  | "top-4"
  | "top-8"
  | "top-16"
  | "top-32";

/**
 * Phase configuration for tournament creation
 */
export interface PhaseConfig {
  name: string;
  phaseType: "swiss" | "single_elimination" | "double_elimination";
  bestOf: 1 | 3 | 5;
  roundTimeMinutes: number;
  checkInTimeMinutes: number;
  plannedRounds?: number; // Swiss only, null = auto
  cutRule?: CutRule; // Elimination only (when preceded by Swiss)
}
