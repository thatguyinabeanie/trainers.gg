# trainers.gg - Agent Guidelines

A Pokemon community platform for competitive players. Monorepo with Next.js 16 web app, Expo 54 mobile app, Supabase backend, and **Bluesky PDS integration** for decentralized social features.

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
  validators/          # Zod schemas - @trainers/validators

infra/
  pds/                 # Bluesky PDS deployment (Fly.io) - pds.trainers.gg

tooling/
  eslint/              # @trainers/eslint-config
  prettier/            # @trainers/prettier-config
  tailwind/            # @trainers/tailwind-config
  typescript/          # @trainers/typescript-config
```

---

## Tech Stack

| Layer            | Technology              | Notes                                        |
| ---------------- | ----------------------- | -------------------------------------------- |
| Auth             | Supabase Auth           | Native auth with email/password and OAuth    |
| Database         | Supabase (PostgreSQL)   | Row Level Security with auth.uid()           |
| Edge Functions   | Supabase Edge Functions | Deno runtime                                 |
| Social/Identity  | AT Protocol (Bluesky)   | Decentralized identity and federation        |
| PDS              | Fly.io                  | Self-hosted at pds.trainers.gg               |
| Web              | Next.js 16              | React 19, App Router, Server Components      |
| Mobile           | Expo 54                 | React Native with Tamagui                    |
| UI Components    | shadcn/ui + Base UI     | Base UI primitives (NOT Radix), no `asChild` |
| Styling (Web)    | Tailwind CSS 4          | Uses @tailwindcss/postcss                    |
| Styling (Mobile) | Tamagui                 | Universal UI components with theme tokens    |
| Theme            | @trainers/theme         | OKLCH colors, light/dark mode support        |

---

## Infrastructure & Hosting

### DNS Configuration (Vercel DNS)

All DNS for `trainers.gg` is managed via **Vercel DNS**.

| Record         | Type  | Points To              | Purpose                                   |
| -------------- | ----- | ---------------------- | ----------------------------------------- |
| `@` (apex)     | A     | Vercel IPs             | Web app (trainers.gg)                     |
| `www`          | CNAME | `cname.vercel-dns.com` | Web app (www.trainers.gg)                 |
| `pds`          | CNAME | `trainers-pds.fly.dev` | PDS API                                   |
| `*` (wildcard) | CNAME | `trainers-pds.fly.dev` | Handle resolution (@username.trainers.gg) |

### Domain Configuration

| Domain            | Host   | Purpose                                     |
| ----------------- | ------ | ------------------------------------------- |
| `trainers.gg`     | Vercel | Web app (primary, no redirect)              |
| `www.trainers.gg` | Vercel | Web app (redirects to apex)                 |
| `pds.trainers.gg` | Fly.io | Bluesky PDS API                             |
| `*.trainers.gg`   | Fly.io | Handle resolution for @username.trainers.gg |

### AT Protocol Requirements

| Requirement           | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| OAuth Client Metadata | Must return HTTP 200 (no redirects per AT Protocol spec)                   |
| Handle Resolution     | `https://username.trainers.gg/.well-known/atproto-did` must resolve to PDS |
| Apex Domain           | Must be primary in Vercel (not www) to avoid 308 redirects                 |
| Preview Deployments   | Bluesky OAuth is disabled (Vercel SSO protection blocks metadata access)   |

---

## Build / Lint / Test Commands

### Root Commands

```bash
# 📦 Setup & Installation
pnpm install              # Install all dependencies
pnpm setup                # Run Supabase setup (auto-runs before dev)

# 🚀 Development
pnpm dev                  # Run all apps in parallel (includes setup)
pnpm dev:web              # Run web app only
pnpm dev:mobile           # Run mobile app only
pnpm dev:backend          # Run Supabase backend only
pnpm dev:web+backend      # Run web + Supabase in parallel

# 🏗️ Build
pnpm build                # Build all packages
pnpm build:web            # Build web app only

# ✅ Quality Checks
pnpm lint                 # Lint all packages
pnpm typecheck            # TypeScript check all packages
pnpm format               # Format all files with Prettier
pnpm format:check         # Check formatting without fixing

# 🧹 Cleanup
pnpm clean                # Remove all build artifacts and node_modules
```

