# Data-Access & RLS Decisions — June 11, 2026

Decisions from the cost/architecture planning session (Vercel vs Supabase edge functions → data-access architecture → RLS audit). Companion to `docs/audits/2026-06-11-rls-audit.md`.

## Context

- Goal: optimize for best user experience while optimizing cost and caching, at a target scale of Limitless-host volume (~170 tournaments/mo, median ~20 players) with periodic marquee events (~10k registered / ~7k concurrent).
- Cost analysis found: function placement (edge functions vs Vercel) is a rounding error (~$10/mo either way); the real bill is **Supabase DB compute + Realtime**, driven by marquee-event concurrency. Caching shifts cost from scales-with-audience to scales-with-active-players.
- Security constraints stated by the owner:
  1. No anonymous/browser open access to the Data API (no de-facto public API via the anon key).
  2. Authenticated users must not be able to scrape data they're not supposed to see.
  3. A deliberate, controlled public API is a future product goal.
  4. Public viewing (tournament results, standings, team sheets) must keep working for logged-out users — served via SSR/ISR, not via browser data access.

## RLS audit findings — decisions (10/10 decided)

| #   | Finding                    | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `users` PII world-readable | **View + own-row policy.** `public_user_profiles` view (id, username, bio, country, image, pds_handle…); `users` SELECT → own row + admin paths; repoint public-info queries at the view. Rejected: column REVOKE (breaks PostgREST `select=*`), `users_private` split (bigger refactor).                                                                                                                                                |
| 2   | Team sheets unguarded      | **State-gated qual.** Pre-start: **sheet owner ONLY — explicitly no organizers/staff** (anti-leak; staff can also be competitors). Active + `open_team_sheets=true`: public (spectators via SSR). Active + closed: own + staff (judges need sheets for disputes). Completed: public. No app-code change needed (match page fetches server-side with user session).                                                                       |
| 3   | Registration staff fields  | **View + lock base + private photo bucket.** Public view: id, tournament_id, alt_id, status, registered_at, checked_in_at, team_name, team_submitted_at, display_name_option, show_country_flag, in_game_name. Base table → own + staff. Rental photos move to a **private bucket + signed URLs** ("photos should not be public"). **Product note:** a staff UI surfacing `drop_notes` is planned — design the staff-only read path now. |
| 4   | Dead invitations realtime  | **Add to publication.** `ALTER PUBLICATION supabase_realtime ADD TABLE tournament_invitations;` — P-bucket qual scopes delivery.                                                                                                                                                                                                                                                                                                         |
| 5   | Anon-executable RPCs       | **Root-cause default-deny.** `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`; revoke on existing fns; explicit `GRANT EXECUTE` per legitimately client-called RPC; CI guardrail test as backstop. Auth hook → `supabase_auth_admin` only.                                                                                                                                                            |
| 6   | Feature flags enumerable   | **Lock to admin; server-side eval.** SELECT → `is_site_admin()`. Web already evaluates server-side (Flags SDK). Verify the `clients/mobile.ts` reference during implementation.                                                                                                                                                                                                                                                          |
| 7   | Audit-log silent inserts   | **Branded service client + throw.** Audit helpers take a branded `ServiceRoleClient` type (compile-time guarantee) and throw on insert error. RLS stays deny-by-default. Rejected: admin INSERT policy, DB triggers (entries here are intent-rich).                                                                                                                                                                                      |
| 8   | Duplicate policies         | **Merge** the two `user_group_roles` SELECT policies into one OR'd qual.                                                                                                                                                                                                                                                                                                                                                                 |
| 9   | Grants ≫ policies          | **Revoke unused verbs** table-by-table so grants ≈ policies (defense-in-depth second wall; self-documenting privilege map).                                                                                                                                                                                                                                                                                                              |
| 10  | DELETE by omission         | **Draft-only DELETE + comment.** Staff with manage permission can delete `status='draft'` tournaments; published+ are never client-deletable (cancel is the verb); `COMMENT ON TABLE` documents it.                                                                                                                                                                                                                                      |

## Architecture decisions — ALL LOCKED (June 11, 2026, same session)

