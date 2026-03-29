# trainers.gg - Agent Guidelines

Pokemon community platform for competitive players. Monorepo: Next.js 16 web, Expo 54 mobile, Supabase backend, Bluesky PDS integration.

## Workspace Skills

Domain-specific guidance lives in `.claude/skills/`. Invoke the relevant skill before working in an area.

| Skill                    | When to Use                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| `building-web-app`       | Web routes, components, Server Actions, data fetching, proxy.ts      |
| `building-mobile-app`    | Mobile screens, Tamagui UI, Expo Router, SecureStore                 |
| `supabase-queries`       | DB queries/mutations, client selection, Edge Functions                |
| `validating-input`       | Zod schemas, Server Action return types, profanity filter            |
| `creating-components`    | UI components, design tokens, design principles                      |
| `mobile-parity`          | After developing web features, check for mobile parity tickets       |
| `tournament-logic`       | Swiss pairings, standings, brackets, adapters                        |
| `pokemon-parsing`        | Team parsing, legality validation, type effectiveness                |
| `shared-utils`           | `getLabel()`, `getErrorMessage()`, permissions, formatting           |
| `posthog-analytics`      | PostHog event constants, adding new events                           |
| `atproto-bluesky`        | Bluesky/AT Protocol, DID resolution, public agent                    |
| `writing-tests`          | Fishery factories, Supabase/AT Protocol mocks, Jest config           |
| `code-style`             | TypeScript rules, naming conventions, Prettier, error handling       |
| `architecture-principles`| Shared package vs app code, code reuse rules                         |
| `infrastructure`         | PDS on Fly.io, ngrok tunnel for local dev                            |
| `edge-function`          | Creating/updating Supabase edge functions                            |
| `edge-function-imports`  | Deno import maps, `deno.json` management                             |
| `code-audit`             | Codebase audits for type safety, architecture, maintainability       |
| `writing-skills`         | Creating/editing skills, agents, maintaining the architecture        |

Slash-command skills (invoked directly, not listed above): `commit`, `create-migration`, `finish-branch`, `post-pr-monitoring`, `ticket`.

## Workspace Agents

Custom agents in `.claude/agents/`. Invoke for isolated, focused work.

| Agent                    | Model  | Purpose                                                   |
| ------------------------ | ------ | --------------------------------------------------------- |
| `qa-engineer`            | sonnet | Write/review tests with fresh context                     |
| `pre-push-checker`       | haiku  | Run lint/typecheck/test/format, report pass/fail          |
| `code-reviewer`          | sonnet | Review changes for style, architecture, correctness       |
| `feature-implementer`    | sonnet | Implement features following domain skill patterns        |
| `edge-function-reviewer` | —      | Review edge functions for CORS, auth, validation          |
| `migration-reviewer`     | —      | Review SQL migrations for correctness, RLS, safety        |
| `security-reviewer`      | —      | Security-focused review: RLS, auth, route protection      |

## Monorepo Structure

```
apps/
  web/          # Next.js 16 (React 19) - @trainers/web
  mobile/       # Expo 54 (React 19) - @trainers/mobile

packages/
  pokemon/      # Pokemon data, validation, parsing
  posthog/      # Shared PostHog event name constants
  tournaments/  # Tournament logic (pairings, standings, brackets)
  utils/        # Shared utilities (formatting, countries, tiers)
  supabase/     # Supabase client, queries, edge functions
  atproto/      # AT Protocol / Bluesky utilities
  theme/        # Shared OKLCH color tokens
  validators/   # Zod schemas + team parsing

tooling/        # eslint, prettier, tailwind, typescript, test-utils configs
infra/
  pds/          # Bluesky PDS on Fly.io
  ngrok/        # Local dev tunnel
```

## Tech Stack

