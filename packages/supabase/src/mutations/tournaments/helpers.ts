import { logError } from "@trainers/utils";

import type { TypedClient } from "../../client";
export type { TypedClient };

// =============================================================================
// classifySingleError
//
// PostgREST `.single()` collapses three failure modes into the same shape
// when the caller only destructures `data`: zero rows, RLS denial, and
// transient errors all surface as `data === null`. Throwing
// `"Foo not found"` for every case papers over RLS denials and produces
// misleading user messages.
//
// This helper inspects the destructured `error` object and surfaces the
// right message: keep "not found" for PGRST116 (genuinely zero rows),
// log the rest via `logError` and throw a tagged "lookup failed" message
// so ops can correlate the surfaced error with the underlying cause.
// =============================================================================

interface SingleErrorContext {
  /** Short scope tag for the error sink, e.g. `"cancelRegistration.fetchRegistration"`. */
  scope: string;
  /** User-visible message when the row genuinely doesn't exist. */
  notFoundMessage: string;
  /** Extra fields for the error sink (registrationId, altId, etc). */
  context?: Record<string, unknown>;
}

/**
 * Throws an appropriately-classified Error from a `.single()` failure.
 * Returns nothing — call after a `.single()` that returned no row.
 */
export function throwForMissingSingle(
  // We accept the loose Postgrest shape — the helper doesn't care about
  // the row schema, only the `error.code`.
  error: { code?: string; message?: string } | null | undefined,
  ctx: SingleErrorContext
): never {
  if (!error || error.code === "PGRST116") {
    // PGRST116 = "Results contain 0 rows" — genuinely missing. No log
    // needed; this is the expected "not found" path.
    throw new Error(ctx.notFoundMessage);
  }
  // Anything else (RLS denial, network, schema mismatch, …) is a real
  // failure the caller could not predict. Log it for ops and throw a
  // user-visible string that doesn't leak postgres internals.
  logError(ctx.scope, error, ctx.context);
  throw new Error(`${ctx.notFoundMessage} (lookup failed)`);
}

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
 * Check if the current user has a specific permission for a community.
 * Uses the SQL has_community_permission() function which checks both community ownership
 * and staff role-based permissions.
 */
export async function checkCommunityPermission(
  supabase: TypedClient,
  communityId: number,
  permission: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_community_permission", {
    p_community_id: communityId,
    permission_key: permission,
  });

  if (error) throw error;
  return data === true;
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
