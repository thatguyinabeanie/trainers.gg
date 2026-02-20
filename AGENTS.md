# trainers.gg - Agent Guidelines

Pokemon community platform for competitive players. Monorepo: Next.js 16 web, Expo 54 mobile, Supabase backend, Bluesky PDS integration.

## Monorepo Structure

```
apps/
  web/          # Next.js 16 (React 19) - @trainers/web
  mobile/       # Expo 54 (React 19) - @trainers/mobile

packages/
  pokemon/      # Pokemon data, validation, parsing
  tournaments/  # Tournament logic (pairings, standings, brackets)
  utils/        # Shared utilities (formatting, countries, tiers)
  supabase/     # Supabase client, queries, edge functions
  atproto/      # AT Protocol / Bluesky utilities
  theme/        # Shared OKLCH color tokens
  validators/   # Zod schemas + team parsing

tooling/        # eslint, prettier, tailwind, typescript configs
```

Each app and package has its own `AGENTS.md` (with `CLAUDE.md` symlinked to it) with domain-specific guidance.

## Tech Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Auth | Supabase Auth | Email/password + OAuth (Google, X, Discord, GitHub, Bluesky) |
| Database | Supabase (PostgreSQL) | Row Level Security with auth.uid() |
| Edge Functions | Supabase Edge Functions | Deno runtime |
| Social/Identity | AT Protocol (Bluesky) | Decentralized identity and federation |
| React Compiler | React Compiler | Auto-memoization — do NOT manually use useMemo/useCallback/memo |
| Client State (Web) | TanStack Query v5 | Cache, mutations, optimistic updates |
| Web | Next.js 16 | React 19, App Router, Server Components |
| Mobile | Expo 54 | React Native with Tamagui |
| UI (Web) | shadcn/ui + Base UI | Base UI primitives (NOT Radix), no `asChild` |
| Styling (Web) | Tailwind CSS 4 | @tailwindcss/postcss |
| Styling (Mobile) | Tamagui | Theme tokens from @trainers/theme |

## Commands

See root `package.json` for all scripts. Key non-obvious gotchas:

- **Always use `pnpm supabase`** from repo root — never `cd packages/supabase && supabase`
- `pnpm dev` always reconfigures `.env.local` for local Supabase — set `SKIP_LOCAL_SUPABASE=1` to use remote instead
- All env vars live in root `.env.local`, symlinked into apps/packages via `postinstall.sh`
- When adding build-time env vars, declare them in `turbo.json` under the task's `env` array (cache invalidation)

## Testing

See `jest.config.ts` (root), `codecov.yml`, and `.github/workflows/ci.yml` for configuration.

**Every feature, bug fix, or behavioral change must include tests.** CI enforces 60% patch coverage on new code.

**Test our logic, not the framework.** Don't test that React renders text, Array.filter works, or props pass through. Test decisions, conditional rendering based on domain rules, user interaction flows, and app-specific error handling.

**Use `it.each`** for multiple input/output pairs — parameterize instead of repeating `it()` blocks.

**Use Rosie factories** for all test data. Factories in `src/__tests__/factories/` within the same package — never in a shared utilities package.

Pre-commit: Husky runs lint-staged (Prettier auto-fix). Fix errors, re-stage, retry — never skip hooks.

## Critical Rules

### Database Migrations

**Never apply migrations via MCP tools or the Supabase dashboard.** All schema changes via migration files:

1. Create `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Push to feature branch (Supabase auto-creates a preview branch)
3. Merge to main to apply to production

**Never edit or rename a committed migration file.** The timestamp is recorded in production history — renaming breaks preview branches ("Remote migration versions not found in local migrations directory").

**All migrations must be idempotent.** Preview branches replay all migrations on a fresh DB. Use `CREATE ... IF NOT EXISTS`, `DROP ... IF EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`.

### Edge Function Deployments

**Never deploy edge functions via `supabase functions deploy`.** Deploy via git → merge to main only. This applies to both new functions and updates.

### Request Interception: proxy.ts

**Next.js 16 uses `proxy.ts`** — `middleware.ts` is deprecated. Must be at `src/proxy.ts` (not project root). Export a function named `proxy`. Verify it's loading by checking for `proxy.ts: XXms` in dev server output.

### React Compiler

**Do NOT write `useMemo`, `useCallback`, or `React.memo`** — React Compiler handles memoization across all packages automatically. Manual memoization conflicts with compiler optimizations.

### UI Components (Web)

- **shadcn/ui v4 with Base UI** (NOT Radix) — do NOT use `asChild`
- Check `apps/web/src/components/ui/` before building custom components; add missing ones via `npx shadcn@latest add <name>`
- **Never render raw enum/DB values** — map to human-readable labels (`checked_in` → "Checked In")

## Architecture

### Shared Packages vs App Code

**Shared package** (`packages/`): Zero framework imports — pure logic usable by web, mobile, and edge functions.

**App directory** (`apps/*/src/lib/`): Framework-specific adapters, React hooks, Next.js/Expo infrastructure.

If a module has zero framework imports and could be useful across apps, it belongs in a shared package.

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
