---
name: create-migration
description: Create a new Supabase database migration with proper naming and conventions
---

# Create Migration

Create a new Supabase database migration following trainers.gg project conventions.

## Arguments

- `description` (required): Snake_case description of what the migration does (e.g., `add_team_submission`, `fix_rls_performance`)

## Steps

1. **Generate the filename**:
   - Format: `YYYYMMDDHHMMSS_description.sql`
   - Timestamp: current UTC time (use `date -u +%Y%m%d%H%M%S`)
   - Location: `packages/supabase/supabase/migrations/`

2. **Check existing migrations**:
   - Read the latest 3-5 migration files in `packages/supabase/supabase/migrations/` to understand current schema state
   - Verify the new timestamp doesn't conflict with existing ones
   - Understand what tables/policies already exist

3. **Write the migration SQL** following these rules:
   - Always wrap `auth.uid()` in `(select auth.uid())` for RLS performance (prevents initplan issues)
   - New tables MUST have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - Include CREATE POLICY statements for SELECT, INSERT, UPDATE, DELETE as appropriate
   - Use `IF NOT EXISTS` / `IF EXISTS` guards for safety
   - Add SQL comments explaining non-obvious policy logic
   - Use `bigint` generated always as identity for non-auth primary keys
   - Use `uuid` for columns referencing `auth.users.id`
   - Timestamps should default to `now()`
   - Tables and columns use `snake_case`
   - Enums should be created as PostgreSQL types

4. **Never edit a committed migration**: If fixing a previous migration, always create a NEW migration file that applies the correction.

5. **After creating the migration**:
   - Run `pnpm supabase db reset` to test locally (this replays all migrations + seeds)
   - Run `pnpm generate-types` to update TypeScript types in `packages/supabase/src/types.ts`
   - Use the Supabase MCP `get_advisors` tool to check for security and performance issues

## RLS Policy Template

```sql
-- Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Users can read their own records
CREATE POLICY "Users can read own records"
  ON public.table_name FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Users can insert their own records
CREATE POLICY "Users can insert own records"
  ON public.table_name FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Users can update their own records
CREATE POLICY "Users can update own records"
  ON public.table_name FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
```

## Common Patterns

### Adding a column

```sql
ALTER TABLE public.table_name
  ADD COLUMN IF NOT EXISTS column_name type DEFAULT value;
```

### Creating an enum

```sql
DO $$ BEGIN
  CREATE TYPE public.status_type AS ENUM ('active', 'inactive', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### Foreign key with cascade

```sql
ALTER TABLE public.child_table
  ADD CONSTRAINT fk_parent
  FOREIGN KEY (parent_id) REFERENCES public.parent_table(id)
  ON DELETE CASCADE;
```
