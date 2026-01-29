# Bluesky OAuth for Expo Mobile App

## Overview

Add Bluesky (AT Protocol) OAuth authentication to the Expo mobile app using `@atproto/oauth-client-expo` as a **public client**. A new Supabase edge function bridges AT Protocol sessions to Supabase sessions.

## Architecture

```
                         Mobile App (Expo)
                    @atproto/oauth-client-expo
                    ┌─────────────────────────┐
                    │ DPoP, PKCE, PAR, tokens  │
                    │ System browser for auth   │
                    │ Deep link callback        │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
   trainers.gg (Next.js)   User's PDS       Supabase Edge Fn
   ┌────────────────┐    ┌──────────┐      ┌──────────────────┐
   │ Serves client  │    │ Auth     │      │ bluesky-auth     │
   │ metadata at    │    │ server   │      │                  │
   │ /api/oauth/    │    │ (bsky,   │      │ DID + proof      │
   │ mobile-client- │    │ custom   │      │ → Supabase       │
   │ metadata       │    │ PDS)     │      │   session        │
   └────────────────┘    └──────────┘      └──────────────────┘
```

### Design Decisions

| Decision           | Choice                                       | Rationale                                              |
| ------------------ | -------------------------------------------- | ------------------------------------------------------ |
| OAuth client type  | Public client (`@atproto/oauth-client-expo`) | Official SDK, same pattern as Bluesky's own app        |
| Token storage      | `expo-secure-store` (hardware-backed)        | AT Protocol best practice for mobile                   |
| Session bridge     | Supabase edge function                       | Single source of truth, shared across platforms        |
| Client metadata    | Dynamic Next.js route                        | Reuses existing web infrastructure, supports local dev |
| Proof verification | `getSession` call on user's PDS              | Simple, reliable, no custom DPoP verification needed   |

## Authentication Flows

### Flow A: Standalone Sign-In / Sign-Up

```
1. User taps "Sign in with Bluesky"
2. Bottom sheet appears → user enters Bluesky handle
3. @atproto/oauth-client-expo initiates OAuth:
   ├── Resolves handle → DID → PDS authorization server
   ├── Sends PAR request with PKCE + DPoP
   └── Opens system browser to PDS auth page
4. User authorizes trainers.gg
5. PDS redirects to trainers://oauth/atproto-callback
6. App catches deep link, SDK exchanges code for tokens
7. Now have: DID + AT Protocol session (on-device)

   ═══ Bridge to Supabase ═══

8. POST /functions/v1/bluesky-auth
   Body: { did, handle, atproto_proof: { access_token } }

9. Edge function:
   ├── Verify DID via getSession on user's PDS
   ├── Lookup users.did = {did}
   │   ├── Found → Generate Supabase session → return tokens
   │   └── Not found:
   │       ├── Fetch Bluesky profile (displayName, avatar)
   │       ├── Create Supabase Auth user (placeholder email)
   │       ├── Set pds_status = 'external'
   │       └── Generate Supabase session → return tokens
   └── Return { access_token, refresh_token, user, is_new }

10. App stores Supabase session
11. Navigate to onboarding (if is_new) or home
```

### Flow B: Link Bluesky to Existing Account

```
1. User already signed into Supabase (email/password)
2. Settings → "Link Bluesky Account"
3. Bottom sheet → enter handle → OAuth flow (steps 3-7 above)
4. POST /functions/v1/bluesky-auth
   Headers: { Authorization: Bearer <supabase_jwt> }
   Body: { did, handle, atproto_proof, link: true }

5. Edge function:
   ├── Verify Supabase JWT → auth.uid()
   ├── Verify DID via getSession
   ├── Check DID not already linked to another user
   ├── Update users: did, pds_handle, pds_status = 'active'
   └── Return { success: true }

6. App shows success → refresh profile
```

## New Files

### `apps/web/src/app/api/oauth/mobile-client-metadata/route.ts`

Dynamic AT Protocol client metadata for the mobile app:

```json
{
  "client_id": "https://trainers.gg/api/oauth/mobile-client-metadata",
  "application_type": "native",
  "client_name": "trainers.gg",
  "grant_types": ["authorization_code", "refresh_token"],
  "scope": "atproto transition:generic",
  "response_types": ["code"],
  "redirect_uris": ["trainers://oauth/atproto-callback"],
  "dpop_bound_access_tokens": true,
  "token_endpoint_auth_method": "none"
}
```

- `client_id` is set dynamically from the request URL (supports ngrok for local dev)
- Returns HTTP 200 with no redirects (AT Protocol requirement)

### `packages/supabase/supabase/functions/bluesky-auth/index.ts`

Edge function with two modes:

**Mode 1 — Sign in / Sign up (anon key auth):**

| Step | Action                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Receive `{ did, handle, atproto_proof }`                                                                                                                                  |
| 2    | Resolve DID → PDS endpoint                                                                                                                                                |
| 3    | Call `com.atproto.server.getSession` with access token on user's PDS                                                                                                      |
| 4    | Verify returned DID matches claimed DID                                                                                                                                   |
| 5    | Lookup `users.did = {did}`                                                                                                                                                |
| 6a   | **Found:** Generate magic link → verify → return Supabase session                                                                                                         |
| 6b   | **Not found:** Fetch Bluesky profile, create Supabase user (email: `{did_sanitized}@bluesky.trainers.gg`), set `pds_status = 'external'`, return session + `is_new: true` |

