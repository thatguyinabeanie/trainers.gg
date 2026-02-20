# trainers.gg - Agent Guidelines

A Pokemon community platform for competitive players. Monorepo with Next.js 16 web app, Expo 54 mobile app, Supabase backend, and Bluesky PDS integration for decentralized social features.

## Monorepo Structure

```
apps/
  web/                 # Next.js 16 (React 19) - @trainers/web
  mobile/              # Expo 54 (React 19) - @trainers/mobile

packages/
  pokemon/             # Pokemon data, validation, parsing - @trainers/pokemon
  tournaments/         # Tournament logic (pairings, standings, brackets) - @trainers/tournaments
  utils/               # Shared utilities (formatting, countries, tiers) - @trainers/utils
  supabase/            # Supabase client, queries, edge functions - @trainers/supabase
  atproto/             # AT Protocol / Bluesky utilities - @trainers/atproto
  theme/               # Shared theme tokens - @trainers/theme
  validators/          # Zod schemas + team parsing (@pkmn/sets) - @trainers/validators

infra/
  pds/                 # Bluesky PDS deployment (Fly.io) - pds.trainers.gg

tooling/
  eslint/              # @trainers/eslint-config
  prettier/            # @trainers/prettier-config
  tailwind/            # @trainers/tailwind-config
  typescript/          # @trainers/typescript-config
```

## Tech Stack

| Layer                  | Technology              | Notes                                                           |
| ---------------------- | ----------------------- | --------------------------------------------------------------- |
| Auth                   | Supabase Auth           | Email/password + OAuth (Google, X, Discord, GitHub, Bluesky)    |
| Database               | Supabase (PostgreSQL)   | Row Level Security with auth.uid()                              |
| Edge Functions         | Supabase Edge Functions | Deno runtime                                                    |
| Social/Identity        | AT Protocol (Bluesky)   | Decentralized identity and federation                           |
| PDS                    | Fly.io                  | Self-hosted at pds.trainers.gg                                  |
| React Compiler         | React Compiler          | Auto-memoization — do NOT manually use useMemo/useCallback/memo |
| Client State (Web)     | TanStack Query v5       | Cache, mutations, optimistic updates, query invalidation        |
| Web                    | Next.js 16              | React 19, App Router, Server Components                         |
| Mobile                 | Expo 54                 | React Native with Tamagui                                       |
| UI Components (Web)    | shadcn/ui + Base UI     | Base UI primitives (NOT Radix), no `asChild`                    |
| UI Components (Mobile) | Tamagui                 | Platform-specific UI components, no shared UI package           |
| Styling (Web)          | Tailwind CSS 4          | Uses @tailwindcss/postcss                                       |
| Styling (Mobile)       | Tamagui                 | Universal UI components with theme tokens                       |
| Theme                  | @trainers/theme         | OKLCH colors, light/dark mode support (shared across platforms) |

---

## Commands

### Development

```bash
pnpm install              # Install deps + auto-creates .env.local, symlinks, OAuth keys
pnpm dev                  # Run all apps in parallel (includes Supabase setup)
pnpm dev:web              # Run web app only
pnpm dev:mobile           # Run mobile app only
pnpm dev:backend          # Run Supabase backend only
pnpm dev:web+backend      # Run web + Supabase in parallel
```

### Build & Quality

```bash
pnpm build                # Build all packages
pnpm build:web            # Build web app only
pnpm lint                 # Lint all packages
pnpm typecheck            # TypeScript check all packages
pnpm format               # Format all files with Prettier
pnpm format:check         # Check formatting without fixing
```

### Supabase

```bash
pnpm db:start             # Start local Supabase (requires Docker)
pnpm db:stop              # Stop local Supabase
pnpm db:reset             # Reset local database
pnpm db:migrate           # Push migrations to local database
pnpm db:diff              # Generate migration from database changes
pnpm db:seed              # Seed database with test data
pnpm generate-types       # Generate TypeScript types from schema
pnpm supabase <command>   # Run any Supabase CLI command from repo root
```

**IMPORTANT:** Always use `pnpm supabase` from the repo root instead of `cd packages/supabase && supabase`.

