# trainers.gg - Agent Guidelines

All-in-one integrated platform for Pokemon fans. Current focus: competitive battling (VGC, Showdown, Pokemon Champions). Monorepo: Next.js 16 web, Expo 55 mobile, Supabase backend, Bluesky PDS integration.

Domain knowledge lives in on-demand skills. **Invoke the relevant skill before working in an area** — skills are auto-discovered (their descriptions are provided to you automatically), so this file lists names only.

## Workspace Skills

- **Build:** building-web-app, building-mobile-app, creating-components, creating-edge-functions, managing-edge-imports
- **Data & DB:** querying-supabase, deciding-data-access, reviewing-database, reviewing-caching, using-realtime, working-with-usage-data, building-charts, validating-input, using-utils
- **Pokémon & tournaments:** parsing-pokemon, implementing-tournaments, adding-a-regulation, applying-move-rebalances, reconciling-pkmn-overrides, syncing-calc-fork-upstream
- **Integrations & infra:** integrating-bluesky, managing-infrastructure, troubleshooting-local-env, tracking-analytics
- **Review & CI:** reviewing-pr, reviewing-pr-feedback, responding-to-review-comments, diagnosing-ci, auditing-code, auditing-mobile-responsiveness
- **Tests:** writing-tests, writing-e2e-tests
- **Mobile parity:** checking-mobile-parity
- **Design & product:** design-system, product-vision, competitive-landscape
- **Meta:** writing-skills, tracking-deferred-work
- **Slash-commands (invoked directly):** commit, create-migration, finish-branch, ticket

## Project Rules

