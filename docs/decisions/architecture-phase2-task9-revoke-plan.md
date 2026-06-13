# Data-Access Architecture — Phase 2 Task 9: Safely Revoking `anon`/`authenticated` SELECT on S-bucket Base Tables

Date: 2026-06-12
Branch: `docs/architecture-considerations` (ALL work stays here — **no new branches**)
Parent plan: `docs/decisions/architecture-phase2-plan.md` (Task 9 is the "lock-down migration" wave).
Source of truth: `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` (architecture decisions are
**LOCKED** — this plan translates Task 9 into safe, executable steps; it does not re-decide anything).
Companion audit: `docs/audits/2026-06-11-rls-audit.md` (the table classification this plan revokes against).

---

> **Revision 2026-06-12 (simplification pass)**
>
> A batch of confirmed product decisions reduced scope and removed several planned items:
>
> - **Realtime "six" → "five":** All four `tournament_registrations` realtime subscriptions dropped (D1 —
>   live TO check-in board is not a needed feature); `tournament_registrations` leaves the exclusion set and
>   joins the Step-4 revoke set (18 tables to revoke, up from 17).
> - **Dashboard + manage overview realtime removed:** `home-client.tsx` and `overview-client.tsx` active-match
>   subs dropped (D2, folded into T3j); manage `tournament-overview.tsx` matches + rounds subs dropped (D3,
>   folded into T3n). Judge board keeps realtime for now (Phase 3 payload candidate).
> - **Invitations realtime removed:** `tournament-registrations.tsx:166-193` channel dropped (D4, T3o).
> - **Two routes deleted, one shrunk:** `GET /api/v1/admin/roles` deleted — `admin/config/page.tsx`
>   converts to server component; `GET /api/v1/tournaments/[id]/registrations` deleted — manage Players tab
>   gets auth-gated staff read (scope of T3o); `GET /api/v1/admin/users` kept but T3g shrunk —
>   `admin/page.tsx` converts to server component (D5).
> - **`current-match-banner.tsx` added to Part A audit** (D6 — previously missing).
> - **`organization_with_owner` view removed** from exclusion list — already dropped by migration
>   `20260127000008_drop_unused_organization_with_owner_view.sql` (D7).
> - **Dedicated fetcher files** confirmed as the default (D8 — no appending to existing endpoint files).
> - **`isSiteAdmin()` from `apps/web/src/lib/sudo/server.ts:28`** is the canonical admin check for
>   `/api/v1/admin/*` routes (D9).
> - **§9 open questions resolved** (D10 — all four questions answered, section rewritten).

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
4. **Step 4 — Revoke the remaining 18 tables** once their readers (Steps 2 + 3) are migrated. Second
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
groups, roles, group_roles, user_group_roles, coach_profiles, announcements, user_roles,
tournament_registrations
```

> **Note on `tournament_registrations`:** all four realtime subscriptions to this table have been dropped
> (D1 — live check-in board is not a needed feature). Before revoking it, verify which readers go through
> the safe view `public_tournament_registrations` (kept) vs the base table directly. The manage Players
> tab reads staff-internal columns, so its read must move to an auth-gated path. T3o's scope is extended
> to repoint `manage/tournament-registrations.tsx` reads onto an authenticated server fetch (via
> `auth.supabase` inside the `/api/v1` route handler). That covers the staff-column requirement and keeps
> the anon view path for public consumers.

### 3.4 Exclusions — NEVER revoke

- **Realtime five** (keep `authenticated` SELECT — payloads can't be column-filtered, scoped quals govern
  delivery): `notifications`, `match_games`, `match_messages`, `tournament_matches`, `tournament_rounds`.
  (`tournament_registrations` was previously in this set but is removed per D1 — all its realtime
  subscriptions are dropped and it now joins the Step-4 revoke set.)
- **`users`** — already locked in Phase 0/1; not in scope.
- **Views** (the public read path — must stay `anon`/`authenticated` SELECTable):
  `public_user_profiles`, `public_tournament_registrations`.
  (`organization_with_owner` was already dropped by migration
  `20260127000008_drop_unused_organization_with_owner_view.sql` — it is not in scope.)

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

**AUTH-GATED → move read to `/api/v1` (additional entry previously missing from audit — D6):**

| #    | File                                                                          | Tables                             | Notes                                                                                                   |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A-G* | `apps/web/src/components/tournament/current-match-banner.tsx` (lines 41–77)  | `alts`, `tournament_matches`       | Auth-gated (query fires only with `userId`). Repoint `alts` read onto `useCurrentUser` (T3-gate) or `/api/v1/me/profile`; `tournament_matches` keeps its grant (realtime five). Optional cleanup: consolidate its inline current-match query with `getActiveMatch` into one query fn. Assign to T3n or a small disjoint Wave 3d sibling; confirm allowlist doesn't conflict. |

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
| `GET /api/v1/admin/users`                         | `admin/users/page.tsx`                                                       | admin             |
| `GET /api/v1/admin/communities`                   | `admin/communities/page.tsx`                                                 | admin             |
| `GET /api/v1/admin/coaches`                       | `admin/coaches/coaches-manager.tsx`                                          | admin             |
| `GET /api/v1/players/search`                      | `invite/player-search.tsx`, `create/tournament-basic-info.tsx`              | public S-bucket (cache OK) |
| `GET /api/v1/tournaments/[id]/pairings`           | `manage/tournament-pairings.tsx`, `tournament-pairings-judge.tsx`, `match-report-dialog.tsx` | public S-bucket (cache OK) |
| `GET /api/v1/tournaments/[id]/player-stats`       | `manage/tournament-standings.tsx`, `manage/tournament-overview.tsx`, `create-tournament-client` | public S-bucket (cache OK) |

> **Routes deleted vs. original plan (D5):**
> - `GET /api/v1/admin/roles` — **deleted.** `admin/config/page.tsx` converts to a server component
>   reading roles + site-admins via service-role, passing props to a client island for interactive dialogs.
>   `flag-allowlist-sheet.tsx`'s user-search (which searches alts) is repointed onto
>   `GET /api/v1/players/search` (already planned in T3a). No dedicated roles route needed.
> - `GET /api/v1/tournaments/[id]/registrations` — **deleted.** All registration realtime subs are
>   dropped (D1); the manage Players tab's staff-column read is served by T3o extending
>   `manage/tournament-registrations.tsx` to use an authenticated server fetch via `auth.supabase`.
>   The public view `public_tournament_registrations` continues to cover anon readers. `admin/page.tsx`
>   (6 one-shot stat reads) converts to a server component (Promise.all + props) — no route needed for it.

**`/api/v1/me/*` auth rule:** these read the *caller's own* data, so they use `auth.userId` +
`auth.supabase` (the identity-bound client from `resolveApiAuth`) for the read — **no `'use cache'`**,
`Cache-Control: private, no-store`.

**`/api/v1/admin/*` auth rule:** after `resolveApiAuth`, call **`isSiteAdmin()`** from
`apps/web/src/lib/sudo/server.ts:28` → `403` if it returns false. This is the canonical read-only admin
gate (not `requireAdminWithSudo` — that is the mutation gate). No cache.

---

## 5. The two revoke migrations

Both live under `packages/supabase/supabase/migrations/<UTC-timestamp>_*.sql`, both idempotent, both with
`COMMENT ON TABLE`, both excluding the **realtime five** / `users` / two views.

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

Revokes the remaining 18 tables (§3.3). Lands **only after Steps 2 and 3 are fully merged** (every reader
of these tables now goes through service-role or `/api/v1`). Same per-table `REVOKE` + `COMMENT ON TABLE`
pattern. Explicitly does **not** touch the **realtime five** (`notifications`, `match_games`,
`match_messages`, `tournament_matches`, `tournament_rounds`), `users`, or the two views
(`public_user_profiles`, `public_tournament_registrations`).

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

> **Execution regrouping (2026-06-12 parallelism pass):** the step tables below define **WHAT** each task
> does; **§8 defines WHEN**. Tasks from different steps run concurrently whenever their file sets are
> disjoint and no data dependency exists — the original 8 sequential waves collapse to **4 execution
> waves** (see §8). The Model column in each table is binding: **opus** for the complex conversions
> (`T3-gate`, `T3d`, `T3e`, `T3o`), **haiku** for run-and-report work (`T3q`, the Wave-4 sweeps,
> `background-checker`/`ci-monitor`, between-wave scoped typecheck/lint), **sonnet** for everything else.
> Pass `model` explicitly on every dispatch.

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
| T3-gate | CREATE `apps/web/src/app/api/v1/me/profile/route.ts` + `__tests__/route.test.ts`; MODIFY `apps/web/src/hooks/use-current-user.ts`; MODIFY `apps/web/src/hooks/index.ts` (if the barrel needs no change, leave it) | Build `/api/v1/me/profile` (per-user, `auth.supabase`, no cache, `private, no-store`). Rewrite `useCurrentUser` from `useSupabaseQuery(getCurrentUser)` → `useApiQuery(["me","profile"], () => fetch("/api/v1/me/profile").then(r => r.json()), { staleTime: 60_000 })`. | Route test (404 n/a — no id; 401 anon; 429; 200 cookie; 200 bearer; `private` cache header). Component test: `useCurrentUser` returns user/alt from a mocked `useApiQuery`; loading + error states. | **opus** (app-wide hook rewiring — highest blast radius) | security-reviewer, code-reviewer |

> Why a gate: many auth-gated components (`topnav-auth-section`, `overview-client`, the manage clients)
> depend on `useCurrentUser`. Migrating the hook first means the dependent components can be migrated in
> parallel afterward without each re-implementing the profile read.

**Wave 3b (parallel — new public-S-bucket routes + the SSR conversions; disjoint files):**

| Task | Files (disjoint allowlist)                                                                                                                                                                                       | What changes                                                                                                            | Tests                                                                            | Model  | Reviewers        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ | ---------------- |
| T3a  | CREATE `apps/web/src/app/api/v1/players/search/route.ts` + test; CREATE `apps/web/src/lib/data/players-search-endpoint.ts` (`'use cache'`, service-role)                                                          | Public player search route + cached fetcher (reuse `searchPlayers`-style query in `queries/players.ts`)                | route test (locked shape) + fetcher test                                         | sonnet | code-reviewer    |
| T3b  | CREATE `apps/web/src/app/api/v1/tournaments/[id]/pairings/route.ts` + test; CREATE `apps/web/src/lib/data/tournament-pairings-endpoint.ts` (new dedicated file, `'use cache'`, service-role) | Public pairings route + cached fetcher                                                                                  | route test + fetcher test                                                        | sonnet | code-reviewer    |
| T3c  | CREATE `apps/web/src/app/api/v1/tournaments/[id]/player-stats/route.ts` + test; CREATE its `'use cache'` fetcher in a NEW file `apps/web/src/lib/data/tournament-player-stats-endpoint.ts`                          | Public player-stats route + cached fetcher                                                                              | route test + fetcher test                                                        | sonnet | code-reviewer    |
| T3d  | MODIFY `apps/web/src/components/tournament/public-pairings.tsx` (A-S1): convert to SSR — split into a server wrapper that fetches via service-role and a presentational client child fed by props                  | anon-reachable → SSR (NOT `/api/v1`)                                                                                    | component test: presentational child renders pairings from props; server wrapper fetch mocked | **opus** (SSR split must preserve auth-gated match-click interactivity inside an anon page) | code-reviewer, ui-verifier |
| T3e  | MODIFY `apps/web/src/components/tournament/tournament-sidebar-card.tsx` (A-S2): convert to SSR; **remove** the registration-count `postgres_changes` realtime subscription, replace with the tag-revalidated cached count (per parent plan) | anon-reachable → SSR; drop realtime sub                                                                                 | component test: renders count from props; assert no realtime subscription remains | **opus** (hybrid: anon SSR data + per-user check-in actions client island) | code-reviewer, ui-verifier |

> **Disjointness note for T3b:** T3b uses a **dedicated new file**
> `apps/web/src/lib/data/tournament-pairings-endpoint.ts` (D8 — dedicated-file preference confirmed).
> The same pattern applies wherever the plan previously offered an append-to-existing-endpoint option:
> always create a new dedicated file. This makes wave disjointness trivially verifiable and avoids
> concurrent-edit contention with T2a's earlier ownership of `tournaments-endpoints.ts`.

**Wave 3c (parallel — admin routes + their consumers; disjoint files):**

| Task | Files (disjoint allowlist)                                                                                                                                                                                  | What changes                                                                                                          | Tests                                              | Model  | Reviewers                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | ----------------------------- |
| T3f  | MODIFY `apps/web/src/app/(app)/admin/config/page.tsx`, `apps/web/src/app/(app)/admin/config/flag-allowlist-sheet.tsx` | Convert `admin/config/page.tsx` to a server component: read roles + site-admins via `createServiceRoleClient()`, pass as props to client island for interactive dialogs (no API route needed). Repoint `flag-allowlist-sheet.tsx` user-search (searches alts) onto `GET /api/v1/players/search` (built in T3a) via `useApiQuery`. | component tests (server-component render + client island interactions) | sonnet | security-reviewer, code-reviewer |
| T3g  | CREATE `apps/web/src/app/api/v1/admin/users/route.ts` + test; MODIFY `apps/web/src/app/(app)/admin/users/page.tsx`; CONVERT `apps/web/src/app/(app)/admin/page.tsx` to server component | Admin users route (`resolveApiAuth` + `isSiteAdmin()` → 403) + repoint `admin/users/page.tsx` via `useApiQuery`. `admin/page.tsx` (6 one-shot stat reads, lines 370–402) converts to server component using `Promise.all` + props — no API route. | route test incl. 403; component tests              | sonnet | security-reviewer, code-reviewer |
| T3h  | CREATE `apps/web/src/app/api/v1/admin/communities/route.ts` + test; MODIFY `apps/web/src/app/(app)/admin/communities/page.tsx`                                                                                | Admin communities route + repoint                                                                                   | route test incl. 403; component test               | sonnet | security-reviewer, code-reviewer |
| T3i  | CREATE `apps/web/src/app/api/v1/admin/coaches/route.ts` + test; MODIFY `apps/web/src/app/(app)/admin/coaches/coaches-manager.tsx`                                                                             | Admin coaches route + repoint                                                                                       | route test incl. 403; component test               | sonnet | security-reviewer, code-reviewer |

**Wave 3d (parallel — the `/api/v1/me/*` routes + dashboard/manage/invite consumers; disjoint files):**

| Task | Files (disjoint allowlist)                                                                                                                                                                                                          | What changes                                                                                            | Tests                                              | Model  | Reviewers        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | ---------------- |
| T3j  | CREATE `apps/web/src/app/api/v1/me/communities/route.ts` + test; CREATE `apps/web/src/app/api/v1/me/tournament-history/route.ts` + test; MODIFY `apps/web/src/app/(dashboard)/dashboard/overview/overview-client.tsx`, `.../tournaments/tournaments-client.tsx`, `.../stats/stats-client.tsx`; MODIFY `apps/web/src/components/home-client.tsx` | `me/*` routes (per-user, no cache); repoint the three dashboard clients via `useApiQuery`. Remove `tournament_matches` realtime sub from `overview-client.tsx` (lines 68–121) and `home-client.tsx` (lines 89–133); replace with fetch-on-load + `visibilitychange` refetch, copying the TanStack pattern from `current-match-banner.tsx`. | route tests; component tests (including assert no realtime sub in home-client + overview-client) | sonnet | code-reviewer    |
| T3k  | CREATE `apps/web/src/app/api/v1/me/teams/route.ts` + test; MODIFY `apps/web/src/app/(dashboard)/dashboard/components/teams-sub-table.tsx`                                                                                            | `me/teams` route; repoint                                                                               | route test; component test                         | sonnet | code-reviewer    |
| T3l  | CREATE `apps/web/src/app/api/v1/me/invitations/route.ts` + test; MODIFY `apps/web/src/components/tournaments/invite/invitation-list.tsx`, `apps/web/src/components/tournaments/tournament-invitations-view.tsx`                      | `me/invitations` route; repoint                                                                         | route test; component tests                        | sonnet | code-reviewer    |
| T3m  | MODIFY `apps/web/src/components/tournaments/invite/player-search.tsx`, `apps/web/src/components/tournaments/create/tournament-basic-info.tsx`                                                                                        | repoint onto `GET /api/v1/players/search` (built in T3a)                                                | component tests                                    | sonnet | code-reviewer    |
| T3n  | MODIFY `apps/web/src/components/tournaments/manage/{tournament-pairings,tournament-pairings-judge,tournament-overview}.tsx`                                                                                                          | Repoint `tournament-pairings.tsx` + `tournament-pairings-judge.tsx` onto `/api/v1/tournaments/[id]/pairings` (T3b) + `/player-stats` (T3c). Remove both realtime subs from `tournament-overview.tsx` — matches sub (lines 188–212) and rounds sub (lines 216–240) — replacing with mutation-driven cache busting via `invalidateTournamentCaches`. `tournament-pairings-judge.tsx` **keeps** its realtime matches/rounds subs (Phase 3 payload-driven candidate; only the `/api/v1` repoint is in scope here). | component tests (assert overview has no realtime subs; judge retains them) | sonnet | code-reviewer    |
| T3o  | MODIFY `apps/web/src/components/tournaments/manage/{tournament-standings,tournament-registrations}.tsx`, `apps/web/src/components/tournament/match-report-dialog.tsx`                                                                | Repoint `tournament-standings.tsx` onto existing `/api/v1/.../standings`; repoint match dialog onto pairings/player-stats. For `tournament-registrations.tsx`: (1) remove the `registrations` realtime channel (line 131) and all four registration subs; (2) remove the `tournament_invitations` realtime channel (lines 166–193) — invite/accept/decline mutations cache-bust instead; (3) repoint the manage Players tab reads onto an authenticated server fetch via `auth.supabase` in the route handler (staff-internal columns require auth; the public view `public_tournament_registrations` covers anon consumers); (4) replace with fetch-on-load + mutation-driven revalidation. | component tests (assert neither realtime channel remains; staff-column read requires auth) | **opus** (staff-column auth-gated read redesign + two channel removals + repoints) | security-reviewer, code-reviewer |
| T3p  | MODIFY `apps/web/src/components/topnav-auth-section.tsx`, the 3 community manage clients `apps/web/src/components/.../tournament-manage-client.tsx`, `.../tournament-settings-page-client.tsx`, `.../create-tournament-client.tsx` | repoint onto `useCurrentUser` (now API-backed, T3-gate) + `me/communities` (T3j)                        | component tests                                    | sonnet | code-reviewer    |
| T3q  | VERIFY-only: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/community/request/page.tsx` — confirm no revoke-set table is read; migrate only if it is | confirm-or-migrate                                                                                      | only if migrated                                   | haiku  | code-reviewer    |

> **Disjointness across Step 3 waves:** Each wave's tasks own distinct files. T3m/T3n/T3o consume routes
> built in T3a/T3b/T3c (Wave 3b) — that is a true data dependency, hence the wave ordering. Within 3d, no
> two tasks touch the same file (verified against §3.6). T3q is a cheap verification (haiku).

### Step 4 — Revoke the remaining 18 tables (Wave 4 — sequential, gated on Steps 2 + 3)

| Task | Files (allowlist)                                                                                                                                                | Tables             | What changes                                                                              | Tests                                                                                                          | Model  | Reviewers                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| T4   | CREATE `packages/supabase/supabase/migrations/<ts>_phase2_revoke_s_bucket_remaining_tables.sql`; (regen) `packages/supabase/src/types.ts`; MODIFY `apps/mobile/CLAUDE.md` (deferred-mobile note) | the 18 (§3.3)      | `REVOKE SELECT FROM anon, authenticated` + `COMMENT ON TABLE` per table; idempotent; exclude realtime five / users / two views | extend the privilege-map guardrail test (or smoke-assert anon `select` on `tournaments` denied while `public_user_profiles` view still returns rows). `pnpm db:reset` clean replay. | sonnet | migration-reviewer, security-reviewer |

Step 4 must not start until every Step 2 and Step 3 task is merged — those are the readers being protected.

---

## 7. Final verification phase (before opening/declaring the PR)

Run as a dedicated closing task (dispatch a **haiku** subagent for the sweeps — they are pure
run-and-report (`rg`, `db:reset`, grant probes); it returns a concise report and the orchestrator does not
ingest raw output. Any failure it surfaces is fixed by a follow-up **sonnet** task, then the haiku sweep
re-runs):

1. **No anon reads of revoked base tables remain.** Sweep:
   - `rg "createStaticClient" apps/web/src` — every remaining hit must read a **view** (`public_user_profiles`
     or `public_tournament_registrations`) or a non-revoked table. No hit may read a revoke-set base table.
     (`organization_with_owner` was already dropped by migration — do not expect or accept hits to it.)
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
   denied / returns no rows; the **two views** (`public_user_profiles`, `public_tournament_registrations`)
   still return rows to anon; the **realtime five** (`notifications`, `match_games`, `match_messages`,
   `tournament_matches`, `tournament_rounds`) still return rows to an authed client.
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

The original step-by-step waves over-serialized: Steps 1, 2, and the route-creation half of Step 3 have
**no data dependencies on each other** — only disjoint file sets. Regrouped into 4 execution waves:

```
EXECUTION WAVE 1 — maximal parallel batch (14 agents, all disjoint files):
  T1       revoke migration, 13 zero-reader tables — sole db:reset holder  [sonnet]
  T2a–T2h  mechanical service-role swaps (8 tasks)                         [sonnet ×8]
  T3-gate  /api/v1/me/profile + use-current-user.ts rewiring               [opus]
  T3a      /api/v1/players/search + dedicated fetcher (new files only)     [sonnet]
  T3b      /api/v1/tournaments/[id]/pairings + dedicated fetcher (new)     [sonnet]
  T3c      /api/v1/tournaments/[id]/player-stats + dedicated fetcher (new) [sonnet]
  T3q      VERIFY-only settings/page + request/page                        [haiku]
  └─ Why concurrent: T1 touches only packages/supabase (and grants don't appear in generated
     types, so the types.ts regen is a no-op — zero contention). T2* swap clients in existing
     files. T3-gate + T3a–c create NEW files and consume only infrastructure that already
     landed (resolveApiAuth, rate-limit, useApiQuery). T3q is read-only. No two tasks share a file.

EXECUTION WAVE 2 — consumers of Wave 1's routes + hook (13 agents, all disjoint files):
  T3d  public-pairings.tsx → SSR (DROP-IN — see shared-page rule below)    [opus]
  T3e  tournament-sidebar-card.tsx → SSR + drop sub (DROP-IN)              [opus]
  T3f  admin/config → server component + flag-sheet repoint (consumes T3a) [sonnet]
  T3g  /api/v1/admin/users + repoint; admin/page → server component        [sonnet]
  T3h  /api/v1/admin/communities + repoint                                 [sonnet]
  T3i  /api/v1/admin/coaches + coaches-manager repoint                     [sonnet]
  T3j  me/communities + me/tournament-history routes + 3 dashboard clients
       + home-client.tsx (remove active-match realtime subs)               [sonnet]
  T3k  me/teams route + teams-sub-table                                    [sonnet]
  T3l  me/invitations route + invitation-list + invitations-view           [sonnet]
  T3m  player-search + tournament-basic-info (consume T3a)                 [sonnet]
  T3n  manage pairings/judge/overview (consume T3b/T3c; remove overview
       realtime subs; judge keeps realtime)                                [sonnet]
  T3o  manage standings/registrations + match-report-dialog (drop both
       channels; auth-gate staff-column read)                              [opus]
  T3p  topnav-auth-section + 3 community manage clients (consume gate+T3j) [sonnet]
  └─ Intra-wave consumption (T3p → T3j's me/communities) is safe: repoints fetch by URL
     (no compile-time import of the route), tests mock fetch, and both land in the same
     wave commit. All file sets disjoint.

EXECUTION WAVE 3 — Step 4 revoke (sequential, second db:reset holder, gated on Waves 1+2):
  T4   Revoke the remaining 18 tables + mobile CLAUDE.md note              [sonnet]
       └─ cannot start until every reader (Waves 1+2) is merged.

EXECUTION WAVE 4 — Final verification (sequential closing task):
  rg sweeps + db:reset + grant assertions + enumerate CI checks            [haiku]
  └─ failures fixed by follow-up sonnet tasks, then the haiku sweep re-runs.
```

### Shared-page rule for T3d/T3e (Wave 2)

Both components are rendered by `apps/web/src/app/(app)/tournaments/[tournamentSlug]/page.tsx`. Neither
task gets that page in its allowlist. Both conversions must be **drop-in**: the component file itself
becomes a server component with the same import path and props interface, so the parent page needs no
edit. If a parent-page change turns out to be unavoidable, the task REPORTS it instead of editing, and the
orchestrator applies the page change between waves.

### Critical-path dependency chain

```
Wave 1 (14 parallel)  →  Wave 2 (13 parallel)  →  T4  →  Wave 4 (verify)
```

Four sequential points total. The longest chain is bounded by the slowest single task in each of the two
parallel waves, not by step ordering.

### Serialization constraints (the two non-negotiable sequence points)

1. **Only one task may hold `db:reset` / `generate-types` at a time.** T1 (Wave 1) and T4 (Wave 3) are the
   only DB tasks and never run concurrently. No other task runs `generate-types`.
2. **T4 (the 18-table remaining-tables revoke) is gated on ALL of Waves 1 and 2 being merged.** Revoking
   before a reader is migrated would silently empty that reader's data. This is the single most important
   ordering rule in the plan.

### Model tier summary (binding — pass `model` explicitly on every dispatch)

| Model      | Tasks                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| **opus**   | `T3-gate`, `T3d`, `T3e`, `T3o` — app-wide hook rewiring; SSR splits preserving auth-gated interactivity; staff-read redesign |
| **sonnet** | `T1`, `T2a`–`T2h`, `T3a`–`T3c`, `T3f`–`T3n` (except `T3q`), `T3p`, `T4`, fix-up tasks from Wave-4 findings |
| **haiku**  | `T3q`, the Wave-4 verification sweeps, between-wave scoped typecheck/lint, `background-checker` + `ci-monitor` after every push |

---

## 9. Resolved decisions (formerly open questions)

All questions from the original plan are resolved. No open items remain.

1. **B16 exact tables — resolved:** `admin/limitless/[tournamentId]/page.tsx` is listed as "tournaments,
   alts — verify exact." The service-role swap in T2h covers it regardless of the precise table list.
   The implementer corrects the audit note in-file when they open the file. No blocker.

2. **T3b file isolation — resolved (D8):** T3b uses a **new dedicated file**
   `apps/web/src/lib/data/tournament-pairings-endpoint.ts`. The same dedicated-file preference applies
   anywhere else the plan offered an append-to-existing-endpoint option. Never append to an existing
   endpoint file; always create a new dedicated file.

3. **Registrations route + realtime — resolved (D1 + D5):** `GET /api/v1/tournaments/[id]/registrations`
   is **deleted**. All four `tournament_registrations` realtime subscriptions are dropped (live check-in
   board is not a needed feature). The manage Players tab's staff-column read is migrated to an auth-gated
   path in T3o. `tournament_registrations` now joins the Step-4 revoke set.

4. **Admin-check helper — resolved (D9):** The canonical server-side admin check for all
   `/api/v1/admin/*` read routes is **`isSiteAdmin()`** from
   `apps/web/src/lib/sudo/server.ts:28`. Not `requireAdminWithSudo` — that is the mutation gate. All
   admin read routes use `isSiteAdmin()` → `403` if false.
