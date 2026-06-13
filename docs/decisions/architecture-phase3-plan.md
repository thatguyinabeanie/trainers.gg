# Data-Access Architecture — Phase 3 Implementation Plan

Date: 2026-06-11
Source of truth: `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` (**LOCKED** —
this plan translates decisions, it does not re-decide).
Companion audit: `docs/audits/2026-06-11-rls-audit.md`.

**Scope of Phase 3 (decisions doc §Rollout):** the _client-caching_ layer.

1. Consolidate all web client reads onto **TanStack Query** (eliminate the ~81 `useSupabaseQuery`
   sites — measured 75 files / 234 invocations).
2. **`@supabase-cache-helpers`** for the 9 P-bucket direct reads (auto query keys, auto
   cache-on-mutation).
3. **Payload-driven realtime** — handlers update via `setQueryData(payload.new)`, no refetch
   per event; keep `postgres_changes` on the realtime six (no Broadcast migration).
4. **Optimistic mutations** as the default for interactive writes (report game, check-in,
   register, team edits).
5. **Flatten** `tournament_id` / `community_id` onto `match_games` / `match_messages` (migration)
   to defuse the 4-hop RLS join evaluated per realtime event.

## Branch

`feat/data-access-phase3` — branched off `main` once Phase 2 has merged (Phase 3 consumes the
`/api/v1` endpoints and the promoted `query-factory` from Phase 2). Confirm Phase 2 is merged
before Task 1.

## How to use this plan

