# Database Security Hardening — Design Doc

**Date:** 2026-06-15
**Status:** Draft v2 (revised after adversarial review — execution-ready pending 2 confirmations)
**Branch:** `fix-missing-cron-schema` / PR #361 — **all work lands here before merge**

---

## Context

A Supabase Security Advisor scan flagged two Critical "SECURITY DEFINER View" findings plus a long WARN tail. Investigating surfaced a deeper truth: **the current access control is incorrect** — PII is reachable by callers who should not reach it. One leak is confirmed live (community owner PII via an API route). The DB also relies on a single control (RLS rows) + sometimes a route gate, so it is _also_ fragile.

**Primary goal: correctness** — make PII genuinely inaccessible to non-owners. The layer count is not the point; a single correct control can be secure. **Secondary goal: defense-in-depth** — resilience so a future mistake doesn't become a breach. Insurance on top of a correct control, never a substitute.

This doc was revised after a three-agent adversarial review that found real holes in the first draft (understated blast radius, a wrong `search_path` premise, a silent loss of the email-uniqueness invariant, FK cascade semantics, and a type-generation gap). Those corrections are folded in below.

---

## Root causes

| Root                                  | Description                                                                                          | Symptoms                                                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **R1 — No public/private separation** | Everything in `public`; tables mix PII + public columns (`users`, `tournament_registrations`)        | SECURITY DEFINER views (lint 0010); the `users` PII tangle                                                                               |
| **R2 — Default-open privileges**      | Supabase baseline `GRANT ALL` to anon/authenticated; RLS is the sole gate; no column least-privilege | `GRANT ALL` footgun; anon-executable definer fns; `pokemon` INSERT `true`; admin routes with no RLS backstop; `user_roles` `USING(true)` |
| **R3 — Over-broad access in code**    | `select('*')`, wildcard `rel(*)` embeds, service-role for public reads                               | confirmed live community-owner + match-detail PII leaks                                                                                  |

---

## Target model: a correct control, with defense in depth

Primary control = **data separation by sensitivity** (layer 1): PII the API cannot serve. The rest are resilience layers, each independently sufficient:

| Layer                     | Mechanism                                                            | State      |
| ------------------------- | -------------------------------------------------------------------- | ---------- |
| 1. Schema isolation       | PII in a non-exposed schema (PostgREST never serves it)              | ❌ → P1    |
| 2. Least-privilege grants | Revoke `GRANT ALL`; column grants; drop unused DML                   | ❌ → P2    |
| 3. RLS                    | Row policies, `(SELECT auth.uid())` initplan                         | ✅ mostly  |
| 4. Query hygiene          | Explicit column allowlists; no wildcards; no service-role-for-public | ❌ → P0    |
| 5. Route gates            | Auth + rate-limit on `/api/v1`                                       | ✅ present |

---

## Confirmed defects & leaks (from adversarial review)

| #   | Item                                                                                                                                                                   | Type                         | Fix wave                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------- |
| 1   | `…195810` views: `invoker=true` breaks **authenticated** cross-user view reads (logged-in username check `profile.ts`, staff activity feed)                            | shipped-migration regression | resolved by P1          |
| 2   | `…195840` uploads: new SELECT policy only matches `{uid}/`; community assets at `communities/{id}/` become unmanageable **on hosted** (masked locally by service-role) | shipped-migration regression | P0 (new migration)      |
| 3   | `…195830` graphql: no `pg_extension` guard; aborts replay if pg_graphql ever absent                                                                                    | latent                       | P3 (hardening)          |
| 4   | **Community owner PII** (`email`, legal name, phone, DOB) → `/api/v1/communities/[slug]` to any **authenticated** user via `owner:users(*)`                            | live leak                    | P0                      |
| 5   | **Match PII** (`bio`, `user_id`, `tier`) → `/api/v1/matches/[matchId]` via `alts(*)`, no per-match gate; JSDoc falsely says "No PII"                                   | live leak                    | P0                      |
| 6   | `user_roles` `USING(true)` — any authenticated user can enumerate role assignments (who is site_admin); no PII                                                         | recon surface                | P2 (verify usage first) |
| 7   | Dead-code wildcard embeds (`getCommunityAdminDetails`, `getRoundMatches alts(*)`, `getCachedTournamentRegistrations`)                                                  | latent                       | P0 (defensive narrow)   |

