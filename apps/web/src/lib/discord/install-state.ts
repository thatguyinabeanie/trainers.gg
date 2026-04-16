/**
 * Signed state tokens for the Discord bot install OAuth2 flow.
 *
 * Discord redirects the user back to our callback URL with a `state` parameter
 * that we generate. We sign it with HMAC-SHA256 (via `jose`) so that:
 *   - We can verify the callback is from our own redirect (CSRF protection)
 *   - We can trust the `community_id` and `user_id` embedded in the token
 *   - Tokens expire after 10 minutes, preventing replay attacks
 *
 * Signing key: SUPABASE_JWT_SECRET (already declared in turbo.json globalEnv
 * and available at runtime). A dedicated secret would be marginally better
 * isolation, but SUPABASE_JWT_SECRET is already strong (256-bit+) and
 * available in every environment without additional provisioning.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/** Payload embedded in the signed install state token. */
export interface InstallStatePayload {
  community_id: number;
  user_id: string;
}

/** Token TTL: 10 minutes (Discord gives users plenty of time to authorize). */
const TTL_SECONDS = 10 * 60;

/** JWT issuer claim — used to distinguish our tokens from other JWTs. */
const ISSUER = "trainers.gg/discord-install";

/**
 * Get the signing key bytes from the environment.
 * Throws at call time (not import time) so tests can set the env var first.
 */
function getSigningKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET is not set — cannot sign Discord install state token"
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a Discord bot install state token.
 *
 * The returned string is a compact JWT (HS256) suitable for use as the
 * `state` query parameter in a Discord OAuth2 authorization URL.
 *
 * @param payload - The community and user context to embed in the token
 * @returns A signed, URL-safe JWT string
 */
export async function signInstallState(
  payload: InstallStatePayload
): Promise<string> {
  const key = getSigningKey();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    community_id: payload.community_id,
    user_id: payload.user_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .setIssuer(ISSUER)
    .sign(key);
}

/**
 * Verify and decode a Discord bot install state token.
 *
 * Returns the original payload on success.
 * Returns `null` on any failure — invalid signature, expired, malformed,
 * wrong issuer — never throws. Callers treat `null` as a CSRF / replay attack.
 *
 * @param token - The `state` query parameter value from Discord's callback
 */
export async function verifyInstallState(
  token: string
): Promise<InstallStatePayload | null> {
  try {
    const key = getSigningKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });

    return extractPayload(payload);
  } catch {
    // Any jwtVerify failure (expired, bad sig, malformed, missing issuer)
    // is treated as invalid — return null so the route can redirect with error.
    return null;
  }
}

/**
 * Extract and validate the typed fields from a raw JWT payload.
 * Returns null if the required fields are missing or have wrong types.
 */
function extractPayload(payload: JWTPayload): InstallStatePayload | null {
  const { community_id, user_id } = payload as Record<string, unknown>;

  if (typeof community_id !== "number" || typeof user_id !== "string") {
    return null;
  }

  return { community_id, user_id };
}