### Pre-commit Hooks (Husky + lint-staged)

All commits are validated via Husky pre-commit hooks:

1. **lint-staged** runs on staged files:
   - Prettier formatting (auto-fix) for `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.md`, `.css`, `.html`, `.yml`, `.yaml` files
2. **TypeScript** check may run depending on repository configuration

**Commit workflow:**

```bash
# Before committing, ensure these pass:
pnpm lint                 # Fix any lint errors
pnpm typecheck            # Fix any type errors
pnpm format               # Format all files

# Then commit - hooks will verify
git add .
git commit -m "feat: add new feature"
```

**If pre-commit hooks fail:**

- Fix the reported errors
- Stage the fixes: `git add .`
- Retry the commit

### Single Package Commands

```bash
pnpm turbo run <task> --filter=@trainers/web
pnpm turbo run <task> --filter=@trainers/mobile
pnpm turbo run <task> --filter=@trainers/supabase
```

### Supabase Commands

```bash
# 🚀 Service Management
pnpm db:start             # Start local Supabase (requires Docker)
pnpm db:stop              # Stop local Supabase
pnpm db:restart           # Restart local Supabase
pnpm db:status            # Check Supabase service status

# 🗄️ Database Operations
pnpm db:reset             # Reset local database
pnpm db:migrate           # Push migrations to local database
pnpm db:diff              # Generate migration from database changes
pnpm db:lint              # Lint SQL migration files
pnpm db:seed              # Seed database with test data
pnpm db:dump              # Dump database schema and data

# 🔧 Development Tools
pnpm generate-types       # Generate TypeScript types from schema

# 🔗 Supabase CLI (any command)
pnpm supabase <command>   # Run any Supabase CLI command from repo root
                          # Automatically runs in packages/supabase directory
                          # Examples:
                          #   pnpm supabase link --project-ref <id>
                          #   pnpm supabase migration list --linked
                          #   pnpm supabase branches list
```

**IMPORTANT:** Always use `pnpm supabase` from the repo root instead of `cd packages/supabase && supabase`. This prevents the CLI from creating unwanted directories in the repo root.

### Database Schema Changes

**CRITICAL:** Never apply migrations directly to the Supabase project via MCP tools or the dashboard. All schema changes must be done via code:

1. Create a new migration file in `packages/supabase/supabase/migrations/`
2. Use naming convention: `YYYYMMDDHHMMSS_description.sql`
3. Commit the migration file to the repository
4. Push to a feature branch - Supabase will create a preview branch automatically
5. Test on the preview branch before merging to main
6. Merging to main will apply the migration to production

This ensures:

- All schema changes are version controlled
- Changes can be reviewed in PRs
- Migrations are tested on preview branches first
- Production database changes are traceable

**IMPORTANT:** Never edit a migration file that has already been committed or pushed. Always create a new migration file for any changes, even if fixing a previous migration. Editing existing migrations can cause:

- Checksum mismatches in environments where the migration already ran
- Inconsistent database state between local, preview, and production
- Failed deployments due to migration history conflicts

---

## Project Management (Linear)

This project uses **Linear** for issue tracking and project management. A Linear MCP (Model Context Protocol) server is available for AI agents to interact with Linear directly.

### Linear MCP Capabilities

The Linear MCP provides tools for:

| Category      | Tools                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------- |
| **Issues**    | `linear_list_issues`, `linear_get_issue`, `linear_create_issue`, `linear_update_issue`             |
| **Projects**  | `linear_list_projects`, `linear_get_project`, `linear_create_project`, `linear_update_project`     |
| **Teams**     | `linear_list_teams`, `linear_get_team`                                                             |
| **Users**     | `linear_list_users`, `linear_get_user`                                                             |
| **Labels**    | `linear_list_issue_labels`, `linear_create_issue_label`                                            |
| **Comments**  | `linear_list_comments`, `linear_create_comment`                                                    |
| **Cycles**    | `linear_list_cycles`                                                                               |
| **Documents** | `linear_list_documents`, `linear_get_document`, `linear_create_document`, `linear_update_document` |
| **Statuses**  | `linear_list_issue_statuses`, `linear_get_issue_status`                                            |

