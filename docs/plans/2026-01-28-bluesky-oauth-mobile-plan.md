# Bluesky OAuth for Expo Mobile App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Bluesky (AT Protocol) OAuth sign-in to the Expo mobile app, bridging AT Protocol sessions to Supabase sessions via a shared edge function.

**Architecture:** Public OAuth client (`@atproto/oauth-client-expo`) on-device handles all AT Protocol crypto (DPoP, PKCE, PAR). After OAuth, a new Supabase edge function (`bluesky-auth`) verifies the DID and creates/finds a Supabase user, returning session tokens. Client metadata is served from a new Next.js API route.

**Tech Stack:** `@atproto/oauth-client-expo`, Supabase Edge Functions (Deno), Next.js API routes, Expo Router deep links, Tamagui UI

**Design Doc:** `docs/plans/2026-01-28-bluesky-oauth-mobile-design.md`

---

## Task 1: Mobile Client Metadata Endpoint (Next.js)

Serve AT Protocol OAuth client metadata for the mobile app from the existing web app.

**Files:**

- Create: `apps/web/src/app/api/oauth/mobile-client-metadata/route.ts`

**Step 1: Create the metadata route**

The redirect URI must use the reverse-domain of the `client_id` host with a single slash (AT Protocol spec). Since metadata is served from `trainers.gg`, the scheme is `gg.trainers`.

```typescript
// apps/web/src/app/api/oauth/mobile-client-metadata/route.ts

/**
 * Mobile OAuth Client Metadata Endpoint
 *
 * Serves AT Protocol OAuth client metadata for the Expo mobile app.
 * The client_id is self-referential (the URL of this endpoint).
 *
 * AT Protocol spec requires:
 * - client_id must exactly match the URL that returns this JSON
 * - Native redirect URIs use reverse-domain scheme with single slash
 * - HTTP 200 response (no redirects)
 *
 * GET /api/oauth/mobile-client-metadata
 */

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Prefer explicit site URL for tunnel/proxy scenarios
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
    // AT Protocol spec: native redirect URIs use reverse-domain with single slash
    // trainers.gg → gg.trainers:/oauth/atproto-callback
    redirect_uris: ["gg.trainers:/oauth/atproto-callback"],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "native",
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

**Step 2: Verify it works locally**

Run: `pnpm dev:web`
Then: `curl http://localhost:3000/api/oauth/mobile-client-metadata | jq .`
Expected: JSON with `client_id`, `application_type: "native"`, `redirect_uris` containing `gg.trainers:/oauth/atproto-callback`

**Step 3: Commit**

```bash
git add apps/web/src/app/api/oauth/mobile-client-metadata/route.ts
git commit -m "feat: add mobile OAuth client metadata endpoint for AT Protocol"
```

---

## Task 2: Bluesky Auth Edge Function (Supabase)

Create the edge function that bridges AT Protocol DID verification to Supabase sessions. This handles both sign-in/sign-up (Mode 1) and account linking (Mode 2).

**Files:**

- Create: `packages/supabase/supabase/functions/bluesky-auth/index.ts`

**Reference files:**

- `packages/supabase/supabase/functions/signup/index.ts` — edge function patterns (Deno.serve, CORS, response format)
- `packages/supabase/supabase/functions/provision-pds/index.ts` — JWT verification pattern
- `packages/supabase/supabase/functions/_shared/cors.ts` — CORS headers
- `apps/web/src/app/api/oauth/callback/route.ts` — user creation logic to replicate

**Step 1: Create the edge function**

