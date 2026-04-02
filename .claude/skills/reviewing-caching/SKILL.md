---
name: reviewing-caching
description: Use when reviewing or implementing caching — covers Next.js unstable_cache, TanStack Query staleTime, cache invalidation via tags, and caching decision-making
---

# Reviewing Caching

Checklist and patterns for caching at the Next.js server layer and TanStack Query client layer.

## Caching Decision Tree

```
Is the data the same for ALL users viewing this page?
├── YES (public/community-level data)
│   └── Use unstable_cache + createStaticClient() + CacheTags
│       Examples: community stats, tournament list, player profiles
├── PARTIALLY (public data + user-specific overlay)
│   └── Cache the public part, fetch the user part separately
│       Examples: tournament page (cached) + "am I registered?" (auth)
└── NO (user-specific data)
    └── Do NOT cache with unstable_cache
        Use createClient() or createClientReadOnly()
        Examples: my alts, my settings, my notifications
```

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

### Cache Invalidation Checklist

Every mutation that changes data must invalidate affected caches:

| What Changed                                 | Tags to Invalidate                                       |
| -------------------------------------------- | -------------------------------------------------------- |
| Community name/description/logo/social links | `COMMUNITIES_LIST` + `community(slug)` + `community(id)` |
| Tournament CRUD                              | `TOURNAMENTS_LIST` + `tournament(slug)`                  |
| Player profile                               | `player(handle)`                                         |
| Tournament registration                      | `tournament(slug)` + `community(slug)`                   |
| Staff changes                                | `community(slug)`                                        |

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
| Live tournament state                 | `0` (default)  | Matches/rounds change rapidly |
| User profile                          | `60_000` (1m)  | Changes rarely                |
| Notifications                         | `10_000` (10s) | Should feel responsive        |

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

- [ ] Related queries share a common key prefix for bulk invalidation
- [ ] Mutations invalidate affected query keys
- [ ] No duplicate fetching — if a Server Component already fetched the data and passed it as props, don't re-fetch on the client
- [ ] Optimistic updates for immediate UI feedback (toggles, drag-drop, inline edits)
- [ ] `staleTime > 0` for data that doesn't change frequently

## When to Add Caching (During Implementation)

Add `unstable_cache` when you're writing a Server Component that:

1. Fetches data that is the same for all viewers (public or community-level)
2. The page will be visited frequently
3. The data doesn't change on every request

Skip caching when:

1. The data is user-specific (my alts, my settings)
2. The data changes on every request (live tournament state)
3. The page is rarely visited (admin-only pages)
