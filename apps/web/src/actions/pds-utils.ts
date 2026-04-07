/**
 * Shared PDS (Personal Data Server) utilities for server actions.
 *
 * Consolidates handle checking and username generation logic used by
 * both onboarding and profile update flows.
 */

export const PDS_HOST = process.env.PDS_HOST || "https://pds.trainers.gg";

/**
 * Check if a handle is available on the PDS.
 * Returns true if available, false if taken.
 * On network errors, assumes available (provisioning will catch conflicts).
 */
export async function checkPdsHandleAvailable(
  handle: string
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      { signal: controller.signal }
    );

    // 400 means the handle could not be resolved — it's available
    if (response.status === 400) {
      return true;
    }

    // 200 means handle exists (not available)
    return false;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("PDS handle check timed out for:", handle);
    } else {
      console.warn("PDS handle check failed for:", handle, error);
    }
    // Assume available — provisioning will catch conflicts
    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Derive a PDS-compatible username from a trainers.gg username.
 * AT Protocol handles must be ASCII lowercase alphanumeric + hyphens.
 * Falls back to a user-ID-based slug if the result is empty.
 */
export function derivePdsUsername(username: string, userId: string): string {
  return (
    username.toLowerCase().replace(/[^a-z0-9-]/g, "") ||
    `user-${userId.slice(0, 8)}`
  );
}

/**
 * Generate a full trainers.gg handle from a username.
 * Returns empty string if the ASCII portion is too short (< 3 chars).
 */
export function generateHandle(username: string): string {
  const asciiPart = username.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (asciiPart.length < 3) return "";
  return `${asciiPart}.trainers.gg`;
}