```typescript
// packages/supabase/supabase/functions/bluesky-auth/index.ts

// Bluesky Auth Edge Function
// Bridges AT Protocol OAuth sessions to Supabase sessions.
//
// Mode 1 — Sign in / Sign up (Authorization: Bearer <anon_key>):
//   Input: { did, handle, pds_url, access_token }
//   1. Verify DID ownership via com.atproto.server.getSession on user's PDS
//   2. Lookup or create Supabase user
//   3. Return Supabase session tokens
//
// Mode 2 — Link to existing account (Authorization: Bearer <user_jwt>):
//   Input: { did, handle, pds_url, access_token, link: true }
//   1. Verify Supabase JWT → auth.uid()
//   2. Verify DID ownership
//   3. Link DID to existing user
//   4. Return success

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BlueskyAuthRequest {
  did: string;
  handle: string;
  pds_url: string;
  access_token: string;
  link?: boolean;
}

interface BlueskyAuthResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    did: string;
  };
  is_new?: boolean;
  error?: string;
  code?: string;
}

// Verify the caller owns the claimed DID by calling getSession on their PDS
async function verifyDidOwnership(
  pdsUrl: string,
  accessToken: string,
  expectedDid: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${pdsUrl}/xrpc/com.atproto.server.getSession`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return { valid: false, error: `PDS returned ${response.status}` };
    }

    const session = await response.json();

    if (session.did !== expectedDid) {
      return {
        valid: false,
        error: "DID mismatch: token does not belong to claimed DID",
      };
    }

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: `PDS verification failed: ${message}` };
  }
}

// Fetch a Bluesky profile from the public API
async function fetchBlueskyProfile(did: string): Promise<{
  handle: string;
  displayName?: string;
  avatar?: string;
} | null> {
  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;

    const profile = await response.json();
    return {
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
    };
  } catch {
    return null;
  }
}

// Sanitize a username from a Bluesky handle
function sanitizeUsername(handle: string): string {
  // Extract the first part before the first dot
  const baseUsername = handle.split(".")[0] || handle;

  // Only alphanumeric, underscores, hyphens
  let sanitized = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);

  // Ensure minimum length
  if (sanitized.length < 3) {
    sanitized = `user_${sanitized}`;
  }

  return sanitized;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: BlueskyAuthRequest = await req.json();
    const { did, handle, pds_url, access_token, link } = body;

    // Validate required fields
    if (!did || !handle || !pds_url || !access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: did, handle, pds_url, access_token",
          code: "MISSING_FIELDS",
        } satisfies BlueskyAuthResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Verify DID ownership via PDS
    const verification = await verifyDidOwnership(pds_url, access_token, did);
    if (!verification.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: verification.error || "DID verification failed",
          code: "INVALID_PROOF",
        } satisfies BlueskyAuthResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the Authorization header to check for user JWT
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    // MODE 2: Link DID to existing authenticated user
    if (link && jwt) {
      // Verify Supabase JWT
      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(jwt);

      if (userError || !user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid or expired session",
            code: "UNAUTHORIZED",
          } satisfies BlueskyAuthResponse),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check DID not already linked to another user
      const { data: existingDid } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("did", did)
        .neq("id", user.id)
        .maybeSingle();

      if (existingDid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This Bluesky account is already linked to another user",
            code: "DID_ALREADY_LINKED",
          } satisfies BlueskyAuthResponse),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Link DID to user
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          did,
          pds_handle: handle,
          pds_status: "active",
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to link DID:", updateError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to link Bluesky account",
            code: "DB_ERROR",
          } satisfies BlueskyAuthResponse),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: user.id, email: user.email || "", did },
        } satisfies BlueskyAuthResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // MODE 1: Sign in or sign up via Bluesky

    // Generate placeholder email from DID
    const didSlug = did.replace(/[^a-zA-Z0-9]/g, "_");
    const placeholderEmail = `${didSlug}@bluesky.trainers.gg`;

    // Check if user exists by DID (primary lookup)
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email, did")
      .eq("did", did)
      .maybeSingle();

    let userEmail: string;
    let userId: string;
    let isNew = false;

    if (existingUser && existingUser.email) {
      // Existing user — sign them in
      userEmail = existingUser.email;
      userId = existingUser.id;
    } else {
      // Fallback: check by placeholder email for legacy accounts
      const { data: userByEmail } = await supabaseAdmin
        .from("users")
        .select("id, email, did")
        .eq("email", placeholderEmail)
        .maybeSingle();

      if (userByEmail && userByEmail.email) {
        userEmail = userByEmail.email;
        userId = userByEmail.id;

        // Update DID if not set
        if (!userByEmail.did) {
          await supabaseAdmin
            .from("users")
            .update({ did, pds_status: "external" })
            .eq("id", userByEmail.id);
        }
      } else {
        // New user — create account
        isNew = true;

        // Fetch Bluesky profile for display info
        const profile = await fetchBlueskyProfile(did);
        const username = sanitizeUsername(profile?.handle || handle);

        // Create Supabase Auth account
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: placeholderEmail,
            email_confirm: true,
            user_metadata: {
              username,
              display_name: profile?.displayName,
              avatar_url: profile?.avatar,
              bluesky_handle: handle,
              did,
              auth_provider: "bluesky",
            },
          });

        if (authError) {
          // Handle "already registered" edge case
          if (authError.message?.includes("already been registered")) {
            const { data: existByEmail } = await supabaseAdmin
              .from("users")
              .select("id, email")
              .ilike("email", placeholderEmail)
              .maybeSingle();

            if (existByEmail) {
              await supabaseAdmin
                .from("users")
                .update({
                  did,
                  pds_handle: handle,
                  pds_status: "external",
                  image: profile?.avatar,
                })
                .eq("id", existByEmail.id);

              userEmail = placeholderEmail;
              userId = existByEmail.id;
              isNew = false;
            } else {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "Account conflict — please contact support",
                  code: "ACCOUNT_CONFLICT",
                } satisfies BlueskyAuthResponse),
                {
                  status: 409,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                }
              );
            }
          } else {
            console.error("Failed to create user:", authError);
            return new Response(
              JSON.stringify({
                success: false,
                error: authError.message || "Failed to create account",
                code: "AUTH_ERROR",
              } satisfies BlueskyAuthResponse),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } else if (authData?.user) {
          userId = authData.user.id;
          userEmail = placeholderEmail;

          // Update the user record with DID and profile data
          await supabaseAdmin
            .from("users")
            .update({
              did,
              pds_handle: handle,
              pds_status: "external",
              image: profile?.avatar,
            })
            .eq("id", authData.user.id);
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to create account",
              code: "AUTH_ERROR",
            } satisfies BlueskyAuthResponse),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Generate magic link for session
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail!,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Failed to generate magic link:", linkError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create session",
          code: "SESSION_ERROR",
        } satisfies BlueskyAuthResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the magic link to get session tokens
    const { data: verifyData, error: verifyError } =
      await supabaseAdmin.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

    if (verifyError || !verifyData.session) {
      console.error("Failed to verify magic link:", verifyError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create session",
          code: "SESSION_ERROR",
        } satisfies BlueskyAuthResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        user: {
          id: userId!,
          email: userEmail!,
          did,
        },
        is_new: isNew,
      } satisfies BlueskyAuthResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Bluesky auth error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      } satisfies BlueskyAuthResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