### Common Workflows

**Finding issues assigned to the current user:**

```
linear_list_issues(assignee: "me")
```

**Creating an issue with labels:**

```
linear_create_issue(
  title: "Add feature X",
  team: "trainers",
  description: "Description in Markdown",
  labels: ["enhancement", "frontend"]
)
```

**Updating issue status:**

```
linear_update_issue(id: "ISSUE_ID", state: "In Progress")
```

**Adding a comment to an issue:**

```
linear_create_comment(issueId: "ISSUE_ID", body: "Comment in Markdown")
```

### Best Practices

- Use `linear_search_documentation` to learn about Linear features
- When creating issues, provide clear titles and detailed Markdown descriptions
- Use labels to categorize work (e.g., `bug`, `enhancement`, `frontend`, `backend`)
- Link related issues using the `relatedTo`, `blocks`, or `blockedBy` parameters
- Set appropriate priority levels (1=Urgent, 2=High, 3=Normal, 4=Low)

---

## Authentication Architecture

### Unified Supabase + Bluesky Authentication

Every user signup creates **both** a Supabase Auth account AND a Bluesky PDS account with an `@username.trainers.gg` handle.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Signup Flow                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. User enters email, username, password in web/mobile app                 │
│  2. Client calls /functions/v1/signup edge function                         │
│  3. Edge function validates username availability (Supabase + PDS)          │
│  4. Edge function creates Supabase Auth account                             │
│  5. Edge function generates PDS invite code and creates PDS account         │
│  6. Edge function stores DID in users table, sets pds_status = 'active'     │
│  7. Client receives session tokens for both systems                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Identity Mapping                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  auth.users.id  ←═══════╗                                                   │
│                         ║                                                   │
│  public.users ══════════╩══════════════════════════════════════════════════ │
│    ├── id (= auth.uid())                                                    │
│    ├── did: "did:plc:abc123..."     ← AT Protocol Decentralized Identifier  │
│    ├── pds_handle: "@user.trainers.gg"                                      │
│    └── pds_status: pending | active | failed | suspended                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bluesky PDS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Bluesky Network                                 │
│   bsky.social ◄──────► Relay (bsky.network) ◄──────► pds.trainers.gg       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Federation
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                              trainers.gg                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │ Next.js Web │  │ Expo Mobile │  │ Supabase                            │  │
│  │             │  │             │  │ ┌─────────────────────────────────┐ │  │
│  │ signUp() ───┼──┼─────────────┼──┼─► Edge Function (/signup)         │ │  │
│  │             │  │             │  │ │  ├─► Create Supabase Auth       │ │  │
│  │             │  │             │  │ │  ├─► Create PDS Account         │ │  │
│  │             │  │             │  │ │  └─► Store DID in users table   │ │  │
│  │             │  │             │  │ └─────────────────────────────────┘ │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File                                             | Purpose                                      |
| ------------------------------------------------ | -------------------------------------------- |
| `apps/web/src/lib/supabase/server.ts`            | Server-side Supabase client                  |
| `apps/web/src/lib/supabase/client.ts`            | Client-side Supabase client                  |
| `apps/web/src/lib/supabase/middleware.ts`        | Session refresh middleware utilities         |
| `apps/web/src/hooks/use-auth.ts`                 | Client-side auth hook (calls signup edge fn) |
| `apps/web/src/components/auth/auth-provider.tsx` | Client-side auth state provider              |
| `apps/web/middleware.ts`                         | Next.js middleware for session               |
| `apps/mobile/src/lib/supabase/auth-provider.tsx` | Mobile auth provider (calls signup edge fn)  |
| `packages/supabase/supabase/functions/signup/`   | Unified signup edge function                 |
| `infra/pds/`                                     | PDS deployment config (Fly.io)               |

### Database Helper Functions

