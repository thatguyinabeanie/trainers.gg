# @trainers/supabase

Supabase client, queries, mutations, generated types, and edge functions.

## Client Selection

| Client | Import                      | When to use                                       | RLS?                             |
| ------ | --------------------------- | ------------------------------------------------- | -------------------------------- |
| Server | `@trainers/supabase/server` | Server Components, Server Actions, edge functions | Bypassed (service role)          |
| Client | `@trainers/supabase/client` | Client Components (browser)                       | Enforced via auth.uid()          |
| Mobile | `@trainers/supabase/mobile` | Expo app                                          | Enforced, session in SecureStore |

**Never use the server client in browser code.** It uses the service role key and bypasses all RLS policies.

## Generated Types

```bash
pnpm generate-types   # Regenerate after any schema change
```

Types live in `src/types.ts` (auto-generated — do not hand-edit).
AT Protocol session types are in `src/types-atproto.ts` (manually maintained).

## Query / Mutation Conventions

- Queries return `null` when record not found — use `maybeSingle()` not `single()` unless the record must exist
- Mutations return `{ success: boolean, error?: string }`
- Use `single()` only when a missing record is a bug (throws 406 otherwise)

## Directory Structure

Queries and mutations are organized by domain:

- `src/queries/` — read operations (tournaments, organizations, users, permissions, etc.)
- `src/mutations/` — write operations (match-games, organizations, tournaments/, users, etc.)

Check these directories for existing functions before writing new ones.

For migration guidance, see root CLAUDE.md > Critical Rules > Database Migrations.

## Edge Functions

All functions in `supabase/functions/<name>/index.ts`. Deno runtime — use Deno imports, not Node.

```typescript
// Standard edge function structure
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  // ...
});
```

Shared utilities in `supabase/functions/_shared/` — import with relative paths (`../_shared/cors.ts`).

**Never deploy edge functions manually.** Changes deploy via git → merge to main.

## Integration Tests

`src/__tests__/integration/` runs against a real local Supabase instance. Requires `pnpm db:start` first.
Unit tests in `src/__tests__/` mock the Supabase client.