**Step 2: Test locally**

Run: `pnpm dev:backend`

Test with curl (Mode 1 — the DID verification will fail against a real PDS without a valid token, but the function should start and respond):

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/bluesky-auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"did":"did:plc:test","handle":"test.bsky.social","pds_url":"https://bsky.social","access_token":"fake"}'
```

Expected: 401 response with `"code": "INVALID_PROOF"` (because the fake token won't pass PDS verification)

**Step 3: Commit**

```bash
git add packages/supabase/supabase/functions/bluesky-auth/index.ts
git commit -m "feat: add bluesky-auth edge function for AT Protocol → Supabase session bridge"
```

---

## Task 3: Install AT Protocol Dependencies (Mobile)

Add `@atproto/oauth-client-expo` and configure the app scheme for AT Protocol.

**Files:**

- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

**Step 1: Install the package**

Run from repo root:

```bash
cd apps/mobile && pnpm add @atproto/oauth-client-expo @atproto/api
```

Note: `@atproto/oauth-client-expo` handles its own peer dependencies for crypto. `@atproto/api` is needed for creating the Agent after OAuth.

**Step 2: Add the reverse-domain scheme to app.json**

The AT Protocol spec requires native redirect URIs to use the reverse-domain of the `client_id` host. Since metadata is served from `trainers.gg`, the scheme must be `gg.trainers`. We keep the existing `trainers` scheme for other deep links.

Edit `apps/mobile/app.json` — add `gg.trainers` to the scheme:

```json
{
  "expo": {
    "scheme": ["trainers", "gg.trainers"],
    ...
  }
}
```

**Step 3: Verify installation**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No new type errors

**Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json pnpm-lock.yaml
git commit -m "feat: add @atproto/oauth-client-expo and configure gg.trainers scheme"
```

