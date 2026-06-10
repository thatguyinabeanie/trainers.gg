# trainers.gg - Agent Guidelines

All-in-one integrated platform for Pokemon fans. Current focus: competitive battling (VGC, Showdown, Pokemon Champions). Monorepo: Next.js 16 web, Expo 55 mobile, Supabase backend, Bluesky PDS integration.

## Workspace Skills

Domain-specific guidance lives in `.claude/skills/`. Invoke the relevant skill before working in an area.

| Skill                            | When to Use                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `building-web-app`               | Web routes, components, Server Actions, data fetching, proxy.ts              |
| `building-mobile-app`            | Mobile screens, Tamagui UI, Expo Router, SecureStore                         |
| `querying-supabase`              | DB queries/mutations, client selection, Edge Functions                       |
| `using-realtime`                 | Supabase Realtime — presence, broadcast, postgres_changes subscriptions      |
| `validating-input`               | Zod schemas, Server Action return types, profanity filter                    |
| `creating-components`            | UI components, design tokens, design principles                              |
| `checking-mobile-parity`         | After developing web features, check for mobile parity tickets               |
| `implementing-tournaments`       | Swiss pairings, standings, brackets, adapters                                |
| `parsing-pokemon`                | Team parsing, legality validation, type effectiveness                        |
| `using-utils`                    | `getLabel()`, `getErrorMessage()`, permissions, formatting                   |
| `working-with-usage-data`        | team_slots, usage RPCs, per-source tournament data, /data page               |
| `building-charts`                | recharts charts, d3-sankey flows, usage-over-time lines (/data, dashboards)  |
| `tracking-analytics`             | PostHog event constants, adding new events                                   |
| `integrating-bluesky`            | Bluesky/AT Protocol, DID resolution, public agent                            |
| `writing-tests`                  | Fishery factories, Supabase/AT Protocol mocks, Jest config                   |
| `writing-e2e-tests`              | Playwright E2E — fixtures, auth setup, tournament-runner in apps/web/e2e/    |
| `managing-infrastructure`        | PDS on Fly.io, ngrok tunnel for local dev                                    |
| `troubleshooting-local-env`      | Local dev breakage — Supabase, stale types, env symlinks, calc submodule     |
| `creating-edge-functions`        | Creating/updating Supabase edge functions                                    |
| `managing-edge-imports`          | Deno import maps, `deno.json` management                                     |
| `auditing-code`                  | Codebase audits for type safety, architecture, maintainability               |
| `auditing-mobile-responsiveness` | Mobile-viewport audit — overflow probes, tap targets, table→cards punch list |
| `writing-skills`                 | Creating/editing skills, agents, maintaining the architecture                |
| `design-system`                  | Elevation, typography hierarchy, transitions, layout conventions             |
| `product-vision`                 | Product vision, feature roadmap, differentiators, user types                 |
| `competitive-landscape`          | Competitive landscape, positioning, alternatives by category                 |
| `reviewing-pr`                   | PR review orchestrator: dispatches domain-specific checks                    |
| `reviewing-database`             | RLS, migrations, indexes, N+1, unbounded fetches, query perf                 |
| `reviewing-caching`              | Next.js `'use cache'` (Cache Components), TanStack Query, cache invalidation |
| `reviewing-pr-feedback`          | Fetch/group/resolve PR comments with user, no deferrals, re-review loop      |
| `diagnosing-ci`                  | A CI check failed — map check→workflow, fetch logs, flake vs real failure    |

Slash-command skills (invoked directly, not listed above): `commit`, `create-migration`, `finish-branch`, `ticket`.

## Project Rules

Path-scoped rules in `.claude/rules/` load automatically when working with matching files.