### Single Package

```bash
pnpm turbo run <task> --filter=@trainers/web
pnpm turbo run <task> --filter=@trainers/mobile
pnpm turbo run <task> --filter=@trainers/supabase
```

### Testing

```bash
pnpm test                 # Run all unit tests across monorepo (turbo)
pnpm test:ci              # Run with coverage + JUnit XML (CI mode)
pnpm test:unit            # Alias for pnpm test
pnpm test:watch           # Jest watch mode for active development
pnpm test:e2e             # Run Playwright E2E tests (web only)
```

### Pre-commit Hooks

Husky runs lint-staged (Prettier auto-fix) on all staged files. If hooks fail, fix errors, re-stage, and retry.

---

## Testing

### Requirements

**Every new feature, bug fix, or behavioral change must include adequate tests.** This is not optional:

- **New features**: Unit tests for business logic + integration tests for data flow. E2E tests for user-facing workflows.
- **Bug fixes**: A regression test that fails without the fix and passes with it.
- **Utility functions / validators**: Unit tests covering valid input, invalid input, and edge cases.
- **Edge functions**: Unit tests for shared logic (`_shared/` modules).
- **Database changes**: If adding RLS policies or complex queries, test the access patterns.

CI enforces a **60% patch coverage target** on new code via Codecov. Tests must pass before merging.

### Frameworks

| Framework               | Version  | Purpose                                 |
| ----------------------- | -------- | --------------------------------------- |
| Jest                    | ^29.7.0  | Unit & integration tests (all packages) |
| Playwright              | ^1.58.1  | E2E browser tests (web app)             |
| Testing Library (React) | ^16.3.2  | React component testing                 |
| Testing Library (RN)    | ^13.3.3  | React Native component testing          |
| jest-expo               | ^54.0.17 | Expo/React Native Jest preset           |

### Configuration

- **Root config**: `jest.config.ts` — multi-project config running 8 workspace packages in parallel
- **Shared base**: `tooling/jest/index.js` — `createConfig()` with ts-jest ESM defaults
- **Per-package configs**: Each package has its own `jest.config.ts` extending the shared base
- **Playwright config**: `apps/web/playwright.config.ts`
- **Coverage**: `codecov.yml` — per-package flags, 60% patch target, carryforward enabled

### Test File Conventions

| Item          | Convention                                   | Example                           |
| ------------- | -------------------------------------------- | --------------------------------- |
| Location      | `__tests__/` directory colocated with source | `src/lib/__tests__/utils.test.ts` |
| Unit tests    | `<module>.test.ts`                           | `swiss-pairings.test.ts`          |
| E2E tests     | `<feature>.spec.ts`                          | `sign-in.spec.ts`                 |
| E2E directory | `apps/web/e2e/tests/`                        | `e2e/tests/auth/sign-in.spec.ts`  |
| Test match    | `src/**/__tests__/**/*.test.{ts,tsx}`        | —                                 |

### Test Structure

Tests are organized in 8 workspace projects:

```
apps/web/src/**/__tests__/           # Web unit tests (jsdom environment)
apps/web/e2e/tests/                  # E2E tests (Playwright, Chromium)
apps/mobile/src/**/__tests__/        # Mobile unit tests
packages/supabase/src/**/__tests__/  # Supabase client + query tests
packages/supabase/supabase/functions/_shared/__tests__/  # Edge function tests
packages/validators/src/__tests__/   # Zod schema tests
packages/atproto/src/__tests__/      # AT Protocol tests
packages/pokemon/src/__tests__/      # Pokemon data + validation tests
packages/tournaments/src/__tests__/  # Tournament logic tests
packages/utils/src/__tests__/        # Shared utility tests
```

### E2E Test Setup

Playwright uses a two-project auth pattern:

1. **setup project** (`auth.setup.ts`): Logs in via UI, saves storage state to `e2e/playwright/.auth/player.json`
2. **chromium project**: Depends on setup, reuses saved auth state for all tests

Test users are seeded from Supabase (defined in `apps/web/e2e/fixtures/auth.ts`):