---

## Task 4: AT Protocol OAuth Client Setup (Mobile)

Create the OAuth client module that wraps `@atproto/oauth-client-expo`.

**Files:**

- Create: `apps/mobile/src/lib/atproto/oauth-client.ts`

**Reference:**

- `@atproto/oauth-client-expo` README — ExpoOAuthClient constructor, signIn(), restore()
- `apps/mobile/src/lib/supabase/client.ts` — lazy singleton pattern used in this codebase

**Step 1: Create the OAuth client module**

```typescript
// apps/mobile/src/lib/atproto/oauth-client.ts

import { ExpoOAuthClient } from "@atproto/oauth-client-expo";

// Lazy singleton — only created when first accessed
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

  // EXPO_PUBLIC_SITE_URL should point to the web app (e.g., https://trainers.gg
  // or https://<ngrok-id>.ngrok-free.app for local dev)
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "Missing EXPO_PUBLIC_SITE_URL. Set it in .env.local to point to the web app (e.g., https://trainers.gg or your ngrok URL)."
    );
  }

  const clientId = `${siteUrl}/api/oauth/mobile-client-metadata`;

  _client = new ExpoOAuthClient({
    handleResolver: "https://bsky.social",
    clientMetadata: {
      client_id: clientId,
      client_name: "trainers.gg",
      client_uri: siteUrl,
      logo_uri: `${siteUrl}/logo.png`,
      tos_uri: `${siteUrl}/terms`,
      policy_uri: `${siteUrl}/privacy`,
      redirect_uris: ["gg.trainers:/oauth/atproto-callback"],
      scope: "atproto transition:generic",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "native",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
  });

  return _client;
}
```

**Step 2: Verify types**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No type errors (this file doesn't import anything mobile-specific beyond the atproto package)

**Step 3: Commit**

```bash
git add apps/mobile/src/lib/atproto/oauth-client.ts
git commit -m "feat: add AT Protocol OAuth client setup for mobile"
```

---

## Task 5: Bluesky Sign-In in Auth Provider (Mobile)

Add `signInWithBluesky` and `linkBluesky` methods to the auth provider.

**Files:**

- Modify: `apps/mobile/src/lib/supabase/auth-provider.tsx`

**Step 1: Add the Bluesky auth methods**

Add to the `AuthContextType` interface:

```typescript
signInWithBluesky: (handle: string) =>
  Promise<{ error: Error | null; isNew?: boolean }>;
linkBluesky: (handle: string) => Promise<{ error: Error | null }>;
```

Add the implementations inside `AuthProvider`:

```typescript
const signInWithBluesky = async (handle: string) => {
  setLoading(true);

  try {
    const { getAtprotoOAuthClient } =
      await import("@/lib/atproto/oauth-client");
    const client = getAtprotoOAuthClient();

    // Start OAuth flow — opens system browser
    const result = await client.signIn(handle);

    // The ExpoOAuthClient.signIn() returns the session directly on success
    // Extract DID and session info
    const session = result;
    const did = session.did;

    // Get the PDS URL from the DID document (the session knows its PDS)
    // The session's server metadata contains the PDS URL
    const pdsUrl = session.serverMetadata?.issuer || session.pdsUrl;

    // Get an access token from the session to prove ownership
    // The session object has headers() which returns the DPoP-bound auth headers
    const headers = await session.fetchHandler.call(
      session,
      pdsUrl + "/xrpc/com.atproto.server.getSession",
      { method: "GET" }
    );

    // Call the bluesky-auth edge function
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setLoading(false);
      return { error: new Error("Missing Supabase configuration") };
    }

    // We need to send the DPoP-bound access token so the edge function
    // can verify DID ownership by calling getSession on the PDS.
    // However, DPoP tokens are bound to specific requests, so instead
    // we use the AT Protocol Agent to make a verified getSession call
    // and pass the result to prove ownership.
    const { Agent } = await import("@atproto/api");
    const agent = new Agent(session);

    // Verify we can access the session (proves DID ownership)
    const sessionInfo = await agent.com.atproto.server.getSession();

    if (sessionInfo.data.did !== did) {
      setLoading(false);
      return { error: new Error("DID verification failed") };
    }

    // Now call our edge function with the proof
    // Since DPoP tokens can't be forwarded, we pass the DID and
    // the edge function will re-verify via a separate getSession call.
    // The access_token here is the AT Protocol access token from the session.
    const response = await fetch(`${supabaseUrl}/functions/v1/bluesky-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        did,
        handle: sessionInfo.data.handle,
        pds_url: pdsUrl,
        access_token: session.accessToken,
      }),
    });

    const result2 = await response.json();

    if (!result2.success) {
      setLoading(false);
      return { error: new Error(result2.error || "Bluesky sign-in failed") };
    }

    // Set the Supabase session from the edge function response
    const { error: sessionError } = await getSupabase().auth.setSession({
      access_token: result2.access_token,
      refresh_token: result2.refresh_token,
    });

    setLoading(false);

    if (sessionError) {
      return { error: sessionError };
    }

    return { error: null, isNew: result2.is_new };
  } catch (err) {
    setLoading(false);
    return {
      error:
        err instanceof Error ? err : new Error("An unexpected error occurred"),
    };
  }
};

