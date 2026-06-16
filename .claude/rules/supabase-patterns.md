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

| Function                    | Use Case                                                                                           | Cookies            |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ------------------ |
| `createStaticClient()`      | Public/ISR data, `'use cache'` fetcher — only for anon-granted views; **not** S-bucket base tables | None               |
| `createClient()`            | Authenticated mutations                                                                            | Read-write         |
| `createClientReadOnly()`    | Authenticated reads                                                                                | Read-only          |
| `createServiceRoleClient()` | Admin bypass of RLS; `/api/v1` routes reading Phase 2 revoke-set base tables                       | None (service key) |

Choose the most restrictive client that satisfies the need. For `/api/v1` routes reading Phase 2 revoke-set tables, use `createServiceRoleClient()` with an explicit column allowlist, `resolveApiAuth` (`apps/web/src/lib/api/auth.ts`), and `enforceRateLimit` — see `deciding-data-access` skill.

## Read Path by Data Bucket

**Rule: every Supabase read belongs to one of four buckets. Apply the path for that bucket — do not mix them.**

**S-bucket base tables are not client-readable for anon** (SELECT revoked on 19 tables). Read S data via `/api/v1`. The realtime six retain authenticated SELECT for live subscriptions; everything else is route-handler-only.

| Data class                               | Read path                           | Client / mechanism                                                                                                                                                                      |
| ---------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S-bucket** (shared-public) client read | `/api/v1` Next.js route handler     | `useApiQuery` (`@trainers/supabase/react-query`) → `'use cache'` fetcher → `createStaticClient()` (anon-granted views) or `createServiceRoleClient()` (revoke-set base tables, guarded) |
| **S-bucket** SSR read                    | Direct DB in Server Component       | `createStaticClient()` / `createServiceRoleClient()` inside `'use cache'`                                                                                                               |
| **P-bucket** (per-user) client read      | Direct PostgREST + RLS              | Authenticated browser client + plain `useQuery` with keys from `apps/web/src/lib/query-keys.ts`                                                                                         |
| **Realtime six**                         | Direct subscription, payload-driven | Browser client, `postgres_changes`, `setQueryData(payload.new)`                                                                                                                         |
| **X-bucket** (system)                    | Service role only                   | `createServiceRoleClient()`                                                                                                                                                             |

**Realtime six** (authenticated SELECT kept): `notifications`, `match_games`, `match_messages`, `tournament_matches`, `tournament_registrations`, `tournament_rounds`.

## No Wildcard Selects on Tables with Non-Public Columns

**Never use `.select("*")` or wildcard embeds (e.g. `:users(*)`, `:alts(*)`, `owner:users(*)`, `rel(*)`) on any table that has PII, private, or staff-internal columns.** Always use an explicit column allowlist.

Affected tables include (but are not limited to): `users`, `alts`, `tournament_registrations`, `communities`, `audit_log`, `sudo_sessions`.

**Why this rule exists — two real production leaks:**

1. `owner:users(*)` on `/api/v1/communities/[slug]` exposed community owner `email`, legal name, phone, and DOB to all API callers.
2. `alts(*)` on `/api/v1/matches/[matchId]` exposed `bio`, `user_id`, and `tier` fields that are not public-facing.

In both cases, a future column added to the table silently expanded the response shape and leaked through cached or service-role responses without any code change.

**Especially dangerous combination:** `createServiceRoleClient()` + a wildcard embed. Service role bypasses all RLS, so every column of every matched row reaches the caller. Service role is the highest-risk place to use `*`.

```typescript
// ✅ Explicit allowlist — new columns added to `alts` stay out of the response
// Reference: getMatchDetails in packages/supabase/src/queries/tournaments.ts
const { data, error } = await supabase.from("tournament_matches").select(`
    id, round_id, status, table_number,
    player1:alts!tournament_matches_alt1_id_fkey(id, username, avatar_url),
    player2:alts!tournament_matches_alt2_id_fkey(id, username, avatar_url)
  `);

// ❌ Wildcard embed on a PII table — any new column on `alts` silently leaks
const { data, error } = await supabase
  .from("tournament_matches")
  .select(
    "*, player1:alts!tournament_matches_alt1_id_fkey(*), player2:alts!tournament_matches_alt2_id_fkey(*)"
  );
```

**Public / lookup tables** (`tournaments`, `announcements`, `feature_flags`, `tournament_rounds`, `match_games`) may use `*` in internal query helpers, but explicit allowlists are still preferred whenever the result flows into a `/api/v1` route or a `'use cache'` fetcher. See "No `select('*')` in Versioned or Cached Public APIs" in the `reviewing-database` skill for the public-API variant of this rule.

> **Planned enforcement:** An ESLint `no-restricted-syntax` rule targeting wildcard embeds on known PII tables is planned. Until then, this rule is enforced at code review time.

## Row Level Security

- **Every table must have RLS enabled** — no exceptions
- Policies use `auth.uid()` for user-scoped access
- Never rely solely on application-level auth — RLS is the source of truth
- Test RLS policies by querying with different client types in development

## Type Generation

- Run `pnpm generate-types` after any schema change
- Generated types flow through the monorepo via `@trainers/supabase`
- Use the generated `Database` type for `TypedClient` — never manually define table types

## Type Helpers

Use the generated type helpers from `@trainers/supabase` instead of manual type definitions:

```ts
import {
  type Tables,
  type TablesInsert,
  type TablesUpdate,
  type Enums,
} from "@trainers/supabase";

// Row types (for reads)
type Tournament = Tables<"tournaments">;

// Insert types (for mutations that create)
type NewTournament = TablesInsert<"tournaments">;

// Update types (for mutations that modify)
type TournamentUpdate = TablesUpdate<"tournaments">;

// Enum types (for database enums)
type TournamentStatus = Enums<"tournament_status">;
```

**When to export query result types:** If a query returns a joined/enriched shape (e.g., tournament + organization + registration count), export a named type from the query file:

```ts
/** Tournament with joined org and computed counts. */
export type TournamentWithOrg = NonNullable<
  Awaited<ReturnType<typeof listTournamentsGrouped>>
>["active"][number];
```

Then re-export from `queries/index.ts`. Never let consumers manually redefine a type that matches a query return shape.

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

## Related Skills

- `querying-supabase` — client selection, query conventions, proactive quality checklist
- `reviewing-database` — RLS, migrations, indexes, N+1, unbounded fetches, query efficiency
- `reviewing-caching` — cache invalidation checklist for server actions