| Rule                       | Applies To                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `code-style.md`            | All TypeScript/TSX files (`**/*.{ts,tsx}`)                                                                                                                                                                                                                                                             |
| `react-patterns.md`        | All TSX files (`**/*.tsx`)                                                                                                                                                                                                                                                                             |
| `mobile-responsiveness.md` | Web app TSX files (`apps/web/src/**/*.tsx`)                                                                                                                                                                                                                                                            |
| `architecture.md`          | All shared packages (`packages/**/*`)                                                                                                                                                                                                                                                                  |
| `nextjs-conventions.md`    | Web app files (`apps/web/**/*`)                                                                                                                                                                                                                                                                        |
| `mobile-conventions.md`    | Mobile app files (`apps/mobile/**/*`)                                                                                                                                                                                                                                                                  |
| `supabase-patterns.md`     | Supabase client code (`packages/supabase/**/*`, `supabase/**/*`)                                                                                                                                                                                                                                       |
| `testing-philosophy.md`    | All test files (`**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/e2e/**`)                                                                                                                                                                                                                          |
| `shadcn-ui-primitives.md`  | shadcn/ui component files (`apps/web/src/components/ui/**`)                                                                                                                                                                                                                                            |
| `web-ui-catalog.md`        | All web app TS/TSX files (`apps/web/src/**/*.{ts,tsx}`)                                                                                                                                                                                                                                                |
| `web-hooks-and-helpers.md` | All web app TS/TSX files (`apps/web/src/**/*.{ts,tsx}`)                                                                                                                                                                                                                                                |
| `supabase-migrations.md`   | All migration files (`packages/supabase/supabase/migrations/**`)                                                                                                                                                                                                                                       |
| `usage-data-sources.md`    | data-sources package, supabase usage queries/mutations, /data components (`packages/data-sources/**`, `packages/supabase/src/usage/**`, `packages/supabase/src/queries/usage.ts`, `packages/supabase/src/mutations/team-slots.ts`, `apps/web/src/components/data/**`, `apps/web/src/actions/usage.ts`) |

## Workspace Agents

Custom agents in `.claude/agents/`. Invoke for isolated, focused work.

| Agent                    | Model  | Purpose                                                     |
| ------------------------ | ------ | ----------------------------------------------------------- |
| `planner`                | opus   | Brainstorming, design, architecture, planning               |
| `feature-implementer`    | sonnet | Implement features with domain skill patterns               |
| `qa-engineer`            | sonnet | Write tests — aim 80%+ coverage                             |
| `code-reviewer`          | sonnet | Review changes for style, architecture, correctness         |
| `pre-push-checker`       | haiku  | Run lint/typecheck/test/format, report pass/fail            |
| `migration-reviewer`     | sonnet | Review SQL migrations for correctness, RLS, safety          |
| `security-reviewer`      | sonnet | Security review: RLS, auth, route protection                |
| `edge-function-reviewer` | sonnet | Review edge functions for CORS, auth, validation            |
| `ci-monitor`             | haiku  | Watch CI after a push (background), report per-check status |
| `ui-verifier`            | sonnet | Playwright visual + design-system check before "done"       |
| `parity-checker`         | haiku  | Check Linear for mobile-parity tickets on web changes       |

## Auto-Delegation

The orchestrator's job is routing and review — not inline execution. For each task type below, dispatch the listed agent **without being asked**. Inline execution is the exception and needs an explicit user request.

| When the task is…                                                   | Dispatch                 | Mode                         |
| ------------------------------------------------------------------- | ------------------------ | ---------------------------- |
| Feature design, architecture, UI/UX exploration, "how should we…"   | `planner`                | foreground                   |
| Implementing a planned feature or fix (any non-trivial code change) | `feature-implementer`    | foreground                   |
| Writing or extending tests (unit, integration, e2e)                 | `qa-engineer`            | foreground                   |
| A diff exists and is about to be committed                          | `code-reviewer`          | foreground, before commit    |
| A new file landed in `packages/supabase/supabase/migrations/`       | `migration-reviewer`     | foreground, before push      |
| Diff touches auth, RLS policies, `proxy.ts`, or session handling    | `security-reviewer`      | foreground, before push      |
| Diff touches `packages/supabase/supabase/functions/`                | `edge-function-reviewer` | foreground, before push      |
| Diff changed `apps/web/src/**/*.tsx` presentation/layout            | `ui-verifier`            | foreground, before push      |
| A `git push` just landed on a branch with an open PR                | `ci-monitor`             | **background — never block** |
| Creating a PR / the parity hook fired on `apps/web/` changes        | `parity-checker`         | background                   |
| Local quality checks explicitly requested                           | `pre-push-checker`       | foreground                   |

Rules:

- Multiple triggers can fire on one diff (a migration + web UI dispatches `migration-reviewer` AND `ui-verifier`) — run reviewers in parallel.
- `ci-monitor` is dispatched after **every** push, in the background, in the same turn as the push. Do not poll CI inline.
- Reviewer findings are fixed in the current session (no deferrals), then the relevant reviewer re-runs.

## Monorepo Structure

```
apps/
  web/          # Next.js 16 (React 19.2) - @trainers/web
  mobile/       # Expo 55 (React Native 0.83) - @trainers/mobile

packages/
  pokemon/      # Pokemon data, validation, parsing
  posthog/      # Shared PostHog event name constants
  tournaments/  # Tournament logic (pairings, standings, brackets)
  utils/        # Shared utilities (formatting, countries, tiers)
  supabase/     # Supabase client, queries, edge functions
  atproto/      # AT Protocol / Bluesky utilities
  theme/        # Shared OKLCH color tokens
  validators/   # Zod schemas + team parsing
  data-sources/ # External tournament data sources (RK9, Limitless)

tooling/        # eslint, prettier, tailwind, typescript, test-utils configs
infra/
  pds/          # Bluesky PDS on Fly.io
  ngrok/        # Local dev tunnel
```

