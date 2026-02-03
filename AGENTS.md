# trainers.gg - Agent Guidelines

A Pokemon community platform for competitive players. Monorepo with Next.js 16 web app, Expo 54 mobile app, Supabase backend, and Bluesky PDS integration for decentralized social features.

## Monorepo Structure

```
apps/
  web/                 # Next.js 16 (React 19) - @trainers/web
  mobile/              # Expo 54 (React 19) - @trainers/mobile

packages/
  supabase/            # Supabase client, queries, edge functions - @trainers/supabase
  atproto/             # AT Protocol / Bluesky utilities - @trainers/atproto
  ui/                  # Shared UI components - @trainers/ui
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

| Layer            | Technology              | Notes                                                        |
| ---------------- | ----------------------- | ------------------------------------------------------------ |
| Auth             | Supabase Auth           | Email/password + OAuth (Google, X, Discord, GitHub, Bluesky) |
| Database         | Supabase (PostgreSQL)   | Row Level Security with auth.uid()                           |
| Edge Functions   | Supabase Edge Functions | Deno runtime                                                 |
| Social/Identity  | AT Protocol (Bluesky)   | Decentralized identity and federation                        |
| PDS              | Fly.io                  | Self-hosted at pds.trainers.gg                               |
| Web              | Next.js 16              | React 19, App Router, Server Components                      |
| Mobile           | Expo 54                 | React Native with Tamagui                                    |
| UI Components    | shadcn/ui + Base UI     | Base UI primitives (NOT Radix), no `asChild`                 |
| Styling (Web)    | Tailwind CSS 4          | Uses @tailwindcss/postcss                                    |
| Styling (Mobile) | Tamagui                 | Universal UI components with theme tokens                    |
| Theme            | @trainers/theme         | OKLCH colors, light/dark mode support                        |

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

### Pre-commit Hooks

Husky runs lint-staged (Prettier auto-fix) on all staged files. If hooks fail, fix errors, re-stage, and retry.

---

## Critical Rules

### Database Schema Changes

**Never apply migrations directly via MCP tools or the Supabase dashboard.** All schema changes must go through migration files:

1. Create a new file in `packages/supabase/supabase/migrations/` (naming: `YYYYMMDDHHMMSS_description.sql`)
2. Commit and push to a feature branch (Supabase auto-creates a preview branch)
3. Merge to main to apply to production

**Never edit a migration file that has already been committed.** Always create a new migration file, even if fixing a previous one.

### Edge Function Deployments

**Never deploy edge functions manually via `supabase functions deploy`.** Edge functions deploy through the git workflow:

1. Create or modify files in `packages/supabase/supabase/functions/<function-name>/`
2. Commit and push to a feature branch
3. Merge to main via PR to deploy to production

This applies to both new functions and updates to existing ones.

### Request Interception: proxy.ts (NOT middleware.ts)

**Next.js 16 uses `proxy.ts`** at `apps/web/proxy.ts` for request interception — NOT `middleware.ts`. Do NOT create a `middleware.ts` file; it will break all routes (404 on every page).

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

### React Server Components

- Server Components are the default — no directive needed
- Use `"use client"` only at leaf nodes for interactivity
- Use CSS-first animations via Tailwind utilities (not Motion/Framer Motion, which force client components)

### Data Fetching

| Context                        | Tool                             |
| ------------------------------ | -------------------------------- |
| Server Components              | Direct Supabase calls            |
| Form submissions               | Server Actions                   |
| Client-side polling/pagination | TanStack Query                   |
| Optimistic updates             | Client component + Server Action |

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
| `apps/web/proxy.ts`                              | Request interception, session refresh, routing |
| `apps/web/src/lib/supabase/server.ts`            | Server-side Supabase client                    |
| `apps/web/src/lib/supabase/client.ts`            | Client-side Supabase client                    |
| `apps/web/src/lib/supabase/middleware.ts`        | Session refresh utilities (used by proxy)      |
| `apps/web/src/hooks/use-auth.ts`                 | Client-side auth hook                          |
| `apps/web/src/components/auth/auth-provider.tsx` | Client-side auth state provider                |
| `packages/supabase/supabase/functions/signup/`   | Unified signup edge function                   |

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

### tournament_registrations

| Column           | Type    | Description                                    |
| ---------------- | ------- | ---------------------------------------------- |
| id               | bigint  | Primary key                                    |
| tournament_id    | bigint  | FK to tournaments                              |
| alt_id           | bigint  | FK to alts                                     |
| status           | enum    | registered, checked_in, dropped, disqualified  |
| team_locked      | boolean | Whether the team is locked at tournament start |
| open_team_sheets | boolean | Whether the team sheet is publicly visible     |

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