1. **Data-access split — LOCKED: split model.** S-bucket (shared) reads via cached API layer; P-bucket (per-user, 9 tables, audit-verified self-scoping) reads direct PostgREST+RLS; R-bucket hot tables get qual flattening; X-bucket locked. Full-L2 rejected: post-audit, the only delta was the airtight P-tables — routing them through an API adds cost for no security or caching gain.

2. **API layer home — LOCKED: Next.js/Vercel route handlers** (owner decision; initial edge-function recommendation vetoed). Web client reads, the migrated mobile API, and the future versioned public API (`/api/v1/…`) all live on Next.js routes. Decisive rationale: the tag-based cache invalidation system (`cache-invalidation.ts`, `updateTag`/`revalidateTag`) is Vercel-native — S-bucket endpoints get tag-invalidated CDN caching (fresh on change, cached otherwise) instead of TTL-only headers.
   - **Mobile migrates to Next.js routes** — one canonical API; the `api-*` edge functions retire.
   - **Edge functions' remaining role = Supabase plumbing only** (never client-called): `send-auth-email` (Auth webhook), `signup`/`bluesky-auth` (atomic auth+PDS session minting), the 5 PDS/Vault provisioning functions, `send-org-request-notification`, `import-tick` (pg_cron pipeline worker).
   - SSR/ISR pages keep querying the DB directly (service-role) — pages never ride the API.

3. **Spectator realtime — LOCKED: none for logged-out viewers.** Anonymous/spectator views are SSR/ISR + tag revalidation; realtime is for authenticated participants/staff. Bonus: spectators consume zero realtime connections (protects the 10k ceiling at marquee events).

