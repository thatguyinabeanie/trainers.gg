# trainers.gg - Agent Guidelines

Pokemon community platform for competitive players. Monorepo: Next.js 16 web, Expo 54 mobile, Supabase backend, Bluesky PDS integration.

## Workspace Skills

Domain-specific guidance lives in `.claude/skills/`. Invoke the relevant skill before working in an area.

| Skill | When to Use |
| --- | --- |
| `building-web-app` | Web routes, components, Server Actions, data fetching, proxy.ts |
| `building-mobile-app` | Mobile screens, Tamagui UI, Expo Router, SecureStore |
| `supabase-queries` | DB queries/mutations, client selection, Edge Functions |
| `input-validation` | Zod schemas, Server Action return types, profanity filter |
| `tournament-logic` | Swiss pairings, standings, brackets, adapters |
| `pokemon-parsing` | Team parsing, legality validation, type effectiveness |
| `shared-utils` | `getLabel()`, `getErrorMessage()`, permissions, formatting |
| `posthog-analytics` | PostHog event constants, adding new events |
| `atproto-bluesky` | Bluesky/AT Protocol, DID resolution, public agent |
| `design-tokens` | OKLCH tokens, design tokens, web/mobile theme exports |
| `writing-tests` | Fishery factories, Supabase/AT Protocol mocks, Jest config |

### Infrastructure

**PDS** (`infra/pds/`): Self-hosted Bluesky PDS on Fly.io at `pds.trainers.gg`. Handles `@username.trainers.gg` handles. Deploy via `deploy.sh` or Fly.io dashboard — not git-deployed. Use `docker-compose.yml` + `local-dev.sh` for local testing.

**ngrok** (`infra/ngrok/`): Tunnels port 3000 to a public HTTPS URL. Starts automatically with `pnpm dev`. Configure via `NGROK_STATIC_DOMAIN` in `.env.ngrok`. Auto-updates `NEXT_PUBLIC_SITE_URL` — required for AT Protocol OAuth locally.


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

| Layer | Technology | Notes |
| --- | --- | --- |
| Auth | Supabase Auth | Email/password + OAuth (Google, X, Discord, GitHub, Bluesky) |
| Database | Supabase (PostgreSQL) | Row Level Security with auth.uid() |
| Edge Functions | Supabase Edge Functions | Deno runtime |
| Social/Identity | AT Protocol (Bluesky) | Decentralized identity and federation |
| React Compiler | React Compiler | Auto-memoization — do NOT manually use useMemo/useCallback/memo |
| Validation | Zod via `@trainers/validators` | Shared schemas for forms, Server Actions, edge functions |
| Client State (Web) | TanStack Query v5 | Cache, mutations, optimistic updates |
| Web | Next.js 16 | React 19, App Router, Server Components |
| Mobile | Expo 54 | React Native with Tamagui |
| UI (Web) | shadcn/ui + Base UI | Base UI primitives (NOT Radix), no `asChild` |
| Styling (Web) | Tailwind CSS 4 | @tailwindcss/postcss |
| Styling (Mobile) | Tamagui | Theme tokens from @trainers/theme |

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

## Testing

See `jest.config.ts` (root), `codecov.yml`, and `.github/workflows/ci.yml` for configuration.

**Every feature, bug fix, or behavioral change must include tests.** CI enforces 60% patch coverage on new code.

**Test our logic, not the framework.** Don't test that React renders text, Array.filter works, or props pass through. Test decisions, conditional rendering based on domain rules, user interaction flows, and app-specific error handling.

**Use `it.each`** for multiple input/output pairs — parameterize instead of repeating `it()` blocks.

**Use Fishery factories from `@trainers/test-utils`** for all test data — never inline object literals for DB rows or domain types. Import from `@trainers/test-utils/factories` (e.g., `userFactory.build({ username: "ash" })`). Check [tooling/test-utils/AGENTS.md](tooling/test-utils/AGENTS.md) for the full list of available factories. If no factory exists for the data you need, **create one** in `tooling/test-utils/src/factories/` rather than inlining data in the test. Use shared mock builders from `@trainers/test-utils/mocks` for Supabase client and AT Protocol agent mocks.

