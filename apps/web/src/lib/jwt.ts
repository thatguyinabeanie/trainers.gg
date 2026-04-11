/**
 * Server-side JWT utilities.
 *
 * Thin helpers for decoding JWT claims in Server Components and layouts.
 * These are intentionally simple — they do not verify signatures (Supabase
 * already validates the token before it reaches application code).
 */

/**
 * Decode a raw JWT and return its payload as a typed object.
 * Returns `null` when the token is malformed or decoding fails.
 *
 * @param token - Raw JWT string (header.payload.signature)
 */
export function decodeJwtClaims<T>(token: string): T | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    return JSON.parse(Buffer.from(segment, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
