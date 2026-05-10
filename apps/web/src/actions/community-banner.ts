"use server";

import { invalidateCommunityPageCaches } from "@/lib/cache-invalidation";
import { CacheTags } from "@/lib/cache";
import { updateTag } from "next/cache";
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

const communityIdSchema = z.number().int().positive();

/**
 * Upload a banner image for a community.
 * Validates the file, uploads to storage, updates the community record,
 * and cleans up the previous banner if it was in our storage.
 */
export async function uploadCommunityBanner(
  communityId: number,
  formData: FormData
): Promise<ActionResult<{ bannerUrl: string }>> {
  return withAction(async () => {
    const validatedId = communityIdSchema.parse(communityId);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("No file provided");
    }

    imageUploadSchema.parse({ file });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: org } = await supabase
      .from("communities")
      .select("owner_user_id, banner_url, slug")
      .eq("id", validatedId)
      .single();

    if (!org) throw new Error("Community not found");
    if (org.owner_user_id !== user.id) {
      throw new Error("You can only update your own community");
    }

    const oldBannerUrl = org.banner_url;

    const rawPath = getUploadPath(user.id, file.name);
    const fileName = rawPath.split("/").pop()!;
    const path = `communities/${validatedId}/banner_${fileName}`;

    const storageClient = await createStorageClient();
    const bannerUrl = await uploadFile(
      storageClient,
      STORAGE_BUCKETS.UPLOADS,
      path,
      file
    );

    const { error } = await supabase
      .from("communities")
      .update({ banner_url: bannerUrl })
      .eq("id", validatedId);
    if (error) {
      // Clean up uploaded file to avoid orphaned storage
      await deleteFile(storageClient, STORAGE_BUCKETS.UPLOADS, path).catch(
        () => {}
      );
      throw error;
    }

    // Best-effort cleanup — old banner may be external
    if (oldBannerUrl) {
      const oldPath = extractPathFromUrl(
        oldBannerUrl,
        STORAGE_BUCKETS.UPLOADS
      );
      if (oldPath) {
        await deleteFile(storageClient, STORAGE_BUCKETS.UPLOADS, oldPath).catch(
          () => {}
        );
      }
    }

    invalidateCommunityPageCaches(org.slug, validatedId);
    updateTag(CacheTags.TOURNAMENTS_LIST);
    return { bannerUrl };
  }, "Failed to upload banner");
}

/**
 * Remove the banner from a community.
 * Deletes the file from storage and sets banner_url to null.
 */
export async function removeCommunityBanner(
  communityId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    const validatedId = communityIdSchema.parse(communityId);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: org } = await supabase
      .from("communities")
      .select("owner_user_id, banner_url, slug")
      .eq("id", validatedId)
      .single();

    if (!org) throw new Error("Community not found");
    if (org.owner_user_id !== user.id) {
      throw new Error("You can only update your own community");
    }

    const bannerUrl = org.banner_url;

    const { error } = await supabase
      .from("communities")
      .update({ banner_url: null })
      .eq("id", validatedId);
    if (error) throw error;

    // Best-effort storage cleanup — delete after DB update succeeds
    if (bannerUrl) {
      const path = extractPathFromUrl(bannerUrl, STORAGE_BUCKETS.UPLOADS);
      if (path) {
        const storageClient = await createStorageClient();
        await deleteFile(storageClient, STORAGE_BUCKETS.UPLOADS, path).catch(
          () => {}
        );
      }
    }

    invalidateCommunityPageCaches(org.slug, validatedId);
    updateTag(CacheTags.TOURNAMENTS_LIST);
    return { success: true as const };
  }, "Failed to remove banner");
}