```sql
-- Get the current authenticated user's ID
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get the current user's main alt ID
CREATE OR REPLACE FUNCTION public.get_current_alt_id()
RETURNS bigint AS $$
  SELECT a.id FROM alts a
  WHERE a.user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### RLS Policy Pattern

```sql
-- Example: Users can only update their own data
CREATE POLICY "Users can update own record"
ON public.users FOR UPDATE
USING (id = auth.uid());
```

---

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** with `noUncheckedIndexedAccess` and `noImplicitOverride`
- Use `type` keyword for type-only imports (inline style):
  ```typescript
  import { type Metadata } from "next";
  import { type VariantProps } from "class-variance-authority";
  ```
- Prefix unused variables with `_` to silence warnings
- Avoid `any` - use `unknown` and narrow types instead

### Prettier (enforced)

```javascript
{
  semi: true,              // Always use semicolons
  singleQuote: false,      // Use double quotes "
  tabWidth: 2,             // 2 space indentation
  trailingComma: "es5",    // Trailing commas where valid in ES5
  printWidth: 80,          // Line width limit
}
```

### Naming Conventions

| Item                | Convention         | Example             |
| ------------------- | ------------------ | ------------------- |
| Files (components)  | kebab-case         | `post-card.tsx`     |
| Files (utilities)   | kebab-case         | `format-date.ts`    |
| React Components    | PascalCase         | `PostCard`          |
| Functions/variables | camelCase          | `getUserById`       |
| Constants           | SCREAMING_SNAKE    | `MAX_POST_LENGTH`   |
| Types/Interfaces    | PascalCase         | `UserProfile`       |
| Zod schemas         | camelCase + Schema | `userProfileSchema` |

### Component Patterns

```typescript
// Use forwardRef for components that need ref access
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button ref={ref} className={cn(...)} {...props} />;
  }
);
Button.displayName = "Button"; // Always set displayName
```

---

## Architecture Guidelines

### React Server Components (RSC)

- **Server Components are the default** - no directive needed
- Use `"use client"` only at leaf nodes for interactivity
- Push client boundaries down as far as possible

| Use Server Component | Use Client Component        |
| -------------------- | --------------------------- |
| Data fetching        | useState/useEffect          |
| Static content       | Event handlers (onClick)    |
| Layouts, pages       | Form inputs with live state |
| SEO-critical content | Optimistic UI updates       |

### Data Fetching Strategy

| Context                        | Tool                             |
| ------------------------------ | -------------------------------- |
| Server Components              | Direct Supabase calls            |
| Form submissions               | Server Actions                   |
| Client-side polling/pagination | TanStack Query                   |
| Optimistic updates             | Client component + Server Action |

### Supabase Query Patterns

```typescript
// Queries - use maybeSingle() when record might not exist
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .maybeSingle(); // Returns null if not found, no error

// Use single() only when record MUST exist
const { data: alt } = await supabase
  .from("alts")
  .select("*")
  .eq("id", altId)
  .single(); // Throws 406 error if not found
