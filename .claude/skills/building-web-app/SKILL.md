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

## While Building Pages

Keep these in mind — don't wait for review:

- **Cache public data**: Server Components fetching community/tournament data should use `unstable_cache` + `createStaticClient()` + `CacheTags`. Only skip caching for user-specific data.
- **Invalidate caches**: Server actions that mutate data must call `updateTag(CacheTags.xxx)`
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

## Component & Helper Awareness

When editing web app files, path-scoped rules automatically load:

- **`web-ui-catalog.md`** — categorized index of all UI components in `components/ui/`
- **`web-hooks-and-helpers.md`** — index of available hooks, lib helpers, and `@trainers/utils` exports

Check these catalogs before creating new components or utilities. See `creating-components` skill for component creation patterns.
