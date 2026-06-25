# Team Builder Landing — Phased Implementation Plan

## Status (2026-06-25)

Phases 1–6 + dashboard consolidation implemented on `feat/builder-landing-phase2` (PR #377). Alt-pills, fuller row ⋯ menu, and top-level "Export / back up all teams" are in. `hasTeamBuilderAccess` beta gate retired as obsolete — `/builder` is open and team-builder is GA. Remaining work = test-hardening pass (Jest migrate fixtures + Milestone C tests + RTL + Playwright E2E; CI currently disabled due to GitHub Actions billing).

The phase tables below are preserved as historical record.

---

> **For agentic workers:** This is the **governing roadmap**. Each phase below is a self-contained, working, testable deliverable. Per-phase bite-sized TDD task breakdowns are authored **just-in-time** at the start of each phase (via `superpowers:writing-plans` → `superpowers:subagent-driven-development`), because later phases' exact interfaces depend on earlier phases' outcomes.

**Goal:** Turn `/builder` from a single-team editor into a rich team-management landing — unified list, alts, folders, smart search, quick-look, bulk actions, and a safe lifecycle — that beats the Showdown teambuilder.

**Architecture:** A two-pane landing route (`/builder`) + a per-team editor route (`/builder/t/[id]`). Teams are **P-bucket** (per-user, RLS): SSR for first paint + a direct authenticated browser client for interactivity. One **enriched in-memory list** drives rows, search, quick-look, and smart-folder evaluation via a single client-side predicate evaluator.

**Tech Stack:** Next.js 16 (App Router, Server Components, `'use cache'` N/A here — per-user), React 19.2 + React Compiler, TanStack Query v5, Supabase (Postgres + RLS), shadcn/Base UI, Tailwind 4, Zod via `@trainers/validators`.

**Source spec:** [`spec.md`](./spec.md) (design + 5 resolved gaps) · companion editor work: `docs/builder-single-focus-redesign/` (separate worktree, no routing overlap).

## Global Constraints

- **Data access:** teams are P-bucket — direct authenticated client + RLS, SSR in user context (`createClientReadOnly()`). **Never** `/api/v1`, **never** `'use cache'`/public caching for team reads.
- **No manual memoization** — React Compiler is on (`useMemo`/`useCallback`/`React.memo` are forbidden).
- **No arbitrary pixel values** — Tailwind scale only; `cn()` for conditional classes.
- **Mobile = responsive web only** — `useIsMobile()` conditional-mount for divergent layouts; an Expo parity ticket is logged separately. No `hidden md:block` swaps.
- **Type safety** — `Tables<>`/`TablesInsert<>`/`TablesUpdate<>`; no `any`; inline `import { type X }`; export composite query types from the package barrel.
- **Migrations** — file-based only, never via MCP/dashboard; RLS in the same migration; idempotent guards; `pnpm generate-types` after.
- **Push policy** — no local lint/typecheck/test gating; CI is authoritative. Orchestrator commits between waves; subagents report changed files only.
- **Name-first row anatomy everywhere** — `name (📌) → sprites → format → sync → ⋯`, fixed-width name column.

---

## Current State (verified)

- `/builder` → `apps/web/src/app/(builder)/builder/page.tsx` → `<LocalBuilderWorkspace>` (single-page editor, localStorage-backed, works logged-out).
- Components: `apps/web/src/components/team-builder/` (incl. `team-card.tsx`, `all-teams-client.tsx`, `teams-list-client.tsx`, `local-builder-workspace.tsx`, `team-workspace.tsx`, `new-team-dialog.tsx`).
- Queries: `packages/supabase/src/queries/teams.ts` — `getTeamsForUser`, `getTeamsForAltList/Full`, `getTeamWithPokemon`, `getTeamsForAltByFormatFull`.
- Mutations: `packages/supabase/src/mutations/teams.ts` — `createTeam`, `updateTeam`, `deleteTeam`, `forkTeam`, `reorderTeamPokemon`, …
- Server actions: `apps/web/src/actions/teams.ts`. Editor-redesign branch is active in a **separate worktree** (no shared-tree conflict).
- **Map correction (2026-06-23):** there are actually **two** editors today. `/builder` mounts the **local** (logged-out, localStorage) editor; the **account-team** editor already lives in the **dashboard** at `/dashboard/alts/[username]/teams/[teamId]` (`DashboardBuilderWrapper` → `TeamWorkspaceV2`). Both wrap the persistence-agnostic `TeamWorkspaceV2`. The local store is **single-draft** today (one key `trainersgg.builder.localTeam.v1` → one `LocalTeamData`, team `id: -1`) — there is no multi-draft id scheme yet. Other dashboard team surfaces: `/dashboard/teams` (`AllTeamsClient`), `/dashboard/alts/[username]/teams` (`TeamsListClient`), dashboard-home `TeamsSubTable`. The public `/user/[handle]` teams tab is **viewing**, not management.

---

## Target File Structure

**Routes**
- Create `apps/web/src/app/(builder)/builder/t/[id]/page.tsx` — per-team editor route (SSR account team or local-draft id).
- Modify `apps/web/src/app/(builder)/builder/page.tsx` — becomes the landing (renders the two-pane workspace).

**New landing components** (`apps/web/src/components/team-builder/landing/`)
- `teams-landing-client.tsx` (orchestrator) · `landing-toolbar.tsx` (Viewing pills + search + Sort/density + New) · `folder-rail.tsx` · `team-sections.tsx` · `team-row.tsx` (name-first) · `team-row-mobile.tsx` (card) · `quick-look.tsx` (hovercard) · `quick-look-sheet.tsx` (mobile) · `smart-search.tsx` · `criteria-builder.tsx` · `bulk-action-bar.tsx` · `reconcile-banner.tsx` · `empty-state.tsx` · `*-shared.ts` for cross-sibling types/helpers.

**New shared logic** (`packages/` — zero framework imports where possible)
- Predicate evaluator + search parser (shared by live search and smart folders).
- Unified-list merge (localStorage drafts ⊕ account teams) helper.

**Data layer** (`packages/supabase/`)
- `queries/teams.ts` — add `getEnrichedTeamsForUser` (+ exported composite type).
- `mutations/teams.ts` — add pin/archive/sort_order, folder CRUD + membership, smart-folder CRUD, bulk variants, `moveTeamToAlt`.
- `supabase/migrations/<ts>_team_builder_landing.sql` (see `create-migration` skill for naming).

---

## Phases

> Phases define **what ships and its done-when** (the acceptance criteria). The **Parallel Execution Model** below defines **how it's built** — and deliberately builds later-phase components early, in parallel, against locked contracts. Each phase still ends with working, testable software. Reviewers listed are dispatched **before push** per the auto-delegation table.

### Phase 1 — Local-builder routing split (foundation) · **scope revised 2026-06-23**

**Decision (2026-06-23):** Phase 1 is **local-drafts-only and purely additive** — it builds the new `/builder` landing + `/builder/t/[id]` editor for the **local (logged-out) builder** and **touches nothing in `/dashboard/*`**. Account teams do **not** appear in the landing yet (they arrive with the Phase 3 enriched unified list), and `/builder/t/[id]` hosts **local drafts only** in this phase.

> **Eventual direction (later phase, not this PR):** pull team-builder *out of the dashboard* entirely — `/builder/t/[id]` becomes the single editor for account teams too, and the dashboard team routes (`/dashboard/teams`, `/dashboard/alts/[username]/teams`, `…/teams/[teamId]`, home `TeamsSubTable`) **redirect** into `/builder`. The user confirmed this end-state; it is sequenced **after** the rich landing exists so the list UX is never downgraded. The public `/user/[handle]` teams tab stays.

**Goal:** `/builder` renders a minimal landing listing the user's **local drafts** (name-first rows + `New Team`); `/builder/t/[id]` hosts the local-draft editor. Multi-draft local storage replaces the single-slot store. Back button, deep links, and local-draft ids all work. **No schema change. No dashboard change.**

- **Scope:** introduce a **multi-draft** local store keyed by a stable string id (`local-ab12`), migrating today's single `…localTeam.v1` draft into it; refactor the local editor so `/builder/t/[id]` edits the draft named in the URL; `/builder` lists those drafts; `NewTeamDialog` gets an optional post-create navigation-target prop so the **builder context** routes to `/builder/t/[id]` while its **dashboard usage is unchanged**.
- **Files:** create `builder/t/[id]/page.tsx`, `landing/teams-landing-client.tsx` (minimal), `landing/team-row.tsx`, `persistence/local-drafts-store.ts`, `persistence/use-local-drafts.ts`, `landing/team-landing-shared.ts` (contract types); modify `builder/page.tsx`, `local-builder-workspace.tsx`, `new-team-dialog.tsx`. **Do not modify** `team-workspace.tsx` beyond what mounting per-draft requires, and **do not touch** any `(dashboard)` file.
- **Done-when:** navigate landing → editor → browser-back returns to the list; reloading `/builder/t/local-xxxx` hydrates that draft; creating a team lands in its editor; multiple local drafts coexist and the old single draft is migrated on first load; `/dashboard/*` is byte-for-byte unchanged.
- **Depends on:** nothing. **Atomic PR** (shared `/builder` entry touchpoint with the editor worktree).
- **Tests:** Jest for the multi-draft store + id helper (create/list/get/update/delete + migration); RTL for `team-row` + landing client + the `NewTeamDialog` nav prop; Playwright E2E for landing↔editor↔back, deep-link, and new-team→editor.
- **Reviewers:** code-reviewer, ui-verifier, parity-checker (bg).

### Local-first re-sequencing (2026-06-23) — built ahead of Phase 2

Phase 1's "local-drafts-only + additive" decision was extended: the **entire rich landing was built client-side against localStorage**, ahead of (and without) the Phase 2 schema. The DB, account-team enrichment, and dashboard consolidation stay **deferred**. Built on `feat/builder-landing-phase1` (PR #374→ impl PR #376) as three milestones:

| Milestone (this branch) | Maps to | Built |
| --- | --- | --- |
| **A** | Phase 3 (client part) | smart search (predicate evaluator + parser, `⌘K`), match highlight, quick-look hovercard/sheet |
| **B** | Phase 4 + Phase 5 controls | folder rail + collapsible sections, auto (gen→format) / manual / smart folders (seeded + criteria-builder + save-from-search), sort + density (persisted), pin / archive / move-to-folder, roving keyboard nav |
| **C** | Phase 5 bulk + Phase 6 (client) | bulk select + action bar (move/export/archive/delete), deferred-commit delete + Undo, empty/first-run (guest + authed; sample on-ramp stubbed), mobile FAB, **drag-reorder** (Custom-order gated) |

**Local substitutions for the deferred DB:** `pinned`/`archived`/`sortOrder`/`folderIds` live on the local draft record (store **v3**); `local-folders-store` holds manual + smart folder defs; `landing-prefs-store` holds sort/density/rail/selected-folder. One `Predicate` evaluator powers live search **and** smart folders.

**Chrome fix (2026-06-23):** the landing now renders **full-width** with the `BuilderNav` top bar + the site footer (it had been a narrow centered column with no chrome).

**Execution approach for this push (user-directed):** tests were **deferred to a final hardening pass** — build all features first. Per-feature work ran source-typecheck-only inline; CI is the safety net. The hardening pass owes: a green Jest suite (migrate fixtures to the shared `makeDraftRecord`; add Milestone C tests), E2E extension (search / folders / bulk-undo / archive-restore / drag), and a **production-build** UI verification (dev can't render the editor — ~90s `@smogon/calc` compile). A code review of Milestones A+B was run; its source findings (storage-key v2→v3, mobile tap target, non-unique keys, instance-scoped counter, `use client` hook directive) are fixed.

**Still deferred (later phases) — the Phase 2–6 specs below remain the source of truth for the DB-backed work:** Phase 2 schema + RLS, `getEnrichedTeamsForUser` + account-team enrichment (the account side of Phase 3), `move_team_to_alt`, login-reconcile/sync (Phase 6), and the dashboard consolidation (pull team-builder out of `/dashboard/*`).

---

### Phase 2 — Schema + data layer

**Goal:** every DB capability the later phases need, with RLS and regenerated types.

- **Scope (migration):**
  - `teams` add `pinned boolean not null default false`, `archived boolean not null default false`, `sort_order integer` (nullable).
  - `team_folders` (`id`, `owner_alt_id`/owner scope, `name`, `created_at`) + `team_folder_members` (`folder_id`, `team_id`, unique).
  - `smart_folders` (`id`, owner, `name`, `criteria jsonb`, `is_seeded boolean`).
  - RPC `move_team_to_alt(team_id, target_alt_id)` — **verifies caller owns BOTH source and target alts** before reassigning `teams.created_by`.
  - RLS on all new tables (owner-scoped via `auth.uid()`); membership insert verifies the team is owned by the same user.
- **Scope (TS):** `getEnrichedTeamsForUser` (species/item/ability/4 moves/tera/nature for all 6, explicit column allowlist — no `*` on PII-adjacent embeds); pin/archive/sort_order + folder/smart-folder/bulk mutations; `moveTeamToAlt` wrapper; `pnpm generate-types`.
- **Done-when:** `pnpm db:reset` applies clean; `pnpm db:lint` + `pnpm db:advisor` clean; query/mutation unit tests pass; types regenerated.
- **Depends on:** nothing (disjoint from Phase 1 — can run **in parallel**).
- **Reviewers:** migration-reviewer, security-reviewer (RLS + move-to-alt ownership), reviewing-database.

### Phase 3 — Enriched unified list + rich search + quick-look

**Goal:** the in-memory enriched list, the shared predicate evaluator, smart search, and quick-look.

- **Scope:** `useUnifiedTeams` (SSR enriched account teams ⊕ localStorage drafts, badged, via TanStack Query); predicate evaluator + search-input parser (predicate types `text`/`field`/`flag`/`format`/`updated_within`); smart-search command palette (grouped suggestions, match reasons, sprite highlight, `⌘K`); quick-look hovercard (desktop) + bottom-sheet (mobile) reading from memory.
- **Done-when:** typing filters the list with match reasons; peeking shows all 6 with item/ability/tera/moves; zero extra network round-trips for search or peek.
- **Depends on:** Phase 2 (`getEnrichedTeamsForUser`).
- **Tests:** evaluator unit tests (many predicate cases); search-parser tests; quick-look conditional-mount (mobile) tests.
- **Reviewers:** code-reviewer, ui-verifier.

### Phase 4 — Folders (auto + manual + smart) + rail + sections

**Goal:** the two-pane organization surface and all three folder types.

- **Scope:** collapsible `folder-rail` (counts, `🗄 Archived` system node, `⌘\`); collapsible `team-sections` (📌 Pinned first, gen→format auto-groups, manual/smart); manual folder create/file (menu + drag-to-folder); smart folders both ways — **Save as Smart Folder** (serialize current query) and `criteria-builder` UI → `criteria jsonb`, evaluated by the Phase 3 evaluator; seeded defaults (Incomplete/Illegal/Recently edited); auto-grouping via the parsing-pokemon generation taxonomy.
- **Done-when:** folders filter/scope the main area; a saved query repopulates live; seeded folders show muted at 0 and fill when matched.
- **Depends on:** Phase 2 (folder tables) + Phase 3 (evaluator).
- **Reviewers:** code-reviewer, ui-verifier.

### Phase 5 — List controls + bulk actions + archive/delete safety

**Goal:** scale-management controls and the safe lifecycle.

- **Scope:** Sort (Recent/Name/Format/Completeness/Custom) + density toggle (persisted); 📌 Pinned section + pin toggle; manual reorder (drag grip, gated to Custom-order + manual folders); keyboard nav (roving tabindex: `↑↓`/`jk`/`↵`/`Space`); bulk select (hover checkbox + long-press + ⇧/⌘-click) → sticky action bar (Move folder/alt · Export · Archive · Delete); **archive** flag (excluded from default views/counts/search); **deferred-commit delete** + Undo toast (single + bulk, flush on navigate-away); top-level **Export / back up all**.
- **Done-when:** sort/density persist across visits; bulk delete shows Undo and truly restores within the window; archived teams vanish from default views and restore from 🗄 Archived.
- **Depends on:** Phase 2 (flags) + Phase 3/4 (list surface).
- **Reviewers:** code-reviewer, ui-verifier, security-reviewer (bulk move-to-alt path).

### Phase 6 — Sync/reconcile + states + empty/first-run + responsive polish

**Goal:** full spec coverage and polished states.

- **Scope:** login-reconcile banner; sticky 🔒 Local-only toggle; loading skeletons + optimistic create + inline fetch-error/retry; persisted UI prefs (alt/folder/sort/density/rail); empty/first-run (logged-in + guest variants, 3 on-ramps — sample on-ramp stubbed/hidden pending source); responsive-web mobile (Folders bottom sheet, FAB, single-column); log the **Expo parity ticket**.
- **Done-when:** logging in with local drafts offers reconcile; the empty shell is fully learnable; every state from §15–16 renders; mobile audit (393×852) passes overflow + tap-target probes.
- **Depends on:** prior phases.
- **Reviewers:** code-reviewer, ui-verifier, auditing-mobile-responsiveness, parity-checker.

---

## Parallel Execution Model

The strategy is **contracts-first → wide fan-out → integrate**: lock the type/prop contracts in a tiny gating wave, then build pure logic, routing, the schema, and every presentational component **simultaneously** against those contracts — and serialize only the genuine integration seams. This pulls later-phase components (e.g. quick-look, criteria-builder) forward into the first build wave.

**Rules — every wave:**
- Subagents **never commit/push** — they report changed files + a suggested commit message; the **orchestrator commits between waves**.
- Each task gets a **disjoint file allowlist** and an explicit **model** (haiku = mechanical, sonnet = implementation/tests).
- **Dispatch a whole wave in one message** (multiple Agent calls). Reviewers run in parallel before each push.
- Concurrency runs ~10–14 agents at once; extra tasks **queue and drain** within the wave — list them all.

```
Wave 0   Contracts (1–2 agents) ── gates everything
   │
Wave 1   ████████████  ~15 agents in parallel  ████████████
         migration · evaluator · parser · merge · routing · 11 UI components
   │            │
   │       Wave 1b  data layer (5 agents) — starts when migration tables exist
   ▼            ▼
Wave 2   Integration (2–3 agents) ── the real serialization seam (orchestrator file)
   │
Wave 3   ██████  ~6 agents in parallel  ██████  cross-cutting behaviors
   │
Wave 4   Verify (E2E flows · mobile audit · parity ticket) + reviewers
```

### Wave 0 — Contracts (gating, tiny)
| Task | Files | Model |
|---|---|---|
| Type + prop contracts | shared `team-landing-types.ts` (enriched team item · `Predicate` union · `SmartFolderCriteria` · badged unified-list item · folder/smart-folder types) + `landing/types.ts` component prop interfaces | sonnet |

### Wave 1 — Max fan-out (~15 parallel agents, fully disjoint files)
| # | Task | Files | Model |
|---|---|---|---|
| 1 | Schema migration + RLS + `move_team_to_alt` RPC | `packages/supabase/supabase/migrations/<ts>_team_builder_landing.sql` | sonnet |
| 2 | Predicate evaluator (pure) | `predicate-eval.ts` + test | sonnet |
| 3 | Search-input parser (pure) | `search-parse.ts` + test | sonnet |
| 4 | Unified-list merge + local-draft id (pure) | `unified-teams.ts` + test | sonnet |
| 5 | Routing split + editor mount | `builder/t/[id]/page.tsx`, `builder/page.tsx`, editor mount edits | sonnet |
| 6 | `team-row` (name-first) | `landing/team-row.tsx` + test | sonnet |
| 7 | `team-row-mobile` card | `landing/team-row-mobile.tsx` + test | sonnet |
| 8 | quick-look hovercard + sheet | `landing/quick-look.tsx`, `quick-look-sheet.tsx` + test | sonnet |
| 9 | folder-rail | `landing/folder-rail.tsx` + test | sonnet |
| 10 | team-sections | `landing/team-sections.tsx` + test | sonnet |
| 11 | smart-search UI | `landing/smart-search.tsx` + test | sonnet |
| 12 | criteria-builder | `landing/criteria-builder.tsx` + test | sonnet |
| 13 | bulk-action-bar | `landing/bulk-action-bar.tsx` + test | sonnet |
| 14 | reconcile-banner + empty-state | `landing/reconcile-banner.tsx`, `empty-state.tsx` + test | sonnet |
| 15 | landing-toolbar (Viewing pills + Sort/density shells) | `landing/landing-toolbar.tsx` + test | sonnet |

### Wave 1b — Data layer (starts when Wave 1·task 1 tables exist; fans out)
| Task | Files | Model |
|---|---|---|
| Enriched query + exported type | `queries/teams.ts` (new export) | sonnet |
| Flag mutations (pin/archive/sort_order) | `mutations/teams.ts` (section) | sonnet |
| Folder + membership mutations | `mutations/team-folders.ts` | sonnet |
| Smart-folder mutations | `mutations/smart-folders.ts` | sonnet |
| move-to-alt + bulk wrappers | `mutations/teams.ts` (section) | sonnet |

> `teams.ts` tasks share a file — assign **non-overlapping export sections** or serialize those two; the folder/smart-folder files are fully disjoint.

### Wave 2 — Integration (the serialization seam; few agents)
Converges on `teams-landing-client.tsx`, so kept tight — one integrator owns the orchestrator file, helpers feed it.
| Task | Files | Model |
|---|---|---|
| `useUnifiedTeams` hook + SSR glue | `hooks/use-unified-teams.ts`, `builder/page.tsx` | sonnet |
| Landing orchestrator (compose rail + sections + toolbar + rows) | `landing/teams-landing-client.tsx` | sonnet |
| Search ⇄ evaluator + mutation wiring | `landing/smart-search.tsx` glue + orchestrator | sonnet |

### Wave 3 — Cross-cutting behaviors (~6 parallel agents on the integrated surface)
| Task | Serves |
|---|---|
| Sort + density + persisted prefs | Phase 5 |
| Pin section + manual reorder (Custom-order gated) | Phase 5 |
| Keyboard nav (roving tabindex) | Phase 5 |
| Bulk orchestration + deferred-commit delete + Undo | Phase 5 |
| Folder filing (menu + drag) + smart-folder save/eval | Phase 4 |
| Sync/reconcile + local-only + loading/error/empty states | Phase 6 |

### Wave 4 — Verify (fan out by flow)
E2E suites (routing / search / bulk-undo / archive-restore) · mobile audit (393×852) · Expo parity ticket · reviewers (code/migration/security/ui) in parallel.

### Serialization seams (the only true bottlenecks)
1. **Contracts (Wave 0)** gate the fan-out — keep tiny, review before Wave 1.
2. **Migration → data-layer mutations** — tables must exist first.
3. **Integration (Wave 2)** — components + data + logic must exist; converges on the orchestrator file.

### Drift mitigation
Parallel components build against contracts, not live data — a wrong contract costs rework. Mitigate: review Wave 0 before fan-out; every Wave 1 component ships RTL tests against mock props; `code-reviewer` + the integrator catch contract mismatches at Wave 2.

## Test & Verification Strategy

- **Migration:** `pnpm db:reset` + `db:lint` + `db:advisor`; RLS positive/negative tests (owner vs non-owner; move-to-alt ownership of both alts).
- **Pure logic:** evaluator + search parser + merge/id helpers — exhaustive Jest unit tests.
- **Components:** Jest + RTL, with the `useIsMobile()`/`useIsClient()` conditional-mount pattern for divergent layouts.
- **E2E (Playwright):** routing (landing↔editor↔back, deep link), search-and-open, bulk delete + Undo, archive + restore.
- **UI verification:** `ui-verifier` (desktop + mobile screenshots) before each UI phase's push.

## Open Items (not blockers)

- **Sample-team source** (§20, D11) — still TBD; the "✨ Start from a sample" on-ramp ships **stubbed/hidden** in Phase 6 until a source is chosen.
- **Generation taxonomy** — auto-folder grouping leans on the `parsing-pokemon` skill's Gen-9 taxonomy; confirm it's reliable before Phase 4.

## MVP Cut (optional, if a leaner v1 is wanted)

A smaller first release could ship **Phases 1–3 + basic archive/delete** and defer smart-folder criteria-builder, manual reorder, and bulk power-features (⇧/⌘-click ranges) to a fast-follow. Phasing makes either choice cheap.

---

## Execution Handoff

Execution model: **subagent-driven, max-parallel** — per the Parallel Execution Model above. Each wave is dispatched in a single message (multiple Agent calls, disjoint file allowlists, explicit model per task); subagents report changed files only; the orchestrator commits between waves and runs reviewers in parallel before each push. Detailed bite-sized TDD task prompts are authored at the start of each wave (so each agent gets literal Write/Edit calls + the contract it builds against), beginning with Wave 0 contracts.
