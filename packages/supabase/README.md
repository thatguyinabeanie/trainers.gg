# @trainers/backend-supabase

Supabase backend package for trainers.gg. Used alongside `@trainers/backend-convex` for features requiring PostgreSQL capabilities.

## Use Cases

- **Analytics & Reporting**: Complex SQL aggregations, window functions
- **BI Tool Integration**: Direct database access for Metabase, Tableau, etc.
- **Presence Features**: Who's online, cursor positions (native Supabase Realtime)
- **Broadcast/Pub-Sub**: Low-latency messaging for live features

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only, never expose!
```

### 3. Generate Types

After creating your database schema:

```bash
cd packages/backend-supabase
pnpm generate-types
```

This updates `src/types.ts` with your actual database schema.

## Usage

### Client-Side (React Components)

```typescript
import { getSupabaseBrowserClient } from "@trainers/backend-supabase";

function MyComponent() {
  const supabase = getSupabaseBrowserClient();

  // Use supabase client...
}
```

### Server-Side (API Routes, Server Actions)

```typescript
import { createServerClient } from "@trainers/backend-supabase";

async function myServerAction() {
  // With RLS (uses anon key)
  const supabase = createServerClient();

  // Bypass RLS (uses service role - be careful!)
  const adminSupabase = createServerClient({ useServiceRole: true });
}
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

## Migrations

SQL migrations live in `supabase/migrations/`. Create new migrations with:

```bash
cd packages/backend-supabase
npx supabase migration new your_migration_name
```

## Architecture

```
packages/backend-supabase/
├── src/
│   ├── client.ts       # Supabase client creation
│   ├── types.ts        # Generated database types
│   ├── index.ts        # Package exports
│   ├── queries/        # Read-only query functions
│   └── mutations/      # Write operations
├── supabase/
│   └── migrations/     # SQL migration files
├── package.json
└── tsconfig.json
```
