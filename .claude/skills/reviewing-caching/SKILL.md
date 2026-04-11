---
name: reviewing-caching
description: Use when reviewing or implementing caching — covers Next.js unstable_cache, TanStack Query staleTime, cache invalidation via tags, and caching decision-making
---

# Reviewing Caching

Checklist and patterns for caching at the Next.js server layer and TanStack Query client layer.

## Caching Decision Tree

Every page needs a caching strategy at **both** layers. Server caching (`unstable_cache`) and client caching (TanStack Query) serve different purposes and are decided independently.

### Server Layer (`unstable_cache`)

```
Is the data the same for ALL users viewing this page?
├── YES (public/community-level data)
│   └── Use unstable_cache + createStaticClient() + CacheTags
│       Examples: community stats, tournament list, player profiles
├── PARTIALLY (public data + user-specific overlay)
│   └── Cache the public part, fetch the user part separately
│       Examples: tournament page (cached) + "am I registered?" (auth)
└── NO (user-specific data)
    └── Do NOT use unstable_cache — use createClient() or createClientReadOnly()
        Examples: my alts, my settings, my notifications
```

### Client Layer (TanStack Query)

```
Does the page have mutations OR fetch data the user will revisit?
├── YES
│   └── REQUIRED: Use TanStack Query (useQuery + useMutation)
│       - Caches data locally in the user's browser
│       - Enables optimistic updates for instant UI feedback
│       - Prevents redundant fetches on re-navigation
│       - Manages stale data and background refetching
│       Examples: team builder, dashboard, notifications, team lists
└── NO (static display, no interactivity)
    └── Server Component with SSR data is sufficient
        Examples: marketing pages, static content
```

TanStack Query caches in the user's browser — it applies to ALL data, including user-specific data. Do not confuse server-side caching decisions with client-side caching decisions.

## Next.js Server Caching (`unstable_cache`)

### Pattern

```tsx
import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

export const revalidate = false; // On-demand only

const getCachedData = unstable_cache(
  async () => {
    const supabase = createStaticClient(); // Anonymous, no cookies
    return fetchPublicData(supabase);
  },
  ["unique-cache-key"],
  { tags: [CacheTags.xxx] }
);
```

### Rules

- [ ] `createStaticClient()` inside the cache function — never `createClient()` (cookies break caching)
- [ ] `revalidate = false` on the page (on-demand invalidation only)
- [ ] Cache keys include entity ID: `["community-stats-123"]` not `["community-stats"]`
- [ ] Tags match what server actions invalidate via `updateTag()`
- [ ] Access checks happen OUTSIDE the cache (authenticated query before/after)

### Cache Invalidation Helpers

**Never call `updateTag()` directly in server actions.** Use the entity-scoped helpers in
`@/lib/cache-invalidation` — they bundle all affected tags so adding a new cache only
requires updating one helper, not every action.

```ts
import {
  invalidateCommunityPageCaches, // COMMUNITIES_LIST + community(slug) + community(id)
  invalidateTournamentCaches, // tournament(id) only — for internal changes
  invalidateTournamentListCaches, // TOURNAMENTS_LIST + tournament(id)
  invalidateTournamentAndCommunityCaches, // above + community(slug/id) — async, needs DB
  invalidatePlayerProfileCaches, // player(username) only
  invalidatePlayerDirectoryCaches, // player + PLAYERS_DIRECTORY + sidebars
} from "@/lib/cache-invalidation";
```

### Cache Invalidation Checklist

Every mutation that changes data must invalidate affected caches via the correct helper:

| What Changed                                       | Helper to Call                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Community name/description/logo/social links       | `invalidateCommunityPageCaches(slug, id)`                                |
| Staff roster changes                               | `invalidateCommunityPageCaches(slug, id)`                                |
| Tournament status change (publish/start/complete)  | `invalidateTournamentAndCommunityCaches(supabase, id)`                   |
| Tournament internal change (rounds, registrations) | `invalidateTournamentListCaches(id)` or `invalidateTournamentCaches(id)` |
| Player profile data (bio/country)                  | `invalidatePlayerProfileCaches(username)`                                |
| Player joins or changes username                   | `invalidatePlayerDirectoryCaches(username)`                              |

### Anti-Patterns