## Tech Stack

| Layer              | Technology                     | Notes                                                                |
| ------------------ | ------------------------------ | -------------------------------------------------------------------- |
| Auth               | Supabase Auth                  | Email/password + OAuth (X, Discord, Twitch, Bluesky)                 |
| Database           | Supabase (PostgreSQL)          | Row Level Security with auth.uid()                                   |
| Edge Functions     | Supabase Edge Functions        | Deno runtime                                                         |
| Social/Identity    | AT Protocol (Bluesky)          | Decentralized identity (handles, PDS); social features deprioritized |
| React Compiler     | React Compiler                 | Auto-memoization — do NOT manually use useMemo/useCallback/memo      |
| Validation         | Zod via `@trainers/validators` | Shared schemas for forms, Server Actions, edge functions             |
| Client State (Web) | TanStack Query v5              | Cache, mutations, optimistic updates                                 |
| Web                | Next.js 16                     | React 19.2, App Router, Server Components                            |
| Mobile             | Expo 55                        | React Native 0.83 with Tamagui                                       |
| UI (Web)           | shadcn/ui + Base UI            | Base UI primitives (NOT Radix), no `asChild`                         |
| Styling (Web)      | Tailwind CSS 4                 | @tailwindcss/postcss                                                 |
| Styling (Mobile)   | Tamagui                        | Theme tokens from @trainers/theme                                    |

## Commands

### Quick Reference

```bash
# Development
pnpm dev                              # Start web + Supabase (auto-configures local Supabase)
pnpm dev:all                          # Start all apps (web + mobile + Supabase)
pnpm dev:web                          # Web only
pnpm dev:mobile                       # Mobile only
pnpm dev:backend                      # Supabase only
SKIP_LOCAL_SUPABASE=1 pnpm dev        # Use remote Supabase instead of local

# Database (always from repo root)
pnpm db:start                         # Start local Supabase
pnpm db:stop                          # Stop local Supabase
pnpm db:reset                         # Reset DB + replay migrations + seed
pnpm db:migrate                       # Apply pending migrations
pnpm db:diff                          # Generate migration from schema changes
pnpm db:seed                          # Run seed files
pnpm generate-types                   # Regenerate TypeScript types from schema

# Testing
pnpm test                             # Run all tests (Turbo-cached)
pnpm test:watch                       # Watch mode
pnpm test:e2e                         # Playwright E2E tests (web)

# Quality
pnpm lint                             # ESLint across all packages
pnpm typecheck                        # TypeScript type checking
pnpm format                           # Prettier auto-fix
pnpm format:check                     # Check formatting without fixing

# Build
pnpm build                            # Build all packages
pnpm build:web                        # Build web app
pnpm build:mobile                     # Export mobile app

# Theme
pnpm --filter @trainers/theme build         # Generate design tokens

# Edge Functions
pnpm functions:serve                  # Serve edge functions locally
```

### Test Users (Local Development)

After `pnpm db:reset`, these test users are available (password: `Password123!`):

| Email                   | Username      | Role                             |
| ----------------------- | ------------- | -------------------------------- |
| `admin@trainers.local`  | admin_trainer | Site admin, VGC League org owner |
| `player@trainers.local` | ash_ketchum   | Player, Pallet Town org owner    |

### Playwright Screenshots

Store all Playwright MCP screenshots in `.playwright-mcp/screenshots/`. This directory is gitignored.

### Dev Server Logs

Dev server logs (Next.js + Supabase edge functions) are written to `.dev-logs/` when `pnpm dev` or `pnpm dev:web` starts. Each run creates a timestamped file (e.g. `dev-20260606-143022.log`); `.dev-logs/dev.log` is a symlink to the latest.

- `tail -200 .dev-logs/dev.log` — recent output
- `grep -a "error\|Error\|failed" .dev-logs/dev.log` — find issues

The file contains ANSI color codes; grep still works fine.

### Gotchas

