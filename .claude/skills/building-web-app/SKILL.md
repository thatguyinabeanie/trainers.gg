---
name: building-web-app
description: Use when building web routes, components, Server Actions, data fetching, or any feature in apps/web
---

See `apps/web/CLAUDE.md` for directory structure, key files, and commands.

## Server Actions

Live in `src/actions/`. Return `{ success, error }` — use `@trainers/validators/action-result` type.

```typescript
"use server";
export async function myAction(data: FormData) {
  try {
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Something went wrong"),
    };
  }
}
```

## Data Fetching

Pick the path based on **where** the read happens and **which data bucket** it touches.

### Decision tree

```
New web read — which path?

1. SSR / Server Component?
   └── Call a 'use cache'-wrapped fetcher directly.
       Use createServiceRoleClient() inside the fetcher (S-bucket SELECT is revoked).
       Tag with CacheTags.*, profile with cacheLife("max").
       Reference: apps/web/src/lib/data/standings-endpoint.ts

2. Client read of S-bucket data (shared-public, anon SELECT revoked)?
   └── useApiQuery against /api/v1.
       Import from: @trainers/supabase/react-query
       Define query key in: apps/web/src/lib/query-keys.ts
       Reference: apps/web/src/hooks/use-current-user.ts

3. Client read of P-bucket / authed data (per-user, RLS-bound)?
   └── useQuery + createClient() (browser, authenticated, RLS applies).
       Define query key in: apps/web/src/lib/query-keys.ts
       No /api/v1 route needed — direct PostgREST, RLS enforces access.

4. Realtime?
   └── postgres_changes subscription → setQueryData(payload.new).
       Never invalidateQueries / refetch per event — defeats the cost savings.
       See using-realtime skill.
```

### useApiQuery (S-bucket client reads)

`useApiQuery` from `@trainers/supabase/react-query` wraps `useQuery` for `/api/v1` fetches. It handles Bearer-or-cookie auth automatically. Always render an explicit error state — see the "Error States" section below.

```tsx
"use client";

import { useApiQuery } from "@trainers/supabase/react-query";
import { queryKeys } from "@/lib/query-keys";

async function fetchStandings(tournamentId: number) {
  const res = await fetch(`/api/v1/tournaments/${tournamentId}/standings`);
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json();
}

function StandingsPanel({ tournamentId }: { tournamentId: number }) {
  const { data, isLoading, isError, error } = useApiQuery(
    queryKeys.tournament.standings(tournamentId), // define in query-keys.ts
    () => fetchStandings(tournamentId),
    { staleTime: 30_000 }
  );

  if (isLoading) return <Spinner />;
  if (isError) return <Alert variant="destructive">…</Alert>;
  return <StandingsList rows={data} />;
}
```

### Query key conventions

All query keys live in `apps/web/src/lib/query-keys.ts` — the `queryKeys` factory object. Add a new factory key for each new `/api/v1` endpoint rather than inlining string literals. This keeps `invalidateQueries` targets consistent across the codebase.

### Server Component pattern (S-bucket SSR)

```tsx
import { getCachedTournamentStandings } from "@/lib/data/standings-endpoint";

export default async function StandingsPage({ params }) {
  const standings = await getCachedTournamentStandings(Number(params.id));
  return <StandingsList rows={standings} />;
}
```

No TanStack Query needed in Server Components — the `'use cache'` fetcher is the caching layer.

## Status Display

Use `src/components/ui/status-badge.tsx` for semantic status colors. Never render raw enum/DB values — always map through `getLabel()` from `@trainers/utils`.

## API Routes

New player-related API routes live in `src/app/api/players/` — check here before building new endpoints.

## Request Interception (proxy.ts)

Next.js 16 uses `proxy.ts` — `middleware.ts` is deprecated. Must be at `src/proxy.ts` (not project root). Export a function named `proxy`. Verify it's loading by checking for `proxy.ts: XXms` in dev server output.

## Client State Management (TanStack Query)

TanStack Query v5 is the client state management layer. All server state flows through query keys, cached queries, and mutations — not local React state or context.

- **Queries**: use query key factories for consistent cache keys and targeted invalidation
- **Mutations**: use `useMutation` with `onMutate` for optimistic updates where UI should respond immediately (e.g., registration, check-in, roster changes)
- **Invalidation**: invalidate related query keys in `onSettled` so the cache resyncs regardless of mutation outcome
- **No client-side state duplication**: if data comes from the server, it lives in the query cache — don't mirror it into `useState`
- **Query key factories**: define query keys via factory functions — mobile already follows this pattern (see `apps/mobile/src/lib/api/query-factory.ts`)

