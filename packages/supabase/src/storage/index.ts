import type { TypedClient } from "../client";

/** Bucket name constants for type-safe storage access */
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
} as const;

/**
 * Generate a unique storage path for an avatar file.
 * Format: {userId}/{timestamp}-{randomSuffix}.{ext}
 */
export function getAvatarPath(userId: string, fileName: string): string {
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
 * Example URL: https://xxx.supabase.co/storage/v1/object/public/avatars/user-id/file.jpg
 * Returns: "user-id/file.jpg"
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
