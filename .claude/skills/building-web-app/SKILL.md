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

**Server Components** — fetch directly via `src/lib/supabase/server.ts`. No TanStack Query needed.

**Client Components** — use TanStack Query for all server state. Query key factories are the target convention. See `apps/mobile/src/lib/api/query-factory.ts` as the reference pattern.

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
