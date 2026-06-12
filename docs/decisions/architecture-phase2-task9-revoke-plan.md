# Data-Access Architecture — Phase 2 Task 9: Safely Revoking `anon`/`authenticated` SELECT on S-bucket Base Tables

Date: 2026-06-12
Branch: `docs/architecture-considerations` (ALL work stays here — **no new branches**)
Parent plan: `docs/decisions/architecture-phase2-plan.md` (Task 9 is the "lock-down migration" wave).
Source of truth: `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` (architecture decisions are
**LOCKED** — this plan translates Task 9 into safe, executable steps; it does not re-decide anything).
Companion audit: `docs/audits/2026-06-11-rls-audit.md` (the table classification this plan revokes against).

---

## 0. Why this plan exists (read this first)

The parent Phase 2 plan treated "Task 9 — revoke S-bucket base-table SELECT" as a **single migration**
gated on "all of Wave C". That framing was correct at the altitude of the parent plan, but a closer audit
of the actual codebase (already completed — see `§3 Audit findings`) showed that Task 9 cannot be one
migration. The reason:

> Many `'use cache'` server fetchers and SSR pages read S-bucket tables through
> **`createStaticClient()`**, which is keyed with the **anon** Supabase key. The moment we
> `REVOKE SELECT ... FROM anon`, every one of those anon-keyed reads returns **zero rows** (RLS/`GRANT`
> denial), and the failure is **silent** — the cache stores an empty result and serves it to everyone.

So the revoke is not "flip a switch." It is "migrate every reader off the anon key first, then revoke, in
the right order, with tests proving the readers still work." This plan is that ordered, test-bearing,
parallel-wave breakdown.

### 0.1 The core mechanic everyone must understand

There are three Supabase clients in play. Their grant-sensitivity is the whole game:

| Client                        | Key used                    | After we `REVOKE ... FROM anon, authenticated`              |
| ----------------------------- | --------------------------- | ----------------------------------------------------------- |
| `createStaticClient()`        | **anon** key                | reads of revoked tables return **0 rows** (silent break)    |
| `createClientReadOnly()`      | **anon** key + user cookie  | reads as `authenticated`; revoked tables return **0 rows**  |
| browser anon client (Part A)  | **anon** key (in the browser) | reads of revoked tables return **0 rows** (silent break)  |
| `createServiceRoleClient()`   | **service-role** key        | **bypasses RLS and grants entirely** — always reads         |

The fix has two shapes, applied per reader:

1. **Server-side reader (SSR page / `'use cache'` fetcher)** → swap `createStaticClient()`
   (and any `createClientReadOnly()` used purely for a public read) → **`createServiceRoleClient()`**.
   This is the **mechanical server swap** (Part B). Because service-role bypasses grants, the read keeps
   working after the revoke. The `'use cache'` wrapper, `cacheTag()`, and `cacheLife()` are **kept exactly
   as-is** — swapping the client does not change the cache key (service-role is a constant, not a per-user
   value), so the cache stays correct and shared.

2. **Browser client component reader (`useSupabaseQuery`)** → the browser cannot hold the service-role
   key (it would leak), so the read must move off the browser entirely:
   - **anon-reachable component** (a logged-out visitor can see it) → convert to **SSR**: a server
     component fetches via service-role and passes data down as props. It does **not** move to `/api/v1`,
     because `/api/v1` requires auth and would `401` the logged-out visitor (locked decision).
   - **auth-gated component** (only a logged-in user ever sees it) → move the read to a **`/api/v1` route
     handler** (which `401`s anon by design) and call it from the client via `useApiQuery`.

   This is the **client-component migration** (Part A).

### 0.2 Why `createServiceRoleClient()` inside `'use cache'` is safe here

`reviewing-caching` forbids **authenticated/cookie** clients inside a `'use cache'` scope, because cookies
vary per user and would poison the shared cache. **Service-role does not vary per user** — it is a single
constant identity. Using it inside `'use cache'` is therefore safe *for S-bucket public data*, which is
"the same for all viewers" by definition (that is what makes it S-bucket). The data we are caching is still
public, non-PII, identical for every viewer; we are only changing *which key* fetches it so the read
survives the grant revoke. The cache key (function arguments) is unchanged. **Verify per fetcher that the
data is genuinely public S-bucket** before swapping — if a fetcher reads anything user-specific, it does
not belong in `'use cache'` at all and is out of scope for the mechanical swap (flag it instead).

### 0.3 What is already built (do not rebuild)

Phase 2 Waves A and B from the parent plan have **already landed on this branch**. Confirmed present:

- `apps/web/src/lib/api/auth.ts` — `resolveApiAuth(request)` (Bearer-first, cookie-fallback; `null` → 401).
- `apps/web/src/lib/api/rate-limit.ts` — `enforceRateLimit({ identifier, limit, windowMs })`,
  `extractRequestIp(request)`, `DEFAULT_API_LIMIT` (120), `DEFAULT_WINDOW_MS` (60_000).
- `packages/supabase/src/hooks/query-factory.ts` — `useApiQuery` / `useApiMutation` (promoted, exported
  from the barrel).
- The locked `/api/v1` route pattern, demonstrated end-to-end by
  `apps/web/src/app/api/v1/tournaments/[id]/standings/route.ts` + its `'use cache'` fetcher
  `apps/web/src/lib/data/standings-endpoint.ts` + its test
  `apps/web/src/app/api/v1/tournaments/[id]/standings/__tests__/route.test.ts`.
