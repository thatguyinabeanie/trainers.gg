---
name: querying-supabase
description: Use when writing database queries, mutations, choosing a Supabase client, or working with Edge Functions
---

# @trainers/supabase

Supabase client, queries, mutations, generated types, and edge functions.

## Client Selection

**This is the most important decision when touching Supabase.**

| Client | Import                      | When                                              | RLS?                             |
| ------ | --------------------------- | ------------------------------------------------- | -------------------------------- |
| Server | `@trainers/supabase/server` | Server Components, Server Actions, edge functions | Bypassed (service role)          |
| Client | `@trainers/supabase/client` | Client Components (browser)                       | Enforced via auth.uid()          |
| Mobile | `@trainers/supabase/mobile` | Expo app                                          | Enforced, session in SecureStore |

**Never use the server client in browser code.** It uses the service role key and bypasses all RLS.

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