```

### Error Handling

- Use `throw new Error("message")` for validation errors
- Return `null` from queries when data not found (don't throw)
- Use try/catch in Server Actions, return error objects:
  ```typescript
  try {
    await doSomething();
    return { success: true };
  } catch (error) {
    return { success: false, error: "Something went wrong" };
  }
  ```

---

## Database Schema (Key Tables)

### users

Created via database trigger on auth signup.

| Column      | Type       | Description                              |
| ----------- | ---------- | ---------------------------------------- |
| id          | uuid       | Primary key (matches auth.users.id)      |
| email       | text       | Primary email                            |
| first_name  | text       | User's first name                        |
| last_name   | text       | User's last name                         |
| username    | text       | Unique username                          |
| image       | text       | Avatar URL                               |
| birth_date  | date       | User's date of birth                     |
| country     | text       | Country code (ISO 3166-1 alpha-2)        |
| main_alt_id | uuid       | FK to alts (user's primary alt)          |
| did         | text       | AT Protocol Decentralized Identifier     |
| pds_handle  | text       | Auto-generated as `username.trainers.gg` |
| pds_status  | pds_status | pending, active, failed, or suspended    |

### alts

Alternate player identities for tournaments. A user can have multiple alts for different competitive formats, anonymity, or personas.

| Column       | Type   | Description                       |
| ------------ | ------ | --------------------------------- |
| id           | bigint | Primary key                       |
| user_id      | uuid   | FK to users                       |
| username     | text   | Unique username for this alt      |
| display_name | text   | Public display name               |
| avatar_url   | text   | Alt avatar                        |
| bio          | text   | Alt biography/description         |
| battle_tag   | text   | In-game battle tag or player ID   |
| tier         | enum   | Subscription tier (free, premium) |

---

## Environment Variables

### Web App (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Turborepo Environment Variables (turbo.json)

**IMPORTANT:** When adding new environment variables that are used during builds, you MUST declare them in `turbo.json` under the appropriate task's `env` array. Turborepo uses these declarations for cache invalidation and to pass variables to build processes.

```json
// turbo.json example
{
  "tasks": {
    "build": {
      "env": ["SUPABASE_ACCESS_TOKEN", "SUPABASE_URL", "..."]
    }
  }
}
```

**Common mistakes:**

- Adding env vars to Vercel but forgetting to add them to `turbo.json`
- Build fails with "environment variables are set on your Vercel project, but missing from turbo.json"

**When to update turbo.json:**

- Adding new env vars used in `prebuild`, `build`, or other Turborepo tasks
- Adding env vars read by build-time scripts (like `run-migrations.mjs`)

---

## File Organization

```
apps/web/src/
├── app/              # Next.js App Router pages
├── components/
│   ├── auth/         # Auth components (AuthProvider)
│   ├── layout/       # Header, sidebar, nav
│   └── ui/           # Local UI primitives
├── lib/
│   └── supabase/     # Supabase client setup
└── styles/           # Global CSS

apps/mobile/src/
├── app/              # Expo Router pages
├── components/       # Mobile UI components
└── lib/
    └── supabase/     # Supabase client + auth provider

packages/supabase/
├── src/
│   ├── client.ts     # Client creation functions
│   ├── types.ts      # Generated database types
│   ├── queries/      # Read-only query functions
│   └── mutations/    # Write operations
└── supabase/
    ├── functions/    # Edge functions (Deno)
    │   ├── signup/   # Unified Supabase + PDS signup
    │   └── _shared/  # Shared utilities (CORS, etc.)
    └── migrations/   # SQL migration files

infra/pds/
├── fly.toml          # Fly.io container config
├── deploy.sh         # Full deployment automation
├── create-account.sh # Create PDS user accounts
├── setup.sh          # Initial setup script
├── Makefile          # Common operations
└── README.md         # PDS documentation
```

---

## Platform-Specific Notes

### React Version

Both web and mobile use **React 19.1** for consistency.

**Important:** Always use the lowest common denominator React version across the monorepo. Check [Expo SDK bundledNativeModules.json](https://github.com/expo/expo/blob/sdk-54/packages/expo/bundledNativeModules.json) before upgrading.

### Tailwind Versions

- **Web**: Tailwind CSS 4.x (uses `@tailwindcss/postcss`)
- **Mobile**: Tamagui (not Tailwind) with shared theme tokens from @trainers/theme

### Import Aliases

| App    | Alias | Path      |
| ------ | ----- | --------- |
| Web    | `@/*` | `./src/*` |
| Mobile | `@/*` | `./src/*` |

---

## Theme System

### Overview

The `@trainers/theme` package provides a unified design token system for both web and mobile apps. Colors are defined in OKLCH color space for better perceptual uniformity, then converted to hex (mobile) and CSS variables (web) at build time.

### Color Palette

| Token       | Light Mode | Dark Mode | Usage                 |
| ----------- | ---------- | --------- | --------------------- |
| primary     | `#1b9388`  | `#1db6a5` | Teal - buttons, links |
| background  | `#ffffff`  | `#0a0a0a` | Page backgrounds      |
| foreground  | `#0a0a0a`  | `#fafafa` | Primary text          |
| muted       | `#f5f5f5`  | `#262626` | Subtle backgrounds    |
| card        | `#ffffff`  | `#171717` | Card backgrounds      |
| destructive | `#df2225`  | `#ff6467` | Error states, delete  |

### Key Files

| File                                            | Purpose                                |
| ----------------------------------------------- | -------------------------------------- |
| `packages/theme/src/primitives/colors.oklch.ts` | OKLCH color definitions                |
| `packages/theme/src/tokens/semantic.ts`         | Light/dark semantic token mappings     |
| `packages/theme/scripts/generate.ts`            | Generates hex colors and CSS           |
| `packages/theme/src/generated/mobile-theme.ts`  | Generated light/dark colors for mobile |
| `packages/theme/src/generated/theme.css`        | Generated CSS variables for web        |

### Regenerating Theme

```bash
cd packages/theme
pnpm build   # Runs generate.ts script
```

### Usage in Mobile (Tamagui)

```typescript
import { lightColors, darkColors, type MobileColorScheme } from "@trainers/theme/mobile";

// Colors are used to build Tamagui themes in apps/mobile/src/tamagui.config.ts
// Access theme values in components via Tamagui's useTheme() or $token syntax:
<YStack backgroundColor="$background">
  <Text color="$primary">Teal text</Text>
</YStack>
```

### Usage in Web (Tailwind CSS 4)

```css
/* Already imported in apps/web/src/styles/globals.css */
@import "@trainers/theme/css";