- `admin` — `admin@trainers.local` (site admin)
- `player` — `player@trainers.local` (regular user)
- `champion` — `champion@trainers.local`
- `gymLeader` — `gymleader@trainers.local`

### CI Pipeline

Tests run in GitHub Actions (`.github/workflows/ci.yml`):

1. **Quality** — lint + typecheck
2. **Unit Tests** — `pnpm test:ci` with coverage + JUnit XML artifacts
3. **Test Reports** — GitHub annotations, Codecov upload
4. **E2E Tests** — waits for Vercel preview deployment, runs Playwright against it

### Coverage

- **Reporters**: text, lcov, json-summary, cobertura
- **Patch target**: 60% on new code
- **Excluded from coverage**: `__tests__/`, `test-setup.ts`, `src/generated/`, `src/components/ui/` (shadcn), `tooling/`, `infra/`
- **Per-package flags**: web, mobile, validators, supabase, atproto, pokemon, tournaments, utils (reported separately in Codecov)

---

## Critical Rules

### Test Quality — What NOT to Test

**Do not write tests that only verify the behavior of the underlying language, framework, or library.** Tests should validate _our_ logic, not that React renders a string or that Array.filter works.

**❌ Bad — testing framework/language behavior:**

```tsx
// Testing that React renders text (React's job, not ours)
it("should render a div", () => {
  render(<MyComponent />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});

// Testing that Array.filter works
it("should filter items", () => {
  const result = [1, 2, 3].filter((x) => x > 1);
  expect(result).toEqual([2, 3]);
});

// Testing that a prop is passed through unchanged
it("should pass className to the wrapper", () => {
  render(<Card className="foo" />);
  expect(screen.getByTestId("card")).toHaveClass("foo");
});
```

**✅ Good — testing our logic and behavior:**

```tsx
// Testing business logic: which matches need attention
it("should classify staff_requested matches as needs-attention", () => {
  const result = classifyMatch(matchWithStaffRequest);
  expect(result).toBe("attention");
});

// Testing conditional rendering based on our domain rules
it("should show BYE when player2 is null on a bye match", () => {
  render(<MatchRow match={byeMatch} />);
  expect(screen.getByText("BYE")).toBeInTheDocument();
});

// Testing user interaction flows
it("should navigate to match page when Respond is clicked", async () => {
  await user.click(respondButton);
  expect(mockPush).toHaveBeenCalledWith("/tournaments/test/matches/42");
});

// Testing error handling specific to our app
it("should show fallback when Supabase query fails", () => { ... });
```

**Rule of thumb:** If the test would still pass with the component's logic completely emptied out and replaced with hardcoded values, the test is not valuable. Test decisions, transformations, conditional behavior, and user interaction flows — not that JSX renders.

### Database Schema Changes

**Never apply migrations directly via MCP tools or the Supabase dashboard.** All schema changes must go through migration files:

1. Create a new file in `packages/supabase/supabase/migrations/` (naming: `YYYYMMDDHHMMSS_description.sql`)
2. Commit and push to a feature branch (Supabase auto-creates a preview branch)
3. Merge to main to apply to production

**Never edit a migration file that has already been committed.** Always create a new migration file, even if fixing a previous one.

**Never rename a migration file.** The version timestamp in the filename is recorded in the production database's migration history. Renaming a file creates a mismatch between the recorded version and the local filename, which breaks Supabase preview branches ("Remote migration versions not found in local migrations directory"). If you need a different ordering, create a new migration file with the correct timestamp instead.

**All migrations must be idempotent.** Migrations may run multiple times across different environments (local, preview branches, production). Write migrations that can be safely re-run without errors:

- Use `CREATE ... IF NOT EXISTS` for tables, indexes, and extensions
- Use `DROP ... IF EXISTS` before `CREATE` when `IF NOT EXISTS` isn't available
- Wrap `CREATE SEQUENCE` in DO blocks that check `pg_sequences`:
  ```sql
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'my_seq') THEN
      CREATE SEQUENCE public.my_seq;
    END IF;
  END $$;
  ```
