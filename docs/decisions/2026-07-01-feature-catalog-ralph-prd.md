# Feature Catalog → Ralph-Ready PRD — July 1, 2026

**Status: Designed, not yet built.** This document captures a planning session's output so it survives outside the ephemeral plan file. Approval green-lights the build in a later session, on its own branch.

## Context

The site has no sitemap, no feature inventory, and uneven test coverage — strong on domain logic and the tournament lifecycle, weak on community approval flows, permission/hook-gated features, Discord integration, imports, profile editing, and analytics. Working from "look at the code and improve things" invites arbitrary churn: it optimizes implementation details without ever checking whether the implementation matches what a feature is _supposed_ to do.

The goal is an authoritative, drift-resistant record of what every feature is _intended_ to do (from the user's perspective, not the implementation's), whether it actually works, and what tests it needs. That record then becomes the input to **one massive PRD**, purpose-built to drive a **Ralph loop** ([ghuntley.com/ralph](https://ghuntley.com/ralph/)) — an autonomous agent loop that works through a backlog of small, machine-verifiable tasks — so the resulting fix/build/test work happens cheaply and mostly unattended.

**Constraints that shaped the design:**

1. **Collaborative, not autonomous.** The walkthrough is AI-_assisted_ — Playwright MCP gives the model eyes on the live site — but intent and status are _agreed between the user and the model together_, not inferred by an unsupervised agent swarm.
2. **Not a one-off.** The catalog must resist drift as features change later, and it must do so **without depending on AI to maintain** — otherwise every future change quietly re-opens the wallet.
3. **Repetitive work gets scripted.** Deterministic helper scripts do the mechanical parts (enumeration, seed-data lookups, running checks) so agent time — the model's, at inference cost — goes to judgment calls, not busywork.
4. **Filesystem-as-memory for execution.** The eventual Ralph loop's subagents each own a private, append-only note file, so progress survives the fresh-context restarts that are central to how Ralph works.

## Decisions (locked)

| Question            | Decision                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rollout             | **Full sweep** of all ~95 routes — no pilot area.                                                                                                                                                                                                                    |
| Walkthrough cadence | **Pre-draft, then agree.** The model pre-fills each catalog entry (route, existing tests, best-guess intent, obvious bugs) via Playwright MCP and product docs; the user and model then confirm/correct intent, status, and test gaps together.                      |
| Drift defense       | **A skill (SOP) + a no-AI staleness gate.** A `cataloging-features` skill documents how to walk a feature and update its entry; a deterministic git/CI check flags entries whose source files changed since they were last verified. Zero inference cost to enforce. |

## Why a Ralph loop, and what that implies for the PRD's shape

Research into the Ralph technique ([ghuntley.com/ralph](https://ghuntley.com/ralph/), [snarktank/ralph](https://github.com/snarktank/ralph), [ClaytonFarr/ralph-playbook](https://github.com/ClaytonFarr/ralph-playbook)) surfaced the principles that drive the PRD's structure:

- **The filesystem and git are the memory, not the conversation.** Each loop iteration starts with a fresh context window; state persists only through what's on disk and in git history.
- **One task per iteration, gated by machine-verifiable completion.** Tests are the gate — "extracts 5–10 dominant colors" is verifiable, "make the UI look good" is not and gets gamed.
- **Tasks must pass the "one sentence without _and_" size test.** Anything bigger blows the context window and produces poor code.
- **Guardrails are reactive and live in files** (the loop prompt, `AGENTS.md`), added after watching the agent make a specific mistake — e.g. "don't assume it's not implemented, search first."
- **Safety rails**: capped iterations (10–20, not unbounded), sandboxed execution, one commit per completed task, cheap rollback.

The implication: **the PRD cannot be one long prose document.** It has to be a current-state narrative _plus_ a backlog of small, independently test-gated stories with observable acceptance criteria. Conveniently, the catalog's per-feature findings (bugs, gaps, missing tests) map 1:1 onto that backlog — the walkthrough _produces_ the Ralph stories as a side effect, not as separate work.

## The shape — four phases

```
Phase 1  Foundations            → the spine, schema, scripts, drift gate
Phase 2  Collaborative walkthrough (full sweep) → the catalog
Phase 3  PRD synthesis + Ralph scaffolding       → the deliverable
Phase 4  Ralph execution (LATER, out of scope)   → the payoff
```

### Phase 1 — Foundations

**Route × role inventory (the spine).** A `route-inventory` script runs `find apps/web/src/app -name page.tsx`, normalizes to routes, flags dynamic `[segments]`, and tags each with its area (public / dashboard / builder / admin / system) and role gate. Output: `docs/audits/feature-catalog/_inventory.json`, fully regenerable, no AI involved. Reuses the enumeration convention already documented in the `auditing-mobile-responsiveness` skill.

**Catalog entry schema.** One markdown file per area under `docs/audits/feature-catalog/<area>.md`. Each feature entry carries: id, route(s), role(s), preconditions/seed data; agreed **intended use**; **status** (works / broken / partial); **findings** (functional bug / visual bug / UX-discoverability gap); **existing tests** plus an assessment of whether they actually assert core behavior (not just touch the line); **test gaps** by type (unit / integration / e2e); and **provenance** — source-file globs plus `last_verified_sha`, which is what the drift gate checks against.

**Deterministic helper scripts.** These are shared by the walkthrough _and_ by the later Ralph loop — the same "no AI needed for mechanical work" principle applies to both:

| Script               | Does                                                                                                                                         | Reuses                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `route-inventory`    | Enumerate + classify all routes                                                                                                              | `auditing-mobile-responsiveness`'s `find` convention   |
| `seed-slug-resolver` | Parses `packages/supabase/supabase/seeds/*.sql` for real slugs/usernames/ids so any agent can build a valid concrete URL for a dynamic route | seed data already in the repo                          |
| `tests-for`          | Given a source path, lists related tests (`__tests__`, `*.test.*`, `*.spec.*`, matching e2e specs)                                           | —                                                      |
| `dev-guard`          | Checks `:3000`, starts the dev server only if it's down, never starts a second one                                                           | `ui-verifier` agent's pattern, `reuseExistingServer`   |
| `checks`             | Scoped typecheck + lint + jest for a changed package/file set — the machine-verifiable gate Ralph stories complete against                   | existing turbo + per-package jest configs              |
| `catalog-staleness`  | Maps changed source files to catalog provenance, flags entries verified before the last relevant change — **no AI**                          | —                                                      |
| `shot`               | Isolated Playwright CLI screenshot for a URL+role, downscaled via `sips`, avoiding MCP's single-shared-browser contention                    | `tournament-runner`'s isolated-browser-context pattern |
| `story-status`       | Parses PRD backlog checkboxes/`passes` fields for remaining count + next story                                                               | —                                                      |

**Drift defense.** A new `cataloging-features` skill documents the SOP: how to walk a feature, agree on intent, fill an entry, and — critically — re-stamp provenance whenever a feature changes. Paired with a `catalog-staleness` check wired into a git pre-commit hook (lefthook) and CI, so a stale entry is flagged automatically. Pre-release, this defaults to warn-not-block.

### Phase 2 — Collaborative walkthrough (full sweep)

Per feature, in order (public → dashboard → builder → tournaments → communities → admin → system), across the seven seeded role-varied test users:

1. **Pre-draft.** Regenerate the inventory, resolve a concrete URL via `seed-slug-resolver`, run `dev-guard`, drive Playwright MCP as the correct role, and fill in the entry's mechanical parts — route, existing tests (via `tests-for`), a best-guess intent drawn from `product-vision` / `docs/marketing.md` / `design-system`, plus any obvious bugs and screenshots.
2. **Agree.** The user and model confirm or correct the intended use, catch what the pre-draft missed, and agree on status and on which tests (unit/integration/e2e) are missing.
3. **Stamp.** Record provenance globs and the current commit SHA; save the entry.

Some flows can't be exercised on local seed data — real Discord/Bluesky account linkage, `custom_access_token_hook`-gated features, sudo-mode admin tooling (the same set existing E2E tests already skip for the same reason). These get an entry marked `blocked: needs <X>` for the user to drive manually or to defer explicitly — never silently dropped from the catalog.

### Phase 3 — PRD synthesis + Ralph scaffolding

**The PRD itself:**

- `docs/prd/current-state.md` — the living narrative of what the site is and does, built from the completed catalog.
- `docs/prd/backlog/` — the decomposed Ralph-ready stories, one per catalog finding (bug / gap / add / change / remove). Each passes the one-sentence-no-_and_ size test, states observable acceptance criteria, names its required tests, and is checkbox/`passes`-tracked.

**Ralph's operating scaffolding** (designed now, populated once the PRD exists):

- Shared state, owned solely by the orchestrator agent: `IMPLEMENTATION_PLAN.md` (the backlog/plan), `progress.txt` (append-only learnings), `AGENTS.md` (build/test/lint commands — including the Phase 1 helper scripts — plus accumulated guardrails).
- A guardrail prompt (`docs/prd/RALPH.md`) carrying the standard Ralph guardrails ("don't assume it's not implemented — search first," commit-per-task, required tests must pass before a story is marked done).
- Safety: capped iterations (10–20), sandboxed execution, one commit per task, and a "regenerate the plan" escape hatch if the loop goes in circles.

**Predefined subagents with private note files.** Each is a `.claude/agents/ralph-*.md` with an explicit model, writing _only_ to its own append-only note file under `.ralph/notes/` — this is the filesystem-as-memory mechanism that lets a fresh instance resume correctly after a restart, and the one-writer-per-file rule avoids races between agents. It mirrors this repo's existing one-committer-per-branch and disjoint-file-allowlist conventions.

| Agent (model)                   | Note file         | Role                                                                                                                                                                       |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ralph-orchestrator` (opus)     | `orchestrator.md` | Picks the next unchecked story, dispatches work, commits per completed task, updates the shared plan/progress files. Sole writer of shared state.                          |
| `ralph-implementer` (sonnet)    | `implementer.md`  | Implements one story; reports changed files; never commits.                                                                                                                |
| `ralph-test-writer` (sonnet)    | `test-writer.md`  | Writes the tests that gate the story.                                                                                                                                      |
| `ralph-verifier` (haiku)        | `verifier.md`     | Runs `checks`, `dev-guard`, and targeted e2e; reports pass/fail; never fixes.                                                                                              |
| `ralph-catalog-updater` (haiku) | `catalog.md`      | Re-verifies the touched feature's catalog entry and re-stamps provenance once a story lands — this is what keeps the catalog from drifting _during_ Ralph's own execution. |
| `ui-verifier` (existing)        | —                 | Reused as-is for UI-story verification.                                                                                                                                    |

### Phase 4 — Ralph execution

Out of scope for this design. The PRD produced by Phase 3 is what the loop consumes; whether it runs locally (Docker) or in a remote sandbox (Fly Sprites, E2B) is a decision for when execution actually starts.

## Files this work will create

- **Scripts** — `scripts/` (`route-inventory`, `seed-slug-resolver`, `tests-for`, `dev-guard`, `checks`, `catalog-staleness`, `shot`, `story-status`). Exact location/runner to be confirmed against repo convention during Phase 1.
- **Skill** — `.claude/skills/cataloging-features/SKILL.md`.
- **Agents** — `.claude/agents/ralph-orchestrator.md`, `ralph-implementer.md`, `ralph-test-writer.md`, `ralph-verifier.md`, `ralph-catalog-updater.md`.
- **Catalog** — `docs/audits/feature-catalog/` (`_inventory.json` plus one markdown file per area).
- **PRD** — `docs/prd/current-state.md`, `docs/prd/backlog/`, `docs/prd/RALPH.md`.
- **Ralph runtime state** — `IMPLEMENTATION_PLAN.md`, `progress.txt`, `AGENTS.md`, `.ralph/notes/*`.
- **Drift wiring** — a lefthook pre-commit entry and a CI check, both invoking `catalog-staleness`.
- **Doc pointers** — additions to `CLAUDE.md` referencing the new skill, scripts, and Ralph agent roster.

## Reuse (nothing here is net-new infrastructure)

- URL enumeration and privileged-test-user pattern → `auditing-mobile-responsiveness` skill.
- Dev-server liveness check / `reuseExistingServer` → `ui-verifier` agent, `apps/web/playwright.config.ts`.
- Isolated parallel browser sessions → `apps/web/e2e/tournament-runner/`, `tournament-simulator.ts`.
- Seed data (roles, communities, tournaments, teams, standings) → `packages/supabase/supabase/seeds/`.
- Scoped verification → existing turbo pipeline and per-package jest configs.

## Verification

1. **Inventory** — `route-inventory` output covers every `page.tsx`; spot-checked count lands near 95 with no area missing.
2. **Drift gate** — touching a route's source file and running `catalog-staleness` flags its catalog entry as stale.
3. **Walkthrough** — every inventory route resolves to a catalog entry marked works / broken / partial / blocked, with MCP screenshots captured.
4. **PRD stories** — every backlog story has observable acceptance criteria and named required tests; `checks` is the green gate for "done."
5. **Ralph smoke test** — before trusting the loop with the real backlog, run it on one trivial story to confirm it reads the plan and notes correctly, implements, gates on tests, commits, and updates the relevant catalog entry.

## Open items for the build session

- Exact `scripts/` location and runner convention.
- Warn-vs-block posture for the staleness CI check (defaulting to warn, given the pre-release "no back-compat concern" posture in the root `CLAUDE.md`).
- Local vs. remote sandbox for Ralph execution — deferred to Phase 4.
