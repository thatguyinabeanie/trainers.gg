/**
 * Alt Service Layer
 *
 * Pure business logic for alt management.
 * Called by both Server Actions (web) and API Routes (mobile).
 */

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserAlts,
  getAltsByUserId,
  createAlt as createAltMutation,
  updateAlt as updateAltMutation,
  deleteAlt as deleteAltMutation,
  setMainAlt as setMainAltMutation,
} from "@trainers/supabase";

// =============================================================================
// Queries
// =============================================================================

export async function getCurrentUserAltsService() {
  const supabase = await createClient();
  return await getCurrentUserAlts(supabase);
}

export async function getAltsByUserIdService(userId: string) {
  const supabase = await createClient();
  const alts = await getAltsByUserId(supabase, userId);
  if (!alts || alts.length === 0) {
    throw new Error("No alts found for user");
  }
  return alts;
}

// =============================================================================
// Alt CRUD
// =============================================================================

export async function createAltService(data: {
  username: string;
  displayName: string;
  inGameName?: string;
}) {
  const supabase = await createClient();
  return await createAltMutation(supabase, data);
}

export async function updateAltService(
  altId: number,
  updates: {
    displayName?: string;
    bio?: string;
    inGameName?: string | null;
  }
) {
  const supabase = await createClient();
  return await updateAltMutation(supabase, altId, updates);
}

export async function deleteAltService(altId: number) {
  const supabase = await createClient();
  return await deleteAltMutation(supabase, altId);
}

export async function setMainAltService(altId: number) {
  const supabase = await createClient();
  return await setMainAltMutation(supabase, altId);
}
