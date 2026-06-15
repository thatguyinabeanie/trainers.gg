---
name: reviewing-caching
description: Use when reviewing or implementing caching — covers Next.js 'use cache' (Cache Components), TanStack Query staleTime, cache invalidation via tags, and caching decision-making
---

# Reviewing Caching

Checklist and patterns for caching at the Next.js server layer and TanStack Query client layer.

## No Deferrals

Caching is required at implementation time (see "Caching Requirements" below). When reviewing caching, every missing tag, helper, or TanStack Query wrapper gets fixed in the current session — not labeled as "follow-up" or "future polish". Only defer when the user explicitly says to. Match this to the PR feedback rule in `reviewing-pr-feedback`.

## Caching Decision Tree

Every page needs a caching strategy at **both** layers. Server caching (`'use cache'`) and client caching (TanStack Query) serve different purposes and are decided independently.

### Server Layer (`'use cache'`)

```
Is the data the same for ALL users viewing this page?
├── YES (public/community-level data)
│   └── Use 'use cache' + createStaticClient() + cacheTag() + cacheLife()
│       Examples: community stats, tournament list, player profiles
├── PARTIALLY (public data + user-specific overlay)
│   └── Cache the public part, fetch the user part separately
│       Examples: tournament page (cached) + "am I registered?" (auth)
└── NO (user-specific data)
    └── Do NOT use 'use cache' — use createClient() or createClientReadOnly()
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

## Next.js Server Caching (`'use cache'`)

The project uses **Cache Components** (`cacheComponents: true` in `next.config.ts`). The `unstable_cache` wrapper and segment-level `export const revalidate/dynamic/fetchCache` are replaced entirely by function-level `'use cache'` directives. Segment config exports are **build errors** under this mode — do not add them.

### Canonical Pattern

```tsx
import { cacheTag, cacheLife } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

async function getCachedTournaments() {
  "use cache";
  cacheTag(CacheTags.TOURNAMENTS_LIST);
  cacheLife("max"); // tag-invalidated entity — no time-based revalidation needed

  const supabase = createStaticClient(); // Anonymous, no cookies — PROJECT convention
  return listTournamentsGrouped(supabase, { completedLimit: 20 });
}
```

Key points:

- `'use cache'` goes at the top of the function body (not at the file level)
- `cacheTag()` and `cacheLife()` import from `"next/cache"` — no `unstable_` prefix
- `createStaticClient()` (cookie-less) inside cached functions is a **project convention** for avoiding cookie-based cache variance — it is not official Supabase guidance
- Multiple tags are fine: `cacheTag(CacheTags.TOURNAMENTS_LIST, CacheTags.tournament(id))`
- **Function arguments + closures are the cache key** — no manual key arrays needed; every distinguishing value must be a function parameter so the runtime can key properly

### cacheLife Profiles

Next.js ships named profiles. **Always call `cacheLife()` explicitly** — never rely on the default.

| Profile     | stale | revalidate | expire | Project usage                                                                                   |
| ----------- | ----- | ---------- | ------ | ----------------------------------------------------------------------------------------------- |
| `"max"`     | 5m    | 30d        | 1y     | Tag-invalidated entities: tournaments, communities, players, dashboard stats, Limitless imports |
| `"hours"`   | 5m    | 1h         | 1d     | Usage stats, platform overview                                                                  |
| `"minutes"` | 5m    | 1m         | 1h     | Announcements                                                                                   |
| `"days"`    | 5m    | 1d         | 1w     | (available if needed)                                                                           |
| `"weeks"`   | 5m    | 1w         | 30d    | (available if needed)                                                                           |
| custom      | 300s  | 300s       | 3600s  | Discord guild cache (matches 1h guild data TTL)                                                 |

**GOTCHA — dynamic hole:** `revalidate: 0` or `expire < 5m` silently becomes an **uncached dynamic hole** — the response is never stored. Never use `"seconds"` profile expecting a cache. If in doubt, use `"minutes"` as the floor.

**Client navigation staleness:** Navigations can serve content up to the profile's `stale` window (5m for most profiles) — slightly staler than the old ~30s router cache. This is an accepted tradeoff; document it in PR descriptions when relevant.

### PPR / Suspense requirement

Under `cacheComponents`, PPR is implied. Any dynamic read (`cookies()`, `headers()`, `searchParams`, `params` without `generateStaticParams`) inside a cached route segment needs a **Suspense boundary** — either `loading.tsx` or an inline `<Suspense>` fallback. Missing boundaries cause a build error.

### Rules

- [ ] `'use cache'` declared at the top of the function body
- [ ] `cacheTag()` called with at least one `CacheTags.*` value
- [ ] `cacheLife()` called explicitly on every cached function — never rely on default
- [ ] `createStaticClient()` inside the cache scope — never `createClient()` (cookies break caching and risk data leaks)
- [ ] **No authed/cookie clients inside cached functions** — one user's data would be served to all; read auth outside, pass plain values in as parameters
- [ ] **`cookies()` / `headers()` never called inside a `'use cache'` scope** — read them outside the function, pass plain values in as parameters
- [ ] **No broad `try/catch` wrapping `cookies()` reads** — under `cacheComponents` this can swallow prerender signals
- [ ] Function arguments carry all distinguishing state (entity IDs, filter values) — no manual cache key arrays
- [ ] Access checks happen OUTSIDE the cache (authenticated check before/after)
- [ ] Every route segment with dynamic reads has a Suspense boundary (`loading.tsx` or inline)
- [ ] `export const revalidate/dynamic/fetchCache` NOT present — build errors under `cacheComponents`

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
  invalidateUsageStatsCaches, // usage-stats + usage-stats:{format} — Server Action surface
  invalidateAnnouncementCaches, // ANNOUNCEMENTS — Server Action surface
} from "@/lib/cache-invalidation";
```

