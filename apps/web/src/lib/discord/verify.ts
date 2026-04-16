/**
 * Ed25519 signature verification for inbound Discord interaction requests.
 *
 * Discord signs every HTTP interaction with its application public key.
 * We must verify before processing to prevent spoofed requests.
 *
 * Reference: https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
 */

import { verifyKey } from "discord-interactions";

/**
 * Verify a Discord interaction request signature.
 *
 * @param body - Raw request body string
 * @param signature - Value of the `x-signature-ed25519` header
 * @param timestamp - Value of the `x-signature-timestamp` header
 * @param publicKey - Discord application public key (hex string)
 * @returns true when the signature is valid for the given body + timestamp
 */
export async function verifyDiscordSignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string
): Promise<boolean> {
  if (!signature || !timestamp) {
    return false;
  }

  return verifyKey(body, signature, timestamp, publicKey);
}

/**
 * Convenience wrapper that reads Discord signature headers from a `Request`
 * and the public key from `DISCORD_PUBLIC_KEY` environment variable.
 *
 * @param req - Incoming `Request` object
 * @param body - Raw body string (already read by the caller)
 * @returns true when the request passes signature verification
 */
export async function verifyRequest(
  req: Request,
  body: string
): Promise<boolean> {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const publicKey = process.env.DISCORD_PUBLIC_KEY ?? "";

  if (!publicKey) {
    return false;
  }

  return verifyDiscordSignature(body, signature, timestamp, publicKey);
}
