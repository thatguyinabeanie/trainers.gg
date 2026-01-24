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
import { createClient } from "@/lib/supabase/server";

// Environment-aware configuration
const isProduction = process.env.NODE_ENV === "production";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";

// Client metadata URL (must be publicly accessible)
const CLIENT_ID = isProduction
  ? "https://trainers.gg/oauth/client-metadata.json"
  : `${siteUrl}/oauth/client-metadata.json`;

// Redirect URI for OAuth callback
const REDIRECT_URI = `${siteUrl}/api/oauth/callback`;

// Singleton client instance
let oauthClient: NodeOAuthClient | null = null;

/**
 * State store implementation using Supabase
 * Stores temporary OAuth state during authorization flow
 *
 * Note: Tables are created via migration. Type assertions used until types regenerated.
 */
const stateStore = {
  async set(key: string, state: NodeSavedState): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("atproto_oauth_state")
      .upsert({
        state_key: key,
        state_data: state,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min TTL
      });

    if (error) {
      console.error("Failed to save OAuth state:", error);
      throw new Error("Failed to save OAuth state");
    }
  },

  async get(key: string): Promise<NodeSavedState | undefined> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
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
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("atproto_oauth_state")
      .delete()
      .eq("state_key", key);
  },
};

/**
 * Session store implementation using Supabase
 * Stores OAuth tokens per DID
 *
 * Note: Tables are created via migration. Type assertions used until types regenerated.
 */
const sessionStore = {
  async set(sub: string, session: NodeSavedSession): Promise<void> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("atproto_sessions").upsert(
      {
        did: sub,
        session_data: session,
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
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
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
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("atproto_sessions").delete().eq("did", sub);
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
      jwks_uri: `${isProduction ? "https://trainers.gg" : siteUrl}/oauth/jwks.json`,
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
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("atproto_oauth_state").upsert({
      state_key: `return:${state}`,
      state_data: { returnUrl },
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
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("atproto_oauth_state")
      .select("state_data")
      .eq("state_key", `return:${state}`)
      .maybeSingle();

    returnUrl = (data?.state_data as { returnUrl?: string })?.returnUrl;

    // Clean up
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
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
 */
export async function getAtprotoSession(did: string) {
  const client = await getAtprotoOAuthClient();
  return client.restore(did);
}

/**
 * Revoke/logout an AT Protocol session
 */
export async function revokeAtprotoSession(did: string): Promise<void> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("atproto_sessions").delete().eq("did", did);
}
