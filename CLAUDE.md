# trainers.gg - Agent Guidelines

All-in-one integrated platform for Pokemon fans. Current focus: competitive battling (VGC, Showdown, Pokemon Champions). Monorepo: Next.js 16 web, Expo 55 mobile, Supabase backend, Bluesky PDS integration.

## Workspace Skills

Domain-specific guidance lives in `.claude/skills/`. Invoke the relevant skill before working in an area.

| Skill                      | When to Use                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| `building-web-app`         | Web routes, components, Server Actions, data fetching, proxy.ts  |
| `building-mobile-app`      | Mobile screens, Tamagui UI, Expo Router, SecureStore             |
| `querying-supabase`        | DB queries/mutations, client selection, Edge Functions           |
| `validating-input`         | Zod schemas, Server Action return types, profanity filter        |
| `creating-components`      | UI components, design tokens, design principles                  |
| `checking-mobile-parity`   | After developing web features, check for mobile parity tickets   |
| `implementing-tournaments` | Swiss pairings, standings, brackets, adapters                    |
| `parsing-pokemon`          | Team parsing, legality validation, type effectiveness            |
| `using-utils`              | `getLabel()`, `getErrorMessage()`, permissions, formatting       |
| `tracking-analytics`       | PostHog event constants, adding new events                       |
| `integrating-bluesky`      | Bluesky/AT Protocol, DID resolution, public agent                |
| `writing-tests`            | Fishery factories, Supabase/AT Protocol mocks, Jest config       |
| `managing-dev-slots`       | Dev-slot port allocation, multi-instance dev, slot cleanup       |
| `managing-infrastructure`  | PDS on Fly.io, ngrok tunnel for local dev                        |
| `creating-edge-functions`  | Creating/updating Supabase edge functions                        |
| `managing-edge-imports`    | Deno import maps, `deno.json` management                         |
| `auditing-code`            | Codebase audits for type safety, architecture, maintainability   |
| `writing-skills`           | Creating/editing skills, agents, maintaining the architecture    |
| `design-system`            | Elevation, typography hierarchy, transitions, layout conventions |
| `product-vision`           | Product vision, feature roadmap, differentiators, user types     |
| `competitive-landscape`    | Competitive landscape, positioning, alternatives by category     |
| `reviewing-pr`             | Full PR review: code quality, RLS, caching, N+1, CI, comments    |

Slash-command skills (invoked directly, not listed above): `commit`, `create-migration`, `finish-branch`, `post-pr-monitoring`, `ticket`.

## Project Rules

Path-scoped rules in `.claude/rules/` load automatically when working with matching files.

| Rule                    | Applies To                                                                    |
| ----------------------- | ----------------------------------------------------------------------------- |
| `code-style.md`         | All TypeScript/TSX files (`**/*.{ts,tsx}`)                                    |
| `architecture.md`       | All shared packages (`packages/**/*`)                                         |
| `testing-philosophy.md` | All test files (`**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/e2e/**`) |

## Workspace Agents

Custom agents in `.claude/agents/`. Invoke for isolated, focused work.

| Agent                    | Model  | Purpose                                              |
| ------------------------ | ------ | ---------------------------------------------------- |
| `qa-engineer`            | sonnet | Write/review tests with fresh context                |
| `pre-push-checker`       | haiku  | Run lint/typecheck/test/format, report pass/fail     |
| `code-reviewer`          | sonnet | Review changes for style, architecture, correctness  |
| `feature-implementer`    | sonnet | Implement features following domain skill patterns   |
| `edge-function-reviewer` | —      | Review edge functions for CORS, auth, validation     |
| `migration-reviewer`     | —      | Review SQL migrations for correctness, RLS, safety   |
| `security-reviewer`      | —      | Security-focused review: RLS, auth, route protection |

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
| Web                | Next.js 16                     | React 19.2, App Router, Server Components                       |
| Mobile             | Expo 55                        | React Native 0.83 with Tamagui                                  |
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

### Test Users (Local Development)

After `pnpm db:reset`, these test users are available (password: `Password123!`):

| Email                   | Username      | Role                             |
| ----------------------- | ------------- | -------------------------------- |
| `admin@trainers.local`  | admin_trainer | Site admin, VGC League org owner |
| `player@trainers.local` | ash_ketchum   | Player, Pallet Town org owner    |

### Playwright Screenshots

Store all Playwright MCP screenshots in `.playwright-mcp/screenshots/`. This directory is gitignored.

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

If any check fails, fix the issue and re-run before pushing. Never push with known failures.

### Parallel Work & Unexpected Changes

Multiple agents and humans may work on this codebase simultaneously. If you encounter code changes, new files, or modified files that you did not make — they were either made manually by the developer or by another parallel agent. **Never delete, revert, overwrite, or undo changes you did not make.** Treat unfamiliar changes as intentional. If they conflict with your work, stop and ask rather than discarding them.

### Error Visibility

**Never suppress errors with `2>/dev/null`, `|| true`, or `|| exit 0`.** If a command can fail, the failure must be visible. Guard against expected empty inputs (e.g., check `[ -n "$VAR" ]` before using it), but never hide real errors. Silent failures waste hours of debugging.

**Never merge stderr into stdout with `2>&1`.** Keep stdout and stderr as separate streams. Merging them makes it impossible to distinguish errors from normal output when inspecting subagent processes.

### React Compiler

**Do NOT write `useMemo`, `useCallback`, or `React.memo`** — React Compiler handles memoization across all packages automatically. Manual memoization conflicts with compiler optimizations.

### Database Migrations

**Never apply migrations via MCP tools or the Supabase dashboard.** All schema changes via migration files. Never edit or rename a committed migration file. See `create-migration` skill for full conventions.

### Edge Function Deployments

**Never deploy edge functions manually.** They deploy automatically during the Vercel build. Never declare in `config.toml`. See `creating-edge-functions` skill for details.

## Product Vision

trainers.gg is the all-in-one integrated platform for Pokemon fans — one place that connects tools that currently exist in isolation. Not an esports site. Community-first. See `product-vision` and `competitive-landscape` skills for full details.

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

### Memory

When saving memories (user preferences, feedback, project context), write them to `~/.claude/CLAUDE.md` (the user's private global instructions file), not to the project CLAUDE.md.

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
