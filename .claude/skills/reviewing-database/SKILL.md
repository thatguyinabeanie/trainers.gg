---
name: reviewing-database
description: Use when reviewing or writing database changes — covers RLS policies, migrations, indexes, N+1 queries, unbounded fetches, and query efficiency
---

# Reviewing Database

Checklist for database changes: migrations, RLS policies, query patterns, and indexing.

## No Deferrals

Every finding from this review is in scope for the current session. Do not produce a "follow-ups", "future work", or "deferred" section — if a policy is missing, an index is absent, or a query is N+1, fix it now. Only defer when the user explicitly says "address X in a separate PR". Match this to the PR feedback rule in `reviewing-pr-feedback`.

## Security Advisor

Run this first to catch structural issues the checklist may miss:

```bash
pnpm db:lint
```

Checks tables without RLS, `SECURITY DEFINER` functions without a pinned `search_path`, and other schema-level security findings. Fix all errors and warnings before reviewing manually.

## Migration Checks

- [ ] RLS enabled on new tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] SELECT, INSERT, UPDATE, DELETE policies defined (or commented why not)
- [ ] `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotency
- [ ] `IF NOT EXISTS` / `IF EXISTS` guards on all DDL
- [ ] `(SELECT auth.uid())` initplan pattern — not bare `auth.uid()`
- [ ] No `USING(true)` unless intentional with comment explaining why
- [ ] Foreign keys have explicit `ON DELETE` behavior with comment if using default RESTRICT
- [ ] `NOT NULL` on columns that should never be null (especially `created_at`)
- [ ] Snake_case column names, meaningful table names
- [ ] Column comments on non-obvious fields (`COMMENT ON COLUMN`)

## RLS Policy Patterns

```sql
-- Good: initplan pattern (evaluated once per query)
WHERE a.user_id = (SELECT auth.uid())

-- Bad: re-evaluated per row
WHERE a.user_id = auth.uid()

-- Good: service role check with initplan
USING ((SELECT auth.role()) = 'service_role')
```

## Indexing Checks

- [ ] New columns used in `WHERE`, `JOIN`, `ORDER BY`, or `GROUP BY` have indexes
- [ ] Foreign key columns have indexes (Postgres does NOT auto-index FKs)
- [ ] Composite indexes for multi-column filters (e.g., `WHERE community_id = X AND status = Y`)
- [ ] `UNIQUE` constraints where business logic requires uniqueness
- [ ] Consider partial indexes for status-filtered queries (`WHERE status = 'active'`)

### When to Add an Index

| Query Pattern                     | Index Type                   |
| --------------------------------- | ---------------------------- |
| `WHERE col = value`               | B-tree on `col`              |
| `WHERE col1 = X AND col2 = Y`     | Composite `(col1, col2)`     |
| `ORDER BY col`                    | B-tree on `col`              |
| `WHERE col IN (...)`              | B-tree on `col`              |
| FK column used in CASCADE deletes | B-tree on FK column          |
| Text search / `ILIKE`             | Consider `pg_trgm` GIN index |

## Query Efficiency Checks

- [ ] **N+1 queries**: Loops making one DB call per iteration — refactor to `IN` clauses or joins
- [ ] **Unbounded fetches**: `select("*")` without `.limit()` that could grow — add limits or use SQL aggregation (RPC/views)
- [ ] **Sequential independent queries**: Use `Promise.all` for queries with no dependencies
- [ ] **Full table scans**: Queries without `WHERE` on an indexed column
- [ ] **Redundant queries**: Same data fetched by multiple functions in the same render — consider sharing results or accepting parameters
- [ ] **Count queries**: Use `select("*", { count: "exact", head: true })` instead of fetching all rows to count in JS
- [ ] **Aggregation in JS**: `GROUP BY`, `COUNT(DISTINCT)`, `SUM` — push to SQL via RPC when the dataset could grow

## Supabase Client Selection

| Client                                                      | When                                              |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `createStaticClient()`                                      | Public data, `'use cache'` scopes, no auth needed |
| `createClient()`                                            | Authenticated mutations, read-write cookies       |
| `createClientReadOnly()`                                    | Authenticated reads, read-only cookies            |
| `createServiceRoleClient()` / `createAdminSupabaseClient()` | Bypass RLS (service operations only)              |

Never use `createClient()` (authenticated) inside a `'use cache'` scope. Use `createStaticClient()`.

## Anti-Patterns

```typescript
// BAD: N+1 — one query per item
for (const id of ids) {
  const { data } = await supabase.from("items").select("*").eq("id", id);
}