See `creating-components` skill when building new UI components.

## While Building Pages

Keep these in mind — don't wait for review:

- **Cache public data**: Server Components fetching community/tournament data should use `'use cache'` + `cacheTag()` + `cacheLife()` + `createStaticClient()`. Only skip caching for user-specific data. See `reviewing-caching` skill for the canonical pattern.
- **Invalidate caches**: Server actions that mutate data must call the appropriate helper from `@/lib/cache-invalidation` — never bare `updateTag()` directly.
- **Add error boundaries**: New route segments should have an `error.tsx` sibling
- **Parallel fetches**: Use `Promise.all` for independent data requests in Server Components

See `reviewing-caching` skill for the full caching decision tree.

## Where Components Live (path-length lesson)

**Default: `apps/web/src/components/<feature>/`** — that's the established pattern (`team-builder/`, `communities/`, `dashboard/`, `profile/`, `match/`, `tournaments/`, `discord/`).

Route co-location (`_components/` next to a `page.tsx`) is technically supported by Next.js and fine for **shallow** routes (e.g., `apps/web/src/app/foo/_components/bar.tsx`). It is **wrong** for deeply-nested routes:

- 🚫 `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/_components/channel-mapping-table.tsx` — 130+ chars, overflows `git status` output, import lines wrap.
- ✅ `apps/web/src/components/discord/channel-mapping-table.tsx` — 60 chars, clean.

**60-char heuristic** — if the route prefix path before any filename is >60 chars, the components MUST live in `apps/web/src/components/<feature>/`. Tests follow source.

### Sibling components must not import from each other

When a feature has a desktop/mobile pair (or any two siblings sharing types/constants/helpers), put the shared symbols in `<feature>-shared.{ts,tsx}` and have **both** siblings import from it:

```
components/discord/
  channel-mapping-shared.ts        // exports types, constants, getXxxMeta()
  channel-mapping-table.tsx         // imports from ./channel-mapping-shared
  channel-mapping-cards.tsx         // imports from ./channel-mapping-shared
```

NEVER:

- Have `channel-mapping-cards.tsx` import from `channel-mapping-table.tsx` (cycle if the table uses cards)
- Have one sibling re-export from the other to "break" the cycle (still cyclic at module-graph time)

If you find an existing cycle in someone else's module, extract a `*-shared` first, then add your code.

The full rule with the heuristic and concrete examples lives in `.claude/rules/nextjs-conventions.md` ("Component Placement" + "Sibling components must not import from each other"). It auto-loads when editing `apps/web/**/*`.

## Error States in `useApiQuery` / `useQuery` Consumers

**Every component that calls `useApiQuery` or `useQuery` must render an explicit error state.** Reading only `data` and `isLoading` and falling through to an empty-state on query failure makes a 401 or 500 look like "no data" — silently hiding outages from the user.

Destructure `error` and `isError`, and render an error UI **before** the empty-state branch:

```tsx
// ✅ Explicit error state — outages are visible, not silent
// Reference: apps/web/src/components/admin/usage-inspector.tsx
const { data, isLoading, isError, error } = useApiQuery<MyData[]>(
  ["my-key"],
  fetchMyData,
);

if (isLoading) return <Spinner />;
if (isError) return (
  <Alert variant="destructive">
    <AlertTriangle className="size-4" />
    <AlertDescription>
      {error instanceof Error ? error.message : "Unexpected error"}
    </AlertDescription>
  </Alert>
);
if (!data?.length) return <EmptyState />;
return <MyDataList data={data} />;

// ❌ Silent failure — a 401/500 renders as if there's simply no data
const { data, isLoading } = useApiQuery<MyData[]>(["my-key"], fetchMyData);
if (isLoading) return <Spinner />;
if (!data?.length) return <EmptyState />; // hides errors
return <MyDataList data={data} />;
```

## Component & Helper Awareness

When editing web app files, path-scoped rules automatically load:

- **`web-ui-catalog.md`** — categorized index of all UI components in `components/ui/`
- **`web-hooks-and-helpers.md`** — index of available hooks, lib helpers, and `@trainers/utils` exports

Check these catalogs before creating new components or utilities. Always render an explicit error state (see above) — `Alert` (destructive variant) is in the UI catalog. See `creating-components` skill for component creation patterns.
