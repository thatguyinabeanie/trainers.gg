---
paths:
  - "packages/**/*"
---

# Architecture Principles

Guidelines for code organization, package boundaries, and reuse in the trainers.gg monorepo.

## Shared Packages vs App Code

**Shared package** (`packages/`): Zero framework imports — pure logic usable by web, mobile, and edge functions.

**App directory** (`apps/*/src/lib/`): Framework-specific adapters, React hooks, Next.js/Expo infrastructure.

### Decision Rule

If a module has zero framework imports and could be useful across apps, it belongs in a shared package.

| Has framework imports? | Used by multiple apps? | Where it belongs  |
| ---------------------- | ---------------------- | ----------------- |
| No                     | Yes                    | `packages/`       |
| No                     | No (but could be)      | `packages/`       |
| Yes                    | N/A                    | `apps/*/src/lib/` |

## Import Boundaries

- `packages/` may **never** import from `apps/`
- `apps/` import packages via `@trainers/*` — never use relative paths across package boundaries
- Packages may import from other packages via `@trainers/*`
- Edge functions import from packages via the Deno import map (`deno.json`)

## Package Barrel Pattern

Every package has `src/index.ts` with **explicit named exports** organized with section comments:

```ts
// format.ts — player name resolution and time formatting
export { type PlayerRef, getPlayerName, formatDate } from "./format";

// countries.ts — ISO 3166-1 country codes and helpers
export { COUNTRIES, type CountryCode, getCountryName } from "./countries";
```

- Prefer explicit named re-exports over `export *` for discoverability
- Types are colocated with their implementation — not in separate `types/` directories
- Each file exports both the runtime values and the associated types together

## Dependency Injection Pattern

All Supabase queries/mutations accept `supabase: TypedClient` as the first parameter:

```ts
export async function listPublicCommunities(
  supabase: TypedClient
): Promise<CommunityWithCounts[]> { ... }
```

This enables:

- Testability — pass a mock client in tests
- Client flexibility — caller chooses the appropriate client (static, authenticated, service role)
- Framework independence — the query itself has no knowledge of how the client was created

## Type Derivation

For types derived from query return values, use the `NonNullable<Awaited<ReturnType<>>>` pattern:

```ts
export type TournamentDetail = NonNullable<
  Awaited<ReturnType<typeof getTournamentBySlug>>
>;
```

For Zod schemas, export both the schema and the inferred type together:

```ts
export const createTournamentSchema = z.object({ ... });
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
```

Zod itself is re-exported from `@trainers/validators` — import `z` from there for single-source access.

## Type Exports

When a query or mutation returns a useful composite type (joins, computed fields), **always export a named type**:

```ts
// In packages/supabase/src/queries/audit-log.ts
/** Single audit log row with joined actor user. */
export type AuditLogEntry = NonNullable<
  Awaited<ReturnType<typeof getAuditLog>>["data"]
>[number];
```

Then re-export from the barrel (`queries/index.ts` and `src/index.ts`).

**Never define a type in `apps/web/` that mirrors a query return shape.** If the type doesn't exist in the package yet, add and export it there — don't create a local duplicate.

For simple table row types, use `Tables<"table_name">` from `@trainers/supabase` instead of defining an interface.

## Query Routing by Bucket

All Supabase reads are classified into one of four buckets. The bucket determines where the read lives and which client to use.

| Bucket | Description | Client read path | Client / mechanism |
| ------ | ----------- | ---------------- | ------------------ |
| **S** (shared-public) | Data identical for every viewer — tournaments, standings, players, communities | `/api/v1/…` Next.js route handler → `'use cache'` fetcher in `apps/web/src/lib/data/*-endpoint.ts` | `createServiceRoleClient()` inside cache; `useApiQuery` on the client |
| **P** (per-user) | Per-viewer data with RLS — dashboard, alts, teams, invitations | Direct authenticated browser client + plain `useQuery` + `queryKeys.ts` | `createClient()` / `createClientReadOnly()` |
| **R** (realtime six) | Hot tables with live subscriptions — `notifications`, `match_games`, `match_messages`, `tournament_matches`, `tournament_registrations`, `tournament_rounds` | Direct subscription + `setQueryData(payload.new)` | Browser client, `postgres_changes` |
| **X** (system) | Internal / admin tables — `rate_limits`, `audit_log` | Never from client | `createServiceRoleClient()` only |

### Where the pieces live

- **Route handlers** — `apps/web/src/app/api/v1/…` — one file per resource; thin layer: auth → rate-limit → cached fetcher → JSON response.
- **Cached fetchers** — `apps/web/src/lib/data/*-endpoint.ts` — `'use cache'` functions with `cacheTag()` + `cacheLife()`; take only plain scalar params; use `createServiceRoleClient()` so the fetch survives the S-bucket anon/authenticated SELECT revoke.
- **P-bucket direct reads** — authenticated browser client + plain `useQuery` with keys from `apps/web/src/lib/query-keys.ts`; no route handler needed.
- **`useApiQuery`** — `@trainers/supabase/react-query` — TanStack Query wrapper for `/api/v1` fetches; used on both web and mobile.

### DI note

Queries in `packages/supabase/src/queries/` still accept `supabase: TypedClient` as the first parameter regardless of which caller uses them — a `createServiceRoleClient()` inside a cached fetcher, a `createClientReadOnly()` inside a route handler, or a mock in tests. The bucket classification is a routing concern, not a query-signature concern.

## Code Reuse

Extract abstractions after 2-3 repetitions. Always check existing patterns before creating new ones.

### Reference Implementations

- **TanStack Query factory**: `apps/mobile/src/lib/api/query-factory.ts`
- **Error extraction**: `packages/utils/src/error-handling.ts` — `getErrorMessage()`

### Extraction Checklist

1. Is this logic repeated 2-3 times already?
2. Does an existing utility in `@trainers/utils` or the relevant package already handle this?
3. Does the extracted code have zero framework imports? If yes, it belongs in `packages/`.
4. Will the extraction simplify tests?
