# @trainers/supabase

Supabase backend package for trainers.gg. Provides database access, native authentication, and edge functions.

## Features

- **PostgreSQL Database** with Row Level Security (RLS)
- **Native Supabase Auth** with email/password and OAuth providers
- **Edge Functions** for webhooks and server-side operations
- **Type-safe Queries** with generated TypeScript types

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only!
```

### 2. Configure Auth Providers

In Supabase Dashboard → Authentication → Providers:

1. Enable Email provider (enabled by default)
2. Configure OAuth providers (Google, Discord, GitHub, Twitter) as needed
3. Set redirect URLs for your app

### 3. Generate Types

After modifying your database schema:

```bash
cd packages/supabase
pnpm generate-types
```

## Usage

### Server-Side (Next.js App Router)

```typescript
import { createClient } from "@/lib/supabase/server";

// In a Server Component or Server Action
const supabase = await createClient();
const { data } = await supabase.from("users").select("*");
```

### Client-Side (React Components)

```typescript
import { createPublicSupabaseClient } from "@trainers/supabase";

function MyComponent() {
  const supabase = createPublicSupabaseClient();
  // Use supabase client...
}
```

### Admin Operations (Bypasses RLS)

```typescript
import { createAdminSupabaseClient } from "@trainers/supabase";

// Only use in trusted server contexts (webhooks, etc.)
const supabase = createAdminSupabaseClient();
```

## Development

```bash
# Start local Supabase (requires Docker)
pnpm local:start

# Stop local Supabase
pnpm local:stop

# Push migrations to local database
pnpm db:migrate

# Reset local database
pnpm db:reset

# Generate TypeScript types from schema
pnpm generate-types
```

## Architecture

```
packages/supabase/
├── src/
│   ├── client.ts       # Supabase client creation (public, admin)
│   ├── types.ts        # Generated database types
│   ├── index.ts        # Package exports
│   ├── queries/        # Read-only query functions
│   │   ├── users.ts
│   │   ├── tournaments.ts
│   │   └── organizations.ts
│   └── mutations/      # Write operations
│       ├── users.ts
│       └── tournaments.ts
└── supabase/
    └── migrations/     # SQL migration files
```

## Key Patterns

### RLS with Supabase Auth

```sql
-- Example RLS policy using auth.uid()
CREATE POLICY "Users can view own data"
ON public.users FOR SELECT
USING (id = auth.uid());

-- Example for related tables
CREATE POLICY "Users can view own profiles"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());
```

### Query Patterns

```typescript
// Use maybeSingle() when record might not exist
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .maybeSingle(); // Returns null, no error

// Use single() only when record MUST exist
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", profileId)
  .single(); // Throws 406 if not found
```

## Database Schema

Key tables:

| Table                      | Description                        |
| -------------------------- | ---------------------------------- |
| `users`                    | User accounts (created on signup)  |
| `profiles`                 | Player profiles (username, avatar) |
| `organizations`            | Tournament organizer accounts      |
| `tournaments`              | Tournament events                  |
| `tournament_registrations` | Player registrations               |

## Auth Flow

1. User signs up via email/password or OAuth
2. Supabase creates auth user in `auth.users`
3. Database trigger (`handle_new_user`) automatically creates:
   - `public.users` record with auth user ID
   - `public.profiles` record with username from signup
4. User is authenticated and can access protected resources