- Use `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` before adding constraints
- Wrap column modifications in DO blocks that check `information_schema.columns`
- Use `CREATE OR REPLACE FUNCTION` for functions (inherently idempotent)
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY`

Non-idempotent migrations break Supabase preview branches, which replay migrations from production on a fresh database.

### Edge Function Deployments

**Never deploy edge functions manually via `supabase functions deploy`.** Edge functions deploy through the git workflow:

1. Create or modify files in `packages/supabase/supabase/functions/<function-name>/`
2. Commit and push to a feature branch
3. Merge to main via PR to deploy to production

This applies to both new functions and updates to existing ones.

### Request Interception: proxy.ts (NOT middleware.ts)

**Next.js 16 uses `proxy.ts`** for request interception — `middleware.ts` is deprecated as of Next.js 16.

**IMPORTANT: File Location**

- In projects with a `src/` directory, `proxy.ts` **MUST** be at `src/proxy.ts`, NOT at the project root
- Projects without `src/` can place it at the project root
- This project uses `apps/web/src/proxy.ts`

**Function Export**

- Export a function named `proxy` (either default or named export):
  ```typescript
  export default async function proxy(request: NextRequest) {}
  // OR
  export async function proxy(request: NextRequest) {}
  ```

**How to Verify proxy.ts is Running**

- Dev server output will show `proxy.ts: XXms` in compile times when proxy executes
- Example: `GET /dashboard 200 in 1.2s (compile: 800ms, proxy.ts: 93ms, render: 300ms)`
- If you don't see `proxy.ts:` in the output, the file is not being loaded (check file location)

The proxy handles:

1. **Admin routes** (`/admin/*`): Requires `site_admin` role in JWT `site_roles` claim. Non-admins rewritten to `/forbidden`. Layout-level guard in `admin/layout.tsx` as defense in depth.
2. **Protected routes** (`/dashboard`, `/to-dashboard`, `/settings`, `/onboarding`, `/organizations/create`, `/feed`): Requires authentication. Redirects to `/sign-in?redirect=<path>`. Layout-level guards in dashboard layouts as defense in depth.
3. **Maintenance mode** (`MAINTENANCE_MODE=true`): Unauthenticated users redirected to `/waitlist`. Public routes (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/waitlist`, `/auth/*`, `/api/*`) remain accessible.

### Environment Variables

- All local env vars live in a single root `.env.local`, symlinked into app/package directories automatically by `postinstall.sh`
- When adding env vars used during builds, declare them in `turbo.json` under the task's `env` array (Turborepo uses this for cache invalidation)
- `pnpm dev` always configures `.env.local` for local Supabase — even if Vercel CLI (`vercel env pull`) has overwritten it with production credentials
- To explicitly use a remote Supabase instance during local dev, set `SKIP_LOCAL_SUPABASE=1` before running `pnpm dev`
- The setup script preserves non-Supabase env vars (OAuth keys, PDS config, Resend API key, etc.) when reconfiguring

### UI Components (Web)

- Uses **shadcn/ui v4 with Base UI primitives** (NOT Radix)
- Do NOT use `asChild` prop — Base UI doesn't support it
- Always check `apps/web/src/components/ui/` for existing components before building custom ones
- Add new components: `npx shadcn@latest add <component-name>`
- **Dropdowns, selects, badges, and status displays must show human-readable labels, not raw enum/database values.** Map values to labels (e.g., `checked_in` → "Checked In", `in_progress` → "In Progress"). Never render snake_case or lowercase enum values directly in the UI.

---

## Code Style

### TypeScript

- Strict mode with `noUncheckedIndexedAccess` and `noImplicitOverride`
- Use `type` keyword for type-only imports: `import { type Metadata } from "next"`
- Prefix unused variables with `_`
- Avoid `any` — use `unknown` and narrow types

### Prettier

```javascript
{ semi: true, singleQuote: false, tabWidth: 2, trailingComma: "es5", printWidth: 80 }
```

### Naming Conventions

| Item                | Convention         | Example             |
| ------------------- | ------------------ | ------------------- |
| Files               | kebab-case         | `post-card.tsx`     |
| React Components    | PascalCase         | `PostCard`          |
| Functions/variables | camelCase          | `getUserById`       |
| Constants           | SCREAMING_SNAKE    | `MAX_POST_LENGTH`   |
| Types/Interfaces    | PascalCase         | `UserProfile`       |
| Zod schemas         | camelCase + Schema | `userProfileSchema` |

### Dynamic Class Names (Web)

Always use `cn()` from `@/lib/utils` for conditional classes. Template literal concatenation can cause Tailwind purge issues.

```tsx
// Good
import { cn } from "@/lib/utils";
<div
  className={cn("text-sm", isActive ? "text-primary" : "text-muted-foreground")}
/>;
```

---

## Architecture Patterns

### Shared Packages vs App Code

When adding new library code, consider whether it belongs in a shared package or in an app directory:

- **Shared package** (`packages/`): Pure business logic, type definitions, algorithms, utilities, and validators that could be used by multiple apps (web, mobile) or edge functions. No React, Next.js, Expo, or framework-specific imports.
- **App directory** (`apps/web/src/lib/`, `apps/mobile/src/lib/`): Framework-specific adapters, UI utilities (Tailwind classes, React hooks), and code that depends on app-specific infrastructure (Supabase server client, Next.js cache, etc.).

**Rule of thumb:** If a module has zero framework imports and could be useful in another app, it belongs in a shared package. Create a new package or add to an existing one:

| Package                 | Contents                                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| `@trainers/pokemon`     | Pokemon types, validation, Showdown parsing, stats, type effectiveness    |
| `@trainers/tournaments` | Swiss pairing, standings, brackets, drop/bye logic, tournament validation |
| `@trainers/validators`  | Zod schemas for auth, users, posts, teams                                 |
| `@trainers/utils`       | Formatting, countries, tiers, permissions                                 |
| `@trainers/atproto`     | AT Protocol / Bluesky utilities                                           |
| `@trainers/supabase`    | Supabase client, queries, mutations, edge functions                       |
| `@trainers/theme`       | OKLCH color tokens, light/dark mode                                       |

### Code Reuse and DRY Principles

**Always optimize for code reuse.** Identify patterns and create reusable abstractions when you see repetition. Examples from this codebase:

**✅ Good Examples:**

1. **TanStack Query Factories** (`apps/mobile/src/lib/api/query-factory.ts`):

   ```typescript
   // Instead of repeating useQuery boilerplate in every hook:
   export function createQuery<T>(queryKey, endpoint, options) {
     return useQuery({
       queryKey,
       queryFn: async () => {
         const result = await apiCall<T>(endpoint);
         if (!result.success) throw new Error(result.error);
         return result.data;
       },
       ...options,
     });
   }

   // Now hooks are one-liners:
   export function useTournament(id: string) {
     return createQuery<Tournament>(
       ["tournament", id],
       `api-tournaments/${id}`
     );
   }
   ```

2. **Mutation Factories with Auto-Invalidation**:

   ```typescript
   // Reusable mutation pattern with automatic cache invalidation:
   export function createMutation<TData, TVariables>(
     mutationFn,
     options: { invalidates?: (vars) => QueryKey[] }
   ) {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: async (vars) => {
         const result = await mutationFn(vars);
         if (!result.success) throw new Error(result.error);
         return result.data;
       },
       onSuccess: (data, vars, context) => {
         if (options.invalidates) {
           options
             .invalidates(vars)
             .forEach((key) =>
               queryClient.invalidateQueries({ queryKey: key })
             );
         }
       },
     });
   }
   ```

3. **Shared Error Handling** (`packages/utils/src/error-handling.ts`):
   ```typescript
   // Single source of truth for extracting error messages:
   export function getErrorMessage(
     error: unknown,
     fallback: string,
     shouldSanitize = false
   ): string {
     // Handles Error, Supabase errors, and unknown types
   }
   ```

**❌ Bad Examples (Avoid):**

- Duplicating the same try/catch pattern in every function
- Copy-pasting useQuery hooks with only the endpoint changed
- Repeating validation logic across components
- Duplicating cache invalidation logic in every mutation

**When to Create Abstractions:**

- **After 2-3 repetitions**: If you've written similar code 2-3 times, extract a reusable function/component
- **Before adding a 4th hook**: If you're about to create the 4th similar TanStack Query hook, create a factory instead
- **When patterns emerge**: React table logic, form handling, API calls, validation, error handling
- **Cross-app functionality**: If web and mobile need the same logic, it belongs in a shared package

**When NOT to Create Abstractions:**

- Don't abstract after just 1 occurrence (wait for the pattern to emerge)
- Don't create "utils" dumping grounds (prefer domain-specific packages like `@trainers/tournaments`)
- Don't over-engineer for hypothetical future use cases (YAGNI principle)

### React Server Components

- Server Components are the default — no directive needed
- Use `"use client"` only at leaf nodes for interactivity
- Use CSS-first animations via Tailwind utilities (not Motion/Framer Motion, which force client components)

### React Compiler (Auto-Memoization)

This project uses **React Compiler**, which automatically handles memoization at build time. Do NOT manually write:

- `useMemo()` — the compiler detects and memoizes expensive computations
- `useCallback()` — the compiler stabilizes callback references automatically
- `React.memo()` — the compiler skips re-renders of unchanged components

Writing manual memoization is redundant, adds noise, and can conflict with the compiler's optimizations. If you encounter existing `useMemo`/`useCallback`/`React.memo` in the codebase, leave them alone (they're harmless but unnecessary). Do not add new ones.

### Client-Side State Management (TanStack Query)

Use **TanStack Query v5** for all client-side server state. This includes:

- **Data fetching in client components**: `useQuery` with query keys for cache management
- **Mutations**: `useMutation` with `onSuccess` → `queryClient.invalidateQueries()` for cache invalidation
- **Optimistic updates**: `useMutation` with `onMutate` for instant UI feedback, `onError` for rollback
- **Polling / realtime fallback**: `refetchInterval` for periodic refresh when Supabase Realtime is not appropriate
- **Dependent queries**: `enabled` option to conditionally fetch based on other data

Do NOT use `useState` + `useEffect` + `fetch` for server data in client components — that pattern lacks caching, deduplication, and error/loading states that TanStack Query provides for free.

**`useSupabaseQuery`** (`packages/supabase/src/hooks/use-supabase-query.ts`, re-exported via `apps/web/src/lib/supabase/hooks.ts`): A lightweight hook for simple Supabase queries that don't need TanStack Query's caching/deduplication. Returns `{ data, error, isLoading, refetch }`. The web wrapper auto-injects the Supabase client:

```typescript
const { data, isLoading } = useSupabaseQuery(
  (supabase) => getPlatformOverview(supabase),
  [dependency] // refetches when deps change
);
```

Prefer TanStack Query for shared/cached data. Use `useSupabaseQuery` for isolated one-off fetches (admin pages, analytics).

For Supabase Realtime data (live match updates, round changes), use the realtime subscription pattern with a `refreshKey` state that triggers TanStack Query / `useSupabaseQuery` refetch via the dependency array.

### Data Fetching

| Context                        | Tool                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| Server Components              | Direct Supabase calls                                        |
| Form submissions               | Server Actions                                               |
| Client-side data fetching      | TanStack Query (`useQuery` / `useMutation`)                  |
| Optimistic updates             | TanStack Query `useMutation` with `onMutate` / `onError`    |
| Realtime updates               | Supabase Realtime channels + refreshKey → query invalidation |

### Supabase Queries

```typescript
// Use maybeSingle() when record might not exist (returns null, no error)
const { data } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .maybeSingle();

// Use single() only when record MUST exist (throws 406 if not found)
const { data } = await supabase
  .from("alts")
  .select("*")
  .eq("id", altId)
  .single();
```

### Error Handling

- `throw new Error()` for validation errors
- Return `null` from queries when data not found
- Try/catch in Server Actions, return `{ success, error }` objects

### Authentication

Every user signup creates both a Supabase Auth account and a Bluesky PDS account (`@username.trainers.gg`). The signup edge function (`packages/supabase/supabase/functions/signup/`) orchestrates this. Key identity fields on the `users` table: `did` (AT Protocol DID), `pds_handle`, `pds_status`.

Key auth files:

| File                                             | Purpose                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| `apps/web/src/proxy.ts`                          | Request interception, session refresh, routing |
| `apps/web/src/lib/supabase/server.ts`            | Server-side Supabase client                    |
| `apps/web/src/lib/supabase/client.ts`            | Client-side Supabase client                    |
| `apps/web/src/lib/supabase/middleware.ts`        | Session refresh utilities (used by proxy)      |
| `apps/web/src/hooks/use-auth.ts`                 | Client-side auth hook                          |
| `apps/web/src/components/auth/auth-provider.tsx` | Client-side auth state provider                |
| `packages/supabase/supabase/functions/signup/`   | Unified signup edge function                   |

### Edge Functions

All edge functions live in `packages/supabase/supabase/functions/`:

| Function             | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `signup`             | Unified signup (Supabase Auth + PDS account)  |
| `api-tournaments`    | Tournament CRUD API                           |
| `api-matches`        | Match operations API                          |
| `api-notifications`  | Notification delivery API                     |
| `api-organizations`  | Organization management API                   |
| `api-alts`           | Alt/player identity API                       |
| `send-invite`        | Email invitation delivery                     |
| `bluesky-auth`       | Bluesky OAuth flow                            |
| `provision-pds`      | PDS account provisioning on Fly.io            |
| `update-pds-handle`  | Handle updates on PDS after username change   |

---

## Database Schema (Key Tables)

### users

| Column      | Type       | Description                              |
| ----------- | ---------- | ---------------------------------------- |
| id          | uuid       | Primary key (matches auth.users.id)      |
| email       | text       | Primary email                            |
| username    | text       | Unique username                          |
| did         | text       | AT Protocol Decentralized Identifier     |
| pds_handle  | text       | Auto-generated as `username.trainers.gg` |
| pds_status  | pds_status | pending, active, failed, or suspended    |
| main_alt_id | uuid       | FK to alts (user's primary alt)          |

### alts

Alternate player identities for tournaments. Users can have multiple alts.

| Column       | Type   | Description                     |
| ------------ | ------ | ------------------------------- |
| id           | bigint | Primary key                     |
| user_id      | uuid   | FK to users                     |
| username     | text   | Unique username for this alt    |
| display_name | text   | Public display name             |
| battle_tag   | text   | In-game battle tag or player ID |

### tournaments

| Column                | Type              | Description                                     |
| --------------------- | ----------------- | ----------------------------------------------- |
| id                    | bigint            | Primary key                                     |
| organization_id       | bigint            | FK to organizations                             |
| name                  | text              | Tournament name                                 |
| slug                  | text              | URL-friendly slug (unique per org)              |
| status                | tournament_status | draft, active, completed, cancelled             |
| format                | text              | Tournament format type                          |
| tournament_format     | tournament_format | Swiss, double-elim, etc.                        |
| swiss_rounds          | integer           | Number of Swiss rounds                          |
| top_cut_size          | integer           | Number advancing to finals                      |
| max_participants      | integer           | Max allowed players                             |
| round_time_minutes    | integer           | Time per round (default: 50)                    |
| current_phase_id      | bigint            | FK to tournament_phases                         |
| current_round         | integer           | Current round number (default: 0)               |
| participants          | bigint[]          | Array of participant alt IDs                    |
| tournament_state      | jsonb             | Arbitrary tournament state blob                 |

### tournament_registrations

| Column           | Type    | Description                                    |
| ---------------- | ------- | ---------------------------------------------- |
| id               | bigint  | Primary key                                    |
| tournament_id    | bigint  | FK to tournaments                              |
| alt_id           | bigint  | FK to alts                                     |
| status           | enum    | registered, checked_in, dropped, disqualified  |
| team_locked      | boolean | Whether the team is locked at tournament start |
| open_team_sheets | boolean | Whether the team sheet is publicly visible     |

### tournament_rounds

| Column                 | Type         | Description                          |
| ---------------------- | ------------ | ------------------------------------ |
| id                     | bigint       | Primary key                          |
| phase_id               | bigint       | FK to tournament_phases              |
| round_number           | integer      | Round sequence (1, 2, 3, ...)        |
| status                 | phase_status | pending, active, completed           |
| time_extension_minutes | integer      | Additional time granted (default: 0) |

### tournament_matches

| Column            | Type         | Description                                     |
| ----------------- | ------------ | ----------------------------------------------- |
| id                | bigint       | Primary key                                     |
| round_id          | bigint       | FK to tournament_rounds                         |
| alt1_id           | bigint       | FK to alts (player 1)                           |
| alt2_id           | bigint       | FK to alts (player 2, null for byes)            |
| winner_alt_id     | bigint       | FK to alts (set after match resolves)           |
| game_wins1        | integer      | Game wins for player 1                          |
| game_wins2        | integer      | Game wins for player 2                          |
| is_bye            | boolean      | Whether this is a bye                           |
| status            | phase_status | pending, active, completed                      |
| table_number      | integer      | Table assignment                                |
| staff_requested   | boolean      | Staff assistance requested                      |
| staff_resolved_by | bigint       | FK to alts (judge who resolved)                 |

### match_games

Supports **blind scoring** — players submit selections independently, system auto-detects agreement or dispute.

| Column           | Type              | Description                                                          |
| ---------------- | ----------------- | -------------------------------------------------------------------- |
| id               | bigint            | Primary key                                                          |
| match_id         | bigint            | FK to tournament_matches                                             |
| game_number      | smallint          | Game sequence (1-9)                                                  |
| alt1_selection   | bigint            | Player 1's blind winner selection                                    |
| alt2_selection   | bigint            | Player 2's blind winner selection                                    |
| winner_alt_id    | bigint            | Resolved winner (after agreement or judge ruling)                    |
| status           | match_game_status | pending, awaiting_both, awaiting_one, agreed, disputed, resolved, cancelled |
| resolved_by      | bigint            | FK to alts (judge who resolved dispute)                              |
| resolution_notes | text              | Judge's explanation of ruling                                        |

---

## Platform Notes

- Both web and mobile use **React 19.1**. `@types/react` is pinned to `~19.1.10`. Do not upgrade until Expo supports it.
- **Web**: Tailwind CSS 4.x via `@tailwindcss/postcss`
- **Mobile**: Tamagui with shared theme tokens from `@trainers/theme`
- Import alias: `@/*` → `./src/*` in both apps
- Dark mode: `next-themes` on web, `useColorScheme()` on mobile

---

## Design Principles

- **Minimal flat design**: no borders, subtle background differentiation, consistent spacing
- **Teal primary** (`@trainers/theme` OKLCH tokens): single accent color across all interactive elements
- Always prefer Server Components; push `"use client"` to leaf nodes
- Use `StatusBadge` for semantic status colors (emerald=active, blue=upcoming, amber=draft, gray=completed, red=cancelled)

---

## Project Management

This project uses **Linear** for issue tracking. A Linear MCP server is available for creating/updating issues, managing projects, and tracking work.

- **Team**: `trainers-gg`
- **Default Project**: `Private Beta MVP`

---

## Glossary

| Term                     | Definition                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| **Alt**                  | A player identity linked to a user account. Users can have multiple alts. Stored in `alts`. |
| **Staff**                | Organization personnel who run events. Staff are NOT tournament participants.               |
| **Player / Participant** | Someone registered for a tournament.                                                        |
| **Organization**         | A group that hosts tournaments. Has staff, can create tournaments.                          |
| **TO**                   | Tournament Organizer — staff role with permissions to create/manage tournaments.            |
| **DID**                  | Decentralized Identifier — AT Protocol identity (e.g., `did:plc:abc123`).                   |
| **PDS**                  | Personal Data Server — self-hosted Bluesky server at `pds.trainers.gg`.                     |
| **Handle**               | Human-readable Bluesky identity (e.g., `@username.trainers.gg`).                            |
| **RLS**                  | Row Level Security — PostgreSQL access control using `auth.uid()`.                          |
| **Team Sheet**           | A player's Pokemon team for a tournament. Parsed via `@trainers/validators`.                |
| **Protected Route**      | Route requiring auth regardless of maintenance mode. Enforced in `proxy.ts`.                |
