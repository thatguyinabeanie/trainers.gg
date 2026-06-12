# Data-Access Architecture — Phase 2 Implementation Plan

Date: 2026-06-11
Source of truth: `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` (architecture
decisions are **LOCKED** — this plan translates them into tasks, it does not re-decide).
Companion audit: `docs/audits/2026-06-11-rls-audit.md`.

**Scope of Phase 2 (from the decisions doc, §Rollout):** Move S-bucket (shared-public)
_client_ reads onto Next.js route handlers with tag-invalidated CDN caching; migrate the
mobile API off the `api-*` edge functions onto those same routes; then revoke
`anon`/`authenticated` SELECT on S-bucket base tables — **excluding the realtime six**
(post-decision consideration #0).

## Branch

`feat/data-access-phase2` — branched off **PR #354's branch** (`docs/architecture-considerations`)
if #354 has not merged yet, or off `main` once #354 lands. Phase 2 **depends on the Phase 0/1
RLS fixes** (the `public_user_profiles` / registrations views, the team-sheet state-gate, the
base-table locks, and the `api`/`internal` schema reorg) — those are what make the S-bucket
revoke safe. Confirm with the orchestrator which base branch is live before Task 1.

## How to use this plan

Execute with **subagent-driven development** (`superpowers:subagent-driven-development`).
Dispatch each task to a subagent at the **model tier noted on the task** (sonnet for mechanical
migration, **opus for the spike (Task 1) and the two cross-cutting design-sensitive helpers**).
Give each subagent the exact file allowlist. After each task, run the two-stage review (spec
compliance + code quality). **Subagents self-verify scoped `pnpm typecheck --filter` and
`pnpm lint --filter` on the packages they touched and fix their own scope before reporting** —
they do NOT commit or push; they report changed files + a suggested commit message. The
orchestrator commits between waves.

Every PR in this phase bakes in **codegen + tests** (post-decision consideration #4): tests that
asserted old permissive behavior must be fixed to assert the new behavior (never weaken a policy
to keep a test green), and any schema/type change ends with `pnpm generate-types`.

### Shared local Supabase constraint

There is **one** local Supabase DB. Only one task may hold `pnpm db:reset` / `pnpm generate-types`
at a time. **All DB-touching tasks are serialized** (Task 9 is the only migration in this phase).
Endpoint and helper tasks that touch only TypeScript run in parallel with disjoint allowlists.

### Standing rules carried from the decisions doc (apply to every task)

- **Realtime carve-out (#0):** the six realtime tables — `notifications`, `match_games`,
  `match_messages`, `tournament_matches`, `tournament_registrations`, `tournament_rounds` — keep
  `authenticated` SELECT with their post-fix scoped quals. **Never revoke `authenticated` SELECT
  on these six.** They are explicitly excluded from Task 9's base-table revoke.
- **Column-homogeneous sensitivity:** a table may only stay realtime-published for an audience if
  _every column_ is safe for that audience (payloads can't be column-filtered). Do not add a
  column to a realtime table without checking this.
- **Double-egress accepted (#5):** mobile-via-Vercel consciously pays Supabase→Vercel +
  Vercel→client egress on cache misses. Do not "optimize" this away.
- **SSR/ISR pages never ride the API** — they keep querying the DB directly (service-role /
  static client). Phase 2 changes _client_ reads only.

### Dependency / parallelism map

```
WAVE A (gate — sequential, opus):
  Task 1  Caching spike — ONE endpoint (standings) end-to-end + docs deep-read
          └─ must PASS before any mass migration. Produces the canonical
             route-handler + cache + dual-auth pattern every later task copies.

WAVE B (cross-cutting helpers — parallel after Task 1, opus + sonnet):
  Task 2  Shared mobile-auth Bearer/cookie helper   (opus)   ─┐ disjoint files
  Task 3  Shared rate-limit helper                  (sonnet) ─┤
  Task 4  Promote query-factory into @trainers/supabase (sonnet) ─┘
          (Tasks 2–4 touch disjoint files; all depend only on Task 1's pattern)

WAVE C (per-endpoint migration — parallel, sonnet, after Wave B):
  Task 5  Tournaments S-bucket read endpoints        ─┐
  Task 6  Communities S-bucket read endpoints         │ each owns its own
  Task 7  Players / ratings S-bucket read endpoints    │ route dirs + client
  Task 8  Usage / team_slots S-bucket read endpoints  ─┘ hooks — disjoint files

WAVE D (lock-down migration — sequential, after Wave C fully lands):
  Task 9  Revoke anon/authenticated SELECT on S base tables (migration)
          EXCLUDING the realtime six. Codegen + guardrail test. opus reviews.

WAVE E (retire — after Task 9, sonnet):
  Task 10 Retire the api-* edge functions + point mobile fully at Next.js
```

- **Wave A is a hard gate.** Do not start Wave B until the spike passes its three checks
  (cache hits skip DB, tag invalidation refreshes, both auth modes work).
- **Wave C tasks are mutually parallel** — each owns a disjoint set of route directories under
  `apps/web/src/app/api/` and a disjoint set of client hooks. They all _consume_ the Wave B
  helpers but never edit them.
- **Task 9 is gated on all of Wave C** — you cannot revoke base-table SELECT until every client
  read of that table goes through the API.
- **Task 10 is gated on Task 9** and on the mobile endpoints existing (Tasks 5–8 build them).

---

## Task 1 — Caching spike: standings endpoint end-to-end (GATE)

**Model:** opus (design-sensitive; this pattern is copied by every later task).

**Objective.** Before any mass migration, prove the full S-bucket route-handler pattern works on
**one** endpoint: tournament standings. This is post-decision consideration #2 — _"mass migration
only after the spike passes; docs lag this stack's bleeding edge."_

**Parallelizable:** No — hard gate for the whole phase.

**Step 0 — docs deep-read (no code).** Read and take notes on:

- Next.js 16 Route Handler caching under Cache Components (`cacheComponents: true`). Route
  handlers do **not** inherit `'use cache'` from page conventions — confirm how a `GET` handler
  caches: via a `'use cache'`-wrapped fetcher it calls, with `cacheTag()` + `cacheLife()`, exactly
  as the page fetchers do. Cross-check `.claude/skills/reviewing-caching/SKILL.md` ("dynamic hole"
  gotcha — `revalidate: 0` / `expire < 5m` silently becomes uncached).
- Vercel CDN behavior for route handlers (what makes a response CDN-cacheable; `Cache-Control` vs
  tag invalidation; how `revalidateTag(tag, 'max')` busts a CDN-cached handler response).
- Supabase SSR auth in a route handler: how `createStaticClient()` (cookie-less, anon) reads
  inside a cached fetcher, and how an authed read (cookie or Bearer) is kept **outside** the cache
  scope.

**Files (allowlist):**

- CREATE `apps/web/src/app/api/v1/tournaments/[id]/standings/route.ts`
  (the `/api/v1/…` prefix is the locked home for the future versioned public API — start the
  S-bucket reads there so the namespace is established from day one).
- CREATE `apps/web/src/lib/data/standings-endpoint.ts` (the `'use cache'`-wrapped fetcher the
  route calls — mirrors `apps/web/src/lib/data/usage-cache.ts`).
- The standings query wrapper already exists in
  `packages/supabase/src/queries/tournaments.ts` (`getTournamentStandings`) — **reuse it**, do
  not rewrite it.

**Build it.**

1. `standings-endpoint.ts`: a `getCachedTournamentStandings(tournamentId: number)` function:
   ```ts
   "use cache";
   cacheTag(CacheTags.tournament(tournamentId)); // existing tag — standings bust with the tournament
   cacheLife("max"); // tag-invalidated entity
   const supabase = createStaticClient();
   return getTournamentStandings(supabase, tournamentId);
   ```
   Standings are public S-bucket data — same for all viewers — so `createStaticClient()` is
   correct (per `reviewing-caching` decision tree: "same for ALL users → 'use cache' +
   createStaticClient").
2. `route.ts` `GET` handler:
   - Validate `params.id` → `Number()` + `Number.isNaN()` → `404` (per nextjs-conventions route
     boundary rule).
   - **Auth is required even for a public-data endpoint** because the locked constraint is "no
     anonymous open Data API." Use the Task 2 helper _once it exists_; for the spike, inline a
     minimal version: accept a logged-in web cookie session **or** a mobile Bearer token; reject
     anonymous with `401`. (The spike's inline auth is replaced by the Task 2 helper in Wave C —
     leave a `// TODO(phase2-task2): swap to shared resolveApiAuth()` marker.)
   - On success: `return Response.json(await getCachedTournamentStandings(id))`.
   - Set `Cache-Control` per the docs-read finding (tag-invalidated, so a long s-maxage with
     `stale-while-revalidate` is appropriate — record the exact header you chose and why in a
     file-level JSDoc).

**Verification (all three MUST pass before the gate opens):**

1. **Cache hits skip the DB.** With local Supabase running, hit the endpoint twice for the same
   tournament; confirm the second request does not issue a DB query (watch
   `.dev-logs/dev.log` for the Supabase query, or add a temporary `console.count` inside the
   uncached path and confirm it increments only once). Remove any temporary instrumentation
   before reporting.
2. **Tag invalidation refreshes.** Call `revalidateTag(CacheTags.tournament(id), 'max')` (e.g. via
   a throwaway script or the existing `/api/revalidate/usage` pattern adapted) and confirm the
   next request re-hits the DB and returns updated data.
3. **Both auth modes work.** A request with a valid web cookie session returns `200`; a request
   with `Authorization: Bearer <valid mobile JWT>` returns `200`; an anonymous request returns
   `401`.

Report the chosen `Cache-Control` header, the dual-auth approach, and evidence of all three
checks. **If any check fails, stop and surface to the orchestrator — do not proceed to Wave B.**

---

## Task 2 — Shared mobile-auth Bearer/cookie helper

**Model:** opus (security-sensitive; every API route depends on it).

**Objective.** Post-decision consideration #1: one shared helper for API routes — **Bearer-token
check (mobile) first, cookie fallback (web)** — built before any mobile endpoint migrates.

**Parallelizable:** Yes — with Tasks 3, 4 (disjoint files). Depends on Task 1's pattern.

**Files (allowlist):**

- CREATE `apps/web/src/lib/api/auth.ts`
- CREATE `apps/web/src/lib/api/__tests__/auth.test.ts`
- (does NOT edit `apps/web/src/lib/supabase/server.ts` — it _uses_ the existing client factories)

**Build `resolveApiAuth(request: Request)`:**

1. Read `Authorization` header. If it starts with `Bearer ` (case-insensitive):
   - Treat the token as a Supabase access JWT (the mobile path — mobile sends
     `session.access_token`, see `apps/mobile/src/lib/api/client.ts`).
   - Construct a Supabase client authenticated with that bearer token (anon client +
     `global.headers.Authorization`), call `auth.getUser()` to validate it, and return
     `{ mode: "bearer", userId, supabase }` on success or `null` on an invalid/expired token.
2. Else, fall back to the **web cookie** path: `createClientReadOnly()` (read-only — route handlers
   should not mutate the session), `auth.getUser()`, return `{ mode: "cookie", userId, supabase }`
   or `null`.
3. Return type: a discriminated union
   `{ mode: "bearer" | "cookie"; userId: string; supabase: TypedSupabaseClient } | null`.
   Caller maps `null` → `401`.

Notes for the implementer:

- The existing `/api/tournaments` route _rejects_ Bearer tokens with a redirect to the edge
  function — that rejection is the thing this helper replaces. Do not copy that rejection.
- Never log token values (mobile CLAUDE.md token-handling rule).
- Use `safeCompare` only where comparing a known secret; for JWTs, validation is via
  `auth.getUser()`, not string compare.

**Tests:** Bearer path returns `mode: "bearer"` + userId for a valid token (mock `auth.getUser`);
invalid Bearer → `null`; no header falls back to cookie path; cookie path success + failure.

**Verification:** `pnpm --filter @trainers/web typecheck` + `lint` clean; tests green.

---

## Task 3 — Shared rate-limit helper for API routes

**Model:** sonnet.

**Objective.** Post-decision consideration #3: a modest shared rate-limit helper on API routes
(max N req / user-or-IP / min), reusing existing machinery, shipped before the routes go wide.

**Parallelizable:** Yes — with Tasks 2, 4 (disjoint files).

**Files (allowlist):**

- CREATE `apps/web/src/lib/api/rate-limit.ts`
- CREATE `apps/web/src/lib/api/__tests__/rate-limit.test.ts`

**Reuse the existing `rate_limits` table.** It already exists (baseline migration:
`packages/supabase/supabase/migrations/00000000000000_baseline.sql`):
`(identifier text unique, request_timestamps timestamp[], window_start, expires_at, …)`. No new
migration — this task is TypeScript only.

**Build `enforceRateLimit({ identifier, limit, windowMs })`:**

- `identifier` = `userId` when authed (from Task 2's helper) else the request IP
  (`x-forwarded-for` first hop). Document the IP-extraction caveat.
- Sliding-window check against `rate_limits`: prune timestamps older than `windowMs`, count the
  rest, append `now` if under `limit`, upsert the row. Use `createServiceRoleClient()` (the table
  is X-bucket deny-all to clients — only service role touches it).
- Return `{ allowed: boolean; remaining: number; resetAt: Date }`. Caller maps `allowed: false`
  → `429` with a `Retry-After` header.
- Keep limits modest and centralized as named constants (e.g. `DEFAULT_API_LIMIT = 120/min`).
  Full per-key quotas arrive with the public-API product — out of scope here.

**Tests:** under-limit allows and decrements `remaining`; over-limit returns `allowed: false`;
window expiry resets the count (mock time / the table read).

**Verification:** `pnpm --filter @trainers/web typecheck` + `lint` clean; tests green.

---

## Task 4 — Promote `query-factory.ts` into `@trainers/supabase`

**Model:** sonnet.

**Objective.** Decision #4: the S-bucket API reads use a _shared hand-rolled factory_. Promote
mobile's `query-factory.ts` (`useApiQuery` / `useApiMutation`) into `@trainers/supabase` so both
web and mobile import one canonical factory.

**Parallelizable:** Yes — with Tasks 2, 3 (disjoint files).

**Files (allowlist):**

- CREATE `packages/supabase/src/hooks/query-factory.ts` (moved/generalized from
  `apps/mobile/src/lib/api/query-factory.ts`)
- MODIFY `packages/supabase/src/index.ts` (barrel — add explicit named exports `useApiQuery`,
  `useApiMutation`)
- MODIFY `apps/mobile/src/lib/api/query-factory.ts` → re-export from `@trainers/supabase` for
  back-compat (so existing mobile imports keep working), OR update mobile call sites — **prefer
  the re-export shim** to keep this task's blast radius small.

**Generalization needed.** The mobile factory hardcodes `apiCall` (which targets edge functions
at `EDGE_FUNCTIONS_URL`). The promoted version must take the **fetch function as a parameter /
config** so web can pass a fetcher that hits `/api/v1/…` on the same origin and mobile can pass
one that hits the Vercel API base URL with a Bearer token. Keep the `ActionResult<T>` unwrap
(`if (!result.success) throw`) and the `invalidates` cache-busting in `useApiMutation`.

- Do **not** put `react`/`@tanstack/react-query` imports anywhere that breaks the package's
  framework-import boundary (`.claude/rules/architecture.md`). A hooks file that imports React in
  a shared package is acceptable here because both consumers are React — confirm the package
  already ships React hooks (`packages/supabase/src/hooks/use-supabase-query.ts` does), so this is
  consistent.

**Tests:** if `packages/supabase/src/hooks/__tests__/` exists, add a factory test (query unwrap
throws on `success: false`, mutation calls `invalidates`); otherwise co-locate one. Keep mobile's
existing usage compiling.

**Verification:** `pnpm --filter @trainers/supabase typecheck` + `lint`; `pnpm --filter
@trainers/mobile typecheck` (the re-export shim must keep mobile green).

---

## Task 5 — Tournaments S-bucket read endpoints + web hooks

**Model:** sonnet.

**Objective.** Migrate the tournament-family S-bucket _client_ reads onto `/api/v1/tournaments/…`
route handlers (copying the Task 1 pattern + Task 2 auth + Task 3 rate-limit), and repoint the web
client hooks that currently call `useSupabaseQuery` for those reads onto the promoted factory
(Task 4) hitting the new routes.

**Parallelizable:** Yes — with Tasks 6, 7, 8 (each owns disjoint route dirs + hooks).

**Files (allowlist):**

- CREATE route handlers under `apps/web/src/app/api/v1/tournaments/…` for the S-bucket reads that
  the client currently makes via `useSupabaseQuery`. Grep first:
  `rg "useSupabaseQuery" apps/web/src --files-with-matches | rg -i "tournament|match|round|standing|registration"`.
  Map each client read to a route. Reuse the existing query wrappers in
  `packages/supabase/src/queries/tournaments.ts` (e.g. `getTournamentById`, `getTournamentRounds`,
  `getPhaseRoundsWithStats`, `getTournamentStandings`) inside `'use cache'` fetchers in
  `apps/web/src/lib/data/`.
- CREATE the matching `'use cache'` fetchers in `apps/web/src/lib/data/tournaments-endpoints.ts`.
- MODIFY only the web client components/hooks that read tournament S-bucket data — swap
  `useSupabaseQuery(client => getX(client, …))` → `useApiQuery([...], "/api/v1/tournaments/…")`.

**Important carve-out (realtime six):** `tournament_matches`, `tournament_registrations`,
`tournament_rounds` are realtime tables. Their **realtime subscriptions stay** (Phase 3 makes them
payload-driven). For _initial-load reads_ of these tables you may still route through the API for
the cached snapshot, but do **not** remove the realtime subscription here — that's Phase 3. The
**registration-count realtime subscription on the public tournament page is removed** and replaced
with tag-revalidated cached data (post-decision consideration #0) — do that swap here:

- Remove the registration-count `postgres_changes` subscription in
  `apps/web/src/components/tournament/tournament-sidebar-card.tsx`.
- Replace the count with a value from the cached standings/registration-count endpoint (busted by
  `invalidateTournamentListCaches(id)` on registration changes — that helper already exists).

**Caching:** each fetcher uses `cacheTag(CacheTags.tournament(id))` (+ `TOURNAMENTS_LIST` for list
endpoints) and `cacheLife("max")`. No new tag needed — the existing tournament tags + invalidation
helpers cover these.

**Tests:** for any new fetcher with non-trivial logic, add a test; route handlers get a thin smoke
test (200 on valid auth + id, 401 anon, 404 bad id) if the repo has a route-handler test pattern —
check `apps/web/src/app/api/**/__tests__/` first; do not invent a new location.

**Verification:** self-verify `pnpm --filter @trainers/web typecheck` + `lint`; the migrated reads
return identical data to before (compare a couple by hand).

---

## Task 6 — Communities S-bucket read endpoints + web hooks

**Model:** sonnet.

**Objective.** Same migration as Task 5, for the community-family S-bucket client reads.

**Parallelizable:** Yes — with Tasks 5, 7, 8.

**Files (allowlist):**

- CREATE route handlers under `apps/web/src/app/api/v1/communities/…`.
- CREATE `apps/web/src/lib/data/communities-endpoints.ts` (`'use cache'` fetchers reusing
  `packages/supabase/src/queries/communities.ts`: `getCommunityBySlug`, `listCommunities`,
  `getCommunityStats`, `getTopReturningPlayers`, staff/activity reads).
- MODIFY only the web client hooks/components reading community S-bucket data
  (`rg "useSupabaseQuery" apps/web/src --files-with-matches | rg -i "communit|organization"`).

**Caching:** `cacheTag(CacheTags.community(slug), CacheTags.community(id))` (+ `COMMUNITIES_LIST`
for the list); `cacheLife("max")`. Existing `invalidateCommunityPageCaches` covers busting.

**Tests / Verification:** as Task 5.

---

## Task 7 — Players / ratings / users S-bucket read endpoints + web hooks

**Model:** sonnet.

**Objective.** Same migration, for player/ratings/public-user-profile S-bucket client reads.
These reads must now go through the **`public_user_profiles` view** (Phase 0 fix #1) for user
fields, never the locked `users` base table.

**Parallelizable:** Yes — with Tasks 5, 6, 8.

**Files (allowlist):**

- CREATE route handlers under `apps/web/src/app/api/v1/players/…` (note: there are _existing_
  `apps/web/src/app/api/players/…` routes — the new versioned ones live under `/api/v1/players/…`;
  do not edit the old ones in this task, Task 10 reconciles them).
- CREATE `apps/web/src/lib/data/players-endpoints.ts` (`'use cache'` fetchers reusing
  `packages/supabase/src/queries/players.ts`, `ratings.ts`, and the public-profile reads in
  `users.ts` — confirm those read the view post-Phase-1).
- MODIFY only the web client hooks/components reading player/ratings/public-profile data
  (`rg "useSupabaseQuery" apps/web/src --files-with-matches | rg -i "player|leaderboard|rating|profile"`).

**Caching:** `cacheTag(CacheTags.player(username))` (+ directory/leaderboard tags as the existing
fetchers use); `cacheLife("max")`. Existing player invalidation helpers cover busting.

**Tests / Verification:** as Task 5.

---

## Task 8 — Usage / team_slots S-bucket read endpoints + web hooks

**Model:** sonnet.

**Objective.** Same migration, for the usage/analytics S-bucket _client_ reads. The cached
**page** fetchers already exist (`apps/web/src/lib/data/usage-cache.ts`); this task covers any
_client-side_ `useSupabaseQuery` reads of usage/`team_slots` that should move behind the API.

**Parallelizable:** Yes — with Tasks 5, 6, 7.

**Files (allowlist):**

- CREATE route handlers under `apps/web/src/app/api/v1/usage/…` (only for reads the **client**
  makes directly; the `/data` page itself is SSR and keeps its existing cached fetchers — do not
  touch SSR page fetching).
- CREATE `apps/web/src/lib/data/usage-endpoints.ts` if new fetchers are needed, else reuse
  `usage-cache.ts`.
- MODIFY only the web client hooks/components reading usage data via `useSupabaseQuery`
  (`rg "useSupabaseQuery" apps/web/src --files-with-matches | rg -i "usage|species|pipeline|team_slot"`).

**Caching:** `cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(format))`; `cacheLife("hours")`
(usage is the one S-bucket family on `"hours"`, not `"max"` — match the existing `usage-cache.ts`).

**Tests / Verification:** as Task 5.

---

## Task 9 — Revoke `anon`/`authenticated` SELECT on S base tables (migration)

**Model:** sonnet to author; **opus reviews** (security-sensitive, and `migration-reviewer` +
`security-reviewer` are auto-dispatched per repo rules).

**Objective.** Decision: now that S-bucket client reads go through the API (Wave C), revoke the
broad `anon`/`authenticated` SELECT on S-bucket base tables so the anon/authed keys can no longer
scrape them directly — the second wall behind the API layer. **EXCLUDE the realtime six.**

**Parallelizable:** No — single migration, gated on all of Wave C. This is the only DB task in the
phase, so it owns `db:reset` / `generate-types`.

**Files (allowlist):**

- CREATE `packages/supabase/supabase/migrations/<UTC-timestamp>_phase2_revoke_s_bucket_select.sql`
- Generated `packages/supabase/src/types.ts` will change after `pnpm generate-types` — let the
  command rewrite it; do not hand-edit.

**What to revoke.** From the audit's S-bucket list (34 tables, `docs/audits/2026-06-11-rls-audit.md`
table classification), revoke `SELECT` from `anon` and `authenticated` on the S base tables that
the client no longer reads — examples: `tournaments`, `tournament_standings`,
`tournament_pairings`, `tournament_team_sheets`, `team_slots`, `player_ratings`, `users`, `alts`,
and the rest of the S set.

**MUST NOT revoke (realtime six — consideration #0):** `notifications`, `match_games`,
`match_messages`, `tournament_matches`, `tournament_registrations`, `tournament_rounds` keep
`authenticated` SELECT (their post-fix scoped quals govern realtime delivery). `notifications` is
P-bucket but is realtime-published, so it also stays `authenticated`-readable.

**Conventions:**

- `REVOKE SELECT ON public.<table> FROM anon, authenticated;` per table, each guarded so the
  migration is idempotent and re-runnable on a fresh `db:reset`.
- SSR/ISR pages use service-role / the views — **confirm** every SSR page that reads a now-revoked
  table uses `createStaticClient()` against a still-readable view or `createServiceRoleClient()`,
  not an authed client. (The Phase 0/1 views — `public_user_profiles`, the registrations view —
  are the public read path; they must remain `anon`/`authenticated` SELECTable.)
- Add a `COMMENT ON TABLE` note on the locked tables documenting "client reads via /api/v1; base
  SELECT revoked Phase 2."
- **CI guardrail (from decisions #5 / #9 spirit):** if the repo has a privilege-map guardrail test,
  extend it to assert the revoke held. If not, this task does not invent one (that backstop landed
  in Phase 1) — but add a smoke test asserting an anon PostgREST `select` on `tournaments` returns
  no rows / permission denied.

**Verification:**

```bash
pnpm db:reset          # full replay must succeed
pnpm generate-types    # regenerate types
```

Then confirm: an anonymous PostgREST `SELECT` on a revoked table (e.g. `tournaments`) is denied,
while the public view still returns rows; the realtime six still return rows to an authed client;
the migrated app pages still render (SSR uses the right client). Fix any SSR page caught using an
authed client against a revoked table.

---

## Task 10 — Retire the `api-*` edge functions; point mobile fully at Next.js

**Model:** sonnet.

**Objective.** Decision #2: "the `api-*` edge functions retire; mobile migrates to Next.js routes;
one canonical API." Repoint mobile's `apiCall` base from `EDGE_FUNCTIONS_URL` to the Vercel
`/api/v1/…` base (Bearer auth via Task 2's helper, which all `/api/v1` routes now use), and remove
the five `api-*` edge functions.

**Parallelizable:** No — gated on Task 9 (and on the `/api/v1` read routes from Tasks 5–8 existing).

**Files (allowlist):**

- MODIFY `apps/mobile/src/lib/api/client.ts` — point `apiCall` at the Vercel API base + `/api/v1/…`
  paths; keep the `Authorization: Bearer ${accessToken}` injection (now consumed by Task 2's
  `resolveApiAuth`).
- MODIFY mobile hooks that referenced `api-*` endpoints → new `/api/v1/…` paths.
- MODIFY `apps/web/src/app/api/tournaments/route.ts` (and the other pre-existing non-versioned
  `/api/tournaments`, `/api/teams`, `/api/players` routes) — reconcile: either redirect to `/api/v1`
  or remove the Bearer-rejection block now that Bearer is supported. Decide per route; document the
  choice. **Do not break web flows that already call these.**
- DELETE the five `api-*` edge function directories under
  `packages/supabase/supabase/functions/`: `api-alts`, `api-matches`, `api-notifications`,
  `api-organizations`, `api-tournaments`. **Keep** all plumbing functions (`signup`,
  `bluesky-auth`, `send-auth-email`, `send-org-request-notification`, `sync-community-profile`,
  `update-pds-handle`, `provision-*`, `import-tick`).
- Check for references to the deleted functions (`rg "api-tournaments|api-matches|api-alts|api-notifications|api-organizations" packages apps`) and clean them up.

**Gotcha (mobile auth, deferred item).** The mobile `bluesky-auth` ownership-proof issue (F-1) and
the `api-*` 500-error-leak (F-6 mobile half) are documented in `apps/mobile/CLAUDE.md` as deferred
until mobile work resumes. Retiring `api-*` _resolves F-6's mobile half by construction_ (the
sanitized Next.js routes replace them). **F-1 is NOT in this task's scope** — it's a `bluesky-auth`
fix, and `bluesky-auth` is plumbing that stays. Flag to the orchestrator: confirm with the user
whether F-1 should be folded into this phase (mobile is becoming active) or stay deferred.

**Verification:** `pnpm --filter @trainers/mobile typecheck`; `rg` finds no live references to the
deleted functions; web flows that used the old `/api/*` routes still work.

---

## Phase 2 verification (before PR)

- Spike (Task 1) passed all three checks (documented in the PR description).
- `pnpm db:reset` replays clean; `pnpm generate-types` ran (committed type changes).
- All S-bucket client reads go through `/api/v1/…` (no remaining `useSupabaseQuery` on S-bucket
  tables — confirm with a final `rg`).
- The realtime six still `authenticated`-SELECTable; anon scrape of a revoked S table is denied.
- The five `api-*` edge functions are gone; mobile points at `/api/v1`.
- CI green: enumerate Lint, Typecheck, Tests, E2E, preview deploy each by name before declaring
  green (repo Completion-Claims rule).
- Auto-dispatched reviewers on this diff: `migration-reviewer` (Task 9), `security-reviewer`
  (auth + RLS revoke), `code-reviewer`, `ci-monitor` + `background-checker` after push.

## Open questions to confirm with the user before execution

1. **Base branch:** Is PR #354 merged to `main` yet? Phase 2 needs the Phase 0/1 views + locks +
   `api`/`internal` schema reorg. If #354 is unmerged, branch off `docs/architecture-considerations`.
2. **Versioned namespace now vs later:** This plan starts S-bucket reads under `/api/v1/…` (the
   locked public-API home) so the namespace exists from day one. Confirm that's desired, or whether
   Phase 2 should use an internal prefix (e.g. `/api/internal/…`) and reserve `/api/v1` strictly for
   the future _product_ public API.
3. **F-1 (`bluesky-auth` ownership proof):** mobile is becoming active in this phase (Task 10).
   Fold the F-1 fix in now, or keep it deferred per `apps/mobile/CLAUDE.md`?
4. **Old `/api/*` routes:** redirect-to-`/api/v1` vs delete vs keep — confirm the preferred
   reconciliation for the pre-existing `/api/tournaments`, `/api/teams`, `/api/players` handlers.