Path-scoped rules in `.claude/rules/` auto-load via hooks (each file's `paths:` frontmatter declares its globs): code-style, react-patterns, mobile-responsiveness, architecture, nextjs-conventions, mobile-conventions, supabase-patterns, testing-philosophy, shadcn-ui-primitives, web-ui-catalog, web-hooks-and-helpers, supabase-migrations, usage-data-sources.

## Workspace Agents

Custom agents in `.claude/agents/` (model + purpose in each file's frontmatter): planner (opus), feature-implementer (sonnet), qa-engineer (sonnet), code-reviewer (sonnet), pre-push-checker (haiku), migration-reviewer (sonnet), security-reviewer (sonnet), edge-function-reviewer (sonnet), ci-monitor (haiku), background-checker (haiku), ui-verifier (sonnet), parity-checker (haiku).

## Auto-Delegation

The orchestrator's job is routing and review — not inline execution. Dispatch the listed agent **without being asked**:

| When the task is…                                               | Dispatch                 | Mode                         |
| --------------------------------------------------------------- | ------------------------ | ---------------------------- |
| Feature design, architecture, UI/UX, "how should we…"           | `planner`                | foreground                   |
| Implementing a planned feature or fix (non-trivial code change) | `feature-implementer`    | foreground                   |
| Writing or extending tests                                      | `qa-engineer`            | foreground                   |
| A diff exists and is about to be committed                      | `code-reviewer`          | foreground, before commit    |
| New file in `packages/supabase/supabase/migrations/`            | `migration-reviewer`     | foreground, before push      |
| Diff touches auth, RLS, `proxy.ts`, or session handling         | `security-reviewer`      | foreground, before push      |
| Diff touches `packages/supabase/supabase/functions/`            | `edge-function-reviewer` | foreground, before push      |
| Diff changed `apps/web/src/**/*.tsx` presentation/layout        | `ui-verifier`            | foreground, before push      |
| A `git push` landed on a branch with an open PR                 | `ci-monitor`             | **background — never block** |
| A `git push` landed (any branch)                                | `background-checker`     | **background — never block** |
| Creating a PR / parity hook fired on `apps/web/` changes        | `parity-checker`         | background                   |
| Local quality checks explicitly requested                       | `pre-push-checker`       | foreground                   |

- Multiple triggers can fire on one diff — run reviewers in parallel.
- `ci-monitor` is dispatched after **every** push, in the same turn, in the background. Do not poll CI inline.
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

| Layer              | Technology                     | Notes                                                  |
| ------------------ | ------------------------------ | ------------------------------------------------------ |
| Auth               | Supabase Auth                  | Email/password + OAuth (X, Discord, Twitch, Bluesky)   |
| Database           | Supabase (PostgreSQL)          | Row Level Security with `auth.uid()`                   |
| Edge Functions     | Supabase Edge Functions        | Deno runtime                                           |
| Social/Identity    | AT Protocol (Bluesky)          | Decentralized identity; social features deprioritized  |
| React Compiler     | React Compiler                 | Auto-memoization — do NOT use useMemo/useCallback/memo |
| Validation         | Zod via `@trainers/validators` | Shared schemas for forms, Server Actions, edge fns     |
| Client State (Web) | TanStack Query v5              | Cache, mutations, optimistic updates                   |
| Web                | Next.js 16                     | React 19.2, App Router, Server Components              |
| Mobile             | Expo 55                        | React Native 0.83 with Tamagui                         |
| UI (Web)           | shadcn/ui + Base UI            | Base UI primitives (NOT Radix), no `asChild`           |
| Styling (Web)      | Tailwind CSS 4                 | @tailwindcss/postcss                                   |
| Styling (Mobile)   | Tamagui                        | Theme tokens from @trainers/theme                      |

## Commands

Scripts live in `package.json` — run `pnpm run` for the current list. Notes on the non-obvious ones:

- `pnpm dev` — web + Supabase (auto-configures local Supabase)
- `SKIP_LOCAL_SUPABASE=1 pnpm dev` — use remote Supabase instead of local
- `pnpm db:*` — always run from the repo root
- `pnpm db:reset` — resets + reseeds the test users below
- `pnpm generate-types` — regenerate TS types after a schema change

**Test users** (after `pnpm db:reset`, password `Password123!`):

| Email                   | Username      | Role                             |
| ----------------------- | ------------- | -------------------------------- |
| `admin@trainers.local`  | admin_trainer | Site admin, VGC League org owner |
| `player@trainers.local` | ash_ketchum   | Player, Pallet Town org owner    |

- Dev server logs: `.dev-logs/dev.log` (symlink to latest run). MCP screenshots: `.playwright-mcp/screenshots/` (gitignored).
- Local-env gotchas (`@smogon/calc` submodule, `pnpm-workspace.yaml` config, `pnpm supabase` CWD, unbounded `.in()` chunking) → `troubleshooting-local-env` skill.

## Critical Rules

### Push Policy

You do NOT need to run lint, typecheck, tests, or E2E locally before committing or pushing — CI runs all of them. Offload these checks to CI rather than blocking on a local run.

- Implementing subagents never run lint/typecheck/tests inline, and never commit or push — they report changed files plus a suggested commit message.
- The orchestrator commits and pushes freely and frequently (commit between logical chunks; commit messages carry the _why_, not just the _what_).
- In the same turn as every push, dispatch BOTH in the background: `background-checker` (scoped typecheck/lint on changed packages) and `ci-monitor` (watches CI). Never block on them.
- After every push, enumerate each CI check by name (Lint, Typecheck, Tests, E2E) with pass/fail/pending — "CI looks good" is not evidence. Fix failures in follow-up commits; never leave red CI. Detail → `diagnosing-ci`.

### Parallel Work & Unexpected Changes

Multiple agents and humans work on this codebase simultaneously. If you encounter code or files you did not create or modify, treat them as intentional. **Never delete, revert, overwrite, or undo changes you did not make.** If they conflict with your work, stop and ask.

### Error Visibility

**Never suppress errors with `2>/dev/null`, `|| true`, or `|| exit 0`.** Guard against expected empty inputs (e.g. `[ -n "$VAR" ]` before use), but never hide real errors. **Never merge stderr into stdout with `2>&1`** — keep the streams separate.

### React Compiler

**Do NOT write `useMemo`, `useCallback`, or `React.memo`** — React Compiler handles memoization automatically across all packages. Manual memoization conflicts with compiler optimizations.

### Scope Discipline

**Only modify files explicitly in scope for the current task.** Do NOT run `pnpm format`, `pnpm lint --fix`, or repo-wide formatters unless explicitly asked. When dispatching subagents, pass an explicit file allowlist. Revert unrelated changes you introduced before committing (never touch changes made by others — see Parallel Work & Unexpected Changes).

### Destructive Actions

**"Clean up", "reorganize", "fix up", "sort out" are ambiguous — never default to delete.** When a request could mean move/merge/archive/rename, confirm the intended semantics before any bulk-delete (`rm -rf`, mass `DELETE`, dropping tables, wiping directories). Default to the least-destructive interpretation; present destructive options via `AskUserQuestion` with a non-destructive first option.

### Completion Claims

**No "deferred"/"follow-up"/"for future" buckets** — address every review/audit finding in the current session unless the user explicitly says to defer. **Never declare a PR "ready to merge"** before every review thread is resolved and CI is green (enumerate each check by name). PR-feedback work uses the `reviewing-pr-feedback` skill.

### Database & Edge Functions

- **Never apply migrations via MCP tools or the dashboard.** All schema changes via migration files; never edit or rename a committed migration file. See `create-migration`.
- **Never deploy edge functions manually** — they deploy automatically during the Vercel build. See `creating-edge-functions`.

### Data Access

Split model — no open anon Data API. S-bucket client reads go through cached `/api/v1` routes (`createServiceRoleClient()` + column allowlist + `resolveApiAuth()` + `enforceRateLimit()`); authenticated reads go direct via the browser Supabase client + RLS; SSR pages query the DB server-side. See `deciding-data-access` for routing and client selection.

### Styling

Use Tailwind utility classes, not CSS module files; never use arbitrary pixel values (`w-[Npx]`, `min-w-[Npx]`, etc.) — use the built-in spacing/sizing scale. Full rules in the `code-style` rule (auto-loads on `**/*.{ts,tsx}`).

### Subagent Model Selection

Pass `model` explicitly on every dispatch: **haiku** for mechanical work (status checks, log/grep reading, measure-and-report, parity checks), **sonnet** for implementation/review/test-writing, **opus / main agent** for orchestration, design, and final review only — never inline execution. Full matrix in `writing-skills`.

## Development Workflow

- **Subagent-driven development** for plan execution — not inline, unless explicitly asked (`superpowers:subagent-driven-development`).
- **Parallel waves**: plans end with a dependency/parallelism map. Dispatch all tasks in a wave in one message (multiple Agent calls), each with a disjoint file allowlist. Sequence only true dependencies.
- The orchestrator commits between waves; subagents never commit/push (one committer avoids git races). See `superpowers:dispatching-parallel-agents`.

## Design Principles

- **Personality:** Clean, Playful, Community-driven — data-rich and precise where it matters, but warm and friendly, never cold or intimidating.
- **Anti-reference:** NOT an esports/gamer aesthetic — no dark aggressive UI, no neon accents, no angular/militaristic styling.
- **Audience:** All ages, mixed tech comfort, equal desktop/mobile priority.
- Teal primary (OKLCH tokens from `@trainers/theme`): single accent across all interactive elements.
- Minimal flat design: no borders, subtle background differentiation, consistent spacing.
- `StatusBadge` for semantic status (emerald=active, blue=upcoming, amber=draft, gray=completed, red=cancelled).
- WCAG AA minimum. See `design-system` and `creating-components` for detail.

## Product Vision

Community-first, not an esports site. See `product-vision` and `competitive-landscape` for vision, roadmap, differentiators, and positioning.

## Project Management

Linear for issue tracking (MCP server available). **Team:** `trainers-gg`. **Default project:** `Private Beta MVP`.

## Glossary

| Term                 | Definition                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| **Alt**              | Player identity linked to a user. Users can have multiple alts. Stored in `alts`. |
| **Staff**            | Community personnel who run events — NOT tournament participants.                 |
| **Community Leader** | Staff role with create/manage permissions for tournaments and events.             |
| **DID**              | Decentralized Identifier — AT Protocol identity (`did:plc:abc123`).               |
| **PDS**              | Personal Data Server — self-hosted Bluesky at `pds.trainers.gg`.                  |
| **Handle**           | Human-readable Bluesky identity (`@username.trainers.gg`).                        |
| **Team Sheet**       | Player's Pokemon team for a tournament. Parsed via `@trainers/validators`.        |
| **RLS**              | Row Level Security — PostgreSQL access control via `auth.uid()`.                  |
| **Protected Route**  | Route requiring auth regardless of maintenance mode. Enforced in `proxy.ts`.      |
