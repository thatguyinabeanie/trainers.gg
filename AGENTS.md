# trainers.gg - Agent Guidelines

A Pokemon community platform for competitive players. Monorepo with Next.js 16 web app, Expo 54 mobile app, and Supabase backend.

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

tooling/
  eslint/              # @trainers/eslint-config
  prettier/            # @trainers/prettier-config
  tailwind/            # @trainers/tailwind-config
  typescript/          # @trainers/typescript-config
```

---

## Tech Stack

| Layer          | Technology                                | Notes                                               |
| -------------- | ----------------------------------------- | --------------------------------------------------- |
| Auth           | Clerk                                     | Handles sign-up, sign-in, OAuth, session management |
| Database       | Supabase (PostgreSQL)                     | Row Level Security with Clerk JWT tokens            |
| Edge Functions | Supabase Edge Functions                   | Deno runtime, used for webhooks                     |
| Web            | Next.js 16                                | React 19, App Router, Server Components             |
| Mobile         | Expo 54                                   | React Native with NativeWind                        |
| Styling        | Tailwind CSS 4 (web), NativeWind (mobile) |                                                     |

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

---

## Authentication Architecture

### Clerk + Supabase Integration

```
┌─────────────────────────────────────────────────────────────┐
│                        User Flow                            │
├─────────────────────────────────────────────────────────────┤
│  1. User signs in via Clerk                                 │
│  2. Clerk issues JWT with user's clerk_id in `sub` claim    │
│  3. Web app passes JWT to Supabase via accessToken option   │
│  4. Supabase verifies JWT using Third-Party Auth config     │
│  5. RLS policies use clerk_user_id() function for access    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Webhook Sync Flow                        │
├─────────────────────────────────────────────────────────────┤
│  1. User created/updated/deleted in Clerk                   │
│  2. Clerk sends webhook to Supabase Edge Function           │
│  3. Edge function verifies signature with svix              │
│  4. Creates/updates/deletes user + profile in Supabase      │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File                                                  | Purpose                                     |
| ----------------------------------------------------- | ------------------------------------------- |
| `apps/web/src/lib/supabase/server.ts`                 | Server-side Supabase client with Clerk auth |
| `apps/web/src/lib/supabase/client.ts`                 | Client-side Supabase client with Clerk auth |
| `apps/web/src/components/auth/auth-provider.tsx`      | Client-side auth state + user sync fallback |
| `packages/supabase/supabase/functions/clerk-webhook/` | Edge function for Clerk webhooks            |

### Database Helper Function

```sql
-- Used in RLS policies to get Clerk user ID from JWT
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT AS $$
  SELECT (auth.jwt() ->> 'sub')::text;
$$ LANGUAGE SQL STABLE;
```

### RLS Policy Pattern

```sql
-- Example: Users can only read their own data
CREATE POLICY "Users can view own data"
ON public.users FOR SELECT
USING (clerk_id = clerk_user_id());
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
  .eq("clerk_id", clerkId)
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

Synced from Clerk via webhook.

| Column          | Type | Description                      |
| --------------- | ---- | -------------------------------- |
| id              | uuid | Primary key (generated)          |
| clerk_id        | text | Clerk user ID (e.g., "user_xxx") |
| email           | text | Primary email                    |
| name            | text | Display name                     |
| image           | text | Avatar URL                       |
| main_profile_id | uuid | FK to profiles                   |

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

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

### Supabase Edge Functions

Set via Supabase Dashboard → Edge Functions → Secrets:

```bash
CLERK_WEBHOOK_SECRET=whsec_...
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

packages/supabase/
├── src/
│   ├── client.ts     # Client creation functions
│   ├── types.ts      # Generated database types
│   ├── queries/      # Read-only query functions
│   └── mutations/    # Write operations
└── supabase/
    ├── functions/    # Edge functions (Deno)
    └── migrations/   # SQL migration files
```

---

## Platform-Specific Notes

### React Version

Both web and mobile use **React 19.1** for consistency.

**Important:** Always use the lowest common denominator React version across the monorepo. Check [Expo SDK bundledNativeModules.json](https://github.com/expo/expo/blob/sdk-54/packages/expo/bundledNativeModules.json) before upgrading.

### Tailwind Versions

- **Web**: Tailwind CSS 4.x (uses `@tailwindcss/postcss`)
- **Mobile**: Tailwind CSS 3.x via NativeWind

### Import Aliases

| App    | Alias | Path      |
| ------ | ----- | --------- |
| Web    | `@/*` | `./src/*` |
| Mobile | `@/*` | `./src/*` |
