// Shared PDS utilities for edge functions
// Provides common functions for interacting with the Bluesky PDS

const PDS_HOST = Deno.env.get("PDS_HOST") || "https://pds.trainers.gg";
const PDS_ADMIN_PASSWORD = Deno.env.get("PDS_ADMIN_PASSWORD");

// Handle domain for generating user handles
// In production: trainers.gg (e.g., @username.trainers.gg)
// In local dev: uses the PDS hostname (e.g., @username.abc123.ngrok-free.app)
const PDS_HANDLE_DOMAIN =
  Deno.env.get("PDS_HANDLE_DOMAIN") ||
  (PDS_HOST.includes("ngrok") || PDS_HOST.includes("localhost")
    ? new URL(PDS_HOST).hostname
    : "trainers.gg");

/**
 * Create an invite code on the PDS (required for account creation)
 */
export async function createPdsInviteCode(): Promise<string | null> {
  if (!PDS_ADMIN_PASSWORD) {
    console.error("PDS_ADMIN_PASSWORD not set");
    return null;
  }

  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.server.createInviteCode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`admin:${PDS_ADMIN_PASSWORD}`)}`,
        },
        body: JSON.stringify({ useCount: 1 }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create invite code:", error);
      return null;
    }

    const data = await response.json();
    return data.code;
  } catch (error) {
    console.error("Error creating invite code:", error);
    return null;
  }
}

/**
 * Create account on the PDS
 */
export async function createPdsAccount(
  handle: string,
  email: string,
  password: string,
  inviteCode: string
): Promise<{ did: string } | { error: string }> {
  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.server.createAccount`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          handle,
          password,
          inviteCode,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || "Failed to create PDS account" };
    }

    return { did: data.did };
  } catch (error) {
    console.error("Error creating PDS account:", error);
    return { error: "Failed to connect to PDS" };
  }
}

/**
 * Check if handle is available on the PDS
 */
export async function checkPdsHandleAvailable(
  handle: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
    );

    // 400 with "Unable to resolve handle" means it's available
    if (response.status === 400) {
      return true;
    }

    // 200 means handle exists (not available)
    return false;
  } catch {
    // Network error - assume available but will fail at creation
    return true;
  }
}

/**
 * Generate a cryptographically secure random password
 * Used for PDS accounts where the user doesn't need to know the password
 * (they authenticate via Supabase, not directly to PDS)
 */
export function generateSecurePassword(length: number = 32): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join("");
}

/**
 * Generate the handle from a username
 * In production: username.trainers.gg
 * In local dev: username.<ngrok-hostname>
 */
export function generateHandle(username: string): string {
  return `${username.toLowerCase()}.${PDS_HANDLE_DOMAIN}`;
}

/**
 * PDS configuration constants
 */
export const PDS_CONFIG = {
  host: PDS_HOST,
  handleDomain: PDS_HANDLE_DOMAIN,
  hasAdminPassword: !!PDS_ADMIN_PASSWORD,
} as const;