#### `updateTag` vs `revalidateTag(tag, 'max')`

| Surface                           | API to use                             | Notes                                                       |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| Server Actions (`"use server"`)   | `updateTag(tag)` via helper            | Read-your-own-writes semantics; available only in Actions   |
| Route handlers / webhooks / crons | `revalidateTag(tag, 'max')` via helper | Two-arg form; single-arg `revalidateTag(tag)` is deprecated |

All helpers in `@/lib/cache-invalidation` pick the right API for their surface — callers don't need to know which form to use.

**Usage data invalidation flow:**

- Admin Server Action → `invalidateUsageStatsCaches(formats)` (uses `updateTag`)
- Edge function / CLI import → `POST /api/revalidate/usage` (Bearer `USAGE_REVALIDATE_SECRET`) → `revalidateUsageStatsCaches(formats)` (uses `revalidateTag(tag, 'max')`)

### Cache Invalidation Checklist

Every mutation that changes data must invalidate affected caches via the correct helper:

| What Changed                                       | Helper to Call                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Community name/description/logo/social links       | `invalidateCommunityPageCaches(slug, id)`                                                         |
| Staff roster changes                               | `invalidateCommunityPageCaches(slug, id)`                                                         |
| Tournament status change (publish/start/complete)  | `invalidateTournamentAndCommunityCaches(supabase, id)`                                            |
| Tournament internal change (rounds, registrations) | `invalidateTournamentListCaches(id)` or `invalidateTournamentCaches(id)`                          |
| Player profile data (bio/country)                  | `invalidatePlayerProfileCaches(username)`                                                         |
| Player joins or changes username                   | `invalidatePlayerDirectoryCaches(username)`                                                       |
| Usage stats imported or recalculated               | `invalidateUsageStatsCaches(formats)` (Action) or `revalidateUsageStatsCaches(formats)` (webhook) |
| Announcements created/updated/deleted              | `invalidateAnnouncementCaches()`                                                                  |

