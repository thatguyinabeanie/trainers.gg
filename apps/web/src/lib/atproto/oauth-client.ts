/**
 * AT Protocol OAuth Client
 *
 * Handles Bluesky/AT Protocol OAuth authentication for trainers.gg.
 * Uses the BFF (Backend-for-Frontend) pattern with confidential client.
 */

import {
  NodeOAuthClient,
  type NodeSavedSession,
  type NodeSavedState,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { Agent } from "@atproto/api";
import { createAtprotoServiceClient } from "@/lib/supabase/server";
import type { Json } from "@trainers/supabase";

/**
 * Bluesky profile data retrieved from the API
 */
export interface BlueskyProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

const PRODUCTION_URL = "https://trainers.gg";

/**
 * Get the site URL for OAuth configuration.
 *
 * Environment behavior:
 * - Production/Vercel: Always uses trainers.gg
 * - Local Dev with tunnel: Uses NEXT_PUBLIC_SITE_URL (e.g., ngrok URL)
 * - Local Dev without tunnel: Falls back to localhost (OAuth will fail)
 *
 * Note: AT Protocol OAuth does NOT allow localhost redirect URIs for web apps.
 * Local development requires using a tunnel service like ngrok.
 */
function getSiteUrl(): string {
  // Explicit override takes precedence (used for local dev with tunnels)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Production (Vercel or NODE_ENV=production)
  if (process.env.VERCEL_URL || process.env.NODE_ENV === "production") {
    return PRODUCTION_URL;
  }

  // Local development - will fail OAuth but allows app to start
  return "http://127.0.0.1:3000";
}

const siteUrl = getSiteUrl();

// Client ID is now the dynamic metadata endpoint URL
const CLIENT_ID = `${siteUrl}/api/oauth/client-metadata`;

// Redirect URI for OAuth callback
const REDIRECT_URI = `${siteUrl}/api/oauth/callback`;

// JWKS URI for public key discovery
const JWKS_URI = `${siteUrl}/oauth/jwks.json`;

// Singleton client instance
let oauthClient: NodeOAuthClient | null = null;

/**
 * State store implementation using Supabase
 * Stores temporary OAuth state during authorization flow
 * Uses service role client since atproto_oauth_state has no user-facing RLS policies
 */
const stateStore = {
  async set(key: string, state: NodeSavedState): Promise<void> {
    const supabase = createAtprotoServiceClient();
    const { error } = await supabase.from("atproto_oauth_state").upsert({
      state_key: key,
      state_data: state as unknown as Json,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min TTL
    });

    if (error) {
      console.error("Failed to save OAuth state:", error);
      throw new Error("Failed to save OAuth state");
    }
  },

  async get(key: string): Promise<NodeSavedState | undefined> {
    const supabase = createAtprotoServiceClient();
    const { data, error } = await supabase
      .from("atproto_oauth_state")
      .select("state_data")
      .eq("state_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Failed to get OAuth state:", error);
      return undefined;
    }

    return data?.state_data as NodeSavedState | undefined;
  },

  async del(key: string): Promise<void> {
    const supabase = createAtprotoServiceClient();
    await supabase.from("atproto_oauth_state").delete().eq("state_key", key);
  },
};

/**
 * Session store implementation using Supabase
 * Stores OAuth tokens per DID
 * Uses service role client since atproto_sessions has limited user-facing RLS policies
 */
const sessionStore = {
  async set(sub: string, session: NodeSavedSession): Promise<void> {
    const supabase = createAtprotoServiceClient();
    const { error } = await supabase.from("atproto_sessions").upsert(
      {
        did: sub,
        session_data: session as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "did",
      }
    );

    if (error) {
      console.error("Failed to save OAuth session:", error);
      throw new Error("Failed to save OAuth session");
    }
  },

  async get(sub: string): Promise<NodeSavedSession | undefined> {
    const supabase = createAtprotoServiceClient();
    const { data, error } = await supabase
      .from("atproto_sessions")
      .select("session_data")
      .eq("did", sub)
      .maybeSingle();

    if (error) {
      console.error("Failed to get OAuth session:", error);
      return undefined;
    }

    return data?.session_data as NodeSavedSession | undefined;
  },

  async del(sub: string): Promise<void> {
    const supabase = createAtprotoServiceClient();
    await supabase.from("atproto_sessions").delete().eq("did", sub);
  },
};

/**
 * Get or create the AT Protocol OAuth client
 */
