"use server";

import { revalidatePath } from "next/cache";
import { z } from "@trainers/validators";
import { imageUploadSchema } from "@trainers/validators";
import { type ActionResult } from "@trainers/validators";
import { createClient, createStorageClient } from "@/lib/supabase/server";
import {
  STORAGE_BUCKETS,
  getUploadPath,
  uploadFile,
  deleteFile,
  extractPathFromUrl,
} from "@trainers/supabase";
import { withAction } from "./utils";

const orgIdSchema = z.number().int().positive();

/**
 * Upload a logo image for an organization.
 * Validates the file, uploads to storage, updates the org record,
 * and cleans up the previous logo if it was in our storage.
 */
export async function uploadOrgLogo(
  orgId: number,
  formData: FormData
): Promise<ActionResult<{ logoUrl: string }>> {
  return withAction(async () => {
    const validatedId = orgIdSchema.parse(orgId);
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

    // Verify user owns this org and get current logo for cleanup
    const { data: org } = await supabase
      .from("organizations")
      .select("owner_user_id, logo_url")
      .eq("id", validatedId)
      .single();

    if (!org) throw new Error("Organization not found");
    if (org.owner_user_id !== user.id) {
      throw new Error("You can only update your own organization");
    }

    const oldLogoUrl = org.logo_url;

    // Upload new logo — path: {userId}/org-logos/{orgId}/{timestamp}.{ext}
    const rawPath = getUploadPath(user.id, file.name);
    const path = rawPath.replace(
      `${user.id}/`,
      `${user.id}/org-logos/${validatedId}/`
    );

    const storageClient = await createStorageClient();
    const logoUrl = await uploadFile(
      storageClient,
      STORAGE_BUCKETS.UPLOADS,
      path,
      file
    );

    // Update org record with new logo URL
    const { error } = await supabase
      .from("organizations")
      .update({ logo_url: logoUrl })
      .eq("id", validatedId);
    if (error) throw error;

    // Best-effort cleanup of old logo if it was in our storage
    if (oldLogoUrl) {
      const oldPath = extractPathFromUrl(oldLogoUrl, STORAGE_BUCKETS.UPLOADS);
      if (oldPath) {
        await deleteFile(storageClient, STORAGE_BUCKETS.UPLOADS, oldPath);
      }
    }

    revalidatePath("/");
    return { logoUrl };
  }, "Failed to upload logo");
}

/**
 * Remove the logo from an organization.
 * Deletes the file from storage and sets logo_url to null.
 */
export async function removeOrgLogo(
  orgId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const validatedId = orgIdSchema.parse(orgId);
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user owns this org and get current logo for cleanup
    const { data: org } = await supabase
      .from("organizations")
      .select("owner_user_id, logo_url")
      .eq("id", validatedId)
      .single();

    if (!org) throw new Error("Organization not found");
    if (org.owner_user_id !== user.id) {
      throw new Error("You can only update your own organization");
    }

    // Delete file from storage (best-effort)
    if (org.logo_url) {
      const path = extractPathFromUrl(org.logo_url, STORAGE_BUCKETS.UPLOADS);
      if (path) {
        const storageClient = await createStorageClient();
        await deleteFile(storageClient, STORAGE_BUCKETS.UPLOADS, path);
      }
    }

    // Set logo_url to null
    const { error } = await supabase
      .from("organizations")
      .update({ logo_url: null })
      .eq("id", validatedId);
    if (error) throw error;

    revalidatePath("/");
    return { success: true as const };
  }, "Failed to remove logo");
}
