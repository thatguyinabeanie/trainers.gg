/**
 * Cross-platform base64url decoder for JWT payloads.
 * Converts base64url to base64 and decodes safely across Node / Browser / React Native.
 */
export function decodeBase64Url(base64url: string): string {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  const padding = base64.length % 4;
  if (padding > 0) {
    base64 += "=".repeat(4 - padding);
  }

  // Decode using cross-platform approach
  if (typeof Buffer !== "undefined") {
    // Node.js environment
    return Buffer.from(base64, "base64").toString("utf-8");
  } else if (typeof atob === "function") {
    // Browser environment
    return atob(base64);
  } else {
    // Fallback for environments without atob or Buffer
    throw new Error(
      "No base64 decoder available - neither Buffer nor atob found"
    );
  }
}