| Layer              | Technology                     | Notes                                                           |
| ------------------ | ------------------------------ | --------------------------------------------------------------- |
| Auth               | Supabase Auth                  | Email/password + OAuth (X, Discord, Twitch, Bluesky)            |
| Database           | Supabase (PostgreSQL)          | Row Level Security with auth.uid()                              |
| Edge Functions     | Supabase Edge Functions        | Deno runtime                                                    |
| Social/Identity    | AT Protocol (Bluesky)          | Decentralized identity and federation                           |
| React Compiler     | React Compiler                 | Auto-memoization — do NOT manually use useMemo/useCallback/memo |
| Validation         | Zod via `@trainers/validators` | Shared schemas for forms, Server Actions, edge functions        |
| Client State (Web) | TanStack Query v5              | Cache, mutations, optimistic updates                            |
| Web                | Next.js 16                     | React 19, App Router, Server Components                         |
| Mobile             | Expo 54                        | React Native with Tamagui                                       |
| UI (Web)           | shadcn/ui + Base UI            | Base UI primitives (NOT Radix), no `asChild`                    |
| Styling (Web)      | Tailwind CSS 4                 | @tailwindcss/postcss                                            |
| Styling (Mobile)   | Tamagui                        | Theme tokens from @trainers/theme                               |

## Commands

### Quick Reference

```bash
# Development
pnpm dev                              # Start all apps (auto-configures local Supabase)
pnpm dev:web                          # Web only
pnpm dev:mobile                       # Mobile only
pnpm dev:backend                      # Supabase only
pnpm dev:web+backend                  # Web + Supabase
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

### Gotchas

- **Always use `pnpm supabase`** from repo root — never `cd packages/supabase && supabase`
- `pnpm dev` always reconfigures `.env.local` for local Supabase — set `SKIP_LOCAL_SUPABASE=1` to use remote instead
- All env vars live in root `.env.local`, symlinked into apps/packages via `postinstall.sh`
- When adding build-time env vars, declare them in `turbo.json` under the task's `env` array (cache invalidation)

## Critical Rules

### Push Policy

**You may commit frequently, but you may NOT push until all checks pass locally.** Before every push, run and confirm all pass:

1. `pnpm lint` — ESLint across all packages
2. `pnpm typecheck` — TypeScript type checking
3. `pnpm test` — Full unit test suite
4. `pnpm test:e2e` — Playwright E2E tests
5. `pnpm format:check` — Prettier formatting

If any check fails, fix the issue and re-run before pushing. Never push with known failures.

### Parallel Work & Unexpected Changes

Multiple agents and humans may work on this codebase simultaneously. If you encounter code changes, new files, or modified files that you did not make — they were either made manually by the developer or by another parallel agent. **Never delete, revert, overwrite, or undo changes you did not make.** Treat unfamiliar changes as intentional. If they conflict with your work, stop and ask rather than discarding them.

### React Compiler

**Do NOT write `useMemo`, `useCallback`, or `React.memo`** — React Compiler handles memoization across all packages automatically. Manual memoization conflicts with compiler optimizations.

### Database Migrations

**Never apply migrations via MCP tools or the Supabase dashboard.** All schema changes via migration files. Never edit or rename a committed migration file. See `create-migration` skill for full conventions.

### Edge Function Deployments

**Never deploy edge functions manually.** They deploy automatically during the Vercel build. Never declare in `config.toml`. See `edge-function` skill for details.

## Development Workflow

When executing implementation plans, always use **subagent-driven development** (`superpowers:subagent-driven-development`). Do not use inline execution unless explicitly asked.

## Project Management

Linear for issue tracking (MCP server available). **Team**: `trainers-gg`. **Default Project**: `Private Beta MVP`.

## Glossary

| Term                | Definition                                                                        |
| ------------------- | --------------------------------------------------------------------------------- |
| **Alt**             | Player identity linked to a user. Users can have multiple alts. Stored in `alts`. |
| **Staff**           | Organization personnel who run events — NOT tournament participants.              |
| **TO**              | Tournament Organizer — staff role with create/manage permissions.                 |
| **DID**             | Decentralized Identifier — AT Protocol identity (`did:plc:abc123`).               |
| **PDS**             | Personal Data Server — self-hosted Bluesky at `pds.trainers.gg`.                  |
| **Handle**          | Human-readable Bluesky identity (`@username.trainers.gg`).                        |
| **RLS**             | Row Level Security — PostgreSQL access control via `auth.uid()`.                  |
| **Team Sheet**      | Player's Pokemon team for a tournament. Parsed via `@trainers/validators`.        |
| **Protected Route** | Route requiring auth regardless of maintenance mode. Enforced in `proxy.ts`.      |
