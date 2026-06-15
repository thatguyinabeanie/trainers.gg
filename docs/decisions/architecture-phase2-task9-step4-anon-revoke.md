# Phase 2 Task 9 — Step 4: Revoke `anon` SELECT on S-bucket tables

Date: 2026-06-13
Branch: `feat/phase2-task9-step4-revoke` (off `main` after #354 merged)
Parent: `docs/decisions/architecture-phase2-task9-revoke-plan.md`

## Decision (2026-06-13)

**Revoke `SELECT` from `anon` ONLY — keep `authenticated`.** A scoping change from the
original plan (which revoked both roles).

- `anon` and `authenticated` are independent Postgres roles; the grant is revocable per-role-per-table.
- **anon revoked** → a logged-out browser / the anon key can no longer read these tables directly via PostgREST. Public pages already render server-side (service-role), so nothing logged-out legitimately needs anon DB access.
- **authenticated kept** → logged-in users keep reading their own data directly via the `authenticated` key + RLS. RLS is the wall for logged-in reads.

**Why this scope:** it delivers the core lockdown (no anonymous direct DB access) with far less churn, and avoids swapping every per-user/manage read to service-role. Trade-off: logged-in direct reads lean on RLS being correct (one wall) rather than grant+RLS (two walls). Accepted by the owner.

## Audit result (working tree, verified)

A reader breaks under an **anon-only** revoke iff it executes with the anon role, i.e.:
- a `createStaticClient()` read (anon key, server-side), OR
- a browser read on a page a **logged-out** visitor can load.

Findings:
- **Browser reads on public pages — NONE break.** Verified: `current-match-banner` reads `tournament_matches` (excluded/realtime); `match-header` uses the coach-badges RPC + `public_user_profiles` view; `tournament-sidebar-card-client` uses `useSupabase()` only for check-in *writes*; `match-report-dialog` reads via `useApiQuery` (server route). Match/notification client components touch only the realtime-five tables (excluded).
- **Per-user SSR reads (`createClientReadOnly`/`createClient`, authenticated) — SAFE, no change** (authenticated kept).
- **Manage screens (`useSupabaseQuery`, staff = logged-in = authenticated) — SAFE, no change.**
- **The `/api/v1/tournaments/[id]/registrations` route (reads via `auth.supabase` = authenticated) — SAFE, no change.**
- **`createStaticClient()` anon readers of revoke-set tables — BREAK, must swap to service-role** (the merged #354 work missed these — see Task 1).

## Revoke set (19 tables) — §3.3 of the parent plan

```
tournaments, tournament_phases, tournament_standings, tournament_player_stats,
alts, teams, team_pokemon, player_ratings, pokemon, communities, community_staff,
groups, roles, group_roles, user_group_roles, coach_profiles, announcements,
user_roles, tournament_registrations
```

**Exclusions (must stay SELECTable to anon):** realtime five (`notifications`, `match_games`, `match_messages`, `tournament_matches`, `tournament_rounds`), `users`, and the views `public_user_profiles` + `public_tournament_registrations`.

## Tasks

### Task 1 — swap the remaining anon-key (`createStaticClient`) readers → service-role
All read public S-bucket data; mechanical `createStaticClient()` → `createServiceRoleClient()`. Keep any `'use cache'`/`cacheTag`/`cacheLife` intact.
- `apps/web/src/app/api/players/stats/route.ts`
- `apps/web/src/app/api/players/tournaments/route.ts`
- `apps/web/src/app/api/players/tournament-history/route.ts`
- `apps/web/src/app/api/players/search/route.ts`
- `apps/web/src/app/(app)/alts/[handle]/page.tsx`
- `apps/web/src/app/(app)/user/[handle]/alts/[alt]/page.tsx`
- `apps/web/src/app/(app)/communities/[communitySlug]/page.tsx`
- `apps/web/src/app/(app)/tournaments/[tournamentSlug]/matches/page.tsx`

Verify with `rg 'createStaticClient' apps/web/src` afterward — the only remaining hits may read a *view* (`public_*`) or a non-revoke-set table; none may read a revoke-set base table.

### Task 2 — the revoke migration (TDD)
1. **Grant-assertion test first** (`packages/supabase/src/__tests__/phase2-anon-revoke-grants.test.ts` or integration): against the live DB, assert anon `SELECT` on a revoke-set table is denied, while the two views + realtime-five tables still return rows to anon, and `authenticated` still reads the revoke-set tables. Run → **red** (grants present).
2. **Static guardrail test** (mirror the Step-1 guardrail): the migration revokes `SELECT ... FROM anon` for each of the 19 tables, and does NOT revoke from `authenticated`, and excludes the realtime five / `users` / the two views.
3. Write `packages/supabase/supabase/migrations/<ts>_phase2_revoke_anon_s_bucket_select.sql`: `REVOKE SELECT ON public.<table> FROM anon;` per table + `COMMENT ON TABLE`. Idempotent.
4. `pnpm db:migrate` (fast, no reset) → tests **green**. One final `pnpm db:reset` to prove clean replay; `pnpm generate-types` (no-op for grants).

### Mobile (deferred — document, do not block)
`apps/mobile` reads `communities`/`tournaments`/etc. via the anon key (`use-communities.ts`, `use-tournament.ts`) → these BREAK under the anon revoke. Mobile is unpublished/deferred — add/refresh the note in `apps/mobile/CLAUDE.md`; do not block this migration.

## Order
Task 1 (swap anon readers) merges first → then Task 2 (revoke migration), gated on Task 1. CI authoritative.