- **Always run `pnpm supabase` from `packages/supabase`** — never from the repo root. The Supabase CLI writes its linked-project cache to a `supabase/.temp/` subdirectory in the current working directory; running from root pollutes the repo root with an untracked `supabase/.temp/linked-project.json`. The package-level path is already gitignored at `packages/supabase/supabase/.temp/`.
- `pnpm dev` always reconfigures `.env.local` for local Supabase — set `SKIP_LOCAL_SUPABASE=1` to use remote instead
- All env vars live in root `.env.local`, symlinked into apps/packages via `postinstall.sh`
- When adding build-time env vars, declare them in `turbo.json` under the task's `env` array (cache invalidation)
- **`@smogon/calc` is a git submodule — do NOT re-pin it to a git tarball** — `apps/web` depends on `@smogon/calc` via `file:../../vendor/damage-calc/calc`, a git submodule of the fork `thatguyinabeanie/damage-calc` (`vendor/damage-calc`, pinned to a commit that **commits the built `calc/dist/`**). Never change it back to `github:thatguyinabeanie/damage-calc#<sha>&path:/calc`. That git-tarball form **cannot be resolved by pnpm 11 under `--frozen-lockfile`** in CI/Vercel: it lands with no `dist/` (`Cannot find module '@smogon/calc'`) or as the fork's private monorepo root (`undefined@0.0.0` store mismatch). It only works in non-frozen local installs that build it, which masks the failure. The submodule + `file:` makes pnpm **symlink** the committed `dist/` deterministically. Requirements: all GitHub Actions `actions/checkout` steps use `submodules: recursive`; keep the Vercel project's "Git submodules" setting enabled; a root `preinstall` runs `git submodule update --init --recursive`; `@smogon/calc` is **absent** from `allowBuilds` in `pnpm-workspace.yaml`. To update calc: bump the submodule pointer (keep `dist/` committed in the fork).
- **pnpm config lives in `pnpm-workspace.yaml`, not `package.json`** — pnpm 11 **does not read** the `pnpm` field in `package.json` (prints `[WARN]` and silently ignores `overrides`, `packageExtensions`, `onlyBuiltDependencies`, `ignoredBuiltDependencies`). Never add a `pnpm` field back to `package.json`. Put `overrides:`, `packageExtensions:`, and `allowBuilds:` directly in `pnpm-workspace.yaml`.
- **Chunk unbounded Supabase `.in()` filters** — A `.in("col", ids)` with hundreds of ids builds a PostgREST URL that overflows the server URI limit and returns `{ error: "URI too long" }`. If that error is ignored, `data` is null and downstream logic silently drops every row. Use `fetchInChunks()` in `packages/supabase/src/queries/players.ts` as the reference: split into ≤100-id chunks, merge, and **throw** on chunk error. Always `.error`-check `.in()` queries that fan out over an unbounded id list. **The bug only reproduces at scale** — a few-row seed hides it.

## Critical Rules

### Push Policy

**You do NOT need to run lint, typecheck, tests, or E2E locally before committing or pushing.** CI runs all of them — offload these checks to CI rather than blocking the commit/push on a local run. Running them locally is optional (fine for fast iteration on a focused change), never required.

**After every push, check CI.** Once the push lands, monitor the CI run and enumerate each check by name with its status:

1. `pnpm lint` — ESLint across all packages
2. `pnpm typecheck` — TypeScript type checking
3. `pnpm test` — Full unit test suite
4. `pnpm test:e2e` — Playwright E2E tests

Use `gh pr checks <branch>` (or the Actions UI). If any CI check fails, fix the issue and push again — don't leave a red CI unaddressed. See "Completion Claims" below for enumerating checks before declaring CI green.

### Parallel Work & Unexpected Changes

Multiple agents and humans may work on this codebase simultaneously. If you encounter code changes, new files, or modified files that you did not make — they were either made manually by the developer or by another parallel agent. **Never delete, revert, overwrite, or undo changes you did not make.** Treat unfamiliar changes as intentional. If they conflict with your work, stop and ask rather than discarding them.

### Error Visibility

**Never suppress errors with `2>/dev/null`, `|| true`, or `|| exit 0`.** If a command can fail, the failure must be visible. Guard against expected empty inputs (e.g., check `[ -n "$VAR" ]` before using it), but never hide real errors. Silent failures waste hours of debugging.

**Never merge stderr into stdout with `2>&1`.** Keep stdout and stderr as separate streams. Merging them makes it impossible to distinguish errors from normal output when inspecting subagent processes.

### Styling: Tailwind Over CSS Modules

**Always use Tailwind CSS utility classes instead of writing or editing CSS module files.** Do not add new rules to `.module.css` files — express all styling via Tailwind classes in the component JSX. Existing CSS module rules may remain for legacy reasons, but new work should never introduce more. If a design requires something Tailwind cannot express (e.g., complex selectors, animations with multiple keyframes), use inline `style` props or a `<style>` tag scoped to the component before reaching for a CSS module.