/* Use CSS variables directly or via Tailwind classes */
.element {
  background-color: var(--background);
  color: var(--primary);
}
```

---

## Design Language

### Minimal Flat Design

Both web and mobile apps follow a **minimal flat design** philosophy:

| Principle          | Implementation                                        |
| ------------------ | ----------------------------------------------------- |
| No borders         | Cards and inputs use background color differentiation |
| Subtle backgrounds | Use `$muted` / `$backgroundStrong` for sections       |
| Clean spacing      | Consistent `gap` and padding values                   |
| Teal primary       | Single accent color across all interactive elements   |

### Dark Mode

| Platform | Implementation                                        |
| -------- | ----------------------------------------------------- |
| Web      | `next-themes` library with `.dark` class on `<html>`  |
| Mobile   | `useColorScheme()` from React Native + Tamagui themes |

Dark mode respects system preferences by default on both platforms.

### Component Styling (Mobile)

```typescript
// Use Tamagui components with theme tokens
import { YStack, XStack, Text, Button } from "tamagui";

function Card({ children }) {
  return (
    <YStack
      backgroundColor="$backgroundStrong"
      padding="$4"
      borderRadius="$4"
      gap="$3"
    >
      {children}
    </YStack>
  );
}
```

### Component Styling (Web)

```tsx
// Use Tailwind with CSS variables from theme
function Card({ children }) {
  return <div className="bg-card space-y-3 rounded-lg p-4">{children}</div>;
}
```

---

## Frontend Polish Guidelines

When building or modifying UI components, follow these standards for a polished experience:

### Animation & Transitions

| Pattern       | Implementation                                                                        |
| ------------- | ------------------------------------------------------------------------------------- |
| Page entrance | `animate-in fade-in slide-in-from-bottom-2 duration-300` via PageContainer            |
| Card hover    | `hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200`               |
| Focus state   | Ring utilities with subtle glow: `focus-visible:ring-2 focus-visible:ring-primary/50` |
| Loading       | Pulsing skeletons: `animate-pulse`                                                    |

**Important:** Use CSS-first animations via Tailwind utilities. Do not use Motion/Framer Motion library as it forces client components.

### Status Colors

Use `StatusBadge` component with these semantic mappings:

| Status    | Color   | Usage                                |
| --------- | ------- | ------------------------------------ |
| active    | Emerald | Currently running tournaments/events |
| upcoming  | Blue    | Scheduled future events              |
| draft     | Amber   | Unpublished, work in progress        |
| completed | Gray    | Finished events                      |
| cancelled | Red     | Cancelled events                     |

### Responsive Patterns

| Viewport          | Pattern                                                             |
| ----------------- | ------------------------------------------------------------------- |
| Mobile (<640px)   | Icon-only tabs with tooltips, card layouts, stacked forms           |
| Tablet (768px)    | Scrollable containers with fade indicators, hide non-essential text |
| Desktop (1024px+) | Full text labels, table layouts, side-by-side forms                 |

### Loading & Empty States

| Scenario      | Component                             |
| ------------- | ------------------------------------- |
| Page loading  | `SkeletonCard` or `SkeletonTable`     |
| User action   | Optimistic UI with rollback on error  |
| Empty list    | `EmptyState` with appropriate variant |
| Empty section | `EmptyState variant="inline"`         |

### Component Checklist

When creating new components:

- [ ] Uses Server Component unless interactivity required
- [ ] Responsive at 375px, 768px, 1024px breakpoints
- [ ] Has appropriate loading state
- [ ] Has empty state if displays data
- [ ] Uses semantic status colors if applicable
- [ ] Follows existing naming patterns
- [ ] Interactive elements have hover/focus states

### Brand Voice in UI

- Professional warmth with Pokemon soul
- Not corporate sterile, not gaming chaos
- Celebrate the community: competitive players, shiny hunters, and everyone in between
- Use encouraging microcopy in empty states and confirmations

---

## UI Component Guidelines (Web)

### Always Use shadcn/ui Components

When building UI for the web app, **always check for and use existing shadcn/ui components** before creating custom solutions.

**Browse all available components:** `apps/web/src/components/ui/`

Each `.tsx` file in that directory is a shadcn/ui component ready to use. Common ones include:

- Layout: `Card`, `Separator`, `Accordion`, `Collapsible`, `Tabs`
- Forms: `Input`, `Button`, `Select`, `Switch`, `Checkbox`, `RadioGroup`, `Textarea`, `Label`
- Feedback: `Alert`, `Badge`, `Progress`, `Skeleton`, `Spinner`
- Overlays: `Dialog`, `Sheet`, `Popover`, `Tooltip`, `DropdownMenu`, `ContextMenu`
- Data: `Table`, `Pagination`, `Calendar`
- Navigation: `Breadcrumb`, `NavigationMenu`, `Sidebar`
- Composition: `ButtonGroup`, `InputGroup`, `Command`

### Adding New shadcn Components

```bash
npx shadcn@latest add <component-name>
```

### Component Patterns

```tsx
// Use ButtonGroup for segmented controls
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";

