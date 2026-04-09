# Supabase Migrations

Rules that apply when creating or editing SQL migration files in `packages/supabase/supabase/migrations/`.

Applies to: `packages/supabase/supabase/migrations/**`

## Idempotency

All migrations must be idempotent — preview branches replay every migration on a fresh DB.

| Statement                    | Idempotent Guard                                                             |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `CREATE TABLE`               | `CREATE TABLE IF NOT EXISTS`                                                 |
| `ALTER TABLE ADD COLUMN`     | `ADD COLUMN IF NOT EXISTS`                                                   |
| `CREATE INDEX`               | `CREATE INDEX IF NOT EXISTS`                                                 |
| `CREATE FUNCTION`            | `CREATE OR REPLACE FUNCTION`                                                 |
| `CREATE POLICY`              | `DROP POLICY IF EXISTS` before `CREATE POLICY`                               |
| `CREATE TYPE` (enum)         | Wrap in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` |
| `ALTER TABLE ADD CONSTRAINT` | Check `pg_constraint` before adding                                          |

## RLS Required

Every `CREATE TABLE` must be followed by:

1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
2. At least one `CREATE POLICY` statement

A table without RLS is open to all users through the Supabase API.

## RLS Performance

Always wrap `auth.uid()` in a subselect for RLS policies:

```sql
-- Good — avoids initplan performance issue
USING (user_id = (select auth.uid()))

-- Bad — can cause slow query plans
USING (user_id = auth.uid())
```

## Naming and Types

- Tables and columns: `snake_case`
- Non-auth primary keys: `bigint GENERATED ALWAYS AS IDENTITY`
- Auth user references: `uuid` (for `auth.users.id`)
- Timestamps: `timestamptz DEFAULT now()`
- Migration filenames: `YYYYMMDDHHMMSS_description.sql` (UTC timestamp, `snake_case` description)

## Workflow

1. Never edit or rename a committed migration file — create a new one
2. Never apply migrations via MCP tools or Supabase dashboard
3. After creating a migration, run `pnpm db:reset` to test locally
4. Run `pnpm generate-types` to update TypeScript types
5. The `create-migration` skill has the full template and conventions
