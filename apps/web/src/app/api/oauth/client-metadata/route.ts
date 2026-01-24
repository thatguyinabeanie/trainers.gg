/**
 * Dynamic OAuth Client Metadata Endpoint
 *
 * Generates OAuth client metadata dynamically based on the request host.
 * This enables OAuth to work across:
 * - Production (trainers.gg)
 * - Vercel preview deployments (*.vercel.app)
 * - Local development with tunnels (ngrok, Cloudflare Tunnel)
 *
 * AT Protocol OAuth spec requires the client_id to be a URL that returns
 * this metadata document, and the URL must match exactly during authorization.
 */

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // The client_id IS this endpoint's URL (self-referential)
  const clientId = `${baseUrl}/api/oauth/client-metadata`;

  const metadata = {
    client_id: clientId,
    client_name: "trainers.gg",
    client_uri: baseUrl,
    logo_uri: `${baseUrl}/logo.png`,
    tos_uri: `${baseUrl}/terms`,
    policy_uri: `${baseUrl}/privacy`,
    redirect_uris: [`${baseUrl}/api/oauth/callback`],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
    dpop_bound_access_tokens: true,
    jwks_uri: `${baseUrl}/oauth/jwks.json`,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      // Cache for 1 hour - metadata rarely changes
      "Cache-Control": "public, max-age=3600",
    },
  });
}