<ButtonGroup>
  <Button variant={selected === "a" ? "default" : "outline"}>Option A</Button>
  <Button variant={selected === "b" ? "default" : "outline"}>Option B</Button>
</ButtonGroup>;

// Use Select for dropdowns
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>;
```

### Important Notes

- This project uses **shadcn/ui v4 with Base UI primitives** (NOT Radix)
- Do NOT use `asChild` prop - Base UI doesn't support it
- Check existing components before building custom ones
- Prefer composition of existing components over custom implementations

---

## Glossary

| Term                          | Definition                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**                      | Any authenticated account in the system (Supabase Auth + optional Bluesky PDS identity)                                                             |
| **Alt**                       | A player identity linked to a user account. Users can have multiple alts for different competitive formats or personas. Stored in the `alts` table. |
| **Staff**                     | Organization personnel who help run events (TOs, moderators, admins). Staff are **not** tournament participants.                                    |
| **Player / Participant**      | Someone registered for a tournament. Players compete in events; staff run them.                                                                     |
| **Organization**              | A group that hosts tournaments (e.g., "VGC League", "Sinnoh Champions"). Organizations have staff and can create tournaments.                       |
| **TO (Tournament Organizer)** | A staff role with permissions to create and manage tournaments for an organization.                                                                 |
| **DID**                       | Decentralized Identifier - a unique AT Protocol identity (e.g., `did:plc:abc123`). Stored in the `users` table.                                     |
| **PDS**                       | Personal Data Server - self-hosted Bluesky server at `pds.trainers.gg` that stores user data and federates with the AT Protocol network.            |
| **Handle**                    | A human-readable Bluesky identity (e.g., `@username.trainers.gg`).                                                                                  |
| **RLS**                       | Row Level Security - PostgreSQL feature used by Supabase to enforce access control at the database level using `auth.uid()`.                        |

### Terminology Decisions

**Why "Staff" instead of "Member":**

- "Member" is ambiguous - it could mean organization staff OR tournament participants
- "Staff" clearly indicates people who **run** the organization, not people who **participate** in events
- This distinction is important for permissions: staff can manage tournaments, participants can only register for them
