/**
 * Alt Management Server Actions
 *
 * Wraps @trainers/supabase mutations for alt CRUD operations.
 * These enforce ownership checks and validation server-side.
 */

"use server";

import { z } from "@trainers/validators";
import { createClient } from "@/lib/supabase/server";
import {
  createAlt,
  updateAlt,
  deleteAlt,
  setMainAlt,
} from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import { withAction } from "./utils";

// --- Input Schemas ---

const createAltSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(30, "Username must be 30 characters or fewer")
    .regex(
      /^[\p{L}\p{N}_-]+$/u,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
});

const idSchema = z.number().int().positive();

/**
 * Create a new alt for the current user.
 */
export async function createAltAction(data: {
  username: string;
}): Promise<ActionResult<{ id: number }>> {
  return withAction(async () => {
    const validated = createAltSchema.parse(data);
    const supabase = await createClient();
    const alt = await createAlt(supabase, {
      username: validated.username,
    });
    return { id: alt.id };
  }, "Failed to create alt");
}

/**
 * Update an existing alt's details.
 */
export async function updateAltAction(
  altId: number,
  updates: {
    avatarUrl?: string;
  }
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const validatedId = idSchema.parse(altId);
    const supabase = await createClient();
    await updateAlt(supabase, validatedId, updates);
    return { success: true as const };
  }, "Failed to update alt");
}

/**
 * Delete an alt (cannot delete main alt or alts in active tournaments).
 */
export async function deleteAltAction(
  altId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const validatedId = idSchema.parse(altId);
    const supabase = await createClient();
    await deleteAlt(supabase, validatedId);
    return { success: true as const };
  }, "Failed to delete alt");
}

/**
 * Set the user's main alt.
 */
export async function setMainAltAction(
  altId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const validatedId = idSchema.parse(altId);
    const supabase = await createClient();
    await setMainAlt(supabase, validatedId);
    return { success: true as const };
  }, "Failed to set main alt");
}