- Existing `/api/v1` read routes: `standings`, `communities/**`, `players/**`, `usage/**`,
  `tournaments/[id]/{phases,rounds}`. **Their cached fetchers still use `createStaticClient()`** — they
  are part of the Part B swap surface (they are *routes*, but the *fetchers behind them* are anon-keyed).

So this plan does **not** re-create the auth/rate-limit/factory infrastructure or the route pattern. It
**consumes** them.

---

## 1. The locked `/api/v1` route pattern (every new Part A route copies this verbatim)

From `apps/web/src/app/api/v1/tournaments/[id]/standings/route.ts`:

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Validate route params FIRST — a bad id is a 404 before any auth/DB work.
  const { id } = await params;
  const tournamentId = Number(id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // 2. Auth (no anonymous open Data API) — read OUTSIDE the cache scope.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 3. Rate-limit — userId when authed, request IP fallback.
  const identifier = auth.userId ?? extractRequestIp(request);
  const { allowed, resetAt } = await enforceRateLimit({
    identifier,
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": resetAt.toUTCString() } }
    );
  }

  // 4. Return the cached fetcher's result.
  const data = await getCachedThing(tournamentId);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400" },
  });
}
```

Notes that bind every Part A route:

- **Auth-gated routes that read per-user data** use `auth.supabase` (the identity-bound client) for the
  read — **not** a `'use cache'` fetcher, because per-user data is not cacheable. For these, omit the
  `Cache-Control: public` header (or set `private, no-store`) and do not wrap in `'use cache'`.
- **Routes that read public S-bucket data** (e.g. tournament pairings shown to a logged-in judge) wrap the
  read in a `'use cache'` fetcher exactly like standings, using `createServiceRoleClient()` inside the
  scope (per §0.2) and the existing `CacheTags` for that entity.
- Tests follow the standings test shape (`@jest-environment node`, mock `resolveApiAuth` /
  `enforceRateLimit` / the fetcher; assert 404-bad-id / 401-anon / 429-ratelimited / 200-cookie /
  200-bearer / Cache-Control). See
  `apps/web/src/app/api/v1/tournaments/[id]/standings/__tests__/route.test.ts`.

---

## 2. The mechanical server swap (the heart of Part B)

For a `'use cache'` fetcher, the **only** change is the client constructor. Example — current
`apps/web/src/lib/data/standings-endpoint.ts`:

```ts
export async function getCachedTournamentStandings(tournamentId: number) {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId)); // KEEP — unchanged
  cacheLife("max");                              // KEEP — unchanged
  const supabase = createStaticClient();         // ← BEFORE (anon key)
  return getTournamentStandings(supabase, tournamentId);
}
```

After the swap:

```ts
import { createServiceRoleClient } from "@/lib/supabase/server"; // swap the import

