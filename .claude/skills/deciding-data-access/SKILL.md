---
name: deciding-data-access
description: Use when deciding where a data read or mutation should live — SSR vs /api/v1 vs direct DB access; anon vs authenticated; caching and rate-limit requirements for any new feature or route
---

# Deciding Data Access

Canonical rule for WHERE any data read or write should live in the trainers.gg stack.

**The core model:** The browser is untrusted and uncacheable. The Next.js server is the trusted, cacheable boundary. Push every read to that boundary — and the only thing allowed to bypass it is an _authenticated, RLS-scoped_ direct read. Anon never touches the DB directly.

## Decision Tree for Any READ

```
What are you fetching?
│
├── Full page, public data (same for all viewers)
│   └── SSR — Server Component, service-role or 'use cache' fetcher
│       + createStaticClient(), cacheTag(), cacheLife()
│       Ships HTML — no browser DB call
│
├── Full page, per-user data
│   └── SSR in the user's context — createClient() / createClientReadOnly()
│       Do NOT use 'use cache' — data is per-viewer
│
└── Client-side / interactive (search-as-you-type, post-mutation refetch, live)
    └── /api/v1 route handler — NEVER a direct browser Supabase query
        │
        ├── Auth-gated (data is per-user or restricted)
        │   └── resolveApiAuth → 401 for anon
        │       Cache-Control: private, no-store
        │       Rate-limit: key by userId
        │
        └── Anon-reachable (data is genuinely public, same for all)
            └── resolveApiAuth still required (no open Data API)
                + 'use cache' + createStaticClient() inside fetcher
                Cache-Control: public, s-maxage=…, stale-while-revalidate=…
                Rate-limit: key by IP when anon, userId when authed
```

**Direct DB access (no route):** authenticated role + RLS only. Never `anon` role. Use only when a Server Component or Server Action has a clear auth context. Mobile hits `/api/v1` with a Bearer token — not the DB directly.

**Mutations:** Server Actions or route handlers with proper auth. Never cached. Never anon.

## Derived Rules

### 1. Anon-cacheable ⟹ S-bucket data only

Data on an anon-accessible cached route must be public, non-PII, and identical for all viewers (the S-bucket). PII and per-user data **cannot** ride an anon/cached route — it would leak through the shared CDN entry.

```
❌  Community staff roster (with emails) inside a 'use cache' fetcher
    → a cached 200 leaks PII to every viewer who gets that cache entry

✅  Community staff roster behind an auth-gated route with private, no-store
```

### 2. Routes win for two reinforcing reasons

Security: one gated entry point with auth + rate-limit, no raw DB exposure.
Caching: the server layer is where caching lives; a browser query can never be CDN-cached and can run away under load.

### 3. Anon route ⟹ cache + rate-limit are non-negotiable

Cache absorbs repeat/malicious hits at volume. Rate-limit caps a single abuser.
Key by `auth.userId` when authed, by request IP when anon.

### 4. No `select('*')` on a cached or versioned public route

A future column added to the table silently expands the cached response, leaking data or breaking consumer contracts. Use an explicit column allowlist.

```ts
// ✅ Explicit columns — safe to add columns to the table
return supabase
  .from("standings")
  .select("rank, player_id, wins, losses, resistance_pct"); // allowlist

// ❌ select('*') — new columns leak through cached/versioned responses
return supabase.from("standings").select("*");
```

Reference: `getPublicTournamentStandings` in `packages/supabase/src/queries/tournaments.ts`.

### 5. Mobile follows the same rule

Mobile is browser-anon-forbidden. It hits `/api/v1` with `Authorization: Bearer <supabase access JWT>` (`session.access_token`). `resolveApiAuth` validates the token via `auth.getUser()` — same auth gate, same rate-limit. No direct anon DB reads from the mobile client.

### 6. Realtime only for genuine live collaboration

Use Supabase Realtime for in-match chat/score, notification bell, judge board — cases where sub-second latency matters. For everything else: polling + cache-busting is simpler and cheaper. See `using-realtime` skill before reaching for a subscription.

### 7. New-feature default

- New page → SSR (Server Component, cached if public)
- Interactive data fetch → `/api/v1`
- Default auth-gated unless the data is genuinely public
- If public: add `'use cache'` + rate-limit from line one, not as a later optimization

## Quick Examples

| Scenario | Wrong | Right |
|---|---|---|
| Public tournament standings, interactive refetch | `useSupabaseQuery` browser read of `standings` | `/api/v1/tournaments/[id]/standings` with `resolveApiAuth` + `'use cache'` fetcher + `public, s-maxage` |
| Caller's own profile | `public, s-maxage=…` on `/api/v1/me/profile` | `private, no-store` + `resolveApiAuth` |
| Community list on the tournaments page | `useSupabaseQuery` in a Client Component | SSR Server Component with `'use cache'` + `createStaticClient()` |
| Mobile loading standings after a match | Direct `supabase.from('standings').select()` in Expo | `GET /api/v1/tournaments/[id]/standings` with `Authorization: Bearer <token>` |

## Canonical Implementations

| Pattern | File |
|---|---|
| Locked route handler shape (public data, auth-gated) | `apps/web/src/app/api/v1/tournaments/[id]/standings/route.ts` |
| Per-user route (private, no-store) | `apps/web/src/app/api/v1/me/profile/route.ts` |
| Auth resolver (Bearer + cookie dual-mode) | `apps/web/src/lib/api/auth.ts` — `resolveApiAuth` |
| Rate-limit helper | `apps/web/src/lib/api/rate-limit.ts` — `enforceRateLimit`, `extractRequestIp` |
| Explicit-column public query | `packages/supabase/src/queries/tournaments.ts` — `getPublicTournamentStandings` |

## Decisions Document

Full rationale, trade-offs, and architectural decisions:
`docs/decisions/2026-06-11-data-access-and-rls-decisions.md`

## Related Skills

- `querying-supabase` — client selection (server / client / mobile), query conventions
- `reviewing-database` — RLS policies, indexes, N+1, `select('*')` in versioned APIs
- `reviewing-caching` — `'use cache'` patterns, `cacheTag`/`cacheLife`, TanStack Query, `Cache-Control` checklist
- `building-web-app` — Server Actions, data fetching, cache invalidation helpers