```tsx
// BAD: authenticated client inside cache (cookies vary per user)
const getCached = unstable_cache(async () => {
  const supabase = await createClient(); // WRONG
  return fetchData(supabase);
}, ["key"]);

// BAD: missing tags (cache never invalidates)
const getCached = unstable_cache(
  async () => fetchData(),
  ["key"]
  // { tags: ??? } — MISSING
);

// BAD: same cache key for different entities
const getCached = unstable_cache(
  async () => fetchCommunity(slug),
  ["community"] // Should be ["community-{id}"]
);
```

## TanStack Query Client Caching

### Stale Time Guidelines

| Data Type                             | `staleTime`    | Reasoning                     |
| ------------------------------------- | -------------- | ----------------------------- |
| Static reference (formats, countries) | `Infinity`     | Never changes at runtime      |
| Community/tournament data             | `30_000` (30s) | Changes infrequently          |
| User's own teams/team list            | `30_000` (30s) | Changes only on explicit CRUD |
| Live tournament state                 | `0` (default)  | Matches/rounds change rapidly |
| User profile                          | `60_000` (1m)  | Changes rarely                |
| Notifications                         | `10_000` (10s) | Should feel responsive        |

### Server-to-Client Data Handoff

When a Server Component fetches data that a Client Component also needs, pass it as `initialData` to avoid duplicate fetching:

```tsx
// Server Component
const teams = await getTeamsForAlt(supabase, altId);
return <TeamList teams={teams} altId={altId} />;

// Client Component
function TeamList({ teams, altId }: Props) {
  const { data } = useQuery({
    queryKey: ["teams", altId],
    queryFn: () => fetchTeams(altId),
    initialData: teams,
  });
  // ...
}
```

### Mutation Invalidation

```tsx
const mutation = useMutation({
  mutationFn: updateCommunity,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["community", slug] });
  },
});
```

### Rules

- [ ] **Every page with mutations MUST use TanStack Query** — not just `useState` + `router.refresh()`
- [ ] Related queries share a common key prefix for bulk invalidation
- [ ] Mutations invalidate affected query keys via `onSuccess`
- [ ] No duplicate fetching — if a Server Component already fetched the data and passed it as props, use `initialData` in `useQuery` instead of re-fetching
- [ ] Optimistic updates for immediate UI feedback (toggles, drag-drop, inline edits)
- [ ] `staleTime > 0` for data that doesn't change frequently

## Caching Requirements (Must Be Done at Implementation Time)

Caching is not optional polish — it is a required part of implementing any feature that fetches or mutates data. Every new page or feature must address both layers before the work is considered complete.

### Server-side (`unstable_cache`) — add when:

1. Data is the same for all viewers (public or community-level)
2. The page will be visited frequently
3. The data doesn't change on every request

Skip `unstable_cache` only when the data is user-specific, changes on every request, or the page is admin-only.

### Client-side (TanStack Query) — add when:

1. The page has mutations (create, update, delete actions)
2. The user will navigate back to the page after making changes
3. The page would benefit from optimistic updates, background refetching, or stale-while-revalidate

**Every page with server actions MUST use TanStack Query.** Using `useState` + `router.refresh()` alone is insufficient — it forces full page re-renders, loses scroll position, and provides no client-side cache.

### Cache invalidation — required for every mutation:

1. Server actions must call the appropriate cache invalidation helper
2. If no helper exists for the entity type, create one in `@/lib/cache-invalidation`
3. If no `CacheTags` entry exists, add one to `@/lib/cache`
4. TanStack Query mutations must invalidate affected query keys via `onSuccess`

### New entity caching checklist

When adding a new entity type (like teams, posts, etc.), complete ALL of these:

- [ ] Add `CacheTags` entries to `@/lib/cache` (if the entity has public-facing pages)
- [ ] Add invalidation helper(s) to `@/lib/cache-invalidation`
- [ ] Server actions call the correct invalidation helper after mutations
- [ ] TanStack Query `useQuery` wraps data fetching on interactive pages
- [ ] TanStack Query `useMutation` wraps server action calls with `onSuccess` invalidation
- [ ] `staleTime` is set appropriately per the stale time guidelines
- [ ] Server Component data is passed as `initialData` to `useQuery` (no duplicate fetching)