Execute with **subagent-driven development** (`superpowers:subagent-driven-development`).
Dispatch each task at its noted model tier (sonnet for mechanical migration; **opus for the two
design-sensitive tasks — the realtime payload pattern (Task 3) and the flatten migration (Task 2)**).
Exact file allowlists per task. Two-stage review after each. **Subagents self-verify scoped
`pnpm typecheck --filter` + `pnpm lint --filter` and fix their own scope before reporting** — they
do not commit/push; they report changed files + a suggested commit message. Orchestrator commits
between waves. Every PR bakes in codegen + tests (decisions #4).

### Shared local Supabase constraint

One local Supabase DB. Only **Task 2** touches the schema (the flatten migration), so it is the
only task that runs `db:reset` / `generate-types`, and it must run **first** (its new columns are
referenced by the payload-driven realtime work in Task 3 and any P-bucket reads). All other tasks
are TypeScript-only and parallelize with disjoint allowlists.

### Standing rules carried from the decisions doc

- **Keep `postgres_changes`** on the realtime six — no Broadcast migration (decision #5).
- **Payload-driven, not refetch:** `setQueryData(queryKey, payload.new)` — never
  `invalidateQueries` / `refetch` on every event (erases ~50k live DB reads/round at 7k players).
- **Column-homogeneous sensitivity:** adding `tournament_id`/`community_id` to a realtime table is
  safe only if those columns are safe for every subscriber — they are (IDs the subscriber already
  knows), so the flatten does not widen exposure. Confirm in the migration comment.
- **P-bucket = the 9 audit-verified self-scoping tables** (`docs/audits/2026-06-11-rls-audit.md`):
  `notifications`, `user_preferences`, `notification_preferences`, `atproto_sessions`,
  `linked_atproto_accounts`, `discord_user_dm_preferences`, `tournament_invitations`,
  `feature_usage`, `subscriptions`. These read **direct PostgREST + RLS** (not via the API) —
  `@supabase-cache-helpers` is for these.

### Dependency / parallelism map

```
WAVE A (schema — sequential, opus, owns db:reset/generate-types):
  Task 1  Install + wire @supabase-cache-helpers (package + provider)   ─ can overlap
  Task 2  Flatten migration: tournament_id/community_id on match_*       ─ DB task

  → Task 2 must land first (its columns + new RLS quals are referenced downstream).
    Task 1 (package install + QueryClient wiring) has no DB dependency and can run
    in parallel with Task 2, but DO NOT let both edit pnpm-workspace.yaml at once.

WAVE B (consolidation + realtime — parallel, sonnet/opus, after Wave A):
  Task 3  Payload-driven realtime on the realtime six       (opus)   ─┐ disjoint
  Task 4  TanStack migration: tournaments/matches reads      (sonnet) ─┤ files —
  Task 5  TanStack migration: communities/players/admin reads (sonnet)─┤ each owns
  Task 6  P-bucket direct reads via cache-helpers            (sonnet) ─┘ its sites

WAVE C (optimistic mutations — parallel, sonnet, after Wave B):
  Task 7  Optimistic: report game + check-in    ─┐ disjoint mutation
  Task 8  Optimistic: register                    │ sites + their
  Task 9  Optimistic: team edits                 ─┘ components

WAVE D:
  Task 10 Sweep: retire useSupabaseQuery + delete dead invitations sub  (sonnet)
```

- **Task 2 is the gate** for Waves B–D (the flatten columns + new quals).
- **Wave B tasks are mutually parallel** — Task 3 owns the realtime subscription files; Tasks 4–6
  own disjoint sets of read sites. The risk: a file that _both_ subscribes to realtime _and_ reads
  via `useSupabaseQuery` (e.g. `match-page-client.tsx`, the tournament-manage components). **Assign
  each such dual-purpose file to exactly ONE task** (the realtime task, Task 3, owns the whole file
  where realtime + read co-live; Tasks 4–6 take the read-only files). The orchestrator resolves any
  overlap before dispatch.
- **Wave C tasks are mutually parallel** — each owns one mutation domain's action + component.
- **Task 10 is a final sweep** — runs after B+C to delete the now-unused `useSupabaseQuery` hook
  and the dead `tournament_invitations` subscription.

---

## Task 1 — Install `@supabase-cache-helpers` + wire it

**Model:** sonnet.

**Objective.** `@supabase-cache-helpers` is **not yet installed** (confirmed — zero matches in
package.json). Add it and wire it so P-bucket direct reads (Task 6) can use it.

**Parallelizable:** Yes — can overlap Task 2 (no DB dependency). Must not edit
`pnpm-workspace.yaml` concurrently with any other task.

**Files (allowlist):**

- MODIFY `apps/web/package.json` — add `@supabase-cache-helpers/postgrest-react-query` (the
  TanStack Query binding; confirm exact package name + version against the registry).
- MODIFY `pnpm-lock.yaml` (regenerated by the install — do not hand-edit).
- MODIFY `apps/web/src/components/providers.tsx` only if the helper needs QueryClient config
  (it generally rides the existing `QueryClientProvider` — verify; likely no change needed).

**Install note (repo gotcha).** Use the cold-cache `--no-frozen-lockfile` install path documented
in the pnpm gotchas, keep only the added-dep hunk in the lockfile diff, and **never disturb the
`@smogon/calc` submodule entry**. `pnpm config lives in pnpm-workspace.yaml` — if a build-allow or
override is needed for the new package, put it there, not in `package.json`.

**Verification:** `pnpm --filter @trainers/web typecheck` clean; a trivial `useQuery`-from-helper
import compiles. Do not migrate any read yet — that's Task 6.

---

## Task 2 — Flatten migration: `tournament_id` + `community_id` on `match_games` / `match_messages`

**Model:** sonnet to author; **opus + `migration-reviewer` + `security-reviewer` review** (RLS-
and realtime-sensitive). Owns `db:reset` / `generate-types`.

**Objective.** Decision #5: flatten `tournament_id`/`community_id` onto `match_games` and
`match_messages` to replace the **4-hop RLS join** (match → round → phase → tournament → community)
that is currently re-evaluated per realtime event and per row — the "perf landmine at high
concurrency" the audit flags.

**Parallelizable:** No — single migration, gates Waves B–D.

**Files (allowlist):**

- CREATE `packages/supabase/supabase/migrations/<UTC-timestamp>_flatten_match_tournament_community.sql`
- Generated `packages/supabase/src/types.ts` changes after `generate-types` — let the command
  rewrite it.

**Migration contents:**

1. **Add columns** `tournament_id bigint` and `community_id bigint` to `match_games` and
   `match_messages` (nullable initially), with FKs + explicit `ON DELETE` (match the existing
   match-table FK behavior; comment the choice).
2. **Backfill** existing rows by walking the current 4-hop chain once
   (match → `tournament_matches` → `tournament_rounds` → `tournament_phases` → `tournaments` →
   `community_id`). Single `UPDATE … FROM` per table.
3. **Set `NOT NULL`** after backfill (both columns should always resolve).
4. **Populate on write** going forward: the existing INSERT paths are SECURITY DEFINER RPCs /
   Server Actions (no direct browser writes — audit confirms zero browser table-writes). Update
   those write paths to set `tournament_id`/`community_id`, **or** add a `BEFORE INSERT` trigger
   that derives them from `match_id`. Prefer the trigger if multiple write paths exist (one source
   of truth); document the choice. Find the write sites:
   `rg "match_games|match_messages" packages/supabase/supabase/migrations -l` and the RPCs in the
   match-system migrations.
5. **Rewrite the RLS quals** on `match_games` / `match_messages` to use the flat columns instead of
   the 4-hop join — e.g. staff-manage becomes `has_org_permission(community_id, 'tournament.manage')`
   directly; participant-view keeps its participant check but drops the join for the staff branch.
   Use the `(SELECT auth.uid())` initplan form. `DROP POLICY IF EXISTS` before `CREATE POLICY`.
6. **Index** the new FK columns (`match_games(tournament_id)`, `match_games(community_id)`, same for
   `match_messages`) — Postgres does not auto-index FKs, and the new quals filter on them.
7. **Realtime safety comment:** note that `tournament_id`/`community_id` are
   column-homogeneous-safe for the existing subscribers (they're IDs the subscriber already
   passes RLS against), so flattening does not widen the realtime payload's exposure.

**Verification:**

```bash
pnpm db:reset          # full replay must succeed
pnpm generate-types
```

Confirm: new columns present + `NOT NULL` + indexed; backfill populated existing rows; the rewritten
RLS quals still admit the same rows (a participant sees their match games; staff see their
community's; outsiders see none); a seeded INSERT populates the flat columns. `migration-reviewer`

- `security-reviewer` must pass.

---

## Task 3 — Payload-driven realtime on the realtime six

**Model:** opus (design-sensitive — the pattern is reused across all subscriptions and is the
main cost lever).

**Objective.** Decision #5: convert every `postgres_changes` handler from refetch-on-event to
`setQueryData(queryKey, payload.new)`. Keep `postgres_changes` (no Broadcast). This is what erases
the ~50k live DB reads/round at 7k players.

**Parallelizable:** Yes — owns the realtime subscription files (disjoint from Tasks 4–6's read-only
files). Depends on Task 2 (the match tables now carry flat IDs, simplifying filters) and on the
TanStack query keys being canonical (coordinate key shape with Tasks 4–5 — see note below).

**Files (allowlist):** the web realtime subscription sites (each subscribes to one or more of the
realtime six):

- `apps/web/src/components/notification-bell.tsx` (`notifications`)
- `apps/web/src/app/(dashboard)/dashboard/home-client.tsx` (`tournament_matches`)
- `apps/web/src/app/(dashboard)/dashboard/overview/overview-client.tsx`
  (`tournament_matches`, `tournament_registrations`, `tournament_rounds`)
- `apps/web/src/components/match/match-page-client.tsx`
  (`match_messages`, `tournament_matches`, `match_games`) — **this file co-owns reads + realtime;
  Task 3 owns the whole file.**
- `apps/web/src/components/tournaments/manage/tournament-overview.tsx`
  (`tournament_registrations`, `tournament_matches`, `tournament_rounds`)
- `apps/web/src/components/tournaments/manage/tournament-registrations.tsx`
  (`tournament_registrations`; the dead `tournament_invitations` sub is removed in Task 10)
- `apps/mobile/src/lib/api/realtime.ts` — mobile's generic realtime hook + the three feature hooks
  (`useTournamentRealtime`, `useMatchRealtime`, `useNotificationsRealtime`), currently
  invalidate-on-event. Convert to `setQueryData`.
- `.claude/skills/using-realtime/SKILL.md` is updated in **Phase 4**, not here.

**Pattern to apply (document it in `using-realtime` in Phase 4):**

```ts
.on("postgres_changes", { event: "*", schema: "public", table: "match_games", filter: ... },
  (payload) => {
    queryClient.setQueryData(queryKey, (prev) => applyChange(prev, payload));
  })
```

- `applyChange` merges `payload.new` for INSERT/UPDATE and removes by id for DELETE, preserving the
  cached list/record shape. Write a small typed helper per cache shape (or a generic
  `upsertById` / `removeById`) — co-locate it; do not scatter merge logic.
- **No `refetch()` / `invalidateQueries` in the event handler.** (A _reconnect_ refetch is fine —
  on channel re-subscribe after a drop, one refetch to resync is acceptable; document it.)
- The subscriber still only receives rows it passes RLS for (post-Phase-1 quals + Task 2's flattened
  quals) — payloads carry whole rows, which is safe per column-homogeneous-sensitivity.

**Query-key coordination.** `setQueryData` must target the **same** query key the read uses. The
read sites move to TanStack in Tasks 4–5 using the `apps/web/src/lib/query-keys.ts` factory. Task 3
must use those exact keys. **Coordinate:** the orchestrator should land the query-key additions
(in `query-keys.ts`) as a tiny shared prerequisite before dispatching Tasks 3–5 in parallel, OR
assign `query-keys.ts` edits to Task 4 and have Tasks 3, 5 import from it (Task 4 lands its key
additions first). Pick one and note it in the dispatch.

**Tests:** for each `applyChange`/`upsertById` helper, unit-test INSERT merge, UPDATE replace,
DELETE remove. Smoke-test that a simulated payload updates the cache without a refetch (mock
`queryClient.setQueryData`).

**Verification:** self-verify typecheck + lint; live check on a local tournament — report a game
and confirm the opponent's view updates from the payload (no network refetch in devtools).

---

## Task 4 — TanStack migration: tournaments / matches read sites

**Model:** sonnet.

**Objective.** Decision #4: replace `useSupabaseQuery` with TanStack `useQuery` (via the promoted
factory hitting `/api/v1` for S-bucket, or direct for P-bucket) on the tournament/match read sites
that are **not** realtime-subscription files (those belong to Task 3).

**Parallelizable:** Yes — with Tasks 3, 5, 6 (disjoint files).

**Files (allowlist):** the tournament/match **read-only** `useSupabaseQuery` sites. Enumerate:
`rg "useSupabaseQuery" apps/web/src --files-with-matches | rg -i "tournament|match|round|standing|registration"`
then **exclude** the realtime files owned by Task 3. Also OWNS `apps/web/src/lib/query-keys.ts` if
the orchestrator assigned the shared key additions here (see Task 3 coordination note) — land the
tournament/match query keys first.

**Migration shape per site:**

- `useSupabaseQuery((c) => getTournamentById(c, id), [id])` →
  `useApiQuery(queryKeys.tournament.detail(id), "/api/v1/tournaments/" + id, { staleTime })`
  using the Phase 2 `/api/v1` routes + promoted factory.
- staleTime tiers (decision #4): lists 30–60s; live surfaces are realtime-driven (staleTime can be
  higher since realtime keeps them fresh — but they're Task 3's files); static reference `Infinity`.
- **SSR → `initialData` handoff:** where a Server Component already fetched the data and passes it
  as a prop, wire it as `initialData` (no duplicate fetch) per `reviewing-caching`.

**Tests:** update any test that asserted `useSupabaseQuery` behavior to the TanStack equivalent
(decisions #4 — fix tests, don't weaken). Keep component tests green.

**Verification:** self-verify typecheck + lint; migrated reads return identical data.

---

## Task 5 — TanStack migration: communities / players / admin read sites

**Model:** sonnet.

**Objective.** Same as Task 4, for the community/player/admin/notification-preference read sites.

**Parallelizable:** Yes — with Tasks 3, 4, 6 (disjoint files).

**Files (allowlist):** the community/player/admin/notifications **read-only** `useSupabaseQuery`
sites. Enumerate:
`rg "useSupabaseQuery" apps/web/src --files-with-matches | rg -i "communit|player|leaderboard|rating|admin|coach|announc|notification"`
excluding any realtime file owned by Task 3 (e.g. `notification-bell.tsx` is Task 3's). Add the
matching query keys to `query-keys.ts` only if Task 4 did not already own that file — coordinate to
avoid a write conflict (orchestrator decides; default: Task 4 owns `query-keys.ts`, Task 5 imports).

**Migration shape / staleTime / initialData / tests / verification:** as Task 4. User-profile reads
go through the **public_user_profiles view path** (Phase 0 fix), via the `/api/v1/players` routes.

---

## Task 6 — P-bucket direct reads via `@supabase-cache-helpers`

**Model:** sonnet.

**Objective.** Decision #4: the 9 P-bucket tables read **direct PostgREST + RLS** with
`@supabase-cache-helpers` (auto query keys, auto cache-on-mutation) — NOT via the `/api/v1` layer
(post-audit, P-tables are airtight; routing them through the API adds cost for no gain).

**Parallelizable:** Yes — with Tasks 3, 4, 5. Depends on Task 1 (package installed).

**Files (allowlist):** the client read sites for the P-bucket tables —
`user_preferences`, `notification_preferences`, `atproto_sessions`, `linked_atproto_accounts`,
`discord_user_dm_preferences`, `feature_usage`, `subscriptions`, and `tournament_invitations`
(read path; `notifications` is realtime-driven and owned by Task 3, but its non-realtime reads can
move here — coordinate). Enumerate:
`rg "useSupabaseQuery" apps/web/src --files-with-matches | rg -i "preference|atproto_session|linked_atproto|dm_preference|feature_usage|subscription|invitation"`.

**Migration shape:** replace `useSupabaseQuery((c) => getUserPreferences(c, uid), [uid])` with the
cache-helper query hook against the direct PostgREST builder (`@supabase-cache-helpers` derives the
key from the query). Cache-on-mutation comes for free when paired with the helper's mutation hooks —
use those for the P-bucket writes (preferences toggles etc.).

- These reads use the **browser client with the user's session** (RLS scopes to `auth.uid()`) —
  NOT `/api/v1`, NOT a static client.
- `feature_usage` / `subscriptions` are the conditional P-tables (2-branch OR quals, index-
  dependent) — confirm their reads stay fast; if a query is measured slow, flag it (do not add a
  speculative index in this task).

**Tests:** update affected tests to the cache-helper shape; assert the read targets the direct
builder (not `/api/v1`).

**Verification:** self-verify typecheck + lint; P-bucket reads work logged-in and return only the
user's own rows.

---

## Task 7 — Optimistic mutations: report game + check-in

**Model:** sonnet.

**Objective.** Decision #6: optimistic mutations as the default for interactive writes. Convert
**report game** and **check-in** to `useMutation` with `onMutate` (snapshot + optimistic
`setQueryData`), `onError` (rollback), `onSettled` (reconcile — but prefer letting realtime/payload
carry the truth per Task 3, so reconcile via cache, not a blanket refetch).

**Parallelizable:** Yes — with Tasks 8, 9 (disjoint mutation domains).

**Files (allowlist):**

- MODIFY `apps/web/src/actions/matches.ts` only if the action signature needs adjusting (prefer
  leaving the action as-is and wrapping it client-side).
- MODIFY the match client components that call report-game / check-in
  (`apps/web/src/components/match/…` — the report/scoring + check-in UI). **Coordinate with Task 3:**
  `match-page-client.tsx` is Task 3's file. If the report/check-in mutation lives in that file,
  either (a) Task 3 also owns the optimistic wrapper there, or (b) extract the mutation into a
  sibling hook file this task owns. Orchestrator decides before dispatch; default is (b) — extract
  `apps/web/src/components/match/use-report-game.ts` + `use-match-checkin.ts` (new files this task
  owns) and have `match-page-client.tsx` import them (Task 3 adds the import).

**Reference patterns in repo:** `apps/web/src/components/team-builder/team-workspace.tsx`
(`useOptimistic` + negative placeholder IDs) and the staff-client optimistic-Map pattern. Use
TanStack `onMutate`/`onError`/`onSettled` (not bare `useOptimistic`) so the optimistic update lands
in the shared query cache that realtime also writes to.

**Tests:** optimistic apply on mutate, rollback on error (mock the action rejecting), no full
refetch on settle. Smoke-test the components.

**Verification:** self-verify typecheck + lint; reporting a game updates the UI instantly and
rolls back on a simulated failure.

---

## Task 8 — Optimistic mutations: register

**Model:** sonnet.

**Objective.** Same pattern, for tournament registration.

**Parallelizable:** Yes — with Tasks 7, 9.

**Files (allowlist):**

- MODIFY the registration client component(s) under `apps/web/src/components/tournament/…` or
  `apps/web/src/components/tournaments/…` that call `registerForTournament`. (The action in
  `apps/web/src/actions/tournaments.ts` stays as-is unless its signature needs work.)
- New hook `apps/web/src/components/tournament/use-register.ts` if extraction keeps the allowlist
  disjoint from Task 7/9.

**Pattern / tests / verification:** as Task 7 (optimistic add of the registration to the cached
list; rollback on error). Note the registration-count on the public page is now cached/tag-driven
(Phase 2 removed its realtime sub) — the optimistic update is for the _registrant's own_ view.

---

## Task 9 — Optimistic mutations: team edits

**Model:** sonnet.

**Objective.** Same pattern, for team-builder edits. **Largely already optimistic** —
`team-workspace.tsx` uses `useOptimistic` + negative IDs + `persistence.onMutationSuccess()`. This
task **audits and aligns** team edits to the decision's TanStack-cache pattern where they touch the
shared query cache, and fills any gaps (e.g. team rename, fork, transfer).

**Parallelizable:** Yes — with Tasks 7, 8.

**Files (allowlist):**

- MODIFY `apps/web/src/actions/teams.ts` only if needed.
- MODIFY team-builder client components/hooks under `apps/web/src/components/team-builder/…` that
  perform edits not yet optimistic. Do **not** rip out the working `useOptimistic` flow — extend
  the cache-aligned pattern only where edits currently block on the server round-trip.

**Tests / verification:** as Task 7; existing team-builder tests stay green.

---

## Task 10 — Sweep: retire `useSupabaseQuery` + delete dead invitations subscription

**Model:** sonnet.

**Objective.** Final consolidation: confirm no `useSupabaseQuery` call sites remain (Tasks 4–6
migrated them), delete the hook, and remove the dead `tournament_invitations` realtime subscription
(audit finding #4 — the table was added to the publication in Phase 0, so the decision was to make
it _deliver_; but the original web subscription in `tournament-registrations.tsx` refetched —
reconcile per decision #4 carve-out).

**Parallelizable:** No — final sweep after Waves B + C.

**Files (allowlist):**

- DELETE `packages/supabase/src/hooks/use-supabase-query.ts` and
  `apps/web/src/lib/supabase/hooks.ts` (the web wrapper) — only if `rg "useSupabaseQuery"` finds
  zero remaining call sites. If any remain, list them and migrate or surface to the orchestrator
  (do NOT leave a half-deleted hook).
- MODIFY barrels that re-exported `useSupabaseQuery`
  (`packages/supabase/src/index.ts`, `apps/web/src/lib/supabase/index.ts`).
- MODIFY `apps/web/src/components/tournaments/manage/tournament-registrations.tsx` — reconcile the
  `tournament_invitations` subscription: Phase 0 added the table to the publication (so it now
  delivers). Convert it to payload-driven (`setQueryData`) like the other six, OR remove it if the
  invitations list is better served by tag-revalidated cache. Confirm the intended behavior against
  decision #4 (invitations is P-bucket; it _can_ be realtime now). Default: payload-driven, matching
  Task 3.

**Verification:** `rg "useSupabaseQuery" apps/web packages` returns nothing; typecheck + lint clean
across `@trainers/web` + `@trainers/supabase`; invitations behavior verified.

---

## Phase 3 verification (before PR)

- `pnpm db:reset` replays clean; `generate-types` ran (Task 2 columns in committed types).
- Zero `useSupabaseQuery` call sites remain; `@supabase-cache-helpers` powers P-bucket reads.
- Realtime handlers use `setQueryData(payload.new)` — no refetch-on-event (verify in devtools on a
  live local match: reporting a game produces no read network call on the opponent's client).
- `match_games`/`match_messages` carry `tournament_id`/`community_id`; their RLS quals no longer do
  the 4-hop join; FK columns indexed.
- Optimistic mutations on report-game, check-in, register, team edits (instant UI + rollback).
- CI green: enumerate Lint, Typecheck, Tests, E2E, preview deploy by name (Completion-Claims rule).
- Auto-dispatched reviewers: `migration-reviewer` + `security-reviewer` (Task 2 RLS rewrite),
  `code-reviewer`, `ci-monitor` + `background-checker` after push.

## Open questions to confirm with the user before execution

1. **Flatten write-population:** trigger (`BEFORE INSERT` deriving from `match_id`) vs updating each
   SECURITY DEFINER write path. Default proposed: trigger (one source of truth). Confirm.
2. **`tournament_invitations` realtime:** Phase 0 added it to the publication. Make it payload-
   driven realtime (it's P-bucket, safe), or serve invitations via tag-revalidated cache and drop
   the subscription entirely? Default proposed: payload-driven.
3. **Query-key ownership:** which task lands the shared `query-keys.ts` additions first (proposed:
   Task 4) so Tasks 3 & 5 import rather than collide.
4. **Mobile realtime in scope now?** Task 3's allowlist includes `apps/mobile/src/lib/api/realtime.ts`.
   Confirm mobile realtime is converted in this phase, or deferred until mobile work resumes (it
   would leave mobile on invalidate-on-event temporarily — acceptable since mobile is unpublished).
