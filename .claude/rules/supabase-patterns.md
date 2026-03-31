---
paths:
  - "packages/supabase/**/*"
  - "supabase/**/*"
---

# Supabase Patterns

Coding standards for Supabase queries, mutations, client usage, and database conventions in the trainers.gg monorepo.

## Query Signature

All queries and mutations accept `supabase: TypedClient` as the first parameter (dependency injection):

```ts
export async function listPublicCommunities(
  supabase: TypedClient
): Promise<CommunityWithCounts[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("*, members:community_members(count)")
    .eq("is_public", true);

  if (error) throw error;
  return data;
}
```

## Error Handling

- Check `.error` on every Supabase response — do not assume success
- Throw with a descriptive message when an error occurs
- Use `getErrorMessage()` from `@trainers/utils` for user-facing error extraction
- In server actions, catch and return `ActionResult<T>` (see nextjs-conventions)

```ts
const { data, error } = await supabase.from("tournaments").select("*");
if (error) throw new Error(`Failed to fetch tournaments: ${error.message}`);
```

## Client Selection (Web)

| Function                    | Use Case                          | Cookies            |
| --------------------------- | --------------------------------- | ------------------ |
| `createStaticClient()`      | Public/ISR data, `unstable_cache` | None               |
| `createClient()`            | Authenticated mutations           | Read-write         |
| `createClientReadOnly()`    | Authenticated reads               | Read-only          |
| `createServiceRoleClient()` | Admin bypass of RLS               | None (service key) |

Choose the most restrictive client that satisfies the need. Prefer `createStaticClient()` for public data and `createClientReadOnly()` for authenticated reads.

## Row Level Security

- **Every table must have RLS enabled** — no exceptions
- Policies use `auth.uid()` for user-scoped access
- Never rely solely on application-level auth — RLS is the source of truth
- Test RLS policies by querying with different client types in development

## Type Generation

- Run `pnpm generate-types` after any schema change
- Generated types flow through the monorepo via `@trainers/supabase`
- Use the generated `Database` type for `TypedClient` — never manually define table types

## Query Organization

- One file per domain in `packages/supabase/src/queries/` (e.g., `communities.ts`, `tournaments.ts`)
- Export queries from the package barrel file (`src/index.ts`)
- Alias mutations with a `Mutation` suffix when importing into server actions to distinguish from query functions:

```ts
import { updateCommunity as updateCommunityMutation } from "@trainers/supabase";
```

## Migrations

- **Never edit or rename** a committed migration file
- **Never apply migrations via MCP tools or the Supabase dashboard** — always use migration files
- Generate with `pnpm db:diff` — name in `snake_case`
- Ensure idempotency — use `IF NOT EXISTS`, `IF EXISTS` guards
- Include RLS policies in the same migration that creates the table
- See the `create-migration` skill for full conventions

## Edge Functions

- Deno runtime — follow import map in `deno.json`
- **Never deploy manually** — auto-deployed via Vercel build
- **Never declare in `config.toml`**
- Follow CORS, auth validation, and error response patterns from the `creating-edge-functions` skill
- See the `managing-edge-imports` skill for Deno import map management

## Realtime

- Use Supabase Realtime channels for live updates (tournament scores, chat)
- Subscribe in `useEffect` with proper cleanup (unsubscribe on unmount)
- Filter subscriptions to the minimum necessary rows/events
