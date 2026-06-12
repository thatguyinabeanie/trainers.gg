import type { TypedClient } from "../client";

/** Bucket name constants for type-safe storage access */
export const STORAGE_BUCKETS = {
  /** Public bucket — objects served without auth tokens (avatars, logos, banners). */
  UPLOADS: "uploads",
  /**
   * PRIVATE bucket for tournament rental-team photos (RLS audit #3).
   * Objects are NOT publicly reachable — reads must go through a signed URL
   * (see `createSignedUrl`). Storage RLS restricts read to the owner + staff
   * with tournament.manage on the relevant community.
   */
  RENTAL_PHOTOS: "rental-photos",
} as const;

/**
 * Generate a unique storage path for a file upload.
 * Format: {userId}/{timestamp}-{randomSuffix}.{ext}
 */
export function getUploadPath(userId: string, fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const ext = dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "jpg";
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${userId}/${timestamp}-${suffix}.${ext}`;
}

/**
 * Get the public URL for a file in a storage bucket.
 */
export function getPublicUrl(
  supabase: TypedClient,
  bucket: string,
  path: string
): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

/**
 * Upload a file to a storage bucket and return its public URL.
 */
export async function uploadFile(
  supabase: TypedClient,
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return getPublicUrl(supabase, bucket, path);
}

/**
 * Generate a short-lived signed URL for a file in a PRIVATE storage bucket.
 *
 * Use this for objects that must NOT be publicly reachable (e.g. rental-team
 * photos in the `rental-photos` bucket). The caller must use a server-side
 * client whose RLS context (owner or staff) is allowed to read the object —
 * Supabase only issues a signed URL when the read policy passes.
 *
 * @param ttlSeconds How long the signed URL stays valid. Defaults to 1 hour.
 * @returns The signed URL, or null when the object is missing or the caller
 *          lacks read access (RLS denied).
 */
export async function createSignedUrl(
  supabase: TypedClient,
  bucket: string,
  path: string,
  ttlSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Delete a file from a storage bucket.
 * Best-effort — logs errors but does not throw.
 */
export async function deleteFile(
  supabase: TypedClient,
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`[storage] Failed to delete ${bucket}/${path}:`, error);
  }
}

/**
 * Extract the storage path from a Supabase public URL.
 * Returns null if the URL doesn't match the expected bucket pattern.
 *
 * Example URL: https://xxx.supabase.co/storage/v1/object/public/uploads/user-id/file.jpg
 * Returns: "user-id/file.jpg"
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
