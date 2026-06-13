# Data-Access Architecture — Phase 4 Implementation Plan

Date: 2026-06-11
Source of truth: `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` (**LOCKED**).
Companion audit: `docs/audits/2026-06-11-rls-audit.md`.

**Scope of Phase 4 (decisions doc §Rollout + Follow-through checklist):** the **docs/memory
catch-up** and the **marquee-events runbook**. No application code changes. This phase makes the
agent-facing docs match the architecture that Phases 2–3 made real, so future sessions inherit the
decisions instead of working against stale guidance.

> Per the decisions doc: _"`.claude/` conventions update per-phase as each pattern becomes real —
> documenting an unimplemented architecture would mislead agents."_ Phase 4 is the **final
> reconciliation pass** — by now the patterns exist in code, so the docs can describe them as fact.
> If any Phase 2/3 task already updated a doc inline, this phase only fills the gaps (read each file
> first; do not duplicate).

## Branch

`docs/data-access-phase4` — off `main` once Phases 2 and 3 have merged (the docs must describe
shipped reality). Confirm both merged before Task 1.

## How to use this plan

Execute with **subagent-driven development**. All tasks are **sonnet** (documentation editing —
no design decisions remain; the decisions doc is the spec). Exact file allowlists per task.
**Subagents self-verify** that the edited markdown renders cleanly and that any code snippet they
add matches the shipped APIs (grep the referenced symbol exists) before reporting — they do not
commit/push; they report changed files + a suggested commit message. Orchestrator commits between
waves.

No `db:reset` / `generate-types` in this phase (docs only) — so the shared-DB serialization
constraint does not apply, and **all tasks can run fully in parallel** with disjoint file
allowlists.

### Standing facts the docs must encode (from the decisions doc)

- **Split model:** S-bucket reads via cached `/api/v1` Next.js route handlers; P-bucket (9 tables)
  direct PostgREST + RLS via `@supabase-cache-helpers`; R-bucket hot tables flattened; X-bucket
  locked.
- **API home = Next.js/Vercel route handlers** (not edge functions) — chosen for Vercel-native tag
  invalidation. Edge functions are **plumbing only**, never client-called.
- **Mobile migrated to `/api/v1`** — the old "mobile hits Supabase directly" rationale is
  **SUPERSEDED**; double-egress is consciously accepted.
- **Spectators: SSR/ISR only, no realtime.** Realtime is for authenticated participants/staff.
- **Payload-driven realtime:** `setQueryData(payload.new)`, keep `postgres_changes` (no Broadcast),
  column-homogeneous-sensitivity rule for what may be realtime-published.
- **Optimistic mutations** are the default interactive-write pattern.

### Dependency / parallelism map

```
ALL TASKS PARALLEL (one wave — docs only, disjoint files, sonnet):

  Task 1  .claude/CLAUDE.md — replace SUPERSEDED mobile-direct note
  Task 2  Root CLAUDE.md — Tech Stack + Gotchas (API posture, client selection)
  Task 3  querying-supabase SKILL — bucket-based client selection rules
  Task 4  reviewing-caching SKILL — S-bucket API caching playbook addition
  Task 5  building-web-app SKILL — S-bucket API-route data-fetching pattern
  Task 6  building-mobile-app SKILL + apps/mobile/CLAUDE.md — mobile-via-Vercel
  Task 7  using-realtime SKILL — payload-driven pattern + publication rules
  Task 8  rules: supabase-patterns.md + architecture.md + nextjs-conventions.md — bucket routing
  Task 9  CREATE docs/runbooks/marquee-events.md (the runbook)
  Task 10 Agent memory — data-access architecture summary
```

- **Every task touches a disjoint file set** — dispatch all ten in one message (parallel).
- Tasks 2 and 8 are the only ones that risk overlap on "client selection" wording — Task 2 edits
  the **root CLAUDE.md** (high-level posture), Task 8 edits the **rules files** (detailed routing).
  They are different files; keep root CLAUDE.md to a pointer + one-paragraph posture, and put the
  detailed S/P/R/X routing table in the rules (Task 8) and the skill (Task 3).

