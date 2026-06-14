---
name: building-mobile-app
description: Use when building mobile screens, navigation, Tamagui UI, or any feature in apps/mobile
---

See `apps/mobile/CLAUDE.md` for directory structure, key files, and commands.

## Data Fetching

Use `createQuery` and `createMutation` from `src/lib/api/query-factory.ts` — do NOT write raw `useQuery` boilerplate. Each hook is a one-liner using the factory.

TanStack Query client configured in `src/lib/query-client.ts`.

## Supabase (Hybrid Data Access)

Mobile uses a **hybrid** read model — the split depends on whether the user is authenticated and which data bucket is being read:

| Read type | Path | Client |
| --- | --- | --- |
| **Authenticated reads** (any bucket) | Direct Supabase — RLS enforced via the SecureStore session | `@trainers/supabase/mobile` browser client with Bearer token |
| **Public/logged-out reads of S-bucket tables** | `/api/v1` Next.js route handlers (Bearer/anon) | `useApiQuery` from `@trainers/supabase/react-query`, same factory web uses |
| Auth / session management | Always direct Supabase | `@trainers/supabase/mobile` |

**Rationale:** Supabase API requests are unlimited on Pro — authenticated direct reads stay cheap. The Phase 2 anon-SELECT revoke broke logged-out direct reads of S-bucket base tables (communities, tournaments, etc.), so those unauthenticated reads move to the cached `/api/v1` layer instead.

**Cutover status (deferred):** The `api-*` edge-function retirement and the full public-read cutover to `/api/v1` are deferred until mobile dev resumes. The mobile `apiCall` helper already sends a Bearer token that `resolveApiAuth` on the web side accepts.

Do NOT reference `@supabase-cache-helpers` — that package was dropped from the mobile app.

Session is stored in SecureStore (not localStorage). Import from `@trainers/supabase/mobile`.

## UI

Tamagui components — **not shadcn/ui** (web only). Use theme tokens from `@trainers/theme` for colors. No shared UI package between web and mobile.

## Navigation

Expo Router file-based routing. Route groups: `(tabs)` for main tab bar, `(auth)` for unauthenticated flows. See `src/app/_layout.tsx` for root layout and auth redirect logic.

## AT Protocol

Auth differs from web: mobile uses SecureStore for session persistence. Hooks in `src/lib/atproto/` wrap `@trainers/atproto`.

## After Building Features

After developing a web feature, check if a matching mobile ticket exists. See `checking-mobile-parity` skill.
