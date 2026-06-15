# Resume State — Data-Access Lockdown + Meta Explorer

**Last updated:** 2026-06-13
**Branch:** `feat/phase2-task9-step4-revoke` · **PR:** #357 (open)
**Purpose:** single place to pick the work back up. Read this top-to-bottom and you have everything.

---

## TL;DR

The **data-access lockdown is essentially done** (Phases 2–4 + the over-fetch leak fix, all committed). **Task 10** (retire `api-*` edge fns + mobile cutover) is **deferred until mobile dev resumes**. The **one substantial remaining track is Meta Explorer completion (Waves B/C)** — three axes (win-rate, synergy, archetypes), all still in the **design** stage (design-first rule: design + mockups → owner approval → build).

---

## Done & committed (on `feat/phase2-task9-step4-revoke`)

- **Phase 2 — anon revoke:** `REVOKE SELECT … FROM anon` on **19 S-bucket base tables** (authenticated kept). Migration `20260613173105_phase2_revoke_anon_s_bucket_select.sql`. The earlier S-bucket route work (standings caching spike, `/api/v1` namespace, dual cookie/Bearer auth, rate-limit) is in.
- **Phase 3 — client-read consolidation (FULL pass, complete):** every web `useSupabaseQuery`/`useSupabaseMutation` consumer migrated to TanStack Query (`useQuery`/`useMutation` keyed by `apps/web/src/lib/query-keys.ts`); **legacy hooks deleted** from `apps/web/src/lib/supabase/{hooks,index}.ts`; **registrations realtime dropped → polling** (`refetchInterval` + `invalidateQueries`; live registration deemed superfluous); all colocated tests migrated to the `QueryClientProvider` + mocked-query-fn pattern (reference: `apps/web/src/app/(app)/admin/users/__tests__/user-detail-sheet.test.tsx`). Authenticated browser reads stay **direct Supabase + RLS** — just wrapped in TanStack.
- **Phase 4 — docs (per `docs/decisions/architecture-phase4-plan.md`, 10 tasks):** runbook ✅ (`docs/runbooks/marquee-events.md`); client-selection tables + Cache-Control carve-out ✅ (`supabase-patterns`/`nextjs-conventions` rules, `querying-supabase`/`reviewing-caching`/`deciding-data-access` skills); `.claude/CLAUDE.md` mobile note → HYBRID ✅. The remaining doc tasks (root CLAUDE.md posture, building-web-app/building-mobile-app/using-realtime skills, architecture.md bucket-routing, agent-memory summary) were completed 2026-06-13 — with two corrections to the (stale) plan: **mobile = HYBRID** (not "fully migrated/superseded") and **`@supabase-cache-helpers` was DROPPED** (use plain `useQuery` + `query-keys.ts`).
- **Public over-fetch leak — FIXED** (`255a9a4f` + follow-ups): added column-allowlisted public variants (`getPublicPhaseRoundsWithMatches`, `getPublicTournamentPlayerStats`, `getPublicTournamentStandings`) + `getCachedPublicTournamentPairings` / `PublicTournamentPairingsData`; the public SSR pairings page + its client view + the player-stats fetcher use them; `transformPhaseData` widened to the public row shape (staff callers' full rows remain a superset). Staff manage/judge `/api/v1` routes keep the **full** fns + `private, no-store`. The `/tournaments/[slug]/matches` page is pure RSC (no client leak) — its server-side over-fetch is benign, left as hygiene.
- **Meta Explorer Wave A (frontend-only) — SHIPPED:** `SampleBadge` (thin-sample pill), `DataSummaryHeader` (/data Overview context strip), `BuildThisButton` (Showdown-paste from a public set, **EVs blank** by the public-data boundary; in `SpeciesFingerprint` + `SpeciesMoveCombos`). Files under `apps/web/src/components/data/`.

> **CI:** last commit `05fbe13d`. The previously-red tests (community-detail-sheet, tournament-manage-client) were fixed; confirm the run is green when resuming. Note the one near-miss that's now fixed: a migration's component + test must be committed **together** (splitting them briefly left the tree importing a deleted hook).

---

## Deferred — Task 10 (retire `api-*` edge fns + mobile cutover)

**Gated on mobile dev resuming** — mobile is unpublished and the `api-*` functions are auth-gated (no anon hole), so there's no urgency. Re-scoped under the **HYBRID** mobile decision:

- **Authenticated mobile reads stay direct Supabase** (RLS via SecureStore session) — honors the cost rationale.
- **Unauthenticated/public reads move to cached `/api/v1`** (the anon revoke broke logged-out direct reads).
- Mobile `apiCall()` already sends a Bearer token that `resolveApiAuth` accepts.
- Broken-now mobile hooks to repoint: `apps/mobile/src/lib/supabase/use-communities.ts`, `use-tournament.ts`.
- Owner decisions still open when this resumes: authed-write path (`/api/v1` vs direct Supabase per cache-invalidation need); whether logged-out mobile browse needs anon-reachable list routes; mobile `apiCall` needs a second base-URL env var for `/api/v1`.

See memory `project_mobile_data_access_hybrid` + the Task-10 audit (in session history).

---

## Remaining work — Meta Explorer Waves B/C (the main track)

Authoritative gap analysis: **`docs/superpowers/specs/2026-06-13-meta-explorer-gap-analysis.md`**. Status: `/data` is shipped (3 tabs: Overview treemap+scatter, Trends line+bump, Sources dumbbells) + per-species drill-down; Wave A shipped. Remaining = 3 axes, **all in design stage**.

**Owner completion scope (decided):** all four of — macro flow layers, win-rate, "Build this" (done in Wave A), polish.

### Axis 1 — Win rate (B1 RPC + C1 UI) — UNBLOCKED, highest value
- Owner: *"we're more than capable to make those calculations"* → **compute our own W/L from our match data**, don't depend on Limitless-only `team_slots.wins/losses/ties`.
- **Join path discovered (key finding from design spike):** `team_slots.player_key = 'trainers.gg:<registration_id>'` → `tournament_registrations` (registration id → `alt_id` + `tournament_id`) → `tournament_matches.winner_alt_id`. That's the "our own W/L" path: aggregate match outcomes per species per format/period.
- C1 = win-rate column next to usage + over/under-performance "lift" badge; integrate `SampleBadge` for thin samples.
- Open Qs: per-game vs per-match denominator; which formats have enough first-party data; rollup table vs on-the-fly RPC; anon-reachable+cached vs service-role.

### Axis 2 — Synergy / teammates-over-time (B3 RPC + C3 alluvial) — buildable next
- A single-period teammate co-occurrence query already exists in `packages/supabase/src/queries/usage.ts`; the gap is **over-time** (across periods) feeding a synergy alluvial (d3-sankey style; see `building-charts` skill).
- Open Qs: RPC shape (focal species? thresholds), where it lives (own tab vs drill-down), readability (top-N / <1%).

### Axis 3 — Archetypes (B2 + C2 stream) — BLOCKED on clustering design
- Owner **rejected rule-based cores → requires real composition CLUSTERING**. Placement: archetype-over-time **streamgraph = Overview hero** (treemap pushed down), with a drill breadcrumb (Archetypes › cores/flex › Pokémon).
- This is the hardest axis. Design must choose a clustering approach (k-modes on the 6-species comp / co-occurrence community-detection / embedding+cluster), where it runs (likely a table refreshed by the existing pg_cron import pipeline — on-the-fly too costly), label stability over time, and cost. Surface the cheapest viable v1.

**RPC conventions to follow** (from the grounding spikes): usage RPCs are `sql STABLE SECURITY INVOKER`, empty `search_path`, granted to `anon`/`authenticated`; team_slots is the fact table with existing indexes. Mind the Phase-2 grant posture per axis.

---

## Locked decisions & constraints (operating context)

- **Data-access model:** browser is untrusted/uncacheable; the Next.js server is the trusted, cacheable boundary. Public pages → SSR; interactive → `/api/v1`; anon-reachable routes MUST cache + rate-limit; direct DB = **authenticated + RLS only**; no anon browser DB access. (`deciding-data-access` skill.)
- **Cache-Control carve-out:** auth-gated `/api/v1` → `private, no-store` by default; `public, s-maxage` allowed ONLY when **every response column is public** AND tag-invalidated. (Staff-serving routes stay private.)
- **Mobile = HYBRID** (authed reads direct, public reads via cached `/api/v1`).
- **Workflow:** design-first (finish design + mockups before building); visual companion (browser mockups) during brainstorming; subagent-driven parallel waves with disjoint file allowlists; orchestrator commits between waves; subagents never commit; `--no-verify` + CI authoritative; commit small/often; **commit a migration's component + test together**.
- **Champions formats:** UI shows "Stat Alignment" (not nature); no Tera; Stat Points not EVs. (`project_nature_*` memories.)

---

## How to resume

1. Confirm CI green on the branch head; merge PR #357 if ready (review threads were all resolved earlier; re-check).
2. **Meta Explorer:** re-run the three design planners (win-rate / synergy / archetypes) to produce specs + mockups for approval — OR jump straight to **B1 win-rate** (join path above is known): TDD-first (grant/RLS + RPC tests against the live local DB, red→green via `pnpm db:migrate`), then C1 UI. Build in disjoint parallel waves; each migration ships with its test.
3. **Task 10:** only when mobile dev resumes — start from the hybrid re-scope above.

## Pointers
- Gap analysis: `docs/superpowers/specs/2026-06-13-meta-explorer-gap-analysis.md`
- Runbook: `docs/runbooks/marquee-events.md`
- Skills: `working-with-usage-data`, `building-charts`, `deciding-data-access`, `reviewing-caching`, `querying-supabase`, `reviewing-database`, `product-vision`
- Memories: `project_meta_explorer_design`, `project_post_step4_roadmap`, `project_mobile_data_access_hybrid`, `project_public_overfetch_leak`, `feedback_guiding_principles`
- Query keys: `apps/web/src/lib/query-keys.ts` · usage queries: `packages/supabase/src/queries/usage.ts` · types: `packages/supabase/src/types.ts`