---

## Task 1 — `.claude/CLAUDE.md`: replace the SUPERSEDED mobile-direct note

**Model:** sonnet.

**Objective.** The decisions doc explicitly calls this out (consideration #5): the existing
"Mobile data access" memory in `.claude/CLAUDE.md` ("Mobile app hits Supabase directly… proxying
through Vercel adds cost without meaningful savings") is **superseded**.

**Files (allowlist):** `.claude/CLAUDE.md`

**Edit (Architecture Guidelines section):** Replace the "Mobile data access" bullet with the new
reality:

- Mobile now hits the canonical **Next.js `/api/v1` route handlers** (Bearer-token auth via the
  shared `resolveApiAuth` helper), the same API web uses. The `api-*` edge functions are retired.
- **Double-egress is accepted** (Supabase→Vercel + Vercel→client on cache misses; cache hits pay
  once) — the win is one canonical API + Vercel-native tag-invalidated CDN caching. Revisit only if
  egress becomes material in billing.
- Shared query logic still lives in `@trainers/supabase`; the promoted `query-factory` (`useApiQuery`
  / `useApiMutation`) is the shared client read/mutate factory for both apps.

Keep it terse (this file is the per-project memory index). Link to the decisions doc for the full
rationale.

**Verification:** renders cleanly; no lingering "proxying through Vercel adds cost without
meaningful savings" text; the decisions-doc path is referenced.

---

## Task 2 — Root `CLAUDE.md`: Tech Stack + Gotchas (API posture, client selection)

**Model:** sonnet.

**Objective.** Add the high-level data-access posture so a fresh agent reading the root file knows
the rules of the road. Keep it brief — detail lives in the rules/skills.

**Files (allowlist):** `CLAUDE.md`

**Edits:**

- **Tech Stack table / a new short "Data Access" subsection:** state the split model in two lines —
  S-bucket reads via `/api/v1` Next.js route handlers (cached, tag-invalidated); P-bucket direct
  PostgREST+RLS; SSR pages query the DB directly; **no anonymous open Data API** (the anon key
  cannot scrape S base tables — SELECT revoked except the realtime six).
- **Gotchas:** add one gotcha — _"S-bucket base tables have `anon`/`authenticated` SELECT revoked
  (except the realtime six: `notifications`, `match_games`, `match_messages`, `tournament_matches`,
  `tournament_registrations`, `tournament_rounds`). Client reads of S data go through `/api/v1`, not
  direct PostgREST. SSR uses service-role / public views."_
- Point to `querying-supabase` + `reviewing-caching` skills and the decisions doc for detail.

**Verification:** renders cleanly; the realtime-six carve-out is listed correctly; no detailed
routing table here (that's Task 8).

---

## Task 3 — `querying-supabase` SKILL: bucket-based client selection

**Model:** sonnet.

**Objective.** Add the S/P/R/X bucket → client-selection rules so agents pick the right read path.

**Files (allowlist):**
`.claude/skills/querying-supabase/SKILL.md`

**Edit (Client Selection section):** add a table mapping data class → read path:

| Data class                               | Read path                                        | Client / mechanism                                                                       |
| ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| S-bucket (shared-public) client read     | `/api/v1/…` Next.js route handler                | `useApiQuery` (promoted factory) → cached `'use cache'` fetcher → `createStaticClient()` |
| S-bucket SSR page read                   | direct DB in the Server Component                | `createStaticClient()` or service-role, inside `'use cache'`                             |
| P-bucket (9 per-user tables) client read | direct PostgREST + RLS                           | browser client + `@supabase-cache-helpers` (auto keys, cache-on-mutation)                |
| Realtime six                             | direct subscription + payload-driven cache write | browser client, `postgres_changes`, `setQueryData(payload.new)`                          |
| X-bucket (system)                        | service role only                                | `createServiceRoleClient()`                                                              |

List the 9 P-bucket tables explicitly. Note: never use an authed client inside a `'use cache'`
scope (existing rule); the API layer's `resolveApiAuth` lives at `apps/web/src/lib/api/auth.ts`.

**Verification:** the 9 P-bucket tables match the audit; symbol names (`useApiQuery`,
`resolveApiAuth`, `createStaticClient`) grep-exist in the shipped code.

---

## Task 4 — `reviewing-caching` SKILL: S-bucket API caching playbook

**Model:** sonnet.

**Objective.** The skill already documents `'use cache'` + TanStack well. Add the **route-handler**
caching playbook (the new surface Phase 2 introduced) so reviewers check it.

**Files (allowlist):**
`.claude/skills/reviewing-caching/SKILL.md`

**Edit:** add a short "S-bucket API route caching" subsection:

- A `/api/v1` GET handler caches by calling a `'use cache'`-wrapped fetcher (in
  `apps/web/src/lib/data/*-endpoints.ts`) with `cacheTag()` + `cacheLife()` — same primitives as
  page fetchers. The handler reads auth **outside** the cache scope (via `resolveApiAuth`) and
  passes only plain values in.
- Set `Cache-Control` for CDN + rely on `revalidateTag(tag, 'max')` for on-demand busting (route-
  handler surface, not `updateTag`).
- Reuse existing `CacheTags` + invalidation helpers — no new tag per endpoint.
- Reiterate the dynamic-hole gotcha for route handlers (don't let the cached fetcher become a
  dynamic hole).

**Verification:** renders cleanly; consistent with the shipped Phase 2 standings pattern.

---

## Task 5 — `building-web-app` SKILL: API-route data-fetching pattern

**Model:** sonnet.

**Objective.** Add the "client reads of S-bucket data go through `/api/v1`" pattern to the web
data-fetching guidance.

**Files (allowlist):**
`.claude/skills/building-web-app/SKILL.md`

**Edit (Data Fetching section):** document the decision tree for a new web read:
SSR page → direct cached fetcher; client read of S data → `useApiQuery` against `/api/v1`; client
read of P data → `@supabase-cache-helpers` direct; realtime → payload-driven. Point to
`query-factory` (`useApiQuery`) and the `/api/v1` route convention.

**Verification:** renders cleanly; references the shipped factory + route paths.

---

## Task 6 — `building-mobile-app` SKILL + `apps/mobile/CLAUDE.md`: mobile-via-Vercel

**Model:** sonnet.

**Objective.** Mobile now hits `/api/v1`, not Supabase directly / not edge functions. Update both
the skill and the mobile app's CLAUDE.md (which currently says "Mobile hits Supabase directly — no
Next.js API routes").

**Files (allowlist):**

- `.claude/skills/building-mobile-app/SKILL.md`
- `apps/mobile/CLAUDE.md`

**Edits:**

- **building-mobile-app SKILL** (Data Fetching + Supabase sections): mobile fetches via the shared
  `useApiQuery`/`useApiMutation` factory (now in `@trainers/supabase`) hitting the Vercel `/api/v1`
  routes with a Bearer access token. Direct Supabase client use on mobile is now limited to **auth/
  session** + P-bucket direct reads (same as web); S-bucket goes through the API.
- **apps/mobile/CLAUDE.md** (Notes): replace "Mobile hits Supabase directly — no Next.js API routes"
  with the new reality (Bearer auth → `/api/v1`; `api-*` edge functions retired). Update the F-6
  deferred item — its mobile half is **resolved** by the migration (note that). Leave F-1
  (`bluesky-auth`) per whatever Phase 2 decided (check whether Phase 2 folded it in or kept it
  deferred, and reflect the actual outcome).

**Verification:** renders cleanly; no "hits Supabase directly" claim remains; F-6 status reflects
reality.

---

## Task 7 — `using-realtime` SKILL: payload-driven pattern + publication rules

**Model:** sonnet.

**Objective.** The skill currently shows refetch-on-event ("payload available but refetching is
simpler"). Reverse that: mandate **payload-driven** `setQueryData(payload.new)`, document the
publication requirements and the column-homogeneous-sensitivity rule, and state the Broadcast vs
postgres_changes decision.

**Files (allowlist):**
`.claude/skills/using-realtime/SKILL.md`

**Edits:**

- Replace the "refetch is simpler" guidance with the **payload-driven mandate**: handlers call
  `queryClient.setQueryData(queryKey, (prev) => upsertById(prev, payload.new))`; **never**
  `invalidateQueries`/`refetch` per event (it erases the cost savings — ~50k live reads/round at
  7k players). A single reconnect-resync refetch on channel re-subscribe is the one allowed refetch.
- **Keep `postgres_changes`** — no Broadcast migration (decision #5). Note when Broadcast _would_
  be considered (future, if connection ceiling forces it).
- **Publication rule:** a table is realtime-published for an audience only if **every column** is
  safe for that audience (payloads can't be column-filtered) — the column-homogeneous-sensitivity
  rule. Document the realtime six and that spectators/logged-out users get **no realtime** (SSR/ISR
  - tag revalidation only).
- Note the `match_games`/`match_messages` flattened `tournament_id`/`community_id` columns (Phase 3)
  simplify subscription filters + RLS.

**Verification:** renders cleanly; no remaining "refetching is simpler" advice; the six tables +
column-homogeneity rule are stated.

---

## Task 8 — Rules: bucket routing in `supabase-patterns` / `architecture` / `nextjs-conventions`

**Model:** sonnet.

**Objective.** Add the detailed S/P/R/X routing rules to the three path-scoped rule files so they
auto-load when agents work in the matching code.

**Files (allowlist):**

- `.claude/rules/supabase-patterns.md`
- `.claude/rules/architecture.md`
- `.claude/rules/nextjs-conventions.md`

**Edits:**

- **supabase-patterns.md** (Client Selection): add the bucket → client-selection table (mirror
  Task 3's, but framed as a rule); add the rule "S base tables are not client-readable (SELECT
  revoked except the realtime six) — read S data via `/api/v1`."
- **architecture.md:** add a "Query Routing by Bucket" section — the S/P/R/X split, where each
  read path lives (route handlers in `apps/web/src/app/api/v1/…`, cached fetchers in
  `apps/web/src/lib/data/…`, P-bucket direct via cache-helpers), and the dependency-injection note
  (queries still take `supabase` first param regardless of caller).
- **nextjs-conventions.md** (Data Fetching + Supabase Client Selection): add the `/api/v1` route-
  handler convention (Bearer-or-cookie auth via `resolveApiAuth`, rate-limit via the shared helper,
  cached fetcher + tag invalidation) and where the mobile-auth helper lives.

**Verification:** each file renders cleanly; the three describe the same split consistently (no
contradictions); referenced paths/symbols grep-exist.

---

## Task 9 — Create the marquee-events runbook

**Model:** sonnet.

**Objective.** Post-decision consideration #6 / Phase 4 deliverable: create the operational runbook
for 1,000+ player events. `docs/runbooks/` does **not** exist yet — create the directory + file.

**Files (allowlist):**

- CREATE `docs/runbooks/marquee-events.md`

**Contents (from the decisions doc):**

- **Pre-event** (days ahead): raise the Supabase realtime connection quota via support (default
  ceiling 10k; a marquee event is ~7k concurrent — request headroom); bump the DB compute tier
  ahead of time; verify the realtime message-rate budget (watch the 2,500 msg/s threshold);
  confirm payload-driven realtime is deployed (no refetch-on-event amplification); confirm the
  registration-count on public pages is cached (no per-spectator websocket).
- **During-event monitoring:** what to watch — realtime connection count vs ceiling, message rate,
  DB compute utilization, `/api/v1` cache hit ratio (CDN), error rate on report-game/check-in.
- **Post-event:** scale the DB compute tier back down; note any quota that should stay raised for
  the next event.
- Include the _why_ (cost model: caching shifts cost from scales-with-audience to scales-with-
  active-players; spectators consume zero realtime connections — the lever that protects the 10k
  ceiling).
- Cross-link the decisions doc.

**Verification:** file renders cleanly; the 10k ceiling / 7k concurrent / 2,500 msg/s numbers match
the decisions doc; pre/during/post structure present.

---

## Task 10 — Agent memory: data-access architecture summary

**Model:** sonnet.

**Objective.** Follow-through checklist final item: agent memory inherits the now-implemented
architecture so future planner/implementer sessions act on it.

**Files (allowlist):**

- `.claude/agent-memory/planner/MEMORY.md`
  (+ a new memory file it points to, e.g. `project_data_access_implemented.md`)
- The global memory entry `project_data_access_architecture.md` (in the user's global `~/.claude/projects/` memory)
  is already marked "ALL LOCKED … docs update per-phase as patterns land." **Update that entry's status** from
  "locked/planned" to "implemented (Phases 0–4 shipped)" and point it at the three phase plans +
  this reconciliation, OR add a short follow-up note. (Only the _planner_ writes to the worktree
  planner memory; the global memory entry update is a one-line status flip.)

**Memory content (concise, per the memory-writing rules — facts + why + how-to-apply):**

- Data-access is now the **split model, shipped**: S-bucket client reads via `/api/v1` Next.js
  routes (cached, tag-invalidated, Bearer-or-cookie auth); P-bucket (9 tables) direct PostgREST+RLS
  via `@supabase-cache-helpers`; realtime six are payload-driven (`setQueryData`); S base tables
  have client SELECT revoked except the realtime six; mobile is on `/api/v1` (double-egress
  accepted); `api-*` edge functions retired; spectators SSR-only.
- **Why:** cost at marquee scale is DB compute + realtime, not function placement; the split shifts
  cost to scale-with-active-players and closes the anon-scrape surface.
- **How to apply:** when adding a read, pick the path by bucket (Task 3's table); never add a new
  realtime-published table without checking column-homogeneous-sensitivity; never reintroduce
  refetch-on-event.

Do **not** duplicate code patterns into memory (they live in the now-updated skills/rules) — memory
holds the _decision summary + pointers_, per the memory-vs-docs boundary.

**Verification:** the planner `MEMORY.md` index line is ≤150 chars and points to the new file; the
global entry's status reflects "implemented"; no code patterns copied into memory (those are in the
skills/rules updated by Tasks 1–8).

---

## Phase 4 verification (before PR)

- All ten doc targets updated/created; each renders cleanly.
- No stale claims remain: search the repo for "Mobile hits Supabase directly", "proxying through
  Vercel", and "refetching is simpler" — all should be gone or corrected.
- Every code symbol referenced in the docs (`useApiQuery`, `resolveApiAuth`, `/api/v1`,
  `@supabase-cache-helpers`, the cached `*-endpoints.ts` fetchers) grep-exists in the shipped code
  (Phases 2–3) — the docs describe reality, not aspiration.
- `docs/runbooks/marquee-events.md` exists with pre/during/post sections and the correct quota
  numbers.
- CI green (docs-only, but enumerate Lint/Typecheck/Tests/E2E/preview by name per Completion-Claims
  rule — markdown changes should pass trivially).

## Open questions to confirm with the user before execution

1. **Memory scope:** update the _global_ memory entry's status in place, or only add to the
   worktree planner memory? (The global entry is shared across sessions; the worktree planner memory
   is this project's planner-specific store.) Default proposed: update the global entry's status
   line + add a worktree planner pointer.
2. **F-1 status in mobile CLAUDE.md (Task 6):** depends on what Phase 2 decided for the
   `bluesky-auth` ownership-proof. Confirm the outcome so the doc states it correctly.
3. **Per-phase inline doc updates:** if Phases 2/3 already updated some of these docs inline (the
   decisions doc says they should as patterns land), Phase 4 only fills gaps. Confirm whether any
   inline updates happened so this phase doesn't re-litigate them.