**Prefer existing helpers over inline logic.** Check `@trainers/utils` and the package's own helpers before writing new code. Extract repeated test setup into shared helpers. Keep tests DRY and simple (KISS) — if a utility function exists, use it.

Pre-commit: Husky runs lint-staged (Prettier auto-fix). Fix errors, re-stage, retry — never skip hooks.

## Critical Rules

### Parallel Work & Unexpected Changes

Multiple agents and humans may work on this codebase simultaneously. If you encounter code changes, new files, or modified files that you did not make — they were either made manually by the developer or by another parallel agent. **Never delete, revert, overwrite, or undo changes you did not make.** Treat unfamiliar changes as intentional. If they conflict with your work, stop and ask rather than discarding them.

### Database Migrations

**Never apply migrations via MCP tools or the Supabase dashboard.** All schema changes via migration files:

1. Create `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Push to feature branch (Supabase auto-creates a preview branch)
3. Merge to main to apply to production

**Never edit or rename a committed migration file.** The timestamp is recorded in production history — renaming breaks preview branches ("Remote migration versions not found in local migrations directory").

**All migrations must be idempotent.** Preview branches replay all migrations on a fresh DB. Use `CREATE ... IF NOT EXISTS`, `DROP ... IF EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`.

### Edge Function Deployments

**Never deploy edge functions via `supabase functions deploy`.** Deploy via git → merge to main only. This applies to both new functions and updates.

**Every edge function must be declared in `config.toml`.** The Supabase GitHub integration only deploys functions listed in `packages/supabase/supabase/config.toml`. If you create a new function directory under `supabase/functions/` without adding a `[functions.<name>]` entry to `config.toml`, it will not be deployed.

```toml
# Example: adding a new edge function
[functions.my-new-function]
verify_jwt = true
```

Set `verify_jwt = true` for functions that require an authenticated user (gateway rejects unauthenticated requests before the function runs). Set `verify_jwt = false` only for public functions where no JWT exists yet (e.g., `signup`, `bluesky-auth`).

### Request Interception: proxy.ts

**Next.js 16 uses `proxy.ts`** — `middleware.ts` is deprecated. Must be at `src/proxy.ts` (not project root). Export a function named `proxy`. Verify it's loading by checking for `proxy.ts: XXms` in dev server output.

### React Compiler

**Do NOT write `useMemo`, `useCallback`, or `React.memo`** — React Compiler handles memoization across all packages automatically (web, mobile, and shared packages). Manual memoization conflicts with compiler optimizations.

### UI Components (Web)

- **shadcn/ui v4 with Base UI** (NOT Radix) — do NOT use `asChild`
- Check `apps/web/src/components/ui/` before building custom components; add missing ones via `npx shadcn@latest add <name>`
- **Never render raw enum/DB values** — map to human-readable labels (`checked_in` → "Checked In")

## Architecture

### Shared Packages vs App Code

**Shared package** (`packages/`): Zero framework imports — pure logic usable by web, mobile, and edge functions.

**App directory** (`apps/*/src/lib/`): Framework-specific adapters, React hooks, Next.js/Expo infrastructure.

If a module has zero framework imports and could be useful across apps, it belongs in a shared package.

### Client State Management (TanStack Query)

TanStack Query v5 is the client state management layer for both web and mobile. All server state flows through query keys, cached queries, and mutations — not local React state or context.

- **Queries**: use query key factories to keep cache keys consistent and enable targeted invalidation
- **Mutations**: use `useMutation` with `onMutate` for optimistic updates where the UI should respond immediately (e.g., registration, check-in, roster changes)
- **Invalidation**: invalidate related query keys in `onSettled` so the cache resyncs with the server regardless of mutation outcome
- **No client-side state duplication**: if data comes from the server, it lives in the query cache — don't mirror it into `useState`
- **Query key factories**: the target convention for new features — define query keys via factory functions for consistency and targeted invalidation. Mobile already follows this pattern (see `apps/mobile/src/lib/api/query-factory.ts`)

### Validation (@trainers/validators)

`@trainers/validators` is the shared validation layer for all user input — forms, Server Actions, and edge functions. All validation schemas live in this package, not in app code.

- **Define schemas in `packages/validators/src/`** — one file per domain (e.g., `auth.ts`, `tournament.ts`, `match.ts`)
- **Export Zod schema + inferred type** — e.g., `createTournamentSchema` + `type CreateTournamentInput = z.infer<typeof createTournamentSchema>`
- **Use in forms**: parse client-side before submitting; pair with TanStack Query mutations for optimistic updates with validated data
- **Use in Server Actions**: validate input at the boundary with `.safeParse()` before any database calls
- **Naming**: `camelCaseSchema` suffix (e.g., `reportMatchResultSchema`)
- **Re-export from `src/index.ts`** so consumers import via `@trainers/validators`
- **Check existing schemas first** before creating new ones — the package likely already has what you need

### Code Reuse

Extract abstractions after 2–3 repetitions. See existing patterns before creating new ones:

- `apps/mobile/src/lib/api/query-factory.ts` — TanStack Query factory
- `packages/utils/src/error-handling.ts` — `getErrorMessage` for consistent error extraction

## Code Style

**TypeScript**: strict, `noUncheckedIndexedAccess`, `noImplicitOverride`. Type-only imports: `import { type Foo }`. Unused vars: prefix `_`. No `any` — use `unknown`.

**Prettier**: `{ semi: true, singleQuote: false, tabWidth: 2, trailingComma: "es5", printWidth: 80 }`

**Naming**: files `kebab-case`, components `PascalCase`, functions/vars `camelCase`, constants `SCREAMING_SNAKE`, Zod schemas `camelCaseSchema`.

**Dynamic classes**: always `cn()` from `@/lib/utils` — template literals cause Tailwind purge issues.

**Error handling**: `throw new Error()` for validation; `null` from queries when not found; Server Actions return `{ success, error }`.

## Design Principles

- Minimal flat design: no borders, subtle background differentiation, consistent spacing
- Teal primary (OKLCH tokens from `@trainers/theme`): single accent across all interactive elements
- `StatusBadge` for semantic status colors (emerald=active, blue=upcoming, amber=draft, gray=completed, red=cancelled)

## Local Dev Test Accounts

Seed data in `packages/supabase/supabase/seeds/03_users.sql`. All accounts use the same password.

**Password**: `Password123!`

| Email | Username | Role / Notes |
| --- | --- | --- |
| `admin@trainers.local` | admin_trainer | Site admin, VGC League org owner |
| `player@trainers.local` | ash_ketchum | Player, Pallet Town org owner |
| `champion@trainers.local` | cynthia | Player |
| `gymleader@trainers.local` | brock | Player |
| `elite@trainers.local` | karen | Player |
| `casual@trainers.local` | red | Player |
| `lance@trainers.local` | lance | Player |

Additional generated users follow the pattern `<username>@trainers.local` (see seed file for full list).

## Pre-Release Notes (remove after first public release)

- **Match URLs**: Use `/tournaments/[slug]/r/[round]/t/[table]` format (not `/matches/[matchId]`). No redirect from old format needed — app is pre-release with no existing links to maintain.

## Development Workflow

When executing implementation plans, always use **subagent-driven development** (`superpowers:subagent-driven-development`). Do not use inline execution unless explicitly asked.

## Project Management

Linear for issue tracking (MCP server available). **Team**: `trainers-gg`. **Default Project**: `Private Beta MVP`.

## Glossary

| Term | Definition |
| --- | --- |
| **Alt** | Player identity linked to a user. Users can have multiple alts. Stored in `alts`. |
| **Staff** | Organization personnel who run events — NOT tournament participants. |
| **TO** | Tournament Organizer — staff role with create/manage permissions. |
| **DID** | Decentralized Identifier — AT Protocol identity (`did:plc:abc123`). |
| **PDS** | Personal Data Server — self-hosted Bluesky at `pds.trainers.gg`. |
| **Handle** | Human-readable Bluesky identity (`@username.trainers.gg`). |
| **RLS** | Row Level Security — PostgreSQL access control via `auth.uid()`. |
| **Team Sheet** | Player's Pokemon team for a tournament. Parsed via `@trainers/validators`. |
| **Protected Route** | Route requiring auth regardless of maintenance mode. Enforced in `proxy.ts`. |
