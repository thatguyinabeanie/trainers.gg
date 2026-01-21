# @trainers/supabase

Supabase backend package for trainers.gg. Provides database access, authentication integration with Clerk, and edge functions.

## Features

- **PostgreSQL Database** with Row Level Security (RLS)
- **Clerk Integration** via Third-Party Auth (native JWT verification)
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

### 2. Clerk + Supabase Integration

This package uses Clerk's native Supabase integration (Third-Party Auth):

1. In Supabase Dashboard → Settings → Third-Party Auth
2. Add Clerk as a provider with your Clerk JWKS URL
3. RLS policies use `clerk_user_id()` function to get the authenticated user

### 3. Generate Types

After modifying your database schema:

```bash
cd packages/supabase
pnpm generate-types
```

## Usage

### Server-Side (Next.js App Router)

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";

// In a Server Component or Server Action
const supabase = await createServerSupabaseClient();
const { data } = await supabase.from("users").select("*");
```

### Client-Side (React Components)

```typescript
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function MyComponent() {
  const supabase = createBrowserSupabaseClient();
  // Use supabase client...
}
```

### Admin Operations (Bypasses RLS)

```typescript
import { createAdminSupabaseClient } from "@trainers/supabase";

// Only use in trusted server contexts (webhooks, etc.)
const supabase = createAdminSupabaseClient();
```

## Edge Functions

Edge functions are deployed to Supabase and run on Deno.

### clerk-webhook

Syncs user data from Clerk to Supabase:

- `user.created` → Creates user + profile
- `user.updated` → Updates user data
- `user.deleted` → Deletes user

**Endpoint:** `https://your-project.supabase.co/functions/v1/clerk-webhook`

**Required Secrets:**

- `CLERK_WEBHOOK_SECRET` - From Clerk dashboard

### Deploying Edge Functions

```bash
# Deploy a single function
npx supabase functions deploy clerk-webhook

# Deploy all functions
npx supabase functions deploy
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
│   ├── client.ts       # Supabase client creation (authenticated, public, admin)
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
    ├── functions/      # Edge functions (Deno runtime)
    │   └── clerk-webhook/
    │       ├── index.ts
    │       └── deno.json
    └── migrations/     # SQL migration files
```

## Key Patterns

### RLS with Clerk

```sql
-- Helper function to get Clerk user ID from JWT
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT AS $$
  SELECT (auth.jwt() ->> 'sub')::text;
$$ LANGUAGE SQL STABLE;

-- Example RLS policy
CREATE POLICY "Users can view own data"
ON public.users FOR SELECT
USING (clerk_id = clerk_user_id());
```

### Query Patterns

```typescript
// Use maybeSingle() when record might not exist
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("clerk_id", clerkId)
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
| `users`                    | User accounts (synced from Clerk)  |
| `profiles`                 | Player profiles (username, avatar) |
| `organizations`            | Tournament organizer accounts      |
| `tournaments`              | Tournament events                  |
| `tournament_registrations` | Player registrations               |