const linkBluesky = async (handle: string) => {
  setLoading(true);

  try {
    const { getAtprotoOAuthClient } =
      await import("@/lib/atproto/oauth-client");
    const client = getAtprotoOAuthClient();

    // Start OAuth flow
    const result = await client.signIn(handle);
    const session = result;
    const did = session.did;
    const pdsUrl = session.serverMetadata?.issuer || session.pdsUrl;

    // Get current Supabase session for JWT
    const {
      data: { session: supabaseSession },
    } = await getSupabase().auth.getSession();

    if (!supabaseSession) {
      setLoading(false);
      return { error: new Error("Not signed in") };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      setLoading(false);
      return { error: new Error("Missing Supabase configuration") };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/bluesky-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseSession.access_token}`,
      },
      body: JSON.stringify({
        did,
        handle: session.did, // Will be resolved by edge fn
        pds_url: pdsUrl,
        access_token: session.accessToken,
        link: true,
      }),
    });

    const result2 = await response.json();

    setLoading(false);

    if (!result2.success) {
      return { error: new Error(result2.error || "Failed to link Bluesky") };
    }

    // Refresh user data
    await fetchSession();
    return { error: null };
  } catch (err) {
    setLoading(false);
    return {
      error:
        err instanceof Error ? err : new Error("An unexpected error occurred"),
    };
  }
};
```

Add both methods to the context `value` object and `AuthContextType`.

**Step 2: Verify types**

Run: `cd apps/mobile && pnpm typecheck`

**Step 3: Commit**

```bash
git add apps/mobile/src/lib/supabase/auth-provider.tsx
git commit -m "feat: add signInWithBluesky and linkBluesky to mobile auth provider"
```

---

## Task 6: Bluesky Auth Button Component (Mobile)

Create a reusable Bluesky sign-in button with handle input.

**Files:**

- Create: `apps/mobile/src/components/auth/bluesky-auth-button.tsx`

**Reference:**

- `apps/mobile/src/app/(auth)/sign-in.tsx` — Tamagui UI patterns, Input styling, Button styling, error display
- `apps/web/src/components/auth/social-auth-buttons.tsx` — handle input dialog pattern from web

**Step 1: Create the component**

```typescript
// apps/mobile/src/components/auth/bluesky-auth-button.tsx

import { useState } from "react";
import { Alert, Modal, Pressable } from "react-native";
import { YStack, XStack, Text, Input, Button, Spinner } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "tamagui";

interface BlueskyAuthButtonProps {
  onSignIn: (handle: string) => Promise<{ error: Error | null }>;
  label?: string;
  loading?: boolean;
}

export function BlueskyAuthButton({
  onSignIn,
  label = "Sign in with Bluesky",
  loading: externalLoading,
}: BlueskyAuthButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const isLoading = loading || externalLoading;

  const handleSubmit = async () => {
    setError(null);

    const trimmed = handle.trim();
    if (!trimmed) {
      setError("Please enter your Bluesky handle");
      return;
    }

    // Basic handle validation — must contain a dot (e.g., user.bsky.social)
    if (!trimmed.includes(".")) {
      setError("Enter your full handle (e.g., username.bsky.social)");
      return;
    }

    setLoading(true);
    const { error: signInError } = await onSignIn(trimmed);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      setShowModal(false);
      setHandle("");
    }
  };

  return (
    <>
      <Button
        backgroundColor="$muted"
        borderWidth={0}
        borderRadius="$4"
        height={52}
        pressStyle={{ opacity: 0.85 }}
        opacity={isLoading ? 0.7 : 1}
        disabled={isLoading}
        onPress={() => setShowModal(true)}
      >
        <XStack alignItems="center" gap="$2">
          <Ionicons name="at-outline" size={20} color={theme.primary.val} />
          <Text color="$color" fontSize={16} fontWeight="600">
            {label}
          </Text>
        </XStack>
      </Button>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end" }}
          onPress={() => setShowModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <YStack
              backgroundColor="$background"
              borderTopLeftRadius="$6"
              borderTopRightRadius="$6"
              padding="$6"
              gap="$4"
              paddingBottom="$8"
            >
              <YStack alignItems="center" gap="$2">
                <Text fontSize={20} fontWeight="700" color="$color">
                  Sign in with Bluesky
                </Text>
                <Text
                  fontSize={14}
                  color="$mutedForeground"
                  textAlign="center"
                >
                  Enter your Bluesky handle to continue
                </Text>
              </YStack>

              {error && (
                <YStack
                  backgroundColor="$red3"
                  borderRadius="$4"
                  padding="$3"
                >
                  <Text color="$red10" textAlign="center" fontSize={14}>
                    {error}
                  </Text>
                </YStack>
              )}

              <Input
                backgroundColor="$muted"
                borderWidth={0}
                borderRadius="$4"
                paddingHorizontal="$4"
                paddingVertical="$3.5"
                fontSize={16}
                color="$color"
                placeholder="username.bsky.social"
                placeholderTextColor="$mutedForeground"
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              <Button
                backgroundColor="$primary"
                borderWidth={0}
                borderRadius="$4"
                height={52}
                pressStyle={{ opacity: 0.85 }}
                opacity={isLoading ? 0.7 : 1}
                disabled={isLoading}
                onPress={handleSubmit}
              >
                {isLoading ? (
                  <Spinner color="$primaryForeground" />
                ) : (
                  <Text
                    color="$primaryForeground"
                    fontSize={16}
                    fontWeight="600"
                  >
                    Continue
                  </Text>
                )}
              </Button>

              <Button
                backgroundColor="transparent"
                borderWidth={0}
                onPress={() => setShowModal(false)}
                disabled={isLoading}
              >
                <Text color="$mutedForeground" fontSize={14}>
                  Cancel
                </Text>
              </Button>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
```

**Step 2: Verify types**

Run: `cd apps/mobile && pnpm typecheck`

**Step 3: Commit**

```bash
git add apps/mobile/src/components/auth/bluesky-auth-button.tsx
git commit -m "feat: add BlueskyAuthButton component for mobile"
```

---

## Task 7: Add Bluesky Button to Sign-In Screen (Mobile)

Add the Bluesky sign-in option to the existing sign-in screen.

**Files:**

- Modify: `apps/mobile/src/app/(auth)/sign-in.tsx`

**Step 1: Add the Bluesky button**

Import the component and auth method, then add it between the "Sign In" button and the "Don't have an account?" text. Add a visual separator.

After the `</Button>` for "Sign In" (around line 186), add:

```tsx
{
  /* Separator */
}
<XStack alignItems="center" gap="$3" marginVertical="$1">
  <YStack flex={1} height={1} backgroundColor="$muted" />
  <Text fontSize={12} color="$mutedForeground">
    OR
  </Text>
  <YStack flex={1} height={1} backgroundColor="$muted" />
</XStack>;

{
  /* Bluesky sign-in */
}
<BlueskyAuthButton
  onSignIn={async (handle) => {
    const { error, isNew } = await signInWithBluesky(handle);
    if (!error) {
      router.replace(isNew ? "/(tabs)/home" : "/(tabs)/home");
    }
    return { error };
  }}
  loading={loading}
/>;
```

Add imports at top:

```typescript
import { BlueskyAuthButton } from "@/components/auth/bluesky-auth-button";
```

Update the destructured auth hook to include `signInWithBluesky`:

```typescript
const { signInWithEmail, signInWithBluesky, loading } = useAuth();
```

**Step 2: Verify types and visual**

Run: `cd apps/mobile && pnpm typecheck`
Run the app on simulator: `cd apps/mobile && pnpm dev` and navigate to sign-in screen

Expected: Sign-in screen shows email/password fields, "Sign In" button, "OR" separator, then "Sign in with Bluesky" button

**Step 3: Commit**

```bash
git add apps/mobile/src/app/\(auth\)/sign-in.tsx
git commit -m "feat: add Bluesky sign-in button to mobile sign-in screen"
```

---

## Task 8: Add Bluesky Link to Profile Screen (Mobile)

Wire up the existing Bluesky connection placeholder on the profile screen.

**Files:**

- Modify: `apps/mobile/src/app/(tabs)/profile.tsx`

**Step 1: Add onPress handler and connected state**

The profile screen already has a `ListItem` for Bluesky at line 210-214. Update it to:

1. Show connected/disconnected state based on user's `did` in metadata
2. Add `onPress` to trigger the linking flow

```tsx
// Add to imports
import { useAuth } from "@/lib/supabase";
import { Alert } from "react-native";

// Inside ProfileScreen, after the existing useAuth() call:
const did = user?.user_metadata?.did as string | undefined;

// Replace the Bluesky ListItem:
<ListItem
  title="Bluesky"
  subtitle={
    did
      ? `Connected as ${user?.user_metadata?.bluesky_handle || "linked"}`
      : "Connect your Bluesky account"
  }
  icon="at-outline"
  iconColor={theme.primary.val}
  rightText={did ? "Connected" : undefined}
  onPress={
    did
      ? undefined
      : () => {
          // Show handle input for linking
          Alert.prompt(
            "Link Bluesky",
            "Enter your Bluesky handle (e.g., username.bsky.social)",
            async (handle) => {
              if (handle) {
                const { error } = await linkBluesky(handle);
                if (error) {
                  Alert.alert("Error", error.message);
                } else {
                  Alert.alert("Success", "Bluesky account linked!");
                }
              }
            }
          );
        }
  }
/>;
```

Note: `Alert.prompt` is iOS only. For cross-platform, consider using the `BlueskyAuthButton` component instead or a modal. If cross-platform support is needed, use a state-driven modal pattern similar to the sign-in screen.

**Alternative (cross-platform):** Import and use `BlueskyAuthButton` with `label="Link Bluesky"` and `onSignIn={linkBluesky}`, replacing the `ListItem` with a button when unlinked.

**Step 2: Update useAuth destructuring**

```typescript
const { user, loading, isAuthenticated, linkBluesky } = useAuth();
```

**Step 3: Verify types**

Run: `cd apps/mobile && pnpm typecheck`

**Step 4: Commit**

```bash
git add apps/mobile/src/app/\(tabs\)/profile.tsx
git commit -m "feat: wire up Bluesky connection on mobile profile screen"
```

---

## Task 9: Environment Variable Setup

Add the required env var for local development.

**Files:**

- Modify: `packages/supabase/scripts/setup-local.sh`

**Step 1: Add EXPO_PUBLIC_SITE_URL to the generated .env.local**

In `setup-local.sh`, after the existing env var generation, add `EXPO_PUBLIC_SITE_URL`:

```bash
# Add after the existing EXPO_PUBLIC_SUPABASE_ANON_KEY line:
echo "" >> "$ENV_FILE"
echo "# AT Protocol OAuth (set to your ngrok URL for Bluesky OAuth testing)" >> "$ENV_FILE"
echo "# EXPO_PUBLIC_SITE_URL=https://<your-ngrok-id>.ngrok-free.app" >> "$ENV_FILE"
```

This is commented out by default since ngrok URLs change per session. Users uncomment and update when testing Bluesky OAuth locally.

**Step 2: Commit**

```bash
git add packages/supabase/scripts/setup-local.sh
git commit -m "feat: add EXPO_PUBLIC_SITE_URL env var for mobile AT Protocol OAuth"
```

---

## Task 10: End-to-End Testing

Test the full Bluesky OAuth flow locally.

**Prerequisites:**

1. Docker running
2. A real Bluesky account to test with (e.g., on bsky.social)

**Step 1: Start services**

```bash
# Terminal 1: Start everything
pnpm dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000
```

**Step 2: Configure env vars**

Update `.env.local` at repo root:

```bash
NEXT_PUBLIC_SITE_URL=https://<ngrok-id>.ngrok-free.app
EXPO_PUBLIC_SITE_URL=https://<ngrok-id>.ngrok-free.app
```

Restart `pnpm dev` to pick up the changes.

**Step 3: Verify metadata endpoint**

```bash
curl https://<ngrok-id>.ngrok-free.app/api/oauth/mobile-client-metadata | jq .
```

Expected: JSON with `client_id` matching the ngrok URL, `application_type: "native"`

**Step 4: Test on device/simulator**

1. Open Expo app on device
2. Navigate to Sign In screen
3. Tap "Sign in with Bluesky"
4. Enter a real Bluesky handle (e.g., `yourname.bsky.social`)
5. System browser opens to Bluesky auth page
6. Authorize the app
7. App should receive the callback and sign in

**Step 5: Verify in database**

```bash
pnpm supabase sql "SELECT id, username, did, pds_status FROM users ORDER BY created_at DESC LIMIT 5"
```

Expected: New user with `pds_status = 'external'` and a valid DID

**Step 6: Test account linking (Flow B)**

1. Sign in with email/password first
2. Go to Profile → Connections → Bluesky
3. Enter a Bluesky handle
4. Authorize
5. Profile should show "Connected"

---

## Task Summary

| Task | Description                               | Dependencies |
| ---- | ----------------------------------------- | ------------ |
| 1    | Mobile client metadata endpoint (Next.js) | None         |
| 2    | Bluesky auth edge function (Supabase)     | None         |
| 3    | Install AT Protocol deps + scheme config  | None         |
| 4    | OAuth client setup module (Mobile)        | Task 3       |
| 5    | Auth provider Bluesky methods             | Task 3, 4    |
| 6    | BlueskyAuthButton component               | Task 5       |
| 7    | Add to sign-in screen                     | Task 5, 6    |
| 8    | Wire up profile connections               | Task 5       |
| 9    | Environment variable setup                | None         |
| 10   | End-to-end testing                        | All above    |

Tasks 1, 2, 3, and 9 can run in parallel. Tasks 4-8 are sequential. Task 10 is the final verification.

---

## Important Notes

### Redirect URI Format

AT Protocol requires native redirect URIs to use the **reverse domain** of the `client_id` host with a **single slash**:

- Domain: `trainers.gg` → Reverse: `gg.trainers`
- Full redirect URI: `gg.trainers:/oauth/atproto-callback`
- NOT `gg.trainers://` (double slash is invalid per AT Protocol spec)

### DPoP Token Forwarding

DPoP-bound access tokens **cannot** be forwarded to the edge function because they're bound to specific HTTP requests. The edge function independently verifies DID ownership by making its own `getSession` call to the user's PDS with the AT Protocol access token. This works because the token is bound to the PDS, not to the edge function's endpoint.

**Update:** After further research, the edge function approach of calling `getSession` with a DPoP-bound token from a different origin may not work. If this fails during testing, the fallback is:

1. Have the mobile app call `getSession` itself
2. Pass the verified session data (DID, handle) to the edge function
3. Use a signed timestamp/nonce from the mobile app as proof
4. The edge function trusts the anon key + proof combination

This would require adjusting the edge function's verification logic. Test with the direct approach first.

### ExpoOAuthClient.signIn() Return Type

The `signIn()` method on `ExpoOAuthClient` returns an `OAuthSession` object directly (not wrapped in a result type). The session has:

- `.did` — the authenticated user's DID
- `.accessToken` — the DPoP-bound access token
- `.serverMetadata` — PDS server metadata including issuer URL

If the user cancels or an error occurs, `signIn()` throws. Wrap in try/catch.