**Verified safe (held up under attack):** `…195820` RPC revokes (all four); admin queries (RLS + gate); own-row reads (JWT-derived `auth.uid()`).

**Correction to draft v1:** the community leak reaches **authenticated** API callers, _not_ logged-out SSR visitors — the owner object never crosses into a client component on the SSR page (verified: `CommunityTabs` is the only client component and doesn't receive `owner`).

---

## Program

### P0 — Stop active bleeding + guardrail (independent, ships first)

1. **Uploads hosted fix** — new migration: add a SELECT policy for the `communities/` prefix (mirror the community ownership check in `20260404193000`), keeping `{uid}/` folders private. Verify on a hosted-like path that logo/banner manage works.
2. **Narrow the live-leak embeds** — `owner:users(*)` → `(id, username, image, name)` in `communities.ts:131,183,284`; `player1/player2:alts(*)` → explicit non-PII allowlist in `tournaments.ts:1382-1383`. Correct the false "No PII" JSDoc in `match-details-endpoint.ts` + the `/api/v1/matches` header.
3. **Narrow dead-code wildcards** defensively (item 7).
4. **Project rule** — add to `.claude/rules/supabase-patterns.md`: no `select('*')` / wildcard `rel(*)` on tables with non-public columns; explicit allowlists. Harden the partial notes already in `reviewing-database` + `querying-supabase`.
5. **ESLint check** — `no-restricted-syntax` selector catching `.select("*")` and `"*, …(*)"` literals in `packages/supabase/src/**` + `apps/**`, enforced in CI.

### P1 — Structural fix (R1): separate PII from `public.users`

Canonical Supabase remediation: separate by sensitivity, then a plain `security_invoker=true` view over public-only columns clears lint 0010 with no PII risk. This **supersedes** the broken `…195810` view conversion (item 1).

**Schema & table** _(Decision 2 — recommended: non-exposed schema)_

- Create `private.user_pii` (schema **not** in `config.toml` exposed list) — `user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE`, plus `first_name`, `last_name`, `birth_date`. Clean FK — new table, no orphan risk.
- **Email is NOT stored here** — it is dropped from `public.users` and read from `auth.users` (canonical, uniqueness enforced by Auth). This removes the `UNIQUE(email)` / `idx_users_email` concern entirely. Dropping `email` also drops `users_email_key` + `idx_users_email` via CASCADE — fine, no longer needed.
- The `first_name`/`last_name`/`birth_date` indexes (`users_*_idx`) drop via CASCADE when the columns move — recreate on `private.user_pii` ONLY if a query needs them (e.g. admin name search); confirm during P1, don't recreate blindly.
- Own-row RLS on `private.user_pii` (`(SELECT auth.uid()) = user_id`). (Defense-in-depth only — schema is already unreachable via the API.)

**Columns**

- **Drop outright** (3 dead — zero app reads/writes): `phone_number`, `external_accounts`, `public_metadata`. Edit `tooling/test-utils/src/factories/user.ts:13,24,25` in the same wave or typecheck breaks.
- **Drop `email`** from `public.users` — read from `auth.users` instead (canonical, no copy). Repoint the email read sites (below).
- **Move to `private.user_pii`**: `first_name`, `last_name`, `birth_date` (app-owned, no staleness). (`country` stays — it's public.)

**DB objects to repoint (schema-qualify everything — both functions pin `search_path='public'`, so an unqualified `user_pii` reference resolves to `public` and FAILS)**

- **`handle_new_user()`** — insert `public.users` first, then `private.user_pii` (FK order). Schema-qualify `INSERT INTO private.user_pii`. **Populate name/DOB from `raw_user_meta_data`** — note the current trigger drops `first_name/last_name/birth_date` (a pre-existing latent bug; `tournaments.ts:952` expects them). A failing trigger blocks ALL signups → test exhaustively.
- **`get_email_by_username()`** — reads email from **`auth.users`** now (SECURITY DEFINER can read it): `SELECT au.email FROM auth.users au JOIN public.users u ON u.id = au.id WHERE lower(u.username) = lower($1)`. Start from the **case-insensitive** version (`20260612203733`), NOT the case-sensitive one (`20260611030000:104`). Add a functional index `lower(username)` on `public.users` (none exists today — currently a seq scan). Schema-qualify `auth.users` (function pins `search_path='public'`).
- **Views** — recreate `public_user_profiles` / `public_tournament_registrations` as `security_invoker=true` + add `authenticated USING(true)` on `public.users` (now safe — no PII left). `public.users` becomes a clean all-public S-bucket table.

**`tournament_registrations` parallel (P1b)** — same mixed-column problem (staff-internal `drop_notes`, `dropped_by`, `rental_team_photo_*`, `team_locked`). It's a realtime-six table (authenticated SELECT kept). Separate the staff columns analogously so its view is invoker-safe and players can't read staff notes about themselves. Scope confirmed in P1b sub-design.

**Type generation** — `generate-types` has no `--schema` flag, so a `private` schema gets NO TS type. Set the script to `--schema public,limitless,rk9,graphql_public,private` while leaving `config.toml` **untouched** → type WITHOUT API exposure (the desired split).

**Read/write repoint — ~20 sites across 12+ files (draft v1 said ~6):**

- _Own-row reads_ (via SECURITY DEFINER RPC, since the schema is non-exposed): `profile.ts:222` (birth_date), `tournaments.ts:952` (first/last from `private.user_pii`).
- _Admin cross-user reads_ (service-role): `admin-users.ts:181,227` — email from `auth.users` (service-role/`auth.admin`); first/last via service-role join to `private.user_pii`.
- _Embeds that CANNOT read a private column via PostgREST_ — `communities.ts:723,800,991` (staff roster embeds first/last/email) MUST be rewritten as separate service-role joins: first/last from `private.user_pii`, email from `auth.users`.
- _Edge functions_ (4): `oauth/callback`, `bluesky-auth`, `provision-pds`, `signup` — email reads source from `auth.users` server-side (already available in several via `auth.getUser()`/`auth.admin`).
- _Mobile_: `sign-in.tsx:33` reads `users.email` directly → switch to the `get_email_by_username` RPC (already broken by `…195810`'s anon column-revoke).
- _Writes_: `profile.ts:313,324`, `onboarding.ts:97` (birth_date), `tournaments.ts:963` (first/last onto registration).

### P2 — Least-privilege (R2)

- **Revoke `GRANT ALL`** from authenticated where unneeded → column grants + drop unused INSERT/UPDATE/DELETE (verify each table's write paths first — most go through SECURITY DEFINER RPCs / server actions). Do **not** re-revoke the anon column grant `…195810` added.
- **`user_roles` `USING(true)`** — verify who reads it (client-side permission checks?) before tightening to own-row + admin.
- **Audit anon/authenticated-executable SECURITY DEFINER functions** — keep only genuinely-public ones.
- **`pokemon` INSERT `WITH CHECK (true)`** — verify whether it should be scoped to team ownership; tighten if so.

### P3 — Systematic + permanent guardrails

- **Run `pnpm db:advisor`** (after `db:reset`) as the authoritative finding list — the original report is the remote dashboard, pre-migrations. Drive to zero.
- **GraphQL guard** (item 3) — add `pg_extension` guard convention; optionally re-issue the revoke guarded.
- **Document the layered model** in `.claude/rules`; consider `db:advisor` in CI to block new Critical findings.

---

## Descoped (deliberate, not forgotten)

- **`auth.users` ↔ `public.users` FK + account-deletion cascade.** Tempting integrity win, but `public.users.id` has ~26 inbound FKs (~19 cascade, 3 RESTRICT children — `organizations.owner_user_id`, `beta_invites`, `waitlist` — that would fail a cascade partway). Changing platform-wide deletion semantics is a separate, deliberate design — not bundled into a security fix. (The new `private.user_pii → public.users` FK is unaffected and safe.)

---

## Open decisions

1. ✅ **All work on `fix-missing-cron-schema`.** No separate revert; the broken `…195810` view conversion is superseded by P1. The branch is non-functional for authenticated users between P0 and P1 landing — _expected_, not a new bug (implementers: don't chase it).
2. ✅ **PII location: non-exposed `private` schema.** Strongest correctness — PostgREST never serves it. Accepted costs: `generate-types --schema` split (type without exposure) + own-row reads via SECURITY DEFINER RPC (no direct query) + staff-roster embeds rewritten as RPC/service-role joins.
3. ✅ **email: drop from our DB; read from `auth.users` (read-only, canonical source).** No stored copy → no staleness, by design. `auth.users.email` already enforces uniqueness, so no `UNIQUE(email)` to recreate. Reads go through SECURITY DEFINER fn (`get_email_by_username`) and service-role server-side; we NEVER DDL `auth.users` and never expose it through a view (no "exposed auth.users" lint). `first_name`/`last_name`/`birth_date` are app-owned (not copies) → they still move to `private.user_pii`.
4. **`GRANT ALL` revocation scope** — _recommended: incremental, highest-value first_ (`users`, `tournament_registrations`, PII tables), expand after verifying write paths.

---

## Verification (empirical gate — we have run NOTHING yet)

1. **`pnpm db:reset`** — confirm all migrations replay clean (signup smoke test: trigger must not fail).
2. **`pnpm db:advisor`** — Critical count → 0, no new findings.
3. **`pnpm generate-types`** — confirm `private` type appears, `config.toml` unchanged.
4. **Per-role manual checks:** anon reads safe columns only; authenticated reads others' public profiles AND own private data (settings); service-role API payloads carry no PII.
5. **Hosted-specific (the uploads trap):** community logo/banner upload+delete under the authenticated client (not just local service-role).
6. **`pnpm test`** + `phase2-anon-revoke-grants` suite; add a test asserting the `/api/v1/communities/[slug]` payload contains no PII.
7. ESLint wildcard rule green in CI.

---

## Dependency & Parallelism Map

**The one hard barrier:** the PII-split migration + `generate-types` must apply before any code that reads the `private` schema. You cannot parallelize around it. Everything else front-loads around this single wall.

**Key lever:** most work is NOT gated by P1 — all of P0, the P2-independent items (`user_roles`, `pokemon`, definer-fn audit, `GRANT ALL` on non-users tables), and all discovery can run in the first authoring wave, in parallel with authoring the P1 migration. They fall OFF the critical path.

Tasks within a wave touch disjoint file sets (no same-wave collisions). Subagents never commit; the orchestrator commits at each 🚧 barrier. Pass each agent an explicit file allowlist.

### Wave A — Discovery (read-only, ~3 agents, no writes)

| Task | Output                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------ |
| A1   | Enumerate EVERY `.select("*")` / wildcard `rel(*)` repo-wide → full fix list + ESLint scope            |
| A2   | Confirm placeholder-email situation + whether an email-change feature exists (settles P1 email detail) |
| A3   | Scope `tournament_registrations` staff-column read/write sites (scopes P1b)                            |

### Wave B — Independent authoring (parallel, disjoint files)

| Agent | Files (allowlist)                                                          | Notes                                                                                                                                                                   |
| ----- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1    | new uploads migration                                                      | `communities/` SELECT policy (hosted fix, item 2)                                                                                                                       |
| B2    | `communities.ts`                                                           | leak-narrow `owner:users(*)` + dead-code embeds (P0 — ships fast to stop live leak)                                                                                     |
| B3    | `tournaments.ts`, `match-details-endpoint.ts`, `/api/v1/matches` route     | leak-narrow `alts(*)` + fix false "No PII" JSDoc                                                                                                                        |
| B4    | `.claude/rules/supabase-patterns.md` + skills                              | no-wildcard rule (text only)                                                                                                                                            |
| B5    | new P1 **users-split** migration(s)                                        | private schema + `user_pii` + move first/last/DOB + drop email & 3 dead + recreate views invoker=true + repoint trigger + `get_email_by_username` + **own-row PII RPC** |
| B6    | new P1b **registrations-split** migration                                  | per Wave A3 scope                                                                                                                                                       |
| B7    | new migrations: `user_roles` tighten · `pokemon` INSERT · definer-fn audit | P2-independent (verify usage first per A)                                                                                                                               |

> B1/B5/B6/B7 are distinct new migration files (disjoint) — orchestrator assigns ordered timestamps. ESLint-rule _enable_ is deferred to Wave D (can't turn on until all violations fixed).

### 🚧 Barrier 1 — orchestrator

commit Wave B · `pnpm db:reset` (signup smoke test — trigger must not fail) · `pnpm generate-types` (with `--schema …,private`) · `pnpm db:advisor` snapshot.

### Wave C — Code repoint (the big fan-out, ~10 agents, all disjoint files)

| Agent | Files                                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| C1    | `profile.ts` + `onboarding.ts` (own-row read/write via RPC)                           |
| C2    | `tournaments.ts` (own-row first/last via RPC)                                         |
| C3    | `admin-users.ts` (email from `auth.users` + first/last service-role join)             |
| C4    | `communities.ts` (staff-roster embeds → service-role joins)                           |
| C5–C8 | edge fns — `oauth/callback`, `bluesky-auth`, `provision-pds`, `signup` (1 agent each) |
| C9    | mobile `sign-in.tsx` → `get_email_by_username` RPC                                    |
| C10   | `tooling/test-utils/src/factories/user.ts` + mock fixups                              |

### 🚧 Barrier 2 — orchestrator

commit Wave C · `pnpm db:reset` · `pnpm typecheck` + `pnpm test`.

### Wave D — Dependent + finalize (parallel)

| Agent | Task                                                                    |
| ----- | ----------------------------------------------------------------------- |
| D1    | P2 `GRANT ALL` revoke on `users` / `registrations` (migration)          |
| D2    | **Enable ESLint wildcard rule in CI** (all violations now fixed)        |
| D3    | GraphQL `pg_extension` guard migration (item 3)                         |
| D4    | docs + `.claude` layered-model write-up + (optional) `db:advisor` in CI |

### 🚧 Barrier 3 — orchestrator

`pnpm db:advisor` → confirm 0 Critical · full `pnpm test` + E2E · CI green before PR #361 merges.

### Critical path

`B5 users-split migration` → Barrier 1 → slowest Wave C agent → Barrier 2 → `D1 P2-users` → Barrier 3. Everything in Waves A/B besides B5, plus all P0 and P2-independent work, runs concurrently and off the critical path.

### Same-file sequencing (not collisions)

`communities.ts` (B2 narrow, then C4 repoint) and `tournaments.ts` (B3 narrow, then C2 repoint) are edited in two different waves — sequential via the commit barrier, so no same-wave conflict.

---

## References

- Lint 0010 (Security Definer View): https://supabase.github.io/splinter/0010_security_definer_view/
- RLS / `security_invoker`: https://supabase.com/docs/guides/database/postgres/row-level-security
- Column-level security (discouraged here): https://supabase.com/docs/guides/database/postgres/column-level-security
- Hardening the Data API / non-exposed schema: https://supabase.com/docs/guides/database/hardening-data-api
- Custom/exposed schemas: https://supabase.com/docs/guides/api/using-custom-schemas
- User-management trigger pattern: https://supabase.com/docs/guides/auth/managing-user-data
- Maintainer two-table-split guidance: Supabase discussions #8663, #36429, #1501