4. **Client caching conventions — LOCKED.** Web consolidates all client reads onto TanStack Query (eliminating the 81 uncached `useSupabaseQuery` sites). P-bucket direct reads use `@supabase-cache-helpers` (auto keys, auto cache-on-mutation). S-bucket API reads use a shared hand-rolled factory (promote mobile's `query-factory.ts` into `@trainers/supabase`). staleTime tiers: static `Infinity` · lists 30–60s · live surfaces realtime-driven · notifications 10s. SSR → `initialData` handoff. CDN `Cache-Control` + cache tags on S-bucket endpoints.

5. **Payload-driven realtime — LOCKED.** Handlers update via `setQueryData(payload.new)`; no refetch-per-event (erases ~50k live DB reads/round at 7k players). Keep `postgres_changes` on the realtime six (no Broadcast migration needed). Flatten `tournament_id`/`community_id` onto `match_games`/`match_messages` to defuse the 4-hop RLS join.

6. **Optimistic mutations — LOCKED** as the default pattern for interactive writes (report game, check-in, register, team edits).

7. **Rollout — LOCKED: security first.**
   - Phase 0: RLS fixes #1–#4 (users view, team-sheet matrix, registrations view + private bucket, realtime publication) — independent, ship ASAP.
   - Phase 1: fixes #5–#10 + modest schema reorg (`internal` unexposed schema for system tables; `api` schema for curated views/RPCs) + qual flattening.
   - Phase 2: S-bucket client reads → Next.js routes; mobile API migration; then revoke anon/authenticated on S base tables.
   - Phase 3: TanStack consolidation + cache-helpers + payload-driven realtime + optimistic mutations.
   - Phase 4: `.claude/` docs (checklist below) + memory. **Note:** `.claude/` conventions update per-phase as each pattern becomes real — documenting an unimplemented architecture would mislead agents working on current code.
     Each phase = own branch/PR with migration/security review per repo auto-delegation rules.

## Post-decision considerations (completeness pass — all resolved)

0. **Realtime carve-out (fixes a Phase 2 contradiction).** The Phase 2 revoke of anon/authenticated on S-bucket base tables **excludes the six realtime tables** (`notifications`, `match_games`, `match_messages`, `tournament_matches`, `tournament_registrations`, `tournament_rounds`) — they keep `authenticated` SELECT with their post-fix scoped quals (realtime delivers only rows the subscriber passes RLS for). Consequences locked:
   - The public tournament page's **registration-count realtime subscription is removed** (post-fix-#3 it would deliver nothing to non-staff — and realtime payloads carry whole rows incl. `drop_notes`, the exact leak being closed). The count becomes **tag-revalidated cached data** (no websocket, no timer); optional 30s refetch later if live-tick is ever wanted.
   - **Standing rule:** a table may only be realtime-published for an audience if _every column_ is safe for that audience ("column-homogeneous sensitivity") — payloads cannot be column-filtered.
1. **Mobile auth helper (Phase 2 work item).** Next.js API routes get one shared helper: Bearer-token check (mobile) first, cookie fallback (web). Built before any mobile endpoint migrates.
2. **Caching spike (first task of Phase 2).** Docs deep-read (Next.js 16 route-handler caching, Vercel CDN/functions, Supabase SSR auth) + endpoint #1 (e.g. standings) built first and verified: cache hits skip the DB, tag invalidation refreshes it, both auth modes work. Mass migration only after the spike passes — docs lag this stack's bleeding edge (see reviewing-caching gotchas).
3. **Rate limiting (Phase 2 work item).** Modest shared helper on API routes (max N req/user-or-IP/min) reusing existing machinery (`rate_limits` table / Upstash pattern), shipped before the routes. Full per-key quotas arrive with the public API product.
4. **Codegen + tests baked in.** Every RLS-fix PR includes its test updates (tests asserting old permissive behavior fail correctly — fix tests, never weaken policy). The schema migration includes regenerating types for `api`/`internal` schemas.
5. **Double-egress accepted.** Mobile-via-Vercel consciously pays Supabase→Vercel + Vercel→client egress on cache misses; cache hits pay once. The old mobile-direct cost rationale is **superseded** (update `.claude/CLAUDE.md`). Revisit only if egress becomes material in billing.
6. **Marquee-event runbook (Phase 4 deliverable).** `docs/runbooks/marquee-events.md`: pre-event (raise realtime connection quota via support — 7k concurrent vs 10k default ceiling; watch 2,500 msg/s; bump DB compute tier days ahead), during-event monitoring, post-event scale-down. Written before the first 1,000+ player event.

## Code-layer security findings (June 2026 follow-up)

A code-layer review (complementary to the RLS audit above) surfaced findings the RLS audit could not see by construction — logic flaws in application code rather than missing database policies.

- **F-2 — `logo_url` SSRF in community/organization update actions (FIXED this branch).** Server Actions accepted arbitrary `logo_url` values and passed them to a server-side fetch without allowlisting, allowing an attacker to make the server issue requests to internal network addresses. Fixed: URL origin is now validated against an allowlist before any server-side fetch.

- **F-3 — Pipeline sudo gate missing (FIXED this branch).** The import pipeline's admin-only entry points lacked an explicit `is_site_admin()` gate and relied solely on RLS to block non-admin callers. Fixed: an explicit capability check was added at the action layer before any pipeline work begins.

- **F-1 — `bluesky-auth` edge function trusts a public DID with no ownership proof (DEFERRED — mobile inactive).** Mobile sign-in sends only `{ did, handle }` strings; the function verifies via a public profile lookup with no proof of key ownership. Since DID+handle are public, anyone who knows a victim's DID could mint a Supabase session for that account. Web sign-in is not affected (it uses a full server-side code-exchange). Full details and fix options are documented in `apps/mobile/CLAUDE.md` — address when mobile work resumes.

- **`atproto_sessions` RLS reconciliation (TODO — Phase 1).** The RLS audit plan notes that `atproto_sessions` policies should be reconciled with the init-plan `(SELECT auth.uid())` pattern and scoped verb grants; this was not explicitly covered in the code-layer review and should be included in the Phase 1 RLS-fix PR.

## Follow-through checklist (required once architecture decisions land)

Update the agent-facing docs so future sessions inherit the decisions:

- [ ] Root `CLAUDE.md` — architecture overview + gotchas (client selection, Data API posture)
- [ ] `.claude/CLAUDE.md` — data-access architecture notes
- [ ] `.claude/skills/querying-supabase` — client selection rules
- [ ] `.claude/skills/reviewing-caching` — caching playbook changes
- [ ] `.claude/skills/building-web-app` / `building-mobile-app` — data-fetching patterns
- [ ] `.claude/skills/using-realtime` — payload-driven pattern, publication requirements, Broadcast vs postgres_changes
- [ ] `.claude/rules/supabase-patterns.md`, `architecture.md`, `nextjs-conventions.md`
- [ ] Agent memory (`MEMORY.md`) — data-access architecture summary
