/**
 * Server-side JWT utilities.
 *
 * Thin helpers for decoding JWT claims in Server Components and layouts.
 * These do not verify signatures — they are used only for reading JWT
 * claims to gate UI access. Actual authorization is enforced by RLS
 * policies on the database side.
 */

import { decodeBase64Url } from "@trainers/supabase/hooks";

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
    return JSON.parse(decodeBase64Url(segment)) as T;
  } catch {
    return null;
  }
}
