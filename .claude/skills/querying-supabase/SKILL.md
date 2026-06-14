---
name: querying-supabase
description: Use when writing database queries, mutations, choosing a Supabase client, or working with Edge Functions
---

# @trainers/supabase

Supabase client, queries, mutations, generated types, and edge functions.

## Client Selection

**This is the most important decision when touching Supabase.**

| Client                      | Import                      | When                                                                                                        | RLS?                               |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `createStaticClient()`      | `@trainers/supabase/server` | Public `'use cache'` fetchers — only for anon-granted views; **not** S-bucket base tables                  | Enforced (anon role)               |
| `createClientReadOnly()`    | `@trainers/supabase/server` | Authenticated server reads (Server Components)                                                              | Enforced via auth.uid()            |
| `createClient()`            | `@trainers/supabase/server` | Authenticated mutations (Server Actions)                                                                    | Enforced via auth.uid()            |
| `createServiceRoleClient()` | `@trainers/supabase/server` | Admin ops; `/api/v1` routes reading Phase 2 revoke-set base tables (requires column allowlist + `resolveApiAuth` + rate-limit) | Bypassed — use with guards  |
| Client                      | `@trainers/supabase/client` | Client Components (browser) — authenticated only                                                            | Enforced via auth.uid()            |
| Mobile                      | `@trainers/supabase/mobile` | Expo app (authenticated session only — anon SELECT revoked on S-bucket base tables)                         | Enforced, session in SecureStore   |

**Never use the server client in browser code.** `createServiceRoleClient()` bypasses all RLS — always pair it with an explicit column allowlist, `resolveApiAuth` (`apps/web/src/lib/api/auth.ts`), and `enforceRateLimit`. See `deciding-data-access` skill.

## Read Path by Data Bucket

Every Supabase read belongs to one of four buckets. Pick the path for the bucket — do not mix them.

| Data class | Read path | Client / mechanism |
| --- | --- | --- |
| **S-bucket** (shared-public) client read | `/api/v1` Next.js route handler | `useApiQuery` (`@trainers/supabase/react-query`) → `'use cache'` fetcher → `createStaticClient()` (anon-granted views) or `createServiceRoleClient()` (revoke-set base tables, guarded) |
| **S-bucket** SSR read | Direct DB in Server Component | `createStaticClient()` / `createServiceRoleClient()` inside `'use cache'` |
| **P-bucket** (per-user) client read | Direct PostgREST + RLS | Authenticated browser client + plain `useQuery` with keys from `apps/web/src/lib/query-keys.ts` |
| **Realtime six** | Direct subscription, payload-driven | Browser client, `postgres_changes`, `setQueryData(payload.new)` |
| **X-bucket** (system) | Service role only | `createServiceRoleClient()` |

**S-bucket base tables have anon SELECT revoked** (19 tables). The realtime six — `notifications`, `match_games`, `match_messages`, `tournament_matches`, `tournament_registrations`, `tournament_rounds` — retain authenticated SELECT for live subscriptions. All other S-bucket reads go through `/api/v1`.

**P-bucket tables** (9): `notifications`, `user_preferences`, `notification_preferences`, `atproto_sessions`, `linked_atproto_accounts`, `discord_user_dm_preferences`, `tournament_invitations`, `feature_usage`, `subscriptions`. These are safe for direct browser reads via the authenticated client + RLS.

Note: never use an authenticated client inside a `'use cache'` scope — the auth cookie is a dynamic input that breaks static caching. The `/api/v1` route handler resolves auth _outside_ the cache scope via `resolveApiAuth`, then passes only plain scalar values into the cached fetcher.

## Generated Types

```bash
pnpm generate-types   # Regenerate after any schema change
```

Types live in `src/types.ts` (auto-generated — do not hand-edit). AT Protocol session types are in `src/types-atproto.ts` (manually maintained).

## Query / Mutation Conventions

- Use `maybeSingle()` not `single()` when a missing record is valid — `single()` throws 406 if not found
- Queries return `null` when not found
- Mutations return `{ success: boolean, error?: string }`

## Finding Things

Browse `src/queries/` and `src/mutations/` before writing new operations — organized by domain. Check `src/index.ts` for all re-exports.

## Edge Functions

All functions in `supabase/functions/<name>/index.ts`. Deno runtime — use Deno imports, not Node.

```typescript
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  // ...
});
```

Shared utilities in `supabase/functions/_shared/` — import with relative paths.

**Never deploy edge functions manually.** Changes deploy via git → merge to main.

## Commands

```bash
pnpm --filter @trainers/supabase test          # Unit tests
pnpm --filter @trainers/supabase test:watch    # Watch mode
pnpm db:start                                  # Start local Supabase (required for integration tests)
pnpm db:reset                                  # Reset DB + replay migrations + seed
pnpm generate-types                            # Regenerate types.ts from schema
```

## Testing

- **Unit tests**: `src/__tests__/` — mock the Supabase client
- **Integration tests**: `src/__tests__/integration/` — require local Supabase (`pnpm db:start`)
- **Test helpers**: `src/__tests__/integration/test-helpers.ts` — `createTestUser()`, `createTestTournament()`, `createTournamentScenario()`
- `isSupabaseRunning()` auto-skips integration tests when local Supabase is unavailable

## While Writing Queries

Keep these in mind — don't wait for review to catch them:

- **Avoid N+1**: Use `.in()` or joins instead of looping with individual queries
- **Add `.limit()`**: Any query that could grow unboundedly needs a limit
- **Use `Promise.all`**: Independent queries should run in parallel
- **Push aggregation to SQL**: `COUNT`, `GROUP BY`, `DISTINCT` belong in the DB, not JS
- **Index new columns**: If you add a column used in `WHERE`, `JOIN`, or `ORDER BY`, add an index in the migration
- **Check RLS**: New tables need `ENABLE ROW LEVEL SECURITY` + policies
- **Cache invalidation**: Server actions that mutate data must call `updateTag(CacheTags.xxx)`

See `reviewing-database` skill for the full checklist.
