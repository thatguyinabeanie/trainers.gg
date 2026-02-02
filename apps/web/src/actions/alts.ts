/**
 * Alt Management Server Actions
 *
 * Wraps @trainers/supabase mutations for alt CRUD operations.
 * These enforce ownership checks and validation server-side.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  createAlt,
  updateAlt,
  deleteAlt,
  setMainAlt,
} from "@trainers/supabase";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new alt for the current user.
 */
export async function createAltAction(data: {
  username: string;
  displayName: string;
  battleTag?: string;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const supabase = await createClient();
    const alt = await createAlt(supabase, {
      username: data.username,
      displayName: data.displayName,
      battleTag: data.battleTag,
    });
    return { success: true, data: { id: alt.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create alt"),
    };
  }
}

/**
 * Update an existing alt's details.
 */
export async function updateAltAction(
  altId: number,
  updates: {
    displayName?: string;
    bio?: string;
    battleTag?: string | null;
  }
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateAlt(supabase, altId, updates);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update alt"),
    };
  }
}

/**
 * Delete an alt (cannot delete main alt or alts in active tournaments).
 */
export async function deleteAltAction(
  altId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await deleteAlt(supabase, altId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete alt"),
    };
  }
}

/**
 * Set the user's main alt.
 */
export async function setMainAltAction(
  altId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await setMainAlt(supabase, altId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to set main alt"),
    };
  }
}

/**
 * Update profile (display name + bio on the user's main alt).
 */
export async function updateProfileAction(
  altId: number,
  updates: { displayName?: string; bio?: string }
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateAlt(supabase, altId, updates);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update profile"),
    };
  }
}