**Never use arbitrary pixel values** (`w-[Npx]`, `min-w-[Npx]`, `max-w-[Npx]`, `h-[Npx]`, etc.) — new or pre-existing. Use Tailwind's built-in spacing/sizing scale (`w-96` = 384px, `w-80` = 320px, `max-w-lg`, etc.). Remove any `[Npx]` values encountered while working in a file.

### React Compiler

**Do NOT write `useMemo`, `useCallback`, or `React.memo`** — React Compiler handles memoization across all packages automatically. Manual memoization conflicts with compiler optimizations.

### Database Migrations

**Never apply migrations via MCP tools or the Supabase dashboard.** All schema changes via migration files. Never edit or rename a committed migration file. See `create-migration` skill for full conventions.

### Edge Function Deployments

**Never deploy edge functions manually.** They deploy automatically during the Vercel build. Never declare in `config.toml`. See `creating-edge-functions` skill for details.

### Scope Discipline

**Only modify files explicitly in scope for the current task.** Do NOT run `pnpm format`, `pnpm lint --fix`, or other repo-wide formatters unless explicitly asked. When dispatching subagents, pass an explicit file allowlist and forbid edits outside it. If unrelated changes sneak in, revert them before committing.

### Destructive Actions

**Words like "clean up", "reorganize", "fix up", or "sort out" are ambiguous — never default to delete.** When the request could mean move/merge/archive/rename, confirm the user's intended semantics before running any bulk-delete (rm -rf, mass DELETE in a loop, dropping tables, wiping directories). Default to the least destructive interpretation and present destructive options via `AskUserQuestion` with a non-destructive first option.

### Completion Claims

**Never declare a PR "ready to merge" before every review thread is resolved and CI is green.** For PR-feedback work, use the `reviewing-pr-feedback` skill — it enforces fetch-all-comments → group → fix → reply → resolve → re-review before completion.

**No "deferred" / "follow-up" / "for future" buckets.** When reviewing PRs, databases, caching, or code, address every finding in the current session. Only label something as deferred if the user explicitly tells you to. Review skills (`reviewing-pr-feedback`, `reviewing-pr`, `reviewing-database`, `reviewing-caching`) all share this rule — see the "No Deferrals" section in each.

**Enumerate every CI check by name with pass/fail/pending before declaring CI green.** "CI is running" or "CI looks good" is not evidence — list each check (Lint, Typecheck, Tests, codecov/patch, E2E, preview deploys) and its current status. See Phase 1 of `reviewing-pr-feedback` and the report format in the `pre-push-checker` agent.

## Product Vision

Community-first, not an esports site. See `product-vision` and `competitive-landscape` skills for vision, roadmap, differentiators, and positioning.

## Design Principles

- **Personality:** Clean, Playful, Community-driven — data-rich and precise where it matters, but warm, friendly, and never cold or intimidating
- **Anti-reference:** NOT an esports/gaming site — no dark aggressive "gamer" aesthetic, no neon accents, no angular/militaristic UI
- **Audience:** All ages, mixed tech comfort, equal desktop/mobile priority
- Teal primary (OKLCH tokens from `@trainers/theme`): single accent across all interactive elements
- Minimal flat design: no borders, subtle background differentiation, consistent spacing
- `StatusBadge` for semantic status colors (emerald=active, blue=upcoming, amber=draft, gray=completed, red=cancelled)
- WCAG AA minimum accessibility

## Development Workflow

When executing implementation plans, always use **subagent-driven development** (`superpowers:subagent-driven-development`). Do not use inline execution unless explicitly asked.

## Project Management

Linear for issue tracking (MCP server available). **Team**: `trainers-gg`. **Default Project**: `Private Beta MVP`.

## Glossary

| Term                 | Definition                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| **Alt**              | Player identity linked to a user. Users can have multiple alts. Stored in `alts`. |
| **Staff**            | Community personnel who run events — NOT tournament participants.                 |
| **Community Leader** | Staff role with create/manage permissions for tournaments and events.             |
| **DID**              | Decentralized Identifier — AT Protocol identity (`did:plc:abc123`).               |
| **PDS**              | Personal Data Server — self-hosted Bluesky at `pds.trainers.gg`.                  |
| **Handle**           | Human-readable Bluesky identity (`@username.trainers.gg`).                        |
| **RLS**              | Row Level Security — PostgreSQL access control via `auth.uid()`.                  |
| **Team Sheet**       | Player's Pokemon team for a tournament. Parsed via `@trainers/validators`.        |
| **Protected Route**  | Route requiring auth regardless of maintenance mode. Enforced in `proxy.ts`.      |
