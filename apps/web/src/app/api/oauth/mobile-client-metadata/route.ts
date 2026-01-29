/**
 * Mobile OAuth Client Metadata Endpoint
 *
 * Serves AT Protocol OAuth client metadata for the Expo mobile app.
 * This is the native app counterpart to the web client metadata endpoint.
 *
 * Key differences from the web metadata endpoint:
 * - application_type is "native" (not "web")
 * - token_endpoint_auth_method is "none" (public client, no secrets)
 * - Redirect URI uses a native deep link (gg.trainers:/oauth/atproto-callback)
 * - No JWKS or signing algorithm (public clients cannot hold secrets)
 *
 * AT Protocol OAuth spec requires:
 * - client_id must be a URL that returns this metadata document
 * - This endpoint must return HTTP 200 with no redirects
 * - DPoP bound access tokens must be enabled
 */

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Prefer explicit site URL for tunnel/proxy scenarios where request.url
  // reflects the internal host (e.g., 127.0.0.1) instead of the public URL
  const url = new URL(request.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || `${url.protocol}//${url.host}`;

  // The client_id IS this endpoint's URL (self-referential)
  const clientId = `${baseUrl}/api/oauth/mobile-client-metadata`;

  const metadata = {
    client_id: clientId,
    client_name: "trainers.gg",
    client_uri: baseUrl,
    logo_uri: `${baseUrl}/logo.png`,
    tos_uri: `${baseUrl}/terms`,
    policy_uri: `${baseUrl}/privacy`,
    // Native deep link URI — reverse domain of trainers.gg with single slash
    // per AT Protocol spec for native app redirect URIs
    redirect_uris: ["gg.trainers:/oauth/atproto-callback"],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "native",
    // Public client — mobile apps cannot securely store secrets
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      // Cache for 1 hour — metadata rarely changes
      "Cache-Control": "public, max-age=3600",
    },
  });
}