export async function getCachedTournamentStandings(tournamentId: number) {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId)); // KEEP — unchanged
  cacheLife("max");                              // KEEP — unchanged
  const supabase = createServiceRoleClient();    // ← AFTER (service-role; survives revoke)
  return getTournamentStandings(supabase, tournamentId);
}
```

Type-safety note: `createServiceRoleClient()` returns the branded `ServiceRoleClient`, which is
`TypedSupabaseClient & { __serviceRole }` (see `packages/supabase/src/client.ts`). Query wrappers accept
`TypedClient` (= `TypedSupabaseClient`), and `ServiceRoleClient` is a **superset** of that type, so passing
it compiles with no cast. The swap is mechanical and type-checked.

The fetcher's JSDoc almost certainly says "createStaticClient() ... inside cache scope" — update that prose
to explain the service-role rationale (§0.2) so the next reader does not "fix" it back to anon.

---

## 3. Audit findings this plan executes against (already done — do NOT re-audit)

### 3.1 The four-step structure (the spine of this plan)

1. **Step 1 — Revoke the 13 zero-reader tables immediately.** They have no client reads at all; revoking
   them is its own migration with **zero app changes**. Lands first, de-risks the rest.
2. **Step 2 — Mechanical server swap (Part B):** `createStaticClient` / `createClientReadOnly`
   → `createServiceRoleClient` in ~17 server fetchers / pages. No behavior change, just key change.
3. **Step 3 — Client-component migration (Part A):** ~27 files. Anon-reachable → SSR; auth-gated →
   `/api/v1`. `use-current-user.ts` goes **first** (highest blast radius — many components depend on it).
4. **Step 4 — Revoke the remaining ~17 tables** once their readers (Steps 2 + 3) are migrated. Second
   migration; gated on Steps 2 and 3 completing.

### 3.2 The 13 trivially-revocable tables (Step 1 — no client reads)

```
tournament_pairings, tournament_team_sheets, tournament_opponent_history,
tournament_events, tournament_templates, tournament_template_phases,
team_slots, permissions, role_permissions, follows, post_likes, posts, pds_handles
```

### 3.3 The remaining revoke-set tables (Step 4 — have readers, revoke after migration)

```
tournaments, tournament_phases, tournament_standings, tournament_player_stats,
alts, teams, team_pokemon, player_ratings, pokemon, communities, community_staff,
groups, roles, group_roles, user_group_roles, coach_profiles, announcements, user_roles
```

### 3.4 Exclusions — NEVER revoke

- **Realtime six** (keep `authenticated` SELECT — payloads can't be column-filtered, scoped quals govern
  delivery): `notifications`, `match_games`, `match_messages`, `tournament_matches`,
  `tournament_registrations`, `tournament_rounds`.
- **`users`** — already locked in Phase 0/1; not in scope.
- **Views** (the public read path — must stay `anon`/`authenticated` SELECTable):
  `public_user_profiles`, `public_tournament_registrations`, `organization_with_owner`.

### 3.5 Part B — server readers needing the mechanical swap (file → tables)

| #   | File                                                                                       | Tables read                                                                                       |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| B1  | `apps/web/src/app/(dashboard)/dashboard/page.tsx`                                          | tournament_player_stats, alts, communities, community_staff, tournament_phases, tournaments       |
| B2  | `apps/web/src/lib/data/tournaments-endpoints.ts`                                           | tournament_phases, tournament_player_stats, alts, teams, tournaments, communities                 |
| B3  | `apps/web/src/lib/data/communities-endpoints.ts`                                           | communities, community_staff, tournaments, alts, groups, group_roles, roles, user_group_roles     |
| B4  | `apps/web/src/lib/data/standings-endpoint.ts`                                              | tournament_standings, alts                                                                        |
| B5  | `apps/web/src/lib/data/players-endpoints.ts`                                               | alts, tournament_player_stats, player_ratings                                                     |
| B6  | `apps/web/src/app/(app)/tournaments/page.tsx`                                              | tournaments, communities, tournament_standings, alts                                              |
| B7  | `apps/web/src/app/(app)/communities/page.tsx`                                              | communities                                                                                       |
| B8  | `apps/web/src/app/(app)/players/page.tsx`                                                  | alts, tournament_player_stats, player_ratings                                                     |
| B9  | `apps/web/src/app/(app)/user/[handle]/page.tsx`                                            | alts                                                                                              |
| B10 | `apps/web/src/app/(app)/coaching/[handle]/page.tsx`                                        | alts, coach_profiles                                                                              |
| B11 | `apps/web/src/app/(dashboard)/dashboard/coaching/page.tsx`                                 | coach_profiles                                                                                    |
| B12 | `apps/web/src/app/(dashboard)/dashboard/alts/[username]/teams/page.tsx` + `new/page.tsx` + `[teamId]/layout.tsx` + `[teamId]/page.tsx` | teams, team_pokemon, pokemon                                            |
| B13 | `apps/web/src/app/(dashboard)/dashboard/teams/page.tsx`                                    | teams, alts                                                                                       |
| B14 | `apps/web/src/app/(app)/tournaments/[tournamentSlug]/page.tsx`                             | tournaments, communities, tournament_phases, alts, teams, team_pokemon, pokemon, community_staff  |
| B15 | `apps/web/src/components/layout/announcement-banner.tsx`                                   | announcements                                                                                     |
| B16 | `apps/web/src/app/(app)/admin/limitless/[tournamentId]/page.tsx`                           | tournaments, alts (**verify exact tables when in the file**)                                      |
| B17 | `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/tournaments/create/page.tsx` | communities, community_staff                                                                  |

### 3.6 Part A — client components that break (file → tables → disposition)

**ANON-REACHABLE → convert to SSR (server component + props; NOT `/api/v1`):**

| #    | File                                                              | Tables                                              |
| ---- | ---------------------------------------------------------------- | --------------------------------------------------- |
| A-S1 | `apps/web/src/components/tournament/public-pairings.tsx`         | tournament_phases, alts, tournament_player_stats    |
| A-S2 | `apps/web/src/components/tournament/tournament-sidebar-card.tsx` | alts, tournaments                                   |

**AUTH-GATED → move read to `/api/v1` (called via `useApiQuery`):**

`hooks/use-current-user.ts` (alts) **[DO FIRST — wave 1 of Step 3]**; then:
`dashboard/overview/overview-client.tsx`; `dashboard/components/teams-sub-table.tsx`;
`dashboard/tournaments/tournaments-client.tsx`; `dashboard/stats/stats-client.tsx`;
the 3 community manage clients (`tournament-manage-client`, `tournament-settings-page-client`,
`create-tournament-client`); `admin/config/page.tsx`; `admin/users/page.tsx`;
`admin/communities/page.tsx`; `admin/coaches/coaches-manager.tsx`;
`admin/config/flag-allowlist-sheet.tsx`; `admin/page.tsx`;
`components/tournaments/manage/{tournament-pairings, tournament-pairings-judge,
tournament-standings, tournament-registrations, tournament-overview}.tsx`;
`components/tournaments/invite/{invitation-list, player-search}.tsx`;
`components/tournaments/tournament-invitations-view.tsx`;
`components/tournaments/create/tournament-basic-info.tsx`;
`components/topnav-auth-section.tsx`; `components/tournament/match-report-dialog.tsx`.

**VERIFY-MAYBE-SAFE (joins may be clean — confirm in-file, only migrate if a revoke-set table is read):**

- `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/page.tsx` (discord — likely safe)
- `apps/web/src/app/(dashboard)/dashboard/community/request/page.tsx` (community_requests — not in revoke set, likely safe)

### 3.7 Mobile (deferred — document, do not block)

Two legacy mobile files (`apps/mobile/src/.../use-communities.ts`, `use-tournament.ts`) and the `api-*` edge
functions read these tables via the anon key and will break. **Mobile is unpublished/deferred.** This plan
**adds a note to `apps/mobile/CLAUDE.md`** documenting the breakage and the migration path
(point mobile at `/api/v1` with a Bearer token via the existing factory), and does **not** block Step 4 on
mobile. The Step 4 revoke proceeds; mobile is fixed when mobile work resumes.

---

## 4. New `/api/v1` routes required for Part A auth-gated cases

These do **not** exist yet (verified — only `standings`, `communities/**`, `players/**`, `usage/**`,
`tournaments/[id]/{phases,rounds}` exist). Deduped so a route serves multiple components:

| New route                                         | Serves (Part A components)                                                   | Read kind         |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| `GET /api/v1/me/profile`                          | `use-current-user.ts`, `topnav-auth-section.tsx`                             | per-user (no cache) |
| `GET /api/v1/me/communities`                      | `overview-client.tsx`, the 3 community-manage clients (their "my communities" list) | per-user          |
| `GET /api/v1/me/tournament-history`               | `overview-client.tsx`, `tournaments-client.tsx`, `stats-client.tsx`          | per-user          |
| `GET /api/v1/me/teams`                            | `teams-sub-table.tsx`                                                        | per-user          |
| `GET /api/v1/me/invitations`                      | `invitation-list.tsx`, `tournament-invitations-view.tsx`                     | per-user          |
| `GET /api/v1/admin/roles`                         | `admin/config/page.tsx`, `flag-allowlist-sheet.tsx`                          | admin (no cache)  |
| `GET /api/v1/admin/users`                         | `admin/users/page.tsx`, `admin/page.tsx`                                     | admin             |
| `GET /api/v1/admin/communities`                   | `admin/communities/page.tsx`                                                 | admin             |
| `GET /api/v1/admin/coaches`                       | `admin/coaches/coaches-manager.tsx`                                          | admin             |
| `GET /api/v1/players/search`                      | `invite/player-search.tsx`, `create/tournament-basic-info.tsx`              | public S-bucket (cache OK) |
| `GET /api/v1/tournaments/[id]/pairings`           | `manage/tournament-pairings.tsx`, `tournament-pairings-judge.tsx`, `match-report-dialog.tsx` | public S-bucket (cache OK) |
| `GET /api/v1/tournaments/[id]/player-stats`       | `manage/tournament-standings.tsx`, `manage/tournament-overview.tsx`, `create-tournament-client` | public S-bucket (cache OK) |
| `GET /api/v1/tournaments/[id]/registrations`      | `manage/tournament-registrations.tsx`                                        | realtime table — see note |

**`/api/v1/me/*` auth rule:** these read the *caller's own* data, so they use `auth.userId` +
`auth.supabase` (the identity-bound client from `resolveApiAuth`) for the read — **no `'use cache'`**,
`Cache-Control: private, no-store`.

**`/api/v1/admin/*` auth rule:** after `resolveApiAuth`, additionally assert the caller is a site admin
(reuse the existing server-side admin check — grep `isSiteAdmin` / the JWT role check used by current admin
pages) → `403` if not. No cache.

**`/api/v1/tournaments/[id]/registrations` note:** `tournament_registrations` is one of the **realtime
six** and is **not** revoked. This route exists only to give the manage client a cached *initial-load
snapshot*; the realtime subscription stays (Phase 3 makes it payload-driven). Because the table keeps
`authenticated` SELECT, this route may read via `auth.supabase`. It is included for consistency with the
other manage reads but is **not** load-bearing for the revoke — flag it as optional if it adds churn.

---

## 5. The two revoke migrations

Both live under `packages/supabase/supabase/migrations/<UTC-timestamp>_*.sql`, both idempotent, both with
`COMMENT ON TABLE`, both excluding the realtime six / `users` / views.

### 5.1 Step-1 migration — `..._phase2_revoke_s_bucket_zero_reader_tables.sql`

Revokes the 13 zero-reader tables (§3.2). Lands **first**, before any app change, because nothing reads
them from a client. Pattern per table:

```sql
-- tournament_pairings: client reads moved to /api/v1 (none existed); base SELECT revoked Phase 2 Task 9.
REVOKE SELECT ON public.tournament_pairings FROM anon, authenticated;
COMMENT ON TABLE public.tournament_pairings IS
  'Client reads via service-role server fetchers / /api/v1; base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12).';
```

`REVOKE` is idempotent by nature (revoking an absent grant is a no-op and does not error), so no `IF EXISTS`
guard is needed on the `REVOKE` itself; the migration replays cleanly on a fresh `db:reset`.

### 5.2 Step-4 migration — `..._phase2_revoke_s_bucket_remaining_tables.sql`

Revokes the remaining ~17 tables (§3.3). Lands **only after Steps 2 and 3 are fully merged** (every reader
of these tables now goes through service-role or `/api/v1`). Same per-table `REVOKE` + `COMMENT ON TABLE`
pattern. Explicitly does **not** touch the realtime six, `users`, or the three views.

Both migrations get reviewed by `migration-reviewer` **and** `security-reviewer` (auto-dispatched per repo
rules for migration + RLS/grant changes).

---

## 6. Phased waves

Execute with **subagent-driven development** (`superpowers:subagent-driven-development`). Dispatch each
task to a subagent at the noted model tier with its **explicit disjoint file allowlist**. Each subagent
**self-verifies** scoped `pnpm typecheck --filter <pkg>` + `pnpm lint --filter <pkg>` on the packages it
touched and fixes its own scope before reporting. **Subagents never commit or push** — they report changed
files + a suggested commit message. **The orchestrator commits between waves.** All work stays on
`docs/architecture-considerations`.

Reviewers: `migration-reviewer` + `security-reviewer` on both revoke migrations (Step 1, Step 4);
`security-reviewer` on the service-role swaps (Step 2) and the admin routes (Step 3);
`code-reviewer` on every wave; `ui-verifier` on the SSR-converted components (A-S1, A-S2) and any
dashboard/admin page whose render path changed.

### Step 1 — Revoke the 13 zero-reader tables (Wave 1)

| Task | Files (disjoint allowlist)                                                                                     | Tables                   | What changes                                                                 | Tests                                                                 | Model  | Reviewers                          |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ | ---------------------------------- |
| T1   | CREATE `packages/supabase/supabase/migrations/<ts>_phase2_revoke_s_bucket_zero_reader_tables.sql`; (regen) `packages/supabase/src/types.ts` via `pnpm generate-types` | the 13 (§3.2)            | `REVOKE SELECT FROM anon, authenticated` + `COMMENT ON TABLE` per table; idempotent | Add/extend the privilege-map guardrail test if one exists (grep `privilege` / `grant` under `packages/supabase/**/__tests__`); else add a smoke assertion that an anon PostgREST `select` on `posts` is denied. Run `pnpm db:reset` to prove clean replay. | sonnet | migration-reviewer, security-reviewer |

Step 1 is independent of Steps 2–4 (no app code reads these 13). It can land in its own commit immediately.

### Step 2 — Mechanical server swap, Part B (Wave 2 — all parallel, disjoint files)

Each task swaps `createStaticClient()` / public-read `createClientReadOnly()` → `createServiceRoleClient()`,
**keeping `'use cache'` + `cacheTag` + `cacheLife` intact** (§2), and updates the fetcher JSDoc to state the
service-role rationale (§0.2). Tasks touch **disjoint files** — they run in one parallel wave.

| Task | Files (disjoint allowlist)                                                                                                                                                              | What changes                                              | Tests                                                                                                                   | Model  | Reviewers        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ | ---------------- |
| T2a  | `apps/web/src/lib/data/standings-endpoint.ts`, `apps/web/src/lib/data/tournaments-endpoints.ts`                                                                                        | swap client in each `'use cache'` fetcher (B2, B4)        | query-level test that each fetcher returns the wrapper's data with a mocked service-role client; assert `'use cache'` tags unchanged via reading the function (no behavior regression) | sonnet | security-reviewer, code-reviewer |
| T2b  | `apps/web/src/lib/data/communities-endpoints.ts`, `apps/web/src/lib/data/players-endpoints.ts`                                                                                         | swap client (B3, B5)                                      | as T2a                                                                                                                  | sonnet | security-reviewer, code-reviewer |
| T2c  | `apps/web/src/app/(app)/tournaments/page.tsx`, `apps/web/src/app/(app)/communities/page.tsx`, `apps/web/src/app/(app)/players/page.tsx`                                                | swap client in each page's data read (B6, B7, B8)         | if the page has a co-located fetcher with logic, test it; else rely on the swap being mechanical + `ui-verifier`        | sonnet | security-reviewer, code-reviewer |
| T2d  | `apps/web/src/app/(app)/user/[handle]/page.tsx`, `apps/web/src/app/(app)/coaching/[handle]/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/coaching/page.tsx`                       | swap client (B9, B10, B11)                                | as T2c                                                                                                                  | sonnet | security-reviewer, code-reviewer |
| T2e  | `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/teams/page.tsx`                                                                             | swap client (B1, B13)                                     | as T2c                                                                                                                  | sonnet | security-reviewer, code-reviewer |
| T2f  | `apps/web/src/app/(dashboard)/dashboard/alts/[username]/teams/page.tsx`, `.../teams/new/page.tsx`, `.../teams/[teamId]/layout.tsx`, `.../teams/[teamId]/page.tsx`                       | swap client (B12)                                         | as T2c                                                                                                                  | sonnet | security-reviewer, code-reviewer |
| T2g  | `apps/web/src/app/(app)/tournaments/[tournamentSlug]/page.tsx`                                                                                                                         | swap client (B14)                                         | as T2c                                                                                                                  | sonnet | security-reviewer, code-reviewer |
| T2h  | `apps/web/src/components/layout/announcement-banner.tsx`, `apps/web/src/app/(app)/admin/limitless/[tournamentId]/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/tournaments/create/page.tsx` | swap client (B15, B16, B17). For B16, **verify exact tables in-file** before swapping | as T2c                                                                                                                  | sonnet | security-reviewer, code-reviewer |

> **Disjointness check:** T2a/T2b own `lib/data/*` files; T2c–T2h own distinct page/component files. No two
> tasks touch the same file. `pnpm generate-types` is **not** run in Step 2 (no schema change), so there is
> no shared `types.ts` contention here.

### Step 3 — Client-component migration, Part A

**Wave 3a (sequential gate — single task, blocks the rest of Step 3):**

| Task | Files (allowlist)                                                                                                                                                                                                       | What changes                                                                                                                                                                 | Tests                                                                                                                       | Model  | Reviewers                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| T3-gate | CREATE `apps/web/src/app/api/v1/me/profile/route.ts` + `__tests__/route.test.ts`; MODIFY `apps/web/src/hooks/use-current-user.ts`; MODIFY `apps/web/src/hooks/index.ts` (if the barrel needs no change, leave it) | Build `/api/v1/me/profile` (per-user, `auth.supabase`, no cache, `private, no-store`). Rewrite `useCurrentUser` from `useSupabaseQuery(getCurrentUser)` → `useApiQuery(["me","profile"], () => fetch("/api/v1/me/profile").then(r => r.json()), { staleTime: 60_000 })`. | Route test (404 n/a — no id; 401 anon; 429; 200 cookie; 200 bearer; `private` cache header). Component test: `useCurrentUser` returns user/alt from a mocked `useApiQuery`; loading + error states. | sonnet | security-reviewer, code-reviewer |

> Why a gate: many auth-gated components (`topnav-auth-section`, `overview-client`, the manage clients)
> depend on `useCurrentUser`. Migrating the hook first means the dependent components can be migrated in
> parallel afterward without each re-implementing the profile read.

**Wave 3b (parallel — new public-S-bucket routes + the SSR conversions; disjoint files):**

| Task | Files (disjoint allowlist)                                                                                                                                                                                       | What changes                                                                                                            | Tests                                                                            | Model  | Reviewers        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ | ---------------- |
| T3a  | CREATE `apps/web/src/app/api/v1/players/search/route.ts` + test; CREATE `apps/web/src/lib/data/players-search-endpoint.ts` (`'use cache'`, service-role)                                                          | Public player search route + cached fetcher (reuse `searchPlayers`-style query in `queries/players.ts`)                | route test (locked shape) + fetcher test                                         | sonnet | code-reviewer    |
| T3b  | CREATE `apps/web/src/app/api/v1/tournaments/[id]/pairings/route.ts` + test; CREATE the `'use cache'` fetcher in `apps/web/src/lib/data/tournaments-endpoints.ts` **append-only** (coordinate: see disjointness note) | Public pairings route + cached fetcher                                                                                  | route test + fetcher test                                                        | sonnet | code-reviewer    |
| T3c  | CREATE `apps/web/src/app/api/v1/tournaments/[id]/player-stats/route.ts` + test; CREATE its `'use cache'` fetcher in a NEW file `apps/web/src/lib/data/tournament-player-stats-endpoint.ts`                          | Public player-stats route + cached fetcher                                                                              | route test + fetcher test                                                        | sonnet | code-reviewer    |
| T3d  | MODIFY `apps/web/src/components/tournament/public-pairings.tsx` (A-S1): convert to SSR — split into a server wrapper that fetches via service-role and a presentational client child fed by props                  | anon-reachable → SSR (NOT `/api/v1`)                                                                                    | component test: presentational child renders pairings from props; server wrapper fetch mocked | sonnet | code-reviewer, ui-verifier |
| T3e  | MODIFY `apps/web/src/components/tournament/tournament-sidebar-card.tsx` (A-S2): convert to SSR; **remove** the registration-count `postgres_changes` realtime subscription, replace with the tag-revalidated cached count (per parent plan) | anon-reachable → SSR; drop realtime sub                                                                                 | component test: renders count from props; assert no realtime subscription remains | sonnet | code-reviewer, ui-verifier |

> **Disjointness note for T3b:** T2a also owns `tournaments-endpoints.ts`. T3b runs in a **later wave**
> (Step 3, after Step 2 has committed), so there is no concurrent edit — the file is free again. To keep
> T3b's addition append-only and avoid churn, it adds a new exported fetcher at the end of the file. If the
> orchestrator prefers strict file isolation, T3b may instead create
> `apps/web/src/lib/data/tournament-pairings-endpoint.ts` (a new file) — choose one and note it in the
> dispatch prompt.

**Wave 3c (parallel — admin routes + their consumers; disjoint files):**

| Task | Files (disjoint allowlist)                                                                                                                                                                                  | What changes                                                                                                          | Tests                                              | Model  | Reviewers                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | ----------------------------- |
| T3f  | CREATE `apps/web/src/app/api/v1/admin/roles/route.ts` + test; MODIFY `apps/web/src/app/(app)/admin/config/page.tsx`, `apps/web/src/app/(app)/admin/config/flag-allowlist-sheet.tsx`                          | Admin roles route (`resolveApiAuth` + site-admin assert → 403); repoint the two config clients via `useApiQuery`     | route test incl. 403-non-admin; component tests    | sonnet | security-reviewer, code-reviewer |
| T3g  | CREATE `apps/web/src/app/api/v1/admin/users/route.ts` + test; MODIFY `apps/web/src/app/(app)/admin/users/page.tsx`, `apps/web/src/app/(app)/admin/page.tsx`                                                   | Admin users route + repoint                                                                                          | route test incl. 403; component tests              | sonnet | security-reviewer, code-reviewer |
| T3h  | CREATE `apps/web/src/app/api/v1/admin/communities/route.ts` + test; MODIFY `apps/web/src/app/(app)/admin/communities/page.tsx`                                                                                | Admin communities route + repoint                                                                                   | route test incl. 403; component test               | sonnet | security-reviewer, code-reviewer |
| T3i  | CREATE `apps/web/src/app/api/v1/admin/coaches/route.ts` + test; MODIFY `apps/web/src/app/(app)/admin/coaches/coaches-manager.tsx`                                                                             | Admin coaches route + repoint                                                                                       | route test incl. 403; component test               | sonnet | security-reviewer, code-reviewer |

**Wave 3d (parallel — the `/api/v1/me/*` routes + dashboard/manage/invite consumers; disjoint files):**

| Task | Files (disjoint allowlist)                                                                                                                                                                                                          | What changes                                                                                            | Tests                                              | Model  | Reviewers        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | ---------------- |
| T3j  | CREATE `apps/web/src/app/api/v1/me/communities/route.ts` + test; CREATE `apps/web/src/app/api/v1/me/tournament-history/route.ts` + test; MODIFY `apps/web/src/app/(dashboard)/dashboard/overview/overview-client.tsx`, `.../tournaments/tournaments-client.tsx`, `.../stats/stats-client.tsx` | `me/*` routes (per-user, no cache); repoint the three dashboard clients via `useApiQuery`               | route tests; component tests                       | sonnet | code-reviewer    |
| T3k  | CREATE `apps/web/src/app/api/v1/me/teams/route.ts` + test; MODIFY `apps/web/src/app/(dashboard)/dashboard/components/teams-sub-table.tsx`                                                                                            | `me/teams` route; repoint                                                                               | route test; component test                         | sonnet | code-reviewer    |
| T3l  | CREATE `apps/web/src/app/api/v1/me/invitations/route.ts` + test; MODIFY `apps/web/src/components/tournaments/invite/invitation-list.tsx`, `apps/web/src/components/tournaments/tournament-invitations-view.tsx`                      | `me/invitations` route; repoint                                                                         | route test; component tests                        | sonnet | code-reviewer    |
| T3m  | MODIFY `apps/web/src/components/tournaments/invite/player-search.tsx`, `apps/web/src/components/tournaments/create/tournament-basic-info.tsx`                                                                                        | repoint onto `GET /api/v1/players/search` (built in T3a)                                                | component tests                                    | sonnet | code-reviewer    |
| T3n  | MODIFY `apps/web/src/components/tournaments/manage/{tournament-pairings,tournament-pairings-judge,tournament-overview}.tsx`                                                                                                          | repoint onto `/api/v1/tournaments/[id]/pairings` (T3b) + `/player-stats` (T3c)                          | component tests                                    | sonnet | code-reviewer    |
| T3o  | MODIFY `apps/web/src/components/tournaments/manage/{tournament-standings,tournament-registrations}.tsx`, `apps/web/src/components/tournament/match-report-dialog.tsx`                                                                | repoint standings onto existing `/api/v1/.../standings`; registrations onto `/api/v1/.../registrations` (keep realtime sub); match dialog onto pairings/player-stats | component tests                                    | sonnet | code-reviewer    |
| T3p  | MODIFY `apps/web/src/components/topnav-auth-section.tsx`, the 3 community manage clients `apps/web/src/components/.../tournament-manage-client.tsx`, `.../tournament-settings-page-client.tsx`, `.../create-tournament-client.tsx` | repoint onto `useCurrentUser` (now API-backed, T3-gate) + `me/communities` (T3j)                        | component tests                                    | sonnet | code-reviewer    |
| T3q  | VERIFY-only: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/community/request/page.tsx` — confirm no revoke-set table is read; migrate only if it is | confirm-or-migrate                                                                                      | only if migrated                                   | haiku  | code-reviewer    |

> **Disjointness across Step 3 waves:** Each wave's tasks own distinct files. T3m/T3n/T3o consume routes
> built in T3a/T3b/T3c (Wave 3b) — that is a true data dependency, hence the wave ordering. Within 3d, no
> two tasks touch the same file (verified against §3.6). T3q is a cheap verification (haiku).

### Step 4 — Revoke the remaining ~17 tables (Wave 4 — sequential, gated on Steps 2 + 3)

| Task | Files (allowlist)                                                                                                                                                | Tables             | What changes                                                                              | Tests                                                                                                          | Model  | Reviewers                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| T4   | CREATE `packages/supabase/supabase/migrations/<ts>_phase2_revoke_s_bucket_remaining_tables.sql`; (regen) `packages/supabase/src/types.ts`; MODIFY `apps/mobile/CLAUDE.md` (deferred-mobile note) | the 17 (§3.3)      | `REVOKE SELECT FROM anon, authenticated` + `COMMENT ON TABLE` per table; idempotent; exclude realtime six / users / views | extend the privilege-map guardrail test (or smoke-assert anon `select` on `tournaments` denied while `public_user_profiles` view still returns rows). `pnpm db:reset` clean replay. | sonnet | migration-reviewer, security-reviewer |

Step 4 must not start until every Step 2 and Step 3 task is merged — those are the readers being protected.

---

## 7. Final verification phase (before opening/declaring the PR)

Run as a dedicated closing task (dispatch a sonnet subagent for the sweeps; it returns a concise report —
the orchestrator does not ingest raw output):

1. **No anon reads of revoked base tables remain.** Sweep:
   - `rg "createStaticClient" apps/web/src` — every remaining hit must read a **view** (`public_user_profiles`,
     `public_tournament_registrations`, `organization_with_owner`) or a non-revoked table. No hit may read a
     revoke-set base table.
   - `rg "createClientReadOnly" apps/web/src` — confirm none is used for a *public* read of a revoked table
     (auth-gated per-user reads via this client are fine and expected).
   - `rg "useSupabaseQuery" apps/web/src` — every remaining hit must read a non-revoked table or be one of
     the documented VERIFY-MAYBE-SAFE files confirmed safe (T3q).
2. **DB replays and types regenerate clean:**
   ```bash
   pnpm db:reset           # full migration replay incl. both revoke migrations must succeed
   pnpm generate-types     # regenerate; commit the type changes
   ```
3. **Grant assertions hold:** anon PostgREST `SELECT` on a revoked table (e.g. `tournaments`, `posts`) is
   denied / returns no rows; the three views still return rows to anon; the **realtime six** still return
   rows to an authed client.
4. **Quality + tests:** `pnpm typecheck`, `pnpm lint`, the new route-handler tests, the migrated-component
   tests, and the fetcher tests all pass (offload to CI per push policy; the closing subagent may run scoped
   `--filter` checks).
5. **CI — enumerate every check by name before declaring green** (repo Completion-Claims rule):
   - `pnpm lint` (ESLint)
   - `pnpm typecheck` (TypeScript)
   - `pnpm test` (unit, incl. new route + component + fetcher tests)
   - `pnpm test:e2e` (Playwright)
   - codecov/patch (≥60% on new code — Step 3 adds many routes/components, so test generously)
   - preview deploy
6. **Auto-dispatched reviewers on the cumulative diff:** `migration-reviewer` + `security-reviewer`
   (both migrations + service-role swaps + admin routes), `code-reviewer`, `ui-verifier` (SSR-converted
   components + changed dashboard/admin renders), `ci-monitor` + `background-checker` after each push.

---

## 8. Dependency & parallelism map

```
WAVE 1 — Step 1 revoke (sequential, owns db:reset/generate-types):
  T1   Revoke the 13 zero-reader tables (own migration, ZERO app changes)
       └─ independent of everything else; lands first to de-risk.

WAVE 2 — Step 2 mechanical server swap (ALL PARALLEL, disjoint files, NO db:reset):
  T2a  lib/data: standings-endpoint.ts + tournaments-endpoints.ts      ─┐
  T2b  lib/data: communities-endpoints.ts + players-endpoints.ts        │
  T2c  (app) tournaments/communities/players pages                      │ disjoint
  T2d  (app) user/coaching pages + dashboard/coaching                   │ file sets;
  T2e  (dashboard) dashboard/page + dashboard/teams                     │ one wave,
  T2f  (dashboard) alts/[username]/teams/* (4 files)                    │ multi-Agent
  T2g  (app) tournaments/[tournamentSlug]/page                          │
  T2h  announcement-banner + admin/limitless + community create page   ─┘
       └─ all depend only on the service-role client (already exists); none on each other.

WAVE 3a — Step 3 GATE (sequential, single task):
  T3-gate  /api/v1/me/profile route + use-current-user.ts migration
           └─ blocks 3c/3d consumers that depend on useCurrentUser.

WAVE 3b — new public-S-bucket routes + SSR conversions (PARALLEL, disjoint files):
  T3a  /api/v1/players/search + cached fetcher                          ─┐
  T3b  /api/v1/tournaments/[id]/pairings + fetcher                       │ disjoint;
  T3c  /api/v1/tournaments/[id]/player-stats + fetcher                   │ 3d/3n/3o/3m
  T3d  public-pairings.tsx → SSR                                         │ consume these
  T3e  tournament-sidebar-card.tsx → SSR (drop realtime count sub)      ─┘ routes later.

WAVE 3c — admin routes + consumers (PARALLEL, disjoint files):
  T3f  /api/v1/admin/roles + config page + flag-allowlist-sheet         ─┐
  T3g  /api/v1/admin/users + admin users/admin page                      │ disjoint
  T3h  /api/v1/admin/communities + admin communities page                │
  T3i  /api/v1/admin/coaches + coaches-manager                          ─┘

WAVE 3d — me/* routes + dashboard/manage/invite consumers (PARALLEL, disjoint files):
  T3j  me/communities + me/tournament-history + 3 dashboard clients     ─┐
  T3k  me/teams + teams-sub-table                                        │
  T3l  me/invitations + invitation-list + invitations-view              │ disjoint;
  T3m  player-search + tournament-basic-info  (consume T3a)              │ 3m/3n/3o
  T3n  manage pairings/judge/overview        (consume T3b, T3c)          │ depend on
  T3o  manage standings/registrations + match-report-dialog             │ 3a/3b/3c
  T3p  topnav-auth-section + 3 community manage clients (consume gate+3j)│
  T3q  VERIFY settings/page + request/page (haiku)                      ─┘

WAVE 4 — Step 4 revoke (sequential, owns db:reset/generate-types, gated on Waves 2+3):
  T4   Revoke the remaining 17 tables + mobile CLAUDE.md note
       └─ cannot start until every reader (Waves 2+3) is merged.

WAVE 5 — Final verification (sequential closing task):
  rg sweeps + db:reset + generate-types + grant assertions + enumerate CI checks.
```

### Critical-path dependency chain

```
T1  →  Wave 2 (T2a–T2h, parallel)  →  T3-gate  →  Wave 3b (T3a–T3e, parallel)
    →  Waves 3c + 3d (parallel; 3c/3d-me-routes have no cross-dep, but 3m/3n/3o wait on 3b's routes)
    →  T4  →  Wave 5
```

The longest chain is: **T3-gate → T3b/T3c (build pairings + player-stats routes) → T3n/T3o (manage clients
consume them) → T4 (revoke) → Wave 5 (verify).** Everything else fans out in parallel around that spine.

### Serialization constraints (the two non-negotiable sequence points)

1. **Only one task may hold `db:reset` / `generate-types` at a time.** T1 and T4 are the only DB tasks; they
   are in different waves (1 and 4) and never run concurrently. No other task runs `generate-types`.
2. **T4 (the remaining-tables revoke) is gated on ALL of Waves 2 and 3 being merged.** Revoking before a
   reader is migrated would silently empty that reader's data. This is the single most important ordering
   rule in the plan.

---

## 9. Open questions to confirm before execution

1. **B16 exact tables:** `admin/limitless/[tournamentId]/page.tsx` is listed as "tournaments, alts —
   verify exact." Confirm the precise revoke-set tables it reads when T2h opens the file; if it reads more,
   the swap still covers it (service-role reads everything), but the audit note should be corrected.
2. **T3b file isolation:** append the pairings fetcher to `tournaments-endpoints.ts` (smaller surface) or
   create a dedicated `tournament-pairings-endpoint.ts` (strict isolation)? Default: dedicated file, to keep
   waves trivially disjoint. Confirm preference.
3. **Registrations route necessity:** `/api/v1/tournaments/[id]/registrations` reads a non-revoked realtime
   table and is included only for snapshot consistency. Keep it, or drop it to reduce churn (the realtime
   sub already feeds the manage client)? Default: drop unless the manage client needs a non-realtime initial
   snapshot.
4. **Admin-check helper:** confirm the canonical server-side site-admin assertion to reuse in the
   `/api/v1/admin/*` routes (grep surfaced `isSiteAdmin` / a JWT-role check) so all four admin routes use
   one helper, not four ad-hoc checks.
```
