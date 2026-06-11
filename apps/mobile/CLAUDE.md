# Mobile App (`apps/mobile`)

Expo 55 (React Native 0.83) with Tamagui UI and Expo Router.

## Key Paths

- `src/app/` — Expo Router screens; groups `(auth)`, `(tabs)`, plus `organizations/`, `tournaments/`
- `src/components/` — feature components (`auth/`, `navigation/`, `tournament/`, `ui/`)
- `src/lib/` — Supabase mobile client, TanStack Query factories, SecureStore helpers
- `src/types/` — shared TypeScript types for the mobile app
- `src/tamagui.config.ts` — Tamagui theme/token config
- `assets/` — images, fonts, icons

## Notes

- Mobile hits Supabase directly — no Next.js API routes
- Query key factories: `src/lib/api/query-factory.ts` is the reference pattern
- Supabase client: `@trainers/supabase/mobile` (session stored in SecureStore)
- Styling: Tamagui tokens from `@trainers/theme` — no Tailwind

## Skills

- `building-mobile-app` — screens, Tamagui UI, Expo Router, SecureStore
- `querying-supabase` — Supabase client selection, query/mutation conventions
- `checking-mobile-parity` — verify feature parity with web after web changes

---

## Deferred Security Items — Address When Mobile Work Resumes

> Surfaced by the June 2026 code-layer security review. The mobile app is not yet published; these items are intentionally deferred until mobile development resumes.

### F-1 (HIGH — critical) — `bluesky-auth` edge function trusts a public DID with no ownership proof

**File:** `packages/supabase/supabase/functions/bluesky-auth/index.ts`

**What happens today:**

1. Mobile completes AT Protocol OAuth and obtains an access token.
2. Mobile sends only `{ did, handle }` strings to the `bluesky-auth` edge function.
3. The function "verifies" the caller via a **public** `public.api.bsky.app` profile lookup — it does NOT prove the caller controls the DID's keys.
4. On match, the function mints a Supabase session for that account.

**Why this is critical:** DID and handle are fully public. Anyone who knows a victim's DID can send `{ did, handle }` and receive a valid Supabase session for that account. No secret material is required.

**Scope:** Web sign-in is NOT affected. Web uses a full server-side OAuth code-exchange via `NodeOAuthClient` and never calls `bluesky-auth`.

**Fix options (pick one when mobile resumes):**

- **(a) Nonce + DPoP ownership proof** — The edge function issues a short-lived nonce. The mobile client echoes it back via its live AT Protocol session (e.g., signs a request or calls a protected AT Protocol endpoint with the nonce in the payload). The function verifies the echo before minting a Supabase session. This proves the caller holds live AT Protocol credentials for the DID.
  - Note: DPoP tokens are key-bound — a bare token-forward does NOT work; the client must use its own keys to produce the proof.

- **(b) Server-side OAuth proxy** — Move mobile sign-in onto the same verified server-side code-exchange the web already uses. The mobile app redirects through a Next.js route that performs the full AT Protocol code-exchange (same `NodeOAuthClient` path). This eliminates the `bluesky-auth` edge function for mobile entirely.

### F-6 (mobile half) — `api-*` edge functions leak raw `error.message` in 500 responses

**Affected functions:** `api-notifications`, `api-matches`, `api-alts`, `api-organizations`, `api-tournaments`

**What happens today:** Unhandled errors return the raw `error.message` or stack trace in the 500 response body, leaking internal implementation details to mobile clients.

**Context:** These functions are slated to retire as mobile migrates to Next.js routes (per `docs/decisions/2026-06-11-data-access-and-rls-decisions.md`).

**When mobile resumes — choose one:**

- **Preferred:** Complete the migration off these functions onto Next.js routes (sanitized error handling is already the convention there).
- **If migration is not ready:** Sanitize 500 bodies to a generic `{ error: "Internal server error" }` message and log full detail server-side only.

### Token handling reminder

- Auth tokens MUST be stored in `expo-secure-store` (native encrypted storage).
- Never store tokens in `AsyncStorage` — it is unencrypted and accessible to other apps on rooted devices.
- Never log token values, even partially.