export async function getAtprotoOAuthClient(): Promise<NodeOAuthClient> {
  if (oauthClient) {
    return oauthClient;
  }

  // Get private key from environment
  const privateKeyRaw = process.env.ATPROTO_PRIVATE_KEY;
  if (!privateKeyRaw) {
    throw new Error(
      "ATPROTO_PRIVATE_KEY environment variable is required for AT Protocol OAuth"
    );
  }

  // Handle escaped newlines from environment variables (e.g., Vercel)
  // Try multiple escape patterns that might occur
  let privateKeyPem = privateKeyRaw
    .replace(/\\n/g, "\n") // Literal \n (backslash + n)
    .replace(/\\\\n/g, "\n") // Double-escaped \\n
    .trim();

  // Remove surrounding quotes if present
  if (
    (privateKeyPem.startsWith('"') && privateKeyPem.endsWith('"')) ||
    (privateKeyPem.startsWith("'") && privateKeyPem.endsWith("'"))
  ) {
    privateKeyPem = privateKeyPem.slice(1, -1).replace(/\\n/g, "\n");
  }

  // Validate the key format
  if (!privateKeyPem.includes("-----BEGIN PRIVATE KEY-----")) {
    console.error(
      "Invalid key format. Expected PKCS#8. Key starts with:",
      privateKeyPem.substring(0, 50)
    );
    throw new Error(
      "ATPROTO_PRIVATE_KEY must be in PKCS#8 PEM format (-----BEGIN PRIVATE KEY-----)"
    );
  }

  // Parse the private key (must be PKCS#8 PEM format)
  const privateKey = await JoseKey.fromImportable(privateKeyPem, "key-1");

  oauthClient = new NodeOAuthClient({
    clientMetadata: {
      client_id: CLIENT_ID,
      client_name: "trainers.gg",
      client_uri: siteUrl,
      redirect_uris: [REDIRECT_URI],
      grant_types: ["authorization_code", "refresh_token"],
      scope: "atproto transition:generic",
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
      jwks_uri: JWKS_URI,
    },
    keyset: [privateKey],
    stateStore,
    sessionStore,
  });

  return oauthClient;
}

/**
 * Start the OAuth authorization flow
 * Returns the authorization URL to redirect the user to
 */
export async function startAtprotoAuth(
  handle: string,
  returnUrl?: string
): Promise<string> {
  const client = await getAtprotoOAuthClient();

  // Generate a state parameter for CSRF protection
  const state = crypto.randomUUID();

  // Store return URL in state if provided
  if (returnUrl) {
    const supabase = createAtprotoServiceClient();
    await supabase.from("atproto_oauth_state").upsert({
      state_key: `return:${state}`,
      state_data: { returnUrl } as unknown as Json,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }

  // Initiate authorization - this discovers the user's PDS and authorization server
  const authUrl = await client.authorize(handle, { state });

  return authUrl.toString();
}

/**
 * Handle the OAuth callback
 * Returns the authenticated session with DID
 */
export async function handleAtprotoCallback(params: URLSearchParams): Promise<{
  did: string;
  handle?: string;
  returnUrl?: string;
}> {
  const client = await getAtprotoOAuthClient();

  // Exchange authorization code for tokens
  const { session, state } = await client.callback(params);

  // Get the return URL if we stored one
  let returnUrl: string | undefined;
  if (state) {
    const supabase = createAtprotoServiceClient();
    const { data } = await supabase
      .from("atproto_oauth_state")
      .select("state_data")
      .eq("state_key", `return:${state}`)
      .maybeSingle();

    returnUrl = (data?.state_data as { returnUrl?: string } | null)?.returnUrl;

    // Clean up
    await supabase
      .from("atproto_oauth_state")
      .delete()
      .eq("state_key", `return:${state}`);
  }

  return {
    did: session.did,
    // Handle is available on the session's sub property resolution
    handle: undefined, // Will be resolved separately if needed
    returnUrl,
  };
}

/**
 * Get an authenticated session for a DID
 *
 * Returns null if:
 * - AT Protocol OAuth is not configured (missing ATPROTO_PRIVATE_KEY)
 * - The DID is invalid (e.g., fake seed data DIDs)
 * - The session cannot be restored
 */
export async function getAtprotoSession(did: string) {
  if (!process.env.ATPROTO_PRIVATE_KEY) {
    return null;
  }
  try {
    const client = await getAtprotoOAuthClient();
    return await client.restore(did);
  } catch (error) {
    // Expected for seed data with fake DIDs or invalidated sessions
    return null;
  }
}

/**
 * Revoke/logout an AT Protocol session
 */
export async function revokeAtprotoSession(did: string): Promise<void> {
  const supabase = createAtprotoServiceClient();
  await supabase.from("atproto_sessions").delete().eq("did", did);
}

/**
 * Fetch a Bluesky profile by DID or handle
 * Uses the public Bluesky API - no authentication required
 */
export async function getBlueskyProfile(
  actor: string
): Promise<BlueskyProfile | null> {
  try {
    // Use the public Bluesky AppView API
    const agent = new Agent("https://public.api.bsky.app");

    const response = await agent.getProfile({ actor });

    if (!response.success) {
      console.error("Failed to fetch Bluesky profile:", response);
      return null;
    }

    return {
      did: response.data.did,
      handle: response.data.handle,
      displayName: response.data.displayName,
      avatar: response.data.avatar,
      description: response.data.description,
    };
  } catch (error) {
    console.error("Error fetching Bluesky profile:", error);
    return null;
  }
}

/**
 * Extract username from a Bluesky handle
 * e.g., "thatguyinabeanie.bsky.social" -> "thatguyinabeanie"
 * e.g., "user.trainers.gg" -> "user"
 */
export function extractUsernameFromHandle(handle: string): string {
  // Remove the domain suffix to get the username part
  const parts = handle.split(".");
  return parts[0] || handle;
}
