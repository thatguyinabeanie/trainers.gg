// AT Protocol OAuth client for Expo mobile app.
//
// Wraps @atproto/oauth-client-expo with a lazy singleton pattern
// (matching the Supabase client in ../supabase/client.ts).
//
// The ExpoOAuthClient handles all AT Protocol OAuth requirements:
// DPoP, PKCE, PAR, and token storage (via expo-secure-store internally).
//
// The client_id is a URL pointing to the mobile client metadata endpoint
// on the web app. For local dev, this uses the ngrok tunnel URL.

import { ExpoOAuthClient } from "@atproto/oauth-client-expo";

// Lazy singleton -- only created when first accessed
let _client: ExpoOAuthClient | null = null;

/**
 * Get the AT Protocol OAuth client for mobile.
 *
 * Uses the ExpoOAuthClient which handles all AT Protocol OAuth requirements:
 * DPoP, PKCE, PAR, token storage (via expo-secure-store internally).
 *
 * The client_id is a URL pointing to the mobile client metadata endpoint
 * on the web app. For local dev, this uses the ngrok tunnel URL.
 */
export function getAtprotoOAuthClient(): ExpoOAuthClient {
  if (_client) return _client;

  // EXPO_PUBLIC_SITE_URL should point to the web app
  // (e.g., https://trainers.gg or https://<ngrok-id>.ngrok-free.app for local dev)
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "Missing EXPO_PUBLIC_SITE_URL. Set it in .env.local to point to the web app (e.g., https://trainers.gg or your ngrok URL)."
    );
  }

  // The client_id must be a URL that returns the OAuth client metadata document.
  // This is the self-referential pattern required by the AT Protocol OAuth spec.
  const clientId = `${siteUrl}/api/oauth/mobile-client-metadata`;

  _client = new ExpoOAuthClient({
    // Handle resolver used to resolve AT Protocol handles to DIDs.
    // Points to bsky.social's public XRPC endpoint.
    handleResolver: "https://bsky.social",

    // Client metadata must match what the mobile-client-metadata endpoint serves.
    // This is provided inline so the client can work without fetching the endpoint
    // at startup (the server still serves it for authorization server validation).
    clientMetadata: {
      client_id: clientId,
      client_name: "trainers.gg",
      client_uri: siteUrl,
      logo_uri: `${siteUrl}/logo.png`,
      tos_uri: `${siteUrl}/terms`,
      policy_uri: `${siteUrl}/privacy`,
      // Native deep link URI -- reverse domain of trainers.gg with single slash
      // per AT Protocol spec for native app redirect URIs
      redirect_uris: ["gg.trainers:/oauth/atproto-callback"],
      scope: "atproto transition:generic",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "native",
      // Public client -- mobile apps cannot securely store secrets
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
  });

  return _client;
}