### Anti-Patterns

```tsx
// BAD: authenticated client inside cache (cookies vary per user → data leak risk)
async function getCached() {
  "use cache";
  const supabase = await createClient(); // WRONG — cookies break caching
  return fetchData(supabase);
}

// BAD: missing cacheTag (cache never invalidates on-demand)
async function getCached() {
  "use cache";
  cacheLife("max");
  // cacheTag(???) — MISSING
  return fetchData();
}

// BAD: missing cacheLife (relies on default 5m/15m/never — hard to reason about)
async function getCached() {
  "use cache";
  cacheTag(CacheTags.TOURNAMENTS_LIST);
  // cacheLife(???) — MISSING
  return fetchData();
}

// BAD: cookies() inside cache scope (swallows prerender signals)
async function getCached(userId: string) {
  "use cache";
  cacheTag(CacheTags.TOURNAMENTS_LIST);
  cacheLife("max");
  const cookieStore = await cookies(); // WRONG — read outside, pass as parameter
  return fetchData(cookieStore.get("pref")?.value);
}

// BAD: segment config — build error under cacheComponents
export const revalidate = false; // BUILD ERROR

// BAD: updateTag called directly in a server action
export async function createTournament(data: Input) {
  "use server";
  // ...
  updateTag(CacheTags.TOURNAMENTS_LIST); // WRONG — use invalidateTournamentListCaches(id)
}
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

## Auth-Gated API Routes: `Cache-Control`

**Default for any `/api/v1` route that calls `resolveApiAuth` and returns 401 for anon callers: `Cache-Control: private, no-store`.**

There is one explicit, locked carve-out (Architecture decision #2, `docs/decisions/2026-06-11-data-access-and-rls-decisions.md`): S-bucket routes with all-public-column data use `public, s-maxage=…` (CDN caching) — see below.

The server-side `'use cache'` + `cacheTag`/`cacheLife` layer is the real caching mechanism and stays. The CDN-facing `Cache-Control` header is a separate, independent concern.

### Default: `private, no-store`

Any route that returns per-user, PII-bearing, scoped, or private data must use `private, no-store`:

```ts
// ✅ Per-user or PII-bearing route — CDN must not cache this
const CACHE_CONTROL = "private, no-store";
// Reference: apps/web/src/app/api/v1/me/profile/route.ts  (me-scoped data)
//            apps/web/src/app/api/v1/players/search/route.ts

// ❌ Per-user or PII-bearing route using public CDN caching — data leak
// Example: /api/v1/me/profile — reads email, registration drop_notes, private fields
const CACHE_CONTROL = "public, s-maxage=31536000, stale-while-revalidate=86400";
```

### Carve-out: `public, s-maxage=…` is ALLOWED when ALL of these hold

> (Locked in Architecture decision #2 — the "caching spike" for S-bucket endpoints.)

1. **Every column in the response is public** — no PII (email, phone), no per-viewer/scoped fields (e.g. `drop_notes`, internal staff notes, anything not already visible on SSR public pages), AND
2. **The cache entry is tag-invalidated** via `revalidateTag(CacheTags.x, 'max')` (busted on change, not stale-by-TTL).

Why this is safe under those guards: public columns can't leak through a shared CDN entry (the data is already public on SSR pages); the CDN cache is the DB-overload protection (skipping per-request rate-limit on a CDN hit is fine for data that's already public); anon viewers reach this data via SSR pages anyway (constraint #4), so the API edge-cache short-circuits authed repeat reads and deliberate public-data probes only.

```ts
// ✅ Auth-gated S-bucket route — all-public-column data, tag-invalidated
// Example: /api/v1/tournaments/[id]/standings — rank, wins, losses, resistance_pct (all public)
const CACHE_CONTROL = "public, s-maxage=31536000, stale-while-revalidate=86400";
// Pair with: revalidateTag(CacheTags.tournament(id), 'max') on any standings mutation