// GOOD: batch query
const { data } = await supabase.from("items").select("*").in("id", ids);

// BAD: fetch all rows to count
const { data } = await supabase.from("registrations").select("*");
const count = data.length;

// GOOD: DB-side count
const { count } = await supabase
  .from("registrations")
  .select("*", { count: "exact", head: true });

// BAD: aggregate in JS
const { data } = await supabase.from("regs").select("user_id");
const unique = new Set(data.map(r => r.user_id)).size;

// GOOD: SQL aggregation via RPC
const { data } = await supabase.rpc("count_unique_players", { ... });
```

## Public API / Cached Query Checks

### No `select('*')` in Versioned or Cached Public APIs

**Never use `select('*')` or `select('*, rel(*)')` in a query exposed through a versioned API route or a `'use cache'` fetcher that external callers depend on.** Future columns added to the table silently expand the response shape, leaking data or breaking consumer contracts.

Use an explicit column allowlist instead. Maintain a separate public-facing query function when needed:

```typescript
// ✅ Explicit columns — safe to add columns to the table without leaking them
// Reference: getPublicTournamentStandings in packages/supabase/src/queries/tournaments.ts
export async function getPublicTournamentStandings(supabase, id) {
  return supabase
    .from("standings")
    .select("rank, player_id, wins, losses, resistance_pct"); // allowlist
}

// ❌ select('*') — new columns silently leak through cached/versioned responses
export async function getStandings(supabase, id) {
  return supabase.from("standings").select("*");
}
```

### RLS Functions Called by Anon Need EXECUTE Grant

**An RLS policy `FOR SELECT TO anon` (or any anon-reachable policy) that calls a SQL function requires `GRANT EXECUTE ON FUNCTION ... TO anon`.** Without it, an anon read that exercises the function-calling branch raises `permission denied for function <name>` (SQLSTATE 42501) instead of cleanly returning zero rows.

When adding a default-deny `REVOKE EXECUTE ... FROM PUBLIC` migration, cross-check every function named in an anon-reachable RLS predicate — each one needs its own grant back.

```sql
-- ✅ Grant EXECUTE to anon for functions used in anon-reachable RLS policies
-- Reference: packages/supabase/supabase/migrations/20260612203747_grant_has_community_permission_execute_to_anon.sql
GRANT EXECUTE ON FUNCTION public.has_community_permission(bigint, text) TO anon;

-- ❌ Revoking PUBLIC without re-granting to anon breaks anon reads that hit
--    an RLS predicate calling this function (silent 42501 error at query time)
REVOKE EXECUTE ON FUNCTION public.has_community_permission(bigint, text) FROM PUBLIC;
-- (no corresponding GRANT TO anon) ← missing
```

### Case-Insensitive Identifier Matching

**Username / identifier lookups must be case-insensitive and consistent across all code paths.** Mixing `=` in one place and `.ilike()` in another silently fails lookups (e.g., sign-in-by-username) when casing differs.

Use `lower(col) = lower(p_arg)` in SQL — it is index-friendly (a functional index on `lower(username)` satisfies it) and avoids the implicit pattern-escape issues of `ILIKE`.

```sql
-- ✅ Case-insensitive, index-friendly
-- Reference: packages/supabase/supabase/migrations/20260612203733_fix_get_email_by_username_case_insensitive.sql
SELECT email FROM public.users WHERE lower(username) = lower(p_username);

-- ❌ Case-sensitive — silently returns no rows when casing differs
SELECT email FROM public.users WHERE username = p_username;

-- ❌ Inconsistent — .ilike() in TypeScript but = in SQL causes split-brain matching
```
