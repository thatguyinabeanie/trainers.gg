# trainers.gg - Agent Guidelines

A Pokemon community platform for competitive players. Monorepo with Next.js 16 web app, Expo 54 mobile app, Supabase backend, and **Bluesky PDS integration** for decentralized social features.

## Monorepo Structure

```
apps/
  web/                 # Next.js 16 (React 19) - @trainers/web
  mobile/              # Expo 54 (React 19) - @trainers/mobile

packages/
  supabase/            # Supabase client, queries, edge functions - @trainers/supabase
  backend-convex/      # Convex (legacy/migration) - @trainers/backend
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

| Layer            | Technology              | Notes                                     |
| ---------------- | ----------------------- | ----------------------------------------- |
| Auth             | Supabase Auth           | Native auth with email/password and OAuth |
| Database         | Supabase (PostgreSQL)   | Row Level Security with auth.uid()        |
| Edge Functions   | Supabase Edge Functions | Deno runtime                              |
| Social/Identity  | AT Protocol (Bluesky)   | Decentralized identity and federation     |
| PDS              | Fly.io                  | Self-hosted at pds.trainers.gg            |
| Web              | Next.js 16              | React 19, App Router, Server Components   |
| Mobile           | Expo 54                 | React Native with Tamagui                 |
| Styling (Web)    | Tailwind CSS 4          | Uses @tailwindcss/postcss                 |
| Styling (Mobile) | Tamagui                 | Universal UI components with theme tokens |
| Theme            | @trainers/theme         | OKLCH colors, light/dark mode support     |

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

---

## Build / Lint / Test Commands

### Root Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run all apps in parallel
pnpm dev:web              # Run web app only
pnpm dev:mobile           # Run mobile app only
pnpm build                # Build all packages
pnpm build:web            # Build web app only
pnpm lint                 # Lint all packages
pnpm typecheck            # TypeScript check all packages
pnpm format               # Format all files with Prettier
pnpm format:check         # Check formatting without fixing
pnpm clean                # Remove all build artifacts and node_modules
```

### Single Package Commands

```bash
pnpm turbo run <task> --filter=@trainers/web
pnpm turbo run <task> --filter=@trainers/mobile
pnpm turbo run <task> --filter=@trainers/supabase
```

### Supabase Commands

```bash
cd packages/supabase
pnpm local:start          # Start local Supabase (requires Docker)
pnpm local:stop           # Stop local Supabase
pnpm generate-types       # Generate TypeScript types from schema
pnpm db:migrate           # Push migrations to local database
pnpm db:reset             # Reset local database
```

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

-- Get the current user's profile ID
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid AS $$
  SELECT p.id FROM profiles p
  WHERE p.user_id = auth.uid()
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
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", profileId)
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

| Column          | Type       | Description                              |
| --------------- | ---------- | ---------------------------------------- |
| id              | uuid       | Primary key (matches auth.users.id)      |
| email           | text       | Primary email                            |
| first_name      | text       | User's first name                        |
| last_name       | text       | User's last name                         |
| username        | text       | Unique username                          |
| image           | text       | Avatar URL                               |
| birth_date      | date       | User's date of birth                     |
| country         | text       | Country code (ISO 3166-1 alpha-2)        |
| main_profile_id | uuid       | FK to profiles                           |
| did             | text       | AT Protocol Decentralized Identifier     |
| pds_handle      | text       | Auto-generated as `username.trainers.gg` |
| pds_status      | pds_status | pending, active, failed, or suspended    |

### profiles

Player profiles linked to users.

| Column       | Type | Description         |
| ------------ | ---- | ------------------- |
| id           | uuid | Primary key         |
| user_id      | uuid | FK to users         |
| username     | text | Unique username     |
| display_name | text | Public display name |
| avatar_url   | text | Profile avatar      |

---

## Environment Variables

### Web App (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

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

## Documentation Index

The `docs/` directory contains planning documents, architecture decisions, and feature specifications from the project's evolution.

### Root Files