// ❌ Same route but response includes drop_notes or any private/scoped field → private, no-store
```

If **any** column is private, PII-bearing, or viewer-scoped → fall back to `private, no-store`. No exception.

**Also: never read PII inside a shared `'use cache'` scope.** A `'use cache'` fetcher is shared across all viewers with no auth scope. Caching per-user or PII-bearing data inside it leaks that data to every viewer who gets the same cache entry. Such reads must use a request-scoped client (cookie/RLS-bound) outside any `'use cache'` boundary, and the route must be `private, no-store` + authorization-gated.

```ts
// ❌ PII inside shared cache — data leak (community staff roster with emails)
async function getCachedCommunityStaff(slug: string) {
  "use cache";
  cacheTag(CacheTags.community(slug));
  cacheLife("max");
  const supabase = createServiceRoleClient(); // service-role bypasses RLS
  return supabase.from("community_staff").select("*, users(email)"); // email is PII — cached for ALL viewers
}

// ✅ Auth-gated, not cached — reads PII from a request-scoped client
// route.ts: check canManageCommunity → 403 for non-staff; respond with private, no-store
async function getStaffRoster(slug: string) {
  const supabase = await createClient(); // request-scoped, RLS-bound
  return supabase.from("community_staff").select("*, users(email)");
  // route sets: headers().set("Cache-Control", "private, no-store")
}
```

### Caching Review Checklist for API Routes

- [ ] Does the route call `resolveApiAuth` (or equivalent auth check)? If yes → default is `Cache-Control: private, no-store`
- [ ] Is the response all-public-column data (no PII, no scoped/private fields) AND tag-invalidated? If both → `public, s-maxage=…` is allowed (carve-out above)
- [ ] Does any `'use cache'` fetcher touch user emails, phone numbers, or other PII? If yes → move those reads outside the cache scope, use a request-scoped client, and gate the route with authorization + `private, no-store`

## S-bucket API Route Caching

A `/api/v1` GET handler for S-bucket data follows a two-layer caching design: the route handler owns auth + `Cache-Control`; a `'use cache'`-wrapped fetcher in `apps/web/src/lib/data/*-endpoint.ts` owns the server-side cache entry.

### Pattern

```
GET /api/v1/…
  1. resolveApiAuth(request)   ← OUTSIDE the cache scope
  2. enforceRateLimit(…)
  3. getCachedXxx(plainId)     ← calls the 'use cache' fetcher
  4. NextResponse.json(data, { headers: { "Cache-Control": … } })
```

The fetcher:

```ts
// apps/web/src/lib/data/standings-endpoint.ts
import { cacheTag, cacheLife } from "next/cache";
import { CacheTags } from "@/lib/cache";

export async function getCachedTournamentStandings(
  tournamentId: number
): Promise<TournamentStandingRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max"); // tag-invalidated entity — no time-based expiry needed

  const supabase = createServiceRoleClient(); // S-bucket SELECT is revoked for anon/authed
  return getPublicTournamentStandings(supabase, tournamentId);
}
```

Key rules:

- **Auth outside cache scope** — `resolveApiAuth` runs in the route handler, not inside the `'use cache'` function. Only plain scalar values (IDs, filter params) are passed into the cached fetcher. Never pass `Request`, session objects, or cookies in.
- **`createServiceRoleClient()` inside the cache** — S-bucket base tables have `anon`/`authenticated` SELECT revoked (Phase 2 Task 9). Service-role is a constant identity (not per-user) and does not vary the cache key; it is safe inside a shared cache scope for all-public-column data.
- **Reuse existing `CacheTags`** — no new tag per endpoint. Standings reuse `CacheTags.tournament(id)`, so the existing `invalidateTournamentListCaches(id)` / `revalidateTag(CacheTags.tournament(id), 'max')` busts them automatically.
- **`revalidateTag(tag, 'max')` for on-demand busting** — route-handler surface always uses the two-arg `revalidateTag`; single-arg is deprecated. Server Actions use `updateTag` via the helpers in `@/lib/cache-invalidation`. Do not cross these surfaces.
- **`Cache-Control` follows the carve-out above** — all-public-column + tag-invalidated → `public, s-maxage=31536000, stale-while-revalidate=86400`; any private/PII column → `private, no-store`.

### Dynamic-hole gotcha for route handlers

A `'use cache'` function is only a cache entry if it actually gets stored. If a `revalidate: 0` or very short `expire` sneaks in (e.g. via a misused `cacheLife` profile), the fetcher becomes a dynamic hole — every request re-runs the DB query and the CDN never stores a shared entry. Always use `cacheLife("max")` for tag-invalidated S-bucket fetchers; confirm the profile table above if unsure.

### Route-handler review checklist (S-bucket)

- [ ] `resolveApiAuth` called in the route handler, result checked, null → `401`
- [ ] No auth/session objects passed into the `'use cache'` fetcher — plain values only
- [ ] `createServiceRoleClient()` (not `createStaticClient()`) inside the fetcher — S-bucket SELECT is revoked
- [ ] `cacheTag(CacheTags.x)` reuses an existing tag — no ad hoc string literals
- [ ] `cacheLife("max")` declared explicitly in the fetcher
- [ ] `Cache-Control` header set per the carve-out rules (public all-columns → `public, s-maxage`; else `private, no-store`)
- [ ] Write paths use `revalidateTag(tag, 'max')` — two-arg form, not `updateTag`
- [ ] No PII columns in the response shape for routes using `public, s-maxage`

## Caching Requirements (Must Be Done at Implementation Time)

Caching is not optional polish — it is a required part of implementing any feature that fetches or mutates data. Every new page or feature must address both layers before the work is considered complete.

### Server-side (`'use cache'`) — add when:

1. Data is the same for all viewers (public or community-level)
2. The page will be visited frequently
3. The data doesn't change on every request

Skip `'use cache'` only when the data is user-specific, changes on every request, or the page is admin-only.

### Client-side (TanStack Query) — add when:

1. The page has mutations (create, update, delete actions)
2. The user will navigate back to the page after making changes
3. The page would benefit from optimistic updates, background refetching, or stale-while-revalidate

**Every page with server actions MUST use TanStack Query.** Using `useState` + `router.refresh()` alone is insufficient — it forces full page re-renders, loses scroll position, and provides no client-side cache.

### Cache invalidation — required for every mutation:

1. Server actions must call the appropriate cache invalidation helper from `@/lib/cache-invalidation`
2. If no helper exists for the entity type, create one in `@/lib/cache-invalidation`
3. If no `CacheTags` entry exists, add one to `@/lib/cache`
4. TanStack Query mutations must invalidate affected query keys via `onSuccess`

### New entity caching checklist

When adding a new entity type (like teams, posts, usage stats, etc.), complete ALL of these:

- [ ] Add `CacheTags` entries to `@/lib/cache` (if the entity has public-facing pages)
- [ ] Choose a `cacheLife` profile (see profile table above — pick `"max"` for tag-invalidated entities)
- [ ] Add invalidation helper(s) to `@/lib/cache-invalidation`; decide whether the surface is a Server Action (`updateTag`) or a route handler/webhook (`revalidateTag(tag, 'max')`)
- [ ] Server actions call the correct invalidation helper after mutations
- [ ] TanStack Query `useQuery` wraps data fetching on interactive pages
- [ ] TanStack Query `useMutation` wraps server action calls with `onSuccess` invalidation
- [ ] `staleTime` is set appropriately per the stale time guidelines
- [ ] Server Component data is passed as `initialData` to `useQuery` (no duplicate fetching)
- [ ] Every route segment with dynamic reads has a Suspense boundary (`loading.tsx` or inline)
