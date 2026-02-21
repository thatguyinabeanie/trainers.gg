"use server";

import { revalidatePath } from "next/cache";
import { z } from "@trainers/validators";
import { imageUploadSchema } from "@trainers/validators";
import { type ActionResult } from "@trainers/validators";
import { createClient } from "@/lib/supabase/server";
import { updateAlt } from "@trainers/supabase";
import {
  STORAGE_BUCKETS,
  getAvatarPath,
  uploadFile,
  deleteFile,
  extractPathFromUrl,
} from "@trainers/supabase";
import { withAction } from "./utils";

const altIdSchema = z.number().int().positive();

/**
 * Upload an avatar image for an alt.
 * Validates the file, uploads to storage, updates the alt record,
 * and cleans up the previous avatar if it was in our storage.
 */
export async function uploadAltAvatar(
  altId: number,
  formData: FormData
): Promise<ActionResult<{ avatarUrl: string }>> {
  return withAction(async () => {
    const validatedId = altIdSchema.parse(altId);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("No file provided");
    }

    // Validate file constraints
    imageUploadSchema.parse({ file });

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user owns this alt and get current avatar for cleanup
    const { data: alt } = await supabase
      .from("alts")
      .select("user_id, avatar_url")
      .eq("id", validatedId)
      .single();

    if (!alt) throw new Error("Alt not found");
    if (alt.user_id !== user.id) {
      throw new Error("You can only update your own alt");
    }

    const oldAvatarUrl = alt.avatar_url;

    // Upload new avatar
    const path = getAvatarPath(user.id, file.name);
    const avatarUrl = await uploadFile(
      supabase,
      STORAGE_BUCKETS.AVATARS,
      path,
      file
    );

    // Update alt record with new avatar URL
    await updateAlt(supabase, validatedId, { avatarUrl });

    // Best-effort cleanup of old avatar if it was in our storage
    if (oldAvatarUrl) {
      const oldPath = extractPathFromUrl(oldAvatarUrl, STORAGE_BUCKETS.AVATARS);
      if (oldPath) {
        await deleteFile(supabase, STORAGE_BUCKETS.AVATARS, oldPath);
      }
    }

    revalidatePath("/");
    return { avatarUrl };
  }, "Failed to upload avatar");
}

/**
 * Remove the avatar from an alt.
 * Deletes the file from storage and sets avatar_url to null.
 */
export async function removeAltAvatar(
  altId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const validatedId = altIdSchema.parse(altId);
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user owns this alt and get current avatar for cleanup
    const { data: alt } = await supabase
      .from("alts")
      .select("user_id, avatar_url")
      .eq("id", validatedId)
      .single();

    if (!alt) throw new Error("Alt not found");
    if (alt.user_id !== user.id) {
      throw new Error("You can only update your own alt");
    }

    // Delete file from storage (best-effort)
    if (alt.avatar_url) {
      const path = extractPathFromUrl(alt.avatar_url, STORAGE_BUCKETS.AVATARS);
      if (path) {
        await deleteFile(supabase, STORAGE_BUCKETS.AVATARS, path);
      }
    }

    // Set avatar_url to null
    const { error } = await supabase
      .from("alts")
      .update({ avatar_url: null })
      .eq("id", validatedId);
    if (error) throw error;

    revalidatePath("/");
    return { success: true as const };
  }, "Failed to remove avatar");
}