**Mode 2 — Link to existing account (JWT auth):**

| Step | Action                                                          |
| ---- | --------------------------------------------------------------- |
| 1    | Verify Supabase JWT → `auth.uid()`                              |
| 2    | Verify AT Protocol proof (same as above)                        |
| 3    | Check DID not linked to another user                            |
| 4    | Update `users` SET `did`, `pds_handle`, `pds_status = 'active'` |
| 5    | Return `{ success: true }`                                      |

**Error responses:**

| Error                              | HTTP | Code                 |
| ---------------------------------- | ---- | -------------------- |
| Invalid/expired AT Protocol proof  | 401  | `invalid_proof`      |
| DID already linked to another user | 409  | `did_already_linked` |
| Username conflict during signup    | 409  | `username_taken`     |
| PDS unreachable for verification   | 502  | `pds_unreachable`    |

### `apps/mobile/src/lib/atproto/oauth-client.ts`

Setup for `@atproto/oauth-client-expo`:

- `client_id` from `EXPO_PUBLIC_SITE_URL` + `/api/oauth/mobile-client-metadata`
- Redirect URI: `trainers://oauth/atproto-callback`
- Scopes: `atproto transition:generic`
- Token storage: `expo-secure-store`

### `apps/mobile/src/lib/atproto/config.ts`

Configuration constants:

- `ATPROTO_REDIRECT_URI = "trainers://oauth/atproto-callback"`
- `ATPROTO_SCOPES = "atproto transition:generic"`
- `getClientId()` — returns metadata URL based on environment

### `apps/mobile/src/components/auth/bluesky-auth-button.tsx`

- "Sign in with Bluesky" button
- Opens bottom sheet for handle input
- Validates handle format
- Calls the OAuth client to start the flow

### `apps/mobile/src/app/oauth/atproto-callback.tsx`

Deep link handler:

- Registered for `trainers://oauth/atproto-callback`
- Receives the OAuth callback params
- Passes them to `@atproto/oauth-client-expo` for code exchange
- Calls the `bluesky-auth` edge function with the resulting DID + proof
- Stores the Supabase session
- Navigates to onboarding or home

## Modified Files

| File                                             | Change                                       |
| ------------------------------------------------ | -------------------------------------------- |
| `apps/mobile/package.json`                       | Add `@atproto/oauth-client-expo` + peer deps |
| `apps/mobile/app.json`                           | Verify `trainers://` scheme in deep links    |
| `apps/mobile/src/lib/supabase/auth-provider.tsx` | Add `signInWithBluesky()` method             |
| `apps/mobile/src/app/(auth)/sign-in.tsx`         | Add Bluesky auth button                      |
| `packages/supabase/supabase/functions/.env`      | No new secrets needed                        |

## Local End-to-End Testing

### Prerequisites

1. Docker running (for local Supabase)
2. `pnpm dev` (starts Supabase + Next.js + edge functions)
3. `ngrok http 3000` (tunnel for client metadata)
4. Update `.env.local`:
   - `NEXT_PUBLIC_SITE_URL=https://<ngrok-id>.ngrok-free.app`
   - `EXPO_PUBLIC_SITE_URL=https://<ngrok-id>.ngrok-free.app`
5. Expo dev client on physical device or simulator

### Flow

```
Mobile app                     ngrok                     Local machine
──────────                     ─────                     ─────────────
1. Tap "Sign in
   with Bluesky"

2. SDK fetches           ──►  https://<ngrok>/api/  ──►  Next.js :3000
   client metadata            oauth/mobile-client-       returns metadata
                              metadata                   (client_id = ngrok URL)

3. SDK resolves          ──►  bsky.social / PDS          (direct internet)
   handle → auth server

4. System browser        ──►  User's PDS auth page       (direct internet)
   opens

5. PDS redirects to      ──►  trainers://oauth/     ──►  Expo catches
   redirect_uri               atproto-callback           deep link

6. SDK exchanges         ──►  User's PDS                 (direct internet)
   code for tokens             (DPoP + PKCE)

7. App calls edge fn     ──►  http://<local-ip>:54321 ►  Local Supabase
                              /functions/v1/              edge runtime
                              bluesky-auth

8. User signed in
```

### What already works

- ngrok tunnel setup (existing `NEXT_PUBLIC_SITE_URL` pattern)
- `trainers://` deep link scheme (configured in `app.json`)
- Local Supabase with edge functions (`pnpm dev`)
- Mobile → local Supabase connectivity (`EXPO_PUBLIC_SUPABASE_URL`)

## Future: Web Migration (Phase 2)

The web app currently handles DID → Supabase user logic inline in `/api/oauth/callback/route.ts`. In a future phase, the web callback could be refactored to call the same `bluesky-auth` edge function, giving a single source of truth for both platforms.

This is optional and does not block mobile implementation.

## Dependencies

### New npm packages (mobile)

- `@atproto/oauth-client-expo` — Official AT Protocol OAuth for Expo
- Peer dependencies as required by the package (check npm listing)

### No new edge function secrets

The `bluesky-auth` edge function only needs:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already available in edge function env)
- No PDS admin credentials needed (verification uses the user's own access token)