| File                                              | Description                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `index.md`                                        | Main documentation index with Obsidian-compatible navigation        |
| `ai_integration_architecture.md`                  | AI service layer specs: multi-model support, RAG, prompt caching    |
| `architecture-research-monorepo-vs-single-app.md` | Research comparing monorepo vs single app approaches for web+mobile |
| `AUTHENTICATION_SETUP.md`                         | Auth flow for protecting production site during development         |
| `battle_stadium_overview.md`                      | Executive summary of the mobile AI Pokemon analysis platform        |
| `business_strategy_market_penetration.md`         | Market analysis, TAM sizing, and business strategy                  |
| `cross-platform-ui-libraries.md`                  | Comparison of NativeWind, Tamagui, Gluestack for React Native       |
| `feature_specifications.md`                       | Detailed UI/UX specs for meta dashboard and major features          |
| `figma-integration-guide.md`                      | Design system tokens, Figma-to-code workflow, component library     |
| `meta_analytics_data_strategy.md`                 | Tournament meta database design and analytics data collection       |
| `mobile_ai_pokemon_replay_converter.md`           | Multi-game platform expansion strategy (Pokemon GO, TCG, Unite)     |
| `mobile-cv-video-architecture.md`                 | Mobile CV pipeline: camera, ML models, video recording, storage     |
| `monorepo-implementation-guide.md`                | Step-by-step monorepo setup with Turborepo, pnpm, Next.js + Expo    |
| `partnership_strategy_hardware.md`                | Anker partnership strategy and hardware integration plans           |
| `realtime_tournament_analytics.md`                | Real-time tournament state management and live coaching features    |
| `replay_analysis_engine.md`                       | Replay parsing, game state model, and "what if" scenario analysis   |
| `skill_weighted_analysis_algorithm.md`            | Skill-tier weighting algorithm for meta analysis stratification     |
| `technical_architecture_deep_dive.md`             | Mobile AI hardware capabilities and CV pipeline architecture        |
| `tournament-schema-questions.md`                  | Tournament schema design decisions (brackets, match reporting)      |
| `user_experience_flows.md`                        | User personas, onboarding flows, and journey mapping                |
| `VERCEL_AUTHENTICATION_SETUP.md`                  | Vercel deployment protection and team access configuration          |
| `vgc_cv_decisions.md`                             | Chrome extension + PWA architecture for VGC computer vision         |
| `WEBHOOK_SETUP.md`                                | Clerk webhook setup for Convex integration (legacy)                 |

### Subdirectories

#### `architecture/`

| File                        | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `index.md`                  | Architecture overview with links to all technical docs   |
| `computer-vision-system.md` | Full CV system spec for extracting battle data from cart |
| `mobile-app-strategy.md`    | React Native mobile app strategy and PWA migration path  |
| `profiles-architecture.md`  | Multi-profile system design with free/paid tiers         |

#### `audits/`

| File                         | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `2026-01-13-audit-report.md` | Implementation audit: completed vs missing features |

#### `development/`

| File                 | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `seed-data-setup.md` | Development seed data scripts with safety mechanisms |

#### `organizations/`

| File               | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `ORGANIZATIONS.md` | Organization system overview: groups, roles, permissions |

#### `planning/`

| File                     | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `PROJECT_BRIEF.md`       | Project overview: trainers.gg as Pokemon community platform      |
| `ARCHITECTURE.md`        | Current monorepo structure for trainers.gg                       |
| `BACKEND_COMPARISON.md`  | Convex vs Supabase comparison and dual-backend strategy          |
| `BLUESKY_INTEGRATION.md` | AT Protocol integration: OAuth, social graph, content federation |
| `CONVEX_SCHEMA.md`       | Convex database schema design (legacy, pre-Supabase)             |
| `IMPLEMENTATION_PLAN.md` | Sprint-by-sprint Phase 1 implementation plan                     |
| `TECHNICAL_DECISIONS.md` | Tech stack decisions: Next.js 16, Expo 54, Bluesky, etc.         |

#### `setup/`

| File                  | Description                                    |
| --------------------- | ---------------------------------------------- |
| `first-user-setup.md` | Guide for creating first user on fresh install |

#### `site/`

| File       | Description                                        |
| ---------- | -------------------------------------------------- |
| `index.md` | Site organization: landing page, orgs, tournaments |

#### `tournaments/`

| File                          | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `index.md`                    | Tournament ownership, creation, and structure        |
| `data-integration-and-elo.md` | RK9 Labs integration and ELO ranking system plans    |
| `draft-league.md`             | Pokemon Draft League support: draft, rosters, trades |

### Notes

- Many docs reference "Battle Stadium" which was the project's previous name (now trainers.gg)
- Some docs reference Convex as the backend; the project has migrated to Supabase
- Compass artifact files (`compass_artifact_*.md`) are research exports - one is a Florida travel guide (misplaced), two cover Pokemon Showdown replay scraping
